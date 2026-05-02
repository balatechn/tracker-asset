const router = require('express').Router();
const {
  getDomains, getDomain, createDomain, updateDomain, deleteDomain,
  exportExcel, importExcel, upload,
} = require('../controllers/domain.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

router.get('/', authenticate, getDomains);
router.get('/export/excel', authenticate, exportExcel);
router.post('/import', authenticate, authorize('admin', 'it_manager'), upload.single('file'), importExcel);
router.get('/:id', authenticate, getDomain);
router.post('/', authenticate, authorize('admin', 'it_manager'), auditLog('CREATE', 'domains'), createDomain);
router.put('/:id', authenticate, authorize('admin', 'it_manager'), auditLog('UPDATE', 'domains'), updateDomain);
router.delete('/:id', authenticate, authorize('admin'), auditLog('DELETE', 'domains'), deleteDomain);

module.exports = router;
