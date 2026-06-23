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
// FOCUS MODE
// ============================================

// GET /api/focus/schedule — Get focus blocks for a child
router.get('/schedule', authenticate, async (req, res) => {
  try {
    const childId = req.user.role === 'child' ? req.user.id : req.query.childId;
    if (!childId) return res.status(400).json({ error: 'Child ID required' });

    // IDOR check
    if (req.user.role === 'child' && childId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    const child = await db.prepare('SELECT family_id FROM children WHERE id = ?').get(childId);
    if (!child || (req.user.role === 'parent' && child.family_id !== req.user.familyId)) return res.status(403).json({ error: 'Access denied' });

    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().getDay();
    const schedules = await db.prepare(`
      SELECT * FROM focus_blocks
      WHERE child_id = ? AND (repeat_day = ? OR specific_date = ?::date)
      ORDER BY start_time
    `).all(childId, dayOfWeek, today);

    res.json({ schedules });
  } catch (err) {
    // Table might not exist yet
    res.json({ schedules: [] });
  }
});

// POST /api/focus/create — Parent creates a focus block
router.post('/create', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'Only parents can create focus blocks' });

    const { childId, title, startTime, endTime, repeatDay, specificDate, allowedApps, blockType } = req.body;
    if (!childId || !startTime || !endTime) return res.status(400).json({ error: 'Child ID, start time, and end time required' });

    // IDOR check
    const child = await db.prepare('SELECT family_id, name FROM children WHERE id = ?').get(childId);
    if (!child || child.family_id !== req.user.familyId) return res.status(403).json({ error: 'Access denied' });

    const id = uuidv4();
    await db.prepare(`
      INSERT INTO focus_blocks (id, child_id, title, start_time, end_time, repeat_day, specific_date, allowed_apps, block_type, created_by)
      VALUES (?, ?, ?, ?::time, ?::time, ?, ?, ?, ?, ?)
    `).run(
      id, childId, title || 'Focus Time', startTime + ':00', endTime + ':00',
      repeatDay ?? null, specificDate || null,
      allowedApps ? JSON.stringify(allowedApps) : '["familyos","calculator","dictionary"]',
      blockType || 'reading', req.user.id
    );

    logAuditEvent(req.user.id, 'focus_block_created', { childId, title, startTime, endTime, ip: getClientIp(req) });

    res.json({ id, title, startTime, endTime });
  } catch (err) {
    console.error('Focus create error:', err);
    res.status(500).json({ error: 'Failed to create focus block' });
  }
});

// POST /api/focus/start — Child starts a focus session
router.post('/start', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'child') return res.status(403).json({ error: 'Only children can start focus sessions' });

    const { blockId } = req.body;
    const childId = req.user.id;

    const id = uuidv4();
    await db.prepare(`
      INSERT INTO focus_sessions (id, child_id, block_id, started_at)
      VALUES (?, ?, ?, NOW())
    `).run(id, childId, blockId || null);

    res.json({ sessionId: id, started: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start focus session' });
  }
});

// POST /api/focus/end — Child ends a focus session
router.post('/end', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'child') return res.status(403).json({ error: 'Only children can end focus sessions' });

    const { sessionId, minutesRead } = req.body;
    const childId = req.user.id;

    // Get the session
    const session = await db.prepare('SELECT * FROM focus_sessions WHERE id = ? AND child_id = ?').get(sessionId, childId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Calculate duration
    const startTime = new Date(session.started_at);
    const durationMinutes = Math.round((Date.now() - startTime.getTime()) / 60000);

    // Calculate reward (1 coin per 5 minutes of reading)
    const coins = Math.floor((minutesRead || durationMinutes) / 5) * 0.50;

    // Credit wallet
    if (coins > 0) {
      const wallet = await db.prepare('SELECT * FROM wallets WHERE child_id = ?').get(childId);
      if (wallet) {
        const newBalance = (parseFloat(wallet.balance) + coins).toFixed(2);
        await db.prepare('UPDATE wallets SET balance = ?, total_earned = ?, updated_at = NOW() WHERE id = ?').run(
          parseFloat(newBalance), (parseFloat(wallet.total_earned) + coins).toFixed(2), wallet.id
        );
        await db.prepare('INSERT INTO financial_transactions (id, child_id, wallet_id, type, amount, category, description, balance_after) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
          uuidv4(), childId, wallet.id, 'earning', coins, 'focus', `Focus session: ${minutesRead || durationMinutes} min`, parseFloat(newBalance)
        );
      }
    }

    // Update session
    await db.prepare('UPDATE focus_sessions SET ended_at = NOW(), duration_minutes = ?, coins_earned = ? WHERE id = ?').run(
      durationMinutes, coins, sessionId
    );

    // Log reading
    if (minutesRead && minutesRead > 0) {
      await db.prepare('INSERT INTO reading_log (id, child_id, minutes_read, streak_day) VALUES (?, ?, ?, 1)').run(
        uuidv4(), childId, minutesRead
      );
    }

    res.json({ durationMinutes, coins, completed: true });
  } catch (err) {
    console.error('Focus end error:', err);
    res.status(500).json({ error: 'Failed to end focus session' });
  }
});

