# Context Kiln - MVP Implementation Plan v2.0

**Last Updated**: 2026-01-14 (Evening - Strategic Pivot)
**Status**: Local LLM adapters complete, ready for testing
**Strategic Direction**: Local-first development → Tool use → Cloud APIs

---

## Executive Summary

Context Kiln is an **agentic development tool** - not just a chat interface, but a system where AI can actively read, analyze, and edit code with human oversight.

**Strategic Pivot (2026-01-14)**: We're prioritizing **local LLM integration** (Ollama, LM Studio) over cloud APIs. This enables:
- ✅ **Risk-free testing** - No API costs during development
- ✅ **Faster iteration** - No rate limits or network latency
- ✅ **Privacy** - Code stays local during testing
- ✅ **Better models** - Qwen2.5-Coder, DeepSeek Coder optimized for code

Once stable with local models, adding Claude/OpenAI is trivial (adapter pattern already supports them).

---

## Current Status (2026-01-14 Evening)

### What Works ✅
- Three-pane layout (File Tree | Chat/Editor | Context Tools)
- File browser with drag-and-drop context injection
- Monaco Editor with syntax highlighting (40+ languages)
- Editor toolbar (Save, Undo/Redo, Cut/Copy/Paste, Find, Format)
- Resizable split view (chat top, editor bottom)
- Multi-file tabs with dirty state indicators
- SQLite database for token tracking
- Session management system
- Layout presets (5 configurations)

### What's New ✅ (Tonight)
- **OllamaAdapter** - Full implementation (270 lines)
- **LM Studio Adapter** - Full implementation (253 lines)
- **ESLint integration** - Code quality enforcement
- **Editor toolbar** - Standard editing functions

### What's Missing ❌ (Critical for "Agentic")
- **Tool Use / Function Calling** - AI can't invoke file operations
- **File Editing via AI** - AI can only chat, not edit
- **Diff Preview** - Can't show proposed changes before applying
- **Approval Workflow** - No human-in-the-loop for edits
- **Multi-step Tasks** - Can't chain operations (read → analyze → edit)

---

## Revised MVP Definition

Context Kiln MVP is complete when a user can:

### Phase A: Chat with Local LLMs (✅ COMPLETE)
1. ✅ Install Ollama or LM Studio
2. ✅ Select provider and model in settings
3. ✅ Send messages and receive streaming responses
4. ✅ Drag files to context and have AI reference them
5. ✅ Open/edit/save files in Monaco editor
6. ✅ Track token usage (works with $0 local models)

### Phase B: Agentic Code Editing (🔄 NEXT)
7. ❌ Ask AI to "fix this bug" and have it propose file edits
8. ❌ See diff preview of proposed changes
9. ❌ Approve/reject changes before applying
10. ❌ AI can read files, list directories, check file existence

### Phase C: Multi-step Workflows (🔮 FUTURE)
11. ❌ AI creates execution plans for complex tasks
12. ❌ AI executes steps sequentially with verification
13. ❌ Error recovery when steps fail
14. ❌ Task persistence across sessions

---

## Architecture: Adapter Pattern

### Why This Works

```
User Interface (React)
        ↓
  AIProviderService (Facade)
        ↓
    [Adapter Layer]
        ↓
   ┌────┴────┬────────┬──────────┐
   │         │        │          │
Ollama   LM Studio  Claude   OpenAI
(local)   (local)   (cloud)  (cloud)
 $0        $0      $3-75/M  $15-60/M
```

All adapters implement the same interface:
- `formatRequest(internalContext, model)` - Transform to provider format
- `sendRequest(request, callbacks)` - Make API call with streaming
- `parseResponse(response)` - Transform back to internal format
- `getAvailableModels()` - List models
- `validateApiKey(key)` - Check connectivity

**Benefits**:
- Switch providers without changing UI code
- Test with free local models
- Add new providers easily (LM Studio took 30 minutes)
- Runtime provider switching

---

## Implementation Phases

### Phase A: Local LLM Integration ✅ COMPLETE

**Goal**: Get chat working with free local models

**Completed**:
- [x] OllamaAdapter (full implementation)
- [x] LM Studio Adapter (full implementation)
- [x] Model discovery (fetch from local APIs)
- [x] Streaming support (JSON and SSE formats)
- [x] Error handling ("Ollama not running", etc.)
- [x] Registration in AIProviderService
- [x] Constants for local models

**Testing Required**:
- [ ] Install Ollama, pull qwen2.5-coder
- [ ] Test basic chat with streaming
- [ ] Test context file injection
- [ ] Test model switching
- [ ] Test error cases (server not running)

