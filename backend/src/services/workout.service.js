/**
 * Workout Plan Service.
 * Orchestrates plan generation (AI-first, rule-based fallback) and persistence.
 */

const prisma = require('../config/database');
const { generatePlan: generateRuleBased } = require('./workoutGenerator');
const { generateWorkout: generateWithAI } = require('../../../ai-engine/src');
const config = require('../config');
const { AppError } = require('../middleware/errorHandler');

/**
 * Generate and save a new workout plan for the user.
 * Strategy: Try AI first → fallback to rule-based if AI fails or is unconfigured.
 *
 * @param {string} userId
 * @param {Object} options - { fitnessGoal, experienceLevel, daysPerWeek, name, useAI, profile }
 * @returns {Object} Saved workout plan
 */
const createWorkoutPlan = async (userId, { fitnessGoal, experienceLevel, daysPerWeek, name, useAI = true, profile = {} }) => {
  let planData;
  let generatedBy = 'rule';

  if (useAI) {
    // Attempt AI generation
    const aiResult = await generateWithAI(
      {
        fitnessGoal,
        experienceLevel,
        daysPerWeek,
        age: profile.age,
        weight: profile.weight,
        height: profile.height,
        gender: profile.gender,
        preferences: profile.preferences,
      },
      {
        apiKey: config.openaiApiKey,
        model: 'gpt-4o',
      }
    );

    if (aiResult.success && aiResult.data) {
      planData = aiResult.data;
      generatedBy = 'ai';
    } else {
      // Fallback to rule-based
      console.log(`[Workout Service] AI unavailable, using rule-based. Reason: ${aiResult.error || aiResult.message}`);
      planData = generateRuleBased({ fitnessGoal, experienceLevel, daysPerWeek });
      generatedBy = 'rule';
    }
  } else {
    // Explicitly requested rule-based
    planData = generateRuleBased({ fitnessGoal, experienceLevel, daysPerWeek });
  }

  // Deactivate any current active plan for this user
  await prisma.workoutPlan.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false },
  });

  // Save to database
  const workoutPlan = await prisma.workoutPlan.create({
    data: {
      userId,
      name: name || `${fitnessGoal} Plan - ${new Date().toLocaleDateString()}`,
      description: `${experienceLevel} level, ${daysPerWeek} days/week, goal: ${fitnessGoal}`,
      difficulty: experienceLevel,
      durationWeeks: planData.durationWeeks,
      generatedBy,
      isActive: true,
      planData,
    },
  });

  return workoutPlan;
};

/**
 * Get the user's active workout plan.
 * @param {string} userId
 * @returns {Object|null} Active plan or null
 */
const getActivePlan = async (userId) => {
  const plan = await prisma.workoutPlan.findFirst({
    where: { userId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  return plan;
};

/**
 * Get all workout plans for a user (paginated).
 * @param {string} userId
 * @param {Object} options - { page, limit }
 * @returns {Object} { plans, total, page, totalPages }
 */
const getUserPlans = async (userId, { page = 1, limit = 10 }) => {
  const skip = (page - 1) * limit;

  const [plans, total] = await Promise.all([
    prisma.workoutPlan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        difficulty: true,
        durationWeeks: true,
        isActive: true,
        generatedBy: true,
        createdAt: true,
      },
    }),
    prisma.workoutPlan.count({ where: { userId } }),
  ]);

  return {
    plans,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get a specific plan by ID (must belong to user).
 * @param {string} userId
 * @param {string} planId
 * @returns {Object} Full plan with schedule data
 */
const getPlanById = async (userId, planId) => {
  const plan = await prisma.workoutPlan.findFirst({
    where: { id: planId, userId },
  });

  if (!plan) {
    throw new AppError('Workout plan not found.', 404);
  }

  return plan;
};

/**
 * Delete a workout plan.
 * @param {string} userId
 * @param {string} planId
 */
const deletePlan = async (userId, planId) => {
  const plan = await prisma.workoutPlan.findFirst({
    where: { id: planId, userId },
  });

  if (!plan) {
    throw new AppError('Workout plan not found.', 404);
  }

  await prisma.workoutPlan.delete({ where: { id: planId } });

  return { message: 'Workout plan deleted.' };
};

module.exports = { createWorkoutPlan, getActivePlan, getUserPlans, getPlanById, deletePlan };
