# Context Kiln Tool Use System Design

**Version**: 1.0
**Date**: 2026-01-14
**Status**: Design Phase (Phase B - Not Yet Implemented)
**Estimated Implementation**: 3-5 hours

---

## Overview

This document specifies the design for Context Kiln's **tool use system**, which enables AI models to perform actions beyond chat responses. This is the critical feature that transforms Context Kiln from a chat tool into an **agentic development assistant**.

### What is Tool Use?

Tool use (also called "function calling") allows AI models to:
1. **Read files** - Examine code without user manually adding to context
2. **Edit files** - Propose and apply changes directly
3. **List files** - Explore project structure
4. **Create files** - Generate new code files

### Why This Matters

**Without tool use**: AI can only give advice in chat
**With tool use**: AI can actually make changes, like GitHub Copilot or Claude Code CLI

---

## Architecture Overview

```
User: "Fix the bug in calculateTotal"
  ↓
ChatInterface → ClaudeContext
  ↓
AIProviderService.sendMessage()
  ↓
[Adapter] transforms context + adds tool definitions
  ↓
API responds with tool call: edit_file(path="calc.js", ...)
  ↓
ToolExecutionService intercepts tool call
  ↓
DiffPreviewModal shows proposed changes
  ↓
User clicks Approve/Reject
  ↓
If approved: FileService.writeFile()
  ↓
ChatInterface shows "✅ Applied changes to calc.js"
```

---

## Phase B Implementation Plan

### Files to Create (6 files)

1. **`src/services/ToolExecutionService.js`** (~300 lines)
   - Executes tool calls from AI responses
   - Routes to appropriate handlers (readFile, editFile, etc.)
   - Manages approval queue
   - Handles errors and rollback

2. **`src/components/DiffPreviewModal.jsx`** (~250 lines)
   - Shows side-by-side diff (before/after)
   - Syntax highlighting for both versions
   - Approve/Reject/Edit buttons
   - File path and change summary

3. **`src/components/ToolCallDisplay.jsx`** (~150 lines)
   - Displays tool calls in chat (like code blocks)
   - Shows tool name, parameters, status
   - Visual feedback (pending/approved/rejected/executed)

4. **`src/contexts/ToolContext.jsx`** (~200 lines)
   - State for pending tool calls
   - Approval queue management
   - Tool execution history
   - Error handling

5. **`src/utils/diffUtils.js`** (~150 lines)
   - Diff calculation (line-by-line)
   - Format diffs for display
   - Apply edits to file content

6. **`docs/TOOL-INTERFACE.md`** (~200 lines)
   - Tool specifications for documentation
   - Example prompts that trigger tools
   - Troubleshooting guide

### Files to Modify (5 files)

1. **`src/services/adapters/BaseAdapter.js`**
   - Add `getToolDefinitions()` abstract method
   - Add `parseToolCalls()` method to extract tool calls from responses

2. **`src/services/adapters/AnthropicAdapter.js`**
   - Implement `getToolDefinitions()` with Claude format
   - Parse tool calls from Claude API responses
   - Handle tool use in streaming mode

3. **`src/services/adapters/OllamaAdapter.js`**
   - Implement `getToolDefinitions()` with function calling format
   - Parse tool calls (Ollama supports function calling with certain models)
   - Note: Not all Ollama models support function calling

4. **`src/services/adapters/LMStudioAdapter.js`**
   - Implement `getToolDefinitions()` with OpenAI format
   - Parse tool calls from SSE stream

5. **`src/ChatInterface.jsx`**
   - Integrate ToolCallDisplay component
   - Show tool call results in chat
   - Add "Waiting for approval..." indicator

---

## Tool Interface Specifications

### Tool 1: read_file

**Purpose**: Allow AI to read a file's contents without user manually adding to context.

**Parameters**:
- `path` (string, required) - Relative path from project root
- `line_start` (number, optional) - Start reading from this line
- `line_end` (number, optional) - Stop reading at this line

**Returns**:
```json
{
  "path": "src/utils/calculator.js",
  "content": "function calculateTotal() {...}",
  "lines": 42,
  "language": "javascript"
}
```

