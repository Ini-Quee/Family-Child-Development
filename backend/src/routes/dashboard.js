const express = require('express');
const db = require('../db/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard
router.get('/', authenticate, async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const today = new Date().toISOString().split('T')[0];

    const children = await db.prepare('SELECT id, name, age, current_level, total_xp, current_streak_days FROM children WHERE family_id = ? ORDER BY age').all(familyId);

    const childStats = [];
    for (const child of children) {
      const assignments = await db.prepare(`SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
        FROM chore_assignments WHERE child_id = ? AND assigned_date = ?`).get(child.id, today);

      const wallet = await db.prepare('SELECT balance, total_earned FROM wallets WHERE child_id = ?').get(child.id);

      childStats.push({ ...child, today: assignments, wallet: wallet || { balance: 0, total_earned: 0 } });
    }

    const pendingApprovals = await db.prepare(`SELECT ca.id, ca.completed_at, ca.photo_url, c.title, ch.name as child_name, ch.id as child_id
      FROM chore_assignments ca JOIN chores c ON ca.chore_id = c.id JOIN children ch ON ca.child_id = ch.id
      WHERE ch.family_id = ? AND ca.assigned_date = ? AND ca.status = 'completed' ORDER BY ca.completed_at`).all(familyId, today);

    const familyStats = await db.prepare(`SELECT
      COUNT(*) as total_assignments,
      SUM(CASE WHEN ca.status = 'approved' THEN 1 ELSE 0 END) as total_completed,
      SUM(CASE WHEN ca.status = 'pending' THEN 1 ELSE 0 END) as total_pending,
      SUM(CASE WHEN ca.status = 'completed' THEN 1 ELSE 0 END) as total_awaiting_approval
      FROM chore_assignments ca JOIN children ch ON ca.child_id = ch.id WHERE ch.family_id = ? AND ca.assigned_date = ?`).get(familyId, today);

    const completionRate = familyStats.total_assignments > 0
      ? Math.round((familyStats.total_completed / familyStats.total_assignments) * 100) : 0;

    res.json({ children: childStats, pendingApprovals, familyStats: { ...familyStats, completionRate }, date: today });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// GET /api/dashboard/weekly
router.get('/weekly', authenticate, async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 86400000).toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    const weeklyStats = await db.prepare(`SELECT ch.id, ch.name, ch.age,
      COUNT(ca.id) as total,
      SUM(CASE WHEN ca.status = 'approved' THEN 1 ELSE 0 END) as completed,
      SUM(COALESCE(ca.xp_earned, 0)) as xp_earned,
      SUM(COALESCE(ca.money_earned, 0)) as money_earned
      FROM children ch LEFT JOIN chore_assignments ca ON ch.id = ca.child_id AND ca.assigned_date BETWEEN ? AND ?
      WHERE ch.family_id = ? GROUP BY ch.id, ch.name, ch.age ORDER BY ch.age`).all(weekAgo, todayStr, familyId);

    res.json({
      weeklyStats: weeklyStats.map(s => ({ ...s, completionRate: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0 })),
      period: { from: weekAgo, to: todayStr },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch weekly stats' });
  }
});

module.exports = router;
