const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/children
router.get('/', authenticate, (req, res) => {
  try {
    const children = db.prepare('SELECT id, name, age, avatar_url, current_level, total_xp, current_streak_days, longest_streak_days FROM children WHERE family_id = ? ORDER BY age').all(req.user.familyId);
    res.json({ children });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch children' });
  }
});

// POST /api/children
router.post('/', authenticate, (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'Only parents can add children' });
    const { name, age, pin } = req.body;
    if (!name || !age || !pin) return res.status(400).json({ error: 'Name, age, and PIN are required' });
    if (!/^\d{4}$/.test(pin)) return res.status(400).json({ error: 'PIN must be exactly 4 digits' });

    const childId = uuidv4();
    db.prepare('INSERT INTO children (id, family_id, name, age, pin) VALUES (?, ?, ?, ?, ?)').run(childId, req.user.familyId, name, age, pin);
    db.prepare('INSERT INTO wallets (id, child_id) VALUES (?, ?)').run(uuidv4(), childId);
    for (const type of ['chore', 'homework', 'exercise']) {
      db.prepare('INSERT INTO streaks (id, child_id, streak_type) VALUES (?, ?, ?)').run(uuidv4(), childId, type);
    }

    const child = db.prepare('SELECT id, name, age, avatar_url, current_level, total_xp FROM children WHERE id = ?').get(childId);
    res.status(201).json({ child });
  } catch (err) {
    console.error('Add child error:', err);
    res.status(500).json({ error: 'Failed to add child' });
  }
});

// PUT /api/children/:id
router.put('/:id', authenticate, (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'Only parents can update children' });
    const { name, age, pin, avatarUrl } = req.body;
    db.prepare('UPDATE children SET name = COALESCE(?, name), age = COALESCE(?, age), pin = COALESCE(?, pin), avatar_url = COALESCE(?, avatar_url), updated_at = datetime("now") WHERE id = ? AND family_id = ?').run(
      name, age, pin, avatarUrl, req.params.id, req.user.familyId
    );
    const child = db.prepare('SELECT id, name, age, avatar_url, current_level, total_xp FROM children WHERE id = ?').get(req.params.id);
    res.json({ child });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update child' });
  }
});

// DELETE /api/children/:id
router.delete('/:id', authenticate, (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'Only parents can remove children' });
    db.prepare('DELETE FROM children WHERE id = ? AND family_id = ?').run(req.params.id, req.user.familyId);
    res.json({ message: 'Child removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove child' });
  }
});

// GET /api/children/:id/progress
router.get('/:id/progress', authenticate, (req, res) => {
  try {
    const child = db.prepare('SELECT id, name, age, current_level, total_xp, current_streak_days, longest_streak_days FROM children WHERE id = ?').get(req.params.id);
    if (!child) return res.status(404).json({ error: 'Child not found' });

    const level = db.prepare('SELECT * FROM level_definitions WHERE level = ?').get(child.current_level);
    const nextLevel = db.prepare('SELECT * FROM level_definitions WHERE level > ? ORDER BY level ASC LIMIT 1').get(child.current_level);
    const streaks = db.prepare('SELECT streak_type, current_count, longest_count FROM streaks WHERE child_id = ?').all(req.params.id);
    const achievements = db.prepare('SELECT badge_id, badge_name, badge_category, earned_at FROM achievements WHERE child_id = ? ORDER BY earned_at DESC LIMIT 10').all(req.params.id);

    const today = new Date().toISOString().split('T')[0];
    const todayStats = db.prepare(`SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as awaiting_approval
      FROM chore_assignments WHERE child_id = ? AND assigned_date = ?`).get(req.params.id, today);

    res.json({ child, level: level || { level: 1, title: 'Newcomer', xp_required: 0 }, nextLevel: nextLevel || null, streaks, achievements, today: todayStats });
  } catch (err) {
    console.error('Progress error:', err);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// GET /api/children/:id/wallet
router.get('/:id/wallet', authenticate, (req, res) => {
  try {
    const wallet = db.prepare('SELECT * FROM wallets WHERE child_id = ?').get(req.params.id);
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
    const transactions = db.prepare('SELECT * FROM financial_transactions WHERE child_id = ? ORDER BY created_at DESC LIMIT 20').all(req.params.id);
    res.json({ wallet, transactions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

module.exports = router;
