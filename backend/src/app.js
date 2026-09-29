const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// ===================
// Security Middleware
// ===================
app.use(helmet());
app.use(cors({
  origin: config.isProduction
    ? config.clientUrl
    : true, // allow any origin in development (for LAN/hotspot access)
  credentials: true,
}));

// Rate limiting.
// Errors use the same { success, error: { message } } shape as everything else,
// so the client can surface a real reason instead of a generic failure.
const WINDOW_MS = 15 * 60 * 1000;

const limitHandler = (req, res) => {
  const retryAfterSeconds = Math.ceil(WINDOW_MS / 1000);
  res.set('Retry-After', String(retryAfterSeconds));
  res.status(429).json({
    success: false,
    error: {
      message: 'Too many requests. Please wait a few minutes and try again.',
    },
  });
};

// General API traffic. A single dashboard load makes several calls, so this
// has to be well above the old 100 or ordinary use trips it.
const limiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
  // Health checks are cheap and used by uptime monitors; don't spend budget.
  skip: (req) => req.path === '/health',
});

// Credentials endpoints stay tight — this is brute-force protection, not
// capacity protection, and it should not scale with normal browsing.
const authLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// ===================
// Body Parsing
// ===================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ===================
// Logging
// ===================
if (!config.isProduction) {
  app.use(morgan('dev'));
}

// ===================
// Routes
// ===================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// API routes
const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');
const workoutRoutes = require('./routes/workout.routes');
const dietRoutes = require('./routes/diet.routes');
const subscriptionRoutes = require('./routes/subscription.routes');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/diet', dietRoutes);
app.use('/api/subscription', subscriptionRoutes);

// ===================
// Error Handling
// ===================
app.use(notFound);
app.use(errorHandler);

module.exports = app;
