const express = require('express');
const db = require('../db/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/insights — Get AI-powered family insights
router.get('/', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'Only parents can view insights' });

    const familyId = req.user.familyId;
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    const children = await db.prepare('SELECT id, name, age FROM children WHERE family_id = ? ORDER BY age').all(familyId);
    const insights = [];

    for (const child of children) {
      // Task completion trends
      const thisWeek = await db.prepare(`
        SELECT COUNT(*) as total, SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as completed
        FROM chore_assignments WHERE child_id = ? AND assigned_date >= ?
      `).get(child.id, weekAgo);

      const lastWeek = await db.prepare(`
        SELECT COUNT(*) as total, SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as completed
        FROM chore_assignments WHERE child_id = ?
        AND assigned_date >= ?::date - INTERVAL '7 days' AND assigned_date < ?
      `).get(child.id, weekAgo, weekAgo);

      const thisWeekRate = thisWeek.total > 0 ? (thisWeek.completed / thisWeek.total * 100) : 0;
      const lastWeekRate = lastWeek.total > 0 ? (lastWeek.completed / lastWeek.total * 100) : 0;

      if (thisWeekRate < lastWeekRate - 10) {
        insights.push({
          type: 'warning',
          icon: '📉',
          child: child.name,
          text: `${child.name}'s task completion dropped from ${Math.round(lastWeekRate)}% to ${Math.round(thisWeekRate)}% this week.`,
          action: 'View tasks',
        });
      } else if (thisWeekRate > lastWeekRate + 10 && thisWeek.total > 0) {
        insights.push({
          type: 'positive',
          icon: '✨',
          child: child.name,
          text: `${child.name}'s task completion improved from ${Math.round(lastWeekRate)}% to ${Math.round(thisWeekRate)}% this week. Great progress!`,
        });
      }

      // Mood trends
      const moods = await db.prepare(`
        SELECT mood FROM mood_checkins WHERE child_id = ? AND created_at >= ? ORDER BY created_at DESC LIMIT 7
      `).all(child.id, weekAgo);

      if (moods.length >= 3) {
        const negativeMoods = moods.filter(m => ['😫', '😟'].includes(m.mood)).length;
        const ratio = negativeMoods / moods.length;
        if (ratio > 0.5) {
          insights.push({
            type: 'alert',
            icon: '😟',
            child: child.name,
            text: `${child.name} has reported negative moods ${Math.round(ratio * 100)}% of the past week. Consider checking in.`,
            action: 'View mood history',
          });
        }
      }

      // Trust score changes
      const trust = await db.prepare('SELECT score FROM trust_scores WHERE child_id = ?').get(child.id);
      if (trust) {
        if (trust.score < 40) {
          insights.push({
            type: 'warning',
            icon: '⚠️',
            child: child.name,
            text: `${child.name}'s trust score is ${trust.score}. They can only access standard jobs. Consider assigning a booster task.`,
            action: 'Assign booster',
          });
        } else if (trust.score >= 95) {
          insights.push({
            type: 'positive',
            icon: '🌟',
            child: child.name,
            text: `${child.name}'s trust score is ${trust.score}! They have full marketplace access and can set their own limits.`,
          });
        }
      }

      // Academic trends
      const subjects = await db.prepare('SELECT name, current_grade, trend FROM academic_subjects WHERE child_id = ?').all(child.id);
      for (const subject of subjects) {
        if (subject.trend === 'down') {
          insights.push({
            type: 'academic',
            icon: '📚',
            child: child.name,
            text: `${child.name}'s ${subject.name} grade dropped to ${subject.current_grade}. Consider creating a study bounty.`,
            action: 'Create study bounty',
          });
        }
      }

      // Reading streak
      const reading = await db.prepare('SELECT streak_day FROM reading_log WHERE child_id = ? ORDER BY created_at DESC LIMIT 1').get(child.id);
      if (reading && reading.streak_day >= 7) {
        insights.push({
          type: 'positive',
          icon: '📖',
          child: child.name,
          text: `${child.name} is on a ${reading.streak_day}-day reading streak! Keep it going.`,
        });
      }

      // Screen time vs study time ratio
      const screenTime = await db.prepare(`
        SELECT SUM(minutes) as total FROM screen_time_purchases WHERE child_id = ? AND created_at >= ?
      `).get(child.id, weekAgo);
      const studyTime = await db.prepare(`
        SELECT SUM(actual_minutes) as total FROM study_sessions WHERE child_id = ? AND created_at >= ?
      `).get(child.id, weekAgo);

      const screen = screenTime?.total || 0;
      const study = studyTime?.total || 0;
      if (screen > 0 && study > 0 && screen > study * 3) {
        insights.push({
          type: 'warning',
          icon: '📱',
          child: child.name,
          text: `${child.name}'s screen time (${screen}min) is ${Math.round(screen / study)}x their study time (${study}min) this week. Consider adjusting exchange rates.`,
        });
      }
    }

    // Family-wide insights
    const totalEarnings = await db.prepare(`
      SELECT SUM(balance) as total FROM wallets w JOIN children c ON w.child_id = c.id WHERE c.family_id = ?
    `).get(familyId);

    const totalTax = await db.prepare(`
      SELECT SUM(amount) as total FROM financial_transactions ft
      JOIN children c ON ft.child_id = c.id
      WHERE c.family_id = ? AND ft.type = 'tax'
    `).get(familyId);

    res.json({
      insights: insights.sort((a, b) => {
        const priority = { alert: 0, warning: 1, academic: 2, positive: 3 };
        return (priority[a.type] || 99) - (priority[b.type] || 99);
      }),
      stats: {
        totalEarnings: totalEarnings?.total || 0,
        totalTax: totalTax?.total || 0,
        childrenCount: children.length,
      },
    });
  } catch (err) {
    console.error('Insights error:', err);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

module.exports = router;
