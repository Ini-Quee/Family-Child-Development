const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const { logAuditEvent, validators, sanitize } = require('../middleware/security');

const router = express.Router();

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
}

// ============================================
// TRUST SCORE ENGINE
// ============================================

async function getTrustScore(childId) {
  let trust = await db.prepare('SELECT * FROM trust_scores WHERE child_id = ?').get(childId);
  if (!trust) {
    await db.prepare('INSERT INTO trust_scores (id, child_id) VALUES (?, ?)').run(uuidv4(), childId);
    trust = await db.prepare('SELECT * FROM trust_scores WHERE child_id = ?').get(childId);
  }

  // Calculate dynamic score
  let score = 50; // Base score

  // On-time completions: +0.5 per completion, max +20
  score += Math.min(trust.on_time_completions * 0.5, 20);

  // Evidence quality: average rating * 3, max +15
  if (trust.evidence_count > 0) {
    const avgQuality = trust.evidence_quality_total / trust.evidence_count;
    score += Math.min(avgQuality * 3, 15);
  }

  // Parent ratings: average * 2, max +10
  if (trust.parent_ratings_count > 0) {
    const avgRating = trust.parent_ratings_total / trust.parent_ratings_count;
    score += Math.min(avgRating * 2, 10);
  }

  // Streak bonus: +0.2 per day, max +5
  score += Math.min(trust.streak_bonus * 0.2, 5);

  // Rejections: -5 per rejection
  score -= trust.rejections * 5;

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Update the stored score
  await db.prepare('UPDATE trust_scores SET score = ?, updated_at = NOW() WHERE child_id = ?').run(score, childId);

  return score;
}

async function updateTrustOnCompletion(childId, onTime, qualityRating, parentRating) {
  let trust = await db.prepare('SELECT * FROM trust_scores WHERE child_id = ?').get(childId);
  if (!trust) {
    await db.prepare('INSERT INTO trust_scores (id, child_id) VALUES (?, ?)').run(uuidv4(), childId);
    trust = await db.prepare('SELECT * FROM trust_scores WHERE child_id = ?').get(childId);
  }

  const updates = {};
  if (onTime) updates.on_time_completions = trust.on_time_completions + 1;
  if (qualityRating) {
    updates.evidence_quality_total = trust.evidence_quality_total + qualityRating;
    updates.evidence_count = trust.evidence_count + 1;
  }
  if (parentRating) {
    updates.parent_ratings_total = trust.parent_ratings_total + parentRating;
    updates.parent_ratings_count = trust.parent_ratings_count + 1;
  }

  // Update streak bonus
  const child = await db.prepare('SELECT current_streak_days FROM children WHERE id = ?').get(childId);
  if (child) updates.streak_bonus = child.current_streak_days;

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  if (setClauses) {
    await db.prepare(`UPDATE trust_scores SET ${setClauses}, updated_at = NOW() WHERE child_id = ?`).run(...values, childId);
  }

  return getTrustScore(childId);
}

async function updateTrustOnRejection(childId) {
  let trust = await db.prepare('SELECT * FROM trust_scores WHERE child_id = ?').get(childId);
  if (!trust) {
    await db.prepare('INSERT INTO trust_scores (id, child_id) VALUES (?, ?)').run(uuidv4(), childId);
    trust = await db.prepare('SELECT * FROM trust_scores WHERE child_id = ?').get(childId);
  }

  await db.prepare('UPDATE trust_scores SET rejections = ?, updated_at = NOW() WHERE child_id = ?').run(
    trust.rejections + 1, childId
  );

  return getTrustScore(childId);
}

// ============================================
// MARKETPLACE ROUTES
// ============================================

