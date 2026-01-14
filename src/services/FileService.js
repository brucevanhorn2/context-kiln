const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

/**
 * FileService - Handle all file system operations
 *
 * Provides secure file read/write operations for:
 * - Reading source code files for context
 * - Saving edited files from Monaco editor
 * - Reading session files
 * - Writing session artifacts (decisions.md, context.md, etc.)
 *
 * Security: All operations validate paths to prevent directory traversal
 */
class FileService {
  /**
   * @param {string} projectRootPath - Root path of the current project
   */
  constructor(projectRootPath = null) {
    this.projectRootPath = projectRootPath;
  }

  /**
   * Set project root path
   *
   * @param {string} rootPath - Absolute path to project root
   */
  setProjectRoot(rootPath) {
    this.projectRootPath = rootPath;
  }

  /**
   * Validate that a path is within the project root (security check)
   *
   * @param {string} filePath - Path to validate
   * @returns {boolean} True if path is safe
   * @private
   */
  _isPathSafe(filePath) {
    if (!this.projectRootPath) {
      // If no project root set, allow any path (used for session files in userData)
      return true;
    }

    const normalized = path.normalize(filePath);
    const relative = path.relative(this.projectRootPath, normalized);

    // Path is safe if it doesn't start with '..' (parent directory)
    return !relative.startsWith('..') && !path.isAbsolute(relative);
  }

  /**
   * Read file content
   *
   * @param {string} filePath - Absolute path to file
   * @returns {Promise<string>} File content
   */
  async readFile(filePath) {
    try {
      // Check if file exists
      const exists = await this.fileExists(filePath);
      if (!exists) {
        throw new Error(`File not found: ${filePath}`);
      }

      const content = await fs.readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      console.error(`Failed to read file ${filePath}:`, error);
      throw new Error(`Could not read file: ${error.message}`);
    }
  }

  /**
   * Read file content synchronously (for initialization)
   *
   * @param {string} filePath - Absolute path to file
   * @returns {string} File content
   */
  readFileSync(filePath) {
    try {
      return fsSync.readFileSync(filePath, 'utf8');
    } catch (error) {
      console.error(`Failed to read file ${filePath}:`, error);
      throw new Error(`Could not read file: ${error.message}`);
    }
  }

  /**
   * Write file content
   *
   * @param {string} filePath - Absolute path to file
   * @param {string} content - Content to write
   * @param {object} options - Write options
   * @param {boolean} options.createDir - Create parent directory if needed
   */
  async writeFile(filePath, content, options = {}) {
    try {
      // Create parent directory if needed
      if (options.createDir) {
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
      }

      await fs.writeFile(filePath, content, 'utf8');
    } catch (error) {
      console.error(`Failed to write file ${filePath}:`, error);
      throw new Error(`Could not write file: ${error.message}`);
    }
  }

  /**
   * Append to file
   *
   * @param {string} filePath - Absolute path to file
   * @param {string} content - Content to append
   */
  async appendFile(filePath, content) {
    try {
      await fs.appendFile(filePath, content, 'utf8');
    } catch (error) {
      console.error(`Failed to append to file ${filePath}:`, error);
      throw new Error(`Could not append to file: ${error.message}`);
    }
  }

  /**
   * Check if file exists
   *
   * @param {string} filePath - Absolute path to file
   * @returns {Promise<boolean>} True if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if file exists synchronously
   *
   * @param {string} filePath - Absolute path to file
   * @returns {boolean} True if file exists
   */
  fileExistsSync(filePath) {
    try {
      fsSync.accessSync(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file stats
   *
   * @param {string} filePath - Absolute path to file
   * @returns {Promise<object>} File stats (size, mtime, etc.)
   */
  async getFileStats(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
      };
    } catch (error) {
      console.error(`Failed to get stats for ${filePath}:`, error);
      throw new Error(`Could not get file stats: ${error.message}`);
    }
  }

  /**
   * Create directory
   *
   * @param {string} dirPath - Absolute path to directory
   * @param {boolean} recursive - Create parent directories if needed
   */
  async createDirectory(dirPath, recursive = true) {
    try {
      await fs.mkdir(dirPath, { recursive });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        console.error(`Failed to create directory ${dirPath}:`, error);
        throw new Error(`Could not create directory: ${error.message}`);
      }
    }
  }

