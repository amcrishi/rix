/**
 * Workout Plan Controller.
 * Handles HTTP request/response for workout plan endpoints.
 */

const { asyncHandler } = require('../utils/asyncHandler');
const workoutService = require('../services/workout.service');
const repStatsService = require('../services/repStats.service');
const progressionService = require('../services/progression.service');
const schedule = require('../services/schedule.service');
const prisma = require('../config/database');

/**
 * POST /api/workouts/generate
 * Generate a new workout plan.
 * Accepts optional `useAI: true/false` to control generation strategy.
 */
const generatePlan = asyncHandler(async (req, res) => {
  const { fitnessGoal, experienceLevel, daysPerWeek, name, useAI } = req.body;

  const plan = await workoutService.createWorkoutPlan(req.user.id, {
    fitnessGoal,
    experienceLevel,
    daysPerWeek: parseInt(daysPerWeek),
    name,
    useAI: useAI !== false, // Default to true, explicitly pass false to use rule-based
    profile: req.body.profile || {},
  });

  res.status(201).json({
    success: true,
    data: { plan },
    message: `Workout plan generated successfully (${plan.generatedBy === 'ai' ? '🤖 AI' : '📋 Rule-based'}).`,
  });
});

/**
 * GET /api/workouts/active
 * Get the user's currently active workout plan.
 */
const getActivePlan = asyncHandler(async (req, res) => {
  const plan = await workoutService.getActivePlan(req.user.id);

  if (!plan) {
    return res.status(200).json({
      success: true,
      data: { plan: null },
      message: 'No active workout plan. Generate one to get started!',
    });
  }

  res.status(200).json({
    success: true,
    data: { plan },
  });
});

/**
 * GET /api/workouts
 * Get all workout plans for the user (paginated).
 */
const getAllPlans = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const result = await workoutService.getUserPlans(req.user.id, { page, limit });

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/workouts/:id
 * Get a specific workout plan by ID.
 */
const getPlanById = asyncHandler(async (req, res) => {
  const plan = await workoutService.getPlanById(req.user.id, req.params.id);

  res.status(200).json({
    success: true,
    data: { plan },
  });
});

/**
 * DELETE /api/workouts/:id
 * Delete a workout plan.
 */
