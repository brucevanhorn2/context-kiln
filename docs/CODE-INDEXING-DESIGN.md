# Code Indexing & Semantic Search Design

**Date**: 2026-01-15
**Context**: User observation - "AI needs the same tools I (Claude) use: grep, find, go-to-definition"

---

## The Problem

### What Context Kiln Currently Has (Phase B ✅)

**Basic file operations**:
- ✅ `read_file` - Read files by path (you tell AI what to read)
- ✅ `edit_file` - Edit files (requires exact path)
- ✅ `create_file` - Create new files
- ✅ `list_files` - List directory contents

**The gap**: AI is **blind** without search capabilities.

### What's Missing (Critical!)

**Search & exploration tools** (what Claude Code uses constantly):
- ❌ `search_files` - Grep-style text search ("find this pattern")
- ❌ `find_definition` - "Where is this function defined?"
- ❌ `find_usages` - "Where is this function called?"
- ❌ `find_importers` - "What imports this module?"
- ❌ `get_symbol_info` - "What's the signature of this function?"

### Real-World Impact

**Scenario**: "Fix the bug in calculateDiff"

**Without search** (current):
```
User: "Fix the bug in calculateDiff"

AI: "Let me check some likely files..."
Tool: read_file("src/utils/diffUtils.js")  // Guessing based on name
[Reads 205 lines, uses ~1,500 tokens]
AI: "Found it! Let me fix..."

Problems:
- ❌ Guessing wastes tokens (wrong file 30% of time)
- ❌ No way to find all usages (might break callers)
- ❌ Can't verify imports are correct
```

**With search + indexing** (proposed):
```
User: "Fix the bug in calculateDiff"

AI: "Let me find where it's defined..."
Tool: find_definition("calculateDiff")
[Index lookup: 50ms]
→ { file: "src/utils/diffUtils.js", line: 15, type: "function" }

AI: "Reading the function..."
Tool: read_file("src/utils/diffUtils.js", line_start: 15, line_end: 40)
[Reads 25 lines, uses ~200 tokens]

AI: "Let me check where it's used..."
Tool: find_usages("calculateDiff")
→ ["DiffPreviewModal.jsx:45", "ToolExecutionService.js:289"]

AI: "Fixing and verifying it won't break callers..."

Benefits:
- ✅ 87% token savings (200 vs 1,500)
- ✅ 10x faster (50ms vs 2+ seconds)
- ✅ 100% accuracy (no guessing)
- ✅ Can verify changes won't break callers
```

---

## Key Insight: WebStorm's Approach

### What WebStorm Does

**On project open**:
1. **Scans all source files**
2. **Builds symbol index**: Every function, class, variable, type
3. **Builds import graph**: What imports what
4. **Builds call graph**: What calls what
5. **Stores in database**: Fast lookups

**Result**: "Go to Definition" is instant (database lookup, not search)

### Why It's Fast

```javascript
// Without index (grep)
find_definition("calculateDiff")
→ Scans 1,000 files
→ Takes 2-5 seconds
→ CPU intensive

// With index (database query)
find_definition("calculateDiff")
→ SELECT * FROM symbols WHERE name = 'calculateDiff'
→ Takes 5-50ms
→ Instant
```

---

## Design: Three-Tier Approach

We'll build indexing in phases, each tier adding more power:

```
Tier 1: Basic Search (Phase B.5)
    ↓
Tier 2: Lightweight Index (Phase B.75)
    ↓
Tier 3: Full LSP Integration (Phase D.5)
```

---

## Tier 1: Basic Search Tools (Phase B.5)

**Goal**: AI can search, even without index
**Effort**: 2-3 hours
**Priority**: 🔥 CRITICAL - Do immediately

### Tools to Add

#### 1. search_files (grep wrapper)

**What it does**: Search file contents for pattern