**Example AI Usage**:
```
User: "Fix the bug in calculateTotal"
AI: Let me read that file first.
[Calls read_file with path="src/utils/calculator.js"]
[Receives content]
AI: I see the issue on line 15. Let me fix it.
```

**Implementation**:
```javascript
// In ToolExecutionService.js
async executeReadFile({ path, line_start, line_end }) {
  // Validate path is within project
  const fullPath = this.fileService.resolvePath(this.projectRoot, path);

  // Security check
  if (!fullPath.startsWith(this.projectRoot)) {
    throw new Error('Path outside project root');
  }

  // Read file
  const content = await this.fileService.readFile(fullPath);

  // Apply line range if specified
  const lines = content.split('\n');
  const selectedLines = line_start
    ? lines.slice(line_start - 1, line_end || lines.length)
    : lines;

  return {
    path,
    content: selectedLines.join('\n'),
    lines: selectedLines.length,
    language: getLanguageForFile(path)
  };
}
```

---

### Tool 2: edit_file

**Purpose**: Propose changes to an existing file.

**Parameters**:
- `path` (string, required) - Relative path from project root
- `old_content` (string, required) - Exact content to replace (for verification)
- `new_content` (string, required) - New content to insert
- `description` (string, required) - Human-readable change description

**Workflow**:
1. AI calls edit_file with parameters
2. ToolExecutionService validates old_content matches current file
3. DiffPreviewModal shows diff to user
4. User approves or rejects
5. If approved, FileService applies change
6. Result sent back to AI in next message

**Returns** (after approval):
```json
{
  "path": "src/utils/calculator.js",
  "status": "applied",
  "lines_changed": 3,
  "diff": "..."
}
```

**Example AI Usage**:
```
User: "Change the discount from 10% to 15%"
AI: I'll update the discount calculation.
[Calls edit_file with:
  path="src/utils/calculator.js"
  old_content="const discount = 0.10;"
  new_content="const discount = 0.15;"
  description="Update discount rate from 10% to 15%"
]
[User sees diff preview and clicks Approve]
AI: ✅ Successfully updated discount rate in calculator.js
```

**Implementation**:
```javascript
// In ToolExecutionService.js
async executeEditFile({ path, old_content, new_content, description }) {
  const fullPath = this.fileService.resolvePath(this.projectRoot, path);

  // Security check
  if (!fullPath.startsWith(this.projectRoot)) {
    throw new Error('Path outside project root');
  }

  // Read current content
  const currentContent = await this.fileService.readFile(fullPath);

  // Verify old_content matches
  if (!currentContent.includes(old_content)) {
    throw new Error('old_content not found in file (file may have changed)');
  }

  // Calculate new file content
  const updatedContent = currentContent.replace(old_content, new_content);

  // Calculate diff for preview
  const diff = this.diffUtils.calculateDiff(currentContent, updatedContent);

  // Queue for approval
  const toolCall = {
    id: generateUUID(),
    type: 'edit_file',
    path,
    currentContent,
    updatedContent,
    diff,
    description,
    status: 'pending'
  };

  await this.toolContext.addPendingToolCall(toolCall);

  // Return promise that resolves when user approves/rejects
  return new Promise((resolve, reject) => {
    this.approvalCallbacks.set(toolCall.id, { resolve, reject });
  });
}
```

---

### Tool 3: list_files

**Purpose**: Let AI explore project structure.

**Parameters**:
- `path` (string, optional) - Directory to list (defaults to project root)
- `pattern` (string, optional) - Glob pattern filter (e.g., "*.js")
- `recursive` (boolean, optional) - Include subdirectories (default: false)

**Returns**:
```json
{
  "path": "src/",
  "files": [
    { "name": "index.js", "type": "file", "size": 1024 },
    { "name": "utils/", "type": "directory" }
  ],
  "count": 2
}
```

**Example AI Usage**:
```
User: "Find all the test files"
AI: Let me search for test files.
[Calls list_files with pattern="**/*.test.js", recursive=true]
AI: I found 12 test files: ...
```

