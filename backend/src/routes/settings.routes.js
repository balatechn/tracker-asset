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

// POST /api/settings/test-email  — verify SMTP connection and send a test email
router.post('/test-email', authenticate, authorize('admin'), async (req, res) => {
  const nodemailer = require('nodemailer');
  const host = process.env.EMAIL_SERVER || process.env.EMAIL_HOST;
  const user = process.env.EMAIL_LOGIN || process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;
  const from = process.env.EMAIL_FROM || user;
  const to = process.env.ALERT_EMAILS || user;
  const port = parseInt(process.env.EMAIL_PORT || '587');

  if (!host || !user || !pass) {
    return res.status(400).json({ error: 'Email not configured. Set EMAIL_SERVER, EMAIL_LOGIN, EMAIL_PASSWORD env vars.' });
  }

  const t = nodemailer.createTransport({
    host, port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });

  try {
    // Step 1: verify SMTP connection
    await t.verify();
    console.log('[Email] SMTP connection verified OK');
  } catch (err) {
    console.error('[Email] SMTP verify failed:', err.message);
    return res.status(500).json({ error: 'SMTP connection failed: ' + err.message, host, port, user });
  }

  try {
    // Step 2: send a real test email
    await t.sendMail({
      from,
      to,
      subject: '✅ NGI Asset Tracker — Test Email',
      html: `<h3>Email configuration is working!</h3><p>Sent at ${new Date().toISOString()} from NGI Asset Tracker.</p><p>SMTP: ${host}:${port}</p>`,
    });
    console.log('[Email] Test email sent to', to);
  } catch (err) {
    console.error('[Email] Test send failed:', err.message);
    return res.status(500).json({ error: 'SMTP connected but send failed: ' + err.message });
  }

  // Step 3: also trigger the real alert job
  try { await checkExpiringAssets(); } catch(e) { console.error('[AlertJob] Error:', e.message); }

  res.json({ ok: true, message: `Test email sent successfully to ${to}. Check your inbox.`, host, port, from, to });
});

module.exports = router;
