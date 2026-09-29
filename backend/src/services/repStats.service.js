/**
 * Rep Stats Service.
 * Aggregates the per-set reps captured by the live session tracker into
 * totals, volume (weight x reps), per-exercise breakdowns and a weekly series.
 *
 * Sources:
 *   - WorkoutSession.exercises JSON — the authoritative per-set record.
 *   - WorkoutLog entries that were NOT auto-created from a session, so that
 *     manually logged workouts still count. Session-generated logs are skipped
 *     (they carry a "Session: ..." note) to avoid double counting.
 */

const prisma = require('../config/database');
const exerciseLibrary = require('./exercises.data');

const WEEKS_IN_SERIES = 6;
const SESSION_LOG_NOTE_PREFIX = 'Session: ';

// Trailing windows, so results never depend on the server's timezone.
const MUSCLE_WINDOWS = [
  { key: '24h', label: '24 Hours', days: 1 },
  { key: '7d', label: '7 Days', days: 7 },
  { key: '30d', label: '30 Days', days: 30 },
];

/**
 * Exercise name -> muscle group, built from the exercise library.
 * Used for manual logs, which carry no muscle group of their own.
 */
const MUSCLE_BY_EXERCISE = (() => {
  const map = {};
  for (const [group, list] of Object.entries(exerciseLibrary)) {
    for (const ex of list) map[ex.name.toLowerCase()] = group;
  }
  return map;
})();

/**
 * Resolve an exercise's muscle group, falling back to the library by name.
 * @param {string} name
 * @param {string} [explicit] - group recorded on the session exercise
 */
const resolveMuscleGroup = (name, explicit) =>
  explicit || MUSCLE_BY_EXERCISE[(name || '').toLowerCase()] || 'other';

/**
 * Start of the week (Sunday, local midnight) containing `date`.
 * @param {Date} date
 * @returns {Date}
 */
const startOfWeek = (date) => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Normalise one completed set into { reps, volume }.
 * Set fields arrive as strings from the tracker UI.
 * @param {Object} set
 */
const readSet = (set) => {
  const reps = parseInt(set.reps, 10) || 0;
  const weight = parseFloat(set.weight) || 0;
  return { reps, volume: reps * weight };
};

/**
 * Flatten every counted set across sessions and manual logs into a single
 * list of { name, muscleGroup, reps, volume, performedAt } entries.
 * @param {Array} sessions
 * @param {Array} logs
 */
const collectEntries = (sessions, logs) => {
  const entries = [];

  for (const session of sessions) {
    const exercises = Array.isArray(session.exercises) ? session.exercises : [];
    const performedAt = session.completedAt || session.startedAt;

    for (const ex of exercises) {
      const sets = Array.isArray(ex.sets) ? ex.sets : [];
      for (const set of sets) {
        if (!set.completed) continue;
        const { reps, volume } = readSet(set);
        if (reps <= 0) continue;
        entries.push({
          name: ex.name || 'Unknown exercise',
          muscleGroup: resolveMuscleGroup(ex.name, ex.muscleGroup),
          reps,
          volume,
          performedAt: set.completedAt ? new Date(set.completedAt) : new Date(performedAt),
        });
      }
    }
  }

  for (const log of logs) {
    // Logs written by the session tracker are already counted above.
    if (log.notes && log.notes.startsWith(SESSION_LOG_NOTE_PREFIX)) continue;
    const reps = log.reps || 0;
    const sets = log.sets || 0;
    if (reps <= 0 || sets <= 0) continue;
    // A manual log records `sets` sets of `reps` each — expand so set counts
    // and best-set figures stay comparable with tracker data.
    for (let i = 0; i < sets; i++) {
      entries.push({
        name: log.exercise,
        muscleGroup: resolveMuscleGroup(log.exercise),
        reps,
        volume: reps * (log.weight || 0),
        performedAt: new Date(log.loggedAt),
      });
    }
  }

  return entries;
};

/**
 * Build the per-exercise breakdown, heaviest rep count first.
 * @param {Array} entries
 */
const buildPerExercise = (entries) => {
  const byName = new Map();

  for (const entry of entries) {
    let row = byName.get(entry.name);
    if (!row) {
      row = {
        name: entry.name,
        muscleGroup: entry.muscleGroup,
        totalReps: 0,
        totalSets: 0,
        totalVolume: 0,
        bestSetReps: 0,
        lastPerformed: entry.performedAt,
      };
      byName.set(entry.name, row);
    }
    row.totalReps += entry.reps;
    row.totalSets += 1;
    row.totalVolume += entry.volume;
    if (entry.reps > row.bestSetReps) row.bestSetReps = entry.reps;
    if (entry.performedAt > row.lastPerformed) row.lastPerformed = entry.performedAt;
    if (!row.muscleGroup && entry.muscleGroup) row.muscleGroup = entry.muscleGroup;
  }

  return [...byName.values()]
    .map((row) => ({ ...row, totalVolume: Math.round(row.totalVolume) }))
    .sort((a, b) => b.totalReps - a.totalReps);
};

