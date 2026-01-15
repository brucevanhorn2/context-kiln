# Context Kiln

> An AI-powered software engineering tool with Claude API integration, intelligent context management, and professional code editing.

**Status**: 🎉 MVP Complete - Ready for Testing

---

## Features

### 🤖 AI Integration
- **Claude API** with streaming responses
- Multi-provider architecture (OpenAI, Ollama ready)
- Smart context injection from selected files
- Token usage tracking and cost monitoring

### 📝 Professional Code Editor
- **Monaco Editor** (VS Code quality)
- 40+ language syntax highlighting
- Multi-file tab interface
- Auto-save with Ctrl+S
- Dirty state indicators

### 📊 Session Management
- Project-local session storage
- Create, rename, and switch sessions
- Archive old messages for long sessions
- Context window warnings

### 💰 Token & Cost Tracking
- Real-time usage monitoring
- Track by session, project, or globally
- Per-model cost breakdown
- Time range filtering (day/week/month/all)

### 🎨 Flexible Layouts
- 5 preset layouts (Default, Horizontal, Vertical, Chat Focus, Editor Focus)
- Switch layouts on-the-fly
- Persistent preferences
- Resizable panels

---

## Installation

### Prerequisites
- **Node.js** 18+ and npm
- **Anthropic API Key** ([Get one here](https://console.anthropic.com/))
- Windows, macOS, or Linux

### Install Dependencies

```bash
# Clone the repository
git clone https://github.com/yourusername/context-kiln.git
cd context-kiln

# Install dependencies
npm install

# Rebuild native modules for Electron
npm run rebuild
```

### Build & Run

```bash
# Development mode
npm start

# Production build
npm run build
npm run start:prod
```

---

## Quick Start Guide

### 1. Add Your API Key

1. Launch Context Kiln: `npm start`
2. Click **Settings** button in header (or press `Ctrl+,`)
3. In the **AI Provider** tab:
   - Select provider: **Anthropic**
   - Enter your API key
   - Select model: **Claude Sonnet 3.5** (recommended)
   - Click **Test Key** to verify
   - Click **Save**

### 2. Open a Project

1. **File** > **Open Folder**
2. Select your code project directory
3. File tree will populate in the left panel

### 3. Add Context Files

Drag files from the **Explorer** (left panel) to the **Context** tab (right panel). These files will be injected into your Claude conversations.

**Tip**: Double-click files in Context to open them in the editor!

### 4. Chat with Claude

1. Type your message in the chat input at the bottom
2. Press **Enter** or click **Send**
3. Watch the streaming response appear in real-time
4. Claude will have access to all files in your context

### 5. Edit Files

**Open Files**:
- Double-click any file in the Explorer
- Double-click any file in the Context list

**Edit & Save**:
- Edit in the Monaco editor
- Orange dot (●) indicates unsaved changes
- Press `Ctrl+S` to save
- File info bar shows language, line count, and save status

### 6. Switch Layouts

Click the **layout dropdown** in the header to choose:
- **Default (3-pane)**: Balanced for general use
- **Horizontal Split**: Chat above, editor below
- **Vertical Split**: Ideal for ultrawide monitors
- **Chat Focus**: Maximize chat area
- **Editor Focus**: Maximize editor area

Your choice persists across sessions!

### 7. Monitor Usage

Click the **Usage** tab in the right panel to view:
- **Session**: Current session token usage and costs
- **Project**: Aggregate usage for this project
- **Global**: All-time usage across all projects

Filter by time range (day/week/month/all) and see per-model breakdowns.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+,` | Open Settings |
| `Ctrl+S` | Save active file in editor |
| `Enter` | Send chat message |
| `Esc` | Close modals |

---

## Architecture

Context Kiln uses a **modular adapter pattern** for AI providers:

```
User Interface (React)
      ↓
Context Providers (State Management)
      ↓
IPC Bridge (Secure Communication)
      ↓
Main Process Services
      ↓
AI Provider Adapters → Claude API / OpenAI / Ollama
      ↓
Database (SQLite) for token tracking
```

**Key Components**:
- **AIProviderService**: Facade for multiple AI providers
- **Adapters**: Abstract AI provider differences (BaseAdapter, AnthropicAdapter, OpenAIAdapter, OllamaAdapter)
- **DatabaseService**: Persistent storage for projects, sessions, usage, settings
- **SessionService**: Manage project-local session files
- **TokenCounterService**: Estimate and track token usage
- **FileService**: Secure file operations with language detection

---

## File Structure

```
context-kiln/
├── src/
│   ├── services/          # Backend services (Node.js)
│   │   ├── AIProviderService.js
│   │   ├── DatabaseService.js
│   │   ├── FileService.js
│   │   ├── SessionService.js
│   │   ├── TokenCounterService.js
│   │   └── adapters/      # AI provider adapters
│   │       ├── BaseAdapter.js
│   │       ├── AnthropicAdapter.js
│   │       ├── OpenAIAdapter.js
│   │       └── OllamaAdapter.js
│   ├── contexts/          # React contexts (state)
│   │   ├── ClaudeContext.jsx
│   │   ├── EditorContext.jsx
│   │   ├── SettingsContext.jsx
│   │   ├── UsageTrackingContext.jsx
│   │   └── SessionContext.jsx
│   ├── components/        # React components
│   │   ├── CenterPanel.jsx
│   │   ├── EditorTab.jsx
│   │   ├── SettingsModal.jsx
│   │   ├── SessionSelector.jsx
│   │   └── UsageTracker.jsx
│   ├── utils/             # Helper functions
│   │   ├── constants.js
│   │   └── performance.js
│   ├── database/
│   │   └── schema.sql
│   ├── main.js            # Electron main process
│   ├── preload.js         # IPC bridge
│   └── Layout.jsx         # Main layout component
├── docs/                  # Documentation
└── package.json
```

---

## Configuration

Settings are stored in Electron's app data directory:
- **Windows**: `%APPDATA%\context-kiln`
- **macOS**: `~/Library/Application Support/context-kiln`
- **Linux**: `~/.config/context-kiln`

Session files are stored locally within each project:
```
<your-project>/.context-kiln/sessions/<session-name>/
```

---

## Troubleshooting

### "Failed to initialize database"
- Ensure write permissions in app data directory
- Try running `npm run rebuild` to rebuild native modules

### "API key invalid"
- Verify your Anthropic API key in Settings
- Check your API key has available credits
- Test connection with the **Test Key** button

### "Failed to open file"
- Check file permissions
- Ensure the file exists and is not locked by another process

### Monaco Editor not loading
- Clear webpack cache: `rm -rf node_modules/.cache`
- Rebuild: `npm run build`

### Better-sqlite3 errors
- Rebuild native modules: `npm run rebuild`
- Check Node.js version matches Electron's Node version

---

## Development

### Scripts

```bash
# Start development mode
npm start

# Build production
npm run build

# Rebuild native modules
npm run rebuild

# Run linter
npm run lint
```

### Adding a New AI Provider

1. Create adapter in `src/services/adapters/YourAdapter.js`:
   ```javascript
   import BaseAdapter from './BaseAdapter.js';

   export default class YourAdapter extends BaseAdapter {
     // Implement required methods
   }
   ```

2. Register in `src/services/AIProviderService.js`:
   ```javascript
   import YourAdapter from './adapters/YourAdapter.js';
   this.registerAdapter('your-provider', new YourAdapter());
   ```

3. Add models to `src/utils/constants.js`

4. Update UI in `src/components/SettingsModal.jsx`

---

## Roadmap

### MVP (Current) ✅
- ✅ Claude API integration with streaming
- ✅ Monaco Editor with syntax highlighting
- ✅ Session management
- ✅ Token tracking and cost monitoring
- ✅ Layout presets
- ✅ Error handling and polish

### Post-MVP (Future)
- [ ] **OpenAI Support** (GPT-4, GPT-3.5)
- [ ] **Ollama Support** (local models)
- [ ] **Prompt Library** (save and reuse prompts)
- [ ] **Black Box Recorder UI** (session timeline visualization)
- [ ] **Git Integration** (commit suggestions, diff analysis)
- [ ] **Multi-Project Workspace**
- [ ] **Context Templates**
- [ ] **Budget Alerts** (spend limits)
- [ ] **Session Branching** (fork conversations)
- [ ] **Export/Import** (share sessions)

---

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "Add your feature"`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

**Coding Standards**:
- Use JSDoc comments for all functions
- Follow existing code style
- Add error handling for all async operations
- Test with real API keys before submitting

---

## License

MIT License - See LICENSE file for details

---

## Acknowledgments

- **Anthropic** for the Claude API
- **Microsoft** for Monaco Editor
- **Ant Design** for UI components
- **Electron** for cross-platform desktop support

---

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/context-kiln/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/context-kiln/discussions)
- **Documentation**: [docs/](./docs/)

---

**Built with ❤️ for developers who want better AI integration in their workflow.**

_Last Updated: 2026-01-14_
