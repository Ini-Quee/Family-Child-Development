const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { email, password, name, familyName } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Email, password, and name are required' });

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const familyId = uuidv4();
    const inviteCode = generateInviteCode();
    db.prepare('INSERT INTO families (id, name, invite_code) VALUES (?, ?, ?)').run(familyId, familyName || `${name}'s Family`, inviteCode);

    const userId = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (id, family_id, email, password_hash, name, role, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      userId, familyId, email, passwordHash, name, 'parent', 1
    );

    const token = generateToken({ id: userId, familyId, role: 'parent' });
    res.status(201).json({
      token,
      user: { id: userId, name, email, familyId, role: 'parent' },
      family: { id: familyId, name: familyName || `${name}'s Family`, inviteCode },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken({ id: user.id, familyId: user.family_id, role: 'parent' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, familyId: user.family_id, role: 'parent' } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/child-login
router.post('/child-login', (req, res) => {
  try {
    const { childId, pin } = req.body;
    if (!childId || !pin) return res.status(400).json({ error: 'Child ID and PIN are required' });

    const child = db.prepare('SELECT * FROM children WHERE id = ? AND pin = ?').get(childId, pin);
    if (!child) return res.status(401).json({ error: 'Invalid PIN' });

    const token = generateToken({ id: child.id, familyId: child.family_id, role: 'child' });
    db.prepare('UPDATE children SET last_active_at = datetime("now") WHERE id = ?').run(child.id);

    res.json({
      token,
      child: { id: child.id, name: child.name, age: child.age, familyId: child.family_id, level: child.current_level, xp: child.total_xp, streak: child.current_streak_days },
    });
  } catch (err) {
    console.error('Child login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/family-children
router.get('/family-children', (req, res) => {
  try {
    const { inviteCode } = req.query;
    if (!inviteCode) return res.status(400).json({ error: 'Invite code required' });

    const family = db.prepare('SELECT id FROM families WHERE invite_code = ?').get(inviteCode);
    if (!family) return res.status(404).json({ error: 'Family not found' });

    const children = db.prepare('SELECT id, name, age, avatar_url FROM children WHERE family_id = ? ORDER BY age').all(family.id);
    res.json({ children });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch children' });
  }
});

module.exports = router;
