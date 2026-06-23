const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const { logAuditEvent, validators } = require('../middleware/security');

const router = express.Router();

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
}

// IDOR helper — verify assignment belongs to user's family
async function verifyAssignmentAccess(assignmentId, familyId) {
  const assignment = await db.prepare(`
    SELECT ca.*, ch.family_id FROM chore_assignments ca
    JOIN children ch ON ca.child_id = ch.id
    WHERE ca.id = ?
  `).get(assignmentId);
  if (!assignment) return null;
  if (assignment.family_id !== familyId) return null;
  return assignment;
}

async function creditRewards(childId, xp, money, choreId) {
  const child = await db.prepare('SELECT * FROM children WHERE id = ?').get(childId);
  if (!child) return;

  const newTotalXp = child.total_xp + xp;
  const levelRow = await db.prepare('SELECT level FROM level_definitions WHERE xp_required <= ? ORDER BY level DESC LIMIT 1').get(newTotalXp);
  const newLevel = levelRow ? levelRow.level : child.current_level;

  await db.prepare('UPDATE children SET total_xp = ?, current_level = ?, updated_at = NOW() WHERE id = ?').run(newTotalXp, newLevel, childId);

  if (money > 0) {
    const wallet = await db.prepare('SELECT * FROM wallets WHERE child_id = ?').get(childId);
    if (wallet) {
      const currentBalance = parseFloat(wallet.balance) || 0;
      const currentEarned = parseFloat(wallet.total_earned) || 0;
      const newBalance = Number(currentBalance + money).toFixed(2);
      const newTotalEarned = Number(currentEarned + money).toFixed(2);
      await db.prepare('UPDATE wallets SET balance = ?, total_earned = ?, updated_at = NOW() WHERE id = ?').run(
        Number(newBalance), Number(newTotalEarned), wallet.id
      );
      await db.prepare('INSERT INTO financial_transactions (id, child_id, wallet_id, type, amount, category, description, balance_after) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        uuidv4(), childId, wallet.id, 'earning', money, 'chore', 'Chore completed', Number(newBalance)
      );
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const streak = await db.prepare('SELECT * FROM streaks WHERE child_id = ? AND streak_type = ?').get(childId, 'chore');
  if (streak) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let newCount = streak.current_count;
    if (streak.last_date === today) {
      // already counted
    } else if (streak.last_date === yesterday) {
      newCount = streak.current_count + 1;
    } else {
      newCount = 1;
    }
    const longest = Math.max(newCount, streak.longest_count);
    await db.prepare('UPDATE streaks SET current_count = ?, longest_count = ?, last_date = ?, updated_at = NOW() WHERE id = ?').run(newCount, longest, today, streak.id);
    await db.prepare('UPDATE children SET current_streak_days = ?, longest_streak_days = ? WHERE id = ?').run(newCount, longest, childId);
  }

  // Check achievements
  const badges = [];
  if (newTotalXp >= 100) badges.push(['first_100_xp', 'First 100 XP', 'growth']);
  if (newTotalXp >= 1000) badges.push(['xp_1000', '1000 XP Club', 'growth']);
  if (newTotalXp >= 5000) badges.push(['xp_5000', '5000 XP Legend', 'growth']);
  if (newLevel >= 5) badges.push(['level_5', 'Level 5 Champion', 'growth']);
  if (newLevel >= 10) badges.push(['level_10', 'Level 10 Grandmaster', 'growth']);

  const currentStreak = await db.prepare('SELECT current_count FROM streaks WHERE child_id = ? AND streak_type = ?').get(childId, 'chore');
  if (currentStreak) {
    const s = currentStreak.current_count;
    if (s >= 3) badges.push(['streak_3', '3-Day Streak', 'streak']);
    if (s >= 7) badges.push(['streak_7', '7-Day Streak', 'streak']);
    if (s >= 14) badges.push(['streak_14', '14-Day Streak', 'streak']);
    if (s >= 30) badges.push(['streak_30', '30-Day Streak', 'streak']);
  }

  const insertBadge = db.prepare('INSERT INTO achievements (id, child_id, badge_id, badge_name, badge_category, xp_reward) VALUES (?, ?, ?, ?, ?, 0) ON CONFLICT (child_id, badge_id) DO NOTHING');
  for (const [id, name, cat] of badges) {
    await insertBadge.run(uuidv4(), childId, id, name, cat);
  }
}

// GET /api/assignments
router.get('/', authenticate, async (req, res) => {
  try {
    const { childId, date, status } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    let query = `SELECT ca.*, c.title, c.description, c.category, c.difficulty, c.xp_value, c.money_value, c.estimated_minutes, c.requires_photo, c.requires_approval, ch.name as child_name, ch.age as child_age
      FROM chore_assignments ca JOIN chores c ON ca.chore_id = c.id JOIN children ch ON ca.child_id = ch.id
      WHERE ch.family_id = ? AND ca.assigned_date = ?`;
    const params = [req.user.familyId, targetDate];

    if (childId) {
      if (!validators.uuid(childId)) return res.status(400).json({ error: 'Invalid child ID' });
      query += ' AND ca.child_id = ?';
      params.push(childId);
    }
    if (status) {
      query += ' AND ca.status = ?';
      params.push(status);
    }
    query += ' ORDER BY ca.created_at';

    const assignments = await db.prepare(query).all(...params);
    res.json({ assignments });
  } catch (err) {
    console.error('Fetch assignments error:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// GET /api/assignments/today
router.get('/today', authenticate, async (req, res) => {
  try {
    const childId = req.user.role === 'child' ? req.user.id : req.query.childId;
    if (!childId) return res.status(400).json({ error: 'Child ID required' });

    // IDOR check — child can only see their own assignments
    if (req.user.role === 'child' && childId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const today = new Date().toISOString().split('T')[0];
    const assignments = await db.prepare(`SELECT ca.*, c.title, c.description, c.category, c.difficulty, c.xp_value, c.money_value, c.estimated_minutes, c.requires_photo, c.requires_approval
      FROM chore_assignments ca JOIN chores c ON ca.chore_id = c.id WHERE ca.child_id = ? AND ca.assigned_date = ? ORDER BY ca.created_at`).all(childId, today);
    res.json({ assignments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch today assignments' });
  }
});

// POST /api/assignments/:id/complete
router.post('/:id/complete', authenticate, async (req, res) => {
  try {
    if (!validators.uuid(req.params.id)) return res.status(400).json({ error: 'Invalid assignment ID' });

    const { notes, photoUrl } = req.body;

    // IDOR check
    const a = await db.prepare(`SELECT ca.*, c.requires_approval, c.xp_value, c.money_value, c.requires_photo, ch.family_id
      FROM chore_assignments ca JOIN chores c ON ca.chore_id = c.id JOIN children ch ON ca.child_id = ch.id
      WHERE ca.id = ?`).get(req.params.id);
    if (!a) return res.status(404).json({ error: 'Assignment not found' });
    if (a.family_id !== req.user.familyId) return res.status(403).json({ error: 'Access denied' });

    // Child can only complete their own assignments
    if (req.user.role === 'child' && a.child_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only complete your own tasks' });
    }

    if (a.requires_photo && !photoUrl) return res.status(400).json({ error: 'Photo proof required' });

    const newStatus = a.requires_approval ? 'completed' : 'approved';
    const approvedAt = a.requires_approval ? null : new Date().toISOString();

    await db.prepare('UPDATE chore_assignments SET status = ?, completed_at = NOW(), approved_at = ?, notes = ?, photo_url = ?, updated_at = NOW() WHERE id = ?').run(
      newStatus, approvedAt, notes || null, photoUrl || null, req.params.id
    );

    if (!a.requires_approval) await creditRewards(a.child_id, a.xp_value, a.money_value, a.chore_id);

    logAuditEvent(req.user.id, 'chore_completed', { assignmentId: req.params.id, childId: a.child_id, ip: getClientIp(req) });

    const updated = await db.prepare('SELECT ca.*, c.title, c.category, c.xp_value, c.money_value FROM chore_assignments ca JOIN chores c ON ca.chore_id = c.id WHERE ca.id = ?').get(req.params.id);
    res.json({ assignment: updated });
  } catch (err) {
    console.error('Complete error:', err);
    res.status(500).json({ error: 'Failed to complete chore' });
  }
});

// POST /api/assignments/:id/approve
router.post('/:id/approve', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'Only parents can approve' });
    if (!validators.uuid(req.params.id)) return res.status(400).json({ error: 'Invalid assignment ID' });

    // IDOR check
    const a = await db.prepare(`SELECT ca.*, c.xp_value, c.money_value, ch.family_id
      FROM chore_assignments ca JOIN chores c ON ca.chore_id = c.id JOIN children ch ON ca.child_id = ch.id
      WHERE ca.id = ?`).get(req.params.id);
    if (!a) return res.status(404).json({ error: 'Assignment not found' });
    if (a.family_id !== req.user.familyId) return res.status(403).json({ error: 'Access denied' });

    await db.prepare('UPDATE chore_assignments SET status = ?, approved_at = NOW(), approved_by = ?, xp_earned = ?, money_earned = ?, updated_at = NOW() WHERE id = ?').run(
      'approved', req.user.id, a.xp_value, a.money_value, req.params.id
    );

    await creditRewards(a.child_id, a.xp_value, a.money_value, a.chore_id);

    logAuditEvent(req.user.id, 'chore_approved', { assignmentId: req.params.id, childId: a.child_id, xp: a.xp_value, money: a.money_value, ip: getClientIp(req) });

    const updated = await db.prepare('SELECT ca.*, c.title, c.category FROM chore_assignments ca JOIN chores c ON ca.chore_id = c.id WHERE ca.id = ?').get(req.params.id);
    res.json({ assignment: updated });
  } catch (err) {
    console.error('Approve error:', err);
    res.status(500).json({ error: 'Failed to approve' });
  }
});

// POST /api/assignments/:id/reject
router.post('/:id/reject', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'Only parents can reject' });
    if (!validators.uuid(req.params.id)) return res.status(400).json({ error: 'Invalid assignment ID' });

    const { reason } = req.body;

    // IDOR check
    const a = await db.prepare(`SELECT ca.*, ch.family_id FROM chore_assignments ca JOIN children ch ON ca.child_id = ch.id WHERE ca.id = ?`).get(req.params.id);
    if (!a) return res.status(404).json({ error: 'Assignment not found' });
    if (a.family_id !== req.user.familyId) return res.status(403).json({ error: 'Access denied' });

    await db.prepare('UPDATE chore_assignments SET status = ?, rejection_reason = ?, updated_at = NOW() WHERE id = ?').run('rejected', reason || 'Please try again', req.params.id);

    logAuditEvent(req.user.id, 'chore_rejected', { assignmentId: req.params.id, childId: a.child_id, reason, ip: getClientIp(req) });

    const updated = await db.prepare('SELECT * FROM chore_assignments WHERE id = ?').get(req.params.id);
    res.json({ assignment: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject' });
  }
});

// POST /api/assignments/bulk-approve
router.post('/bulk-approve', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'Only parents can approve' });

    const { childId } = req.body;
    if (!childId || !validators.uuid(childId)) return res.status(400).json({ error: 'Valid child ID required' });

    // IDOR check — child must belong to parent's family
    const child = await db.prepare('SELECT family_id FROM children WHERE id = ?').get(childId);
    if (!child || child.family_id !== req.user.familyId) return res.status(403).json({ error: 'Access denied' });

    const today = new Date().toISOString().split('T')[0];
    const pending = await db.prepare(`SELECT ca.id, ca.child_id, c.xp_value, c.money_value, c.id as chore_id
      FROM chore_assignments ca JOIN chores c ON ca.chore_id = c.id
      WHERE ca.child_id = ? AND ca.assigned_date = ? AND ca.status = 'completed'`).all(childId, today);

    for (const a of pending) {
      await db.prepare('UPDATE chore_assignments SET status = ?, approved_at = NOW(), approved_by = ?, xp_earned = ?, money_earned = ?, updated_at = NOW() WHERE id = ?').run(
        'approved', req.user.id, a.xp_value, a.money_value, a.id
      );
      await creditRewards(a.child_id, a.xp_value, a.money_value, a.chore_id);
    }

    logAuditEvent(req.user.id, 'bulk_approve', { childId, count: pending.length, ip: getClientIp(req) });

    res.json({ approved: pending.length });
  } catch (err) {
    res.status(500).json({ error: 'Bulk approve failed' });
  }
});

module.exports = router;