// GET /api/marketplace — List available jobs for a child
router.get('/', authenticate, async (req, res) => {
  try {
    const childId = req.user.role === 'child' ? req.user.id : req.query.childId;
    if (!childId) return res.status(400).json({ error: 'Child ID required' });

    const child = await db.prepare('SELECT age, family_id FROM children WHERE id = ?').get(childId);
    if (!child) return res.status(404).json({ error: 'Child not found' });

    const trustScore = await getTrustScore(childId);
    const today = new Date().toISOString().split('T')[0];

    // Get available chores that match child's age and trust
    const jobs = await db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM bids b WHERE b.chore_id = c.id AND b.status = 'pending') as bid_count,
        (SELECT b.bid_amount FROM bids b WHERE b.chore_id = c.id AND b.child_id = ?) as my_bid,
        (SELECT ca.status FROM chore_assignments ca WHERE ca.chore_id = c.id AND ca.child_id = ? AND ca.assigned_date = ?) as my_status
      FROM chores c
      WHERE c.family_id = ?
        AND c.is_active = 1
        AND c.min_age <= ?
        AND c.max_age >= ?
        AND c.min_trust_score <= ?
        AND (c.slots_filled < c.max_bidders OR c.max_bidders = 0)
      ORDER BY
        CASE c.job_type WHEN 'sos' THEN 0 WHEN 'premium' THEN 1 WHEN 'academic' THEN 2 ELSE 3 END,
        c.created_at DESC
    `).all(childId, childId, today, child.family_id, child.age, child.age, trustScore);

    // Categorize jobs
    const result = {
      premium: jobs.filter(j => j.job_type === 'premium' && !j.my_status),
      sos: jobs.filter(j => j.job_type === 'sos' && !j.my_status),
      academic: jobs.filter(j => j.job_type === 'academic' && !j.my_status),
      standard: jobs.filter(j => j.job_type === 'standard' && !j.my_status),
      in_progress: jobs.filter(j => j.my_status && ['pending', 'in_progress', 'completed'].includes(j.my_status)),
      trustScore,
    };

    res.json(result);
  } catch (err) {
    console.error('Marketplace error:', err);
    res.status(500).json({ error: 'Failed to load marketplace' });
  }
});

// POST /api/marketplace/bid — Place a bid on a premium job
router.post('/bid', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'child') return res.status(403).json({ error: 'Only children can bid' });

    const { choreId, bidAmount } = req.body;
    if (!choreId || !validators.uuid(choreId)) return res.status(400).json({ error: 'Invalid chore ID' });
    if (!bidAmount || bidAmount < 0 || bidAmount > 100) return res.status(400).json({ error: 'Invalid bid amount' });

    const childId = req.user.id;
    const trustScore = await getTrustScore(childId);

    // Get the chore
    const chore = await db.prepare('SELECT * FROM chores WHERE id = ? AND family_id = ?').get(choreId, req.user.familyId);
    if (!chore) return res.status(404).json({ error: 'Job not found' });
    if (chore.job_type !== 'premium' && chore.job_type !== 'sos') {
      return res.status(400).json({ error: 'This job does not accept bids' });
    }

    // Check trust requirement
    if (trustScore < chore.min_trust_score) {
      return res.status(403).json({ error: `Trust score ${trustScore} below minimum ${chore.min_trust_score}` });
    }

    // Check if bidding is still open
    if (chore.bidding_ends_at) {
      const endsAt = new Date(chore.bidding_ends_at);
      if (new Date() > endsAt) {
        return res.status(400).json({ error: 'Bidding has closed for this job' });
      }
    }

    // Check if child already bid
    const existingBid = await db.prepare('SELECT id FROM bids WHERE chore_id = ? AND child_id = ?').get(choreId, childId);
    if (existingBid) return res.status(409).json({ error: 'You already bid on this job' });

    // Check max bidders
    const bidCount = await db.prepare('SELECT COUNT(*) as count FROM bids WHERE chore_id = ?').get(choreId);
    if (bidCount.count >= chore.max_bidders) {
      return res.status(400).json({ error: 'Maximum bidders reached' });
    }

    // Check child has enough balance for bid
    const wallet = await db.prepare('SELECT balance FROM wallets WHERE child_id = ?').get(childId);
    if (!wallet || wallet.balance < bidAmount) {
      return res.status(400).json({ error: 'Insufficient balance for bid' });
    }

    // Place bid
    const bidId = uuidv4();
    await db.prepare('INSERT INTO bids (id, chore_id, child_id, bid_amount) VALUES (?, ?, ?, ?)').run(
      bidId, choreId, childId, bidAmount
    );

    // Deduct bid amount from wallet (held in escrow)
    const newBalance = (wallet.balance - bidAmount).toFixed(2);
    await db.prepare('UPDATE wallets SET balance = ?, updated_at = NOW() WHERE child_id = ?').run(
      parseFloat(newBalance), childId
    );

    // Record transaction
    await db.prepare('INSERT INTO financial_transactions (id, child_id, wallet_id, type, amount, category, description, balance_after) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      uuidv4(), childId, wallet.id, 'bid_held', bidAmount, 'marketplace', `Bid on: ${chore.title}`, parseFloat(newBalance)
    );

    logAuditEvent(childId, 'bid_placed', { choreId, bidAmount, ip: getClientIp(req) });

    res.json({ bid: { id: bidId, choreId, bidAmount, status: 'pending' } });
  } catch (err) {
    console.error('Bid error:', err);
    res.status(500).json({ error: 'Failed to place bid' });
  }
});

// POST /api/marketplace/accept-sos — Accept an SOS task (first come, first served)
router.post('/accept-sos', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'child') return res.status(403).json({ error: 'Only children can accept SOS tasks' });

    const { choreId } = req.body;
    if (!choreId || !validators.uuid(choreId)) return res.status(400).json({ error: 'Invalid chore ID' });

    const childId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const chore = await db.prepare('SELECT * FROM chores WHERE id = ? AND job_type = "sos" AND is_active = 1').get(choreId);
    if (!chore) return res.status(404).json({ error: 'SOS task not found' });

    // Check if already assigned
    const existing = await db.prepare('SELECT id FROM chore_assignments WHERE chore_id = ? AND assigned_date = ?').get(choreId, today);
    if (existing) return res.status(409).json({ error: 'This SOS task has already been taken' });

    // Assign immediately
    const assignmentId = uuidv4();
    await db.prepare('INSERT INTO chore_assignments (id, chore_id, child_id, assigned_date, status) VALUES (?, ?, ?, ?, ?)').run(
      assignmentId, choreId, childId, today, 'in_progress'
    );

    logAuditEvent(childId, 'sos_accepted', { choreId, ip: getClientIp(req) });

    res.json({ assignment: { id: assignmentId, status: 'in_progress' } });
  } catch (err) {
    console.error('SOS accept error:', err);
    res.status(500).json({ error: 'Failed to accept SOS task' });
  }
});

// GET /api/marketplace/trust/:childId — Get trust score details
router.get('/trust/:childId', authenticate, async (req, res) => {
  try {
    if (!validators.uuid(req.params.childId)) return res.status(400).json({ error: 'Invalid child ID' });

    // IDOR check
    const child = await db.prepare('SELECT family_id FROM children WHERE id = ?').get(req.params.childId);
    if (!child || child.family_id !== req.user.familyId) return res.status(403).json({ error: 'Access denied' });

    const score = await getTrustScore(req.params.childId);
    const details = await db.prepare('SELECT * FROM trust_scores WHERE child_id = ?').get(req.params.childId);

    // Calculate breakdown
    const breakdown = {
      base: 50,
      on_time: Math.min((details?.on_time_completions || 0) * 0.5, 20),
      evidence: details?.evidence_count > 0 ? Math.min((details.evidence_quality_total / details.evidence_count) * 3, 15) : 0,
      parent_rating: details?.parent_ratings_count > 0 ? Math.min((details.parent_ratings_total / details.parent_ratings_count) * 2, 10) : 0,
      streak: Math.min((details?.streak_bonus || 0) * 0.2, 5),
      rejections: (details?.rejections || 0) * -5,
    };

    res.json({ score, breakdown, details });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trust score' });
  }
});

module.exports = router;
module.exports.getTrustScore = getTrustScore;
module.exports.updateTrustOnCompletion = updateTrustOnCompletion;
module.exports.updateTrustOnRejection = updateTrustOnRejection;
