# Agentic Tools - Feature Specification

**Created**: 2026-01-26
**Status**: Design Complete, Implementation Pending
**Priority**: Critical

---

## Overview

Enable Context Kiln to perform agentic tasks by wiring the 8 implemented tools to the Claude API. This allows the AI to autonomously explore codebases, search files, and propose edits with human-in-the-loop approval.

**Current State**: Tools are implemented but not connected to Claude API.

**Goal**: Make Claude aware of available tools and enable multi-turn tool execution loops.

---

## Architecture

### Components

1. **AnthropicAdapter** - Format tool definitions, parse tool_use blocks, format tool results
2. **AIProviderService** - Orchestrate tool execution loop, manage context
3. **ToolExecutionService** - Execute individual tools (already complete)
4. **ToolContext** - Manage approvals and pending calls (already complete)

### Data Flow

```
User Message
    ↓
AIProviderService.sendMessage()
    ↓
AnthropicAdapter.formatRequest() → includes tool definitions
    ↓
Claude API (streaming response)
    ↓
Response contains tool_use blocks?
    ├─ Yes → Execute tools → Send tool_result blocks → Continue loop
    └─ No → Display final response
```

---

## Tool Definitions

All 8 tools must be defined in Anthropic API format:

### 1. read_file
```javascript
{
  name: "read_file",
  description: "Read the contents of a file from the project. Returns the full file content with line numbers. Use this to understand existing code, check implementations, or gather context before making changes.",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Relative path to the file from project root (e.g., 'src/components/App.jsx')"
      }
    },
    required: ["path"]
  }
}
```

### 2. list_files
```javascript
{
  name: "list_files",
  description: "List all files and directories in a given path. Shows file types, sizes, and modification dates. Use this to explore project structure or find files in a directory.",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Relative path to directory from project root. Use '.' for root directory."
      },
      recursive: {
        type: "boolean",
        description: "If true, list files recursively in subdirectories. Default false."
      }
    },
    required: ["path"]
  }
}
```

### 3. search_files
```javascript
{
  name: "search_files",
  description: "Search for text patterns across files using regex. Returns file paths, line numbers, and matching content. Use this to find function calls, variable usage, or specific patterns in code.",
  input_schema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Regular expression pattern to search for"
      },
      path: {
        type: "string",
        description: "Optional: limit search to specific directory. Defaults to entire project."
      },
      filePattern: {
        type: "string",
        description: "Optional: glob pattern to filter files (e.g., '*.js', '*.jsx')"
      }
    },
    required: ["pattern"]
  }
}
```

### 4. find_files
```javascript
{
  name: "find_files",
  description: "Find files by name pattern. Returns list of matching file paths. Use this when you know part of a filename but not the full path.",
  input_schema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "File name pattern (supports wildcards: *, ?)"
      },
      path: {
        type: "string",
        description: "Optional: limit search to specific directory"
      }
    },
    required: ["pattern"]
  }
}
```

### 5. find_definition
```javascript
{
  name: "find_definition",
  description: "Find where a symbol (function, class, variable, import) is defined. Uses indexed code symbols for fast lookup. Returns file path, line number, and context.",
  input_schema: {
    type: "object",
    properties: {
      symbol: {
        type: "string",
        description: "Name of the symbol to find (e.g., 'DatabaseService', 'handleSubmit')"
      },
      type: {
        type: "string",
        description: "Optional: symbol type to narrow search ('function', 'class', 'variable', 'import')",
        enum: ["function", "class", "variable", "import"]
      }
    },
    required: ["symbol"]
  }
}
```

### 6. find_importers
```javascript
{
  name: "find_importers",
  description: "Find all files that import a given module or symbol. Useful for impact analysis before making changes. Returns file paths and import statements.",
  input_schema: {
    type: "object",
    properties: {
      modulePath: {
        type: "string",
        description: "Path to module (e.g., '../services/DatabaseService')"
      }
    },
    required: ["modulePath"]
  }
}
```

### 7. edit_file
```javascript
{
  name: "edit_file",
  description: "Propose changes to a file. Shows a diff preview and requires user approval before applying. Use this to fix bugs, add features, or refactor code. IMPORTANT: Provide the complete new content for the entire file.",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Relative path to the file to edit"
      },
      content: {
        type: "string",
        description: "Complete new content for the entire file"
      },
      description: {
        type: "string",
        description: "Brief description of what changes were made and why"
      }
    },
    required: ["path", "content", "description"]
  }
}
```

