/**
 * JWT utility functions for token generation.
 */

const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Generate a JWT token for authenticated user.
 * @param {Object} user - User object with id and email
 * @returns {string} Signed JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    { userId: user.id, email: user.email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

module.exports = { generateToken };
