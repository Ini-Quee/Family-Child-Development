const { Pool } = require('pg');

// PostgreSQL connection for Docker/production
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://familyos:familyos_secure_2024@localhost:5434/familyos',
});

// Wrapper that mimics SQLite's synchronous API using async
// All routes need to use async/await with this
const db = {
  query: async (text, params) => {
    const result = await pool.query(text, params);
    return result;
  },

  // For compatibility with SQLite-style code
  // These return promises, so routes must await them
  prepare: (sql) => ({
    get: async (...params) => {
      // Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
      let paramIndex = 0;
      const pgSql = sql.replace(/\?/g, () => `$${++paramIndex}`);
      const result = await pool.query(pgSql, params);
      return result.rows[0] || null;
    },
    all: async (...params) => {
      let paramIndex = 0;
      const pgSql = sql.replace(/\?/g, () => `$${++paramIndex}`);
      const result = await pool.query(pgSql, params);
      return result.rows;
    },
    run: async (...params) => {
      let paramIndex = 0;
      const pgSql = sql.replace(/\?/g, () => `$${++paramIndex}`);
      const result = await pool.query(pgSql, params);
      return { changes: result.rowCount, rows: result.rows };
    },
  }),

  exec: async (sql) => {
    await pool.query(sql);
  },

  // For transactions
  transaction: async (callback) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};

module.exports = db;
