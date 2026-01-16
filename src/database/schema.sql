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

-- Code symbols table - Index of functions, classes, variables, etc.
-- Phase B.75: Lightweight code indexing for fast "find definition" queries
CREATE TABLE IF NOT EXISTS code_symbols (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,  -- Relative path from project root
  symbol_name TEXT NOT NULL,
  symbol_type TEXT NOT NULL,  -- 'function', 'class', 'variable', 'constant', 'method'
  line_number INTEGER,
  column_number INTEGER DEFAULT 0,
  is_exported BOOLEAN DEFAULT 0,
  documentation TEXT,  -- JSDoc or docstring
  signature TEXT,  -- Function signature or type info
  last_indexed DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create indexes for fast symbol lookups
CREATE INDEX IF NOT EXISTS idx_code_symbols_project_id ON code_symbols(project_id);
CREATE INDEX IF NOT EXISTS idx_code_symbols_symbol_name ON code_symbols(symbol_name);
CREATE INDEX IF NOT EXISTS idx_code_symbols_file_path ON code_symbols(file_path);
CREATE INDEX IF NOT EXISTS idx_code_symbols_symbol_type ON code_symbols(symbol_type);
CREATE INDEX IF NOT EXISTS idx_code_symbols_is_exported ON code_symbols(is_exported);

-- Code imports table - Track import/require relationships
CREATE TABLE IF NOT EXISTS code_imports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  source_file TEXT NOT NULL,  -- File that contains the import
  imported_symbol TEXT,  -- Specific symbol imported (null for * imports)
  imported_from TEXT NOT NULL,  -- Module path or file path
  import_type TEXT NOT NULL,  -- 'named', 'default', 'namespace', 'dynamic'
  line_number INTEGER,
  last_indexed DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create indexes for import queries
CREATE INDEX IF NOT EXISTS idx_code_imports_project_id ON code_imports(project_id);
CREATE INDEX IF NOT EXISTS idx_code_imports_source_file ON code_imports(source_file);
CREATE INDEX IF NOT EXISTS idx_code_imports_imported_symbol ON code_imports(imported_symbol);
CREATE INDEX IF NOT EXISTS idx_code_imports_imported_from ON code_imports(imported_from);

-- Code file metadata table - Track file changes for incremental index updates
CREATE TABLE IF NOT EXISTS code_file_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  last_modified DATETIME,  -- File system modification time
  file_size INTEGER,
  content_hash TEXT,  -- SHA-256 hash for change detection
  last_indexed DATETIME DEFAULT CURRENT_TIMESTAMP,
  index_status TEXT DEFAULT 'pending',  -- 'pending', 'indexed', 'error'
  error_message TEXT,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, file_path)
);

-- Create indexes for file metadata queries
CREATE INDEX IF NOT EXISTS idx_code_file_metadata_project_id ON code_file_metadata(project_id);
CREATE INDEX IF NOT EXISTS idx_code_file_metadata_file_path ON code_file_metadata(file_path);
CREATE INDEX IF NOT EXISTS idx_code_file_metadata_last_modified ON code_file_metadata(last_modified);
CREATE INDEX IF NOT EXISTS idx_code_file_metadata_index_status ON code_file_metadata(index_status);

-- Database version for migrations
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Set initial version (2 for code indexing support)
INSERT OR IGNORE INTO schema_version (version) VALUES (2);
