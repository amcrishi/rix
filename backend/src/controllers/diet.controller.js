/**
 * Diet Controller.
 * Handles meal logging, daily summaries, and CRUD for meal logs.
 */

const { asyncHandler } = require('../utils/asyncHandler');
const prisma = require('../config/database');

/**
 * GET /api/diet/logs
 * Fetch meal logs for authenticated user.
 * Query params: date (YYYY-MM-DD), limit (default 50)
 */
const getMealLogs = asyncHandler(async (req, res) => {
  const { date, limit = 50 } = req.query;
  const userId = req.user.id;

  const where = { userId };
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where.loggedAt = { gte: start, lte: end };
  }

  const logs = await prisma.mealLog.findMany({
    where,
    orderBy: { loggedAt: 'desc' },
    take: parseInt(limit),
  });

  // Daily summary
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayLogs = await prisma.mealLog.findMany({
    where: { userId, loggedAt: { gte: today, lte: todayEnd } },
  });

  const summary = {
    totalCalories: todayLogs.reduce((sum, l) => sum + l.calories, 0),
    totalProtein: todayLogs.reduce((sum, l) => sum + (l.protein || 0), 0),
    totalCarbs: todayLogs.reduce((sum, l) => sum + (l.carbs || 0), 0),
    totalFat: todayLogs.reduce((sum, l) => sum + (l.fat || 0), 0),
    mealCount: todayLogs.length,
    byMealType: {
      breakfast: todayLogs.filter(l => l.mealType === 'breakfast').reduce((s, l) => s + l.calories, 0),
      lunch: todayLogs.filter(l => l.mealType === 'lunch').reduce((s, l) => s + l.calories, 0),
      dinner: todayLogs.filter(l => l.mealType === 'dinner').reduce((s, l) => s + l.calories, 0),
      snack: todayLogs.filter(l => l.mealType === 'snack').reduce((s, l) => s + l.calories, 0),
    },
  };

  res.json({ success: true, data: { logs, summary } });
});

/**
 * POST /api/diet/logs
 * Log a new meal.
 */
const createMealLog = asyncHandler(async (req, res) => {
  const { mealType, foodName, calories, protein, carbs, fat, quantity, unit } = req.body;

  if (!mealType || !foodName || calories === undefined) {
    return res.status(400).json({
      success: false,
      error: { message: 'mealType, foodName, and calories are required.' },
    });
  }

  const log = await prisma.mealLog.create({
    data: {
      userId: req.user.id,
      mealType,
      foodName,
      calories: parseInt(calories),
      protein: protein ? parseFloat(protein) : null,
      carbs: carbs ? parseFloat(carbs) : null,
      fat: fat ? parseFloat(fat) : null,
      quantity: quantity ? parseFloat(quantity) : null,
      unit: unit || null,
    },
  });

  res.status(201).json({ success: true, data: { log }, message: 'Meal logged successfully.' });
});

/**
 * DELETE /api/diet/logs/:id
 * Delete a meal log.
 */
const deleteMealLog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const log = await prisma.mealLog.findFirst({ where: { id, userId } });
  if (!log) {
    return res.status(404).json({ success: false, error: { message: 'Meal log not found.' } });
  }

  await prisma.mealLog.delete({ where: { id } });
  res.json({ success: true, message: 'Meal log deleted.' });
});

/**
 * GET /api/diet/summary
 * Get weekly calorie summary.
 */
const getWeeklySummary = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const logs = await prisma.mealLog.findMany({
    where: { userId, loggedAt: { gte: weekAgo } },
    orderBy: { loggedAt: 'asc' },
  });

  // Group by date
  const daily = {};
  logs.forEach(l => {
    const day = new Date(l.loggedAt).toISOString().split('T')[0];
    if (!daily[day]) daily[day] = { calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 };
    daily[day].calories += l.calories;
    daily[day].protein += l.protein || 0;
    daily[day].carbs += l.carbs || 0;
    daily[day].fat += l.fat || 0;
    daily[day].meals += 1;
  });

  res.json({ success: true, data: { daily, totalLogs: logs.length } });
});

module.exports = { getMealLogs, createMealLog, deleteMealLog, getWeeklySummary };
