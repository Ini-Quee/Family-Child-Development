const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const { logAuditEvent, validators } = require('../middleware/security');

const router = express.Router();

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
}

// ============================================
// SCREEN TIME SHOP
// ============================================

// GET /api/screen-time/balance — Get remaining screen time
router.get('/balance', authenticate, async (req, res) => {
  try {
    const childId = req.user.role === 'child' ? req.user.id : req.query.childId;
    if (!childId) return res.status(400).json({ error: 'Child ID required' });

    // IDOR check
    if (req.user.role === 'child' && childId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    const child = await db.prepare('SELECT family_id FROM children WHERE id = ?').get(childId);
    if (!child || (req.user.role === 'parent' && child.family_id !== req.user.familyId)) return res.status(403).json({ error: 'Access denied' });

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    // Get today's purchases
    const purchases = await db.prepare(`
      SELECT * FROM screen_time_purchases
      WHERE child_id = ? AND created_at >= ? AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC
    `).all(childId, today);

    const totalPurchased = purchases.reduce((sum, p) => sum + p.minutes, 0);
    const totalUsed = purchases.reduce((sum, p) => sum + p.used_minutes, 0);
    const totalRemaining = totalPurchased - totalUsed;

    // Get exchange rate from economy config
    const config = await db.prepare('SELECT * FROM economy_config WHERE family_id = ?').get(child.family_id);
    const rate = config?.screen_time_rate || 2.50;

    // Get available packages
    const packages = [
      { id: '30min', minutes: 30, cost: rate, label: '30 Minutes', description: 'TikTok, YouTube, Games' },
      { id: '60min', minutes: 60, cost: rate * 2 - 1, label: '1 Hour', description: 'All apps', discount: 'Save $1!' },
      { id: 'gaming', minutes: 60, cost: rate * 1.2, label: 'Gaming Session', description: 'Xbox, PS5, Switch' },
    ];

    // Get free time earned from exercise today
    const exercise = await db.prepare(`
      SELECT SUM(screen_time_earned) as free_minutes FROM exercise_log
      WHERE child_id = ? AND created_at >= ?
    `).get(childId, today);
    const freeMinutes = exercise?.free_minutes || 0;

    res.json({
      totalPurchased,
      totalUsed,
      totalRemaining: totalRemaining + freeMinutes,
      freeMinutes,
      rate,
      packages,
      purchases,
    });
  } catch (err) {
    console.error('Screen time balance error:', err);
    res.status(500).json({ error: 'Failed to fetch screen time balance' });
  }
});

// POST /api/screen-time/purchase — Buy screen time
router.post('/purchase', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'child') return res.status(403).json({ error: 'Only children can purchase screen time' });

    const { packageId } = req.body;
    const childId = req.user.id;
    const ip = getClientIp(req);

    // Get economy config
    const child = await db.prepare('SELECT family_id FROM children WHERE id = ?').get(childId);
    const config = await db.prepare('SELECT * FROM economy_config WHERE family_id = ?').get(child.family_id);
    const rate = config?.screen_time_rate || 2.50;

    const packages = {
      '30min': { minutes: 30, cost: rate },
      '60min': { minutes: 60, cost: rate * 2 - 1 },
      'gaming': { minutes: 60, cost: rate * 1.2 },
    };

    const pkg = packages[packageId];
    if (!pkg) return res.status(400).json({ error: 'Invalid package' });

    // Check wallet balance
    const wallet = await db.prepare('SELECT * FROM wallets WHERE child_id = ?').get(childId);
    if (!wallet || wallet.balance < pkg.cost) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Deduct from wallet
    const newBalance = (wallet.balance - pkg.cost).toFixed(2);
    await db.prepare('UPDATE wallets SET balance = ?, total_spent = ?, updated_at = NOW() WHERE id = ?').run(
      parseFloat(newBalance), (wallet.total_spent + pkg.cost).toFixed(2), wallet.id
    );

    // Record purchase
    const purchaseId = uuidv4();
    await db.prepare('INSERT INTO screen_time_purchases (id, child_id, minutes, cost, remaining_minutes, expires_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      purchaseId, childId, pkg.minutes, pkg.cost, pkg.minutes,
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Expires in 24 hours
    );

    // Record transaction
    await db.prepare('INSERT INTO financial_transactions (id, child_id, wallet_id, type, amount, category, description, balance_after) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      uuidv4(), childId, wallet.id, 'spending', pkg.cost, 'screen_time', `Screen time: ${pkg.minutes} min`, parseFloat(newBalance)
    );

    logAuditEvent(childId, 'screen_time_purchased', { minutes: pkg.minutes, cost: pkg.cost, ip });

    res.json({
      purchase: { id: purchaseId, minutes: pkg.minutes, cost: pkg.cost },
      newBalance: parseFloat(newBalance),
    });
  } catch (err) {
    console.error('Screen time purchase error:', err);
    res.status(500).json({ error: 'Failed to purchase screen time' });
  }
});

