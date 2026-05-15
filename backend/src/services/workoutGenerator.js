/**
 * Rule-Based Workout Generator.
 * Generates personalized weekly workout plans based on:
 *   - Fitness goal (lose_weight, build_muscle, maintain, endurance)
 *   - Experience level (beginner, intermediate, advanced)
 *   - Days per week (1-7)
 *
 * Logic:
 *   1. Select a split template based on days/week
 *   2. Pick exercises matching difficulty level
 *   3. Set reps/sets based on goal
 *   4. Assemble into a structured weekly plan
 */

const exercises = require('./exercises.data');

// Rep/set schemes based on fitness goal
const REP_SCHEMES = {
  lose_weight: { sets: 3, reps: '12-15', restSeconds: 45, includeCardio: true },
  build_muscle: { sets: 4, reps: '8-12', restSeconds: 90, includeCardio: false },
  maintain: { sets: 3, reps: '10-12', restSeconds: 60, includeCardio: true },
  endurance: { sets: 2, reps: '15-20', restSeconds: 30, includeCardio: true },
  flexibility: { sets: 3, reps: '12-15', restSeconds: 60, includeCardio: true },
};

// Workout split templates based on available days
const SPLIT_TEMPLATES = {
  2: [
    { day: 'Day 1', focus: 'Full Body A', muscleGroups: ['chest', 'back', 'legs', 'core'] },
    { day: 'Day 2', focus: 'Full Body B', muscleGroups: ['shoulders', 'arms', 'legs', 'core'] },
  ],
  3: [
    { day: 'Day 1', focus: 'Push', muscleGroups: ['chest', 'shoulders', 'arms'] },
    { day: 'Day 2', focus: 'Pull', muscleGroups: ['back', 'arms', 'core'] },
    { day: 'Day 3', focus: 'Legs & Core', muscleGroups: ['legs', 'core'] },
  ],
  4: [
    { day: 'Day 1', focus: 'Upper Body', muscleGroups: ['chest', 'back', 'shoulders'] },
    { day: 'Day 2', focus: 'Lower Body', muscleGroups: ['legs', 'core'] },
    { day: 'Day 3', focus: 'Push', muscleGroups: ['chest', 'shoulders', 'arms'] },
    { day: 'Day 4', focus: 'Pull & Legs', muscleGroups: ['back', 'legs', 'core'] },
  ],
  5: [
    { day: 'Day 1', focus: 'Chest & Triceps', muscleGroups: ['chest', 'arms'] },
    { day: 'Day 2', focus: 'Back & Biceps', muscleGroups: ['back', 'arms'] },
    { day: 'Day 3', focus: 'Legs', muscleGroups: ['legs', 'core'] },
    { day: 'Day 4', focus: 'Shoulders & Arms', muscleGroups: ['shoulders', 'arms'] },
    { day: 'Day 5', focus: 'Full Body & Cardio', muscleGroups: ['chest', 'back', 'legs'] },
  ],
  6: [
    { day: 'Day 1', focus: 'Push', muscleGroups: ['chest', 'shoulders', 'arms'] },
    { day: 'Day 2', focus: 'Pull', muscleGroups: ['back', 'arms', 'core'] },
    { day: 'Day 3', focus: 'Legs', muscleGroups: ['legs', 'core'] },
    { day: 'Day 4', focus: 'Push (Volume)', muscleGroups: ['chest', 'shoulders', 'arms'] },
    { day: 'Day 5', focus: 'Pull (Volume)', muscleGroups: ['back', 'arms'] },
    { day: 'Day 6', focus: 'Legs (Volume)', muscleGroups: ['legs', 'core'] },
  ],
};

/**
 * Pick exercises from a muscle group matching the experience level.
 * Falls back to easier exercises if not enough at the target level.
 */
function pickExercises(muscleGroup, level, count = 2) {
  const pool = exercises[muscleGroup] || [];
  const levelOrder = ['beginner', 'intermediate', 'advanced'];
  const levelIndex = levelOrder.indexOf(level);

  // Include exercises at the user's level and one level below
  const eligible = pool.filter((ex) => {
    const exLevel = levelOrder.indexOf(ex.difficulty);
    return exLevel <= levelIndex;
  });

  // Shuffle and pick
  const shuffled = eligible.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Generate a weekly workout plan.
 * @param {Object} params
 * @param {string} params.fitnessGoal - User's goal
 * @param {string} params.experienceLevel - beginner/intermediate/advanced
 * @param {number} params.daysPerWeek - Training days (2-6)
 * @returns {Object} Structured weekly plan
 */
function generatePlan({ fitnessGoal, experienceLevel, daysPerWeek }) {
  const days = Math.min(Math.max(daysPerWeek || 3, 2), 6);
  const goal = fitnessGoal || 'maintain';
  const level = experienceLevel || 'beginner';

  const scheme = REP_SCHEMES[goal] || REP_SCHEMES.maintain;
  const template = SPLIT_TEMPLATES[days] || SPLIT_TEMPLATES[3];

  const weeklyPlan = template.map((dayTemplate) => {
    const dayExercises = [];

    // Pick 2 exercises per muscle group for that day
    for (const group of dayTemplate.muscleGroups) {
      const picked = pickExercises(group, level, 2);
      for (const exercise of picked) {
        dayExercises.push({
          name: exercise.name,
          muscleGroup: group,
          sets: scheme.sets,
          reps: scheme.reps,
          restSeconds: scheme.restSeconds,
          equipment: exercise.equipment,
        });
      }
    }

    // Add cardio at the end if the goal requires it
    if (scheme.includeCardio) {
      const cardio = pickExercises('cardio', level, 1);
      if (cardio.length > 0) {
        dayExercises.push({
          name: cardio[0].name,
          muscleGroup: 'cardio',
          sets: 1,
          reps: level === 'beginner' ? '15-20 min' : '20-30 min',
          restSeconds: 0,
          equipment: cardio[0].equipment,
        });
      }
    }

    return {
      day: dayTemplate.day,
      focus: dayTemplate.focus,
      exercises: dayExercises,
    };
  });

  return {
    daysPerWeek: days,
    goal,
    level,
    durationWeeks: level === 'beginner' ? 4 : level === 'intermediate' ? 6 : 8,
    schedule: weeklyPlan,
    notes: generateNotes(goal, level),
  };
}

/**
 * Generate helpful notes based on goal and level.
 */
function generateNotes(goal, level) {
  const notes = [];

  if (level === 'beginner') {
    notes.push('Focus on form over weight. Start light and progress gradually.');
    notes.push('Rest at least 1 day between training sessions.');
  }

  if (goal === 'lose_weight') {
    notes.push('Maintain a caloric deficit of 300-500 calories for fat loss.');
    notes.push('Keep rest periods short to maintain elevated heart rate.');
  } else if (goal === 'build_muscle') {
    notes.push('Eat in a slight caloric surplus (200-400 cal) with high protein.');
    notes.push('Progressive overload: increase weight or reps each week.');
  } else if (goal === 'endurance') {
    notes.push('Focus on higher reps with shorter rest for muscular endurance.');
    notes.push('Include 2-3 dedicated cardio sessions per week.');
  }

  notes.push('Warm up 5-10 minutes before each session.');
  notes.push('Stay hydrated — aim for 2-3 liters of water daily.');

  return notes;
}

module.exports = { generatePlan };
