/**
 * Workout Plan Validation Rules.
 */

const { body, query } = require('express-validator');

const GOALS = ['lose_weight', 'build_muscle', 'maintain', 'endurance', 'flexibility'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];

const generatePlanValidation = [
  body('fitnessGoal')
    .notEmpty()
    .withMessage('Fitness goal is required')
    .isIn(GOALS)
    .withMessage(`Fitness goal must be one of: ${GOALS.join(', ')}`),

  body('experienceLevel')
    .notEmpty()
    .withMessage('Experience level is required')
    .isIn(LEVELS)
    .withMessage(`Experience level must be one of: ${LEVELS.join(', ')}`),

  body('daysPerWeek')
    .notEmpty()
    .withMessage('Days per week is required')
    .isInt({ min: 2, max: 6 })
    .withMessage('Days per week must be between 2 and 6'),

  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Plan name must be less than 100 characters'),

  body('useAI')
    .optional()
    .isBoolean()
    .withMessage('useAI must be a boolean'),

  body('profile')
    .optional()
    .isObject()
    .withMessage('profile must be an object'),
];

const logWorkoutValidation = [
  body('exercise').notEmpty().withMessage('Exercise name is required'),
  body('sets').isInt({ min: 1 }).withMessage('Sets must be a positive integer'),
  body('reps').optional().isInt({ min: 0 }),
  body('weight').optional().isFloat({ min: 0 }),
  body('duration').optional().isInt({ min: 1 }),
];

module.exports = { generatePlanValidation, logWorkoutValidation };