**Files Created** (523 lines):
- `src/services/adapters/OllamaAdapter.js` (270 lines)
- `src/services/adapters/LMStudioAdapter.js` (253 lines)

**Files Updated**:
- `src/services/AIProviderService.js` - Registered LM Studio
- `src/utils/constants.js` - Added LMSTUDIO_MODELS

**Documentation**:
- `docs/TESTING-LOCAL-LLM.md` - Complete setup guide
- `docs/dev-notes/2026-01-14-evening-local-llm-pivot.md` - Pivot rationale

---

### Phase B: Tool Use for File Editing 🔄 NEXT (2-3 hours)

**Goal**: Enable AI to propose and apply file edits

#### 1. Design Tool Interface

**Tools to Implement**:

```typescript
// Tool: read_file
{
  name: "read_file",
  description: "Read the contents of a file",
  parameters: {
    path: { type: "string", description: "Absolute or relative file path" }
  }
}

// Tool: edit_file
{
  name: "edit_file",
  description: "Replace specific text in a file",
  parameters: {
    path: { type: "string", description: "File to edit" },
    search: { type: "string", description: "Text to find (must be exact)" },
    replace: { type: "string", description: "Replacement text" }
  }
}

// Tool: list_files
{
  name: "list_files",
  description: "List files in a directory",
  parameters: {
    path: { type: "string", description: "Directory path" },
    recursive: { type: "boolean", description: "Include subdirectories" }
  }
}

// Tool: create_file
{
  name: "create_file",
  description: "Create a new file",
  parameters: {
    path: { type: "string", description: "File path" },
    content: { type: "string", description: "File content" }
  }
}
```

#### 2. Implement Function Calling

**Adapter Changes**:

Each adapter needs to support function calling. Different models/providers have different formats:

**Ollama** (Llama 3.1+ with tools):
```json
{
  "model": "llama3.1",
  "messages": [...],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "edit_file",
        "description": "Replace text in a file",
        "parameters": { ... }
      }
    }
  ]
}
```

**Claude** (native tool use):
```json
{
  "model": "claude-3-5-sonnet-20241022",
  "messages": [...],
  "tools": [
    {
      "name": "edit_file",
      "description": "Replace text in a file",
      "input_schema": { ... }
    }
  ]
}
```

**Implementation Plan**:
1. Add `tools` parameter to adapter `formatRequest()`
2. Parse tool use responses in `parseResponse()`
3. Execute tool calls via FileService
4. Return results to AI
5. Continue conversation with tool results

#### 3. Build Approval UI

**DiffPreviewModal Component**:
```jsx
<Modal title="AI Proposes File Edit" visible={showDiff}>
  <Descriptions>
    <Item label="File">{filePath}</Item>
    <Item label="Action">Replace text</Item>
  </Descriptions>

  <DiffView
    oldText={searchText}
    newText={replaceText}
    language={fileLanguage}
  />

  <Space>
    <Button type="primary" onClick={approve}>
      Apply Changes
    </Button>
    <Button onClick={reject}>
      Reject
    </Button>
    <Button onClick={editAndApply}>
      Edit & Apply
    </Button>
  </Space>
</Modal>
```

**Features**:
- Side-by-side diff view (use `react-diff-viewer`)
- Syntax highlighting in diff
- Line numbers
- Ability to manually edit proposed change
- Approve/reject/edit workflow

#### 4. Implement Tool Execution

