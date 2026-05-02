const router = require('express').Router();
const {
  getDomains, getDomain, createDomain, updateDomain, deleteDomain,
  exportExcel, importExcel, upload,
} = require('../controllers/domain.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { checkExpiringAssets } = require('../utils/alertJob');
const { pool } = require('../db');

router.get('/', authenticate, getDomains);
router.get('/export/excel', authenticate, exportExcel);
router.post('/import', authenticate, authorize('admin', 'it_manager'), upload.single('file'), importExcel);

// Run DB migration for email columns (admin only — call once if columns missing)
router.post('/migrate', authenticate, authorize('admin'), async (req, res) => {
  try {
    await pool.query(`ALTER TABLE domains ADD COLUMN IF NOT EXISTS finance_email VARCHAR(255)`);
    await pool.query(`ALTER TABLE domains ADD COLUMN IF NOT EXISTS admin_email   VARCHAR(255)`);
    await pool.query(`ALTER TABLE domains ADD COLUMN IF NOT EXISTS vendor_email  VARCHAR(255)`);
    res.json({ message: 'Migration complete — email columns added (or already existed).' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manually trigger expiry alert email (admin only — for testing Mailgun config)
router.post('/send-test-alert', authenticate, authorize('admin'), async (req, res) => {
  try {
    await checkExpiringAssets();
    res.json({ message: 'Alert check triggered. Check server logs and inbox.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticate, getDomain);
router.post('/', authenticate, authorize('admin', 'it_manager'), auditLog('CREATE', 'domains'), createDomain);
router.put('/:id', authenticate, authorize('admin', 'it_manager'), auditLog('UPDATE', 'domains'), updateDomain);
router.delete('/:id', authenticate, authorize('admin'), auditLog('DELETE', 'domains'), deleteDomain);

module.exports = router;
