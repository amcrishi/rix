/**
 * Profile Controller.
 * Handles HTTP request/response for profile endpoints.
 * All routes here require authentication (JWT).
 */

const { asyncHandler } = require('../utils/asyncHandler');
const profileService = require('../services/profile.service');

/**
 * GET /api/profile
 * Fetch the authenticated user's fitness profile.
 */
const getProfile = asyncHandler(async (req, res) => {
  const result = await profileService.getProfile(req.user.id);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * PUT /api/profile
 * Create or update the authenticated user's fitness profile.
 * Uses upsert - creates if first time, updates if exists.
 */
const updateProfile = asyncHandler(async (req, res) => {
  const result = await profileService.upsertProfile(req.user.id, req.body);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Profile updated successfully.',
  });
});

/**
 * DELETE /api/profile
 * Reset/delete the user's fitness profile.
 */
const deleteProfile = asyncHandler(async (req, res) => {
  const result = await profileService.deleteProfile(req.user.id);

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = { getProfile, updateProfile, deleteProfile };