**AI interface**:
```javascript
{
  type: "search_files",
  parameters: {
    pattern: "function calculateDiff",
    path: "src",           // Optional: directory to search
    regex: false,          // Optional: treat pattern as regex
    case_sensitive: false, // Optional: case sensitive
    file_pattern: "*.js"   // Optional: only search certain files
  }
}
```

**Response**:
```javascript
{
  success: true,
  matches: [
    {
      file: "src/utils/diffUtils.js",
      line: 15,
      column: 10,
      content: "function calculateDiff(oldContent, newContent) {"
    },
    {
      file: "src/components/DiffPreviewModal.jsx",
      line: 45,
      column: 20,
      content: "  const diff = calculateDiff(oldContent, newContent);"
    }
  ],
  count: 2,
  searched_files: 127,
  search_time_ms: 850
}
```

**Implementation** (ToolExecutionService.js):
```javascript
async executeSearchFiles(params, toolContext) {
  const {
    pattern,
    path = '.',
    regex = false,
    case_sensitive = false,
    file_pattern = null
  } = params;

  // Validate path
  const searchPath = this.validatePath(path);

  // Get all files to search
  const files = await this.findAllFiles(searchPath, file_pattern);

  const matches = [];
  let searchedFiles = 0;
  const startTime = Date.now();

  for (const file of files) {
    // Skip binary files, node_modules, etc.
    if (this.shouldSkipFile(file)) continue;

    searchedFiles++;

    const content = await fs.readFile(file, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      if (this.matchesPattern(line, pattern, regex, case_sensitive)) {
        matches.push({
          file: path.relative(this.projectRoot, file),
          line: index + 1,
          column: line.indexOf(pattern) + 1,
          content: line.trim()
        });
      }
    });
  }

  return {
    success: true,
    matches,
    count: matches.length,
    searched_files: searchedFiles,
    search_time_ms: Date.now() - startTime
  };
}

matchesPattern(text, pattern, isRegex, caseSensitive) {
  if (isRegex) {
    const flags = caseSensitive ? '' : 'i';
    const regex = new RegExp(pattern, flags);
    return regex.test(text);
  } else {
    if (caseSensitive) {
      return text.includes(pattern);
    } else {
      return text.toLowerCase().includes(pattern.toLowerCase());
    }
  }
}

shouldSkipFile(filePath) {
  const skipPatterns = [
    /node_modules/,
    /\.git/,
    /dist/,
    /build/,
    /\.min\.js$/,
    /\.map$/,
    /\.jpg$|\.png$|\.gif$|\.pdf$/
  ];

  return skipPatterns.some(pattern => pattern.test(filePath));
}
```

#### 2. find_files (enhanced file search)

**What it does**: Find files by name pattern (already have list_files, enhance it)

**AI interface**:
```javascript
{
  type: "find_files",
  parameters: {
    pattern: "*Service.js",  // Glob pattern
    path: "src",             // Optional: where to search
    type: "file"             // Optional: "file" or "directory"
  }
}
```

**Response**:
```javascript
{
  success: true,
  files: [
    "src/services/AIProviderService.js",
    "src/services/DatabaseService.js",
    "src/services/FileService.js",
    "src/services/SessionService.js",
    "src/services/TokenCounterService.js",
    "src/services/ToolExecutionService.js"
  ],
  count: 6
}
```

### AnthropicAdapter Tool Definitions

Add to `getToolDefinitions()`:

