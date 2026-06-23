const db = require('./connection');

async function runVaultMigrations() {
  console.log('Running vault migrations...');

  const statements = [
    `CREATE TABLE IF NOT EXISTS focus_blocks (
      id TEXT PRIMARY KEY,
      child_id TEXT,
      title TEXT DEFAULT 'Focus Time',
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      repeat_day INTEGER,
      specific_date DATE,
      allowed_apps JSONB DEFAULT '["familyos","calculator","dictionary"]',
      block_type TEXT DEFAULT 'reading',
      created_by TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_focus_child ON focus_blocks(child_id)`,

    `CREATE TABLE IF NOT EXISTS focus_sessions (
      id TEXT PRIMARY KEY,
      child_id TEXT,
      block_id TEXT,
      started_at TIMESTAMP DEFAULT NOW(),
      ended_at TIMESTAMP,
      duration_minutes INTEGER,
      coins_earned REAL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_focus_sessions_child ON focus_sessions(child_id)`,
  ];

  for (const stmt of statements) {
    try {
      await db.exec(stmt);
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.error('Vault migration warning:', err.message.substring(0, 100));
      }
    }
  }

  console.log('Vault tables created.');
}

module.exports = { runVaultMigrations };
