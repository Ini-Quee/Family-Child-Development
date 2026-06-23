const db = require('./connection');

async function runSecurityMigrations() {
  console.log('Running security migrations...');

  const statements = [
    `CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      details JSONB,
      ip_address TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at)`,
  ];

  for (const stmt of statements) {
    try {
      await db.exec(stmt);
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.error('Security migration warning:', err.message.substring(0, 80));
      }
    }
  }

  console.log('Security tables created.');
}

module.exports = { runSecurityMigrations };
