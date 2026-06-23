const db = require('./connection');

const economySchema = `
-- Job types: standard, premium, sos, academic
ALTER TABLE chores ADD COLUMN job_type TEXT DEFAULT 'standard';
ALTER TABLE chores ADD COLUMN min_trust_score INTEGER DEFAULT 0;
ALTER TABLE chores ADD COLUMN max_bidders INTEGER DEFAULT 1;
ALTER TABLE chores ADD COLUMN bidding_window_minutes INTEGER DEFAULT 30;
ALTER TABLE chores ADD COLUMN bidding_ends_at TEXT;
ALTER TABLE chores ADD COLUMN slots_filled INTEGER DEFAULT 0;

-- Bids table
CREATE TABLE IF NOT EXISTS bids (
    id TEXT PRIMARY KEY,
    chore_id TEXT REFERENCES chores(id) ON DELETE CASCADE,
    child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
    bid_amount REAL NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'outbid', 'expired')),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(chore_id, child_id)
);

CREATE INDEX IF NOT EXISTS idx_bids_chore ON bids(chore_id);
CREATE INDEX IF NOT EXISTS idx_bids_child ON bids(child_id);

-- Trust scores
CREATE TABLE IF NOT EXISTS trust_scores (
    id TEXT PRIMARY KEY,
    child_id TEXT UNIQUE REFERENCES children(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 50,
    on_time_completions INTEGER DEFAULT 0,
    evidence_quality_total REAL DEFAULT 0,
    evidence_count INTEGER DEFAULT 0,
    parent_ratings_total REAL DEFAULT 0,
    parent_ratings_count INTEGER DEFAULT 0,
    streak_bonus INTEGER DEFAULT 0,
    rejections INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Evidence photos
CREATE TABLE IF NOT EXISTS evidence_photos (
    id TEXT PRIMARY KEY,
    assignment_id TEXT REFERENCES chore_assignments(id) ON DELETE CASCADE,
    child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
    photo_type TEXT NOT NULL CHECK (photo_type IN ('before', 'after')),
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    quality_rating INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_evidence_assignment ON evidence_photos(assignment_id);

-- Screen time purchases
CREATE TABLE IF NOT EXISTS screen_time_purchases (
    id TEXT PRIMARY KEY,
    child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
    minutes INTEGER NOT NULL,
    cost REAL NOT NULL,
    platform TEXT,
    used_minutes INTEGER DEFAULT 0,
    remaining_minutes INTEGER,
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_screen_purchases_child ON screen_time_purchases(child_id);

-- Mood check-ins
CREATE TABLE IF NOT EXISTS mood_checkins (
    id TEXT PRIMARY KEY,
    child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
    mood TEXT NOT NULL,
    energy INTEGER DEFAULT 5,
    context_tags TEXT,
    private_note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mood_child ON mood_checkins(child_id);
CREATE INDEX IF NOT EXISTS idx_mood_date ON mood_checkins(created_at);

-- Academic subjects
CREATE TABLE IF NOT EXISTS academic_subjects (
    id TEXT PRIMARY KEY,
    child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    current_grade TEXT,
    grade_numeric REAL,
    trend TEXT DEFAULT 'stable' CHECK (trend IN ('up', 'down', 'stable')),
    icon TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subjects_child ON academic_subjects(child_id);

-- Study sessions
CREATE TABLE IF NOT EXISTS study_sessions (
    id TEXT PRIMARY KEY,
    child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
    subject_id TEXT REFERENCES academic_subjects(id),
    planned_minutes INTEGER,
    actual_minutes INTEGER,
    completed INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    money_earned REAL DEFAULT 0,
    started_at TEXT,
    ended_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_study_child ON study_sessions(child_id);

-- Reading log
CREATE TABLE IF NOT EXISTS reading_log (
    id TEXT PRIMARY KEY,
    child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
    book_title TEXT,
    minutes_read INTEGER,
    pages_read INTEGER,
    streak_day INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reading_child ON reading_log(child_id);

-- Family economy config
CREATE TABLE IF NOT EXISTS economy_config (
    id TEXT PRIMARY KEY,
    family_id TEXT UNIQUE REFERENCES families(id) ON DELETE CASCADE,
    coin_name TEXT DEFAULT 'Family Coins',
    tax_rate REAL DEFAULT 10.0,
    screen_time_rate REAL DEFAULT 2.50,
    savings_interest_rate REAL DEFAULT 0.0,
    min_reward_per_hour REAL DEFAULT 1.00,
    max_daily_earnings REAL DEFAULT 50.00,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Exercise log
CREATE TABLE IF NOT EXISTS exercise_log (
    id TEXT PRIMARY KEY,
    child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
    exercise_type TEXT,
    duration_minutes INTEGER,
    steps INTEGER,
    calories INTEGER,
    personal_best INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    money_earned REAL DEFAULT 0,
    screen_time_earned INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_exercise_child ON exercise_log(child_id);
`;

function runEconomyMigrations() {
  console.log('Running economy migrations...');
  const statements = economySchema.split(';').filter(s => s.trim());
  for (const stmt of statements) {
    try {
      db.exec(stmt.trim());
    } catch (err) {
      // Column might already exist
      if (!err.message.includes('duplicate column')) {
        console.error('Migration error:', err.message.substring(0, 100));
      }
    }
  }
  console.log('Economy tables created.');
}

module.exports = { runEconomyMigrations };
