const cron = require('node-cron');
const { pool } = require('../db');
const { sendExpiryAlert } = require('./email');

async function checkExpiringAssets() {
  const today = new Date().toISOString().split('T')[0];
  const plus30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  try {
    // Fetch domains within 30 days — alert EVERY day until renewed
    const domainRes = await pool.query(`
      SELECT 'domain' AS type,
             domain_name AS name,
             TO_CHAR(expiry_date, 'DD-Mon-YYYY') AS expiry_date,
             criticality,
             owner,
             (expiry_date - CURRENT_DATE) AS days_remaining,
             finance_email,
             admin_email,
             vendor_email
      FROM   domains
      WHERE  is_active = true
        AND  expiry_date >= $1
        AND  expiry_date <= $2
      ORDER  BY days_remaining ASC
    `, [today, plus30]);

    // Fetch software licenses within 30 days — alert EVERY day until renewed
    const softRes = await pool.query(`
      SELECT 'software' AS type,
             product_name AS name,
             TO_CHAR(expiry_date, 'DD-Mon-YYYY') AS expiry_date,
             criticality,
             NULL AS owner,
             (expiry_date - CURRENT_DATE) AS days_remaining,
             NULL AS finance_email,
             NULL AS admin_email,
             NULL AS vendor_email
      FROM   software_licenses
      WHERE  is_active = true
        AND  expiry_date >= $1
        AND  expiry_date <= $2
      ORDER  BY days_remaining ASC
    `, [today, plus30]);

    const rows = [...domainRes.rows, ...softRes.rows].sort(
      (a, b) => a.days_remaining - b.days_remaining
    );

    if (rows.length > 0) {
      console.log(`[AlertJob] Found ${rows.length} expiring asset(s) — sending alerts`);
      await sendExpiryAlert(rows);
    } else {
      console.log('[AlertJob] No assets expiring within 30 days.');
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

  console.log('[AlertJob] Scheduled daily at 08:00 — alerts fire every day until assets are renewed');
}

module.exports = { startAlertJob, checkExpiringAssets };