```javascript
{
  name: 'search_files',
  description: 'Search for a text pattern in files within the project. Use this to find where code is defined, used, or to locate specific patterns. Returns file paths, line numbers, and matching content.',
  input_schema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'The text or regex pattern to search for (e.g., "function calculateDiff" or "import.*DatabaseService")'
      },
      path: {
        type: 'string',
        description: 'Directory to search in (default: entire project)'
      },
      regex: {
        type: 'boolean',
        description: 'Whether pattern is a regular expression (default: false)'
      },
      case_sensitive: {
        type: 'boolean',
        description: 'Case sensitive search (default: false)'
      },
      file_pattern: {
        type: 'string',
        description: 'Only search files matching this glob pattern (e.g., "*.js" or "*.{ts,tsx}")'
      }
    },
    required: ['pattern']
  }
},
{
  name: 'find_files',
  description: 'Find files by name pattern using glob syntax. Use this to locate files when you know or can guess part of the filename.',
  input_schema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Glob pattern to match filenames (e.g., "*Service.js", "**/*.test.js")'
      },
      path: {
        type: 'string',
        description: 'Directory to search in (default: entire project)'
      },
      type: {
        type: 'string',
        enum: ['file', 'directory', 'any'],
        description: 'Type of filesystem entry to find (default: file)'
      }
    },
    required: ['pattern']
  }
}
```

### Benefits

- ✅ AI can now explore codebase
- ✅ No guessing required
- ✅ Works immediately (no index build time)
- ✅ Simple implementation (2-3 hours)

### Limitations