**ToolExecutionService** (new service):
```javascript
class ToolExecutionService {
  constructor(fileService, databaseService) {
    this.fileService = fileService;
    this.databaseService = databaseService;
    this.pendingApprovals = new Map();
  }

  async executeToolCall(toolName, parameters, requiresApproval = true) {
    if (requiresApproval) {
      return await this.requestApproval(toolName, parameters);
    }

    return await this._execute(toolName, parameters);
  }

  async _execute(toolName, parameters) {
    switch(toolName) {
      case 'read_file':
        return await this.fileService.readFile(parameters.path);

      case 'edit_file':
        // Read current content
        const content = await this.fileService.readFile(parameters.path);
        // Perform replacement
        const newContent = content.replace(parameters.search, parameters.replace);
        // Write back
        await this.fileService.writeFile(parameters.path, newContent);
        return { success: true, message: 'File updated' };

      case 'list_files':
        return await this.fileService.listFiles(parameters.path, {
          recursive: parameters.recursive
        });

      case 'create_file':
        await this.fileService.writeFile(parameters.path, parameters.content);
        return { success: true, message: 'File created' };
    }
  }

  async requestApproval(toolName, parameters) {
    // Generate approval ID
    const approvalId = uuid();

    // Store pending approval
    this.pendingApprovals.set(approvalId, { toolName, parameters });

    // Emit event to UI
    this.emit('approval-required', { approvalId, toolName, parameters });

    // Return promise that resolves when approved/rejected
    return new Promise((resolve, reject) => {
      this.approvalCallbacks.set(approvalId, { resolve, reject });
    });
  }

  async approveToolCall(approvalId, modifiedParameters = null) {
    const params = modifiedParameters || this.pendingApprovals.get(approvalId).parameters;
    const { toolName } = this.pendingApprovals.get(approvalId);

    try {
      const result = await this._execute(toolName, params);
      this.approvalCallbacks.get(approvalId).resolve(result);
    } catch (error) {
      this.approvalCallbacks.get(approvalId).reject(error);
    } finally {
      this.cleanup(approvalId);
    }
  }

  rejectToolCall(approvalId, reason) {
    this.approvalCallbacks.get(approvalId).reject(new Error(reason));
    this.cleanup(approvalId);
  }

  cleanup(approvalId) {
    this.pendingApprovals.delete(approvalId);
    this.approvalCallbacks.delete(approvalId);
  }
}
```

#### 5. Update Chat Flow

**Current Flow**:
```
User sends message
  ↓
AIProviderService.sendMessage()
  ↓
Adapter formats request
  ↓
API call with streaming
  ↓
Response chunks to UI
  ↓
Done
```

**New Flow with Tools**:
```
User sends message
  ↓
AIProviderService.sendMessage(tools: [...])
  ↓
Adapter formats request with tools
  ↓
API call with streaming
  ↓
Response chunks to UI
  ↓
AI requests tool use
  ↓
Parse tool call
  ↓
Show approval modal
  ↓
User approves
  ↓
Execute tool
  ↓
Send tool result back to AI
  ↓
AI continues (may use more tools)
  ↓
Done
```

**Files to Create**:
- `src/services/ToolExecutionService.js` (~300 lines)
- `src/components/DiffPreviewModal.jsx` (~200 lines)
- `src/components/ToolApprovalQueue.jsx` (~150 lines)

**Files to Modify**:
- All adapters: Add tool support to `formatRequest()` and `parseResponse()`
- `src/services/AIProviderService.js`: Add tool execution hooks
- `src/contexts/ClaudeContext.jsx`: Handle tool use responses
- `src/ChatInterface.jsx`: Display tool approval UI

**Dependencies to Add**:
```bash
npm install react-diff-viewer-continued
```

---

### Phase C: Agentic Workflows 🔮 FUTURE (5-7 hours)

**Goal**: Enable multi-step task planning and execution

#### Features

**1. Task Planning**
- AI writes step-by-step plan before executing
- User reviews and approves plan
- Plan stored in session for reference

**2. Step Execution**
- Execute steps sequentially
- Show progress indicator
- Verify each step before continuing

**3. Error Recovery**
- Detect when steps fail
- AI analyzes error
- Proposes fix and retries

**4. Verification**
- Run tests after changes
- Check syntax
- Verify file integrity

**Example Workflow**:
```
User: "Fix the authentication bug in login.js"

AI Plan:
1. Read login.js to understand current implementation
2. Identify the bug (missing null check on user object)
3. Edit login.js to add null check
4. Read test file to verify test coverage
5. Suggest adding test for null case if missing

User: [Approves plan]

AI Executes:
[Step 1] read_file(login.js) → Shows code → ✓
[Step 2] Found bug at line 45 → ✓
[Step 3] edit_file(login.js, ...) → Shows diff → User approves → ✓
[Step 4] read_file(login.test.js) → Shows tests → ✓
[Step 5] Suggests: "Add test for null user case" → ✓

Done. 5/5 steps completed.
```

**Files to Create**:
- `src/services/AgentOrchestrator.js` - Multi-step execution
- `src/components/TaskPlanView.jsx` - Plan visualization
- `src/components/StepProgressIndicator.jsx` - Progress UI

---

## Model Recommendations

### For Testing & Development (Local, Free)

| Model | Provider | Size | Best For | Speed |
|-------|----------|------|----------|-------|
| **Qwen2.5-Coder 7B** | Ollama | 7B | Code generation/editing | Fast |
| **Qwen2.5-Coder 32B** | Both | 32B | Complex reasoning | Slow |
| **DeepSeek Coder 6.7B** | Ollama | 6.7B | Code completion | Fast |
| **CodeLlama 13B** | Both | 13B | Code understanding | Medium |
| **Llama 3.1 8B** | Both | 8B | General chat | Fast |

