/**
 * Unit tests for ToolExecutionService
 */

const path = require('path');
const fsPromises = require('fs').promises;

// Mock minimatch
jest.mock('minimatch', () => ({
  minimatch: jest.fn((str, pattern) => {
    if (pattern === '*') return true;
    if (pattern === '*.js') return str.endsWith('.js');
    if (pattern === '*.txt') return str.endsWith('.txt');
    return str.includes(pattern.replace('*', ''));
  }),
}));

// Mock diffUtils
jest.mock('../../src/utils/diffUtils', () => ({
  validateOldContent: jest.fn((current, old) => current.includes(old)),
  applyEdit: jest.fn((current, old, newContent) => current.replace(old, newContent)),
  calculateDiff: jest.fn((old, newContent) => ({
    changedLines: 1,
    additions: 1,
    deletions: 0,
  })),
}));

const ToolExecutionService = require('../../src/services/ToolExecutionService');

describe('ToolExecutionService', () => {
  let toolService;
  let mockFileService;
  let projectRoot;
  let testDir;

  beforeEach(async () => {
    testDir = path.join(global.TEST_DIR, 'tool-test', Date.now().toString());
    projectRoot = testDir;
    await fsPromises.mkdir(testDir, { recursive: true });

    mockFileService = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
    };

    toolService = new ToolExecutionService(mockFileService, projectRoot);
  });

  afterEach(async () => {
    try {
      await fsPromises.rm(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    it('should initialize with file service and project root', () => {
      expect(toolService.fileService).toBe(mockFileService);
      expect(toolService.projectRoot).toBe(projectRoot);
    });
  });

  describe('setProjectRoot', () => {
    it('should update project root', () => {
      toolService.setProjectRoot('/new/root');
      expect(toolService.projectRoot).toBe('/new/root');
    });
  });

  describe('validatePath', () => {
    it('should throw if no project root', () => {
      const service = new ToolExecutionService(mockFileService, null);
      expect(() => service.validatePath('test.js')).toThrow(/No project folder open/);
    });

    it('should resolve relative path to absolute', () => {
      const result = toolService.validatePath('src/test.js');
      expect(result).toBe(path.join(projectRoot, 'src/test.js'));
    });

    it('should reject path traversal', () => {
      expect(() => toolService.validatePath('../../../etc/passwd')).toThrow(/outside project root/);
    });

    it('should accept paths within project', () => {
      const result = toolService.validatePath('deep/nested/file.js');
      expect(result).toContain(projectRoot);
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const testFile = path.join(testDir, 'exists.txt');
      await fsPromises.writeFile(testFile, 'content');

      const exists = await toolService.fileExists(testFile);
      expect(exists).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      const exists = await toolService.fileExists(path.join(testDir, 'nope.txt'));
      expect(exists).toBe(false);
    });
  });

  describe('executeReadFile', () => {
    it('should read file content', async () => {
      const testFile = path.join(testDir, 'read.js');
      await fsPromises.writeFile(testFile, 'const x = 1;' + String.fromCharCode(10) + 'const y = 2;');

      const result = await toolService.executeReadFile({ path: 'read.js' });

      expect(result.success).toBe(true);
      expect(result.content).toContain('const x = 1;');
      expect(result.lines).toBe(2);
      expect(result.language).toBe('javascript');
    });

    it('should throw for non-existent file', async () => {
      await expect(
        toolService.executeReadFile({ path: 'nope.js' })
      ).rejects.toThrow(/File not found/);
    });

    it('should support line range', async () => {
      const testFile = path.join(testDir, 'lines.txt');
      await fsPromises.writeFile(testFile, ['line1','line2','line3','line4','line5'].join(String.fromCharCode(10)));

      const result = await toolService.executeReadFile({
        path: 'lines.txt',
        line_start: 2,
        line_end: 4,
      });

      expect(result.content).toBe(['line2','line3','line4'].join(String.fromCharCode(10)));
    });
  });

  describe('executeListFiles', () => {
    beforeEach(async () => {
      await fsPromises.writeFile(path.join(testDir, 'file1.js'), 'content');
      await fsPromises.writeFile(path.join(testDir, 'file2.txt'), 'content');
      await fsPromises.mkdir(path.join(testDir, 'subdir'));
      await fsPromises.writeFile(path.join(testDir, 'subdir', 'nested.js'), 'content');
    });

    it('should list files in directory', async () => {
      const result = await toolService.executeListFiles({ path: '.' });

      expect(result.success).toBe(true);
      expect(result.files.length).toBeGreaterThan(0);
    });

    it('should throw for non-existent directory', async () => {
      await expect(
        toolService.executeListFiles({ path: 'not-a-dir' })
      ).rejects.toThrow(/not found/);
    });
  });

  describe('matchesPattern', () => {
    it('should match literal strings', () => {
      expect(toolService.matchesPattern('hello world', 'world', false, true)).toBe(true);
      expect(toolService.matchesPattern('hello world', 'xyz', false, true)).toBe(false);
    });

    it('should match case-insensitively when specified', () => {
      expect(toolService.matchesPattern('Hello World', 'hello', false, false)).toBe(true);
      expect(toolService.matchesPattern('Hello World', 'hello', false, true)).toBe(false);
    });

    it('should match regex patterns', () => {
      // Use double backslash for regex digit pattern
      expect(toolService.matchesPattern('hello123world', '\\d+', true, true)).toBe(true);
      expect(toolService.matchesPattern('helloworld', '\\d+', true, true)).toBe(false);
    });
  });

  describe('shouldSkipDirectory', () => {
    it('should skip node_modules', () => {
      expect(toolService.shouldSkipDirectory('node_modules')).toBe(true);
    });

    it('should skip .git', () => {
      expect(toolService.shouldSkipDirectory('.git')).toBe(true);
    });

    it('should not skip regular directories', () => {
      expect(toolService.shouldSkipDirectory('src')).toBe(false);
      expect(toolService.shouldSkipDirectory('lib')).toBe(false);
    });
  });

  describe('shouldSkipFile', () => {
    it('should skip minified files', () => {
      expect(toolService.shouldSkipFile('bundle.min.js')).toBe(true);
    });

    it('should skip binary files', () => {
      expect(toolService.shouldSkipFile('image.png')).toBe(true);
      expect(toolService.shouldSkipFile('doc.pdf')).toBe(true);
    });

    it('should not skip source files', () => {
      expect(toolService.shouldSkipFile('app.js')).toBe(false);
      expect(toolService.shouldSkipFile('styles.css')).toBe(false);
    });
  });

  describe('executeTool', () => {
    it('should dispatch to correct handler', async () => {
      const testFile = path.join(testDir, 'dispatch.js');
      await fsPromises.writeFile(testFile, 'content');

      const result = await toolService.executeTool(
        { type: 'read_file', parameters: { path: 'dispatch.js' } },
        null
      );

      expect(result.success).toBe(true);
    });

    it('should throw for unknown tool type', async () => {
      await expect(
        toolService.executeTool({ type: 'unknown_tool', parameters: {} }, null)
      ).rejects.toThrow(/Unknown tool type/);
    });
  });

  describe('executeFindDefinition', () => {
    it('should require symbol_name parameter', async () => {
      const result = await toolService.executeFindDefinition({});
      expect(result.success).toBe(false);
      expect(result.error).toContain('symbol_name');
    });

    it('should fail when no code index service', async () => {
      const result = await toolService.executeFindDefinition({ symbol_name: 'test' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');
    });

    it('should query code index when available', async () => {
      const mockCodeIndex = {
        findDefinition: jest.fn().mockResolvedValue([
          { file_path: 'test.js', line_number: 10, symbol_type: 'function' },
        ]),
      };
      toolService.setCodeIndexService(mockCodeIndex);

      const result = await toolService.executeFindDefinition({ symbol_name: 'myFunc' });

      expect(result.success).toBe(true);
      expect(result.found).toBe(true);
      expect(result.definitions.length).toBe(1);
    });
  });

  describe('setCodeIndexService', () => {
    it('should set code index service', () => {
      const mockService = { findDefinition: jest.fn() };
      toolService.setCodeIndexService(mockService);
      expect(toolService.codeIndexService).toBe(mockService);
    });
  });
});
