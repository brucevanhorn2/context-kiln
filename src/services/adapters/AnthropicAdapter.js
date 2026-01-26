const Anthropic = require('@anthropic-ai/sdk');
const BaseAdapter = require('./BaseAdapter');

/**
 * AnthropicAdapter - Adapter for Claude API (Anthropic)
 *
 * Transforms Context Kiln's internal format to/from Anthropic's API format
 * Uses markdown formatting for context files (works well with Claude)
 *
 * @extends BaseAdapter
 */
class AnthropicAdapter extends BaseAdapter {
  constructor(config = {}) {
    super('anthropic', config);

    this.apiKey = config.apiKey || null;
    this.client = null;

    if (this.apiKey) {
      this.client = new Anthropic({
        apiKey: this.apiKey,
      });
    }
  }

  /**
   * Update API key and reinitialize client
   */
  setApiKey(apiKey) {
    this.apiKey = apiKey;
    this.client = new Anthropic({
      apiKey: this.apiKey,
    });
  }

  /**
   * Format internal context to Anthropic API format
   */
  formatRequest(internalContext, model) {
    if (!this.client) {
      throw new Error('Anthropic API key not configured');
    }

    const messages = [];

    // Add previous messages from session context if they exist
    if (internalContext.sessionContext && internalContext.sessionContext.previousMessages) {
      messages.push(...internalContext.sessionContext.previousMessages);
    }

    // Handle tool results (for tool execution loop)
    if (internalContext.toolResults) {
      // Tool results: assistant's response with tool_use should already be in previousMessages
      // Now we add user message with tool_result blocks
      messages.push({
        role: 'user',
        content: internalContext.toolResults,
      });
    } else {
      // Normal user message
      // Build current message with context
      let content = '';

      // Add context files if present
      if (internalContext.contextFiles && internalContext.contextFiles.length > 0) {
        content += this.formatContextFiles(internalContext.contextFiles, 'markdown');
        content += '\n\n';
      }

      // Add session context summary if present
      if (internalContext.sessionContext && internalContext.sessionContext.summary) {
        content += `# Session Context\n${internalContext.sessionContext.summary}\n\n`;
      }

      // Add user's message
      content += `# User Question\n${internalContext.userMessage}`;

      messages.push({
        role: 'user',
        content: content,
      });
    }

    // Build API request
    const request = {
      model: model || 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: messages,
      stream: true, // Enable streaming by default
    };

    // Apply preferences if specified
    if (internalContext.preferences) {
      if (internalContext.preferences.temperature !== undefined) {
        request.temperature = internalContext.preferences.temperature;
      }
      if (internalContext.preferences.maxTokens) {
        request.max_tokens = internalContext.preferences.maxTokens;
      }
    }

    // Add tool definitions if tool use is supported and enabled
    if (this.supportsToolUse() && internalContext.enableTools !== false) {
      request.tools = this.getToolDefinitions();

      // Add system prompt explaining tool capabilities
      request.system = this._getSystemPromptWithTools();
    }

    return request;
  }

  /**
   * Parse Anthropic API response to internal format
   */
  parseResponse(apiResponse) {
    // Handle both streaming and non-streaming responses
    if (apiResponse.content && Array.isArray(apiResponse.content)) {
      // Non-streaming response
      const textContent = apiResponse.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('');

      return {
        content: textContent,
        model: apiResponse.model,
        usage: {
          inputTokens: apiResponse.usage?.input_tokens || 0,
          outputTokens: apiResponse.usage?.output_tokens || 0,
        },
        stopReason: apiResponse.stop_reason,
      };
    }

    // For streaming chunks
    if (apiResponse.type === 'content_block_delta' && apiResponse.delta) {
      return {
        type: 'chunk',
        content: apiResponse.delta.text || '',
      };
    }

    // Final message after streaming
    if (apiResponse.type === 'message_stop' || apiResponse.type === 'message_delta') {
      return {
        type: 'complete',
        usage: apiResponse.usage ? {
          inputTokens: apiResponse.usage.input_tokens || 0,
          outputTokens: apiResponse.usage.output_tokens || 0,
        } : null,
      };
    }

    return apiResponse;
  }

  /**
   * Get available Claude models
   */
  getAvailableModels() {
    return [
      {
        id: 'claude-opus-4-5-20251101',
        name: 'Claude Opus 4.5',
        description: '🔧 Tool Support • Most capable',
        contextWindow: 200000,
        pricing: {
          inputPerMToken: 15.00,
          outputPerMToken: 75.00,
        },
        supportsTools: true,
        capabilities: {
          tools: true,
          vision: true,
          streaming: true,
        },
      },
      {
        id: 'claude-3-7-sonnet-20250219',
        name: 'Claude Sonnet 3.7',
        description: '🔧 Tool Support • Best balance',
        contextWindow: 200000,
        pricing: {
          inputPerMToken: 3.00,
          outputPerMToken: 15.00,
        },
        supportsTools: true,
        capabilities: {
          tools: true,
          vision: true,
          streaming: true,
        },
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude Sonnet 3.5',
        description: '🔧 Tool Support • Fast',
        contextWindow: 200000,
        pricing: {
          inputPerMToken: 3.00,
          outputPerMToken: 15.00,
        },
        supportsTools: true,
        capabilities: {
          tools: true,
          vision: true,
          streaming: true,
        },
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude Haiku 3.5',
        description: '🔧 Tool Support • Fastest',
        contextWindow: 200000,
        pricing: {
          inputPerMToken: 0.80,
          outputPerMToken: 4.00,
        },
        supportsTools: true,
        capabilities: {
          tools: true,
          vision: false,
          streaming: true,
        },
      },
    ];
  }

