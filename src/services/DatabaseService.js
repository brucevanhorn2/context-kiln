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
   * Get global usage across all projects and sessions
   *
   * @param {string} timeRange - 'all', 'day', 'week', 'month'
   * @returns {object} Usage totals
   */
  getGlobalUsage(timeRange = 'all') {
    const whereClause = this._buildTimeRangeClause(timeRange);
    const query = `
      SELECT
        COUNT(*) as call_count,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        SUM(cost_usd) as total_cost_usd
      FROM token_usage
      ${whereClause ? 'WHERE ' + whereClause.replace('AND ', '') : ''}
    `;

    return this.db.prepare(query).get();
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
}

module.exports = DatabaseService;
