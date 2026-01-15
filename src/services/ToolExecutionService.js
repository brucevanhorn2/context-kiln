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
}

module.exports = ToolExecutionService;
