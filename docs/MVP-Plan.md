# Context Kiln - MVP Implementation Plan

## Executive Summary

Context Kiln is an Electron-based desktop application designed for AI-powered software engineering. Unlike traditional IDEs with small chat windows, Context Kiln makes the conversation with AI the primary interface, providing a dedicated environment for agentic AI-driven development.

**Current Status**: Basic three-pane layout with file browser, simulated chat, and context file management with drag-and-drop functionality.

**MVP Goal**: Transform Context Kiln into a fully functional AI coding assistant with Claude API integration, file editing capabilities, comprehensive token tracking, and configurable layouts.

---

## Core Vision

Context Kiln is a **context engineering tool** that enables developers to:
1. Have natural conversations with AI models (starting with Claude)
2. Provide rich context by dragging files into conversations
3. Edit files directly within the tool using a lightweight editor
4. Track and budget token usage across projects and API keys
5. Customize the workspace layout for different monitor configurations
6. **Maximize context window efficiency** by documenting to session files rather than keeping everything in message history

**Key Architectural Principle**: Unlike traditional chat tools that rely solely on message history (quickly filling the context window), Context Kiln uses **session files** to document decisions, summaries, and information as the conversation progresses. This keeps the active context lean and focused, enabling long-running sessions without hitting token limits.

**Target Users**: Software engineers who want a chat-first interface for AI-assisted development, with easy context management, token budgeting, and the ability to work on complex, long-running tasks without context limitations.

---

## MVP Feature Set

### 1. Real Claude API Integration ⭐ Must-Have
**Status**: Not implemented (currently simulated)

**Capabilities**:
- Connect to Anthropic's Claude API (Opus 4.5, Sonnet 3.7, Haiku 3.5)
- Stream responses in real-time with typing animation
- Inject context files into prompts automatically
- Support for stopping mid-stream
- Error handling and retry logic

**Implementation**:
- **Adapter Pattern**: AIProviderService with pluggable provider adapters
- Provider-specific adapters (AnthropicAdapter, OpenAIAdapter, OllamaAdapter)
- Internal API-agnostic context representation
- React Context Provider for chat state management
- IPC streaming for real-time response display
- Provider-specific context formatting (markdown for Claude, adaptable for others)

### 2. File Editor with Syntax Highlighting ⭐ Must-Have
**Status**: Not implemented

**Capabilities**:
- Double-click files in file tree or context list to open in editor
- VS Code-quality syntax highlighting via Monaco Editor
- Support for 60+ languages (JavaScript, TypeScript, Python, etc.)
- Tabbed interface for multiple open files
- Save functionality (Ctrl+S)
- Dirty state indicators (unsaved changes)

**Implementation**:
- Monaco Editor (`@monaco-editor/react`)
- EditorContext for managing open files
- FileService in main process for file I/O
- CenterPanel component with Ant Design Tabs

### 3. Configurable Pane Layouts ⭐ Must-Have
**Status**: Fixed three-pane layout

**Capabilities**:
- **Default Layout**: File tree (left) | Chat/Editor (center) | Context tools (right)
- **Horizontal Split** (recommended): Chat above, editor tabs below in center pane
- **Vertical Split**: For ultrawide monitors, all panes side-by-side
- **Preset Selection**: Dropdown menu to switch layouts
- **Persistence**: Save layout preference per user

**Implementation**:
- Layout preset system using Ant Design Splitter
- Settings stored in LocalStorage via electron-store
- Layout schema with pane visibility and sizing

### 4. API Key Management ⭐ Must-Have
**Status**: Not implemented

**Capabilities**:
- Securely store multiple API keys
- Name and manage API keys (add, delete, set active)
- Test API key validity with a test request
- Model selection (Opus, Sonnet, Haiku)
- View pricing per model

**Implementation**:
- electron-store with OS keychain integration
- Settings modal UI (File > Settings or Ctrl+,)
- Encrypted storage for sensitive data
- SettingsContext for managing configuration

### 5. Token Tracking and Budgeting ⭐ Must-Have
**Status**: Not implemented

**Capabilities**:
- **Per-Project Tracking**: Token usage for current opened folder
- **Per-API-Key Tracking**: Usage across all projects per API key
- **Session Tracking**: Current session only (resets on app restart)
- **Persistent Global Tracking**: All-time usage history with database
- **Cost Calculation**: Real-time cost estimation based on model pricing
- **Budget Alerts**: Warnings when approaching limits (future enhancement)
- **Usage Dashboard**: Visual charts and statistics

