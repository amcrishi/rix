/**
 * AI Engine Entry Point.
 * Exports the orchestrated workout generation with AI-first, rule-based fallback.
 */

const { generateWorkoutPlan: generateWithAI } = require('./services/workout.service');
const { validatePlanOutput } = require('./schemas/workout.schema');

/**
 * Generate a workout plan with AI-first strategy.
 * Falls back to rule-based engine if AI fails or is unavailable.
 *
 * @param {Object} params - User profile + preferences
 * @param {Object} options - { apiKey, model, forceRule }
 * @returns {Object} { success, data, generatedBy, error }
 */
async function generateWorkout(params, options = {}) {
  const { forceRule = false, apiKey } = options;

  // If no API key or force rule-based, skip AI
  if (forceRule || !apiKey || apiKey === 'sk-placeholder') {
    return {
      success: true,
      data: null, // Caller should use rule-based engine
      generatedBy: 'rule',
      message: 'Using rule-based generation (AI not configured)',
    };
  }

  // Try AI generation
  const aiResult = await generateWithAI(params, options);

  if (aiResult.success) {
    return aiResult;
  }

  // AI failed — return failure info so caller can decide to fallback
  console.warn(`[AI Engine] Falling back to rule-based. Reason: ${aiResult.error}`);
  return {
    success: false,
    error: aiResult.error,
    generatedBy: 'ai_failed',
    message: 'AI generation failed. Recommend using rule-based fallback.',
  };
}

module.exports = {
  generateWorkout,
  generateWithAI,
  validatePlanOutput,
};