**Implementation**:
```javascript
// In ToolExecutionService.js
async executeListFiles({ path = '.', pattern, recursive = false }) {
  const fullPath = this.fileService.resolvePath(this.projectRoot, path);

  // Security check
  if (!fullPath.startsWith(this.projectRoot)) {
    throw new Error('Path outside project root');
  }

  // Read directory
  const entries = await this.fileService.readDirectory(fullPath, recursive);

  // Apply pattern filter if specified
  const filtered = pattern
    ? entries.filter(e => minimatch(e.name, pattern))
    : entries;

  return {
    path,
    files: filtered.map(e => ({
      name: e.name,
      type: e.isDirectory ? 'directory' : 'file',
      size: e.size
    })),
    count: filtered.length
  };
}
```

---

### Tool 4: create_file

**Purpose**: Generate new files.

**Parameters**:
- `path` (string, required) - Relative path for new file
- `content` (string, required) - File content
- `description` (string, required) - Why creating this file

**Workflow**:
1. AI calls create_file
2. ToolExecutionService checks file doesn't exist
3. DiffPreviewModal shows "New File" with content preview
4. User approves or rejects
5. If approved, FileService creates file

**Returns**:
```json
{
  "path": "src/utils/validator.js",
  "status": "created",
  "lines": 25
}
```

**Example AI Usage**:
```
User: "Create a utility for email validation"
AI: I'll create a new validator utility.
[Calls create_file with:
  path="src/utils/emailValidator.js"
  content="export function validateEmail(email) {...}"
  description="Email validation utility"
]
AI: ✅ Created emailValidator.js
```

**Implementation**:
```javascript
// In ToolExecutionService.js
async executeCreateFile({ path, content, description }) {
  const fullPath = this.fileService.resolvePath(this.projectRoot, path);

  // Security check
  if (!fullPath.startsWith(this.projectRoot)) {
    throw new Error('Path outside project root');
  }

  // Check file doesn't exist
  const exists = await this.fileService.fileExists(fullPath);
  if (exists) {
    throw new Error('File already exists (use edit_file to modify)');
  }

  // Queue for approval
  const toolCall = {
    id: generateUUID(),
    type: 'create_file',
    path,
    content,
    description,
    status: 'pending'
  };

  await this.toolContext.addPendingToolCall(toolCall);

  return new Promise((resolve, reject) => {
    this.approvalCallbacks.set(toolCall.id, { resolve, reject });
  });
}
```

---

## Adapter-Specific Formats

### Anthropic (Claude) Format

Claude uses a structured tool use format with `tool` blocks.

**Request**:
```json
{
  "model": "claude-3-5-sonnet-20241022",
  "messages": [
    {
      "role": "user",
      "content": "Fix the bug in calculator.js"
    }
  ],
  "tools": [
    {
      "name": "read_file",
      "description": "Read the contents of a file",
      "input_schema": {
        "type": "object",
        "properties": {
          "path": {
            "type": "string",
            "description": "Relative path from project root"
          },
          "line_start": {
            "type": "number",
            "description": "Start reading from this line (optional)"
          },
          "line_end": {
            "type": "number",
            "description": "Stop reading at this line (optional)"
          }
        },
        "required": ["path"]
      }
    },
    {
      "name": "edit_file",
      "description": "Propose changes to an existing file",
      "input_schema": {
        "type": "object",
        "properties": {
          "path": { "type": "string" },
          "old_content": { "type": "string" },
          "new_content": { "type": "string" },
          "description": { "type": "string" }
        },
        "required": ["path", "old_content", "new_content", "description"]
      }
    }
  ]
}
```

**Response** (when AI wants to use a tool):
```json
{
  "content": [
    {
      "type": "text",
      "text": "I'll read that file to understand the issue."
    },
    {
      "type": "tool_use",
      "id": "toolu_123",
      "name": "read_file",
      "input": {
        "path": "src/utils/calculator.js"
      }
    }
  ],
  "stop_reason": "tool_use"
}
```

