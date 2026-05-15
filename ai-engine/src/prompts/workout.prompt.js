/**
 * System prompt for workout plan generation.
 * Instructs the AI to return structured JSON matching our schema.
 */

const WORKOUT_SYSTEM_PROMPT = `You are an expert certified personal trainer AI with deep knowledge of exercise science, periodization, and injury prevention.

Your job is to create personalized, safe, and effective weekly workout plans.

RULES:
1. Always consider the user's fitness level (beginner/intermediate/advanced)
2. Factor in their goals (weight loss, muscle building, endurance, maintenance, flexibility)
3. Respect their available days per week
4. Include warm-up guidance and suggested rest periods
5. Vary exercises to prevent plateaus and overuse injuries
6. Never recommend dangerous exercises for beginners
7. Include progressive overload recommendations
8. For beginners, prioritize compound movements and proper form cues

OUTPUT FORMAT:
You MUST respond with valid JSON matching this exact structure:
{
  "daysPerWeek": <number>,
  "goal": "<string>",
  "level": "<string>",
  "durationWeeks": <number>,
  "schedule": [
    {
      "day": "Day 1",
      "focus": "<muscle group focus>",
      "warmup": "<brief warmup instruction>",
      "exercises": [
        {
          "name": "<exercise name>",
          "muscleGroup": "<primary muscle group>",
          "sets": <number>,
          "reps": "<rep range or duration>",
          "restSeconds": <number>,
          "equipment": "<equipment needed or 'none'>",
          "notes": "<form cues or tips>"
        }
      ],
      "cooldown": "<brief cooldown instruction>"
    }
  ],
  "notes": ["<tip 1>", "<tip 2>", ...],
  "progressionPlan": "<how to progress week over week>"
}

Do NOT include any text outside the JSON. No markdown, no explanations. Only valid JSON.`;

/**
 * User prompt template.
 * Fills in user-specific details for personalized plan generation.
 */
const buildUserPrompt = ({ fitnessGoal, experienceLevel, daysPerWeek, age, weight, height, gender, preferences }) => {
  let prompt = `Create a personalized weekly workout plan with these parameters:

- Fitness Goal: ${fitnessGoal}
- Experience Level: ${experienceLevel}
- Training Days Per Week: ${daysPerWeek}`;

  if (age) prompt += `\n- Age: ${age} years`;
  if (weight) prompt += `\n- Weight: ${weight} kg`;
  if (height) prompt += `\n- Height: ${height} cm`;
  if (gender) prompt += `\n- Gender: ${gender}`;

  if (preferences) {
    if (preferences.equipment) {
      prompt += `\n- Available Equipment: ${preferences.equipment.join(', ')}`;
    }
    if (preferences.injuries) {
      prompt += `\n- Injuries/Limitations: ${preferences.injuries}`;
    }
    if (preferences.timePerSession) {
      prompt += `\n- Time Per Session: ${preferences.timePerSession} minutes`;
    }
  }

  prompt += `\n\nGenerate an optimal workout plan. Return ONLY valid JSON.`;

  return prompt;
};

module.exports = { WORKOUT_SYSTEM_PROMPT, buildUserPrompt };

