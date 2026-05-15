/**
 * Profile Validation Rules.
 * Validates fitness profile data before processing.
 */

const { body } = require('express-validator');

// Valid enum values for profile fields
const FITNESS_GOALS = ['lose_weight', 'build_muscle', 'maintain', 'endurance', 'flexibility'];
const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'];
const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'];
const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
const WORKOUT_PREFERENCES = ['home', 'gym', 'outdoor', 'mixed'];
const DIETARY_PREFERENCES = ['no_restriction', 'vegetarian', 'vegan', 'keto', 'paleo', 'gluten_free'];

const updateProfileValidation = [
  body('age')
    .optional()
    .isInt({ min: 13, max: 100 })
    .withMessage('Age must be between 13 and 100'),

  body('gender')
    .optional()
    .isIn(GENDERS)
    .withMessage(`Gender must be one of: ${GENDERS.join(', ')}`),

  body('weight')
    .optional()
    .isFloat({ min: 20, max: 300 })
    .withMessage('Weight must be between 20 and 300 kg'),

  body('height')
    .optional()
    .isFloat({ min: 100, max: 250 })
    .withMessage('Height must be between 100 and 250 cm'),

  body('targetWeight')
    .optional()
    .isFloat({ min: 20, max: 300 })
    .withMessage('Target weight must be between 20 and 300 kg'),

  body('phone')
    .optional()
    .isString()
    .isLength({ max: 20 })
    .withMessage('Phone number must be 20 characters or less'),

  body('dateOfBirth')
    .optional()
    .isString()
    .withMessage('Date of birth must be a valid date string'),

  body('fitnessGoal')
    .optional()
    .isIn(FITNESS_GOALS)
    .withMessage(`Fitness goal must be one of: ${FITNESS_GOALS.join(', ')}`),

  body('activityLevel')
    .optional()
    .isIn(ACTIVITY_LEVELS)
    .withMessage(`Activity level must be one of: ${ACTIVITY_LEVELS.join(', ')}`),

  body('experienceLevel')
    .optional()
    .isIn(EXPERIENCE_LEVELS)
    .withMessage(`Experience level must be one of: ${EXPERIENCE_LEVELS.join(', ')}`),

  body('workoutPreference')
    .optional()
    .isIn(WORKOUT_PREFERENCES)
    .withMessage(`Workout preference must be one of: ${WORKOUT_PREFERENCES.join(', ')}`),

  body('dietaryPreference')
    .optional()
    .isIn(DIETARY_PREFERENCES)
    .withMessage(`Dietary preference must be one of: ${DIETARY_PREFERENCES.join(', ')}`),

  body('daysPerWeek')
    .optional()
    .isInt({ min: 1, max: 7 })
    .withMessage('Days per week must be between 1 and 7'),

  body('medicalConditions')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Medical conditions must be 1000 characters or less'),

  body('bodyMeasurements')
    .optional()
    .isObject()
    .withMessage('Body measurements must be an object'),
];

module.exports = {
  updateProfileValidation,
  FITNESS_GOALS,
  EXPERIENCE_LEVELS,
  GENDERS,
  ACTIVITY_LEVELS,
  WORKOUT_PREFERENCES,
  DIETARY_PREFERENCES,
};
