-- Context Kiln Database Schema
-- SQLite database for token tracking, session management, and usage analytics

-- Projects table - Each opened folder becomes a project
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folder_path TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index on folder_path for fast lookups
CREATE INDEX IF NOT EXISTS idx_projects_folder_path ON projects(folder_path);

-- Sessions table - Track conversation sessions within projects
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  project_id INTEGER NOT NULL,
  folder_path TEXT NOT NULL,  -- Relative path: .context-kiln/sessions/<name>
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_archived BOOLEAN DEFAULT 0,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create indexes for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_uuid ON sessions(uuid);
CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_accessed ON sessions(last_accessed);

-- Token usage table - Track every API call with token counts and costs
CREATE TABLE IF NOT EXISTS token_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  api_key_id TEXT NOT NULL,
  session_id TEXT,  -- Session UUID
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  provider TEXT NOT NULL,  -- 'anthropic', 'openai', 'ollama'
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_usd REAL NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- Create indexes for token usage queries
CREATE INDEX IF NOT EXISTS idx_token_usage_project_id ON token_usage(project_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_api_key_id ON token_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_session_id ON token_usage(session_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_timestamp ON token_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_token_usage_provider ON token_usage(provider);

-- API keys table - Store API key metadata (keys are encrypted in electron-store)
-- This table just tracks which keys exist and usage stats
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,  -- UUID
  provider TEXT NOT NULL,  -- 'anthropic', 'openai', 'ollama'
  name TEXT NOT NULL,  -- User-friendly name (e.g., "Work Account")
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used DATETIME
);

-- Create index for provider lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON api_keys(provider);

-- Settings table - Store app-level settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('active_provider', 'anthropic'),
  ('default_model', 'claude-3-5-sonnet-20241022'),
  ('max_context_tokens', '150000'),
  ('auto_archive_threshold', '100000'),
  ('layout_preset', 'default');

-- Database version for migrations
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Set initial version
INSERT OR IGNORE INTO schema_version (version) VALUES (1);
