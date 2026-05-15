/**
 * Diet Routes.
 * All routes are protected — require valid JWT.
 */

const express = require('express');
const router = express.Router();
const { getMealLogs, createMealLog, deleteMealLog, getWeeklySummary } = require('../controllers/diet.controller');
const { authenticate } = require('../middleware/auth');

// All diet routes require authentication
router.use(authenticate);

// GET /api/diet/logs — Fetch meal logs (optional ?date=YYYY-MM-DD)
router.get('/logs', getMealLogs);

// POST /api/diet/logs — Log a new meal
router.post('/logs', createMealLog);

// DELETE /api/diet/logs/:id — Delete a meal log
router.delete('/logs/:id', deleteMealLog);

// GET /api/diet/summary — Weekly calorie summary
router.get('/summary', getWeeklySummary);

module.exports = router;