**Next Request** (after tool execution):
```json
{
  "messages": [
    // ... previous messages ...
    {
      "role": "assistant",
      "content": [
        { "type": "text", "text": "I'll read that file..." },
        { "type": "tool_use", "id": "toolu_123", "name": "read_file", "input": {...} }
      ]
    },
    {
      "role": "user",
      "content": [
        {
          "type": "tool_result",
          "tool_use_id": "toolu_123",
          "content": "{\"path\":\"...\",\"content\":\"...\"}"
        }
      ]
    }
  ]
}
```

---

### Ollama Format

Ollama supports function calling with certain models (e.g., Qwen2.5-Coder, Llama 3.1 with tools).

**Request**:
```json
{
  "model": "qwen2.5-coder",
  "messages": [...],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "read_file",
        "description": "Read the contents of a file",
        "parameters": {
          "type": "object",
          "properties": {
            "path": { "type": "string", "description": "..." }
          },
          "required": ["path"]
        }
      }
    }
  ]
}
```

**Response**:
```json
{
  "message": {
    "role": "assistant",
    "content": "",
    "tool_calls": [
      {
        "function": {
          "name": "read_file",
          "arguments": "{\"path\":\"src/utils/calculator.js\"}"
        }
      }
    ]
  }
}
```

**Important**: Not all Ollama models support function calling. We'll need to:
1. Check model capabilities
2. Fall back to text-based instructions if not supported
3. Document which models work best

---

### LM Studio Format (OpenAI-Compatible)

LM Studio uses OpenAI's function calling format.

**Request**:
```json
{
  "model": "local-model",
  "messages": [...],
  "functions": [
    {
      "name": "read_file",
      "description": "Read the contents of a file",
      "parameters": {
        "type": "object",
        "properties": {
          "path": { "type": "string" }
        },
        "required": ["path"]
      }
    }
  ],
  "function_call": "auto"
}
```

**Response**:
```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": null,
        "function_call": {
          "name": "read_file",
          "arguments": "{\"path\":\"src/utils/calculator.js\"}"
        }
      }
    }
  ]
}
```

---

## Approval Workflow Design

### DiffPreviewModal Component

**Visual Design**:
```
┌────────────────────────────────────────────────────┐
│ 📝 Edit File: src/utils/calculator.js             │
├────────────────────────────────────────────────────┤
│                                                    │
│ Description: Update discount rate from 10% to 15% │
│                                                    │
│ ┌────────────────────┬────────────────────────┐   │
│ │ Before             │ After                  │   │
│ ├────────────────────┼────────────────────────┤   │
│ │  1 function calc() │  1 function calc() {   │   │
│ │  2   const d = 0.1;│  2   const d = 0.15;   │   │  ← Changed line highlighted
│ │  3   return d;     │  3   return d;         │   │
│ └────────────────────┴────────────────────────┘   │
│                                                    │
│ Lines changed: 1    Additions: 1    Deletions: 1  │
│                                                    │
│ [ Approve ]  [ Reject ]  [ Edit Manually ]        │
└────────────────────────────────────────────────────┘
```

**Component Structure**:
```jsx
function DiffPreviewModal({ toolCall, onApprove, onReject, onEdit }) {
  const { path, currentContent, updatedContent, diff, description } = toolCall;

  return (
    <Modal
      open={true}
      title={`📝 ${toolCall.type === 'edit_file' ? 'Edit' : 'Create'} File: ${path}`}
      width={900}
      footer={null}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* Description */}
        <Alert message={description} type="info" />

        {/* Side-by-side diff */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <Typography.Text strong>Before</Typography.Text>
            <SyntaxHighlighter language={getLanguageForFile(path)}>
              {currentContent}
            </SyntaxHighlighter>
          </div>

          <div style={{ flex: 1 }}>
            <Typography.Text strong>After</Typography.Text>
            <SyntaxHighlighter language={getLanguageForFile(path)}>
              {updatedContent}
            </SyntaxHighlighter>
          </div>
        </div>

        {/* Stats */}
        <Space>
          <Tag>Lines changed: {diff.changedLines}</Tag>
          <Tag color="green">+{diff.additions}</Tag>
          <Tag color="red">-{diff.deletions}</Tag>
        </Space>

        {/* Actions */}
        <Space>
          <Button type="primary" icon={<CheckOutlined />} onClick={onApprove}>
            Approve
          </Button>
          <Button danger icon={<CloseOutlined />} onClick={onReject}>
            Reject
          </Button>
          <Button icon={<EditOutlined />} onClick={onEdit}>
            Edit Manually
          </Button>
        </Space>
      </Space>
    </Modal>
  );
}
```

