/**
 * Profile Routes.
 * All routes are protected — require valid JWT.
 */

const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, deleteProfile } = require('../controllers/profile.controller');
const { updateProfileValidation } = require('../validators/profile.validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

// All profile routes require authentication
router.use(authenticate);

// GET /api/profile — Fetch current user's profile
router.get('/', getProfile);

// PUT /api/profile — Create or update profile
router.put('/', updateProfileValidation, validate, updateProfile);

// DELETE /api/profile — Delete/reset profile
router.delete('/', deleteProfile);

module.exports = router;
