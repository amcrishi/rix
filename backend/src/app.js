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

// Rate limiting - 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

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

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/diet', dietRoutes);

// ===================
// Error Handling
// ===================
app.use(notFound);
app.use(errorHandler);

module.exports = app;
