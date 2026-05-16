const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // CORS
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',

  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY,

  // Razorpay
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
};

// Validate critical config in production
if (config.isProduction) {
  const required = ['jwt.secret', 'databaseUrl'];
  for (const key of required) {
    const value = key.split('.').reduce((obj, k) => obj?.[k], config);
    if (!value) {
      throw new Error(`Missing required config: ${key}`);
    }
  }
}

module.exports = config;
