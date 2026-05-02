const router = require('express').Router();
const {
  getSoftware, getSoftwareById, createSoftware, updateSoftware,
  deleteSoftware, exportExcel, upload,
} = require('../controllers/software.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

router.get('/', authenticate, getSoftware);
router.get('/export/excel', authenticate, exportExcel);
router.get('/:id', authenticate, getSoftwareById);
router.post('/', authenticate, authorize('admin', 'it_manager'), auditLog('CREATE', 'software_licenses'), createSoftware);
router.put('/:id', authenticate, authorize('admin', 'it_manager'), auditLog('UPDATE', 'software_licenses'), updateSoftware);
router.delete('/:id', authenticate, authorize('admin'), auditLog('DELETE', 'software_licenses'), deleteSoftware);

module.exports = router;