**Implementation**:
- SQLite database (`better-sqlite3`) for persistent storage
- DatabaseService in main process
- UsageTrackingContext for real-time UI updates
- Usage dashboard tab in ContextTools panel

### 6. Session Management ⭐ Must-Have
**Status**: Not implemented

**Capabilities**:
- **Named Sessions**: User-friendly session names (e.g., "Fix auth bug", "Refactor components")
- **Session Persistence**: Sessions stored at `<project>/.context-kiln/sessions/<session-name>/`
- **Session Files**: Document decisions, summaries, and context as conversation progresses
- **Context Window Optimization**: Archive older messages to session files, keep active context lean
- **Session Switching**: Create new sessions, switch between sessions, resume previous sessions
- **Session Metadata**: Track session creation date, last accessed, associated project
- **Session History**: Browse and search past sessions within a project

**Session File Structure**:
```
<project-folder>/.context-kiln/
└── sessions/
    ├── fix-auth-bug/               # User-friendly folder name
    │   ├── session.json            # Session metadata (UUID, name, created, model)
    │   ├── context.md              # Current context summary
    │   ├── decisions.md            # Key decisions made during session
    │   ├── conversation-history/   # Archived conversation parts
    │   │   ├── part-001.json       # Older message history
    │   │   └── part-002.json
    │   └── artifacts/              # Files created during session
    │       ├── notes.md
    │       └── code-snippets.txt
    └── refactor-components/
        └── ...
```

**Implementation**:
- SessionService in main process for file operations
- SessionContext in renderer for session state
- Database `sessions` table linking UUID to folder path
- Session selector in header (dropdown with recent sessions)
- "New Session" and "Archive Session" commands in File menu
- Automatic context archiving when reaching 100k tokens (configurable)

**Benefits**:
- Long-running tasks don't hit 200k token limit
- Sessions can span multiple days/weeks
- Easy to reference past decisions without cluttering context
- Natural organization by task/ticket (e.g., "JIRA-1234-fix-login")

---

## Technical Architecture

### Technology Stack

**Core Framework**:
- Electron 27.0.0 (main + renderer processes)
- React 19.2.3 with React DOM
- Ant Design 6.1.4 (UI components)

**New Dependencies for MVP**:
- `@anthropic-ai/sdk` - Official Claude API client
- `@monaco-editor/react` - VS Code editor component
- `better-sqlite3` - SQLite database for token tracking
- `electron-store` - Secure settings and API key storage
- `tiktoken` - Token counting for cost estimation
- `monaco-editor-webpack-plugin` - Monaco bundling support

**Optional but Recommended**:
- `markdown-it` - Render markdown in chat responses
- `prismjs` - Code syntax highlighting in chat
- `date-fns` - Date formatting for usage reports

### Architecture Pattern

**Main Process (Node.js)**:
- **Core Services**: AIProviderService, DatabaseService, FileService, SettingsService, SessionService
- **Provider Adapters**: AnthropicAdapter, OpenAIAdapter, OllamaAdapter (pluggable)
- IPC handlers for renderer communication
- File system access and API requests
- SQLite database operations
- Session file management (create, read, archive, switch)

**Renderer Process (React)**:
- Context Providers: ClaudeContext, EditorContext, SettingsContext, UsageTrackingContext, SessionContext
- Components: Layout, CenterPanel, EditorTab, SettingsModal, UsageTracker, SessionSelector
- IPC client for communicating with main process

**Design Patterns**:
- **Adapter Pattern**: Decouple internal context format from provider-specific API formats
- **Facade Pattern**: AIProviderService provides unified interface for all providers
- **Strategy Pattern**: Pluggable adapters allow runtime provider switching

**Security**:
- Context isolation enabled
- Preload script as secure bridge
- API keys stored in OS keychain when possible
- No direct Node.js access from renderer

### Multi-Session Development Strategy

**Philosophy**: Context Kiln development may span multiple sessions across different computers. Follow these practices:

**Documentation Requirements**:
1. **Decision Records**: Document all architectural decisions in `docs/decisions/`
2. **Session Notes**: Keep implementation notes in session files (use Context Kiln to build Context Kiln!)
3. **Code Comments**: Liberal JSDoc comments explaining "why", not just "what"
4. **README Updates**: Keep README current with setup instructions and architecture overview
5. **Git Commits**: Detailed commit messages explaining rationale

