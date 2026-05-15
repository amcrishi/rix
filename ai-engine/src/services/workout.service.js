/**
 * AI Workout Generation Service.
 * Calls OpenAI to generate personalized workout plans.
 * Validates output with Zod schema and falls back to rule-based on failure.
 */

const { getClient } = require('./openai.client');
const { WORKOUT_SYSTEM_PROMPT, buildUserPrompt } = require('../prompts/workout.prompt');
const { validatePlanOutput } = require('../schemas/workout.schema');

// Default model — GPT-4o for best structured output quality
const DEFAULT_MODEL = 'gpt-4o';

/**
 * Generate a workout plan using OpenAI.
 * @param {Object} params - User profile and preferences
 * @param {string} params.fitnessGoal
 * @param {string} params.experienceLevel
 * @param {number} params.daysPerWeek
 * @param {number} [params.age]
 * @param {number} [params.weight]
 * @param {number} [params.height]
 * @param {string} [params.gender]
 * @param {Object} [params.preferences] - { equipment, injuries, timePerSession }
 * @param {Object} options - { apiKey, model }
 * @returns {Object} { success, data, generatedBy, error }
 */
async function generateWorkoutPlan(params, options = {}) {
  const { apiKey, model = DEFAULT_MODEL } = options;

  try {
    const client = getClient(apiKey);
    const userPrompt = buildUserPrompt(params);

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: WORKOUT_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: 'Empty response from AI',
        generatedBy: 'ai',
      };
    }

    // Validate the AI output against our schema
    const validation = validatePlanOutput(content);

    if (!validation.success) {
      console.warn(`[AI Engine] Validation failed: ${validation.error}`);
      return {
        success: false,
        error: validation.error,
        generatedBy: 'ai',
        rawResponse: content,
      };
    }

    return {
      success: true,
      data: validation.data,
      generatedBy: 'ai',
      tokensUsed: response.usage?.total_tokens || 0,
    };
  } catch (error) {
    console.error(`[AI Engine] OpenAI error: ${error.message}`);

    return {
      success: false,
      error: error.message,
      generatedBy: 'ai',
      code: error.code || 'UNKNOWN',
    };
  }
}

module.exports = { generateWorkoutPlan };