**Recommendation**: Start with **Qwen2.5-Coder 7B** - excellent balance of speed and capability.

### For Production (Cloud, Paid)

| Model | Provider | Cost | Best For | Tool Use |
|-------|----------|------|----------|----------|
| **Claude Sonnet 3.5** | Anthropic | $3/$15 per 1M | Best overall | ✅ Native |
| **Claude Opus 4.5** | Anthropic | $15/$75 per 1M | Complex tasks | ✅ Native |
| **GPT-4 Turbo** | OpenAI | $10/$30 per 1M | General purpose | ✅ Native |

**Recommendation**: **Claude Sonnet 3.5** - best price/performance for coding tasks.

---

## Testing Strategy

### Phase A Testing (Local LLMs) ✅

**Setup**:
```bash
# Install Ollama
brew install ollama  # Mac
# or download from https://ollama.ai

# Pull recommended model
ollama pull qwen2.5-coder:7b

# Start server
ollama serve
```

**Test Cases**:
1. **Basic Chat**
   - Send "Hello" → Verify streaming response
   - Send "Explain async/await" → Verify technical response

2. **Context Injection**
   - Drag JavaScript file to context
   - Ask "What does this file do?"
   - Verify AI references specific code

3. **Model Switching**
   - Switch to llama3.1
   - Verify model dropdown updates
   - Send message → Verify different model responses

4. **Error Handling**
   - Stop Ollama service
   - Try to send message
   - Verify helpful error message

### Phase B Testing (Tool Use) 🔄

**Test Cases**:
1. **Read File**
   - Ask: "Read the contents of login.js"
   - Verify file is read and displayed

2. **Edit File**
   - Ask: "Change the timeout in config.js from 5000 to 10000"
   - Verify diff preview shows
   - Approve → Verify file is updated

3. **List Files**
   - Ask: "What files are in the src/components directory?"
   - Verify file list is accurate

4. **Rejection Flow**
   - Ask AI to edit a file
   - Reject the change
   - Verify file is unchanged
   - Verify AI acknowledges rejection

5. **Multi-tool Task**
   - Ask: "Find all TODO comments in the project and list them"
   - Verify AI uses list_files then read_file for each
   - Verify multiple approval modals

### Phase C Testing (Agentic) 🔮

**Test Cases**:
1. **Plan Generation**
   - Ask: "Refactor the authentication system"
   - Verify AI produces step-by-step plan
   - Verify plan is clear and actionable

2. **Step Execution**
   - Approve plan
   - Verify steps execute sequentially
   - Verify progress indicator updates

3. **Error Recovery**
   - Introduce syntax error
   - Ask AI to fix bug
   - Verify AI detects error and retries

---

## Success Criteria

### MVP Complete When:

**Phase A (Local LLMs)** ✅:
- [x] User can chat with Ollama/LM Studio
- [x] Streaming responses work smoothly
- [x] Context files inject correctly
- [x] Token tracking works (even with $0 models)
- [x] Editor supports syntax highlighting
- [x] User can save files with Ctrl+S

**Phase B (Tool Use)** 🔄:
- [ ] AI can read files on command
- [ ] AI can propose file edits
- [ ] Diff preview shows before applying
- [ ] User can approve/reject edits
- [ ] Rejected edits don't modify files
- [ ] Approved edits save correctly

**Phase C (Agentic)** 🔮:
- [ ] AI creates execution plans
- [ ] Plans are readable and accurate
- [ ] Steps execute sequentially
- [ ] User can monitor progress
- [ ] Errors trigger recovery attempts

---

## Dependencies