**Key Documentation Files**:
```
docs/
├── MVP-Plan.md                    # This file - comprehensive plan
├── Architecture.md                # Deep dive on adapter pattern, service layer
├── API-Adapters.md                # How to create new provider adapters
├── Session-Management.md          # Session file structure and workflows
├── decisions/                     # Architectural Decision Records (ADRs)
│   ├── 001-adapter-pattern.md     # Why we chose adapter pattern
│   ├── 002-session-files.md       # Session file structure decisions
│   └── 003-token-tracking.md      # Token tracking approach
└── dev-notes/                     # Session-specific development notes
    └── 2026-01-13-mvp-planning.md
```

**Why This Matters**:
- Work may be interrupted for days/weeks
- Multiple developers may contribute
- Context Kiln sessions themselves provide continuity
- Future you needs to understand past decisions

**Session File Usage**:
- Create Context Kiln sessions for Context Kiln development
- Document decisions as we implement
- Use our own tool to manage context window
- "Eat our own dog food" from day one

### File Structure

```
context-kiln/
├── docs/
│   └── MVP-Plan.md                          [THIS FILE]
├── src/
│   ├── main.js                              [MODIFY] IPC handlers
│   ├── preload.js                           [MODIFY] Expose IPC methods
│   ├── Layout.jsx                           [MODIFY] Add contexts, CenterPanel
│   ├── ChatInterface.jsx                    [MODIFY] Connect to Claude API
│   ├── FileTree.jsx                         [MODIFY] Add double-click
│   ├── ContextTools.jsx                     [MODIFY] Add usage tab
│   │
│   ├── services/                            [NEW]
│   │   ├── AIProviderService.js             Unified AI provider interface (facade)
│   │   ├── DatabaseService.js               SQLite operations
│   │   ├── FileService.js                   File read/write
│   │   ├── TokenCounterService.js           Token estimation
│   │   ├── SessionService.js                Session file management
│   │   └── adapters/                        [NEW] Provider adapters
│   │       ├── AnthropicAdapter.js          Claude API adapter
│   │       ├── OpenAIAdapter.js             OpenAI API adapter
│   │       ├── OllamaAdapter.js             Ollama local models adapter
│   │       └── BaseAdapter.js               Abstract base adapter interface
│   │
│   ├── contexts/                            [NEW]
│   │   ├── ClaudeContext.jsx                Chat state management
│   │   ├── EditorContext.jsx                Open files state
│   │   ├── SettingsContext.jsx              App settings
│   │   ├── UsageTrackingContext.jsx         Token tracking
│   │   └── SessionContext.jsx               Session management
│   │
│   ├── components/                          [NEW]
│   │   ├── CenterPanel.jsx                  Tabbed chat/editor
│   │   ├── EditorTab.jsx                    Monaco wrapper
│   │   ├── SettingsModal.jsx                API keys & config
│   │   ├── UsageTracker.jsx                 Token dashboard
│   │   └── SessionSelector.jsx              Session dropdown & controls
│   │
│   ├── database/                            [NEW]
│   │   ├── schema.sql                       Database schema
│   │   └── migrations/                      Schema updates
│   │
│   └── utils/                               [NEW]
│       ├── constants.js                     Model pricing, limits
│       ├── formatters.js                    Message formatting
│       └── validators.js                    Input validation
│
├── package.json                             [MODIFY] Add dependencies
└── webpack.config.js                        [MODIFY] Monaco config
```

---

## Component Architecture

### State Management Flow

