# Getting Started with Context Kiln + Ollama

You now have Context Kiln configured to use Ollama locally!

## Quick Start

### 1. Ensure Ollama is Running

```bash
# On Mac
brew services start ollama

# Or just run
ollama serve
```

### 2. Pull the Qwen2.5-Coder Model

```bash
ollama pull qwen2.5-coder:7b
```

This will download the 7B model (4.7 GB). Takes 5-10 minutes depending on internet speed.

### 3. Start Context Kiln

```bash
npm run dev
```

Or in production mode:
```bash
npm run electron
```

## What's Now Integrated

✅ **Chat Interface** - Type messages at the bottom of the center panel
✅ **Ollama Provider** - Defaults to `http://localhost:11434`
✅ **Model Selection** - Can switch models in Settings
✅ **Monaco Editor** - Full syntax highlighting with Ctrl+S save
✅ **File Context** - Add files to your chat context from the file tree

## How to Use

### 1. Open a Project
- Use File → Open Folder to load a project
- Files appear in the left panel

### 2. Add Files to Context
- Click files in the tree to open them in the editor (bottom)
- (Context file selection in chat will be added in next phase)

### 3. Chat with Your Code
- Type a question at the bottom
- Models are trained on code, so try:
  - "Explain this function"
  - "How does this service work?"
  - "Write a test for this code"
  - "Fix this bug in the code"

### 4. Edit Files
- The editor supports full editing with syntax highlighting
- Ctrl+S to save
- AI can eventually suggest edits (Phase D)

## Model Options

In Settings → AI Provider, you can switch between:

- **Qwen 2.5 Coder 7B** (4.7 GB) - Great balance, recommended
- **Llama 3.1** (generic, slower for coding)
- **Code Llama** (4.7 GB, good for code)
- **Mistral** (generic)

### Add More Models

Pull any Ollama model:
```bash
ollama pull mistral:7b
ollama pull neural-chat
ollama pull llama2:13b
```

Then add it to `src/utils/constants.js` in the `OLLAMA_MODELS` object.

## Troubleshooting

### "Connection refused" error
- Make sure Ollama is running: `ollama serve`
- Check it's on localhost:11434: `curl http://localhost:11434/api/tags`

### Model is slow
- Qwen 7B should respond in 1-3 seconds per request on your 3070 Ti with CUDA
- If slower, model may still be loading (watch terminal)

### Chat not responding
- Check DevTools (F12) for errors
- Check the main process logs in `~/.config/context-kiln/logs/`
- Restart the app

## What's Next?

Future phases will add:
- **Phase D**: AI-suggested file edits with diff preview
- **Phase E**: Local GGUF model embedding (run models without Ollama)
- **Tool integration**: AI can actually execute tools (read/edit files)
- **Session management**: Save and load chat sessions

## Performance Tips

For your RTX 3070 Ti (8GB VRAM):
- Qwen 7B works great (model uses ~5GB in VRAM)
- Set context window to 4096 tokens max in Settings
- If you hit OOM, reduce context or use a smaller quantized version

### Running Quantized Models

For tighter VRAM constraints:
```bash
# This pulls a Q4 (4-bit) quantized version
ollama pull qwen2.5-coder:7b-q4
```

These are smaller (2-3 GB) but slightly lower quality. Good for testing.

## Notes

- All code stays on your machine
- No API costs (unlike Claude/GPT)
- Training a custom fine-tuned version is possible (see `docs/lora-finetuning-guide.md`)

Enjoy! 🚀
