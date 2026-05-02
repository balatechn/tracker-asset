const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { checkExpiringAssets } = require('../utils/alertJob');

// GET /api/settings/email-config  — return email configuration (admin only, password masked)
router.get('/email-config', authenticate, authorize('admin'), (req, res) => {
  const host = process.env.EMAIL_SERVER || process.env.EMAIL_HOST || null;
  const user = process.env.EMAIL_LOGIN || process.env.EMAIL_USER || null;
  const port = process.env.EMAIL_PORT || '587';
  const from = process.env.EMAIL_FROM || null;
  const alertEmails = process.env.ALERT_EMAILS || null;
  const hasPassword = !!(process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS);

  res.json({
    configured: !!(host && user && hasPassword),
    host,
    port,
    user,
    from,
    alertEmails,
    passwordSet: hasPassword,
  });
});

// POST /api/settings/test-email  — trigger immediate alert check (admin only)
router.post('/test-email', authenticate, authorize('admin'), async (req, res) => {
  try {
    await checkExpiringAssets();
    res.json({ message: 'Test alert triggered. Check backend logs and your inbox (bala.techn@gmail.com).' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
