/**
 * Exercise Database.
 * Structured exercise library organized by muscle group.
 * Each exercise has difficulty and equipment requirements.
 */

const exercises = {
  chest: [
    { name: 'Push-ups', difficulty: 'beginner', equipment: 'none' },
    { name: 'Incline Push-ups', difficulty: 'beginner', equipment: 'none' },
    { name: 'Dumbbell Bench Press', difficulty: 'intermediate', equipment: 'dumbbells' },
    { name: 'Dumbbell Flyes', difficulty: 'intermediate', equipment: 'dumbbells' },
    { name: 'Barbell Bench Press', difficulty: 'advanced', equipment: 'barbell' },
    { name: 'Incline Barbell Press', difficulty: 'advanced', equipment: 'barbell' },
  ],
  back: [
    { name: 'Superman Hold', difficulty: 'beginner', equipment: 'none' },
    { name: 'Inverted Rows', difficulty: 'beginner', equipment: 'bar' },
    { name: 'Dumbbell Rows', difficulty: 'intermediate', equipment: 'dumbbells' },
    { name: 'Lat Pulldowns', difficulty: 'intermediate', equipment: 'machine' },
    { name: 'Pull-ups', difficulty: 'advanced', equipment: 'bar' },
    { name: 'Barbell Rows', difficulty: 'advanced', equipment: 'barbell' },
  ],
  legs: [
    { name: 'Bodyweight Squats', difficulty: 'beginner', equipment: 'none' },
    { name: 'Lunges', difficulty: 'beginner', equipment: 'none' },
    { name: 'Goblet Squats', difficulty: 'intermediate', equipment: 'dumbbells' },
    { name: 'Romanian Deadlifts', difficulty: 'intermediate', equipment: 'dumbbells' },
    { name: 'Barbell Squats', difficulty: 'advanced', equipment: 'barbell' },
    { name: 'Deadlifts', difficulty: 'advanced', equipment: 'barbell' },
    { name: 'Leg Press', difficulty: 'advanced', equipment: 'machine' },
  ],
  shoulders: [
    { name: 'Pike Push-ups', difficulty: 'beginner', equipment: 'none' },
    { name: 'Lateral Raises', difficulty: 'beginner', equipment: 'dumbbells' },
    { name: 'Dumbbell Shoulder Press', difficulty: 'intermediate', equipment: 'dumbbells' },
    { name: 'Arnold Press', difficulty: 'intermediate', equipment: 'dumbbells' },
    { name: 'Overhead Barbell Press', difficulty: 'advanced', equipment: 'barbell' },
    { name: 'Face Pulls', difficulty: 'advanced', equipment: 'cable' },
  ],
  arms: [
    { name: 'Diamond Push-ups', difficulty: 'beginner', equipment: 'none' },
    { name: 'Bicep Curls', difficulty: 'beginner', equipment: 'dumbbells' },
    { name: 'Hammer Curls', difficulty: 'intermediate', equipment: 'dumbbells' },
    { name: 'Tricep Dips', difficulty: 'intermediate', equipment: 'none' },
    { name: 'Barbell Curls', difficulty: 'advanced', equipment: 'barbell' },
    { name: 'Skull Crushers', difficulty: 'advanced', equipment: 'barbell' },
  ],
  core: [
    { name: 'Plank', difficulty: 'beginner', equipment: 'none' },
    { name: 'Crunches', difficulty: 'beginner', equipment: 'none' },
    { name: 'Russian Twists', difficulty: 'intermediate', equipment: 'none' },
    { name: 'Hanging Leg Raises', difficulty: 'intermediate', equipment: 'bar' },
    { name: 'Ab Wheel Rollouts', difficulty: 'advanced', equipment: 'ab_wheel' },
    { name: 'Dragon Flags', difficulty: 'advanced', equipment: 'bench' },
  ],
  cardio: [
    { name: 'Walking (brisk)', difficulty: 'beginner', equipment: 'none' },
    { name: 'Jump Rope', difficulty: 'beginner', equipment: 'rope' },
    { name: 'Running', difficulty: 'intermediate', equipment: 'none' },
    { name: 'Cycling', difficulty: 'intermediate', equipment: 'bike' },
    { name: 'HIIT Sprints', difficulty: 'advanced', equipment: 'none' },
    { name: 'Battle Ropes', difficulty: 'advanced', equipment: 'ropes' },
  ],
};

module.exports = exercises;
