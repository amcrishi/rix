/**
 * Authentication Controller.
 * Handles HTTP request/response for auth endpoints.
 * Delegates business logic to auth.service.
 */

const { asyncHandler } = require('../utils/asyncHandler');
const authService = require('../services/auth.service');
const { AppError } = require('../middleware/errorHandler');

/**
 * POST /api/auth/register
 * Register a new user account.
 */
const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  const { user, token } = await authService.registerUser({
    email,
    password,
    firstName,
    lastName,
  });

  res.status(201).json({
    success: true,
    data: {
      user,
      token,
    },
    message: 'Account created successfully.',
  });
});

/**
 * POST /api/auth/login
 * Login with email and password.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { user, token } = await authService.loginUser({ email, password });

  res.status(200).json({
    success: true,
    data: {
      user,
      token,
    },
    message: 'Login successful.',
  });
});

/**
 * GET /api/auth/me
 * Get current authenticated user profile.
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);

  res.status(200).json({
    success: true,
    data: { user },
  });
});

/**
 * POST /api/auth/check-email
 * Check if an email is registered in the database.
 */
const checkEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const exists = await authService.checkEmailExists(email);

  res.status(200).json({
    success: true,
    exists,
  });
});

/**
 * POST /api/auth/reset-password
 * Reset password directly (no email link).
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { email, newPassword } = req.body;

  await authService.resetPassword({ email, newPassword });

  res.status(200).json({
    success: true,
    message: 'Password reset successfully.',
  });
});

module.exports = { register, login, getMe, checkEmail, resetPassword };
