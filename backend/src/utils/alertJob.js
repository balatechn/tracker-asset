const cron = require('node-cron');
const { pool } = require('../db');
const { sendExpiryAlert } = require('./email');

async function checkExpiringAssets() {
  const today = new Date().toISOString().split('T')[0];
  const plus30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  try {
    const { rows } = await pool.query(`
      SELECT 'domain' AS type, domain_name AS name, expiry_date, criticality,
             (expiry_date - CURRENT_DATE) AS days_remaining
      FROM   domains
      WHERE  is_active = true AND expiry_date BETWEEN $1 AND $2
        AND  (expiry_date - CURRENT_DATE) IN (30, 15, 7, 1)
      UNION ALL
      SELECT 'software', product_name, expiry_date, criticality,
             (expiry_date - CURRENT_DATE)
      FROM   software_licenses
      WHERE  is_active = true AND expiry_date BETWEEN $1 AND $2
        AND  (expiry_date - CURRENT_DATE) IN (30, 15, 7, 1)
      ORDER  BY days_remaining ASC
    `, [today, plus30]);

    if (rows.length > 0) {
      console.log(`[AlertJob] Found ${rows.length} expiring asset(s) — sending alert`);
      await sendExpiryAlert(rows);
    }
  } catch (err) {
    console.error('[AlertJob] Error checking assets:', err.message);
  }
}

function startAlertJob() {
  // Run every day at 8:00 AM
  cron.schedule('0 8 * * *', () => {
    console.log('[AlertJob] Running daily expiry check...');
    checkExpiringAssets();
  });

  console.log('[AlertJob] Scheduled daily at 08:00');
}

module.exports = { startAlertJob, checkExpiringAssets };
