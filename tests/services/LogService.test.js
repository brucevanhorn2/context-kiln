/**
 * Unit tests for LogService
 * 
 * Note: These tests use actual file system operations since LogService
 * is a singleton that manages file streams. Each test gets a unique
 * directory to avoid conflicts.
 */

const path = require('path');
const fsModule = require('fs');

// Track test instance count for unique directories
let testInstanceCount = 0;
let currentTestDir;

// We need to get a fresh LogService for each test
// since it's exported as a singleton
let LogService;

describe('LogService', () => {
  let logService;

  beforeEach(() => {
    // Create unique test directory for this test instance
    testInstanceCount++;
    currentTestDir = path.join(global.TEST_DIR, 'log-test-' + testInstanceCount);
    if (!fsModule.existsSync(currentTestDir)) {
      fsModule.mkdirSync(currentTestDir, { recursive: true });
    }

    // Clear the module cache to get a fresh instance
    jest.resetModules();

    // Re-mock electron with unique directory
    jest.doMock('electron', () => ({
      app: {
        getPath: jest.fn(() => currentTestDir),
      },
    }));

    // Get fresh LogService
    LogService = require('../../src/services/LogService');
    logService = LogService;
  });

  afterEach(async () => {
    // Give streams time to close properly
    if (logService && logService.logStream) {
      logService.close();
      // Wait a bit for stream to finish
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(logService.logDir).toBeNull();
      expect(logService.logFile).toBeNull();
      expect(logService.logStream).toBeNull();
      expect(logService.maxFileSize).toBe(5 * 1024 * 1024);
      expect(logService.maxFiles).toBe(5);
    });
  });

  describe('setLevel', () => {
    it('should set debug level', () => {
      logService.currentLevel = 1; // Start at info
      logService.logStream = { write: jest.fn(), end: jest.fn() };
      logService.setLevel('debug');
      expect(logService.currentLevel).toBe(0);
    });

    it('should set info level', () => {
      logService.logStream = { write: jest.fn(), end: jest.fn() }; logService.setLevel('info');
      expect(logService.currentLevel).toBe(1);
    });

    it('should set warn level', () => {
      logService.logStream = { write: jest.fn(), end: jest.fn() }; logService.setLevel('warn');
      expect(logService.currentLevel).toBe(2);
    });

    it('should set error level', () => {
      logService.logStream = { write: jest.fn(), end: jest.fn() }; logService.setLevel('error');
      expect(logService.currentLevel).toBe(3);
    });

    it('should ignore invalid level', () => {
      const originalLevel = logService.currentLevel;
      logService.setLevel('invalid');
      expect(logService.currentLevel).toBe(originalLevel);
    });
  });

  describe('_format', () => {
    it('should format basic message', () => {
      const line = logService._format('info', 'Test', 'Hello');

      expect(line).toContain('INFO');
      expect(line).toContain('Test');
      expect(line).toContain('Hello');
    });

    it('should include timestamp', () => {
      const line = logService._format('info', 'Test', 'Hello');

      // Should contain ISO timestamp format (YYYY-MM-DDTHH:MM:SS)
      expect(line).toMatch(/[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/);
    });

    it('should include data object', () => {
      const line = logService._format('info', 'Test', 'Hello', { foo: 'bar' });

      expect(line).toContain('{"foo":"bar"}');
    });

    it('should handle non-object data', () => {
      const line = logService._format('info', 'Test', 'Hello', 42);

      expect(line).toContain('42');
    });

    it('should handle circular references gracefully', () => {
      const circular = {};
      circular.self = circular;
      
      const line = logService._format('info', 'Test', 'Hello', circular);
      
      expect(line).toContain('[Object - cannot stringify]');
    });
  });

  describe('_write with mock stream', () => {
    let mockStream;

    beforeEach(() => {
      mockStream = { write: jest.fn(), end: jest.fn() };
      logService.logStream = mockStream;
    });

    it('should write to log stream', () => {
      logService.info('Test', 'Hello');
      expect(mockStream.write).toHaveBeenCalledWith(expect.stringContaining('Hello'));
    });

    it('should respect log level', () => {
      // setLevel('error') sets currentLevel to 3, then tries to log at info level (1)
      // which is filtered out, so nothing is written
      logService.setLevel('error');

      logService.debug('Test', 'Debug');
      logService.info('Test', 'Info');
      logService.warn('Test', 'Warn');

      // Nothing should have been written (all filtered including setLevel's info call)
      expect(mockStream.write).toHaveBeenCalledTimes(0);

      // Error should be logged (level 3 >= currentLevel 3)
      logService.error('Test', 'Error');
      expect(mockStream.write).toHaveBeenCalledTimes(1);
    });
  });

  describe('logging methods with mock stream', () => {
    let mockStream;

    beforeEach(() => {
      mockStream = { write: jest.fn(), end: jest.fn() };
      logService.logStream = mockStream;
      logService.isDev = false; // Disable console output
    });

    it('should log debug messages', () => {
      logService.debug('Test', 'Debug message');
      expect(mockStream.write).toHaveBeenCalled();
      expect(mockStream.write.mock.calls[0][0]).toContain('DEBUG');
    });

    it('should log info messages', () => {
      logService.info('Test', 'Info message');
      expect(mockStream.write).toHaveBeenCalled();
      expect(mockStream.write.mock.calls[0][0]).toContain('INFO');
    });

    it('should log warn messages', () => {
      logService.warn('Test', 'Warn message');
      expect(mockStream.write).toHaveBeenCalled();
      expect(mockStream.write.mock.calls[0][0]).toContain('WARN');
    });

    it('should log error messages', () => {
      logService.error('Test', 'Error message');
      expect(mockStream.write).toHaveBeenCalled();
      expect(mockStream.write.mock.calls[0][0]).toContain('ERROR');
    });
  });

  describe('getLogFilePath', () => {
    it('should return null before initialization', () => {
      expect(logService.getLogFilePath()).toBeNull();
    });

    it('should return log file path after setting', () => {
      logService.logFile = '/some/path/test.log';
      expect(logService.getLogFilePath()).toBe('/some/path/test.log');
    });
  });

  describe('getLogDir', () => {
    it('should return null before initialization', () => {
      expect(logService.getLogDir()).toBeNull();
    });

    it('should return log directory after setting', () => {
      logService.logDir = '/some/path/logs';
      expect(logService.getLogDir()).toBe('/some/path/logs');
    });
  });

  describe('getRecentLogs', () => {
    it('should return empty array when no log file', () => {
      expect(logService.getRecentLogs()).toEqual([]);
    });

    it('should return empty array when log file does not exist', () => {
      logService.logFile = '/nonexistent/file.log';
      expect(logService.getRecentLogs()).toEqual([]);
    });
  });

  describe('close', () => {
    it('should close log stream', () => {
      const mockEnd = jest.fn();
      logService.logStream = { 
        write: jest.fn(),
        end: mockEnd 
      };
      logService.isDev = false;

      logService.close();

      expect(mockEnd).toHaveBeenCalled();
      expect(logService.logStream).toBeNull();
    });

    it('should handle close when no stream', () => {
      logService.logStream = null;
      expect(() => logService.close()).not.toThrow();
    });

    it('should handle multiple close calls', () => {
      const mockEnd = jest.fn();
      logService.logStream = { 
        write: jest.fn(),
        end: mockEnd 
      };
      logService.isDev = false;

      logService.close();
      logService.close();

      expect(mockEnd).toHaveBeenCalledTimes(1);
    });
  });

  // Integration test with real file I/O - run last
  describe('initialize (integration)', () => {
    it('should create log directory and file', async () => {
      const logPath = logService.initialize();

      expect(logPath).not.toBeNull();
      expect(logService.logDir).toContain('logs');
      expect(logService.logFile).toContain('context-kiln');
      
      // Verify directory was created
      expect(fsModule.existsSync(logService.logDir)).toBe(true);
    });

    it('should open write stream', async () => {
      logService.initialize();

      expect(logService.logStream).not.toBeNull();
      expect(typeof logService.logStream.write).toBe('function');
    });
  });
});