// ============================================
// FAMILY VAULT SUMMARY
// ============================================

// GET /api/vault/monthly — Monthly family report
router.get('/monthly', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'Only parents can view vault summary' });

    const familyId = req.user.familyId;
    const month = req.query.month || new Date().toISOString().substring(0, 7); // YYYY-MM
    const startDate = `${month}-01`;
    // Calculate end of month properly
    const [year, mon] = month.split('-').map(Number);
    const lastDay = new Date(year, mon, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

    const children = await db.prepare('SELECT id, name, age, current_level, total_xp FROM children WHERE family_id = ? ORDER BY age').all(familyId);

    const childReports = [];
    let totalEarnings = 0;
    let totalSpent = 0;
    let totalTax = 0;
    let totalChores = 0;

    for (const child of children) {
      // Earnings this month
      const earnings = await db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM financial_transactions
        WHERE child_id = ? AND type = 'earning' AND created_at >= ? AND created_at <= ?
      `).get(child.id, startDate, endDate);

      // Spending this month
      const spending = await db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM financial_transactions
        WHERE child_id = ? AND type = 'spending' AND created_at >= ? AND created_at <= ?
      `).get(child.id, startDate, endDate);

      // Tax paid this month
      const tax = await db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM financial_transactions
        WHERE child_id = ? AND type = 'tax' AND created_at >= ? AND created_at <= ?
      `).get(child.id, startDate, endDate);

      // Chores completed this month
      const chores = await db.prepare(`
        SELECT COUNT(*) as total FROM chore_assignments
        WHERE child_id = ? AND status = 'approved' AND approved_at >= ? AND approved_at <= ?
      `).get(child.id, startDate, endDate);

      // Trust score
      const trust = await db.prepare('SELECT score FROM trust_scores WHERE child_id = ?').get(child.id);

      // Mood summary
      const moods = await db.prepare(`
        SELECT mood, COUNT(*) as count FROM mood_checkins
        WHERE child_id = ? AND created_at >= ? AND created_at <= ?
        GROUP BY mood ORDER BY count DESC
      `).all(child.id, startDate, endDate);

      // Academic summary
      const subjects = await db.prepare('SELECT name, current_grade, trend FROM academic_subjects WHERE child_id = ?').all(child.id);

      // Reading minutes
      const reading = await db.prepare(`
        SELECT COALESCE(SUM(minutes_read), 0) as total FROM reading_log
        WHERE child_id = ? AND created_at >= ? AND created_at <= ?
      `).get(child.id, startDate, endDate);

      // Current wallet balance
      const wallet = await db.prepare('SELECT balance FROM wallets WHERE child_id = ?').get(child.id);

      childReports.push({
        id: child.id,
        name: child.name,
        age: child.age,
        level: child.current_level,
        xp: child.total_xp,
        earnings: parseFloat(earnings.total),
        spending: parseFloat(spending.total),
        taxPaid: parseFloat(tax.total),
        choresCompleted: chores.total,
        trustScore: trust?.score || 50,
        topMood: moods[0]?.mood || 'N/A',
        moodBreakdown: moods,
        subjects,
        readingMinutes: reading.total,
        walletBalance: parseFloat(wallet?.balance || 0),
      });

      totalEarnings += parseFloat(earnings.total);
      totalSpent += parseFloat(spending.total);
      totalTax += parseFloat(tax.total);
      totalChores += chores.total;
    }

    // Tax pool usage (what parent spent tax on)
    const taxPool = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM financial_transactions ft
      JOIN children c ON ft.child_id = c.id
      WHERE c.family_id = ? AND ft.type = 'tax' AND ft.created_at >= ? AND ft.created_at <= ?
    `).get(familyId, startDate, endDate);

    // Top earner
    const topEarner = childReports.reduce((max, c) => c.earnings > max.earnings ? c : max, childReports[0]);

    // Most improved (highest trust score)
    const mostTrusted = childReports.reduce((max, c) => c.trustScore > max.trustScore ? c : max, childReports[0]);

    res.json({
      month,
      summary: {
        totalEarnings,
        totalSpent,
        totalTax,
        totalChoresCompleted: totalChores,
        taxPoolBalance: parseFloat(taxPool.total),
        childrenCount: children.length,
      },
      topEarner: topEarner ? { name: topEarner.name, earnings: topEarner.earnings } : null,
      mostTrusted: mostTrusted ? { name: mostTrusted.name, score: mostTrusted.trustScore } : null,
      children: childReports,
    });
  } catch (err) {
    console.error('Vault monthly error:', err);
    res.status(500).json({ error: 'Failed to generate vault summary' });
  }
});

