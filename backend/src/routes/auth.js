const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');
const { generateToken } = require('../middleware/auth');
const {
  checkPinLockout,
  recordPinFailure,
  clearPinAttempts,
  logAuditEvent,
  sanitize,
  sanitizeObject,
  validate,
} = require('../middleware/security');

const router = express.Router();

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, familyName } = sanitizeObject(req.body);
    const ip = getClientIp(req);

    if (!email || !password || !name) return res.status(400).json({ error: 'Email, password, and name are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const familyId = uuidv4();
    const inviteCode = generateInviteCode();
    await db.prepare('INSERT INTO families (id, name, invite_code) VALUES (?, ?, ?)').run(
      familyId, sanitize(familyName || `${name}'s Family`), inviteCode
    );

    const userId = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 12);
    await db.prepare('INSERT INTO users (id, family_id, email, password_hash, name, role, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      userId, familyId, email.toLowerCase(), passwordHash, sanitize(name), 'parent', 1
    );

    logAuditEvent(userId, 'register', { email: email.toLowerCase(), ip });

    const token = generateToken({ id: userId, familyId, role: 'parent' });
    res.status(201).json({
      token,
      user: { id: userId, name, email: email.toLowerCase(), familyId, role: 'parent' },
      family: { id: familyId, name: familyName || `${name}'s Family`, inviteCode },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = getClientIp(req);

    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) {
      logAuditEvent(null, 'login_failed', { email: email.toLowerCase(), reason: 'user_not_found', ip });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      logAuditEvent(user.id, 'login_failed', { reason: 'wrong_password', ip });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    logAuditEvent(user.id, 'login_success', { ip });

    const token = generateToken({ id: user.id, familyId: user.family_id, role: 'parent' });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, familyId: user.family_id, role: 'parent' },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/child-login
router.post('/child-login', async (req, res) => {
  try {
    const { childId, pin } = req.body;
    const ip = getClientIp(req);

    if (!childId || !pin) return res.status(400).json({ error: 'Child ID and PIN are required' });

    const lockout = checkPinLockout(childId, ip);
    if (lockout.locked) {
      logAuditEvent(childId, 'pin_login_blocked', { reason: 'lockout', ip });
      return res.status(429).json({ error: lockout.message, locked: true });
    }

    const child = await db.prepare('SELECT * FROM children WHERE id = ?').get(childId);
    if (!child || child.pin !== pin) {
      recordPinFailure(childId, ip);
      logAuditEvent(childId, 'pin_login_failed', { ip });
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    clearPinAttempts(childId, ip);

    const token = generateToken({ id: child.id, familyId: child.family_id, role: 'child' });
    await db.prepare('UPDATE children SET last_active_at = NOW() WHERE id = ?').run(child.id);

    logAuditEvent(child.id, 'pin_login_success', { ip });

    res.json({
      token,
      child: {
        id: child.id, name: child.name, age: child.age, familyId: child.family_id,
        level: child.current_level, xp: child.total_xp, streak: child.current_streak_days,
      },
    });
  } catch (err) {
    console.error('Child login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/family-children
router.get('/family-children', async (req, res) => {
  try {
    const { inviteCode } = req.query;
    if (!inviteCode) return res.status(400).json({ error: 'Invite code required' });

    const family = await db.prepare('SELECT id FROM families WHERE invite_code = ?').get(inviteCode);
    if (!family) return res.json({ children: [] });

    const children = await db.prepare('SELECT id, name, age, avatar_url FROM children WHERE family_id = ? ORDER BY age').all(family.id);
    res.json({ children });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch children' });
  }
});

module.exports = router;