```
┌───────────────────────────────────────────────────────────┐
│                     Layout.jsx                             │
│                  (Root Component)                          │
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Context Providers:                               │    │
│  │  - SettingsContext (API keys, model selection)   │    │
│  │  - SessionContext (current session, switching)   │    │
│  │  - ClaudeContext (chat, messages, streaming)     │    │
│  │  - EditorContext (open files, dirty state)       │    │
│  │  - UsageTrackingContext (token usage, costs)     │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ FileTree │  │ CenterPanel  │  │ ContextTools │       │
│  │          │  │ ┌──────────┐ │  │              │       │
│  │ Browse   │  │ │Chat Tab  │ │  │ Context List │       │
│  │ Drag     │  │ ├──────────┤ │  │ Summary      │       │
│  │ Select   │  │ │Editor 1  │ │  │ Usage Stats  │       │
│  │          │  │ ├──────────┤ │  │              │       │
│  │          │  │ │Editor 2  │ │  │              │       │
│  └──────────┘  └─└──────────┘─┘  └──────────────┘       │
└───────────────────────────────────────────────────────────┘
                         │
                         │ IPC Communication
                         ▼
┌────────────────────────────────────────────────────────────────┐
│              Main Process (main.js)                             │
│                                                                 │
│  ┌──────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │AIProviderService │  │DatabaseService │  │FileService   │  │
│  │- sendMessage     │  │- recordUsage   │  │- readFile    │  │
│  │- streamResponse  │  │- getHistory    │  │- saveFile    │  │
│  │- getProviders    │  └────────────────┘  └──────────────┘  │
│  └────────┬─────────┘                                          │
│           │                                                    │
│           │ uses                                               │
│           ▼                                                    │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  Provider Adapters (Strategy Pattern)               │     │
│  │  ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │     │
│  │  │Anthropic     │ │OpenAI        │ │Ollama       │ │     │
│  │  │Adapter       │ │Adapter       │ │Adapter      │ │     │
│  │  │- formatReq   │ │- formatReq   │ │- formatReq  │ │     │
│  │  │- parseResp   │ │- parseResp   │ │- parseResp  │ │     │
│  │  └──────────────┘ └──────────────┘ └─────────────┘ │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                                 │
│  ┌───────────────┐                                             │
│  │SessionService │                                             │
│  │- createSession│                                             │
│  │- loadSession  │                                             │
│  │- archiveOld   │                                             │
│  └───────────────┘                                             │
└────────────────────────────────────────────────────────────────┘
```

### Key Context APIs

**ClaudeContext**:
```javascript
{
  messages: [{id, type, content, timestamp}],
  isStreaming: boolean,
  currentModel: string,
  sendMessage(content, contextFiles): Promise<void>,
  stopStreaming(): void,
  clearHistory(): void
}
```

**EditorContext**:
```javascript
{
  openFiles: [{path, content, isDirty, language}],
  activeFileIndex: number,
  openFile(filePath): Promise<void>,
  closeFile(filePath): void,
  saveFile(filePath, content): Promise<void>,
  markDirty(filePath, isDirty): void
}
```

**SessionContext**:
```javascript
{
  currentSession: {id, name, uuid, folderPath, createdAt, lastAccessed},
  availableSessions: [{id, name, uuid, createdAt, lastAccessed}],
  createSession(name): Promise<void>,
  loadSession(sessionId): Promise<void>,
  renameSession(sessionId, newName): Promise<void>,
  archiveSession(sessionId): Promise<void>,
  archiveOldMessages(threshold): Promise<void>,  // Archive when > threshold tokens
  saveToSessionFile(filename, content): Promise<void>
}
```

---

## User Workflows

### Workflow 1: Having a Conversation with Claude

1. User opens Context Kiln
2. Opens a folder via File > Open Folder
3. Drags relevant files from file tree to context list (right pane)
4. Types a question in the chat input: "How can I refactor this component?"
5. System formats context files as XML and sends to Claude API
6. Response streams in real-time with typing animation
7. Token usage is recorded and displayed in usage dashboard
8. User can continue the conversation with context preserved

### Workflow 2: Editing a File

1. User double-clicks a file in the file tree or context list
2. File opens in new editor tab in center pane (below or next to chat)
3. Monaco Editor provides syntax highlighting based on file extension
4. User makes changes (tab shows dirty indicator)
5. User presses Ctrl+S to save
6. File is written to disk, dirty indicator clears
7. User can switch between chat tab and editor tabs freely

### Workflow 3: Managing Token Usage

1. User opens usage dashboard in ContextTools > Usage tab
2. Views current project token usage and cost
3. Switches to API Key view to see usage per key
4. Exports usage data to CSV for expense reporting
5. Sets budget limit in settings (future)
6. Receives warning when approaching limit

### Workflow 4: Configuring Settings

1. User clicks File > Settings (or Ctrl+,)
2. Settings modal opens with tabs:
   - **API Keys**: Add/remove Anthropic API keys
   - **Models**: Select default model (Opus, Sonnet, Haiku)
   - **Layout**: Choose layout preset
   - **Budgets**: Set spending limits (future)
3. User adds API key, system tests it automatically
4. Settings are encrypted and stored securely
5. Changes take effect immediately

### Workflow 5: Managing Sessions

**Creating a New Session:**
1. User opens a project folder
2. Clicks "New Session" button or File > New Session
3. Enters session name: "JIRA-1234-fix-auth"
4. System creates session folder at `<project>/.context-kiln/sessions/jira-1234-fix-auth/`
5. System initializes session.json with metadata (UUID, name, timestamp)
6. Chat starts fresh with new context

