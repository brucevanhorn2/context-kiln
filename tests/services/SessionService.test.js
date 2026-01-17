/**
 * Unit tests for SessionService
 */

const path = require('path');

// Mock uuid before importing SessionService
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

const SessionService = require('../../src/services/SessionService');

describe('SessionService', () => {
  let sessionService;
  let mockFileService;
  let mockDatabaseService;

  beforeEach(() => {
    // Create mock FileService
    mockFileService = {
      fileExists: jest.fn().mockResolvedValue(false),
      createDirectory: jest.fn().mockResolvedValue(),
      writeFile: jest.fn().mockResolvedValue(),
      readFile: jest.fn(),
      appendFile: jest.fn().mockResolvedValue(),
      listFiles: jest.fn().mockResolvedValue([]),
    };

    // Create mock DatabaseService
    mockDatabaseService = {
      createSession: jest.fn().mockReturnValue({
        id: 1,
        uuid: 'test-uuid-1234',
        name: 'Test Session',
        project_id: 1,
        folder_path: '.context-kiln/sessions/test-session',
      }),
      getSessionByUuid: jest.fn(),
      updateSessionAccessed: jest.fn(),
      getProjectSessions: jest.fn().mockReturnValue([]),
      renameSession: jest.fn(),
      archiveSession: jest.fn(),
      getSessionUsage: jest.fn().mockReturnValue({
        call_count: 5,
        total_input_tokens: 1000,
        total_output_tokens: 2000,
      }),
    };

    sessionService = new SessionService(mockFileService, mockDatabaseService);
  });

  describe('constructor', () => {
    it('should initialize with dependencies', () => {
      expect(sessionService.fileService).toBe(mockFileService);
      expect(sessionService.databaseService).toBe(mockDatabaseService);
    });
  });

  describe('_sanitizeFolderName', () => {
    it('should convert to lowercase', () => {
      expect(sessionService._sanitizeFolderName('TestSession')).toBe('testsession');
    });

    it('should replace spaces and special chars with hyphens', () => {
      expect(sessionService._sanitizeFolderName('My Test Session!')).toBe('my-test-session');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(sessionService._sanitizeFolderName('---test---')).toBe('test');
    });

    it('should limit length to 100 characters', () => {
      const longName = 'a'.repeat(150);
      expect(sessionService._sanitizeFolderName(longName).length).toBe(100);
    });
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const result = await sessionService.createSession('/project', 'Test Session', 1);

      expect(result.uuid).toBe('test-uuid-1234');
      expect(result.name).toBe('Test Session');
      expect(result.folderName).toBe('test-session');
      expect(result.projectId).toBe(1);
    });

    it('should create session directory structure', async () => {
      await sessionService.createSession('/project', 'Test Session', 1);

      expect(mockFileService.createDirectory).toHaveBeenCalledWith(
        expect.stringContaining('.context-kiln/sessions/test-session')
      );
    });

    it('should throw error if session folder exists', async () => {
      mockFileService.fileExists.mockResolvedValue(true);

      await expect(
        sessionService.createSession('/project', 'Test Session', 1)
      ).rejects.toThrow(/Session folder already exists/);
    });
  });

  describe('loadSession', () => {
    beforeEach(() => {
      mockDatabaseService.getSessionByUuid.mockReturnValue({
        id: 1,
        uuid: 'test-uuid-1234',
        name: 'Test Session',
        folder_path: '.context-kiln/sessions/test-session',
        project_id: 1,
      });

      mockFileService.readFile.mockResolvedValue(JSON.stringify({
        uuid: 'test-uuid-1234',
        name: 'Test Session',
      }));
    });

    it('should load session by UUID', async () => {
      const session = await sessionService.loadSession('test-uuid-1234', '/project');

      expect(session.uuid).toBe('test-uuid-1234');
      expect(session.folderPath).toBe('/project/.context-kiln/sessions/test-session');
    });

    it('should throw error if session not found', async () => {
      mockDatabaseService.getSessionByUuid.mockReturnValue(null);

      await expect(
        sessionService.loadSession('non-existent', '/project')
      ).rejects.toThrow(/Session not found/);
    });
  });

  describe('getSessions', () => {
    it('should return sessions for project', () => {
      const mockSessions = [{ uuid: 'session-1' }];
      mockDatabaseService.getProjectSessions.mockReturnValue(mockSessions);

      const sessions = sessionService.getSessions(1);

      expect(sessions).toEqual(mockSessions);
    });
  });

  describe('archiveSession', () => {
    it('should archive session in database', () => {
      sessionService.archiveSession('test-uuid-1234');

      expect(mockDatabaseService.archiveSession).toHaveBeenCalledWith('test-uuid-1234');
    });
  });

  describe('getSessionStatistics', () => {
    it('should return session statistics', () => {
      const stats = sessionService.getSessionStatistics('test-uuid-1234');

      expect(stats.call_count).toBe(5);
      expect(mockDatabaseService.getSessionUsage).toHaveBeenCalledWith('test-uuid-1234');
    });
  });
});
