const router = require('express').Router();
const { login, getProfile, changePassword, getUsers, createUser } = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/login', login);
router.get('/profile', authenticate, getProfile);
router.put('/change-password', authenticate, changePassword);
router.get('/users', authenticate, authorize('admin'), getUsers);
router.post('/users', authenticate, authorize('admin'), createUser);

module.exports = router;