  /**
   * Send request to Anthropic API with streaming support
   */
  async sendRequest(formattedRequest, onChunk, onComplete, onError) {
    if (!this.client) {
      const error = new Error('Anthropic API key not configured');
      if (onError) onError(error);
      throw error;
    }

    try {
      const stream = await this.client.messages.create(formattedRequest);

      let fullContent = '';
      let usage = null;

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta) {
          const chunk = event.delta.text || '';
          fullContent += chunk;

          if (onChunk) {
            onChunk({
              type: 'chunk',
              content: chunk,
            });
          }
        }

        if (event.type === 'message_delta' && event.usage) {
          usage = {
            inputTokens: formattedRequest.messages.reduce((sum, msg) => {
              // Rough estimate - actual input tokens come from API
              return sum;
            }, 0),
            outputTokens: event.usage.output_tokens || 0,
          };
        }

        if (event.type === 'message_stop') {
          const finalResponse = {
            content: fullContent,
            model: formattedRequest.model,
            usage: usage,
          };

          if (onComplete) {
            onComplete(finalResponse);
          }

          return finalResponse;
        }
      }
    } catch (error) {
      if (onError) {
        onError(error);
      }
      throw error;
    }
  }

  /**
   * Validate Anthropic API key
   */
  async validateApiKey(apiKey) {
    try {
      const tempClient = new Anthropic({ apiKey });

      // Make a minimal request to test the key
      await tempClient.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Hi',
          },
        ],
      });

      return true;
    } catch (error) {
      console.error('Anthropic API key validation failed:', error);
      return false;
    }
  }

  /**
   * Check if this adapter supports tool use
   */
  supportsToolUse() {
    return true;
  }

  /**
   * Get tool definitions in Claude format
   */
  getToolDefinitions() {
    return [
      {
        name: 'read_file',
        description: 'Read the contents of a file from the project. Use this to examine code files before making changes.',
        input_schema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Relative path from project root (e.g., "src/utils/calculator.js")',
            },
            line_start: {
              type: 'number',
              description: 'Optional: Start reading from this line number (1-indexed)',
            },
            line_end: {
              type: 'number',
              description: 'Optional: Stop reading at this line number',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'edit_file',
        description: 'Propose changes to an existing file. This will show a diff preview to the user for approval.',
        input_schema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Relative path from project root',
            },
            old_content: {
              type: 'string',
              description: 'The exact content to replace (for verification)',
            },
            new_content: {
              type: 'string',
              description: 'The new content to insert',
            },
            description: {
              type: 'string',
              description: 'Human-readable description of what this change does',
            },
          },
          required: ['path', 'old_content', 'new_content', 'description'],
        },
      },
      {
        name: 'create_file',
        description: 'Create a new file in the project. This will show a preview to the user for approval.',
        input_schema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Relative path for the new file',
            },
            content: {
              type: 'string',
              description: 'The complete content for the new file',
            },
            description: {
              type: 'string',
              description: 'Human-readable description of why this file is being created',
            },
          },
          required: ['path', 'content', 'description'],
        },
      },
      {
        name: 'list_files',
        description: 'List files in a directory. Use this to explore the project structure.',
        input_schema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Directory path to list (defaults to project root)',
            },
            pattern: {
              type: 'string',
              description: 'Optional glob pattern to filter files (e.g., "*.js", "**/*.test.ts")',
            },
            recursive: {
              type: 'boolean',
              description: 'Include subdirectories (default: false)',
            },
          },
          required: [],
        },
      },
      {
        name: 'search_files',
        description: 'Search for a text pattern in files within the project. Use this to find where code is defined, used, or to locate specific patterns. Returns file paths, line numbers, and matching content. Very useful for "find where X is defined" or "find all usages of Y" queries.',
        input_schema: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'The text or regex pattern to search for (e.g., "function calculateDiff" or "import.*DatabaseService")',
            },
            path: {
              type: 'string',
              description: 'Directory to search in (defaults to entire project). Use "src" to search only source files.',
            },
            regex: {
              type: 'boolean',
              description: 'Whether pattern is a regular expression (default: false)',
            },
            case_sensitive: {
              type: 'boolean',
              description: 'Case sensitive search (default: false)',
            },
            file_pattern: {
              type: 'string',
              description: 'Only search files matching this glob pattern (e.g., "*.js" or "*.{ts,tsx}")',
            },
          },
          required: ['pattern'],
        },
      },
      {
        name: 'find_files',
        description: 'Find files by name pattern using glob syntax. Use this to locate files when you know or can guess part of the filename (e.g., "find all Service files" or "find test files").',
        input_schema: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'Glob pattern to match filenames (e.g., "*Service.js", "**/*.test.js", "*.{ts,tsx}")',
            },
            path: {
              type: 'string',
              description: 'Directory to search in (defaults to entire project)',
            },
            type: {
              type: 'string',
              enum: ['file', 'directory', 'any'],
              description: 'Type of filesystem entry to find (default: file)',
            },
          },
          required: ['pattern'],
        },
      },
      {
        name: 'find_definition',
        description: 'Find where a symbol is defined using the code index. Use this for fast "where is X defined?" queries. This tool queries a pre-built index of code symbols (functions, classes, variables) and returns file paths and line numbers. Much faster than search_files for finding definitions (50ms vs 2000ms).',
        input_schema: {
          type: 'object',
          properties: {
            symbol_name: {
              type: 'string',
              description: 'The name of the symbol to find (e.g., "calculateDiff", "DatabaseService", "API_KEY")',
            },
          },
          required: ['symbol_name'],
        },
      },
      {
        name: 'find_importers',
        description: 'Find all files that import a specific symbol using the code index. Use this for "what files use X?" queries. Returns a list of files that import the symbol, along with line numbers and import types. Useful for understanding dependencies and refactoring impact.',
        input_schema: {
          type: 'object',
          properties: {
            symbol_name: {
              type: 'string',
              description: 'The name of the symbol to find importers for (e.g., "DatabaseService", "calculateDiff")',
            },
          },
          required: ['symbol_name'],
        },
      },
    ];
  }

  /**
   * Get system prompt with tool usage instructions
   * @private
   */
  _getSystemPromptWithTools() {
    return `You are an AI coding assistant integrated into Context Kiln, a powerful IDE for AI-assisted software development.

You have access to the following tools for exploring and modifying the project:

**Read-Only Tools** (auto-approved):
- read_file: Read file contents with line numbers
- list_files: List files and directories
- search_files: Search for text patterns using regex
- find_files: Find files by name pattern
- find_definition: Look up where symbols are defined (fast, indexed)
- find_importers: Find files that import a module (dependency analysis)

**Write Tools** (require user approval):
- edit_file: Propose changes to existing files (shows diff preview)
- create_file: Create new files (shows preview)

## Best Practices for Tool Use

**When exploring a codebase:**
1. Use find_definition for "where is X defined?" queries - it's fast (50ms) and accurate
2. Use search_files to find usage patterns and understand how code is used
3. Use list_files to understand project structure
4. Always read files before proposing edits to understand current implementation

**When making changes:**
1. ALWAYS read the file first using read_file
2. For edit_file, provide the old_content (exact text to replace) and new_content
3. Include a clear description explaining what changed and why
4. The user will see a diff preview and must approve before changes apply
5. If the user rejects, ask what they'd like changed

**Multi-step tasks:**
1. Break complex tasks into steps (explore → understand → plan → implement)
2. Use find_importers before refactoring to understand impact
3. Search for related patterns before making architectural changes

**Context efficiency:**
1. Tool results consume context - be strategic
2. Use line_start/line_end parameters when reading large files
3. Use path parameter in search/find to narrow scope
4. Summarize findings when tool results are large

Remember: Users trust you to explore their codebase autonomously. Be thorough but efficient. Always explain what you're doing and why.`;
  }

  /**
   * Parse tool calls from Claude API response
   */
  parseToolCalls(apiResponse) {
    const toolCalls = [];

    if (!apiResponse.content) {
      return toolCalls;
    }

    // Claude returns tool_use blocks in the content array
    for (const block of apiResponse.content) {
      if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          type: block.name,
          parameters: block.input,
        });
      }
    }

    return toolCalls;
  }

  /**
   * Format tool execution result for Claude
   */
  formatToolResult(toolCallId, result) {
    return {
      type: 'tool_result',
      tool_use_id: toolCallId,
      content: JSON.stringify(result, null, 2),
    };
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error) {
    if (error.status === 401) {
      return 'Invalid API key. Please check your Anthropic API key in settings.';
    }

    if (error.status === 429) {
      return 'Rate limit exceeded. Please wait a moment before trying again.';
    }

    if (error.status === 500 || error.status === 529) {
      return 'Anthropic API is currently unavailable. Please try again later.';
    }

    if (error.message && error.message.includes('context_length_exceeded')) {
      return 'Context is too large. Try removing some files or archiving old messages.';
    }

    return error.message || `Anthropic API error: ${error.status || 'Unknown'}`;
  }
}

module.exports = AnthropicAdapter;
