/**
 * Workout Plan Routes.
 * All routes require authentication.
 */

const express = require('express');
const router = express.Router();
const {
  generatePlan,
  getActivePlan,
  getAllPlans,
  getPlanById,
  deletePlan,
  getWorkoutLogs,
  createWorkoutLog,
  startSession,
  updateSession,
  getSessions,
  getSessionById,
  logCardio,
  getCardioSessions,
} = require('../controllers/workout.controller');
const { generatePlanValidation, logWorkoutValidation } = require('../validators/workout.validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

// All workout routes require authentication
router.use(authenticate);

// ── Logs (keep before /:id) ──────────────────────────
router.get('/logs', getWorkoutLogs);
router.post('/logs', logWorkoutValidation, validate, createWorkoutLog);

// ── Sessions (live tracker) ──────────────────────────
router.get('/sessions', getSessions);
router.post('/sessions/start', startSession);
router.get('/sessions/:id', getSessionById);
router.patch('/sessions/:id', updateSession);

// ── Cardio ───────────────────────────────────────────
router.get('/cardio', getCardioSessions);
router.post('/cardio', logCardio);

// ── Plans ────────────────────────────────────────────
router.post('/generate', generatePlanValidation, validate, generatePlan);
router.get('/active', getActivePlan);
router.get('/', getAllPlans);
router.get('/:id', getPlanById);
router.delete('/:id', deletePlan);

module.exports = router;
