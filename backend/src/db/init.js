const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('./index');

async function initDb() {
  console.log('Initializing database schema...');
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('Schema applied.');

    // Upsert primary admin
    const hash = await bcrypt.hash('Nzt@2025', 12);
    await pool.query(`
      INSERT INTO users (username, email, password_hash, role, full_name)
      VALUES ('bala.admin', 'bala.techn@gmail.com', $1, 'admin', 'Bala Admin')
      ON CONFLICT (email) DO UPDATE SET password_hash = $1, role = 'admin', is_active = true
    `, [hash]);

    // Fallback seed users (skip if already present)
    const fallbackHash = await bcrypt.hash('Admin@1234', 12);
    await pool.query(`
      INSERT INTO users (username, email, password_hash, role, full_name)
      VALUES
        ('admin', 'admin@nationalgroup.com', $1, 'admin', 'System Admin'),
        ('viewer', 'viewer@nationalgroup.com', $1, 'viewer', 'View Only User')
      ON CONFLICT (username) DO NOTHING
    `, [fallbackHash]);

    console.log('Admin user ready: bala.techn@gmail.com');
  } catch (err) {
    console.error('DB init error:', err.message);
    // Non-fatal — let app start even if seed fails
  }
}

module.exports = { initDb };
