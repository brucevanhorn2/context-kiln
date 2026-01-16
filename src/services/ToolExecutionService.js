/**
 * Tool Execution Service
 *
 * Handles execution of AI tool calls:
 * - read_file: Read file contents
 * - edit_file: Propose and apply file edits
 * - list_files: List directory contents
 * - create_file: Create new files
 *
 * Coordinates with ToolContext for approval workflow.
 */

const path = require('path');
const fs = require('fs').promises;
const { minimatch } = require('minimatch');
const { v4: uuidv4 } = require('uuid');
const diffUtils = require('../utils/diffUtils');
const { getLanguageForFile } = require('../utils/constants');

// Security limits
const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const MAX_LINES = 10000;
const MAX_LIST_ITEMS = 1000;

class ToolExecutionService {
  /**
   * @param {object} fileService - FileService instance
   * @param {string} projectRoot - Project root path
   */
  constructor(fileService, projectRoot) {
    this.fileService = fileService;
    this.projectRoot = projectRoot;
  }

  /**
   * Update project root (when user opens different folder)
   */
  setProjectRoot(projectRoot) {
    this.projectRoot = projectRoot;
  }

  /**
   * Execute a tool call
   *
   * @param {object} toolCall - Tool call object from AI
   * @param {object} toolContext - Tool context for approval workflow
   * @returns {Promise<object>} Tool execution result
   */
  async executeTool(toolCall, toolContext) {
    const { type, parameters } = toolCall;

    try {
      switch (type) {
        case 'read_file':
          return await this.executeReadFile(parameters);

        case 'edit_file':
          return await this.executeEditFile(parameters, toolContext);

        case 'list_files':
          return await this.executeListFiles(parameters);

        case 'create_file':
          return await this.executeCreateFile(parameters, toolContext);

        case 'search_files':
          return await this.executeSearchFiles(parameters);

        case 'find_files':
          return await this.executeFindFiles(parameters);

        case 'find_definition':
          return await this.executeFindDefinition(parameters);

        case 'find_importers':
          return await this.executeFindImporters(parameters);

        default:
          throw new Error(`Unknown tool type: ${type}`);
      }
    } catch (error) {
      console.error(`Tool execution error (${type}):`, error);
      throw error;
    }
  }

  /**
   * Execute read_file tool
   *
   * @param {object} params - { path, line_start?, line_end? }
   * @returns {Promise<object>} File content and metadata
   */
  async executeReadFile(params) {
    const { path: relativePath, line_start, line_end } = params;

    // Validate and resolve path
    const absolutePath = this.validatePath(relativePath);

    // Check file exists
    const exists = await this.fileExists(absolutePath);
    if (!exists) {
      throw new Error(`File not found: ${relativePath}`);
    }

    // Check file size
    const stats = await fs.stat(absolutePath);
    if (stats.size > MAX_FILE_SIZE) {
      throw new Error(
        `File too large (${Math.round(stats.size / 1024)}KB). Maximum: ${MAX_FILE_SIZE / 1024}KB`
      );
    }

    // Read file
    const content = await fs.readFile(absolutePath, 'utf-8');
    const lines = content.split('\n');

    // Check line count
    if (lines.length > MAX_LINES) {
      throw new Error(
        `File has too many lines (${lines.length}). Maximum: ${MAX_LINES}`
      );
    }

    // Apply line range if specified
    const selectedLines =
      line_start !== undefined
        ? lines.slice((line_start || 1) - 1, line_end || lines.length)
        : lines;

    return {
      success: true,
      path: relativePath,
      content: selectedLines.join('\n'),
      lines: selectedLines.length,
      total_lines: lines.length,
      language: getLanguageForFile(relativePath),
      size: stats.size,
    };
  }