---

### ToolCallDisplay Component

Shows tool calls in chat interface (similar to code blocks).

**Visual Design**:
```
┌────────────────────────────────────────────┐
│ 🔧 Tool Call: read_file                   │
├────────────────────────────────────────────┤
│ path: "src/utils/calculator.js"           │
│ line_start: 10                            │
│ line_end: 20                              │
│                                           │
│ Status: ⏳ Executing...                    │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ ✅ Tool Result: read_file                  │
├────────────────────────────────────────────┤
│ Read 42 lines from calculator.js          │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ 📝 Tool Call: edit_file                    │
├────────────────────────────────────────────┤
│ path: "src/utils/calculator.js"           │
│ description: "Fix discount calculation"   │
│                                           │
│ Status: ⏰ Waiting for approval            │
│ [View Diff]                               │
└────────────────────────────────────────────┘
```

**Component Structure**:
```jsx
function ToolCallDisplay({ toolCall }) {
  const getStatusIcon = () => {
    switch (toolCall.status) {
      case 'pending': return <ClockCircleOutlined />;
      case 'approved': return <CheckCircleOutlined />;
      case 'rejected': return <CloseCircleOutlined />;
      case 'executed': return <CheckOutlined />;
      case 'error': return <ExclamationCircleOutlined />;
    }
  };

  const getStatusColor = () => {
    switch (toolCall.status) {
      case 'pending': return 'orange';
      case 'approved': return 'green';
      case 'rejected': return 'red';
      case 'executed': return 'blue';
      case 'error': return 'red';
    }
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          <ToolOutlined />
          <span>Tool Call: {toolCall.type}</span>
        </Space>
      }
      style={{ marginBottom: '8px' }}
    >
      {/* Parameters */}
      <Space direction="vertical" style={{ width: '100%' }}>
        {Object.entries(toolCall.parameters).map(([key, value]) => (
          <div key={key}>
            <Typography.Text strong>{key}:</Typography.Text>{' '}
            <Typography.Text code>{JSON.stringify(value)}</Typography.Text>
          </div>
        ))}

        {/* Status */}
        <Tag color={getStatusColor()} icon={getStatusIcon()}>
          {toolCall.status}
        </Tag>

        {/* Actions */}
        {toolCall.status === 'pending' && toolCall.type !== 'read_file' && (
          <Button size="small" onClick={() => showDiffPreview(toolCall)}>
            View Diff
          </Button>
        )}
      </Space>
    </Card>
  );
}
```

---

## Security Considerations

### Path Validation

**CRITICAL**: All file operations must validate paths to prevent:
- Reading/writing files outside project root
- Path traversal attacks (../../etc/passwd)
- Symlink attacks

**Implementation**:
```javascript
function validatePath(projectRoot, requestedPath) {
  // Resolve to absolute path
  const absolutePath = path.resolve(projectRoot, requestedPath);

  // Check it's within project root
  if (!absolutePath.startsWith(projectRoot)) {
    throw new Error('Path outside project root');
  }

  // Resolve symlinks and check again
  const realPath = fs.realpathSync(absolutePath);
  if (!realPath.startsWith(projectRoot)) {
    throw new Error('Symlink points outside project root');
  }

  return absolutePath;
}
```

### File Size Limits

Prevent AI from reading/creating huge files:

```javascript
const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const MAX_LINES = 10000;

async function readFileWithLimits(path) {
  const stats = await fs.stat(path);

  if (stats.size > MAX_FILE_SIZE) {
    throw new Error('File too large (max 1MB)');
  }

  const content = await fs.readFile(path, 'utf-8');
  const lines = content.split('\n');

  if (lines.length > MAX_LINES) {
    throw new Error('File too many lines (max 10,000)');
  }

  return content;
}
```

### Approval Required

