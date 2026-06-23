const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/chores
router.get('/', authenticate, (req, res) => {
  try {
    const chores = db.prepare('SELECT * FROM chores WHERE family_id = ? AND is_active = 1 ORDER BY category, title').all(req.user.familyId);
    res.json({ chores });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chores' });
  }
});

// POST /api/chores
router.post('/', authenticate, (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'Only parents can create chores' });

    const { title, description, category, difficulty, xpValue, moneyValue, estimatedMinutes, requiresPhoto, requiresApproval, recurrence, assignTo } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const choreId = uuidv4();
    db.prepare(`INSERT INTO chores (id, family_id, created_by, title, description, category, difficulty, xp_value, money_value, estimated_minutes, requires_photo, requires_approval, recurrence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      choreId, req.user.familyId, req.user.id, title, description || null,
      category || 'other', difficulty || 'medium', xpValue || 10, moneyValue || 0,
      estimatedMinutes || null, requiresPhoto ? 1 : 0, requiresApproval !== false ? 1 : 0, recurrence || 'daily'
    );

    // Auto-assign to children for today
    if (assignTo && Array.isArray(assignTo)) {
      const today = new Date().toISOString().split('T')[0];
      const insert = db.prepare('INSERT OR IGNORE INTO chore_assignments (id, chore_id, child_id, assigned_date, status) VALUES (?, ?, ?, ?, ?)');
      for (const childId of assignTo) {
        insert.run(uuidv4(), choreId, childId, today, 'pending');
      }
    }

    const chore = db.prepare('SELECT * FROM chores WHERE id = ?').get(choreId);
    res.status(201).json({ chore });
  } catch (err) {
    console.error('Create chore error:', err);
    res.status(500).json({ error: 'Failed to create chore' });
  }
});

// PUT /api/chores/:id
router.put('/:id', authenticate, (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'Only parents can update chores' });
    const { title, description, category, difficulty, xpValue, moneyValue } = req.body;

    db.prepare(`UPDATE chores SET title = COALESCE(?, title), description = COALESCE(?, description),
      category = COALESCE(?, category), difficulty = COALESCE(?, difficulty),
      xp_value = COALESCE(?, xp_value), money_value = COALESCE(?, money_value), updated_at = datetime('now')
      WHERE id = ? AND family_id = ?`).run(
      title, description, category, difficulty, xpValue, moneyValue, req.params.id, req.user.familyId
    );

    const chore = db.prepare('SELECT * FROM chores WHERE id = ?').get(req.params.id);
    res.json({ chore });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update chore' });
  }
});

// DELETE /api/chores/:id
router.delete('/:id', authenticate, (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'Only parents can delete chores' });
    db.prepare('UPDATE chores SET is_active = 0, updated_at = datetime("now") WHERE id = ? AND family_id = ?').run(req.params.id, req.user.familyId);
    res.json({ message: 'Chore deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete chore' });
  }
});

module.exports = router;
