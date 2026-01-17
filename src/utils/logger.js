/**
 * Logger utility for renderer process
 *
 * Sends logs to main process which writes them to file.
 * Also outputs to console in development mode.
 *
 * Usage:
 *   import { log } from '../utils/logger';
 *   log.info('MyComponent', 'Something happened', { extra: 'data' });
 */

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Create a scoped logger for a specific component/module
 * @param {string} source - The source name (e.g., 'FileTree', 'EditorContext')
 * @returns {object} Logger with debug, info, warn, error methods
 */
export function createLogger(source) {
  return {
    debug: (message, data) => log.debug(source, message, data),
    info: (message, data) => log.info(source, message, data),
    warn: (message, data) => log.warn(source, message, data),
    error: (message, data) => log.error(source, message, data),
  };
}

/**
 * Main logger object
 */
export const log = {
  /**
   * Log a debug message
   */
  debug(source, message, data) {
    if (isDev) {
      console.debug(`[${source}] ${message}`, data !== undefined ? data : '');
    }
    if (window.electron?.log) {
      window.electron.log.debug(source, message, data);
    }
  },

  /**
   * Log an info message
   */
  info(source, message, data) {
    if (isDev) {
      console.log(`[${source}] ${message}`, data !== undefined ? data : '');
    }
    if (window.electron?.log) {
      window.electron.log.info(source, message, data);
    }
  },

  /**
   * Log a warning
   */
  warn(source, message, data) {
    if (isDev) {
      console.warn(`[${source}] ${message}`, data !== undefined ? data : '');
    }
    if (window.electron?.log) {
      window.electron.log.warn(source, message, data);
    }
  },

  /**
   * Log an error
   */
  error(source, message, data) {
    // Always log errors to console
    console.error(`[${source}] ${message}`, data !== undefined ? data : '');
    if (window.electron?.log) {
      window.electron.log.error(source, message, data);
    }
  },

  /**
   * Get recent log entries from file
   * @param {number} lines - Number of lines to retrieve
   * @returns {Promise<string[]>} Array of log lines
   */
  async getRecent(lines = 100) {
    if (window.electron?.log) {
      return window.electron.log.getRecent(lines);
    }
    return [];
  },

  /**
   * Get the log file path
   * @returns {Promise<string>} Path to current log file
   */
  async getPath() {
    if (window.electron?.log) {
      return window.electron.log.getPath();
    }
    return null;
  },
};

export default log;