**NEVER** auto-approve file modifications. Always require human approval for:
- edit_file
- create_file
- Any destructive operation

**Auto-approve only for**:
- read_file (safe, read-only)
- list_files (safe, read-only)

---

## Error Handling

### Tool Execution Errors

```javascript
try {
  const result = await executeToolCall(toolCall);
  return { success: true, result };
} catch (error) {
  // Categorize error
  const errorType =
    error.message.includes('outside project') ? 'security' :
    error.message.includes('not found') ? 'not_found' :
    error.message.includes('permission') ? 'permission' :
    'unknown';

  // Return error to AI
  return {
    success: false,
    error: {
      type: errorType,
      message: error.message,
      recoverable: errorType === 'not_found' || errorType === 'unknown'
    }
  };
}
```

### User Rejection

When user rejects a tool call:
```javascript
function handleRejection(toolCall, reason) {
  // Mark as rejected
  toolCall.status = 'rejected';

  // Send rejection back to AI
  const rejection = {
    tool_use_id: toolCall.id,
    content: JSON.stringify({
      success: false,
      error: {
        type: 'user_rejected',
        message: reason || 'User rejected this change',
        recoverable: true
      }
    })
  };

  // AI can try again with different approach
  return rejection;
}
```

---

## Testing Strategy

### Unit Tests

Test each tool handler in isolation:

```javascript
describe('ToolExecutionService', () => {
  describe('executeReadFile', () => {
    it('should read file content', async () => {
      const result = await service.executeReadFile({
        path: 'test.js'
      });

      expect(result.content).toBe('console.log("test");');
      expect(result.lines).toBe(1);
      expect(result.language).toBe('javascript');
    });

    it('should reject path outside project', async () => {
      await expect(
        service.executeReadFile({ path: '../../etc/passwd' })
      ).rejects.toThrow('outside project root');
    });
  });
});
```

### Integration Tests

Test full workflow with mocked AI responses:

```javascript
describe('Tool Use Workflow', () => {
  it('should handle edit_file with approval', async () => {
    // Mock AI response with tool call
    const aiResponse = {
      tool_calls: [{
        type: 'edit_file',
        parameters: {
          path: 'test.js',
          old_content: 'const x = 1;',
          new_content: 'const x = 2;',
          description: 'Update x'
        }
      }]
    };

    // Process tool call
    const toolCall = await toolService.processAIResponse(aiResponse);

    // Verify approval modal shown
    expect(diffPreviewModal.isVisible()).toBe(true);

    // User approves
    await diffPreviewModal.approve();

    // Verify file updated
    const content = await fileService.readFile('test.js');
    expect(content).toBe('const x = 2;');
  });
});
```

### Manual Testing Checklist

- [ ] Read a file
- [ ] Edit a file (approve)
- [ ] Edit a file (reject)
- [ ] Create a new file
- [ ] List files in directory
- [ ] Try to access file outside project (should fail)
- [ ] Try to read huge file (should fail with error)
- [ ] Edit file with incorrect old_content (should fail)
- [ ] Test with Ollama (function calling models)
- [ ] Test with Claude API
- [ ] Verify diff preview shows changes correctly
- [ ] Test "Edit Manually" button opens editor

---

## Performance Considerations

### Diff Calculation

For large files, diff calculation can be slow. Use a library:

```bash
npm install diff
```

```javascript
const diff = require('diff');

function calculateDiff(oldContent, newContent) {
  const changes = diff.diffLines(oldContent, newContent);

  let additions = 0;
  let deletions = 0;
  let changedLines = 0;

  changes.forEach(part => {
    if (part.added) additions += part.count;
    if (part.removed) deletions += part.count;
    if (part.added || part.removed) changedLines += part.count;
  });

  return {
    changes,
    additions,
    deletions,
    changedLines
  };
}
```

### Batching Tool Calls

If AI makes multiple tool calls, batch approvals:

