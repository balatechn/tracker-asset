const { pool } = require('../db');

/**
 * Audit middleware — logs mutating actions to audit_logs table.
 * Attach BEFORE the route handler so req.user is available.
 */
const auditLog = (action, tableName) => async (req, res, next) => {
  const oldJson = res.json.bind(res);

  res.json = async (body) => {
    if (res.statusCode < 400 && req.user) {
      try {
        await pool.query(
          `INSERT INTO audit_logs
             (user_id, username, action, table_name, record_id, new_values, ip_address)
           VALUES ($1, $2, $3, $4, $5, $6, $7::inet)`,
          [
            req.user.id,
            req.user.username,
            action,
            tableName,
            body?.data?.id || req.params?.id || null,
            JSON.stringify(req.body),
            req.ip || null,
          ]
        );
      } catch (err) {
        console.error('Audit log error:', err.message);
      }
    }
    return oldJson(body);
  };

  next();
};

module.exports = { auditLog };