  /**
   * Execute edit_file tool (requires approval)
   *
   * @param {object} params - { path, old_content, new_content, description }
   * @param {object} toolContext - Tool context for approval
   * @returns {Promise<object>} Edit result
   */
  async executeEditFile(params, toolContext) {
    const { path: relativePath, old_content, new_content, description } = params;

    // Validate and resolve path
    const absolutePath = this.validatePath(relativePath);

    // Check file exists
    const exists = await this.fileExists(absolutePath);
    if (!exists) {
      throw new Error(`File not found: ${relativePath}`);
    }

    // Read current content
    const currentContent = await fs.readFile(absolutePath, 'utf-8');

    // Validate old_content exists
    if (!diffUtils.validateOldContent(currentContent, old_content)) {
      throw new Error(
        'The old_content specified does not exist in the file. ' +
          'The file may have been modified since you last read it. ' +
          'Please read the file again and try with updated content.'
      );
    }

    // Calculate new file content
    const updatedContent = diffUtils.applyEdit(
      currentContent,
      old_content,
      new_content
    );

    // Calculate diff
    const diff = diffUtils.calculateDiff(currentContent, updatedContent);

    // Create tool call for approval
    const toolCallId = uuidv4();
    const toolCallForApproval = {
      id: toolCallId,
      type: 'edit_file',
      path: relativePath,
      absolutePath,
      currentContent,
      updatedContent,
      old_content,
      new_content,
      diff,
      description,
      status: 'pending',
    };

    // Request approval (this will block until user approves/rejects)
    const approval = await toolContext.addPendingToolCall(toolCallForApproval);

    if (!approval.approved) {
      throw new Error('Edit rejected by user');
    }

    // Apply the edit
    const finalContent = approval.content || updatedContent;
    await fs.writeFile(absolutePath, finalContent, 'utf-8');

    // Mark as executed
    const result = {
      success: true,
      path: relativePath,
      lines_changed: diff.changedLines,
      additions: diff.additions,
      deletions: diff.deletions,
    };

    toolContext.markToolCallExecuted(toolCallId, result);

    return result;
  }