**Long-Running Session with Context Optimization:**
1. User works on complex task over multiple days
2. Has extensive conversation (approaching 100k tokens)
3. System automatically suggests: "Archive older messages to keep context lean?"
4. User accepts, older messages archived to `conversation-history/part-001.json`
5. System generates summary in `context.md` with key points
6. Active context window now lean, can continue working
7. User can reference archived parts if needed

**Switching Between Sessions:**
1. User clicks session dropdown in header
2. Sees list: "JIRA-1234-fix-auth", "Refactor components", "Add dark mode"
3. Selects "Refactor components"
4. System loads that session's context, messages, and files
5. Continues work exactly where they left off

**Documenting Decisions:**
1. During conversation, Claude suggests: "I've documented this decision"
2. System writes to `<session>/decisions.md`:
   ```
   ## Authentication Strategy (2026-01-13)
   Decided to use JWT tokens with refresh token rotation.
   Reasoning: Better security, easier to invalidate sessions.
   Implementation: See src/auth/tokens.js
   ```
3. These decisions stay in session files, not cluttering active context
4. Easy to reference: "What did we decide about auth?"

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
**Goal**: Set up core infrastructure with adapter pattern

- Install all dependencies (Monaco, SQLite, Anthropic SDK, OpenAI SDK, electron-store, uuid)
- **Create adapter architecture**:
  - BaseAdapter abstract class
  - AnthropicAdapter (MVP focus)
  - OpenAIAdapter (stub for Phase 2)
  - OllamaAdapter (stub for Phase 2)
- Create service layer files:
  - AIProviderService (facade)
  - DatabaseService
  - FileService
  - SessionService
  - TokenCounterService
- Create React context files (all 5 contexts: Claude, Editor, Settings, UsageTracking, Session)
- Set up IPC handlers in main.js and preload.js
- Configure webpack for Monaco Editor
- Initialize SQLite database with schema (including sessions table)
- Create session file structure template
- **Document adapter pattern** in docs/decisions/001-adapter-pattern.md

**Deliverable**: Infrastructure ready with pluggable provider system, no UI changes yet

### Phase 2: Claude API Integration & Sessions (Week 2)
**Goal**: Working chat with real Claude API and session management

- **Implement AnthropicAdapter fully**:
  - Transform internal context to Claude API format (markdown)
  - Handle streaming responses
  - Parse API responses back to internal format
  - Error handling and retry logic
- Implement AIProviderService:
  - Provider selection (start with Anthropic only)
  - Route requests to appropriate adapter
  - Handle streaming via IPC
- Implement SessionService for session file operations
- Implement ClaudeContext in renderer (uses AIProviderService)
- Implement SessionContext in renderer
- Create SettingsModal component:
  - API key management per provider
  - Provider selection dropdown
  - Model selection per provider
- Create SessionSelector component (dropdown in header)
- **Create internal context builder** (transforms context files to internal format)
- Connect ChatInterface to ClaudeContext and SessionContext
- Add streaming animations and stop button
- Add File > New Session menu command
- Link message history to current session
- **Document session structure** in docs/decisions/002-session-files.md

**Deliverable**: Can chat with Claude using API, context files are injected via adapter, sessions are created and managed

### Phase 3: File Editor (Week 3)
**Goal**: Edit files within the app

- Integrate Monaco Editor with webpack
- Create EditorTab component
- Create CenterPanel with tabs
- Implement EditorContext
- Implement FileService in main process
- Add double-click handlers to FileTree and ContextTools
- Implement save functionality (Ctrl+S)

**Deliverable**: Can open, edit, and save files in tabbed editor

### Phase 4: Token Tracking (Week 4)
**Goal**: Track and display token usage

- Implement DatabaseService for SQLite
- Add token recording to ClaudeService
- Create UsageTrackingContext
- Create UsageTracker component with charts
- Add usage tab to ContextTools
- Implement real-time usage updates

**Deliverable**: Full token tracking with dashboard

### Phase 5: Layout & Polish (Week 5)
**Goal**: Configurable layouts and final touches

- Implement layout preset system
- Add layout switcher to header
- Implement layout persistence
- Add keyboard shortcuts
- Error handling and loading states
- Performance optimizations
- Manual testing and bug fixes

**Deliverable**: MVP complete and tested

---

## Database Schema