- ⚠️ Slow for large codebases (scans every file)
- ⚠️ High CPU usage
- ⚠️ No relationship understanding (can't find "all callers")

---

## Tier 2: Lightweight Index (Phase B.75)

**Goal**: 10x speed boost for 80% of queries
**Effort**: 3-4 hours
**Priority**: 🔥 HIGH - Do this week

### What to Index

**Symbol Index** (exports, top-level definitions):
```javascript
{
  "src/utils/diffUtils.js": {
    exports: ["calculateDiff", "applyEdit", "formatSideBySideDiff"],
    symbols: [
      { name: "calculateDiff", type: "function", line: 15 },
      { name: "applyEdit", type: "function", line: 45 },
      { name: "formatSideBySideDiff", type: "function", line: 89 }
    ],
    lastModified: "2026-01-15T10:30:00Z"
  }
}
```

**Import Index** (what imports what):
```javascript
{
  "src/components/DiffPreviewModal.jsx": {
    imports: [
      { symbol: "calculateDiff", from: "../utils/diffUtils" },
      { symbol: "Modal", from: "antd" }
    ]
  }
}
```

### Database Schema

Add to `src/database/schema.sql`:

```sql
-- Symbol index table
CREATE TABLE IF NOT EXISTS code_symbols (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  symbol_name TEXT NOT NULL,
  symbol_type TEXT NOT NULL, -- 'function', 'class', 'variable', 'constant'
  line_number INTEGER,
  is_exported BOOLEAN DEFAULT 0,
  documentation TEXT, -- JSDoc or docstring
  signature TEXT, -- For functions: "(param1, param2)"
  last_indexed DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);

CREATE INDEX idx_symbols_name ON code_symbols(symbol_name);
CREATE INDEX idx_symbols_file ON code_symbols(file_path);
CREATE INDEX idx_symbols_project ON code_symbols(project_id);

-- Import relationships table
CREATE TABLE IF NOT EXISTS code_imports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  source_file TEXT NOT NULL,        -- File doing the import
  imported_symbol TEXT,              -- What's being imported
  imported_from TEXT NOT NULL,       -- Module path
  line_number INTEGER,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);

CREATE INDEX idx_imports_source ON code_imports(source_file);
CREATE INDEX idx_imports_symbol ON code_imports(imported_symbol);
CREATE INDEX idx_imports_from ON code_imports(imported_from);

-- File metadata table (for incremental updates)
CREATE TABLE IF NOT EXISTS code_file_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  last_modified DATETIME,
  file_size INTEGER,
  last_indexed DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(project_id) REFERENCES projects(id),
  UNIQUE(project_id, file_path)
);
```

### CodeIndexService Implementation

**File**: `src/services/CodeIndexService.js`

```javascript
const fs = require('fs').promises;
const path = require('path');

class CodeIndexService {
  constructor(databaseService) {
    this.db = databaseService;
  }

  /**
   * Build index for entire project
   */
  async buildIndex(projectRoot, projectId) {
    console.log(`Building code index for project: ${projectRoot}`);
    const startTime = Date.now();

    // Find all source files
    const files = await this.findSourceFiles(projectRoot);
    console.log(`Found ${files.length} source files`);

    // Clear old index for this project
    await this.clearProjectIndex(projectId);

    // Index each file
    let indexed = 0;
    for (const file of files) {
      try {
        await this.indexFile(file, projectRoot, projectId);
        indexed++;

        if (indexed % 100 === 0) {
          console.log(`Indexed ${indexed}/${files.length} files...`);
        }
      } catch (error) {
        console.error(`Failed to index ${file}:`, error);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`Index built in ${duration}ms (${indexed} files)`);

    return { filesIndexed: indexed, durationMs: duration };
  }

  /**
   * Index a single file (incremental update)
   */
  async indexFile(filePath, projectRoot, projectId) {
    const content = await fs.readFile(filePath, 'utf-8');
    const relativePath = path.relative(projectRoot, filePath);
    const ext = path.extname(filePath);

    // Extract symbols based on file type
    let symbols = [];
    let imports = [];

    if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
      symbols = this.extractJavaScriptSymbols(content);
      imports = this.extractJavaScriptImports(content);
    } else if (ext === '.py') {
      symbols = this.extractPythonSymbols(content);
      imports = this.extractPythonImports(content);
    }

    // Store symbols in database
    for (const symbol of symbols) {
      await this.db.db.run(
        `INSERT INTO code_symbols (project_id, file_path, symbol_name, symbol_type, line_number, is_exported, signature)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [projectId, relativePath, symbol.name, symbol.type, symbol.line, symbol.exported, symbol.signature]
      );
    }

    // Store imports
    for (const imp of imports) {
      await this.db.db.run(
        `INSERT INTO code_imports (project_id, source_file, imported_symbol, imported_from, line_number)
         VALUES (?, ?, ?, ?, ?)`,
        [projectId, relativePath, imp.symbol, imp.from, imp.line]
      );
    }

    // Update file metadata
    const stats = await fs.stat(filePath);
    await this.db.db.run(
      `INSERT OR REPLACE INTO code_file_metadata (project_id, file_path, last_modified, file_size)
       VALUES (?, ?, ?, ?)`,
      [projectId, relativePath, stats.mtime.toISOString(), stats.size]
    );
  }

  /**
   * Extract JavaScript/TypeScript symbols
   */
  extractJavaScriptSymbols(content) {
    const symbols = [];
    const lines = content.split('\n');

    // Regex patterns for different symbol types
    const patterns = {
      function: /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/g,
      class: /(?:export\s+)?class\s+(\w+)/g,
      const: /(?:export\s+)?const\s+(\w+)\s*=/g,
      variable: /(?:export\s+)?(?:let|var)\s+(\w+)\s*=/g
    };

    lines.forEach((line, index) => {
      for (const [type, pattern] of Object.entries(patterns)) {
        const matches = [...line.matchAll(pattern)];
        for (const match of matches) {
          symbols.push({
            name: match[1],
            type: type,
            line: index + 1,
            exported: line.includes('export'),
            signature: this.extractSignature(line, match[1])
          });
        }
      }
    });

    return symbols;
  }

  /**
   * Extract JavaScript/TypeScript imports
   */
  extractJavaScriptImports(content) {
    const imports = [];
    const lines = content.split('\n');

    const importPattern = /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
    const requirePattern = /const\s+(?:{([^}]+)}|(\w+))\s*=\s*require\(['"]([^'"]+)['"]\)/g;

    lines.forEach((line, index) => {
      // ES6 imports
      const importMatches = [...line.matchAll(importPattern)];
      for (const match of importMatches) {
        const symbols = match[1] ? match[1].split(',').map(s => s.trim()) : [match[2]];
        const from = match[3];

        for (const symbol of symbols) {
          imports.push({
            symbol: symbol.replace(/\s+as\s+\w+/, '').trim(),
            from: from,
            line: index + 1
          });
        }
      }

      // CommonJS requires
      const requireMatches = [...line.matchAll(requirePattern)];
      for (const match of requireMatches) {
        const symbols = match[1] ? match[1].split(',').map(s => s.trim()) : [match[2]];
        const from = match[3];

        for (const symbol of symbols) {
          imports.push({
            symbol: symbol.trim(),
            from: from,
            line: index + 1
          });
        }
      }
    });

    return imports;
  }

  extractSignature(line, name) {
    const match = line.match(new RegExp(`${name}\\s*\\(([^)]*)\\)`));
    return match ? `(${match[1]})` : null;
  }

  /**
   * Find symbol definition
   */
  async findDefinition(projectId, symbolName) {
    const rows = await this.db.db.all(
      `SELECT file_path, symbol_type, line_number, signature
       FROM code_symbols
       WHERE project_id = ? AND symbol_name = ?
       ORDER BY is_exported DESC, line_number ASC
       LIMIT 1`,
      [projectId, symbolName]
    );

    return rows[0] || null;
  }

  /**
   * Find all files that import a symbol
   */
  async findImporters(projectId, symbolName) {
    const rows = await this.db.db.all(
      `SELECT DISTINCT source_file, line_number
       FROM code_imports
       WHERE project_id = ? AND imported_symbol = ?
       ORDER BY source_file`,
      [projectId, symbolName]
    );

    return rows;
  }

  /**
   * Find all symbols exported from a file
   */
  async getFileExports(projectId, filePath) {
    const rows = await this.db.db.all(
      `SELECT symbol_name, symbol_type, line_number, signature
       FROM code_symbols
       WHERE project_id = ? AND file_path = ? AND is_exported = 1
       ORDER BY line_number`,
      [projectId, filePath]
    );

    return rows;
  }

  async findSourceFiles(projectRoot) {
    // Recursively find all source files
    const files = [];

    const walk = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip node_modules, .git, etc.
        if (this.shouldSkipDirectory(entry.name)) continue;

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (this.isSourceFile(entry.name)) {
          files.push(fullPath);
        }
      }
    };

    await walk(projectRoot);
    return files;
  }

  shouldSkipDirectory(name) {
    return ['node_modules', '.git', 'dist', 'build', 'coverage'].includes(name);
  }

  isSourceFile(name) {
    const ext = path.extname(name);
    return ['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.rs', '.java'].includes(ext);
  }

  async clearProjectIndex(projectId) {
    await this.db.db.run('DELETE FROM code_symbols WHERE project_id = ?', [projectId]);
    await this.db.db.run('DELETE FROM code_imports WHERE project_id = ?', [projectId]);
    await this.db.db.run('DELETE FROM code_file_metadata WHERE project_id = ?', [projectId]);
  }
}

