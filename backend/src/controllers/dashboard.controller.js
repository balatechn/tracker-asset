const { pool } = require('../db');
const { getCache, setCache } = require('../config/redis');

const getSummary = async (req, res, next) => {
  try {
    const cacheKey = 'dashboard:summary';
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const today = new Date().toISOString().split('T')[0];
    const plus15 = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
    const plus30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const plus90 = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().split('T')[0];

    const [domainStats, softwareStats, upcoming] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE is_active = true)                                          AS total,
          COUNT(*) FILTER (WHERE is_active = true AND expiry_date BETWEEN $1 AND $3)        AS expiring_30,
          COUNT(*) FILTER (WHERE is_active = true AND expiry_date BETWEEN $1 AND $2)        AS expiring_15,
          COUNT(*) FILTER (WHERE is_active = true AND criticality = 'High')                 AS high_critical,
          COUNT(*) FILTER (WHERE is_active = true AND last_renewal_date >= $4)              AS renewed_month,
          SUM(annual_cost_inr) FILTER (WHERE is_active = true)                              AS total_cost
        FROM domains
      `, [today, plus15, plus30, startOfMonth]),

      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE is_active = true)                                          AS total,
          COUNT(*) FILTER (WHERE is_active = true AND expiry_date BETWEEN $1 AND $2)        AS expiring_30,
          COUNT(*) FILTER (WHERE is_active = true AND criticality = 'High')                 AS high_critical,
          SUM(annual_cost_inr) FILTER (WHERE is_active = true)                              AS total_cost
        FROM software_licenses
      `, [today, plus30]),

      pool.query(`
        SELECT 'domain' AS type, domain_name AS name, expiry_date, criticality,
               (expiry_date - CURRENT_DATE) AS days_remaining
        FROM   domains
        WHERE  is_active = true AND expiry_date BETWEEN $1 AND $2
        UNION ALL
        SELECT 'software', product_name, expiry_date, criticality,
               (expiry_date - CURRENT_DATE)
        FROM   software_licenses
        WHERE  is_active = true AND expiry_date BETWEEN $1 AND $2
        ORDER  BY days_remaining ASC
        LIMIT  15
      `, [today, plus90]),
    ]);

    const result = {
      domains: domainStats.rows[0],
      software: softwareStats.rows[0],
      upcoming: upcoming.rows,
      lastUpdated: new Date().toISOString(),
    };

    await setCache(cacheKey, result, 60); // cache 1 min
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getAlerts = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const plus30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const { rows } = await pool.query(`
      SELECT 'domain' AS type, domain_name AS name, registrar AS vendor,
             expiry_date, criticality, (expiry_date - CURRENT_DATE) AS days_remaining,
             finance_email, admin_email, vendor_email, owner
      FROM   domains
      WHERE  is_active = true AND expiry_date BETWEEN $1 AND $2
      UNION ALL
      SELECT 'software', product_name, vendor,
             expiry_date, criticality, (expiry_date - CURRENT_DATE),
             NULL AS finance_email, NULL AS admin_email, NULL AS vendor_email, NULL AS owner
      FROM   software_licenses
      WHERE  is_active = true AND expiry_date BETWEEN $1 AND $2
      ORDER  BY days_remaining ASC
    `, [today, plus30]);

    res.json({ alerts: rows });
  } catch (err) {
    next(err);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(`
      SELECT * FROM audit_logs
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSummary, getAlerts, getAuditLogs };
