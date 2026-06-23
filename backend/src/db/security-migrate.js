const db = require('./connection');

const auditSchema = `
CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

CREATE TABLE IF NOT EXISTS evidence_photos (
    id TEXT PRIMARY KEY,
    assignment_id TEXT REFERENCES chore_assignments(id) ON DELETE CASCADE,
    child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
    photo_type TEXT NOT NULL CHECK (photo_type IN ('before', 'after')),
    file_path TEXT NOT NULL,
    file_hash TEXT,
    file_size INTEGER,
    mime_type TEXT,
    exif_timestamp TEXT,
    ai_similarity_score REAL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_evidence_assignment ON evidence_photos(assignment_id);
CREATE INDEX IF NOT EXISTS idx_evidence_child ON evidence_photos(child_id);
`;

function runSecurityMigrations() {
  console.log('Running security migrations...');
  db.exec(auditSchema);
  console.log('Security tables created.');
}

// Run if called directly
if (require.main === module) {
  runSecurityMigrations();
  console.log('Security migration complete!');
}

module.exports = { runSecurityMigrations };