module.exports = CodeIndexService;
```

### New AI Tools (Using Index)

Add to ToolExecutionService.js:

```javascript
async executeFindDefinition(params) {
  const { symbol_name } = params;

  // Get project ID from current project root
  const project = await this.databaseService.getOrCreateProject(this.projectRoot);

  // Query index
  const result = await this.codeIndexService.findDefinition(project.id, symbol_name);

  if (result) {
    return {
      success: true,
      found: true,
      file: result.file_path,
      line: result.line_number,
      type: result.symbol_type,
      signature: result.signature
    };
  } else {
    // Fallback to grep search
    return await this.executeSearchFiles({ pattern: symbol_name });
  }
}

async executeFindImporters(params) {
  const { symbol_name } = params;

  const project = await this.databaseService.getOrCreateProject(this.projectRoot);
  const results = await this.codeIndexService.findImporters(project.id, symbol_name);

  return {
    success: true,
    count: results.length,
    files: results.map(r => ({
      file: r.source_file,
      line: r.line_number
    }))
  };
}
```

### Build Index on Project Open

**In main.js**:

```javascript
// When folder is opened
ipcMain.handle('folder:opened', async (event, folderPath) => {
  try {
    // Get or create project
    const project = await databaseService.getOrCreateProject(folderPath);

    // Check if index needs rebuilding
    const needsRebuild = await codeIndexService.needsRebuild(project.id, folderPath);

    if (needsRebuild) {
      // Build index in background
      event.sender.send('index:building', { projectId: project.id });

      await codeIndexService.buildIndex(folderPath, project.id);

      event.sender.send('index:complete', { projectId: project.id });
    }

    return { success: true, project };
  } catch (error) {
    console.error('Failed to open folder:', error);
    throw error;
  }
});
```

### Benefits

- ✅ 10x faster than grep (50ms vs 2000ms)
- ✅ Covers 80% of use cases
- ✅ Incremental updates (only re-index changed files)
- ✅ Modest complexity (4 hours to implement)

### Limitations

- ⚠️ No "find usages" for non-imported symbols
- ⚠️ No type information
- ⚠️ Regex-based (can miss complex patterns)

---

## Tier 3: Full LSP Integration (Phase D.5)

**Goal**: WebStorm-level accuracy and features
**Effort**: 8-10 hours
**Priority**: 🟡 MEDIUM - After Phase C & D complete

### What is LSP?

**Language Server Protocol**:
- Standard protocol used by VS Code, WebStorm, Vim, etc.
- Language-specific servers that understand code semantics
- Provides: definitions, usages, hover info, completions, diagnostics

### Available Language Servers

| Language | Server | Package |
|----------|--------|---------|
| TypeScript | typescript-language-server | `typescript-language-server` |
| JavaScript | typescript-language-server | (same) |
| Python | Pylance / Pyright | `pyright` |
| Go | gopls | `gopls` |
| Rust | rust-analyzer | `rust-analyzer` |
| Java | Eclipse JDT LS | (complex) |

### Architecture

```javascript
// LSPService manages language servers
class LSPService {
  constructor() {
    this.servers = {}; // { language: serverProcess }
  }

