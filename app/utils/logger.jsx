/**
 * Logs a message with a timestamp and optional log level.
 * @param {string} message - The message to be logged.
 * @param {string} [level='INFO'] - Log level (e.g., INFO, WARN, ERROR).
 */
export const log = (message, level = 'INFO') => {
  // if (process.env.NODE_ENV !== 'production') { // Logs only in non-production environments
  console.log(`[${level}]`, message)
  // }
}