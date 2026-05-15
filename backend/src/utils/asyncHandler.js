/**
 * Async handler wrapper to avoid try-catch in every controller.
 * Catches promise rejections and forwards to error handler.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { asyncHandler };