const deletePlan = asyncHandler(async (req, res) => {
  const result = await workoutService.deletePlan(req.user.id, req.params.id);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/workouts/logs
 * Get paginated workout logs for the user, with weekly stats.
 */
const getWorkoutLogs = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.workoutLog.findMany({
      where: { userId: req.user.id },
      orderBy: { loggedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.workoutLog.count({ where: { userId: req.user.id } }),
  ]);

  // Calculate unique workout days this week
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const logsThisWeek = await prisma.workoutLog.findMany({
    where: { userId: req.user.id, loggedAt: { gte: startOfWeek } },
    select: { loggedAt: true },
  });
  const uniqueDaysThisWeek = new Set(logsThisWeek.map((l) => l.loggedAt.toDateString())).size;

  res.json({
    success: true,
    data: {
      logs,
      total,
      page,
      workoutsThisWeek: uniqueDaysThisWeek,
      totalWorkouts: total,
    },
  });
});

/**
 * POST /api/workouts/logs
 * Log a completed exercise.
 */
const createWorkoutLog = asyncHandler(async (req, res) => {
  const { exercise, sets, reps, weight, duration, notes } = req.body;

  const log = await prisma.workoutLog.create({
    data: {
      userId: req.user.id,
      exercise,
      sets: parseInt(sets),
      reps: parseInt(reps) || 0,
      weight: weight ? parseFloat(weight) : null,
      duration: duration ? parseInt(duration) : null,
      notes: notes || null,
    },
  });

  res.status(201).json({ success: true, data: { log } });
});


// ─────────────────────────────────────────────
// WORKOUT SESSIONS (Live Tracker)
// ─────────────────────────────────────────────

/**
 * POST /api/workouts/sessions/start
 * Start a new workout session. Body: { planId?, planDayIndex?, name, exercises }
 */
const startSession = asyncHandler(async (req, res) => {
  const { planId, planDayIndex, name, exercises, tzOffsetMinutes } = req.body;

  // A day scheduled for later in the week cannot be started early. Enforced
  // here as well as in the UI, since the client check is bypassable.
  if (planId && planDayIndex != null) {
    const plan = await prisma.workoutPlan.findFirst({
      where: { id: planId, userId: req.user.id },
    });

    if (plan) {
      const options = {
        anchorIso: plan.planData?.weekAnchor,
        tzOffsetMinutes: Number.isFinite(tzOffsetMinutes) ? tzOffsetMinutes : 0,
      };
      const dayIndex = parseInt(planDayIndex, 10);

      if (!schedule.canStartDay(dayIndex, options)) {
        const scheduledFor = schedule.planDayDate(dayIndex, options);
        return res.status(403).json({
          success: false,
          error: {
            message: `This workout is scheduled for ${scheduledFor.toISOString().slice(0, 10)}. You can view it now, but it can only be started on the day.`,
          },
        });
      }
    }
  }

  const session = await prisma.workoutSession.create({
    data: {
      userId: req.user.id,
      planId: planId || null,
      planDayIndex: planDayIndex != null ? parseInt(planDayIndex) : null,
      name: name || 'Workout Session',
      status: 'in_progress',
      exercises: exercises || [],
    },
  });

  res.status(201).json({ success: true, data: { session } });
});

/**
 * PATCH /api/workouts/sessions/:id
 * Update session — save exercise progress or mark complete.
 * Body: { exercises?, status?, notes?, totalDuration? }
 */
const updateSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { exercises, status, notes, totalDuration, pausedMs } = req.body;

  const existing = await prisma.workoutSession.findFirst({
    where: { id, userId: req.user.id },
  });
  if (!existing) return res.status(404).json({ success: false, message: 'Session not found' });

  const updateData = {};
  if (exercises !== undefined) updateData.exercises = exercises;
  if (notes !== undefined) updateData.notes = notes;
  if (totalDuration !== undefined) updateData.totalDuration = parseInt(totalDuration);
  if (pausedMs !== undefined) updateData.pausedMs = Math.max(0, parseInt(pausedMs) || 0);
  if (status === 'completed') {
    updateData.status = 'completed';
    updateData.completedAt = new Date();

    // Auto-create a WorkoutLog entry for the completed session (backwards compat)
    const exArr = exercises || existing.exercises || [];
    for (const ex of exArr) {
      const completedSets = (ex.sets || []).filter((s) => s.completed);
      if (!completedSets.length) continue;
      const avgWeight = completedSets.reduce((a, s) => a + (parseFloat(s.weight) || 0), 0) / completedSets.length;
      const avgReps = completedSets.reduce((a, s) => a + (parseInt(s.reps) || 0), 0) / completedSets.length;
      await prisma.workoutLog.create({
        data: {
          userId: req.user.id,
          exercise: ex.name,
          sets: completedSets.length,
          reps: Math.round(avgReps),
          weight: avgWeight > 0 ? avgWeight : null,
          notes: `Session: ${existing.name}`,
        },
      });
    }
  }

  const session = await prisma.workoutSession.update({
    where: { id },
    data: updateData,
  });

  res.json({ success: true, data: { session } });
});

/**
 * GET /api/workouts/sessions
 * List user's workout sessions (paginated).
 */
const getSessions = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const page = parseInt(req.query.page) || 1;

  const [sessions, total] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { userId: req.user.id },
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.workoutSession.count({ where: { userId: req.user.id } }),
  ]);

  res.json({ success: true, data: { sessions, total, page } });
});

/**
 * GET /api/workouts/sessions/active
 * The session still in progress, if any, so a workout survives navigating
 * away. Elapsed time is derived from startedAt rather than a client counter.
 */
const getActiveSession = asyncHandler(async (req, res) => {
  const session = await prisma.workoutSession.findFirst({
    where: { userId: req.user.id, status: 'in_progress' },
    orderBy: { startedAt: 'desc' },
  });
  res.json({ success: true, data: { session: session || null } });
});

/**
 * DELETE /api/workouts/sessions/:id
 * Discard a session. Used to abandon a workout started by mistake, which
 * would otherwise stay in progress and resume forever.
 */