### Projects Table
```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folder_path TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Token Usage Table
```sql
CREATE TABLE token_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  api_key_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_usd REAL NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
```

### API Keys Table
```sql
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used DATETIME
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  project_id INTEGER NOT NULL,
  folder_path TEXT NOT NULL,           -- Relative: .context-kiln/sessions/<name>
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_archived BOOLEAN DEFAULT 0,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
```

**Location**: `~/.context-kiln/usage.db` (uses Electron's userData path)

**Session Folder Location**: `<project-folder>/.context-kiln/sessions/<session-name>/`

---

## Model Pricing (Anthropic, as of January 2025)

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Context Window |
|-------|----------------------|------------------------|----------------|
| Claude Opus 4.5 | $15.00 | $75.00 | 200k tokens |
| Claude Sonnet 3.7 | $3.00 | $15.00 | 200k tokens |
| Claude Haiku 3.5 | $0.80 | $4.00 | 200k tokens |

**Cost Calculation**:
```javascript
const calculateCost = (model, inputTokens, outputTokens) => {
  const pricing = CLAUDE_MODELS[model];
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPricePerMToken;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPricePerMToken;
  return inputCost + outputCost;
};
```

---

## Context Representation & Formatting

### Internal Context Format (API-Agnostic)

Context Kiln maintains an internal representation that's independent of any AI provider:

```javascript
// Internal format used throughout the app
{
  contextFiles: [
    {
      path: "src/Layout.jsx",
      relativePath: "src/Layout.jsx",
      content: "import React from 'react';\n...",
      language: "jsx",
      metadata: {
        lines: 198,
        estimatedTokens: 850,
        fileSize: 5234,
        lastModified: "2026-01-13T10:30:00Z"
      }
    }
  ],
  userMessage: "How can I refactor these components?",
  sessionContext: {
    sessionId: "uuid-1234",
    sessionName: "Refactor components",
    summary: "Working on component refactoring",
    previousMessages: [...] // Last N messages for continuity
  },
  preferences: {
    includeLineNumbers: true,
    includeMetadata: true,
    maxContextTokens: 150000
  }
}
```

### Provider-Specific Formatting (Adapter Responsibility)

Each adapter transforms the internal format to the provider's API format:

**AnthropicAdapter** (Claude) - Uses Markdown:
```markdown
# Context Files

## src/Layout.jsx (198 lines, ~850 tokens)
```jsx
import React from 'react';
// ... file content ...
```

## src/ChatInterface.jsx (127 lines, ~650 tokens)
```jsx
import React from 'react';
// ... file content ...
```

# Session Context
Working on component refactoring

# User Question
How can I refactor these components?
```

**OpenAIAdapter** (GPT) - May use different structure:
```
You have access to the following files:

FILE: src/Layout.jsx (198 lines)
```
[content]
```

User request: How can I refactor these components?
```

**OllamaAdapter** (Local models) - Simplified:
```
Files:
- src/Layout.jsx:
[content]

