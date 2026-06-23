const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const { logAuditEvent, validators, sanitize } = require('../middleware/security');

const router = express.Router();

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
}

// GET /api/children
router.get('/', authenticate, async (req, res) => {
  try {
    const children = await db.prepare('SELECT id, name, age, avatar_url, current_level, total_xp, current_streak_days, longest_streak_days FROM children WHERE family_id = ? ORDER BY age').all(req.user.familyId);
    res.json({ children });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch children' });
  }
});

// POST /api/children
router.post('/', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'Only parents can add children' });

    const { name, age, pin } = req.body;
    if (!name || !age || !pin) return res.status(400).json({ error: 'Name, age, and PIN are required' });
    if (!validators.name(name)) return res.status(400).json({ error: 'Invalid name (1-100 characters)' });
    if (!validators.age(age)) return res.status(400).json({ error: 'Age must be between 3 and 18' });
    if (!validators.pin(pin)) return res.status(400).json({ error: 'PIN must be exactly 4 digits' });

    // Check max children per family
    const childCount = await db.prepare('SELECT COUNT(*) as count FROM children WHERE family_id = ?').get(req.user.familyId);
    if (childCount.count >= 8) return res.status(400).json({ error: 'Maximum 8 children per family' });

    const childId = uuidv4();
    await db.prepare('INSERT INTO children (id, family_id, name, age, pin) VALUES (?, ?, ?, ?, ?)').run(
      childId, req.user.familyId, sanitize(name), age, pin
    );
    await db.prepare('INSERT INTO wallets (id, child_id) VALUES (?, ?)').run(uuidv4(), childId);
    for (const type of ['chore', 'homework', 'exercise']) {
      await db.prepare('INSERT INTO streaks (id, child_id, streak_type) VALUES (?, ?, ?)').run(uuidv4(), childId, type);
    }

    logAuditEvent(req.user.id, 'child_added', { childId, name: sanitize(name), age, ip: getClientIp(req) });

    const child = await db.prepare('SELECT id, name, age, avatar_url, current_level, total_xp FROM children WHERE id = ?').get(childId);
    res.status(201).json({ child });
  } catch (err) {
    console.error('Add child error:', err);
    res.status(500).json({ error: 'Failed to add child' });
  }
});

// PUT /api/children/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'Only parents can update children' });
    if (!validators.uuid(req.params.id)) return res.status(400).json({ error: 'Invalid child ID' });

    // IDOR check — child must belong to parent's family
    const existing = await db.prepare('SELECT family_id FROM children WHERE id = ?').get(req.params.id);
    if (!existing || existing.family_id !== req.user.familyId) return res.status(403).json({ error: 'Access denied' });

    const { name, age, pin, avatarUrl } = req.body;
    if (name && !validators.name(name)) return res.status(400).json({ error: 'Invalid name' });
    if (age && !validators.age(age)) return res.status(400).json({ error: 'Invalid age' });
    if (pin && !validators.pin(pin)) return res.status(400).json({ error: 'Invalid PIN' });

    await db.prepare('UPDATE children SET name = COALESCE(?, name), age = COALESCE(?, age), pin = COALESCE(?, pin), avatar_url = COALESCE(?, avatar_url), updated_at = NOW() WHERE id = ? AND family_id = ?').run(
      name ? sanitize(name) : null, age, pin, avatarUrl, req.params.id, req.user.familyId
    );

    logAuditEvent(req.user.id, 'child_updated', { childId: req.params.id, ip: getClientIp(req) });

    const child = await db.prepare('SELECT id, name, age, avatar_url, current_level, total_xp FROM children WHERE id = ?').get(req.params.id);
    res.json({ child });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update child' });
  }
});

// DELETE /api/children/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'Only parents can remove children' });
    if (!validators.uuid(req.params.id)) return res.status(400).json({ error: 'Invalid child ID' });

    // IDOR check
    const existing = await db.prepare('SELECT family_id, name FROM children WHERE id = ?').get(req.params.id);
    if (!existing || existing.family_id !== req.user.familyId) return res.status(403).json({ error: 'Access denied' });

    await db.prepare('DELETE FROM children WHERE id = ? AND family_id = ?').run(req.params.id, req.user.familyId);

    logAuditEvent(req.user.id, 'child_removed', { childId: req.params.id, name: existing.name, ip: getClientIp(req) });

    res.json({ message: 'Child removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove child' });
  }
});

// GET /api/children/:id/progress
router.get('/:id/progress', authenticate, async (req, res) => {
  try {
    if (!validators.uuid(req.params.id)) return res.status(400).json({ error: 'Invalid child ID' });

    const child = await db.prepare('SELECT id, name, age, current_level, total_xp, current_streak_days, longest_streak_days, family_id FROM children WHERE id = ?').get(req.params.id);
    if (!child) return res.status(404).json({ error: 'Child not found' });

    // IDOR check — child can only see their own progress, parent must be in same family
    if (req.user.role === 'child' && req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user.role === 'parent' && child.family_id !== req.user.familyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Remove internal field before sending
    delete child.family_id;

    const level = await db.prepare('SELECT * FROM level_definitions WHERE level = ?').get(child.current_level);
    const nextLevel = await db.prepare('SELECT * FROM level_definitions WHERE level > ? ORDER BY level ASC LIMIT 1').get(child.current_level);
    const streaks = await db.prepare('SELECT streak_type, current_count, longest_count FROM streaks WHERE child_id = ?').all(req.params.id);
    const achievements = await db.prepare('SELECT badge_id, badge_name, badge_category, earned_at FROM achievements WHERE child_id = ? ORDER BY earned_at DESC LIMIT 10').all(req.params.id);

    const today = new Date().toISOString().split('T')[0];
    const todayStats = await db.prepare(`SELECT
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
router.get('/:id/wallet', authenticate, async (req, res) => {
  try {
    if (!validators.uuid(req.params.id)) return res.status(400).json({ error: 'Invalid child ID' });

    // IDOR check
    const child = await db.prepare('SELECT family_id FROM children WHERE id = ?').get(req.params.id);
    if (!child) return res.status(404).json({ error: 'Child not found' });
    if (req.user.role === 'child' && req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user.role === 'parent' && child.family_id !== req.user.familyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const wallet = await db.prepare('SELECT * FROM wallets WHERE child_id = ?').get(req.params.id);
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    // Parents see summary only, children see full details
    const transactions = req.user.role === 'child'
      ? await db.prepare('SELECT * FROM financial_transactions WHERE child_id = ? ORDER BY created_at DESC LIMIT 20').all(req.params.id)
      : await db.prepare('SELECT type, amount, category, description, created_at FROM financial_transactions WHERE child_id = ? ORDER BY created_at DESC LIMIT 10').all(req.params.id);

    res.json({ wallet, transactions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

module.exports = router;