  async startServer(language, projectRoot) {
    if (language === 'typescript') {
      this.servers.typescript = new TypeScriptLSP(projectRoot);
      await this.servers.typescript.initialize();
    }
  }

  async findDefinition(file, position, language) {
    const server = this.servers[language];
    return await server.findDefinition(file, position);
  }

  async findUsages(file, position, language) {
    const server = this.servers[language];
    return await server.findReferences(file, position);
  }
}
```

### New AI Tools (LSP-powered)

```javascript
// find_definition - Now with LSP accuracy
async executeFindDefinition(params) {
  const { symbol_name, file, line, column } = params;

  // Use LSP if available
  if (this.lspService.hasServer('typescript')) {
    const result = await this.lspService.findDefinition(file, { line, column }, 'typescript');
    return { success: true, ...result };
  }

  // Fallback to index
  return await this.executeFindDefinitionFromIndex(symbol_name);
}

// find_usages - All references
async executeFindUsages(params) {
  const { symbol_name, include_declarations = true } = params;

  // Use LSP
  const result = await this.lspService.findUsages(symbol_name);

  return {
    success: true,
    usages: result.map(r => ({
      file: r.file,
      line: r.line,
      column: r.column,
      context: r.lineContent
    }))
  };
}

// get_symbol_info - Full signature + docs
async executeGetSymbolInfo(params) {
  const { symbol_name } = params;

  const result = await this.lspService.hover(symbol_name);

  return {
    success: true,
    name: result.name,
    type: result.type,
    signature: result.signature,
    documentation: result.documentation,
    return_type: result.returnType
  };
}

