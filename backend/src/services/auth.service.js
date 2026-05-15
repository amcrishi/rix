/**
 * Authentication Service.
 * Handles business logic for user registration and login.
 * Keeps controllers thin by encapsulating logic here.
 */

const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { generateToken } = require('../utils/jwt');
const { AppError } = require('../middleware/errorHandler');

const SALT_ROUNDS = 12;

/**
 * Register a new user.
 * @param {Object} userData - { email, password, firstName, lastName }
 * @returns {Object} - { user, token }
 */
const registerUser = async ({ email, password, firstName, lastName }) => {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError('An account with this email already exists.', 409);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      createdAt: true,
    },
  });

  // Generate JWT
  const token = generateToken(user);

  return { user, token };
};

/**
 * Login an existing user.
 * @param {Object} credentials - { email, password }
 * @returns {Object} - { user, token }
 */
const loginUser = async ({ email, password }) => {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError('Invalid email or password.', 401);
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new AppError('Invalid email or password.', 401);
  }

  // Generate JWT
  const token = generateToken(user);

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, token };
};

/**
 * Get current user profile.
 * @param {string} userId
 * @returns {Object} - User data without password
 */
const getCurrentUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      profile: true,
    },
  });

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  return user;
};

/**
 * Check if a user exists by email.
 * @param {string} email
 * @returns {boolean}
 */
const checkEmailExists = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });
  return !!user;
};

/**
 * Reset a user's password directly (no email link).
 * @param {Object} params - { email, newPassword }
 */
const resetPassword = async ({ email, newPassword }) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
  });
};

module.exports = { registerUser, loginUser, getCurrentUser, checkEmailExists, resetPassword };
