const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const winston = require('winston');

/**
 * LogService - Centralized logging for Context Kiln (Winston-based)
 *
 * Features:
 * - Writes to rotating log files (Winston DailyRotateFile)
 * - Console output in dev mode
 * - Log levels: debug, info, warn, error
 * - Timestamps on all entries
 * - Works from main process and renderer (via IPC)
 * - Structured logging with metadata
 *
 * Log files are stored in the app's userData directory:
 * - Linux: ~/.config/context-kiln/logs/
 * - macOS: ~/Library/Application Support/context-kiln/logs/
 * - Windows: %APPDATA%/context-kiln/logs/
 */

class LogService {
  constructor() {
    this.logDir = null;
    this.logFile = null;
    this.logger = null;
    this.isDev = process.env.NODE_ENV !== 'production';
  }

  /**
   * Initialize the log service
   * Must be called after app is ready
   */
  initialize() {
    try {
      // Get user data directory
      const userDataPath = app.getPath('userData');
      this.logDir = path.join(userDataPath, 'logs');

      // Ensure log directory exists
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }

      // Create log file path (Winston will handle daily rotation)
      const date = new Date().toISOString().split('T')[0];
      this.logFile = path.join(this.logDir, `context-kiln-${date}.log`);

      // Custom format: [timestamp] LEVEL [source] message {metadata}
      const customFormat = winston.format.printf(({ timestamp, level, source, message, ...metadata }) => {
        const levelStr = level.toUpperCase().padEnd(5);
        const sourceStr = (source || 'Unknown').padEnd(20);
        let msg = `[${timestamp}] ${levelStr} [${sourceStr}] ${message}`;

        // Add metadata if present
        const metaKeys = Object.keys(metadata);
        if (metaKeys.length > 0 && metaKeys[0] !== 'level') {
          try {
            msg += ' ' + JSON.stringify(metadata);
          } catch (e) {
            msg += ' [Metadata - cannot stringify]';
          }
        }

        return msg;
      });

      // Create Winston logger
      const transports = [
        // File transport - daily rotation
        new winston.transports.File({
          filename: this.logFile,
          maxsize: 5 * 1024 * 1024, // 5MB
          maxFiles: 5,
          tailable: true,
        })
      ];

      // Add console transport in dev mode
      if (this.isDev) {
        transports.push(
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp({ format: 'HH:mm:ss' }),
              customFormat
            )
          })
        );
      }

      this.logger = winston.createLogger({
        level: 'debug',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          customFormat
        ),
        transports,
        // Don't exit on error
        exitOnError: false
      });

      // Log startup
      this.info('LogService', '='.repeat(60));
      this.info('LogService', `Log started at ${new Date().toISOString()}`);
      this.info('LogService', `Log directory: ${this.logDir}`);
      this.info('LogService', `Log file: ${this.logFile}`);
      this.info('LogService', `Dev mode: ${this.isDev}`);
      this.info('LogService', '='.repeat(60));

      // Clean up old log files (keep 7 days)
      this._cleanupOldLogs();

      return this.logFile;
    } catch (error) {
      console.error('Failed to initialize LogService:', error);
      return null;
    }
  }

  /**
   * Set minimum log level
   * @param {string} level - 'debug', 'info', 'warn', 'error'
   */
  setLevel(level) {
    if (this.logger) {
      this.logger.level = level;
      this.info('LogService', `Log level set to: ${level}`);
    }
  }

  /**
   * Log a debug message
   */
  debug(source, message, data) {
    if (this.logger) {
      this.logger.debug({ source, message, ...this._formatData(data) });
    }
  }

  /**
   * Log an info message
   */
  info(source, message, data) {
    if (this.logger) {
      this.logger.info({ source, message, ...this._formatData(data) });
    }
  }

  /**
   * Log a warning
   */
  warn(source, message, data) {
    if (this.logger) {
      this.logger.warn({ source, message, ...this._formatData(data) });
    }
  }

  /**
   * Log an error
   */
  error(source, message, data) {
    if (this.logger) {
      this.logger.error({ source, message, ...this._formatData(data) });
    }
  }

  /**
   * Format data for logging
   * @private
   */
  _formatData(data) {
    if (data === undefined) {
      return {};
    }
    if (typeof data === 'object' && data !== null) {
      return data;
    }
    return { data: String(data) };
  }

  /**
   * Get the current log file path
   */
  getLogFilePath() {
    return this.logFile;
  }

  /**
   * Get the log directory path
   */
  getLogDir() {
    return this.logDir;
  }

  /**
   * Read recent log entries
   * @param {number} lines - Number of lines to read (default 100)
   */
  getRecentLogs(lines = 100) {
    try {
      if (!this.logFile || !fs.existsSync(this.logFile)) {
        return [];
      }

      const content = fs.readFileSync(this.logFile, 'utf8');
      const allLines = content.split('\n').filter(line => line.trim());
      return allLines.slice(-lines);
    } catch (error) {
      console.error('Failed to read logs:', error);
      return [];
    }
  }

  /**
   * Clean up old log files (keep last 7 days)
   * @private
   */
  _cleanupOldLogs() {
    try {
      if (!this.logDir || !fs.existsSync(this.logDir)) {
        return;
      }

      const files = fs.readdirSync(this.logDir);
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      let deletedCount = 0;
      for (const file of files) {
        const filePath = path.join(this.logDir, file);
        try {
          const stats = fs.statSync(filePath);
          if (now - stats.mtime.getTime() > maxAge) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        } catch (err) {
          // Skip files we can't access
        }
      }

      if (deletedCount > 0) {
        this.info('LogService', `Cleaned up ${deletedCount} old log file(s)`);
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  /**
   * Clean up old log files (public method)
   */
  cleanup() {
    this._cleanupOldLogs();
  }

  /**
   * Close the log service
   */
  close() {
    if (this.logger) {
      this.info('LogService', 'Log service closing');
      this.logger.close();
      this.logger = null;
    }
  }
}

// Export singleton instance
module.exports = new LogService();