### Already Installed ✅
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.71.2",
    "openai": "^6.16.0",
    "@monaco-editor/react": "^4.7.0",
    "better-sqlite3": "^12.6.0",
    "electron-store": "^11.0.2",
    "tiktoken": "^1.0.22",
    "uuid": "^13.0.0"
  }
}
```

### To Add for Phase B 📦
```bash
npm install react-diff-viewer-continued
```

### Optional Enhancements
```bash
npm install @uiw/react-codemirror  # Alternative to Monaco
npm install monaco-languageclient   # LSP support
```

---

## Architecture Decisions

### Why Local First?

**Rationale** (from 2026-01-14 pivot):
1. **Cost**: Testing with Claude costs $0.03-$0.15 per conversation
2. **Speed**: Local models respond in 1-5 seconds vs 2-10 seconds for cloud
3. **Privacy**: Code never leaves the machine
4. **Iteration**: No rate limits, test rapidly
5. **Quality**: Qwen2.5-Coder is optimized for code tasks

### Why Tool Use Over Direct Editing?

**Problem**: AI writing code directly to disk is dangerous
- No review before changes
- Hard to undo mistakes
- User loses control

**Solution**: Tool use with approval
- AI proposes changes via tools
- User reviews diff
- User approves or rejects
- Clear audit trail

### Why Adapter Pattern?

**Flexibility**:
- Support 4+ providers with same UI
- Switch runtime without restart
- Test with local, deploy with cloud
- Add new providers in ~30 minutes

---

## Known Risks

### Technical Risks

**Medium Risk** ⚠️:
- Tool use support varies by model (some models poor at function calling)
- Diff algorithm may not work for large files
- Approval UI could become overwhelming with many tools

**Low Risk** ✅:
- Local LLM APIs are straightforward
- Adapter pattern is proven
- File operations are standard

### Product Risks

**High Risk** 🔴:
- Users may not want approval for every edit (gets tedious)
- AI might make mistakes even with approval
- Undo/redo for AI changes is complex

**Mitigation**:
- Add "trust mode" for experienced users
- Implement robust undo system
- Clear visual indicators of AI changes

---

## Timeline Estimate

### Phase A: Local LLMs ✅
- **Estimated**: 2-3 hours
- **Actual**: 2 hours (2026-01-14 evening)
- **Status**: Complete, ready for testing

### Phase B: Tool Use 🔄
- **Estimated**: 3-5 hours
- **Breakdown**:
  - Tool interface design: 30 min
  - Adapter updates: 1 hour
  - ToolExecutionService: 1 hour
  - DiffPreviewModal: 1 hour
  - Testing: 1 hour

### Phase C: Agentic Workflows 🔮
- **Estimated**: 5-7 hours
- **Breakdown**:
  - AgentOrchestrator: 2 hours
  - Plan generation UI: 1 hour
  - Step execution: 2 hours
  - Error recovery: 1 hour
  - Testing: 1 hour

**Total MVP Time**: 10-15 hours of development

---

## Future Enhancements (Post-MVP)

### User-Requested Features
1. **Prompt Library** - Save and categorize prompts
2. **Black Box Recorder UI** - Visual session timeline
3. **Session Branching** - Fork sessions for experimentation
4. **Git Integration** - Auto-commit AI changes

### Technical Enhancements
1. **Multi-model Workflows** - Use different models for different steps
2. **Caching** - Cache context to reduce costs
3. **Streaming Diffs** - Show diffs as AI generates them
4. **Batch Operations** - Apply multiple edits at once

### Advanced Agentic Features
1. **Self-Correction** - AI reviews own changes
2. **Test Generation** - AI writes tests for changes
3. **Documentation** - AI documents code changes
4. **Code Review** - AI reviews PRs

---

## Getting Started (For New Contributors)

### 1. Read These First
- `docs/dev-notes/2026-01-14-evening-local-llm-pivot.md` - Strategic context
- `docs/TESTING-LOCAL-LLM.md` - Setup guide
- `docs/Implementation-Status.md` - Current progress

### 2. Set Up Local LLM
```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Pull model
ollama pull qwen2.5-coder:7b

# Start server
ollama serve
```

### 3. Run Context Kiln
```bash
npm install
npm run build
npm run dev
```

### 4. Test Basic Chat
- Open Settings (Ctrl+,)
- Provider: Ollama
- Model: qwen2.5-coder:7b
- Send message: "Hello"

### 5. Start Contributing
- Pick a task from Phase B (tool use)
- Read the design above
- Create feature branch
- Implement with tests
- Submit PR

---

## Questions?

- **Why not Copilot?** - Copilot is completion-focused. We're building for agentic workflows.
- **Why Electron?** - Cross-platform, access to native APIs, mature ecosystem.
- **Why SQLite?** - Fast, simple, queryable, portable.
- **Why not VS Code extension?** - Want dedicated UI, full control over UX.

---

**Status**: Phase A complete, Phase B design complete, ready to implement
**Next Step**: Test local LLMs, then implement tool use
**Target**: Full agentic MVP in 10-15 hours of development

---

_This is a living document. As we learn from testing and implementation, we'll update this plan._

**Version History**:
- v1.0: Original plan (Claude API first)
- v1.1: Adapter pattern pivot
- v1.2: Agentic features added
- **v2.0**: Local-first strategy (2026-01-14)
