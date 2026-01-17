const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

/**
 * DatabaseService - SQLite database wrapper for Context Kiln
 *
 * Handles all database operations for:
 * - Token usage tracking
 * - Session management
 * - Project tracking
 * - API key metadata
 * - Settings persistence
 *
 * Database location: <userData>/context-kiln/usage.db
 */
class DatabaseService {
  constructor() {
    this.db = null;
    this.dbPath = null;
  }

  /**
   * Initialize database connection and run migrations
   */
  initialize() {
    try {
      // Get user data directory
      const userDataPath = app.getPath('userData');
      const dbDir = path.join(userDataPath, 'context-kiln');

      // Create directory if it doesn't exist
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Database file path
      this.dbPath = path.join(dbDir, 'usage.db');

      // Connect to database
      this.db = new Database(this.dbPath);

      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');

      // Run schema (will create tables if they don't exist)
      this._runSchema();

      console.log(`Database initialized at: ${this.dbPath}`);
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Run database schema from schema.sql
   * @private
   */
  _runSchema() {
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split by semicolons and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        this.db.exec(statement);
      } catch (error) {
        // Ignore errors for statements that might already exist
        if (!error.message.includes('already exists')) {
          console.error('Schema error:', error.message);
        }
      }
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // ============================================================================
  // PROJECT METHODS
  // ============================================================================

  /**
   * Get or create project by folder path
   *
   * @param {string} folderPath - Absolute path to project folder
   * @returns {object} Project object with id, folder_path, name, created_at
   */
  getOrCreateProject(folderPath) {
    // Try to get existing project
    const existing = this.db
      .prepare('SELECT * FROM projects WHERE folder_path = ?')
      .get(folderPath);

    if (existing) {
      // Update last accessed
      this.db
        .prepare('UPDATE projects SET last_accessed = CURRENT_TIMESTAMP WHERE id = ?')
        .run(existing.id);

      return existing;
    }

    // Create new project
    const name = path.basename(folderPath);
    const result = this.db
      .prepare('INSERT INTO projects (folder_path, name) VALUES (?, ?)')
      .run(folderPath, name);

    return {
      id: result.lastInsertRowid,
      folder_path: folderPath,
      name,
      created_at: new Date().toISOString(),
      last_accessed: new Date().toISOString(),
    };
  }

  /**
   * Get all projects, ordered by last accessed
   *
   * @returns {Array} Array of project objects
   */
  getAllProjects() {
    return this.db
      .prepare('SELECT * FROM projects ORDER BY last_accessed DESC')
      .all();
  }

  // ============================================================================
  // SESSION METHODS
  // ============================================================================

  /**
   * Create new session
   *
   * @param {object} params - Session parameters
   * @param {string} params.uuid - Session UUID
   * @param {string} params.name - User-friendly session name
   * @param {number} params.projectId - Project ID
   * @param {string} params.folderPath - Relative path to session folder
   * @returns {object} Created session
   */
  createSession({ uuid, name, projectId, folderPath }) {
    const result = this.db
      .prepare(`
        INSERT INTO sessions (uuid, name, project_id, folder_path)
        VALUES (?, ?, ?, ?)
      `)
      .run(uuid, name, projectId, folderPath);

    return {
      id: result.lastInsertRowid,
      uuid,
      name,
      project_id: projectId,
      folder_path: folderPath,
      created_at: new Date().toISOString(),
      last_accessed: new Date().toISOString(),
      is_archived: 0,
    };
  }

  /**
   * Get sessions for a project
   *
   * @param {number} projectId - Project ID
   * @param {boolean} includeArchived - Include archived sessions
   * @returns {Array} Array of session objects
   */
  getProjectSessions(projectId, includeArchived = false) {
    const query = includeArchived
      ? 'SELECT * FROM sessions WHERE project_id = ? ORDER BY last_accessed DESC'
      : 'SELECT * FROM sessions WHERE project_id = ? AND is_archived = 0 ORDER BY last_accessed DESC';

    return this.db.prepare(query).all(projectId);
  }

  /**
   * Get session by UUID
   *
   * @param {string} uuid - Session UUID
   * @returns {object|null} Session object or null
   */
  getSessionByUuid(uuid) {
    return this.db.prepare('SELECT * FROM sessions WHERE uuid = ?').get(uuid);
  }

  /**
   * Update session last accessed timestamp
   *
   * @param {string} uuid - Session UUID
   */
  updateSessionAccessed(uuid) {
    this.db
      .prepare('UPDATE sessions SET last_accessed = CURRENT_TIMESTAMP WHERE uuid = ?')
      .run(uuid);
  }

  /**
   * Rename session
   *
   * @param {string} uuid - Session UUID
   * @param {string} newName - New session name
   */
  renameSession(uuid, newName) {
    this.db
      .prepare('UPDATE sessions SET name = ? WHERE uuid = ?')
      .run(newName, uuid);
  }

  /**
   * Archive session
   *
   * @param {string} uuid - Session UUID
   */
  archiveSession(uuid) {
    this.db
      .prepare('UPDATE sessions SET is_archived = 1 WHERE uuid = ?')
      .run(uuid);
  }

  // ============================================================================
  // TOKEN USAGE METHODS
  // ============================================================================

  /**
   * Record token usage
   *
   * @param {object} usage - Usage data
   * @param {number|null} usage.projectId - Project ID
   * @param {string} usage.apiKeyId - API key ID
   * @param {string|null} usage.sessionId - Session UUID
   * @param {string} usage.provider - Provider name
   * @param {string} usage.model - Model used
   * @param {number} usage.inputTokens - Input tokens
   * @param {number} usage.outputTokens - Output tokens
   * @param {number} usage.costUsd - Cost in USD
   */
  recordUsage(usage) {
    this.db
      .prepare(`
        INSERT INTO token_usage
        (project_id, api_key_id, session_id, provider, model, input_tokens, output_tokens, cost_usd)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        usage.projectId || null,
        usage.apiKeyId,
        usage.sessionId || null,
        usage.provider,
        usage.model,
        usage.inputTokens,
        usage.outputTokens,
        usage.costUsd
      );
  }

  /**
   * Get total usage for a project
   *
   * @param {number} projectId - Project ID
   * @param {string} timeRange - 'all', 'day', 'week', 'month'
   * @returns {object} Usage totals
   */
  getProjectUsage(projectId, timeRange = 'all') {
    const whereClause = this._buildTimeRangeClause(timeRange);
    const query = `
      SELECT
        COUNT(*) as call_count,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        SUM(cost_usd) as total_cost_usd,
        provider,
        model
      FROM token_usage
      WHERE project_id = ? ${whereClause}
      GROUP BY provider, model
      ORDER BY timestamp DESC
    `;

    return this.db.prepare(query).all(projectId);
  }

  /**
   * Get usage for an API key
   *
   * @param {string} apiKeyId - API key ID
   * @param {string} timeRange - 'all', 'day', 'week', 'month'
   * @returns {object} Usage totals
   */
  getApiKeyUsage(apiKeyId, timeRange = 'all') {
    const whereClause = this._buildTimeRangeClause(timeRange);
    const query = `
      SELECT
        COUNT(*) as call_count,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        SUM(cost_usd) as total_cost_usd
      FROM token_usage
      WHERE api_key_id = ? ${whereClause}
    `;

    return this.db.prepare(query).get(apiKeyId);
  }

  /**
   * Get usage for a session
   *
   * @param {string} sessionUuid - Session UUID
   * @returns {object} Usage totals
   */
  getSessionUsage(sessionUuid) {
    const query = `
      SELECT
        COUNT(*) as call_count,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        SUM(cost_usd) as total_cost_usd
      FROM token_usage
      WHERE session_id = ?
    `;

    return this.db.prepare(query).get(sessionUuid);
  }

  /**
   * Build time range WHERE clause
   * @private
   */
  _buildTimeRangeClause(timeRange) {
    switch (timeRange) {
      case 'day':
        return "AND timestamp >= datetime('now', '-1 day')";
      case 'week':
        return "AND timestamp >= datetime('now', '-7 days')";
      case 'month':
        return "AND timestamp >= datetime('now', '-30 days')";
      case 'all':
      default:
        return '';
    }
  }

  // ============================================================================
  // API KEY METHODS
  // ============================================================================

  /**
   * Register API key metadata
   *
   * @param {string} id - API key ID (UUID)
   * @param {string} provider - Provider name
   * @param {string} name - User-friendly name
   */
  registerApiKey(id, provider, name) {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO api_keys (id, provider, name)
        VALUES (?, ?, ?)
      `)
      .run(id, provider, name);
  }

  /**
   * Update API key last used timestamp
   *
   * @param {string} id - API key ID
   */
  updateApiKeyUsed(id) {
    this.db
      .prepare('UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE id = ?')
      .run(id);
  }

  /**
   * Get all API keys for a provider
   *
   * @param {string} provider - Provider name
   * @returns {Array} Array of API key metadata
   */
  getApiKeysByProvider(provider) {
    return this.db
      .prepare('SELECT * FROM api_keys WHERE provider = ? ORDER BY last_used DESC')
      .all(provider);
  }

  /**
   * Delete API key metadata
   *
   * @param {string} id - API key ID
   */
  deleteApiKey(id) {
    this.db.prepare('DELETE FROM api_keys WHERE id = ?').run(id);
  }

  // ============================================================================
  // SETTINGS METHODS
  // ============================================================================

  /**
   * Get setting value
   *
   * @param {string} key - Setting key
   * @returns {string|null} Setting value or null
   */
  getSetting(key) {
    const result = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return result ? result.value : null;
  }

  /**
   * Set setting value
   *
   * @param {string} key - Setting key
   * @param {string} value - Setting value
   */
  setSetting(key, value) {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `)
      .run(key, value);
  }

  /**
   * Get all settings
   *
   * @returns {object} Settings object
   */
  getAllSettings() {
    const rows = this.db.prepare('SELECT key, value FROM settings').all();
    return rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  }

  // ============================================================================
  // CODE INDEXING METHODS (Phase B.75)
  // ============================================================================

  /**
   * Get file metadata
   *
   * @param {number} projectId - Project ID
   * @param {string} relativePath - Relative file path
   * @returns {object|null} File metadata or null
   */
  getFileMetadata(projectId, relativePath) {
    return this.db
      .prepare('SELECT * FROM code_file_metadata WHERE project_id = ? AND file_path = ?')
      .get(projectId, relativePath);
  }

  /**
   * Insert or update file metadata
   *
   * @param {number} projectId - Project ID
   * @param {string} relativePath - Relative file path
   * @param {object} metadata - File metadata
   * @param {Date} metadata.last_modified - Last modified timestamp
   * @param {number} metadata.file_size - File size in bytes
   * @param {string} metadata.content_hash - SHA-256 hash of content
   * @param {string} metadata.index_status - Status: 'pending', 'indexed', 'error'
   * @param {string} [metadata.error_message] - Error message if status is 'error'
   */
  upsertFileMetadata(projectId, relativePath, metadata) {
    this.db
      .prepare(`
        INSERT INTO code_file_metadata
        (project_id, file_path, last_modified, file_size, content_hash, index_status, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(project_id, file_path)
        DO UPDATE SET
          last_modified = excluded.last_modified,
          file_size = excluded.file_size,
          content_hash = excluded.content_hash,
          index_status = excluded.index_status,
          error_message = excluded.error_message,
          last_indexed = CURRENT_TIMESTAMP
      `)
      .run(
        projectId,
        relativePath,
        metadata.last_modified,
        metadata.file_size,
        metadata.content_hash,
        metadata.index_status,
        metadata.error_message || null
      );
  }

  /**
   * Delete all symbols for a file
   *
   * @param {number} projectId - Project ID
   * @param {string} relativePath - Relative file path
   */
  deleteSymbolsForFile(projectId, relativePath) {
    this.db
      .prepare('DELETE FROM code_symbols WHERE project_id = ? AND file_path = ?')
      .run(projectId, relativePath);
  }

  /**
   * Delete all imports for a file
   *
   * @param {number} projectId - Project ID
   * @param {string} relativePath - Relative file path
   */
  deleteImportsForFile(projectId, relativePath) {
    this.db
      .prepare('DELETE FROM code_imports WHERE project_id = ? AND source_file = ?')
      .run(projectId, relativePath);
  }

  /**
   * Insert a symbol into the index
   *
   * @param {number} projectId - Project ID
   * @param {object} symbol - Symbol data
   * @param {string} symbol.file_path - Relative file path
   * @param {string} symbol.symbol_name - Symbol name
   * @param {string} symbol.symbol_type - Symbol type (function, class, variable, etc.)
   * @param {number} symbol.line_number - Line number
   * @param {number} [symbol.column_number] - Column number
   * @param {boolean} [symbol.is_exported] - Whether symbol is exported
   * @param {string} [symbol.documentation] - JSDoc or docstring
   * @param {string} [symbol.signature] - Function signature
   */
  insertSymbol(projectId, symbol) {
    this.db
      .prepare(`
        INSERT INTO code_symbols
        (project_id, file_path, symbol_name, symbol_type, line_number, column_number, is_exported, documentation, signature)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        projectId,
        symbol.file_path,
        symbol.symbol_name,
        symbol.symbol_type,
        symbol.line_number,
        symbol.column_number || 0,
        symbol.is_exported ? 1 : 0,
        symbol.documentation || null,
        symbol.signature || null
      );
  }

  /**
   * Insert an import relationship into the index
   *
   * @param {number} projectId - Project ID
   * @param {object} importData - Import data
   * @param {string} importData.source_file - File containing the import
   * @param {string} [importData.imported_symbol] - Imported symbol name
   * @param {string} importData.imported_from - Module or file path
   * @param {string} importData.import_type - Import type: 'named', 'default', 'namespace', 'dynamic'
   * @param {number} importData.line_number - Line number
   */
  insertImport(projectId, importData) {
    this.db
      .prepare(`
        INSERT INTO code_imports
        (project_id, source_file, imported_symbol, imported_from, import_type, line_number)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        projectId,
        importData.source_file,
        importData.imported_symbol || null,
        importData.imported_from,
        importData.import_type,
        importData.line_number
      );
  }

  /**
   * Find symbols by name
   *
   * @param {number} projectId - Project ID
   * @param {string} symbolName - Symbol name to search for
   * @returns {Array} Array of matching symbols
   */
  findSymbolsByName(projectId, symbolName) {
    return this.db
      .prepare(`
        SELECT * FROM code_symbols
        WHERE project_id = ? AND symbol_name = ?
        ORDER BY is_exported DESC, file_path
      `)
      .all(projectId, symbolName);
  }

  /**
   * Find files that import a symbol
   *
   * @param {number} projectId - Project ID
   * @param {string} symbolName - Symbol name to search for
   * @returns {Array} Array of import relationships
   */
  findImportersBySymbol(projectId, symbolName) {
    return this.db
      .prepare(`
        SELECT * FROM code_imports
        WHERE project_id = ? AND imported_symbol = ?
        ORDER BY source_file
      `)
      .all(projectId, symbolName);
  }

  /**
   * Clear all index data for a project
   *
   * @param {number} projectId - Project ID
   */
  clearProjectIndex(projectId) {
    this.db.prepare('DELETE FROM code_symbols WHERE project_id = ?').run(projectId);
    this.db.prepare('DELETE FROM code_imports WHERE project_id = ?').run(projectId);
    this.db.prepare('DELETE FROM code_file_metadata WHERE project_id = ?').run(projectId);
  }

  /**
   * Get index statistics for a project
   *
   * @param {number} projectId - Project ID
   * @returns {object} Index statistics
   */
  getIndexStats(projectId) {
    const symbolCount = this.db
      .prepare('SELECT COUNT(*) as count FROM code_symbols WHERE project_id = ?')
      .get(projectId);

    const importCount = this.db
      .prepare('SELECT COUNT(*) as count FROM code_imports WHERE project_id = ?')
      .get(projectId);

    const fileCount = this.db
      .prepare('SELECT COUNT(*) as count FROM code_file_metadata WHERE project_id = ?')
      .get(projectId);

    const indexedFiles = this.db
      .prepare("SELECT COUNT(*) as count FROM code_file_metadata WHERE project_id = ? AND index_status = 'indexed'")
      .get(projectId);

    return {
      totalSymbols: symbolCount.count,
      totalImports: importCount.count,
      totalFiles: fileCount.count,
      indexedFiles: indexedFiles.count,
    };
  }
}

module.exports = DatabaseService;
