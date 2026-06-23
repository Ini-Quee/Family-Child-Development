const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const { logAuditEvent, validators, sanitize } = require('../middleware/security');

const router = express.Router();

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
}

// GET /api/chores
router.get('/', authenticate, async (req, res) => {
  try {
    const chores = await db.prepare('SELECT * FROM chores WHERE family_id = ? AND is_active = 1 ORDER BY category, title').all(req.user.familyId);
    res.json({ chores });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chores' });
  }
});

// POST /api/chores
router.post('/', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'Only parents can create chores' });

    const { title, description, category, difficulty, xpValue, moneyValue, estimatedMinutes, requiresPhoto, requiresApproval, recurrence, assignTo } = req.body;
    if (!title || typeof title !== 'string' || title.length > 200) {
      return res.status(400).json({ error: 'Title is required (max 200 characters)' });
    }
    if (description && description.length > 500) {
      return res.status(400).json({ error: 'Description too long (max 500 characters)' });
    }
    if (category && !validators.category(category)) return res.status(400).json({ error: 'Invalid category' });
    if (difficulty && !validators.difficulty(difficulty)) return res.status(400).json({ error: 'Invalid difficulty' });
    if (xpValue !== undefined && !validators.xp(xpValue)) return res.status(400).json({ error: 'Invalid XP value' });
    if (moneyValue !== undefined && !validators.money(moneyValue)) return res.status(400).json({ error: 'Invalid money value' });
    if (recurrence && !validators.recurrence(recurrence)) return res.status(400).json({ error: 'Invalid recurrence' });

    // Validate assignTo array
    if (assignTo && Array.isArray(assignTo)) {
      for (const childId of assignTo) {
        if (!validators.uuid(childId)) return res.status(400).json({ error: 'Invalid child ID in assignTo' });
        // Verify child belongs to family
        const child = await db.prepare('SELECT family_id FROM children WHERE id = ?').get(childId);
        if (!child || child.family_id !== req.user.familyId) {
          return res.status(403).json({ error: 'Cannot assign to child outside your family' });
        }
      }
    }

    const choreId = uuidv4();
    await db.prepare(`INSERT INTO chores (id, family_id, created_by, title, description, category, difficulty, xp_value, money_value, estimated_minutes, requires_photo, requires_approval, recurrence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      choreId, req.user.familyId, req.user.id, sanitize(title), description ? sanitize(description) : null,
      category || 'other', difficulty || 'medium', xpValue || 10, moneyValue || 0,
      estimatedMinutes || null, requiresPhoto ? 1 : 0, requiresApproval !== false ? 1 : 0, recurrence || 'daily'
    );

    // Auto-assign to children for today
    if (assignTo && Array.isArray(assignTo)) {
      const today = new Date().toISOString().split('T')[0];
      const insert = db.prepare('INSERT OR IGNORE INTO chore_assignments (id, chore_id, child_id, assigned_date, status) VALUES (?, ?, ?, ?, ?)');
      for (const childId of assignTo) {
        await insert.run(uuidv4(), choreId, childId, today, 'pending');
      }
    }

    logAuditEvent(req.user.id, 'chore_created', { choreId, title: sanitize(title), assignTo, ip: getClientIp(req) });

    const chore = await db.prepare('SELECT * FROM chores WHERE id = ?').get(choreId);
    res.status(201).json({ chore });
  } catch (err) {
    console.error('Create chore error:', err);
    res.status(500).json({ error: 'Failed to create chore' });
  }
});

// PUT /api/chores/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'Only parents can update chores' });
    if (!validators.uuid(req.params.id)) return res.status(400).json({ error: 'Invalid chore ID' });

    // IDOR check
    const existing = await db.prepare('SELECT family_id FROM chores WHERE id = ?').get(req.params.id);
    if (!existing || existing.family_id !== req.user.familyId) return res.status(403).json({ error: 'Access denied' });

    const { title, description, category, difficulty, xpValue, moneyValue } = req.body;
    if (title && title.length > 200) return res.status(400).json({ error: 'Title too long' });
    if (category && !validators.category(category)) return res.status(400).json({ error: 'Invalid category' });
    if (difficulty && !validators.difficulty(difficulty)) return res.status(400).json({ error: 'Invalid difficulty' });

    await db.prepare(`UPDATE chores SET title = COALESCE(?, title), description = COALESCE(?, description),
      category = COALESCE(?, category), difficulty = COALESCE(?, difficulty),
      xp_value = COALESCE(?, xp_value), money_value = COALESCE(?, money_value), updated_at = NOW()
      WHERE id = ? AND family_id = ?`).run(
      title ? sanitize(title) : null, description ? sanitize(description) : null,
      category, difficulty, xpValue, moneyValue, req.params.id, req.user.familyId
    );

    logAuditEvent(req.user.id, 'chore_updated', { choreId: req.params.id, ip: getClientIp(req) });

    const chore = await db.prepare('SELECT * FROM chores WHERE id = ?').get(req.params.id);
    res.json({ chore });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update chore' });
  }
});

// DELETE /api/chores/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'Only parents can delete chores' });
    if (!validators.uuid(req.params.id)) return res.status(400).json({ error: 'Invalid chore ID' });

    const existing = await db.prepare('SELECT family_id FROM chores WHERE id = ?').get(req.params.id);
    if (!existing || existing.family_id !== req.user.familyId) return res.status(403).json({ error: 'Access denied' });

    await db.prepare('UPDATE chores SET is_active = 0, updated_at = NOW() WHERE id = ? AND family_id = ?').run(req.params.id, req.user.familyId);

    logAuditEvent(req.user.id, 'chore_deleted', { choreId: req.params.id, ip: getClientIp(req) });

    res.json({ message: 'Chore deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete chore' });
  }
});

module.exports = router;