```jsx
function BatchApprovalModal({ toolCalls, onApproveAll, onReviewIndividually }) {
  return (
    <Modal title="Multiple Changes Pending">
      <List
        dataSource={toolCalls}
        renderItem={tc => (
          <List.Item>
            <Typography.Text>{tc.description}</Typography.Text>
            <Tag>{tc.path}</Tag>
          </List.Item>
        )}
      />

      <Space>
        <Button type="primary" onClick={onApproveAll}>
          Approve All ({toolCalls.length})
        </Button>
        <Button onClick={onReviewIndividually}>
          Review One by One
        </Button>
      </Space>
    </Modal>
  );
}
```

---

## Model Compatibility

### Claude (Anthropic)

- ✅ **Excellent** - Native tool use support
- ✅ Streaming compatible
- ✅ Multi-tool calls in single response
- ✅ Clear documentation

**Recommended Models**:
- Claude Sonnet 3.5 (best balance)
- Claude Opus 4.5 (best quality, expensive)

### Ollama (Local)

- ⚠️ **Partial** - Depends on model
- ✅ Works with: Qwen2.5-Coder, Llama 3.1 (70B+)
- ❌ Doesn't work with: Llama 3.1 (8B), many others
- ⚠️ Quality varies significantly

**Fallback Strategy**: If model doesn't support function calling, provide text instructions:
```
Available commands:
- READ: path/to/file.js - Read a file
- EDIT: path/to/file.js | old content | new content - Edit a file

Use these commands in your response.
```

### LM Studio (Local)

- ⚠️ **Partial** - Depends on loaded model
- ✅ OpenAI-compatible format
- ⚠️ Quality varies by model
- ✅ Works well with instruction-tuned models

---

## Future Enhancements (Phase C)

### Multi-Step Workflows

Allow AI to chain tools without approval for each step:

```
User: "Refactor the authentication system"
AI: I'll need to:
  1. Read current auth files
  2. Create new auth service
  3. Update existing files
  4. Update tests

Is this plan okay?
User: Yes
AI: [Executes 10+ tool calls with single approval]
```

### Undo/Redo

Track all file changes for easy rollback:
```javascript
const changeHistory = [
  { file: 'calc.js', before: '...', after: '...', timestamp: ... },
  { file: 'index.js', before: '...', after: '...', timestamp: ... }
];

function undo() {
  const lastChange = changeHistory.pop();
  fs.writeFileSync(lastChange.file, lastChange.before);
}
```

### Git Integration

Auto-commit AI changes:
```javascript
async function applyWithGitCommit(toolCall) {
  await executeToolCall(toolCall);

  await git.add(toolCall.path);
  await git.commit(`AI: ${toolCall.description}`);
}
```

---

## Implementation Checklist

### Phase B Tasks

1. **Setup** (30 min)
   - [ ] Install dependencies (`npm install diff`)
   - [ ] Create folder structure

2. **Core Service** (90 min)
   - [ ] Create ToolExecutionService.js
   - [ ] Implement executeReadFile
   - [ ] Implement executeEditFile
   - [ ] Implement executeListFiles
   - [ ] Implement executeCreateFile
   - [ ] Add path validation
   - [ ] Add file size limits
   - [ ] Add error handling

3. **UI Components** (60 min)
   - [ ] Create DiffPreviewModal.jsx
   - [ ] Create ToolCallDisplay.jsx
   - [ ] Add to ChatInterface.jsx
   - [ ] Style with Ant Design

4. **Context** (30 min)
   - [ ] Create ToolContext.jsx
   - [ ] Add approval queue state
   - [ ] Add tool execution history

5. **Adapter Integration** (60 min)
   - [ ] Update BaseAdapter.js
   - [ ] Implement Claude tool definitions
   - [ ] Implement Ollama tool definitions (with fallback)
   - [ ] Implement LM Studio tool definitions
   - [ ] Parse tool calls from responses

6. **Testing** (30 min)
   - [ ] Manual test with Ollama
   - [ ] Test approval workflow
   - [ ] Test rejection
   - [ ] Test error handling
   - [ ] Test path validation

**Total Estimated Time**: ~5 hours

---

**Status**: Ready for Implementation
**Next Step**: Begin Phase B implementation starting with ToolExecutionService.js
**Documentation**: Complete

---

_This design document will evolve as we implement and test Phase B._