const deleteSession = asyncHandler(async (req, res) => {
  const existing = await prisma.workoutSession.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!existing) {
    return res.status(404).json({ success: false, error: { message: 'Session not found' } });
  }

  await prisma.workoutSession.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: { message: 'Session discarded.' } });
});

/**
 * GET /api/workouts/sessions/:id
 * Get a specific session.
 */
const getSessionById = asyncHandler(async (req, res) => {
  const session = await prisma.workoutSession.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  res.json({ success: true, data: { session } });
});

/**
 * GET /api/workouts/stats/reps
 * Aggregated rep counts, volume and per-exercise breakdown.
 */
const getRepStats = asyncHandler(async (req, res) => {
  const stats = await repStatsService.getRepStats(req.user.id);
  res.json({ success: true, data: { stats } });
});

/**
 * GET /api/workouts/stats/last-performance
 * What the user did last time for each exercise — the numbers to beat.
 * Optional ?exclude=<sessionId> to ignore the session in progress.
 */
const getLastPerformance = asyncHandler(async (req, res) => {
  const lastPerformance = await progressionService.getLastPerformance(
    req.user.id,
    req.query.exclude
  );
  res.json({ success: true, data: { lastPerformance } });
});

/**
 * GET /api/workouts/stats/muscle-volume
 * Sets/reps/volume per muscle group over trailing 24h, 7d and 30d windows.
 */
const getMuscleBreakdown = asyncHandler(async (req, res) => {
  const breakdown = await repStatsService.getMuscleBreakdown(req.user.id);
  res.json({ success: true, data: breakdown });
});

/**
 * POST /api/workouts/active/restart-week
 * Re-anchor the active plan so Day 1 falls on today. Offered after a long
 * absence so a returning user can train immediately instead of waiting for
 * the calendar to come round.
 */
const restartWeek = asyncHandler(async (req, res) => {
  const { tzOffsetMinutes } = req.body || {};
  const offset = Number.isFinite(tzOffsetMinutes) ? tzOffsetMinutes : 0;

  const plan = await prisma.workoutPlan.findFirst({
    where: { userId: req.user.id, isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!plan) {
    return res.status(404).json({ success: false, error: { message: 'No active plan to restart.' } });
  }

  const today = schedule.startOfLocalDay(new Date(), offset).toISOString().slice(0, 10);

  const updated = await prisma.workoutPlan.update({
    where: { id: plan.id },
    data: { planData: { ...plan.planData, weekAnchor: today } },
  });

  res.json({ success: true, data: { plan: updated, weekAnchor: today } });
});

// ─────────────────────────────────────────────
// CARDIO SESSIONS
// ─────────────────────────────────────────────

/**
 * POST /api/workouts/cardio
 * Log a cardio session.
 */
const logCardio = asyncHandler(async (req, res) => {
  const { type, duration, distance, distanceUnit, intensity, caloriesBurned, heartRate, notes } = req.body;

  if (!type || !duration) {
    return res.status(400).json({ success: false, message: 'type and duration are required' });
  }

  const session = await prisma.cardioSession.create({
    data: {
      userId: req.user.id,
      type,
      duration: parseInt(duration),
      distance: distance ? parseFloat(distance) : null,
      distanceUnit: distanceUnit || 'km',
      intensity: intensity || 'moderate',
      caloriesBurned: caloriesBurned ? parseInt(caloriesBurned) : null,
      heartRate: heartRate ? parseInt(heartRate) : null,
      notes: notes || null,
    },
  });

  res.status(201).json({ success: true, data: { session } });
});

/**
 * GET /api/workouts/cardio
 * Get user's cardio sessions.
 */
const getCardioSessions = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const page = parseInt(req.query.page) || 1;

  const [sessions, total] = await Promise.all([
    prisma.cardioSession.findMany({
      where: { userId: req.user.id },
      orderBy: { loggedAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.cardioSession.count({ where: { userId: req.user.id } }),
  ]);

  res.json({ success: true, data: { sessions, total, page } });
});

module.exports = { generatePlan, getActivePlan, getAllPlans, getPlanById, deletePlan, getWorkoutLogs, createWorkoutLog, startSession, updateSession, getSessions, getSessionById, getActiveSession, deleteSession, getRepStats, getLastPerformance, getMuscleBreakdown, restartWeek, logCardio, getCardioSessions };
