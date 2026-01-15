# Testing Context Kiln with Local LLMs

**Last Updated**: 2026-01-14 (Evening Session)

## Overview

Context Kiln now supports **free local LLMs** via Ollama and LM Studio! Test the chat functionality without any API costs before moving to cloud providers.

---

## Option 1: Ollama (Recommended)

**Why Ollama?**
- Easiest to set up
- Large model library
- Optimized performance
- Great for testing

### Setup Steps

1. **Install Ollama**
   - Download from: https://ollama.ai
   - Install for your platform (Windows/Mac/Linux)

2. **Start Ollama**
   ```bash
   ollama serve
   ```
   (Runs on http://localhost:11434)

3. **Pull a Model**
   ```bash
   # For general chat (recommended for testing)
   ollama pull llama3.1

   # For code-focused work
   ollama pull qwen2.5-coder

   # Or Code Llama
   ollama pull codellama
   ```

4. **Test Ollama is Running**
   ```bash
   curl http://localhost:11434/api/tags
   ```
   Should return list of installed models

### Using in Context Kiln

1. Launch Context Kiln: `npm run dev`
2. Open Settings (Ctrl+,)
3. Switch Provider to **"Ollama"**
4. Select Model: **"llama3.1"** (or whatever you pulled)
5. No API key needed!
6. Start chatting

---

## Option 2: LM Studio

**Why LM Studio?**
- Great UI for managing models
- Easy model switching
- Good for experimenting with different models

### Setup Steps

1. **Install LM Studio**
   - Download from: https://lmstudio.ai
   - Install for your platform

2. **Download a Model in LM Studio**
   - Open LM Studio
   - Go to "Discover" tab
   - Search for models (Llama, Mistral, Qwen, etc.)
   - Download one (recommend Qwen2.5-Coder for coding tasks)

3. **Start Local Server**
   - Go to "Local Server" tab in LM Studio
   - Load your downloaded model
   - Click "Start Server"
   - Default: http://localhost:1234

4. **Test LM Studio is Running**
   ```bash
   curl http://localhost:1234/v1/models
   ```
   Should return the loaded model

### Using in Context Kiln

1. Launch Context Kiln: `npm run dev`
2. Open Settings (Ctrl+,)
3. Switch Provider to **"LM Studio"**
4. Select Model: **"local-model"** (or detected model name)
5. No API key needed!
6. Start chatting

---

## Recommended Models for Coding

| Model | Size | Best For | Provider |
|-------|------|----------|----------|
| **Qwen2.5-Coder** | 7B-32B | Code generation & editing | Both |
| **CodeLlama** | 7B-34B | Code understanding | Ollama |
| **Llama 3.1** | 8B-70B | General chat & reasoning | Both |
| **DeepSeek Coder** | 6.7B-33B | Code completion | Both |

**Note**: Larger models (13B+) require more RAM but give better results. Start with 7B models for testing.

---

## Testing Workflow

### 1. Basic Chat Test
- Send simple message: "Hello, can you help me code?"
- Verify streaming works (text appears gradually)
- Check token count in usage tracker

### 2. Context File Test
- Open a project folder (File > Open Folder)
- Drag a file to context area
- Ask: "Explain what this file does"
- AI should read and explain the file

### 3. Code Question Test
- Add a code file to context
- Ask: "How can I improve this code?"
- Check if AI gives relevant suggestions

### 4. Editor Test
- Double-click a file to open in editor
- Make changes
- Save with Ctrl+S
- Verify dirty indicator works

---

## Troubleshooting

### "Cannot connect to Ollama"
- Check Ollama is running: `ollama serve`
- Verify port 11434 is open
- Try: `curl http://localhost:11434/api/tags`

### "Cannot connect to LM Studio"
- Check local server is started in LM Studio
- Verify port 1234 is open
- Check a model is loaded

### "Model not found"
- **Ollama**: Pull the model first (`ollama pull llama3.1`)
- **LM Studio**: Load a model in the Local Server tab

### Slow Responses
- Use smaller models (7B instead of 13B+)
- Check CPU/GPU usage
- Close other applications
- Consider Ollama (more optimized than LM Studio)

---

## What's Next?

Once local chat is working:

1. **Test with Multiple Files**
   - Add 3-4 files to context
   - Ask complex questions about the codebase

2. **Test Session Management**
   - Create multiple sessions
   - Switch between them
   - Verify context persists

3. **Test Token Tracking**
   - Check usage dashboard
   - Verify counts are accurate
   - Test time range filters

4. **Report Issues**
   - Note any errors or unexpected behavior
   - Test edge cases (empty files, large files, etc.)

---

## Coming Soon: Agentic Features

After chat is stable, we'll add:
- **Tool Use**: AI can read/edit files directly
- **Diff Preview**: See proposed changes before applying
- **Multi-step Tasks**: AI can chain operations (read → analyze → edit)
- **Approval Workflow**: Review AI edits before saving

This will transform Context Kiln from a chat tool to an agentic code editor!

---

## Need Help?

- Ollama Docs: https://github.com/ollama/ollama/blob/main/docs/api.md
- LM Studio Docs: https://lmstudio.ai/docs
- Context Kiln Issues: https://github.com/[your-repo]/context-kiln/issues
