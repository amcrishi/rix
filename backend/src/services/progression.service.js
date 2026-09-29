/**
 * Progression Service.
 * Supports progressive overload by answering "what did I do last time?" for
 * each exercise, so the tracker can show the numbers to beat.
 *
 * Only completed sessions are considered — an abandoned session is not a
 * benchmark. The most recent completed session containing an exercise wins.
 */

const prisma = require('../config/database');

// How many past sessions to scan when looking for each exercise's last outing.
const SESSION_SCAN_LIMIT = 60;

/**
 * Normalise a stored set into { weight, reps }.
 * Tracker fields arrive as strings.
 * @param {Object} set
 */
const readSet = (set) => ({
  weight: parseFloat(set.weight) || 0,
  reps: parseInt(set.reps, 10) || 0,
});

/**
 * Summarise one exercise's completed sets from a single session.
 * @param {Object} exercise
 * @param {Date} performedAt
 * @param {string} sessionName
 * @returns {Object|null} null when nothing was actually completed
 */
const summariseExercise = (exercise, performedAt, sessionName) => {
  const sets = (Array.isArray(exercise.sets) ? exercise.sets : [])
    .filter((s) => s.completed)
    .map(readSet)
    .filter((s) => s.reps > 0);

  if (!sets.length) return null;

  // Top set = heaviest; ties broken by reps, so 60kg x 10 beats 60kg x 8.
  const topSet = sets.reduce((best, s) => {
    if (s.weight > best.weight) return s;
    if (s.weight === best.weight && s.reps > best.reps) return s;
    return best;
  }, sets[0]);

  return {
    performedAt: performedAt.toISOString(),
    sessionName,
    sets,
    topSetWeight: topSet.weight,
    topSetReps: topSet.reps,
    totalReps: sets.reduce((a, s) => a + s.reps, 0),
    totalVolume: Math.round(sets.reduce((a, s) => a + s.reps * s.weight, 0)),
  };
};

/**
 * Last completed performance per exercise for a user.
 *
 * @param {string} userId
 * @param {string} [excludeSessionId] - current in-progress session, if any
 * @returns {Object} map of exercise name -> performance summary
 */
const getLastPerformance = async (userId, excludeSessionId) => {
  const sessions = await prisma.workoutSession.findMany({
    where: { userId, status: 'completed' },
    orderBy: { startedAt: 'desc' },
    take: SESSION_SCAN_LIMIT,
  });

  const lastByExercise = {};

  // Newest first — the first time an exercise appears is its latest outing.
  for (const session of sessions) {
    if (excludeSessionId && session.id === excludeSessionId) continue;

    const exercises = Array.isArray(session.exercises) ? session.exercises : [];
    const performedAt = new Date(session.completedAt || session.startedAt);

    for (const exercise of exercises) {
      const name = exercise.name;
      if (!name || lastByExercise[name]) continue;

      const summary = summariseExercise(exercise, performedAt, session.name);
      if (summary) lastByExercise[name] = summary;
    }
  }

  return lastByExercise;
};

module.exports = { getLastPerformance };