Question: How can I refactor these components?
```

### Benefits of Adapter Pattern

✅ **Decoupling**: Internal format never changes when adding new providers
✅ **Flexibility**: Each adapter can optimize for its provider (markdown for Claude, JSON for others, etc.)
✅ **Testability**: Test adapters independently without touching core logic
✅ **Backwards Compatibility**: Old adapters continue working as internal format evolves
✅ **Extensibility**: Plugin system for custom providers

### Handling Large Context

**Universal (All Adapters)**:
- Token counter checks internal format before adapter transformation
- Show warning if total exceeds 150k tokens (leave room for response)
- Options: send file summaries, specific line ranges, or exclude large files

**Provider-Specific (Adapter Handles)**:
- Anthropic: 200k token context window
- OpenAI: Variable (8k-128k depending on model)
- Ollama: Varies by model (typically 4k-32k)

---

## Testing Strategy

### Manual Testing Checklist

**API Integration**:
- [ ] Add API key successfully
- [ ] Test invalid API key shows error
- [ ] Select different models (Opus, Sonnet, Haiku)
- [ ] Send message receives streaming response
- [ ] Stop button cancels mid-stream
- [ ] Context files are properly injected
- [ ] Large context shows warning

**File Editor**:
- [ ] Double-click opens file in editor tab
- [ ] Syntax highlighting works for JS, TS, Python, CSS, HTML
- [ ] Editing marks file as dirty (indicator shown)
- [ ] Ctrl+S saves file successfully
- [ ] Close tab works (prompt if unsaved)
- [ ] Switch between multiple open files

**Token Tracking**:
- [ ] Usage is recorded after each API call
- [ ] Project usage shows correct totals
- [ ] API key usage shows correct totals
- [ ] Session usage resets on app restart
- [ ] Global usage persists across sessions
- [ ] Cost calculation is accurate

**Layout**:
- [ ] Default layout loads correctly
- [ ] Horizontal split works (chat top, editor bottom)
- [ ] Vertical split works (side-by-side)
- [ ] Layout preset selection persists
- [ ] Panes resize correctly

**Settings**:
- [ ] Settings modal opens (File > Settings)
- [ ] API key is stored securely
- [ ] Settings persist across app restarts

**Session Management**:
- [ ] Can create new session with friendly name
- [ ] Session folder created at correct path
- [ ] Can switch between sessions
- [ ] Session history persists in database
- [ ] Can rename session
- [ ] Archive old messages to conversation-history/
- [ ] Session context summary generated correctly
- [ ] UUID and friendly name mapping works

### Automated Testing

**Unit Tests**:
- AIProviderService (mock adapters)
- Individual adapters (AnthropicAdapter, OpenAIAdapter, OllamaAdapter)
  - Test format transformation (internal → API format)
  - Test response parsing (API format → internal)
  - Mock API responses
- DatabaseService
- FileService
- SessionService
- TokenCounterService

**Integration Tests**:
- IPC communication (mock main process)
- Context builder → Adapter → API call flow
- File operations (create temp directory)
- Settings persistence (mock electron-store)

**E2E Tests**:
- Use Spectron (Electron testing framework)
- Test flow: Open folder → Add context → Send message → Receive response
- Test editor: Open file → Edit → Save → Verify file system
- Test provider switching: Change provider → Send message → Verify correct API called

**Documentation Tests**:
- README instructions are accurate
- Setup steps work on clean machine
- Code examples in docs are runnable

---

## Known Challenges & Solutions

### Challenge 1: Monaco Editor Bundle Size
**Problem**: Monaco Editor adds 3-4MB to bundle
**Solution**:
- Use webpack code splitting
- Load languages on demand
- Consider lazy loading (only load when first file opened)

### Challenge 2: Token Counting Accuracy
**Problem**: Hard to predict exact Claude token counts
**Solution**:
- Use tiktoken for estimation
- Always trust API response for final counts
- Show "estimated" label in UI

### Challenge 3: Large Context Files
**Problem**: Users may exceed 200k token limit
**Solution**:
- Real-time token counter in ContextTools
- Warning at 150k tokens
- Option to send summaries or line ranges

### Challenge 4: Streaming Performance
**Problem**: High-frequency IPC during streaming
**Solution**:
- Batch chunks (send every 50ms)
- Debounce UI updates
- Use efficient serialization

### Challenge 5: Native Dependencies
**Problem**: better-sqlite3 requires compilation
**Solution**:
- Use electron-rebuild for Electron compatibility
- Fallback to sql.js (pure JS) if compilation fails
- Document build requirements

### Challenge 6: Adapter Complexity
**Problem**: Need to maintain multiple adapters as APIs evolve
**Solution**:
- BaseAdapter abstract class defines contract
- Comprehensive unit tests for each adapter
- Version pinning for API SDKs
- Documentation for creating new adapters
- Community contributions for niche providers

### Challenge 7: Multi-Session Development Continuity
**Problem**: Work may span weeks/months with context loss
**Solution**:
- Extensive inline documentation (JSDoc)
- Architectural Decision Records (ADRs)
- Use Context Kiln itself for development sessions
- Detailed git commit messages
- Session notes in `.context-kiln/sessions/`

---

## Future Enhancements (Post-MVP)

### Phase 2 Features:
1. **Prompt Library**: Manage, categorize, and reuse prompts across projects (user requested post-MVP)
2. **GitHub Copilot Integration**: Inline AI suggestions in Monaco Editor
3. **OpenAI API Support**: Support GPT-4, GPT-3.5 models
4. **Local AI Models**: Ollama, LM Studio integration
5. **Multi-Project Workspace**: Switch between projects without reopening
6. **Context Templates**: Save and reuse context file sets
7. **Git Integration**: Show status, commit, diff view
8. **Terminal Integration**: Built-in terminal for running commands
9. **Budget Alerts**: Hard limits and warnings
10. **Team Features**: Share prompts, context templates, usage reports, session archives
11. **Advanced Session Features**: Session branching, session merge, session export/import

### Architecture Considerations:
- Abstract ClaudeService to AIService interface
- Support multiple providers: Anthropic, OpenAI, Ollama, etc.
- Provider selection in settings
- Different token counting per provider

---

## Success Metrics

**Functional MVP Criteria**:
- ✅ User can connect Claude API and have real conversations
- ✅ User can open and edit files with syntax highlighting
- ✅ User can drag files to context and they are injected into prompts
- ✅ User can track token usage per project and API key
- ✅ User can switch between layout presets
- ✅ User can create, name, and switch between sessions
- ✅ Sessions store context in project-local files
- ✅ Long-running sessions can archive old messages to stay within token limits
- ✅ All settings and session data persist across app restarts
- ✅ App handles errors gracefully with user-friendly messages

**Performance Targets**:
- Chat message sends in < 500ms
- Streaming starts within 1 second
- Editor opens files in < 200ms
- App launch time < 3 seconds

**Quality Targets**:
- Zero data loss (files, settings, usage history)
- No crashes during normal operation
- Clear error messages for all failure modes
- Intuitive UX (minimal learning curve)

---

## Development Setup

### Prerequisites:
- Node.js 18+ (for Electron 27)
- npm or yarn
- Git
- Windows/macOS/Linux (Electron is cross-platform)

### Installation:
```bash
git clone <repo-url>
cd context-kiln
npm install
npm run dev  # Start webpack + Electron
```

### Build:
```bash
npm run build        # Create production bundle
npm run electron     # Run Electron with production bundle
```

### Dependencies to Install:
```bash
npm install @anthropic-ai/sdk @monaco-editor/react better-sqlite3 electron-store tiktoken
npm install --save-dev monaco-editor-webpack-plugin electron-rebuild
```

---

## API Key Setup Guide (For Users)

### Getting an Anthropic API Key:

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Click "Create Key"
5. Copy the key (starts with `sk-ant-`)
6. In Context Kiln: File > Settings > API Keys > Add New Key
7. Paste key and give it a name
8. Click "Test" to verify it works

### Setting Budget Limits (Future):
- File > Settings > Budgets
- Set daily/weekly/monthly limits
- Get alerts when approaching limit

---

## Conclusion

This MVP plan provides a comprehensive roadmap for transforming Context Kiln from a prototype into a functional AI-powered software engineering tool. The phased approach ensures steady progress with testable deliverables at each stage.

**Key Strengths of This Plan**:
- Clean architecture with separation of concerns
- **Adapter pattern**: Decouples app from AI provider APIs (easy to add new providers)
- Security-first approach (encrypted API keys, context isolation)
- **Context window optimization** via session files (enables long-running tasks)
- Scalable token tracking with SQLite
- Professional editor experience with Monaco
- Flexible layout system for different workflows
- Session-based workflow (natural organization by task/ticket)
- **Multi-session development strategy** (extensive documentation, ADRs, self-hosting)
- Future-proof design (pluggable adapters, extensible architecture)

**Next Steps**:
1. Review and approve this plan
2. Begin Phase 1 implementation (foundation)
3. Iterate based on testing and feedback
4. Launch MVP and gather user feedback
5. Plan Phase 2 features based on user needs

---

**Document Version**: 1.2
**Last Updated**: 2026-01-13
**Author**: Claude Sonnet 4.5 (via Claude Code)
**Status**: Ready for Implementation

**Revision History**:

**v1.2 (2026-01-13)**:
- **Major architectural change**: Replaced ClaudeService with Adapter Pattern
  - Added AIProviderService (facade)
  - Added BaseAdapter, AnthropicAdapter, OpenAIAdapter, OllamaAdapter
  - Internal API-agnostic context representation
  - Provider-specific formatting via adapters
- Added **Multi-Session Development Strategy** section
  - Documentation requirements (ADRs, session notes, JSDoc)
  - "Eating our own dog food" approach
  - Continuity across sessions and machines
- Updated context formatting section to show internal format + adapter examples
- Updated implementation phases to reflect adapter architecture
- Added Challenge 6 (Adapter Complexity) and Challenge 7 (Multi-Session Continuity)
- Enhanced testing strategy with adapter-specific tests

**v1.1 (2026-01-13)**:
- Added Session Management as core MVP feature (Feature 6)
- Updated architecture to include SessionService and SessionContext
- Added session file structure and storage strategy
- Updated database schema with sessions table
- Enhanced Phase 2 to include session implementation
- Added Workflow 5: Managing Sessions
- Updated success criteria to include session functionality
- Clarified context window optimization strategy as key architectural principle

**v1.0 (2026-01-13)**:
- Initial comprehensive MVP plan
- 5 core features: Claude API, File Editor, Layouts, API Keys, Token Tracking
- Technical architecture and implementation roadmap