// POST /api/screen-time/use — Log screen time usage
router.post('/use', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'child') return res.status(403).json({ error: 'Only children can log screen time' });

    const { minutes, platform } = req.body;
    const childId = req.user.id;

    if (!minutes || minutes < 1 || minutes > 480) return res.status(400).json({ error: 'Invalid minutes' });

    // Find oldest unused purchase with remaining minutes
    const purchase = await db.prepare(`
      SELECT * FROM screen_time_purchases
      WHERE child_id = ? AND remaining_minutes > 0 AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at ASC LIMIT 1
    `).get(childId);

    if (!purchase) return res.status(400).json({ error: 'No screen time available' });

    const used = Math.min(minutes, purchase.remaining_minutes);
    await db.prepare('UPDATE screen_time_purchases SET used_minutes = used_minutes + ?, remaining_minutes = remaining_minutes - ? WHERE id = ?').run(
      used, used, purchase.id
    );

    res.json({ used, remaining: purchase.remaining_minutes - used });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log screen time' });
  }
});

// ============================================
// MOOD CHECK-IN
// ============================================

// GET /api/mood/today — Get today's mood
router.get('/today', authenticate, async (req, res) => {
  try {
    const childId = req.user.role === 'child' ? req.user.id : req.query.childId;
    if (!childId) return res.status(400).json({ error: 'Child ID required' });

    // IDOR check
    if (req.user.role === 'child' && childId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    const today = new Date().toISOString().split('T')[0];
    const mood = await db.prepare('SELECT * FROM mood_checkins WHERE child_id = ? AND created_at >= ? ORDER BY created_at DESC LIMIT 1').get(childId, today);

    res.json({ mood: mood || null, checkedIn: !!mood });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch mood' });
  }
});

// POST /api/mood/checkin — Submit mood check-in
router.post('/checkin', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'child') return res.status(403).json({ error: 'Only children can check in' });

    const { mood, energy, contextTags, privateNote } = req.body;
    const childId = req.user.id;

    const validMoods = ['😫', '😟', '😐', '😊', '🤩'];
    if (!mood || !validMoods.includes(mood)) return res.status(400).json({ error: 'Invalid mood' });
    if (energy !== undefined && (energy < 1 || energy > 10)) return res.status(400).json({ error: 'Energy must be 1-10' });

    const id = uuidv4();
    await db.prepare('INSERT INTO mood_checkins (id, child_id, mood, energy, context_tags, private_note) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, childId, mood, energy || 5,
      contextTags ? JSON.stringify(contextTags) : null,
      privateNote || null // Private — never shown to parent
    );

    res.json({ id, mood, energy: energy || 5 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check in' });
  }
});