// find_implementations - All classes that extend/implement
async executeFindImplementations(params) {
  const { interface_name } = params;

  const result = await this.lspService.findImplementations(interface_name);

  return {
    success: true,
    implementations: result
  };
}
```

### Benefits

- ✅ 100% accurate (understands types, imports, scopes)
- ✅ Find usages works perfectly
- ✅ Type information available
- ✅ Industry-standard protocol

### Limitations

- ⚠️ Complex setup (need server binary per language)
- ⚠️ Memory overhead (server processes)
- ⚠️ Slower initial indexing than lightweight approach

---

## Implementation Roadmap

### Immediate (Phase B.5) - 2-3 hours

**This Week**:
1. ✅ Add `search_files` tool (1 hour)
2. ✅ Add `find_files` enhancement (30 min)
3. ✅ Update AnthropicAdapter definitions (30 min)
4. ✅ Test with real searches (30 min)

**Result**: AI can search codebase

---

### Near-Term (Phase B.75) - 3-4 hours

**This Week**:
1. ✅ Create `code_symbols`, `code_imports` tables (30 min)
2. ✅ Build CodeIndexService (2 hours)
3. ✅ Add `find_definition` tool (30 min)
4. ✅ Add `find_importers` tool (30 min)
5. ✅ Build index on project open (30 min)

**Result**: 10x faster symbol lookups

---

### Future (Phase D.5) - 8-10 hours

**After Phase C & D**:
1. ⏳ Install typescript-language-server (1 hour)
2. ⏳ Create LSPService wrapper (2 hours)
3. ⏳ Integrate with find_definition (1 hour)
4. ⏳ Add find_usages via LSP (1 hour)
5. ⏳ Add get_symbol_info (1 hour)
6. ⏳ Add find_implementations (1 hour)
7. ⏳ Python LSP support (2 hours)

**Result**: WebStorm-level code intelligence

---

## Performance Comparison

| Operation | Tier 1 (Grep) | Tier 2 (Index) | Tier 3 (LSP) |
|-----------|---------------|----------------|--------------|
| **Find definition** | 2-5 sec | 50ms | 10ms |
| **Find usages** | 5-10 sec | Not available | 50ms |
| **Accuracy** | 70-80% | 85-90% | 99% |
| **Type info** | No | No | Yes |
| **Memory** | Low | Low | Medium |
| **Setup time** | 0ms | 5-30 sec | 10-60 sec |

---

## User Experience

### Project Open (with index)

```
User: Opens project folder

Context Kiln:
  → "Building code index... (524 files)"
  → Progress bar: 0% → 100%
  → "Index complete! (12.5 seconds)"

[AI can now instantly find symbols]
```

### Search Tools in Action

**Scenario**: "Refactor AIProviderService"

```
User: "Refactor AIProviderService to use dependency injection"

AI thinks:
  1. Where is AIProviderService defined?
     Tool: find_definition("AIProviderService")
     → src/services/AIProviderService.js:23

  2. What files import it?
     Tool: find_importers("AIProviderService")
     → [main.js:6, ClaudeContext.jsx:4]

  3. Read the class definition
     Tool: read_file("src/services/AIProviderService.js", line_start: 23, line_end: 100)

  4. Read instantiation sites
     Tool: read_file("src/main.js", line_start: 170, line_end: 180)

  5. Make coordinated edits
     Tool: edit_file(...) × 3 files

