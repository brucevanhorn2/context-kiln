# Context Kiln - Quick Start Guide

**Welcome!** This guide will get you up and running with Context Kiln in under 10 minutes.

---

## What is Context Kiln?

Context Kiln is an AI-powered code assistant that helps you understand, edit, and improve your codebase. Think of it as having an AI pair programmer that can:

- 💬 **Chat** about your code with full context
- 📝 **Edit** files directly (coming soon - Phase B)
- 🔍 **Explore** your project structure
- 📊 **Track** token usage and costs

**Current Status**: Phase A Complete (Chat with Local LLMs)

---

## Prerequisites

Before you begin, make sure you have:

- **Node.js** 18 or higher ([Download](https://nodejs.org/))
- **Windows, macOS, or Linux**
- **4GB+ RAM** (8GB+ recommended for local LLMs)
- **Code editor** (optional, Context Kiln has one built-in)

---

## Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-username/context-kiln.git
cd context-kiln
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- Electron (desktop framework)
- React (UI framework)
- Monaco Editor (code editor)
- AI provider SDKs
- SQLite database

**Time**: ~2-3 minutes

### Step 3: Rebuild Native Modules

```bash
npm run rebuild
```

This compiles native modules (like better-sqlite3) for your platform.

**Time**: ~1 minute

### Step 4: Launch Context Kiln

```bash
npm start
```

The app should open! You'll see:
- File tree (left)
- Chat interface (center)
- Context tools (right)

---

## Choose Your AI Provider

Context Kiln supports **three types** of AI providers:

1. **Ollama** - Free local LLMs (recommended for testing)
2. **LM Studio** - Free local LLMs with GUI
3. **Claude API** - Cloud AI (requires API key, costs money)

**For your first session, we recommend Ollama (it's free!).**

---

## Option A: Quick Start with Ollama (Recommended)

### Step 1: Install Ollama

**macOS/Linux**:
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Windows**:
- Download installer from [ollama.ai](https://ollama.ai)
- Run the installer
- Ollama will start automatically

### Step 2: Pull a Model

Open a new terminal and run:

```bash
# For coding tasks (recommended)
ollama pull qwen2.5-coder:7b

# Or for general chat
ollama pull llama3.1

# Or for code understanding
ollama pull codellama
```

**Model Size**: ~4-8 GB download
**Time**: 5-15 minutes depending on internet speed

### Step 3: Start Ollama Server

```bash
ollama serve
```

You should see: `Ollama is running on http://localhost:11434`

**Keep this terminal open!**

### Step 4: Configure Context Kiln

1. In Context Kiln, press **Ctrl+,** (or Cmd+, on Mac) to open Settings
2. Under **Provider**, select **"Ollama"**
3. Under **Model**, select **"qwen2.5-coder"** (or whatever you pulled)
4. Click **Save**

**No API key needed!**

### Step 5: Test It Out

1. Type a message in the chat: `"Hello! Can you help me code?"`
2. Press **Enter** or click **Send**
3. Watch the AI response stream in real-time

**Success!** You're chatting with a local AI model, completely free.

---

## Option B: Quick Start with LM Studio

### Step 1: Install LM Studio

- Download from [lmstudio.ai](https://lmstudio.ai)
- Install for your platform (Windows/Mac/Linux)
- Launch LM Studio

### Step 2: Download a Model

1. In LM Studio, go to **"Discover"** tab
2. Search for: **"Qwen2.5-Coder"** or **"DeepSeek Coder"**
3. Click **Download** (choose 7B version for faster performance)

**Time**: 5-15 minutes

### Step 3: Start Local Server

1. Go to **"Local Server"** tab
2. Click **"Select a model to load"**
3. Choose the model you downloaded
4. Click **"Start Server"**

You should see: `Server running on http://localhost:1234`

### Step 4: Configure Context Kiln

1. In Context Kiln, press **Ctrl+,** to open Settings
2. Under **Provider**, select **"LM Studio"**
3. Under **Model**, select **"local-model"**
4. Click **Save**

### Step 5: Test It Out

Send a test message and verify the AI responds.

---

## Option C: Quick Start with Claude API

**Note**: This costs money (~$3 per million input tokens). We recommend testing with Ollama first.

### Step 1: Get an API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Go to **API Keys**
4. Click **Create Key**
5. Copy your API key (starts with `sk-ant-`)

### Step 2: Configure Context Kiln

1. In Context Kiln, press **Ctrl+,** to open Settings
2. Under **Provider**, select **"Anthropic"**
3. Paste your API key in the **API Key** field
4. Under **Model**, select **"Claude Sonnet 3.5"** (recommended)
5. Click **Save**

### Step 3: Test It Out

Send a message. You'll be charged based on usage (~$0.003 per message for simple queries).

---

## Using Context Kiln

### Opening a Project

1. Click **File** → **Open Folder**
2. Select your code project folder
3. The file tree will populate on the left

### Adding Context Files

To give the AI context about your code:

1. **Drag & drop** files from the file tree to the context area (right panel)
2. Or **right-click** a file → **Add to Context**
3. Files in context are automatically included in every AI message

**Token Counter**: Watch the token count at the bottom of the context panel. Stay under 100K for best performance.

### Chatting with AI

1. Type your question in the chat box
2. Reference files by name: `"Fix the bug in calculator.js"`
3. AI can see all files in your context
4. Responses stream in real-time

**Example prompts**:
- "Explain what this code does"
- "How can I improve the performance?"
- "Add error handling to the login function"
- "Write unit tests for the validator"

### Opening Files in Editor

1. **Double-click** any file in the file tree
2. Or **double-click** a file tag in the context panel
3. The editor opens in a split view (below chat)
4. Edit the file
5. Press **Ctrl+S** to save

**Editor Features**:
- Syntax highlighting for 40+ languages
- Auto-complete
- Find & Replace (Ctrl+F)
- Format document
- Undo/Redo with smart state tracking

### Creating Sessions

Sessions help organize conversations by topic:

1. Click the **session dropdown** in the header (default: "General Development")
2. Click **"+ New Session"**
3. Enter a name (e.g., "Refactor Authentication")
4. Sessions are saved per project

**Use cases**:
- Different features
- Bug fixes vs. new features
- Experiments you might abandon

### Tracking Token Usage

1. Click the **"Usage"** tab in the right panel
2. View usage by:
   - **Session** - This conversation
   - **Project** - This codebase
   - **Global** - All time

**With local LLMs**: Everything shows $0.00 (because it's free!)
**With Claude API**: You'll see actual costs

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Ctrl+,** | Open Settings |
| **Ctrl+S** | Save current file in editor |
| **Ctrl+F** | Find in editor |
| **Ctrl+Z** | Undo in editor |
| **Ctrl+Shift+Z** | Redo in editor |
| **Ctrl+/** | Toggle comment in editor |

---

## Troubleshooting

### "Cannot connect to Ollama"

**Problem**: Context Kiln can't reach Ollama server

**Solutions**:
1. Check Ollama is running: `ollama serve`
2. Check the server is on port 11434
3. Try: `curl http://localhost:11434/api/tags`
4. Restart Ollama

### "Cannot connect to LM Studio"

**Problem**: Context Kiln can't reach LM Studio server

**Solutions**:
1. Open LM Studio
2. Go to "Local Server" tab
3. Make sure a model is loaded
4. Click "Start Server"
5. Check port is 1234

### "Model not found"

**Problem**: Selected model isn't available

**Solutions**:
- **Ollama**: Pull the model first (`ollama pull llama3.1`)
- **LM Studio**: Download and load a model in LM Studio

### Responses are slow

**Problem**: AI takes a long time to respond

**Solutions**:
1. **Use smaller models**: qwen2.5-coder:7b instead of :32b
2. **Close other apps** to free up RAM
3. **Ollama is faster** than LM Studio (more optimized)
4. **Reduce context**: Remove unused files from context panel

### App won't start

**Problem**: Electron app doesn't launch

**Solutions**:
1. Check Node.js version: `node --version` (needs 18+)
2. Reinstall dependencies: `npm install`
3. Rebuild native modules: `npm run rebuild`
4. Check error logs in terminal

### Database errors

**Problem**: SQLite errors on startup

**Solutions**:
1. Delete the database: `rm -rf ~/.context-kiln/database.sqlite`
2. Rebuild native modules: `npm run rebuild`
3. The database will be recreated on next launch

---

## What's Next?

Now that you have Context Kiln running:

### Immediate Next Steps
1. ✅ Test chat with local model
2. 📂 Open your first project
3. 📝 Add some files to context
4. 💬 Ask the AI to explain code
5. 🎨 Try different layout presets (header dropdown)

### Coming Soon (Phase B - Next Update)

Context Kiln will soon support **tool use**, enabling the AI to:
- **Read files** automatically (without you adding to context)
- **Edit files** directly (with your approval)
- **Create new files**
- **Multi-step workflows**

This will transform Context Kiln from a chat tool into a true **agentic development assistant**.

**Estimated**: 1-2 weeks

### Recommended Learning Path

**Week 1**: Learn the basics
- Use Ollama (free) to experiment
- Try different prompts
- Explore the editor
- Learn session management

**Week 2**: Get productive
- Add Context Kiln to your daily workflow
- Use it for code reviews
- Generate boilerplate code
- Debug issues with AI help

**Week 3**: Advanced usage
- Switch to Claude API for production work
- Use prompt library (coming soon)
- Create session templates
- Integrate with your git workflow

---

## Tips for Best Results

### Writing Good Prompts

**❌ Bad**: "Fix the code"
**✅ Good**: "Fix the bug in calculateTotal() where the discount isn't applied correctly"

**❌ Bad**: "Make it better"
**✅ Good**: "Refactor the authentication system to use JWT instead of sessions"

**❌ Bad**: "Help"
**✅ Good**: "Explain how the user authentication flow works in this codebase"

### Managing Context

**Do**:
- ✅ Add only relevant files
- ✅ Remove files when done with them
- ✅ Watch the token counter
- ✅ Use sessions to separate concerns

**Don't**:
- ❌ Add your entire project (too many tokens)
- ❌ Keep unused files in context
- ❌ Exceed 100K tokens (slower, more expensive)

### Choosing Models

**For coding**:
- 🥇 qwen2.5-coder (Ollama) - Best free option
- 🥈 Claude Sonnet 3.5 (API) - Best overall, costs money
- 🥉 codellama (Ollama) - Good for code understanding

**For chat/docs**:
- 🥇 llama3.1 (Ollama) - Great for explanations
- 🥈 Claude Haiku 3.5 (API) - Fast and cheap

**Model Size**:
- **7B models**: Fast, uses ~8GB RAM, good quality
- **13B models**: Slower, uses ~16GB RAM, better quality
- **32B+ models**: Very slow, uses 32GB+ RAM, best quality

---

## Getting Help

### Community & Support

- 💬 **GitHub Discussions**: Ask questions, share tips
- 🐛 **GitHub Issues**: Report bugs, request features
- 📧 **Email**: support@context-kiln.dev (if available)

### Documentation

- 📚 **User Guide**: Detailed feature documentation (coming soon)
- 🏗️ **Architecture**: Technical deep dive (docs/Architecture.md)
- 🔧 **API Adapters**: Creating custom providers (docs/API-Adapters.md)
- 🧪 **Testing Guide**: Local LLM setup (docs/TESTING-LOCAL-LLM.md)

### Useful Links

- [Ollama Documentation](https://github.com/ollama/ollama)
- [LM Studio Documentation](https://lmstudio.ai/docs)
- [Claude API Documentation](https://docs.anthropic.com)
- [Context Kiln GitHub](https://github.com/your-username/context-kiln)

---

## Feedback Welcome!

Context Kiln is under active development. We'd love to hear:

- 💡 Feature requests
- 🐛 Bug reports
- 💬 User experience feedback
- 📝 Documentation improvements
- 🎨 UI/UX suggestions

**Open an issue** on GitHub or join our discussions!

---

## FAQ

### Is Context Kiln free?

**Context Kiln**: Yes, the app is free and open source

**AI Providers**:
- Ollama: Free (runs locally)
- LM Studio: Free (runs locally)
- Claude API: Paid (~$3-15 per million tokens)

### Does Context Kiln send my code to the cloud?

**With Ollama/LM Studio**: No, everything runs locally on your machine

**With Claude API**: Yes, your code is sent to Anthropic's servers (required for the API to work)

**Recommendation**: Test with Ollama first, then switch to Claude for production use

### What models does Context Kiln support?

**Currently**:
- Anthropic: Claude Opus 4.5, Sonnet 3.7, Sonnet 3.5, Haiku 3.5
- Ollama: Any model you pull (llama3.1, qwen2.5-coder, codellama, etc.)
- LM Studio: Any model you load

**Coming Soon**:
- OpenAI: GPT-4, GPT-3.5
- More providers via adapter pattern

### Can I use Context Kiln offline?

**Yes**, with Ollama or LM Studio (after models are downloaded)

**No**, with Claude API (requires internet)

### How much does Claude API cost?

Example costs with Claude Sonnet 3.5:
- Simple query (~1K tokens): ~$0.003
- Code review (~5K tokens): ~$0.015
- Complex refactor (~20K tokens): ~$0.06

**Budget**: $10-20/month for moderate use

### What's the difference between Context Kiln and GitHub Copilot?

**Similarities**:
- AI code assistance
- Context-aware suggestions

**Differences**:
- **Context Kiln**: Full project context, chat-based, agentic edits
- **Copilot**: Line-by-line autocomplete, integrated in editor

**Use both!** They're complementary tools.

### Will Context Kiln support VS Code / other editors?

**Current**: Standalone Electron app with built-in Monaco editor

**Future**: Possible VS Code extension or editor integrations (post-MVP)

### Can I contribute to Context Kiln?

**Yes!** Context Kiln is open source.

**Ways to contribute**:
- Submit bug fixes
- Add new features
- Improve documentation
- Create custom adapters
- Test and report issues

See CONTRIBUTING.md (coming soon) for details.

---

## What You Just Learned

✅ How to install Context Kiln
✅ How to set up Ollama or LM Studio
✅ How to chat with AI about your code
✅ How to add context files
✅ How to use the built-in editor
✅ How to manage sessions
✅ How to track token usage

**Next**: Open your first project and start coding with AI assistance!

---

**Happy coding with Context Kiln! 🔥**

---

_Last Updated: 2026-01-14_
_Version: 1.0 (Phase A Complete)_
_Questions? Open an issue on GitHub!_