  /**
   * Execute list_files tool
   *
   * @param {object} params - { path?, pattern?, recursive? }
   * @returns {Promise<object>} Directory listing
   */
  async executeListFiles(params) {
    const { path: relativePath = '.', pattern, recursive = false } = params;

    // Validate and resolve path
    const absolutePath = this.validatePath(relativePath);

    // Check directory exists
    const exists = await this.fileExists(absolutePath);
    if (!exists) {
      throw new Error(`Directory not found: ${relativePath}`);
    }

    // Check it's a directory
    const stats = await fs.stat(absolutePath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${relativePath}`);
    }

    // Read directory
    const entries = await this.readDirectory(absolutePath, recursive);

    // Apply pattern filter if specified
    const filtered = pattern
      ? entries.filter((e) => minimatch(e.name, pattern))
      : entries;

    // Limit results
    const limited = filtered.slice(0, MAX_LIST_ITEMS);

    return {
      success: true,
      path: relativePath,
      files: limited.map((e) => ({
        name: e.name,
        type: e.isDirectory ? 'directory' : 'file',
        size: e.size,
      })),
      count: limited.length,
      truncated: filtered.length > MAX_LIST_ITEMS,
    };
  }

  /**
   * Execute create_file tool (requires approval)
   *
   * @param {object} params - { path, content, description }
   * @param {object} toolContext - Tool context for approval
   * @returns {Promise<object>} Creation result
   */
  async executeCreateFile(params, toolContext) {
    const { path: relativePath, content, description } = params;

    // Validate and resolve path
    const absolutePath = this.validatePath(relativePath);

    // Check file doesn't already exist
    const exists = await this.fileExists(absolutePath);
    if (exists) {
      throw new Error(
        `File already exists: ${relativePath}. Use edit_file to modify existing files.`
      );
    }

    // Create tool call for approval
    const toolCallId = uuidv4();
    const toolCallForApproval = {
      id: toolCallId,
      type: 'create_file',
      path: relativePath,
      absolutePath,
      content,
      description,
      status: 'pending',
      currentContent: '',
      updatedContent: content,
      diff: diffUtils.calculateDiff('', content),
    };

    // Request approval
    const approval = await toolContext.addPendingToolCall(toolCallForApproval);

    if (!approval.approved) {
      throw new Error('File creation rejected by user');
    }

    // Create the file
    const finalContent = approval.content || content;

    // Ensure parent directory exists
    const parentDir = path.dirname(absolutePath);
    await fs.mkdir(parentDir, { recursive: true });

    // Write file
    await fs.writeFile(absolutePath, finalContent, 'utf-8');

    // Mark as executed
    const lines = finalContent.split('\n').length;
    const result = {
      success: true,
      path: relativePath,
      lines,
      size: Buffer.byteLength(finalContent, 'utf-8'),
    };

    toolContext.markToolCallExecuted(toolCallId, result);

    return result;
  }

  /**
   * Validate path is within project root
   *
   * @param {string} relativePath - Relative path from project root
   * @returns {string} Absolute path
   * @throws {Error} If path is outside project root
   */
  validatePath(relativePath) {
    if (!this.projectRoot) {
      throw new Error('No project folder open. Please open a project first.');
    }

    // Resolve to absolute path
    const absolutePath = path.resolve(this.projectRoot, relativePath);

    // Normalize paths for comparison
    const normalizedAbsolute = path.normalize(absolutePath);
    const normalizedRoot = path.normalize(this.projectRoot);

    // Check it's within project root
    if (!normalizedAbsolute.startsWith(normalizedRoot)) {
      throw new Error(
        'Security: Path is outside project root. ' +
          'Tool calls can only access files within the open project folder.'
      );
    }

    return absolutePath;
  }

  /**
   * Check if file/directory exists
   *
   * @param {string} absolutePath - Absolute file path
   * @returns {Promise<boolean>}
   */
  async fileExists(absolutePath) {
    try {
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read directory recursively
   *
   * @param {string} dirPath - Directory path
   * @param {boolean} recursive - Include subdirectories
   * @returns {Promise<Array>} Array of entry objects
   */
  async readDirectory(dirPath, recursive) {
    const entries = [];
    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      const stats = await fs.stat(fullPath);

      entries.push({
        name: item.name,
        isDirectory: item.isDirectory(),
        size: stats.size,
      });

      // Recurse into subdirectories if requested
      if (recursive && item.isDirectory()) {
        const subEntries = await this.readDirectory(fullPath, true);
        subEntries.forEach((subEntry) => {
          entries.push({
            ...subEntry,
            name: path.join(item.name, subEntry.name),
          });
        });
      }
    }

    return entries;
  }

  /**
   * Execute search_files tool
   *
   * Search for text patterns in files (grep-style)
   *
   * @param {object} params - { pattern, path?, regex?, case_sensitive?, file_pattern? }
   * @returns {Promise<object>} Search results
   */
  async executeSearchFiles(params) {
    const {
      pattern,
      path: searchPath = '.',
      regex = false,
      case_sensitive = false,
      file_pattern = null,
    } = params;

    if (!pattern) {
      throw new Error('search_files requires a pattern parameter');
    }

    // Validate and resolve search path
    const absoluteSearchPath = this.validatePath(searchPath);

    // Find all files to search
    const files = await this.findAllSourceFiles(absoluteSearchPath, file_pattern);

    const matches = [];
    let searchedFiles = 0;
    const startTime = Date.now();

    // Search each file
    for (const file of files) {
      // Skip if already have many matches (performance)
      if (matches.length >= 100) {
        break;
      }

      searchedFiles++;

      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          if (matches.length >= 100) return; // Limit total matches

          if (this.matchesPattern(line, pattern, regex, case_sensitive)) {
            const column = case_sensitive
              ? line.indexOf(pattern)
              : line.toLowerCase().indexOf(pattern.toLowerCase());

            matches.push({
              file: path.relative(this.projectRoot, file),
              line: index + 1,
              column: column >= 0 ? column + 1 : 1,
              content: line.trim(),
            });
          }
        });
      } catch (error) {
        // Skip files that can't be read (permissions, encoding, etc.)
        console.warn(`Skipping file ${file}:`, error.message);
      }
    }

    const searchTimeMs = Date.now() - startTime;

    return {
      success: true,
      matches,
      count: matches.length,
      searched_files: searchedFiles,
      search_time_ms: searchTimeMs,
      truncated: matches.length >= 100,
    };
  }

  /**
   * Execute find_files tool
   *
   * Find files by name pattern (glob)
   *
   * @param {object} params - { pattern, path?, type? }
   * @returns {Promise<object>} Found files
   */
  async executeFindFiles(params) {
    const { pattern, path: searchPath = '.', type = 'file' } = params;

    if (!pattern) {
      throw new Error('find_files requires a pattern parameter');
    }

    // Validate and resolve search path
    const absoluteSearchPath = this.validatePath(searchPath);

    // Find all files/directories
    const allEntries = await this.findAllEntries(absoluteSearchPath);

    // Filter by pattern and type
    const matches = allEntries.filter((entry) => {
      // Check type filter
      if (type === 'file' && entry.isDirectory) return false;
      if (type === 'directory' && !entry.isDirectory) return false;

      // Check name pattern
      const basename = path.basename(entry.path);
      return minimatch(basename, pattern);
    });

    // Limit results
    const limitedMatches = matches.slice(0, MAX_LIST_ITEMS);

    return {
      success: true,
      files: limitedMatches.map((entry) => ({
        path: path.relative(this.projectRoot, entry.path),
        isDirectory: entry.isDirectory,
        size: entry.size,
      })),
      count: limitedMatches.length,
      truncated: matches.length > MAX_LIST_ITEMS,
    };
  }

  /**
   * Check if text matches pattern
   *
   * @param {string} text - Text to search in
   * @param {string} pattern - Pattern to search for
   * @param {boolean} isRegex - Whether pattern is a regex
   * @param {boolean} caseSensitive - Case sensitive search
   * @returns {boolean} Whether text matches pattern
   */
  matchesPattern(text, pattern, isRegex, caseSensitive) {
    if (isRegex) {
      const flags = caseSensitive ? '' : 'i';
      try {
        const regex = new RegExp(pattern, flags);
        return regex.test(text);
      } catch (error) {
        console.error('Invalid regex pattern:', pattern, error);
        return false;
      }
    } else {
      if (caseSensitive) {
        return text.includes(pattern);
      } else {
        return text.toLowerCase().includes(pattern.toLowerCase());
      }
    }
  }

  /**
   * Find all source files recursively
   *
   * @param {string} dirPath - Directory to search
   * @param {string} filePattern - Optional glob pattern to filter files
   * @returns {Promise<Array<string>>} Array of absolute file paths
   */
  async findAllSourceFiles(dirPath, filePattern = null) {
    const files = [];

    const walk = async (currentPath) => {
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);

          // Skip directories that should be ignored
          if (entry.isDirectory()) {
            if (this.shouldSkipDirectory(entry.name)) {
              continue;
            }
            await walk(fullPath);
          } else {
            // Check file pattern if specified
            if (filePattern && !minimatch(entry.name, filePattern)) {
              continue;
            }

            // Skip non-text files
            if (this.shouldSkipFile(fullPath)) {
              continue;
            }

            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
        console.warn(`Skipping directory ${currentPath}:`, error.message);
      }
    };

    await walk(dirPath);
    return files;
  }

  /**
   * Find all entries (files and directories) recursively
   *
   * @param {string} dirPath - Directory to search
   * @returns {Promise<Array<object>>} Array of entry objects
   */
  async findAllEntries(dirPath) {
    const entries = [];

    const walk = async (currentPath) => {
      try {
        const items = await fs.readdir(currentPath, { withFileTypes: true });

        for (const item of items) {
          const fullPath = path.join(currentPath, item.name);

          // Skip ignored directories
          if (item.isDirectory() && this.shouldSkipDirectory(item.name)) {
            continue;
          }

          const stats = await fs.stat(fullPath);

          entries.push({
            path: fullPath,
            isDirectory: item.isDirectory(),
            size: stats.size,
          });

          // Recurse into subdirectories
          if (item.isDirectory()) {
            await walk(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
        console.warn(`Skipping directory ${currentPath}:`, error.message);
      }
    };

    await walk(dirPath);
    return entries;
  }

  /**
   * Check if directory should be skipped
   *
   * @param {string} name - Directory name
   * @returns {boolean} Whether to skip
   */
  shouldSkipDirectory(name) {
    const skipDirs = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.next',
      'out',
      'target',
      '__pycache__',
      '.venv',
      'venv',
    ];
    return skipDirs.includes(name);
  }

  /**
   * Check if file should be skipped (binary, minified, etc.)
   *
   * @param {string} filePath - File path
   * @returns {boolean} Whether to skip
   */
  shouldSkipFile(filePath) {
    const skipPatterns = [
      /\.min\.js$/,
      /\.map$/,
      /\.jpg$/,
      /\.jpeg$/,
      /\.png$/,
      /\.gif$/,
      /\.ico$/,
      /\.pdf$/,
      /\.zip$/,
      /\.tar$/,
      /\.gz$/,
      /\.exe$/,
      /\.dll$/,
      /\.so$/,
      /\.dylib$/,
      /\.woff$/,
      /\.woff2$/,
      /\.ttf$/,
      /\.eot$/,
      /\.mp4$/,
      /\.mp3$/,
      /\.wav$/,
    ];

    return skipPatterns.some((pattern) => pattern.test(filePath));
  }

  /**
   * Execute find_definition tool - Query code index for symbol definition
   * Phase B.75: Index-based "where is X defined?" queries
   *
   * @param {object} params - Tool parameters
   * @param {string} params.symbol_name - Symbol name to find
   * @returns {object} Tool result with definitions or error
   */
  async executeFindDefinition(params) {
    const { symbol_name } = params;

    if (!symbol_name) {
      return {
        success: false,
        error: 'symbol_name parameter is required',
      };
    }

    try {
      // Check if CodeIndexService is available
      if (!this.codeIndexService) {
        return {
          success: false,
          error: 'Code index not available. Please open a project first.',
        };
      }

      // Query index
      const definitions = await this.codeIndexService.findDefinition(symbol_name);

      if (definitions.length === 0) {
        return {
          success: true,
          found: false,
          message: `No definition found for symbol: ${symbol_name}`,
          symbol_name: symbol_name,
        };
      }

      // Format results
      const results = definitions.map((def) => ({
        file: def.file_path,
        line: def.line_number,
        column: def.column_number,
        type: def.symbol_type,
        exported: def.is_exported === 1,
        signature: def.signature,
        documentation: def.documentation,
      }));

      return {
        success: true,
        found: true,
        symbol_name: symbol_name,
        definitions: results,
        count: results.length,
      };
    } catch (error) {
      console.error('[ToolExecutionService] Find definition error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute find_importers tool - Query code index for files that import a symbol
   * Phase B.75: Index-based "what files import X?" queries
   *
   * @param {object} params - Tool parameters
   * @param {string} params.symbol_name - Symbol name to find importers for
   * @returns {object} Tool result with importers or error
   */
  async executeFindImporters(params) {
    const { symbol_name } = params;

    if (!symbol_name) {
      return {
        success: false,
        error: 'symbol_name parameter is required',
      };
    }

    try {
      // Check if CodeIndexService is available
      if (!this.codeIndexService) {
        return {
          success: false,
          error: 'Code index not available. Please open a project first.',
        };
      }

      // Query index
      const importers = await this.codeIndexService.findImporters(symbol_name);

      if (importers.length === 0) {
        return {
          success: true,
          found: false,
          message: `No importers found for symbol: ${symbol_name}`,
          symbol_name: symbol_name,
        };
      }

      // Format results
      const results = importers.map((imp) => ({
        file: imp.source_file,
        line: imp.line_number,
        imported_from: imp.imported_from,
        import_type: imp.import_type,
      }));

      return {
        success: true,
        found: true,
        symbol_name: symbol_name,
        importers: results,
        count: results.length,
      };
    } catch (error) {
      console.error('[ToolExecutionService] Find importers error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Set the CodeIndexService instance
   * Called after CodeIndexService is initialized with a project
   *
   * @param {CodeIndexService} codeIndexService - CodeIndexService instance
   */
  setCodeIndexService(codeIndexService) {
    this.codeIndexService = codeIndexService;
  }
}

module.exports = ToolExecutionService;
