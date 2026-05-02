const router = require('express').Router();
const { getSummary, getAlerts, getAuditLogs } = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth');

router.get('/summary', authenticate, getSummary);
router.get('/alerts', authenticate, getAlerts);
router.get('/audit', authenticate, getAuditLogs);

module.exports = router;
