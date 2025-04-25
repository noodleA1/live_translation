/**
 * Logger utility for the Live Translation System
 */

/**
 * Log an info message
 * @param {string} message - Message to log
 * @param {Object} data - Additional data to log
 */
function info(message, data = {}) {
  console.log(`[INFO] ${message}`, data);
}

/**
 * Log an error message
 * @param {string} message - Error message to log
 * @param {Error|Object} error - Error object or additional data
 */
function error(message, error = {}) {
  console.error(`[ERROR] ${message}`, error);
}

/**
 * Log a debug message (only in development)
 * @param {string} message - Debug message to log
 * @param {Object} data - Additional data to log
 */
function debug(message, data = {}) {
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[DEBUG] ${message}`, data);
  }
}

module.exports = {
  info,
  error,
  debug
};