// GET /api/mood/history — Get mood history (child sees own, parent sees trend only)
router.get('/history', authenticate, async (req, res) => {
  try {
    const childId = req.user.role === 'child' ? req.user.id : req.query.childId;
    if (!childId) return res.status(400).json({ error: 'Child ID required' });

    // IDOR check
    if (req.user.role === 'child' && childId !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    const days = parseInt(req.query.days) || 7;
    const moods = await db.prepare(`
      SELECT mood, energy, context_tags, created_at FROM mood_checkins
      WHERE child_id = ? AND created_at >= NOW() - INTERVAL '${days} days'
      ORDER BY created_at DESC
    `).all(childId);

    // Parents only see mood + date, never private notes
    const result = moods.map(m => ({
      mood: m.mood,
      energy: m.energy,
      context: req.user.role === 'child' ? m.context_tags : null,
      date: m.created_at,
    }));

    res.json({ moods: result, days });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch mood history' });
  }
});

// ============================================
// ACADEMIC TRACKING
// ============================================

// GET /api/academics — Get all subjects for a child
router.get('/', authenticate, async (req, res) => {
  try {
    const childId = req.user.role === 'child' ? req.user.id : req.query.childId;
    if (!childId) return res.status(400).json({ error: 'Child ID required' });

    // IDOR check
    if (req.user.role === 'child' && childId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    const child = await db.prepare('SELECT family_id FROM children WHERE id = ?').get(childId);
    if (!child || (req.user.role === 'parent' && child.family_id !== req.user.familyId)) return res.status(403).json({ error: 'Access denied' });

    const subjects = await db.prepare('SELECT * FROM academic_subjects WHERE child_id = ? ORDER BY name').all(childId);

    // Calculate GPA
    const gradesWithNumeric = subjects.filter(s => s.grade_numeric);
    const gpa = gradesWithNumeric.length > 0
      ? (gradesWithNumeric.reduce((sum, s) => sum + s.grade_numeric, 0) / gradesWithNumeric.length).toFixed(1)
      : null;

    // Get reading streak
    const today = new Date().toISOString().split('T')[0];
    const reading = await db.prepare('SELECT * FROM reading_log WHERE child_id = ? ORDER BY created_at DESC LIMIT 1').get(childId);
    const readingStreak = reading?.streak_day || 0;

    // Get study sessions this week
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const studySessions = await db.prepare('SELECT COUNT(*) as count, SUM(actual_minutes) as total_minutes FROM study_sessions WHERE child_id = ? AND created_at >= ?').get(childId, weekAgo);

    res.json({
      subjects,
      gpa,
      readingStreak,
      studySessionsThisWeek: studySessions?.count || 0,
      studyMinutesThisWeek: studySessions?.total_minutes || 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch academics' });
  }
});

// POST /api/academics/subject — Add a subject
router.post('/subject', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'Only parents can add subjects' });

    const { childId, name, grade, icon } = req.body;
    if (!childId || !name) return res.status(400).json({ error: 'Child ID and name required' });

    // IDOR check
    const child = await db.prepare('SELECT family_id FROM children WHERE id = ?').get(childId);
    if (!child || child.family_id !== req.user.familyId) return res.status(403).json({ error: 'Access denied' });

    const id = uuidv4();
    const gradeNumeric = gradeToNumeric(grade);

    await db.prepare('INSERT INTO academic_subjects (id, child_id, name, current_grade, grade_numeric, icon) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, childId, name, grade || null, gradeNumeric, icon || '📖'
    );

    res.json({ id, name, grade, gradeNumeric });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add subject' });
  }
});

// POST /api/academics/grade — Update a grade
router.post('/grade', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'Only parents can update grades' });

    const { subjectId, grade } = req.body;
    if (!subjectId || !grade) return res.status(400).json({ error: 'Subject ID and grade required' });

    const subject = await db.prepare('SELECT * FROM academic_subjects WHERE id = ?').get(subjectId);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    // IDOR check
    const child = await db.prepare('SELECT family_id FROM children WHERE id = ?').get(subject.child_id);
    if (!child || child.family_id !== req.user.familyId) return res.status(403).json({ error: 'Access denied' });

    const gradeNumeric = gradeToNumeric(grade);
    const oldGrade = subject.grade_numeric;
    let trend = 'stable';
    if (gradeNumeric && oldGrade) {
      if (gradeNumeric > oldGrade) trend = 'up';
      else if (gradeNumeric < oldGrade) trend = 'down';
    }

    await db.prepare('UPDATE academic_subjects SET current_grade = ?, grade_numeric = ?, trend = ?, updated_at = NOW() WHERE id = ?').run(
      grade, gradeNumeric, trend, subjectId
    );

    res.json({ subjectId, grade, gradeNumeric, trend });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update grade' });
  }
});