### 8. create_file
```javascript
{
  name: "create_file",
  description: "Create a new file with given content. Requires user approval. Use this to add new components, modules, or configuration files.",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Relative path for the new file"
      },
      content: {
        type: "string",
        description: "Initial content for the file"
      },
      description: {
        type: "string",
        description: "Brief description of what the file is for"
      }
    },
    required: ["path", "content", "description"]
  }
}
```

---

## Implementation Plan

### Phase 1: Add Tool Definitions (AnthropicAdapter)

**File**: `src/services/adapters/AnthropicAdapter.js`

**Changes**:
1. Create `getToolDefinitions()` method that returns array of all 8 tool schemas
2. Update `formatRequest()` to include `tools: this.getToolDefinitions()` in request object
3. Add this ONLY when the provider has tool support enabled

**Code location**: Lines 48-75 in `formatRequest()` method

### Phase 2: Parse Tool Use Blocks (AnthropicAdapter)

**File**: `src/services/adapters/AnthropicAdapter.js`

**Changes**:
1. Update `parseResponse()` or add new `parseToolUse()` method
2. Detect `tool_use` content blocks in response
3. Extract tool call data: `{ id, name, input }`
4. Return structured tool call objects

**Expected response format from Claude**:
```javascript
{
  content: [
    { type: "text", text: "I'll read that file for you." },
    {
      type: "tool_use",
      id: "toolu_01A09q90qw90lq917835lq9",
      name: "read_file",
      input: { path: "src/main.js" }
    }
  ],
  stop_reason: "tool_use"
}
```

### Phase 3: Format Tool Results (AnthropicAdapter)

**File**: `src/services/adapters/AnthropicAdapter.js`

**Changes**:
1. Add `formatToolResult(toolUseId, result)` method
2. Format as Claude expects:

```javascript
{
  type: "tool_result",
  tool_use_id: toolUseId,
  content: JSON.stringify(result) // or just result if string
}
```

### Phase 4: Tool Execution Loop (AIProviderService)

**File**: `src/services/AIProviderService.js`

**Current state**: `_handleToolCalls()` method exists (lines 280-360) but isn't invoked

**Changes**:
1. After streaming completes, check if `stop_reason === "tool_use"`
2. If yes, extract tool calls from response
3. Invoke existing `_handleToolCalls()` method
4. Send tool results back to API as new user message
5. Continue loop until no more tool calls

**Pseudo-code**:
```javascript
async sendMessage(message, context) {
  let continueLoop = true;
  let messages = [...context.messages, newUserMessage];

  while (continueLoop) {
    // Send request, get response (streaming)
    const response = await adapter.generateResponse(request);

    if (response.stop_reason === "tool_use") {
      // Extract tool calls
      const toolCalls = this._extractToolCalls(response);

      // Execute tools (existing method)
      const toolResults = await this._handleToolCalls(toolCalls, ...);

      // Add assistant message + tool results to messages
      messages.push({
        role: "assistant",
        content: response.content // includes tool_use blocks
      });
      messages.push({
        role: "user",
        content: toolResults // array of tool_result blocks
      });

      // Continue loop
    } else {
      continueLoop = false;
    }
  }
}
```

### Phase 5: System Prompt

**File**: `src/services/adapters/AnthropicAdapter.js` or `AIProviderService.js`

**Add system message** instructing Claude on tool use:

```
You are an AI coding assistant with access to project files. You can:

- Read files to understand code
- Search for patterns across the codebase
- Find symbol definitions and dependencies
- Propose file edits (require user approval)
- Create new files (require user approval)

When exploring a codebase:
1. Start with list_files to understand structure
2. Use find_definition to locate key components
3. Use read_file to understand implementation details
4. Use search_files to find usage patterns

When making changes:
1. Always read files first to understand current state
2. Use find_importers to understand impact
3. Propose edits with clear descriptions
4. Wait for user approval before continuing

Be thorough but efficient. Use tools strategically to minimize context usage.
```

---

## Testing Strategy

### Test 1: Basic File Reading
**User prompt**: "Read package.json and tell me the project name"

**Expected behavior**:
1. Claude calls `read_file` with path "package.json"
2. Tool executes, returns content
3. Claude responds with project name

### Test 2: Symbol Lookup
**User prompt**: "Find where DatabaseService is defined"

**Expected behavior**:
1. Claude calls `find_definition` with symbol "DatabaseService"
2. Tool returns file path and line number
3. Claude may call `read_file` to show context
4. Claude responds with location and definition

### Test 3: File Edit with Approval
**User prompt**: "Add a comment to the top of main.js explaining what it does"

