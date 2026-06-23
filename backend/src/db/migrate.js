const db = require('./connection');

const schema = `
CREATE TABLE IF NOT EXISTS families (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    family_id TEXT REFERENCES families(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'parent',
    is_primary INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS children (
    id TEXT PRIMARY KEY,
    family_id TEXT REFERENCES families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 3 AND age <= 18),
    avatar_url TEXT,
    pin TEXT NOT NULL,
    current_level INTEGER DEFAULT 1,
    total_xp INTEGER DEFAULT 0,
    current_streak_days INTEGER DEFAULT 0,
    longest_streak_days INTEGER DEFAULT 0,
    last_active_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chores (
    id TEXT PRIMARY KEY,
    family_id TEXT REFERENCES families(id) ON DELETE CASCADE,
    created_by TEXT REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'other',
    difficulty TEXT DEFAULT 'medium',
    xp_value INTEGER NOT NULL DEFAULT 10,
    money_value REAL DEFAULT 0,
    estimated_minutes INTEGER,
    requires_photo INTEGER DEFAULT 0,
    requires_approval INTEGER DEFAULT 1,
    recurrence TEXT DEFAULT 'daily',
    recurrence_days TEXT,
    min_age INTEGER DEFAULT 6,
    max_age INTEGER DEFAULT 18,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chore_assignments (
    id TEXT PRIMARY KEY,
    chore_id TEXT REFERENCES chores(id) ON DELETE CASCADE,
    child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
    assigned_date TEXT NOT NULL,
    due_time TEXT,
    status TEXT DEFAULT 'pending',
    completed_at TEXT,
    approved_at TEXT,
    approved_by TEXT REFERENCES users(id),
    rejection_reason TEXT,
    photo_url TEXT,
    notes TEXT,
    xp_earned INTEGER DEFAULT 0,
    money_earned REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wallets (
    id TEXT PRIMARY KEY,
    child_id TEXT UNIQUE REFERENCES children(id) ON DELETE CASCADE,
    balance REAL DEFAULT 0,
    total_earned REAL DEFAULT 0,
    total_spent REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS financial_transactions (
    id TEXT PRIMARY KEY,
    child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
    wallet_id TEXT REFERENCES wallets(id),
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT,
    description TEXT,
    balance_after REAL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS level_definitions (
    level INTEGER PRIMARY KEY,
    xp_required INTEGER NOT NULL,
    title TEXT,
    privileges TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL,
    badge_name TEXT NOT NULL,
    badge_category TEXT,
    earned_at TEXT DEFAULT (datetime('now')),
    xp_reward INTEGER DEFAULT 0,
    UNIQUE(child_id, badge_id)
);

CREATE TABLE IF NOT EXISTS streaks (
    id TEXT PRIMARY KEY,
    child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
    streak_type TEXT NOT NULL,
    current_count INTEGER DEFAULT 0,
    longest_count INTEGER DEFAULT 0,
    last_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(child_id, streak_type)
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    recipient_id TEXT NOT NULL,
    recipient_type TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT,
    body TEXT,
    data TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_children_family ON children(family_id);
CREATE INDEX IF NOT EXISTS idx_chores_family ON chores(family_id);
CREATE INDEX IF NOT EXISTS idx_assignments_child_date ON chore_assignments(child_id, assigned_date);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON chore_assignments(status);
CREATE INDEX IF NOT EXISTS idx_transactions_child ON financial_transactions(child_id);
CREATE INDEX IF NOT EXISTS idx_achievements_child ON achievements(child_id);
CREATE INDEX IF NOT EXISTS idx_streaks_child ON streaks(child_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read);
`;

const levelData = [
  [1, 0, 'Newcomer', '[]'],
  [2, 100, 'Beginner', '["choose_chore_order"]'],
  [3, 250, 'Explorer', '[]'],
  [4, 400, 'Achiever', '[]'],
  [5, 600, 'Champion', '["customize_avatar"]'],
  [6, 850, 'Adventurer', '[]'],
  [7, 1150, 'Hero', '[]'],
  [8, 1500, 'Master', '[]'],
  [9, 1900, 'Legend', '[]'],
  [10, 2400, 'Grandmaster', '["extra_weekend_screen_30m"]'],
  [15, 5000, 'Veteran', '["choose_own_schedule"]'],
  [20, 10000, 'Elite', '["later_weekend_bedtime"]'],
  [25, 17500, 'Titan', '["choose_family_movie"]'],
  [30, 27000, 'Mythic', '["reduced_oversight"]'],
  [40, 55000, 'Transcendent', '["set_own_limits"]'],
  [50, 100000, 'Immortal', '["minimal_oversight"]'],
];

function migrate() {
  console.log('Running migrations...');
  db.exec(schema);
  console.log('Tables created.');

  console.log('Seeding level definitions...');
  const insertLevel = db.prepare('INSERT OR IGNORE INTO level_definitions (level, xp_required, title, privileges) VALUES (?, ?, ?, ?)');
  for (const [level, xp, title, privs] of levelData) {
    insertLevel.run(level, xp, title, privs);
  }
  console.log('Levels seeded.');
  console.log('Migration complete!');
}

migrate();
