const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * SessionService - Manage session files and directories
 *
 * Sessions are stored at: <project>/.context-kiln/sessions/<session-name>/
 *
 * Each session contains:
 * - session.json - Metadata (UUID, name, created, model, etc.)
 * - context.md - Current context summary
 * - decisions.md - Key decisions made during session
 * - conversation-history/ - Archived message history
 * - artifacts/ - Files created during session
 *
 * @depends FileService for file operations
 * @depends DatabaseService for session metadata tracking
 */
class SessionService {
  /**
   * @param {FileService} fileService - File service instance
   * @param {DatabaseService} databaseService - Database service instance
   */
  constructor(fileService, databaseService) {
    this.fileService = fileService;
    this.databaseService = databaseService;
  }

  /**
   * Create new session
   *
   * @param {string} projectPath - Absolute path to project root
   * @param {string} sessionName - User-friendly session name
   * @param {number} projectId - Project ID from database
   * @returns {Promise<object>} Created session info
   */
  async createSession(projectPath, sessionName, projectId) {
    // Generate UUID
    const uuid = uuidv4();

    // Sanitize session name for folder name
    const folderName = this._sanitizeFolderName(sessionName);

    // Session directory path
    const sessionDir = path.join(projectPath, '.context-kiln', 'sessions', folderName);

    // Check if directory already exists
    const exists = await this.fileService.fileExists(sessionDir);
    if (exists) {
      throw new Error(`Session folder already exists: ${folderName}`);
    }

    // Create session directory structure
    await this.fileService.createDirectory(sessionDir);
    await this.fileService.createDirectory(path.join(sessionDir, 'conversation-history'));
    await this.fileService.createDirectory(path.join(sessionDir, 'artifacts'));

    // Create session.json
    const sessionData = {
      uuid,
      name: sessionName,
      folderName,
      projectId,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      model: null, // Will be set when first message is sent
      totalMessages: 0,
      isArchived: false,
    };

    await this.fileService.writeFile(
      path.join(sessionDir, 'session.json'),
      JSON.stringify(sessionData, null, 2)
    );

    // Create initial files
    await this.fileService.writeFile(
      path.join(sessionDir, 'context.md'),
      '# Session Context\n\nThis file contains a summary of the current context for this session.\n'
    );

    await this.fileService.writeFile(
      path.join(sessionDir, 'decisions.md'),
      '# Decisions\n\nKey decisions made during this session.\n\n'
    );

    await this.fileService.writeFile(
      path.join(sessionDir, 'README.md'),
      `# ${sessionName}\n\nSession created: ${sessionData.createdAt}\n\n`
    );

    // Record in database
    const relativeSessionPath = path.relative(projectPath, sessionDir);
    await this.databaseService.createSession({
      uuid,
      name: sessionName,
      projectId,
      folderPath: relativeSessionPath,
    });

    return {
      uuid,
      name: sessionName,
      folderName,
      folderPath: sessionDir,
      projectId,
      createdAt: sessionData.createdAt,
    };
  }

  /**
   * Load session by UUID
   *
   * @param {string} uuid - Session UUID
   * @param {string} projectPath - Project root path
   * @returns {Promise<object>} Session data
   */
  async loadSession(uuid, projectPath) {
    // Get session from database
    const dbSession = this.databaseService.getSessionByUuid(uuid);

    if (!dbSession) {
      throw new Error(`Session not found: ${uuid}`);
    }

    // Build full path
    const sessionDir = path.join(projectPath, dbSession.folder_path);

    // Read session.json
    const sessionJsonPath = path.join(sessionDir, 'session.json');
    const sessionDataStr = await this.fileService.readFile(sessionJsonPath);
    const sessionData = JSON.parse(sessionDataStr);

    // Update last accessed
    this.databaseService.updateSessionAccessed(uuid);

    return {
      ...sessionData,
      folderPath: sessionDir,
      dbData: dbSession,
    };
  }

  /**
   * Get all sessions for a project
   *
   * @param {number} projectId - Project ID
   * @returns {Array<object>} Array of session summaries
   */
  getSessions(projectId) {
    return this.databaseService.getProjectSessions(projectId, false);
  }

  /**
   * Rename session
   *
   * @param {string} uuid - Session UUID
   * @param {string} newName - New session name
   * @param {string} projectPath - Project root path
   */
  async renameSession(uuid, newName, projectPath) {
    // Update database
    this.databaseService.renameSession(uuid, newName);

    // Load session to get current path
    const session = await this.loadSession(uuid, projectPath);

    // Update session.json
    const sessionJsonPath = path.join(session.folderPath, 'session.json');
    const sessionData = JSON.parse(await this.fileService.readFile(sessionJsonPath));
    sessionData.name = newName;

    await this.fileService.writeFile(
      sessionJsonPath,
      JSON.stringify(sessionData, null, 2)
    );

    // Note: We don't rename the folder itself to avoid breaking references
    // The folder name remains as the original sanitized name
  }

  /**
   * Archive old messages from conversation to conversation-history/
   *
   * @param {string} uuid - Session UUID
   * @param {string} projectPath - Project root path
   * @param {Array} messagesToArchive - Messages to archive
   */
  async archiveMessages(uuid, projectPath, messagesToArchive) {
    const session = await this.loadSession(uuid, projectPath);

    // Determine part number
    const historyDir = path.join(session.folderPath, 'conversation-history');
    const files = await this.fileService.listFiles(historyDir);
    const partNumber = files.length + 1;

    // Create archive file
    const archiveFile = path.join(historyDir, `part-${String(partNumber).padStart(3, '0')}.json`);

    await this.fileService.writeFile(
      archiveFile,
      JSON.stringify({
        archivedAt: new Date().toISOString(),
        messageCount: messagesToArchive.length,
        messages: messagesToArchive,
      }, null, 2)
    );

    return archiveFile;
  }

  /**
   * Append to session file
   *
   * @param {string} uuid - Session UUID
   * @param {string} projectPath - Project root path
   * @param {string} fileName - File name (context.md, decisions.md, etc.)
   * @param {string} content - Content to append
   */
  async appendToSessionFile(uuid, projectPath, fileName, content) {
    const session = await this.loadSession(uuid, projectPath);
    const filePath = path.join(session.folderPath, fileName);

    await this.fileService.appendFile(filePath, content);
  }

  /**
   * Save artifact to session
   *
   * @param {string} uuid - Session UUID
   * @param {string} projectPath - Project root path
   * @param {string} artifactName - Artifact file name
   * @param {string} content - Artifact content
   */
  async saveArtifact(uuid, projectPath, artifactName, content) {
    const session = await this.loadSession(uuid, projectPath);
    const artifactPath = path.join(session.folderPath, 'artifacts', artifactName);

    await this.fileService.writeFile(artifactPath, content);
  }

  /**
   * Archive session (mark as complete)
   *
   * @param {string} uuid - Session UUID
   */
  archiveSession(uuid) {
    this.databaseService.archiveSession(uuid);
  }

  /**
   * Sanitize session name for use as folder name
   *
   * @param {string} name - Session name
   * @returns {string} Sanitized folder name
   * @private
   */
  _sanitizeFolderName(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .substring(0, 100); // Limit length
  }

  /**
   * Get session statistics
   *
   * @param {string} uuid - Session UUID
   * @returns {object} Session statistics (message count, token usage, etc.)
   */
  getSessionStatistics(uuid) {
    return this.databaseService.getSessionUsage(uuid);
  }
}

module.exports = SessionService;