**Expected behavior**:
1. Claude calls `read_file` with path "src/main.js"
2. Claude calls `edit_file` with new content
3. DiffPreviewModal shows proposed changes
4. User approves
5. File is updated
6. Claude confirms completion

### Test 4: Multi-file Search
**User prompt**: "Find all TODO comments in the project"

**Expected behavior**:
1. Claude calls `search_files` with pattern "TODO"
2. Tool returns all matches
3. Claude summarizes findings

### Test 5: Impact Analysis
**User prompt**: "What files use ToolExecutionService?"

**Expected behavior**:
1. Claude calls `find_importers` with modulePath to service
2. Tool returns list of importing files
3. Claude may read those files for context
4. Claude responds with usage summary

---

## Error Handling

### Tool Execution Failures

**Scenario**: Tool call fails (file not found, permission denied, etc.)

**Handling**:
1. Catch error in ToolExecutionService
2. Return error object: `{ error: true, message: "..." }`
3. Format as tool_result with error
4. Send back to Claude
5. Claude should handle gracefully (suggest alternatives, ask user)

### Approval Rejection

**Scenario**: User rejects edit_file or create_file

**Handling**:
1. ToolContext promise rejects
2. Return error to Claude: `{ error: true, message: "User rejected changes" }`
3. Claude should acknowledge and ask for modifications

### Infinite Loops

**Scenario**: Claude keeps calling tools without making progress

**Protection**:
1. Add max tool turns limit (e.g., 10 turns)
2. If exceeded, stop loop and notify user
3. Allow user to continue or abort

---

## Context Management

### Token Budget

**Challenge**: Tool results consume context

**Strategy**:
1. Truncate large file reads (first 1000 lines?)
2. Summarize search results if too many matches
3. Show file snippets instead of full content when possible
4. User can adjust via settings

### Tool Result Formatting

Keep tool results concise:
- File contents: Include line numbers for reference
- Search results: Limit to N matches, show "...and X more"
- List results: Paginate if directory is large

---

## Security Considerations

**Already implemented in ToolExecutionService**:
- ✅ Path validation (no `..`, absolute paths)
- ✅ Project root enforcement
- ✅ File size limits
- ✅ Read-only vs write tool separation

**Additional**:
- Human approval required for all write operations
- Diff preview shows exactly what will change
- User can edit proposed changes before applying

---

## Future Enhancements

### Phase 2 Features (Post-MVP)

1. **Batch operations**: Edit multiple files in one approval
2. **Undo/Redo**: Rollback tool actions
3. **Tool favorites**: Let AI learn user preferences
4. **Context optimization**: Smart summarization of tool results
5. **Tool analytics**: Track which tools are most useful
6. **Custom tools**: Let users define project-specific tools

### Advanced Agentic Behaviors

1. **Task planning**: Claude breaks complex tasks into steps
2. **Dependency tracking**: Understand file relationships
3. **Test-driven changes**: Run tests after edits
4. **Refactoring assistance**: Multi-file coordinated changes
5. **Code generation**: Scaffold new features

---

## Implementation Checklist

- [ ] Phase 1: Add tool definitions to AnthropicAdapter
- [ ] Phase 2: Parse tool_use blocks from responses
- [ ] Phase 3: Format tool results
- [ ] Phase 4: Implement tool execution loop
- [ ] Phase 5: Add system prompt
- [ ] Test 1: Basic file reading
- [ ] Test 2: Symbol lookup
- [ ] Test 3: File edit with approval
- [ ] Test 4: Multi-file search
- [ ] Test 5: Impact analysis
- [ ] Document any issues found
- [ ] Update STATUS.md when complete

---

## Questions & Decisions

### Tool Loop Strategy
**Question**: Recursive vs iterative tool execution loop?

**Decision**: Iterative (while loop) - easier to debug, add safeguards, manage context

### System Prompt Location
**Question**: System message or system parameter in API call?

**Decision**: Use `system` parameter in API request (cleaner, doesn't consume message tokens)

### Tool Result Size Limits
**Question**: How to handle large tool results?

**Decision**:
- Read files: Truncate at 2000 lines (configurable)
- Search results: Limit to 50 matches with "...and X more"
- List files: Paginate at 100 files

### Error Recovery
**Question**: Should Claude retry failed tool calls?

**Decision**: Yes, but with context. Return error message explaining what went wrong so Claude can adapt strategy.

---

## Success Metrics

**MVP Success** = All 5 tests pass

**Feature Complete** =
- AI can autonomously explore codebases
- AI can propose changes with approval workflow
- Users report productivity improvement
- No major bugs or context issues

---

**Next Step**: Begin implementation with Phase 1 (tool definitions)