/**
 * Bucket entries into the last `WEEKS_IN_SERIES` weeks, oldest first.
 * @param {Array} entries
 */
const buildWeeklySeries = (entries) => {
  const thisWeek = startOfWeek(new Date());
  const weeks = [];

  for (let i = WEEKS_IN_SERIES - 1; i >= 0; i--) {
    const weekStart = new Date(thisWeek);
    weekStart.setDate(thisWeek.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    let reps = 0;
    let volume = 0;
    for (const entry of entries) {
      if (entry.performedAt >= weekStart && entry.performedAt < weekEnd) {
        reps += entry.reps;
        volume += entry.volume;
      }
    }

    weeks.push({
      weekStart: weekStart.toISOString(),
      label: i === 0 ? 'This Week' : `${i}w ago`,
      reps,
      volume: Math.round(volume),
    });
  }

  return weeks;
};

/**
 * Aggregate rep totals for a user.
 * @param {string} userId
 * @returns {Object} { totalReps, repsThisWeek, totalVolume, volumeThisWeek,
 *                     totalSets, bestSetReps, perExercise, weekly }
 */
const getRepStats = async (userId) => {
  const [sessions, logs] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { userId, status: 'completed' },
      orderBy: { startedAt: 'desc' },
    }),
    prisma.workoutLog.findMany({
      where: { userId },
      orderBy: { loggedAt: 'desc' },
    }),
  ]);

  const entries = collectEntries(sessions, logs);
  const weekStart = startOfWeek(new Date());

  let totalReps = 0;
  let totalVolume = 0;
  let repsThisWeek = 0;
  let volumeThisWeek = 0;
  let bestSetReps = 0;

  for (const entry of entries) {
    totalReps += entry.reps;
    totalVolume += entry.volume;
    if (entry.reps > bestSetReps) bestSetReps = entry.reps;
    if (entry.performedAt >= weekStart) {
      repsThisWeek += entry.reps;
      volumeThisWeek += entry.volume;
    }
  }

  return {
    totalReps,
    repsThisWeek,
    totalVolume: Math.round(totalVolume),
    volumeThisWeek: Math.round(volumeThisWeek),
    totalSets: entries.length,
    bestSetReps,
    perExercise: buildPerExercise(entries),
    weekly: buildWeeklySeries(entries),
  };
};

/**
 * Sets, reps and volume per muscle group over trailing windows.
 * Answers "what have I actually trained lately, and what am I neglecting?".
 *
 * @param {string} userId
 * @returns {Object} { windows: [{ key, label, days, totalSets, groups: [...] }] }
 */
const getMuscleBreakdown = async (userId) => {
  const [sessions, logs] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { userId, status: 'completed' },
      orderBy: { startedAt: 'desc' },
    }),
    prisma.workoutLog.findMany({
      where: { userId },
      orderBy: { loggedAt: 'desc' },
    }),
  ]);

  const entries = collectEntries(sessions, logs);
  const now = Date.now();

  const windows = MUSCLE_WINDOWS.map(({ key, label, days }) => {
    const cutoff = now - days * 86400000;
    const byGroup = new Map();
    let totalSets = 0;

    for (const entry of entries) {
      if (entry.performedAt.getTime() < cutoff) continue;

      const group = entry.muscleGroup || 'other';
      let row = byGroup.get(group);
      if (!row) {
        row = { muscleGroup: group, sets: 0, reps: 0, volume: 0, exercises: new Set() };
        byGroup.set(group, row);
      }
      row.sets += 1;
      row.reps += entry.reps;
      row.volume += entry.volume;
      row.exercises.add(entry.name);
      totalSets += 1;
    }

    const groups = [...byGroup.values()]
      .map((row) => ({
        muscleGroup: row.muscleGroup,
        sets: row.sets,
        reps: row.reps,
        volume: Math.round(row.volume),
        exercises: row.exercises.size,
      }))
      .sort((a, b) => b.sets - a.sets);

    return { key, label, days, totalSets, groups };
  });

  return { windows };
};

module.exports = { getRepStats, getMuscleBreakdown };