// GET /api/vault/yearly — Year-end summary
router.get('/yearly', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'Only parents can view yearly summary' });

    const familyId = req.user.familyId;
    const year = req.query.year || new Date().getFullYear();
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const children = await db.prepare('SELECT id, name, age FROM children WHERE family_id = ? ORDER BY age').all(familyId);

    const yearReports = [];
    for (const child of children) {
      const earnings = await db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM financial_transactions
        WHERE child_id = ? AND type = 'earning' AND created_at >= ? AND created_at <= ?
      `).get(child.id, startDate, endDate);

      const chores = await db.prepare(`
        SELECT COUNT(*) as total FROM chore_assignments
        WHERE child_id = ? AND status = 'approved' AND approved_at >= ? AND approved_at <= ?
      `).get(child.id, startDate, endDate);

      const reading = await db.prepare(`
        SELECT COALESCE(SUM(minutes_read), 0) as total FROM reading_log
        WHERE child_id = ? AND created_at >= ? AND created_at <= ?
      `).get(child.id, startDate, endDate);

      const badges = await db.prepare(`
        SELECT COUNT(*) as total FROM achievements WHERE child_id = ? AND earned_at >= ? AND earned_at <= ?
      `).get(child.id, startDate, endDate);

      const trust = await db.prepare('SELECT score FROM trust_scores WHERE child_id = ?').get(child.id);

      yearReports.push({
        name: child.name,
        age: child.age,
        totalEarnings: parseFloat(earnings.total),
        choresCompleted: chores.total,
        readingMinutes: reading.total,
        badgesEarned: badges.total,
        trustScore: trust?.score || 50,
      });
    }

    res.json({
      year: parseInt(year),
      familyName: (await db.prepare('SELECT name FROM families WHERE id = ?').get(familyId))?.name,
      children: yearReports,
    });
  } catch (err) {
    console.error('Vault yearly error:', err);
    res.status(500).json({ error: 'Failed to generate yearly summary' });
  }
});

// ============================================
// SESSION SECURITY — Re-auth for sensitive actions
// ============================================

// POST /api/security/verify-pin — Re-verify PIN before sensitive action
router.post('/verify-pin', authenticate, async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: 'PIN required' });

    if (req.user.role === 'child') {
      const child = await db.prepare('SELECT pin FROM children WHERE id = ?').get(req.user.id);
      if (!child || child.pin !== pin) {
        logAuditEvent(req.user.id, 'pin_verify_failed', { ip: getClientIp(req) });
        return res.status(401).json({ error: 'Invalid PIN', verified: false });
      }
    } else if (req.user.role === 'parent') {
      const user = await db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
      const bcrypt = require('bcryptjs');
      if (!user || !bcrypt.compareSync(pin, user.password_hash)) {
        logAuditEvent(req.user.id, 'password_verify_failed', { ip: getClientIp(req) });
        return res.status(401).json({ error: 'Invalid password', verified: false });
      }
    }

    // Issue a short-lived verification token (5 minutes)
    const { generateToken } = require('../middleware/auth');
    const verifyToken = generateToken({ id: req.user.id, role: req.user.role, verified: true });

    logAuditEvent(req.user.id, 'sensitive_action_verified', { ip: getClientIp(req) });

    res.json({ verified: true, verifyToken, expiresIn: 300 });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ============================================
// BID PRIVACY CONTROLS
// ============================================

// GET /api/family/bid-settings — Get bid visibility settings
router.get('/bid-settings', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'Only parents can view settings' });

    const config = await db.prepare('SELECT * FROM economy_config WHERE family_id = ?').get(req.user.familyId);

    res.json({
      showBidderNames: config?.show_bidder_names ?? false,
      showWalletBalances: false, // Never show wallet balances to other children
      showLeaderboard: config?.show_leaderboard ?? true,
    });
  } catch (err) {
    res.json({ showBidderNames: false, showWalletBalances: false, showLeaderboard: true });
  }
});

// PUT /api/family/bid-settings — Update bid visibility
router.put('/bid-settings', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'Only parents can update settings' });

    const { showBidderNames, showLeaderboard } = req.body;

    // Ensure economy config exists
    let config = await db.prepare('SELECT id FROM economy_config WHERE family_id = ?').get(req.user.familyId);
    if (!config) {
      await db.prepare('INSERT INTO economy_config (id, family_id) VALUES (?, ?)').run(uuidv4(), req.user.familyId);
    }

    await db.prepare('UPDATE economy_config SET show_bidder_names = ?, show_leaderboard = ?, updated_at = NOW() WHERE family_id = ?').run(
      showBidderNames ? true : false,
      showLeaderboard !== false ? true : false,
      req.user.familyId
    );

    logAuditEvent(req.user.id, 'bid_settings_updated', { showBidderNames, showLeaderboard, ip: getClientIp(req) });

    res.json({ updated: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