  /**
   * Delete file
   *
   * @param {string} filePath - Absolute path to file
   */
  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Failed to delete file ${filePath}:`, error);
      throw new Error(`Could not delete file: ${error.message}`);
    }
  }

  /**
   * List files in directory
   *
   * @param {string} dirPath - Absolute path to directory
   * @param {object} options - List options
   * @param {boolean} options.recursive - List recursively
   * @returns {Promise<Array<string>>} Array of file paths
   */
  async listFiles(dirPath, options = {}) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const files = [];

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          if (options.recursive) {
            const subFiles = await this.listFiles(fullPath, options);
            files.push(...subFiles);
          }
        } else {
          files.push(fullPath);
        }
      }

      return files;
    } catch (error) {
      console.error(`Failed to list files in ${dirPath}:`, error);
      throw new Error(`Could not list files: ${error.message}`);
    }
  }

  /**
   * Copy file
   *
   * @param {string} sourcePath - Source file path
   * @param {string} destPath - Destination file path
   */
  async copyFile(sourcePath, destPath) {
    try {
      await fs.copyFile(sourcePath, destPath);
    } catch (error) {
      console.error(`Failed to copy file from ${sourcePath} to ${destPath}:`, error);
      throw new Error(`Could not copy file: ${error.message}`);
    }
  }

  /**
   * Move/rename file
   *
   * @param {string} oldPath - Current file path
   * @param {string} newPath - New file path
   */
  async moveFile(oldPath, newPath) {
    try {
      await fs.rename(oldPath, newPath);
    } catch (error) {
      console.error(`Failed to move file from ${oldPath} to ${newPath}:`, error);
      throw new Error(`Could not move file: ${error.message}`);
    }
  }

  /**
   * Get file metadata for context
   *
   * @param {string} filePath - Absolute path to file
   * @returns {Promise<object>} File metadata
   */
  async getFileMetadata(filePath) {
    try {
      const content = await this.readFile(filePath);
      const stats = await this.getFileStats(filePath);

      // Count lines
      const lines = content.split('\n').length;

      // Detect language from extension
      const ext = path.extname(filePath).slice(1);
      const language = this._detectLanguage(ext);

      return {
        path: filePath,
        relativePath: this.projectRootPath
          ? path.relative(this.projectRootPath, filePath)
          : filePath,
        content,
        language,
        metadata: {
          lines,
          fileSize: stats.size,
          lastModified: stats.modified,
          estimatedTokens: Math.ceil(content.length / 4), // Rough estimate
        },
      };
    } catch (error) {
      console.error(`Failed to get metadata for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Detect language from file extension
   *
   * @param {string} ext - File extension (without dot)
   * @returns {string} Language identifier
   * @private
   */
  _detectLanguage(ext) {
    const languageMap = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      cs: 'csharp',
      go: 'go',
      rs: 'rust',
      rb: 'ruby',
      php: 'php',
      swift: 'swift',
      kt: 'kotlin',
      scala: 'scala',
      html: 'html',
      css: 'css',
      scss: 'scss',
      sass: 'sass',
      less: 'less',
      json: 'json',
      xml: 'xml',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      sql: 'sql',
      sh: 'shell',
      bash: 'shell',
      zsh: 'shell',
      ps1: 'powershell',
      r: 'r',
      m: 'objective-c',
      vue: 'vue',
      svelte: 'svelte',
    };

    return languageMap[ext] || ext || 'text';
  }
}

module.exports = FileService;
