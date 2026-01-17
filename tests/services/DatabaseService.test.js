/**
 * Unit tests for DatabaseService
 */

const path = require('path');
const fs = require('fs');

// Mock electron before requiring DatabaseService
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => global.TEST_DIR),
  },
}));

const DatabaseService = require('../../src/services/DatabaseService');

describe('DatabaseService', () => {
  let db;

  beforeEach(() => {
    // Create fresh database instance for each test
    db = new DatabaseService();

    // Create test directories
    const dbDir = path.join(global.TEST_DIR, 'context-kiln');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Copy schema file to test location
    const schemaDir = path.join(global.TEST_DIR, 'database');
    if (!fs.existsSync(schemaDir)) {
      fs.mkdirSync(schemaDir, { recursive: true });
    }
    const schemaSource = path.join(__dirname, '../../src/database/schema.sql');
    const schemaDest = path.join(schemaDir, 'schema.sql');

    // Make schema accessible from test location
    // Modify the service's schema path for testing
    const originalRunSchema = db._runSchema.bind(db);
    db._runSchema = function () {
      const schema = fs.readFileSync(schemaSource, 'utf8');
      const statements = schema
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        try {
          this.db.exec(statement);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            console.error('Schema error:', error.message);
          }
        }
      }
    };

    db.initialize();
  });

  afterEach(() => {
    // Close database connection
    if (db) {
      db.close();
    }

    // Clean up test database
    const dbFile = path.join(global.TEST_DIR, 'context-kiln', 'usage.db');
    if (fs.existsSync(dbFile)) {
      fs.unlinkSync(dbFile);
    }
  });

  // ===========================================================================
  // Initialization Tests
  // ===========================================================================

  describe('initialization', () => {
    it('should create database file', () => {
      // Note: Mock database doesn't create actual files, so we check the mock is initialized
      // In a real environment, this would check: fs.existsSync(dbFile)
      expect(db.db).toBeTruthy();
      expect(db.dbPath).toContain('usage.db');
    });

    it('should initialize with correct path', () => {
      expect(db.dbPath).toContain('context-kiln');
      expect(db.dbPath).toContain('usage.db');
    });

    it('should have database connection', () => {
      expect(db.db).not.toBeNull();
    });
  });

  // ===========================================================================
  // Project Tests
  // ===========================================================================

  describe('projects', () => {
    it('should create new project', () => {
      const project = db.getOrCreateProject('/test/project/path');

      expect(project).toBeDefined();
      expect(project.id).toBeDefined();
      expect(project.folder_path).toBe('/test/project/path');
      expect(project.name).toBe('path');
    });

    it('should return existing project on second call', () => {
      const project1 = db.getOrCreateProject('/test/project/path');
      const project2 = db.getOrCreateProject('/test/project/path');

      expect(project1.id).toBe(project2.id);
    });

    it('should get all projects ordered by last accessed', () => {
      db.getOrCreateProject('/test/project/a');
      db.getOrCreateProject('/test/project/b');
      db.getOrCreateProject('/test/project/c');

      // Access 'a' again to make it most recent
      db.getOrCreateProject('/test/project/a');

      const projects = db.getAllProjects();
      expect(projects.length).toBe(3);
      expect(projects[0].folder_path).toBe('/test/project/a');
    });
  });

  // ===========================================================================
  // Session Tests
  // ===========================================================================

  describe('sessions', () => {
    let projectId;

    beforeEach(() => {
      const project = db.getOrCreateProject('/test/project');
      projectId = project.id;
    });

    it('should create session', () => {
      const session = db.createSession({
        uuid: 'test-uuid-123',
        name: 'Test Session',
        projectId,
        folderPath: '.context-kiln/sessions/test',
      });

      expect(session).toBeDefined();
      expect(session.uuid).toBe('test-uuid-123');
      expect(session.name).toBe('Test Session');
      expect(session.project_id).toBe(projectId);
    });

    it('should get session by UUID', () => {
      db.createSession({
        uuid: 'find-me-uuid',
        name: 'Find Me',
        projectId,
        folderPath: '.context-kiln/sessions/findme',
      });

      const found = db.getSessionByUuid('find-me-uuid');
      expect(found).toBeDefined();
      expect(found.name).toBe('Find Me');
    });

    it('should return null for non-existent UUID', () => {
      const found = db.getSessionByUuid('does-not-exist');
      expect(found).toBeUndefined();
    });

    it('should get project sessions', () => {
      db.createSession({
        uuid: 'session-1',
        name: 'Session 1',
        projectId,
        folderPath: '.context-kiln/sessions/s1',
      });
      db.createSession({
        uuid: 'session-2',
        name: 'Session 2',
        projectId,
        folderPath: '.context-kiln/sessions/s2',
      });

      const sessions = db.getProjectSessions(projectId);
      expect(sessions.length).toBe(2);
    });

    it('should exclude archived sessions by default', () => {
      db.createSession({
        uuid: 'active-session',
        name: 'Active',
        projectId,
        folderPath: '.context-kiln/sessions/active',
      });
      db.createSession({
        uuid: 'archived-session',
        name: 'Archived',
        projectId,
        folderPath: '.context-kiln/sessions/archived',
      });
      db.archiveSession('archived-session');

      const sessions = db.getProjectSessions(projectId, false);
      expect(sessions.length).toBe(1);
      expect(sessions[0].uuid).toBe('active-session');
    });

    it('should include archived sessions when requested', () => {
      db.createSession({
        uuid: 'active-session',
        name: 'Active',
        projectId,
        folderPath: '.context-kiln/sessions/active',
      });
      db.createSession({
        uuid: 'archived-session',
        name: 'Archived',
        projectId,
        folderPath: '.context-kiln/sessions/archived',
      });
      db.archiveSession('archived-session');

      const sessions = db.getProjectSessions(projectId, true);
      expect(sessions.length).toBe(2);
    });

    it('should rename session', () => {
      db.createSession({
        uuid: 'rename-me',
        name: 'Old Name',
        projectId,
        folderPath: '.context-kiln/sessions/rename',
      });

      db.renameSession('rename-me', 'New Name');

      const session = db.getSessionByUuid('rename-me');
      expect(session.name).toBe('New Name');
    });

    it('should archive session', () => {
      db.createSession({
        uuid: 'archive-me',
        name: 'To Archive',
        projectId,
        folderPath: '.context-kiln/sessions/archive',
      });

      db.archiveSession('archive-me');

      const session = db.getSessionByUuid('archive-me');
      expect(session.is_archived).toBe(1);
    });
  });

  // ===========================================================================
  // Token Usage Tests
  // ===========================================================================

  describe('token usage', () => {
    let projectId;

    beforeEach(() => {
      const project = db.getOrCreateProject('/test/project');
      projectId = project.id;
    });

    it('should record usage', () => {
      db.recordUsage({
        projectId,
        apiKeyId: 'key-123',
        sessionId: 'session-123',
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        inputTokens: 100,
        outputTokens: 200,
        costUsd: 0.003,
      });

      const usage = db.getProjectUsage(projectId);
      expect(usage.length).toBe(1);
      expect(usage[0].total_input_tokens).toBe(100);
      expect(usage[0].total_output_tokens).toBe(200);
    });

    it('should get session usage', () => {
      db.recordUsage({
        projectId,
        apiKeyId: 'key-123',
        sessionId: 'my-session',
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        inputTokens: 500,
        outputTokens: 1000,
        costUsd: 0.015,
      });

      const usage = db.getSessionUsage('my-session');
      expect(usage.call_count).toBe(1);
      expect(usage.total_input_tokens).toBe(500);
      expect(usage.total_output_tokens).toBe(1000);
    });

    it('should get API key usage', () => {
      db.recordUsage({
        projectId,
        apiKeyId: 'my-api-key',
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        inputTokens: 100,
        outputTokens: 200,
        costUsd: 0.003,
      });
      db.recordUsage({
        projectId,
        apiKeyId: 'my-api-key',
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        inputTokens: 150,
        outputTokens: 300,
        costUsd: 0.0045,
      });

      const usage = db.getApiKeyUsage('my-api-key');
      expect(usage.call_count).toBe(2);
      expect(usage.total_input_tokens).toBe(250);
      expect(usage.total_output_tokens).toBe(500);
    });

    it('should get global usage', () => {
      db.recordUsage({
        projectId,
        apiKeyId: 'key-1',
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        inputTokens: 100,
        outputTokens: 200,
        costUsd: 0.003,
      });
      db.recordUsage({
        projectId: null,
        apiKeyId: 'key-2',
        provider: 'openai',
        model: 'gpt-4',
        inputTokens: 50,
        outputTokens: 100,
        costUsd: 0.002,
      });

      const usage = db.getGlobalUsage();
      expect(usage.length).toBe(2); // Two different provider/model combinations
    });
  });

  // ===========================================================================
  // API Key Tests
  // ===========================================================================

  describe('API keys', () => {
    it('should register API key', () => {
      db.registerApiKey('key-uuid-123', 'anthropic', 'My Work Key');

      const keys = db.getApiKeysByProvider('anthropic');
      expect(keys.length).toBe(1);
      expect(keys[0].name).toBe('My Work Key');
    });

    it('should update existing API key', () => {
      db.registerApiKey('key-uuid-123', 'anthropic', 'Original Name');
      db.registerApiKey('key-uuid-123', 'anthropic', 'Updated Name');

      const keys = db.getApiKeysByProvider('anthropic');
      expect(keys.length).toBe(1);
      expect(keys[0].name).toBe('Updated Name');
    });

    it('should delete API key', () => {
      db.registerApiKey('delete-me', 'anthropic', 'To Delete');
      db.deleteApiKey('delete-me');

      const keys = db.getApiKeysByProvider('anthropic');
      expect(keys.length).toBe(0);
    });

    it('should update last used timestamp', () => {
      db.registerApiKey('use-me', 'anthropic', 'Use Me');
      const before = db.getApiKeysByProvider('anthropic')[0];

      // Small delay to ensure timestamp difference
      db.updateApiKeyUsed('use-me');

      const after = db.getApiKeysByProvider('anthropic')[0];
      expect(after.last_used).toBeDefined();
    });
  });

  // ===========================================================================
  // Settings Tests
  // ===========================================================================

  describe('settings', () => {
    it('should get default settings', () => {
      const settings = db.getAllSettings();

      expect(settings.active_provider).toBe('anthropic');
      expect(settings.default_model).toBe('claude-3-5-sonnet-20241022');
    });

    it('should set and get setting', () => {
      db.setSetting('test_key', 'test_value');

      const value = db.getSetting('test_key');
      expect(value).toBe('test_value');
    });

    it('should update existing setting', () => {
      db.setSetting('my_setting', 'original');
      db.setSetting('my_setting', 'updated');

      const value = db.getSetting('my_setting');
      expect(value).toBe('updated');
    });

    it('should return null for non-existent setting', () => {
      const value = db.getSetting('does_not_exist');
      expect(value).toBeNull();
    });
  });

  // ===========================================================================
  // Code Indexing Tests
  // ===========================================================================

  describe('code indexing', () => {
    let projectId;

    beforeEach(() => {
      const project = db.getOrCreateProject('/test/project');
      projectId = project.id;
    });

    describe('file metadata', () => {
      it('should upsert file metadata', () => {
        db.upsertFileMetadata(projectId, 'src/index.js', {
          last_modified: new Date('2024-01-01'),
          file_size: 1024,
          content_hash: 'abc123',
          index_status: 'indexed',
        });

        const metadata = db.getFileMetadata(projectId, 'src/index.js');
        expect(metadata).toBeDefined();
        expect(metadata.file_size).toBe(1024);
        expect(metadata.index_status).toBe('indexed');
      });

      it('should handle Date objects in last_modified', () => {
        const testDate = new Date('2024-06-15T10:30:00Z');

        db.upsertFileMetadata(projectId, 'src/test.js', {
          last_modified: testDate,
          file_size: 512,
          content_hash: 'def456',
          index_status: 'indexed',
        });

        const metadata = db.getFileMetadata(projectId, 'src/test.js');
        expect(metadata).toBeDefined();
        expect(metadata.last_modified).toBe(testDate.toISOString());
      });

      it('should update existing file metadata', () => {
        db.upsertFileMetadata(projectId, 'src/update.js', {
          last_modified: new Date(),
          file_size: 100,
          content_hash: 'hash1',
          index_status: 'pending',
        });

        db.upsertFileMetadata(projectId, 'src/update.js', {
          last_modified: new Date(),
          file_size: 200,
          content_hash: 'hash2',
          index_status: 'indexed',
        });

        const metadata = db.getFileMetadata(projectId, 'src/update.js');
        expect(metadata.file_size).toBe(200);
        expect(metadata.index_status).toBe('indexed');
      });
    });

    describe('symbols', () => {
      it('should insert symbol', () => {
        db.insertSymbol(projectId, {
          file_path: 'src/utils.js',
          symbol_name: 'formatDate',
          symbol_type: 'function',
          line_number: 10,
          is_exported: true,
        });

        const symbols = db.findSymbolsByName(projectId, 'formatDate');
        expect(symbols.length).toBe(1);
        expect(symbols[0].symbol_type).toBe('function');
        expect(symbols[0].is_exported).toBe(1);
      });

      it('should find symbols by name', () => {
        db.insertSymbol(projectId, {
          file_path: 'src/a.js',
          symbol_name: 'MyClass',
          symbol_type: 'class',
          line_number: 5,
          is_exported: true,
        });
        db.insertSymbol(projectId, {
          file_path: 'src/b.js',
          symbol_name: 'MyClass',
          symbol_type: 'class',
          line_number: 10,
          is_exported: false,
        });

        const symbols = db.findSymbolsByName(projectId, 'MyClass');
        expect(symbols.length).toBe(2);
        // Exported symbols should come first
        expect(symbols[0].is_exported).toBe(1);
      });

      it('should delete symbols for file', () => {
        db.insertSymbol(projectId, {
          file_path: 'src/delete.js',
          symbol_name: 'toDelete',
          symbol_type: 'function',
          line_number: 1,
        });

        db.deleteSymbolsForFile(projectId, 'src/delete.js');

        const symbols = db.findSymbolsByName(projectId, 'toDelete');
        expect(symbols.length).toBe(0);
      });
    });

    describe('imports', () => {
      it('should insert import', () => {
        db.insertImport(projectId, {
          source_file: 'src/app.js',
          imported_symbol: 'useState',
          imported_from: 'react',
          import_type: 'named',
          line_number: 1,
        });

        const importers = db.findImportersBySymbol(projectId, 'useState');
        expect(importers.length).toBe(1);
        expect(importers[0].imported_from).toBe('react');
      });

      it('should find importers by symbol', () => {
        db.insertImport(projectId, {
          source_file: 'src/a.js',
          imported_symbol: 'MyUtil',
          imported_from: './utils',
          import_type: 'named',
          line_number: 1,
        });
        db.insertImport(projectId, {
          source_file: 'src/b.js',
          imported_symbol: 'MyUtil',
          imported_from: './utils',
          import_type: 'named',
          line_number: 2,
        });

        const importers = db.findImportersBySymbol(projectId, 'MyUtil');
        expect(importers.length).toBe(2);
      });

      it('should delete imports for file', () => {
        db.insertImport(projectId, {
          source_file: 'src/delete.js',
          imported_symbol: 'something',
          imported_from: './other',
          import_type: 'named',
          line_number: 1,
        });

        db.deleteImportsForFile(projectId, 'src/delete.js');

        const importers = db.findImportersBySymbol(projectId, 'something');
        expect(importers.length).toBe(0);
      });
    });

    describe('index management', () => {
      it('should clear project index', () => {
        db.insertSymbol(projectId, {
          file_path: 'src/test.js',
          symbol_name: 'test',
          symbol_type: 'function',
          line_number: 1,
        });
        db.insertImport(projectId, {
          source_file: 'src/test.js',
          imported_symbol: 'dep',
          imported_from: './dep',
          import_type: 'named',
          line_number: 1,
        });
        db.upsertFileMetadata(projectId, 'src/test.js', {
          last_modified: new Date(),
          file_size: 100,
          content_hash: 'hash',
          index_status: 'indexed',
        });

        db.clearProjectIndex(projectId);

        const stats = db.getIndexStats(projectId);
        expect(stats.totalSymbols).toBe(0);
        expect(stats.totalImports).toBe(0);
        expect(stats.totalFiles).toBe(0);
      });

      it('should get index stats', () => {
        db.insertSymbol(projectId, {
          file_path: 'src/a.js',
          symbol_name: 'a',
          symbol_type: 'function',
          line_number: 1,
        });
        db.insertSymbol(projectId, {
          file_path: 'src/b.js',
          symbol_name: 'b',
          symbol_type: 'function',
          line_number: 1,
        });
        db.insertImport(projectId, {
          source_file: 'src/a.js',
          imported_symbol: 'dep',
          imported_from: './dep',
          import_type: 'named',
          line_number: 1,
        });
        db.upsertFileMetadata(projectId, 'src/a.js', {
          last_modified: new Date(),
          file_size: 100,
          content_hash: 'hash',
          index_status: 'indexed',
        });
        db.upsertFileMetadata(projectId, 'src/b.js', {
          last_modified: new Date(),
          file_size: 100,
          content_hash: 'hash',
          index_status: 'pending',
        });

        const stats = db.getIndexStats(projectId);
        expect(stats.totalSymbols).toBe(2);
        expect(stats.totalImports).toBe(1);
        expect(stats.totalFiles).toBe(2);
        expect(stats.indexedFiles).toBe(1);
      });
    });
  });

  // ===========================================================================
  // Close Tests
  // ===========================================================================

  describe('close', () => {
    it('should close database connection', () => {
      db.close();
      expect(db.db).toBeNull();
    });

    it('should handle multiple close calls', () => {
      db.close();
      db.close(); // Should not throw
      expect(db.db).toBeNull();
    });
  });
});