Result: Accurate refactor in 5 seconds, minimal tokens
```

---

## Testing Strategy

### Phase B.5 Tests

**Search accuracy**:
- [ ] Find function definitions
- [ ] Find class declarations
- [ ] Find import statements
- [ ] Handle regex patterns
- [ ] Case-insensitive search
- [ ] File pattern filtering

**Performance**:
- [ ] Search 1,000 files in <3 seconds
- [ ] Skip binary files
- [ ] Skip node_modules

---

### Phase B.75 Tests

**Index build**:
- [ ] Index 500 files in <30 seconds
- [ ] Detect and index exports
- [ ] Detect and index imports
- [ ] Handle syntax errors gracefully

**Index queries**:
- [ ] find_definition accuracy >85%
- [ ] find_definition speed <100ms
- [ ] find_importers correct results
- [ ] Incremental updates work

---

### Phase D.5 Tests

**LSP integration**:
- [ ] Server starts on project open
- [ ] find_definition 99% accurate
- [ ] find_usages finds all references
- [ ] get_symbol_info returns docs
- [ ] find_implementations works for interfaces
- [ ] Works across multiple files

---

## Security Considerations

### Path Validation

All search paths must be validated:

```javascript
validateSearchPath(searchPath) {
  const resolved = path.resolve(this.projectRoot, searchPath);

  // Ensure within project root
  if (!resolved.startsWith(this.projectRoot)) {
    throw new Error('Security: Search path outside project root');
  }

  return resolved;
}
```

### File Size Limits

Don't index or search huge files:

```javascript
async indexFile(filePath, ...) {
  const stats = await fs.stat(filePath);

  // Skip files >5MB
  if (stats.size > 5 * 1024 * 1024) {
    console.log(`Skipping large file: ${filePath} (${stats.size} bytes)`);
    return;
  }

  // ...index normally
}
```

### Command Injection (for LSP)

When spawning LSP server processes, sanitize inputs:

```javascript
async startLSPServer(language, projectRoot) {
  // Validate projectRoot is safe
  if (!/^[a-zA-Z0-9/_\-. ]+$/.test(projectRoot)) {
    throw new Error('Invalid project root path');
  }

  // Use execFile (not exec) to avoid shell injection
  const server = spawn('typescript-language-server', ['--stdio'], {
    cwd: projectRoot,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  return server;
}
```

---

## Open Questions

### Technical

1. **Index Storage**: SQLite vs in-memory?
   - **Recommendation**: SQLite (persistent across restarts)

2. **Incremental Updates**: Watch files or on-demand?
   - **Recommendation**: Watch files (chokidar) + rebuild on demand

3. **Multiple Languages**: One index or separate per language?
   - **Recommendation**: One unified index, `language` column

4. **LSP Overhead**: Keep servers running or start on-demand?
   - **Recommendation**: Keep running, restart on project switch

### Product

1. **Index Build UX**: Block or allow chat during indexing?
   - **Recommendation**: Allow chat, show "indexing..." indicator

2. **Rebuild Trigger**: Manual button or automatic detection?
   - **Recommendation**: Both (auto on file changes, manual button)

3. **Index Limits**: Max project size to index?
   - **Recommendation**: Warn at 10,000 files, allow override

---

## Success Metrics

### Phase B.5 Success
- [ ] AI can find function definitions (grep)
- [ ] Search completes in <5 seconds for 1,000 files
- [ ] Zero false positives for exact matches
- [ ] User reports: "AI found the code I needed"

### Phase B.75 Success
- [ ] Index builds in <60 seconds for 2,000 files
- [ ] find_definition 10x faster than grep (50ms vs 2000ms)
- [ ] find_definition accuracy >85%
- [ ] User reports: "Search is really fast now"

### Phase D.5 Success
- [ ] LSP find_definition 99% accurate
- [ ] find_usages finds all references
- [ ] Zero false positives
- [ ] Works across TypeScript, Python, Go
- [ ] User reports: "As good as WebStorm"

---

## References

### LSP Specification
- https://microsoft.github.io/language-server-protocol/

### Language Servers
- TypeScript: https://github.com/typescript-language-server/typescript-language-server
- Python (Pyright): https://github.com/microsoft/pyright
- Go (gopls): https://github.com/golang/tools/tree/master/gopls

### Existing Implementations
- VS Code LSP client: https://github.com/microsoft/vscode-languageserver-node
- coc.nvim (Vim): https://github.com/neoclide/coc.nvim

---

**Document Status**: Complete design spec
**Last Updated**: 2026-01-15
**Next Steps**: Implement Phase B.5 (search tools) tonight
