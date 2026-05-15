/**
 * Authentication Routes.
 * Defines endpoints and attaches validators + middleware.
 */

const express = require('express');
const router = express.Router();
const { register, login, getMe, checkEmail, resetPassword } = require('../controllers/auth.controller');
const { registerValidation, loginValidation, resetPasswordValidation, checkEmailValidation } = require('../validators/auth.validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

// Public routes
router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/check-email', checkEmailValidation, validate, checkEmail);
router.post('/reset-password', resetPasswordValidation, validate, resetPassword);

// Protected routes
router.get('/me', authenticate, getMe);

module.exports = router;
