const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error on idle client', err.message);
});

pool.on('connect', () => {
  console.log('PostgreSQL client connected');
});

module.exports = { pool };
