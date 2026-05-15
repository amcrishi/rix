/**
 * OpenAI Client Configuration.
 * Centralizes API client setup and retry logic.
 */

const OpenAI = require('openai');

let client = null;

/**
 * Get or create the OpenAI client instance.
 * Lazy initialization — only created when first needed.
 * @param {string} apiKey - OpenAI API key
 * @returns {OpenAI} Configured client
 */
function getClient(apiKey) {
  if (!client) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY in your environment.');
    }

    client = new OpenAI({
      apiKey,
      timeout: 60000, // 60s timeout for long generations
      maxRetries: 2,
    });
  }

  return client;
}

/**
 * Reset client (useful for testing or key rotation).
 */
function resetClient() {
  client = null;
}

module.exports = { getClient, resetClient };
