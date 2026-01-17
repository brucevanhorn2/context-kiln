/**
 * Unit tests for FileService
 */

const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

const FileService = require('../../src/services/FileService');

describe('FileService', () => {
  let fileService;
  let testDir;

  beforeEach(async () => {
    // Create a unique test directory
    testDir = path.join(global.TEST_DIR, 'file-service-test', Date.now().toString());
    await fs.mkdir(testDir, { recursive: true });

    fileService = new FileService(testDir);
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  // ===========================================================================
  // Constructor Tests
  // ===========================================================================

  describe('constructor', () => {
    it('should initialize with project root', () => {
      const service = new FileService('/test/path');
      expect(service.projectRootPath).toBe('/test/path');
    });

    it('should initialize without project root', () => {
      const service = new FileService();
      expect(service.projectRootPath).toBeNull();
    });
  });

  // ===========================================================================
  // setProjectRoot Tests
  // ===========================================================================

  describe('setProjectRoot', () => {
    it('should set project root path', () => {
      const service = new FileService();
      service.setProjectRoot('/new/path');
      expect(service.projectRootPath).toBe('/new/path');
    });
  });

  // ===========================================================================
  // _isPathSafe Tests
  // ===========================================================================

  describe('_isPathSafe', () => {
    it('should allow paths within project root', () => {
      const service = new FileService('/project');
      expect(service._isPathSafe('/project/src/file.js')).toBe(true);
      expect(service._isPathSafe('/project/deep/nested/file.js')).toBe(true);
    });

    it('should reject paths outside project root', () => {
      const service = new FileService('/project');
      expect(service._isPathSafe('/other/file.js')).toBe(false);
      expect(service._isPathSafe('/project/../other/file.js')).toBe(false);
    });

    it('should allow any path when no project root is set', () => {
      const service = new FileService();
      expect(service._isPathSafe('/any/path/file.js')).toBe(true);
    });
  });

  // ===========================================================================
  // File Read/Write Tests
  // ===========================================================================

  describe('readFile', () => {
    it('should read file content', async () => {
      const testFile = path.join(testDir, 'test.txt');
      await fs.writeFile(testFile, 'Hello, World!', 'utf8');

      const content = await fileService.readFile(testFile);
      expect(content).toBe('Hello, World!');
    });

    it('should throw error for non-existent file', async () => {
      const nonExistentFile = path.join(testDir, 'non-existent.txt');

      await expect(fileService.readFile(nonExistentFile)).rejects.toThrow(
        /File not found/
      );
    });
  });

  describe('readFileSync', () => {
    it('should read file content synchronously', async () => {
      const testFile = path.join(testDir, 'sync-test.txt');
      await fs.writeFile(testFile, 'Sync content', 'utf8');

      const content = fileService.readFileSync(testFile);
      expect(content).toBe('Sync content');
    });

    it('should throw error for non-existent file', () => {
      const nonExistentFile = path.join(testDir, 'non-existent.txt');

      expect(() => fileService.readFileSync(nonExistentFile)).toThrow();
    });
  });

  describe('writeFile', () => {
    it('should write file content', async () => {
      const testFile = path.join(testDir, 'write-test.txt');

      await fileService.writeFile(testFile, 'Written content');

      const content = await fs.readFile(testFile, 'utf8');
      expect(content).toBe('Written content');
    });

    it('should create parent directory when option is set', async () => {
      const testFile = path.join(testDir, 'nested', 'deep', 'test.txt');

      await fileService.writeFile(testFile, 'Nested content', { createDir: true });

      const content = await fs.readFile(testFile, 'utf8');
      expect(content).toBe('Nested content');
    });

    it('should fail without createDir option for nested path', async () => {
      const testFile = path.join(testDir, 'new-nested', 'test.txt');

      await expect(fileService.writeFile(testFile, 'content')).rejects.toThrow();
    });
  });

  describe('appendFile', () => {
    it('should append to existing file', async () => {
      const testFile = path.join(testDir, 'append-test.txt');
      await fs.writeFile(testFile, 'Initial', 'utf8');

      await fileService.appendFile(testFile, ' Appended');

      const content = await fs.readFile(testFile, 'utf8');
      expect(content).toBe('Initial Appended');
    });

    it('should create file if it does not exist', async () => {
      const testFile = path.join(testDir, 'new-append.txt');

      await fileService.appendFile(testFile, 'New content');

      const content = await fs.readFile(testFile, 'utf8');
      expect(content).toBe('New content');
    });
  });

  // ===========================================================================
  // File Existence Tests
  // ===========================================================================

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const testFile = path.join(testDir, 'exists.txt');
      await fs.writeFile(testFile, 'content', 'utf8');

      const exists = await fileService.fileExists(testFile);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const testFile = path.join(testDir, 'not-exists.txt');

      const exists = await fileService.fileExists(testFile);
      expect(exists).toBe(false);
    });
  });

  describe('fileExistsSync', () => {
    it('should return true for existing file', async () => {
      const testFile = path.join(testDir, 'sync-exists.txt');
      await fs.writeFile(testFile, 'content', 'utf8');

      const exists = fileService.fileExistsSync(testFile);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent file', () => {
      const testFile = path.join(testDir, 'sync-not-exists.txt');

      const exists = fileService.fileExistsSync(testFile);
      expect(exists).toBe(false);
    });
  });

  // ===========================================================================
  // File Stats Tests
  // ===========================================================================

  describe('getFileStats', () => {
    it('should return file stats', async () => {
      const testFile = path.join(testDir, 'stats.txt');
      await fs.writeFile(testFile, 'Some content for stats', 'utf8');

      const stats = await fileService.getFileStats(testFile);

      expect(stats.size).toBe(22);
      expect(stats.isFile).toBe(true);
      expect(stats.isDirectory).toBe(false);
      expect(Object.prototype.toString.call(stats.created)).toBe("[object Date]");
      expect(Object.prototype.toString.call(stats.modified)).toBe("[object Date]");
    });

    it('should return stats for directory', async () => {
      const stats = await fileService.getFileStats(testDir);

      expect(stats.isFile).toBe(false);
      expect(stats.isDirectory).toBe(true);
    });

    it('should throw for non-existent path', async () => {
      const nonExistent = path.join(testDir, 'non-existent');

      await expect(fileService.getFileStats(nonExistent)).rejects.toThrow();
    });
  });

  // ===========================================================================
  // Directory Operations Tests
  // ===========================================================================

  describe('createDirectory', () => {
    it('should create directory', async () => {
      const newDir = path.join(testDir, 'new-dir');

      await fileService.createDirectory(newDir);

      const stats = await fs.stat(newDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should create nested directories recursively', async () => {
      const nestedDir = path.join(testDir, 'a', 'b', 'c');

      await fileService.createDirectory(nestedDir);

      const stats = await fs.stat(nestedDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should not throw if directory already exists', async () => {
      await expect(fileService.createDirectory(testDir)).resolves.not.toThrow();
    });
  });

  describe('listFiles', () => {
    beforeEach(async () => {
      // Set up test directory structure
      await fs.writeFile(path.join(testDir, 'file1.txt'), 'content1', 'utf8');
      await fs.writeFile(path.join(testDir, 'file2.js'), 'content2', 'utf8');
      await fs.mkdir(path.join(testDir, 'subdir'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'subdir', 'nested.txt'), 'nested', 'utf8');
    });

    it('should list files in directory', async () => {
      const files = await fileService.listFiles(testDir);

      expect(files).toContain(path.join(testDir, 'file1.txt'));
      expect(files).toContain(path.join(testDir, 'file2.js'));
      // Should not include subdir or its contents without recursive
      expect(files).not.toContain(path.join(testDir, 'subdir', 'nested.txt'));
    });

    it('should list files recursively', async () => {
      const files = await fileService.listFiles(testDir, { recursive: true });

      expect(files).toContain(path.join(testDir, 'file1.txt'));
      expect(files).toContain(path.join(testDir, 'file2.js'));
      expect(files).toContain(path.join(testDir, 'subdir', 'nested.txt'));
    });
  });

  // ===========================================================================
  // File Operations Tests
  // ===========================================================================

  describe('deleteFile', () => {
    it('should delete file', async () => {
      const testFile = path.join(testDir, 'to-delete.txt');
      await fs.writeFile(testFile, 'content', 'utf8');

      await fileService.deleteFile(testFile);

      const exists = await fileService.fileExists(testFile);
      expect(exists).toBe(false);
    });

    it('should throw for non-existent file', async () => {
      const nonExistent = path.join(testDir, 'not-there.txt');

      await expect(fileService.deleteFile(nonExistent)).rejects.toThrow();
    });
  });

  describe('copyFile', () => {
    it('should copy file', async () => {
      const sourceFile = path.join(testDir, 'source.txt');
      const destFile = path.join(testDir, 'dest.txt');
      await fs.writeFile(sourceFile, 'copy me', 'utf8');

      await fileService.copyFile(sourceFile, destFile);

      const destContent = await fs.readFile(destFile, 'utf8');
      expect(destContent).toBe('copy me');
      // Source should still exist
      const sourceContent = await fs.readFile(sourceFile, 'utf8');
      expect(sourceContent).toBe('copy me');
    });
  });

  describe('moveFile', () => {
    it('should move file', async () => {
      const sourceFile = path.join(testDir, 'to-move.txt');
      const destFile = path.join(testDir, 'moved.txt');
      await fs.writeFile(sourceFile, 'move me', 'utf8');

      await fileService.moveFile(sourceFile, destFile);

      const destContent = await fs.readFile(destFile, 'utf8');
      expect(destContent).toBe('move me');
      // Source should not exist
      const sourceExists = await fileService.fileExists(sourceFile);
      expect(sourceExists).toBe(false);
    });
  });

  // ===========================================================================
  // getFileMetadata Tests
  // ===========================================================================

  describe('getFileMetadata', () => {
    it('should return complete file metadata', async () => {
      const testFile = path.join(testDir, 'metadata.js');
      const content = 'const x = 1;\nconst y = 2;\nconsole.log(x + y);';
      await fs.writeFile(testFile, content, 'utf8');

      const metadata = await fileService.getFileMetadata(testFile);

      expect(metadata.path).toBe(testFile);
      expect(metadata.content).toBe(content);
      expect(metadata.language).toBe('javascript');
      expect(metadata.metadata.lines).toBe(3);
      expect(metadata.metadata.fileSize).toBe(content.length);
      expect(metadata.metadata.estimatedTokens).toBeGreaterThan(0);
    });

    it('should detect language for various extensions', async () => {
      const tests = [
        { ext: 'ts', lang: 'typescript' },
        { ext: 'py', lang: 'python' },
        { ext: 'html', lang: 'html' },
        { ext: 'css', lang: 'css' },
        { ext: 'json', lang: 'json' },
        { ext: 'md', lang: 'markdown' },
      ];

      for (const test of tests) {
        const testFile = path.join(testDir, `test.${test.ext}`);
        await fs.writeFile(testFile, 'content', 'utf8');

        const metadata = await fileService.getFileMetadata(testFile);
        expect(metadata.language).toBe(test.lang);
      }
    });

    it('should include relative path when project root is set', async () => {
      const subdir = path.join(testDir, 'src');
      await fs.mkdir(subdir, { recursive: true });
      const testFile = path.join(subdir, 'app.js');
      await fs.writeFile(testFile, 'content', 'utf8');

      const metadata = await fileService.getFileMetadata(testFile);

      expect(metadata.relativePath).toBe(path.join('src', 'app.js'));
    });
  });

  // ===========================================================================
  // _detectLanguage Tests
  // ===========================================================================

  describe('_detectLanguage', () => {
    it('should detect common languages', () => {
      expect(fileService._detectLanguage('js')).toBe('javascript');
      expect(fileService._detectLanguage('jsx')).toBe('javascript');
      expect(fileService._detectLanguage('ts')).toBe('typescript');
      expect(fileService._detectLanguage('tsx')).toBe('typescript');
      expect(fileService._detectLanguage('py')).toBe('python');
      expect(fileService._detectLanguage('java')).toBe('java');
      expect(fileService._detectLanguage('go')).toBe('go');
      expect(fileService._detectLanguage('rs')).toBe('rust');
      expect(fileService._detectLanguage('rb')).toBe('ruby');
    });

    it('should return extension for unknown types', () => {
      expect(fileService._detectLanguage('xyz')).toBe('xyz');
    });

    it('should return text for empty extension', () => {
      expect(fileService._detectLanguage('')).toBe('text');
    });
  });
});
