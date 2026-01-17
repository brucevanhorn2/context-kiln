const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * LogService - Centralized logging for Context Kiln
 *
 * Features:
 * - Writes to rotating log files
 * - Console output in dev mode
 * - Log levels: debug, info, warn, error
 * - Timestamps on all entries
 * - Works from main process and renderer (via IPC)
 *
 * Log files are stored in the app's userData directory:
 * - Linux: ~/.config/context-kiln/logs/
 * - macOS: ~/Library/Application Support/context-kiln/logs/
 * - Windows: %APPDATA%/context-kiln/logs/
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class LogService {
  constructor() {
    this.logDir = null;
    this.logFile = null;
    this.logStream = null;
    this.currentLevel = LOG_LEVELS.debug; // Log everything by default
    this.isDev = process.env.NODE_ENV !== 'production';
    this.maxFileSize = 5 * 1024 * 1024; // 5MB before rotation
    this.maxFiles = 5; // Keep 5 old log files
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

      // Create log file with date
      const date = new Date().toISOString().split('T')[0];
      this.logFile = path.join(this.logDir, `context-kiln-${date}.log`);

      // Open write stream (append mode)
      this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' });

      // Log startup
      this.info('LogService', '='.repeat(60));
      this.info('LogService', `Log started at ${new Date().toISOString()}`);
      this.info('LogService', `Log file: ${this.logFile}`);
      this.info('LogService', `Dev mode: ${this.isDev}`);
      this.info('LogService', '='.repeat(60));

      // Rotate old logs
      this._rotateLogsIfNeeded();

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
    if (LOG_LEVELS[level] !== undefined) {
      this.currentLevel = LOG_LEVELS[level];
      this.info('LogService', `Log level set to: ${level}`);
    }
  }

  /**
   * Format a log message
   * @private
   */
  _format(level, source, message, data) {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    const sourceStr = source.padEnd(20);

    let line = `[${timestamp}] ${levelStr} [${sourceStr}] ${message}`;

    if (data !== undefined) {
      if (typeof data === 'object') {
        try {
          line += ' ' + JSON.stringify(data);
        } catch (e) {
          line += ' [Object - cannot stringify]';
        }
      } else {
        line += ' ' + String(data);
      }
    }

    return line;
  }

  /**
   * Write a log entry
   * @private
   */
  _write(level, source, message, data) {
    if (LOG_LEVELS[level] < this.currentLevel) {
      return; // Skip if below current level
    }

    const line = this._format(level, source, message, data);

    // Write to file
    if (this.logStream) {
      this.logStream.write(line + '\n');
    }

    // Also write to console in dev mode
    if (this.isDev) {
      const consoleMethod = level === 'error' ? console.error :
                           level === 'warn' ? console.warn :
                           level === 'debug' ? console.debug :
                           console.log;
      consoleMethod(line);
    }
  }

  /**
   * Log a debug message
   */
  debug(source, message, data) {
    this._write('debug', source, message, data);
  }

  /**
   * Log an info message
   */
  info(source, message, data) {
    this._write('info', source, message, data);
  }

  /**
   * Log a warning
   */
  warn(source, message, data) {
    this._write('warn', source, message, data);
  }

  /**
   * Log an error
   */
  error(source, message, data) {
    this._write('error', source, message, data);
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
   * Rotate log files if current file is too large
   * @private
   */
  _rotateLogsIfNeeded() {
    try {
      if (!this.logFile || !fs.existsSync(this.logFile)) {
        return;
      }

      const stats = fs.statSync(this.logFile);
      if (stats.size < this.maxFileSize) {
        return;
      }

      // Close current stream
      if (this.logStream) {
        this.logStream.end();
      }

      // Rotate existing files
      for (let i = this.maxFiles - 1; i >= 1; i--) {
        const oldFile = `${this.logFile}.${i}`;
        const newFile = `${this.logFile}.${i + 1}`;
        if (fs.existsSync(oldFile)) {
          if (i === this.maxFiles - 1) {
            fs.unlinkSync(oldFile); // Delete oldest
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }

      // Rename current file
      fs.renameSync(this.logFile, `${this.logFile}.1`);

      // Create new stream
      this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' });
      this.info('LogService', 'Log file rotated');
    } catch (error) {
      console.error('Failed to rotate logs:', error);
    }
  }

  /**
   * Clean up old log files
   */
  cleanup() {
    try {
      if (!this.logDir || !fs.existsSync(this.logDir)) {
        return;
      }

      const files = fs.readdirSync(this.logDir);
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      for (const file of files) {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          this.info('LogService', `Deleted old log file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup logs:', error);
    }
  }

  /**
   * Close the log service
   */
  close() {
    if (this.logStream) {
      this.info('LogService', 'Log service closing');
      this.logStream.end();
      this.logStream = null;
    }
  }
}

// Export singleton instance
module.exports = new LogService();
