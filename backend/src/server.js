const app = require('./app');
const config = require('./config');

const PORT = config.port;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   AI Fitness Trainer API                 ║
  ║   Running on port ${PORT}                    ║
  ║   Environment: ${config.nodeEnv.padEnd(20)}║
  ╚══════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});