// POST /api/academics/study — Log a study session
router.post('/study', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'child') return res.status(403).json({ error: 'Only children can log study sessions' });

    const { subjectId, plannedMinutes, actualMinutes } = req.body;
    const childId = req.user.id;

    if (!actualMinutes || actualMinutes < 1) return res.status(400).json({ error: 'Invalid study time' });

    // Calculate rewards
    const xp = Math.min(Math.round(actualMinutes * 0.5), 30);
    const money = Math.min(actualMinutes * 0.1, 3.00);

    // Credit rewards
    const wallet = await db.prepare('SELECT * FROM wallets WHERE child_id = ?').get(childId);
    if (wallet && money > 0) {
      const newBalance = (wallet.balance + money).toFixed(2);
      await db.prepare('UPDATE wallets SET balance = ?, total_earned = ?, updated_at = NOW() WHERE id = ?').run(
        parseFloat(newBalance), (wallet.total_earned + money).toFixed(2), wallet.id
      );
    }

    // Update child XP
    const child = await db.prepare('SELECT total_xp FROM children WHERE id = ?').get(childId);
    if (child) {
      await db.prepare('UPDATE children SET total_xp = ?, updated_at = NOW() WHERE id = ?').run(
        child.total_xp + xp, childId
      );
    }

    const id = uuidv4();
    await db.prepare('INSERT INTO study_sessions (id, child_id, subject_id, planned_minutes, actual_minutes, completed, xp_earned, money_earned, started_at, ended_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)').run(
      id, childId, subjectId || null, plannedMinutes || actualMinutes, actualMinutes, xp, money,
      new Date(Date.now() - actualMinutes * 60000).toISOString(),
      new Date().toISOString()
    );

    res.json({ id, xp, money, actualMinutes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log study session' });
  }
});

// POST /api/academics/reading — Log reading
router.post('/reading', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'child') return res.status(403).json({ error: 'Only children can log reading' });

    const { bookTitle, minutesRead, pagesRead } = req.body;
    const childId = req.user.id;

    if (!minutesRead || minutesRead < 1) return res.status(400).json({ error: 'Invalid reading time' });

    // Calculate streak
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const lastReading = await db.prepare('SELECT streak_day FROM reading_log WHERE child_id = ? ORDER BY created_at DESC LIMIT 1').get(childId);
    let streakDay = 1;
    if (lastReading) {
      const lastDate = new Date(lastReading.created_at).toISOString().split('T')[0];
      if (lastDate === yesterday || lastDate === new Date().toISOString().split('T')[0]) {
        streakDay = (lastReading.streak_day || 0) + 1;
      }
    }

    // Reward: $0.50 per day of reading
    const money = 0.50;
    const wallet = await db.prepare('SELECT * FROM wallets WHERE child_id = ?').get(childId);
    if (wallet) {
      const newBalance = (wallet.balance + money).toFixed(2);
      await db.prepare('UPDATE wallets SET balance = ?, total_earned = ?, updated_at = NOW() WHERE id = ?').run(
        parseFloat(newBalance), (wallet.total_earned + money).toFixed(2), wallet.id
      );
    }

    const id = uuidv4();
    await db.prepare('INSERT INTO reading_log (id, child_id, book_title, minutes_read, pages_read, streak_day) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, childId, bookTitle || null, minutesRead, pagesRead || null, streakDay
    );

    res.json({ id, streakDay, money });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log reading' });
  }
});

// Helper: Convert letter grade to numeric
function gradeToNumeric(grade) {
  const map = {
    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D': 1.0, 'D-': 0.7,
    'F': 0.0,
  };
  return map[grade] ?? null;
}

module.exports = router;
