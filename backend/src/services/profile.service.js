/**
 * Profile Service.
 * Business logic for user fitness profile management.
 * Handles create/update (upsert) and retrieval of profile data.
 */

const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

/**
 * Get user profile by userId.
 * Returns profile with user basic info.
 * @param {string} userId
 * @returns {Object} Profile data or null
 */
const getProfile = async (userId) => {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!profile) {
    // Return a default empty profile structure if none exists yet
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    return {
      user,
      profile: null,
      message: 'Profile not yet created. Use PUT /api/profile to set up your fitness profile.',
    };
  }

  // Destructure to separate user from profile fields
  const { user, ...profileData } = profile;

  return { user, profile: profileData };
};

/**
 * Create or update user profile (upsert).
 * If profile exists, updates it. If not, creates a new one.
 * @param {string} userId
 * @param {Object} data - Profile fields to update
 * @returns {Object} Updated profile
 */
const upsertProfile = async (userId, data) => {
  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  // Build the data object with only provided fields
  const profileData = {};
  const allowedFields = [
    'age', 'gender', 'weight', 'height', 'targetWeight', 'phone', 'dateOfBirth',
    'fitnessGoal', 'activityLevel', 'experienceLevel', 'workoutPreference',
    'dietaryPreference', 'daysPerWeek', 'medicalConditions', 'bodyMeasurements'
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      profileData[field] = data[field];
    }
  }

  // Upsert: create if doesn't exist, update if it does
  const profile = await prisma.profile.upsert({
    where: { userId },
    update: profileData,
    create: {
      userId,
      ...profileData,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  const { user: userData, ...profileFields } = profile;

  return { user: userData, profile: profileFields };
};

/**
 * Delete user profile (reset to empty).
 * @param {string} userId
 */
const deleteProfile = async (userId) => {
  const existing = await prisma.profile.findUnique({
    where: { userId },
  });

  if (!existing) {
    throw new AppError('No profile to delete.', 404);
  }

  await prisma.profile.delete({
    where: { userId },
  });

  return { message: 'Profile deleted successfully.' };
};

module.exports = { getProfile, upsertProfile, deleteProfile };
