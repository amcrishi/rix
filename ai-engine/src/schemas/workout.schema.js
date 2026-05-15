/**
 * Output validation schema using Zod.
 * Ensures AI responses match our expected workout plan structure.
 * Rejects malformed responses and triggers fallback to rule-based engine.
 */

const { z } = require('zod');

const ExerciseSchema = z.object({
  name: z.string().min(1),
  muscleGroup: z.string().min(1),
  sets: z.number().int().min(1).max(10),
  reps: z.string().min(1), // Can be "8-12" or "30 seconds" etc.
  restSeconds: z.number().int().min(0).max(300),
  equipment: z.string().default('none'),
  notes: z.string().optional().default(''),
});

const WorkoutDaySchema = z.object({
  day: z.string().min(1),
  focus: z.string().min(1),
  warmup: z.string().optional().default('5 min light cardio'),
  exercises: z.array(ExerciseSchema).min(2).max(12),
  cooldown: z.string().optional().default('5 min stretching'),
});

const WorkoutPlanSchema = z.object({
  daysPerWeek: z.number().int().min(1).max(7),
  goal: z.string().min(1),
  level: z.string().min(1),
  durationWeeks: z.number().int().min(1).max(16),
  schedule: z.array(WorkoutDaySchema).min(1).max(7),
  notes: z.array(z.string()).default([]),
  progressionPlan: z.string().optional().default('Increase weight by 2.5-5% each week when all sets are completed with good form.'),
});

/**
 * Validate and parse AI response into structured plan.
 * @param {string} rawResponse - Raw JSON string from AI
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
function validatePlanOutput(rawResponse) {
  try {
    // Try to extract JSON from the response (handle markdown code blocks)
    let jsonStr = rawResponse.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonStr);
    const validated = WorkoutPlanSchema.parse(parsed);

    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      };
    }
    return {
      success: false,
      error: `Parse error: ${error.message}`,
    };
  }
}

module.exports = { WorkoutPlanSchema, ExerciseSchema, validatePlanOutput };
