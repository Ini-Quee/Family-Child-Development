const db = require('../db/connection');

// Rate limiter for PIN attempts (in-memory store)
const pinAttempts = new Map();
const LOCKOUT_TIERS = [
  { attempts: 3, lockoutMs: 5 * 60 * 1000 },    // 3 fails → 5 min
  { attempts: 6, lockoutMs: 15 * 60 * 1000 },    // 6 fails → 15 min
  { attempts: 9, lockoutMs: 60 * 60 * 1000 },    // 9 fails → 1 hour
  { attempts: 12, lockoutMs: 24 * 60 * 60 * 1000 }, // 12 fails → 24 hours
];

function getLockoutKey(childId, ip) {
  return `${childId}:${ip}`;
}

function checkPinLockout(childId, ip) {
  const key = getLockoutKey(childId, ip);
  const record = pinAttempts.get(key);

  if (!record) return { locked: false };

  // Check if lockout has expired
  if (record.lockedUntil && Date.now() > record.lockedUntil) {
    pinAttempts.delete(key);
    return { locked: false };
  }

  if (record.lockedUntil) {
    const remainingMs = record.lockedUntil - Date.now();
    const remainingMin = Math.ceil(remainingMs / 60000);
    return {
      locked: true,
      attempts: record.count,
      remainingMinutes: remainingMin,
      message: `Too many failed attempts. Try again in ${remainingMin} minute${remainingMin > 1 ? 's' : ''}.`,
    };
  }

  return { locked: false, attempts: record.count };
}

function recordPinFailure(childId, ip) {
  const key = getLockoutKey(childId, ip);
  const record = pinAttempts.get(key) || { count: 0 };
  record.count += 1;
  record.lastAttempt = Date.now();

  // Check if this triggers a lockout tier
  for (const tier of LOCKOUT_TIERS) {
    if (record.count >= tier.attempts && !record.lockedUntil) {
      record.lockedUntil = Date.now() + tier.lockoutMs;

      // Log the lockout event
      logAuditEvent(childId, 'pin_lockout', {
        attempts: record.count,
        lockoutMinutes: tier.lockoutMs / 60000,
        ip,
      });

      // Notify parent
      notifyParentOfLockout(childId, record.count);
      break;
    }
  }

  pinAttempts.set(key, record);
}

function clearPinAttempts(childId, ip) {
  const key = getLockoutKey(childId, ip);
  pinAttempts.delete(key);
}

// Notify parent of child lockout
function notifyParentOfLockout(childId, attempts) {
  try {
    const child = db.prepare('SELECT name, family_id FROM children WHERE id = ?').get(childId);
    if (!child) return;

    const parent = db.prepare('SELECT id FROM users WHERE family_id = ? AND is_primary = 1').get(child.family_id);
    if (!parent) return;

    db.prepare(`INSERT INTO notifications (id, recipient_id, recipient_id, type, title, body)
      VALUES (?, ?, 'parent', 'security_alert', ?, ?)`).run(
      require('uuid').v4(),
      parent.id,
      `⚠️ PIN Lockout: ${child.name}`,
      `${child.name} has had ${attempts} failed PIN attempts. Account temporarily locked.`
    );
  } catch (err) {
    console.error('Failed to notify parent of lockout:', err);
  }
}

// Audit logging
function logAuditEvent(userId, action, details = {}) {
  try {
    db.prepare(`INSERT INTO audit_log (id, user_id, action, details, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))`).run(
      require('uuid').v4(),
      userId,
      action,
      JSON.stringify(details),
      details.ip || null
    );
  } catch (err) {
    // Table might not exist yet — fail silently
    console.error('Audit log error:', err.message);
  }
}

// Input sanitization
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      cleaned[key] = sanitize(value);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      cleaned[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(v => typeof v === 'string' ? sanitize(v) : v);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

// Input validation schemas
const validators = {
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  password: (v) => typeof v === 'string' && v.length >= 6 && v.length <= 128,
  name: (v) => typeof v === 'string' && v.length >= 1 && v.length <= 100,
  pin: (v) => /^\d{4}$/.test(v),
  uuid: (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
  age: (v) => Number.isInteger(v) && v >= 3 && v <= 18,
  xp: (v) => Number.isInteger(v) && v >= 0 && v <= 999999,
  money: (v) => typeof v === 'number' && v >= 0 && v <= 99999.99,
  category: (v) => ['cleaning', 'kitchen', 'laundry', 'outdoor', 'pet_care', 'personal_hygiene', 'homework', 'exercise', 'other'].includes(v),
  difficulty: (v) => ['easy', 'medium', 'hard'].includes(v),
  status: (v) => ['pending', 'in_progress', 'completed', 'approved', 'rejected', 'missed'].includes(v),
  recurrence: (v) => ['once', 'daily', 'weekdays', 'weekly', 'biweekly', 'monthly'].includes(v),
};

function validate(fields) {
  return (req, res, next) => {
    const errors = [];
    for (const [field, rule] of Object.entries(fields)) {
      const value = req.body[field];
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
      } else if (value !== undefined && value !== null) {
        const validator = validators[rule.type];
        if (validator && !validator(value)) {
          errors.push(`${field} is invalid`);
        }
      }
    }
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    next();
  };
}

// IDOR protection helper
function verifyOwnership(resourceType, resourceIdField = 'id') {
  return (req, res, next) => {
    const resourceId = req.params[resourceIdField] || req.body[resourceIdField];
    if (!resourceId) {
      return res.status(400).json({ error: 'Resource ID required' });
    }

    // Verify UUID format
    if (!validators.uuid(resourceId)) {
      return res.status(400).json({ error: 'Invalid resource ID format' });
    }

    // Store for use in route handlers
    req.verifiedResourceId = resourceId;
    next();
  };
}

// Security headers middleware
function securityHeaders(req, res, next) {
  // Content Security Policy
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '));

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=()');

  // HSTS (if over HTTPS)
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

// API response hardening — strip sensitive fields
function sanitizeResponse(data, role) {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map(item => sanitizeResponse(item, role));
  }

  if (typeof data !== 'object') return data;

  const cleaned = { ...data };

  // Never expose password hashes
  delete cleaned.password_hash;
  delete cleaned.pin;

  // Children don't need to see internal fields
  if (role === 'child') {
    delete cleaned.family_id;
    delete cleaned.created_by;
    delete cleaned.is_primary;
  }

  return cleaned;
}

module.exports = {
  checkPinLockout,
  recordPinFailure,
  clearPinAttempts,
  logAuditEvent,
  sanitize,
  sanitizeObject,
  validate,
  validators,
  verifyOwnership,
  securityHeaders,
  sanitizeResponse,
};
