const BaseAdapter = require('./BaseAdapter');

/**
 * OllamaAdapter - Adapter for Ollama (local AI models)
 *
 * Ollama provides a local API for running LLMs without API keys or costs.
 * Default endpoint: http://localhost:11434
 * API documentation: https://github.com/ollama/ollama/blob/main/docs/api.md
 *
 * @extends BaseAdapter
 */
class OllamaAdapter extends BaseAdapter {
  constructor(config = {}) {
    super('ollama', config);

    // Use 127.0.0.1 instead of localhost to force IPv4 (Ollama listens on IPv4 by default)
    this.endpoint = config.endpoint || 'http://127.0.0.1:11434';
    this.apiKey = null; // Ollama doesn't require API keys
  }

  /**
   * Format internal context to Ollama API format
   * Ollama uses OpenAI-compatible chat format
   */
  formatRequest(internalContext, model) {
    const messages = [];

    // Add system message with tool instructions if tools are supported
    if (this.supportsToolUse() && internalContext.enableTools !== false) {
      messages.push({
        role: 'system',
        content: this._getSystemPromptWithTools(),
      });
    }

    // Add previous messages from session context if they exist
    if (internalContext.sessionContext && internalContext.sessionContext.previousMessages) {
      // Extract only role and content for Ollama API
      const cleanedMessages = internalContext.sessionContext.previousMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
      messages.push(...cleanedMessages);
    }

    // Handle tool results (for tool execution loop)
    if (internalContext.toolResults) {
      // Tool results: assistant's response with tool calls should already be in previousMessages
      // Now we add user message with tool results
      messages.push({
        role: 'user',
        content: this._formatToolResultsAsText(internalContext.toolResults),
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
      model: model || 'llama3.1',
      messages: messages,
      stream: true, // Enable streaming by default
    };

    // Apply preferences if specified
    if (internalContext.preferences) {
      if (internalContext.preferences.temperature !== undefined) {
        request.options = request.options || {};
        request.options.temperature = internalContext.preferences.temperature;
      }
      if (internalContext.preferences.maxTokens) {
        request.options = request.options || {};
        request.options.num_predict = internalContext.preferences.maxTokens;
      }
    }

    // Add tool definitions if supported and enabled
    // Ollama 0.3.0+ supports OpenAI-compatible function calling with the tools parameter
    if (this.supportsToolUse() && internalContext.enableTools !== false) {
      request.tools = this.getToolDefinitions();
    }

    return request;
  }

  /**
   * Parse Ollama API response to internal format
   */
  parseResponse(apiResponse) {
    // Handle streaming chunk
    if (apiResponse.message && apiResponse.message.content) {
      return {
        type: 'chunk',
        content: apiResponse.message.content,
      };
    }

    // Handle final message
    if (apiResponse.done) {
      return {
        type: 'complete',
        usage: {
          // Ollama provides token counts in final message
          inputTokens: apiResponse.prompt_eval_count || 0,
          outputTokens: apiResponse.eval_count || 0,
        },
      };
    }

    return apiResponse;
  }

  /**
   * Get available Ollama models
   * This queries the local Ollama instance for installed models
   */
  async getAvailableModels() {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`);

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.models || !Array.isArray(data.models)) {
        throw new Error('Invalid response from Ollama API');
      }

      // Transform Ollama model list to our format
      const models = data.models.map(model => {
        const supportsTools = this._hasNativeFunctionCalling(model.name);
        const baseDescription = `Local - ${(model.size / 1024 / 1024 / 1024).toFixed(1)} GB`;

        return {
          id: model.name,
          name: model.name,
          description: supportsTools
            ? `${baseDescription} • 🔧 Tool Support`
            : baseDescription,
          contextWindow: 8192, // Default, may vary by model
          pricing: {
            inputPerMToken: 0, // Local models are free
            outputPerMToken: 0,
          },
          size: model.size,
          modified: model.modified_at,
          supportsTools, // Flag for UI to show icon/badge
          capabilities: {
            tools: supportsTools,
            vision: model.name.includes('vision') || model.name.includes('llava'),
            streaming: true, // All Ollama models support streaming
          },
        };
      });

      return models;
    } catch (error) {
      // Re-throw so UI can show error instead of silently using fallback
      throw error;
    }
  }

  /**
   * Send request to Ollama API with streaming support
   */
  async sendRequest(formattedRequest, onChunk, onComplete, onError) {
    try {
      const response = await fetch(`${this.endpoint}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedRequest),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      // Ollama streams newline-delimited JSON
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let fullMessage = null;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split by newlines and process each complete JSON object
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const data = JSON.parse(line);

            // Store the full message object for tool call detection
            if (data.message) {
              fullMessage = data.message;
            }

            // Handle streaming chunk
            if (data.message && data.message.content) {
              const chunk = data.message.content;
              fullContent += chunk;

              if (onChunk) {
                onChunk({
                  type: 'chunk',
                  content: chunk,
                });
              }
            }

            // Handle completion
            if (data.done) {
              const finalResponse = {
                content: fullContent,
                message: fullMessage, // Include full message for tool call detection
                model: formattedRequest.model,
                usage: {
                  inputTokens: data.prompt_eval_count || 0,
                  outputTokens: data.eval_count || 0,
                },
                cost: 0, // Local models are free
              };

              if (onComplete) {
                onComplete(finalResponse);
              }

              return finalResponse;
            }
          } catch (parseError) {
            console.error('Failed to parse Ollama response line:', parseError);
          }
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
   * Validate Ollama availability (no API key needed)
   * Just checks if Ollama is running
   */
  async validateApiKey(_apiKey) {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      console.error('Ollama validation failed:', error);
      return false;
    }
  }

  /**
   * Check if this adapter supports tool use
   * Note: Only certain Ollama models support function calling
   * Models known to support tools:
   * - qwen2.5-coder (all variants)
   * - llama3.1 (70B and larger)
   * - mistral-small, mistral-large
   * - granite3-dense, granite3-moe
   */
  supportsToolUse() {
    // Always return true - we'll use text-based tool calling for models that don't support native functions
    // The system prompt will guide the model to output tool calls in a parseable format
    return true;
  }

  /**
   * Check if model has native function calling support
   * Based on Ollama documentation and community testing
   * @param {string} modelName - Model identifier
   * @private
   */
  _hasNativeFunctionCalling(modelName) {
    if (!modelName) return false;

    const modelLower = modelName.toLowerCase();

    // Known models with strong tool support
    const toolCapableModels = [
      // Qwen family - excellent tool support
      'qwen2.5-coder',
      'qwen2.5',
      'qwen2',

      // Llama 3.1+ (70B and larger recommended)
      'llama3.1:70b',
      'llama3.1:405b',
      'llama3.2:90b',
      'llama3.3:70b',

      // Mistral family
      'mistral-small',
      'mistral-large',
      'mistral-nemo',

      // Granite family (IBM)
      'granite3-dense',
      'granite3-moe',

      // Command-R (Cohere)
      'command-r',

      // Nemotron (NVIDIA)
      'nemotron',

      // DeepSeek Coder
      'deepseek-coder',
    ];

    return toolCapableModels.some(model => modelLower.includes(model));
  }

  /**
   * Get tool definitions in Ollama/OpenAI format
   * Ollama uses OpenAI-compatible function calling format for supported models
   */
  getToolDefinitions() {
    return [
      {
        type: 'function',
        function: {
          name: 'read_file',
          description: 'Read the contents of a file from the project. Returns the full file content with line numbers. Use this to understand existing code, check implementations, or gather context before making changes.',
          parameters: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Relative path to the file from project root (e.g., "src/components/App.jsx")',
              },
            },
            required: ['path'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'list_files',
          description: 'List all files and directories in a given path. Shows file types, sizes, and modification dates. Use this to explore project structure or find files in a directory.',
          parameters: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Relative path to directory from project root. Use "." for root directory.',
              },
              recursive: {
                type: 'boolean',
                description: 'If true, list files recursively in subdirectories. Default false.',
              },
            },
            required: ['path'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'search_files',
          description: 'Search for text patterns across files using regex. Returns file paths, line numbers, and matching content. Use this to find function calls, variable usage, or specific patterns in code.',
          parameters: {
            type: 'object',
            properties: {
              pattern: {
                type: 'string',
                description: 'Regular expression pattern to search for',
              },
              path: {
                type: 'string',
                description: 'Optional: limit search to specific directory. Defaults to entire project.',
              },
              filePattern: {
                type: 'string',
                description: 'Optional: glob pattern to filter files (e.g., "*.js", "*.jsx")',
              },
            },
            required: ['pattern'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'find_files',
          description: 'Find files by name pattern. Returns list of matching file paths. Use this when you know part of a filename but not the full path.',
          parameters: {
            type: 'object',
            properties: {
              pattern: {
                type: 'string',
                description: 'File name pattern (supports wildcards: *, ?)',
              },
            },
            required: ['pattern'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'find_definition',
          description: 'Find where a symbol (function, class, variable, import) is defined. Uses indexed code symbols for fast lookup. Returns file path, line number, and context.',
          parameters: {
            type: 'object',
            properties: {
              symbol_name: {
                type: 'string',
                description: 'Name of the symbol to find (e.g., "DatabaseService", "handleSubmit")',
              },
            },
            required: ['symbol_name'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'find_importers',
          description: 'Find all files that import a given module or symbol. Useful for impact analysis before making changes. Returns file paths and import statements.',
          parameters: {
            type: 'object',
            properties: {
              symbol_name: {
                type: 'string',
                description: 'Name of the symbol to find importers for',
              },
            },
            required: ['symbol_name'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'edit_file',
          description: 'Propose changes to a file. Shows a diff preview and requires user approval before applying. Use this to fix bugs, add features, or refactor code. IMPORTANT: Provide old_content (text to replace) and new_content (replacement text).',
          parameters: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Relative path to the file to edit',
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
                description: 'Brief description of what changes were made and why',
              },
            },
            required: ['path', 'old_content', 'new_content', 'description'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'create_file',
          description: 'Create a new file with given content. Requires user approval. Use this to add new components, modules, or configuration files.',
          parameters: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Relative path for the new file',
              },
              content: {
                type: 'string',
                description: 'Initial content for the file',
              },
              description: {
                type: 'string',
                description: 'Brief description of what the file is for',
              },
            },
            required: ['path', 'content', 'description'],
          },
        },
      },
    ];
  }

  /**
   * Parse tool calls from Ollama response
   * Ollama returns tool calls in OpenAI-compatible format
   */
  parseToolCalls(apiResponse) {
    const toolCalls = [];

    // Check if response has tool_calls (OpenAI-compatible format)
    if (apiResponse.message && apiResponse.message.tool_calls) {
      for (const toolCall of apiResponse.message.tool_calls) {
        toolCalls.push({
          id: toolCall.id || `tool-${Date.now()}-${Math.random()}`,
          type: toolCall.function.name,
          parameters: toolCall.function.arguments,
        });
      }
    }

    return toolCalls;
  }

  /**
   * Format tool execution result for Ollama
   * Returns in OpenAI-compatible format for tool responses
   */
  formatToolResult(toolCallId, result) {
    return {
      role: 'tool',
      content: JSON.stringify(result, null, 2),
      tool_call_id: toolCallId,
    };
  }

  /**
   * Format tool results as text for models without native function calling
   * @private
   */
  _formatToolResultsAsText(toolResults) {
    if (!Array.isArray(toolResults)) {
      return 'Tool execution results:\n' + JSON.stringify(toolResults, null, 2);
    }

    let text = 'Tool execution results:\n\n';
    for (const result of toolResults) {
      text += `Tool: ${result.tool_call_id}\n`;
      text += `Result:\n${result.content}\n\n`;
    }
    return text;
  }

  /**
   * Get system prompt with tool usage instructions
   * @private
   */
  _getSystemPromptWithTools() {
    return `You are an AI coding assistant with access to project files. You can:

**Read-Only Tools** (auto-approved):
- read_file: Read file contents
- list_files: List files and directories
- search_files: Search for text patterns using regex
- find_files: Find files by name pattern
- find_definition: Look up where symbols are defined (fast, indexed)
- find_importers: Find files that import a module

**Write Tools** (require user approval):
- edit_file: Propose changes to files (shows diff preview)
- create_file: Create new files (shows preview)

When exploring code:
1. Use find_definition for "where is X defined?" - it's fast (50ms)
2. Use search_files to find usage patterns
3. Use list_files to understand project structure
4. Always read files before proposing edits

When making changes:
1. ALWAYS read the file first
2. Provide exact old_content and new_content for edits
3. Include clear descriptions
4. User will approve/reject via diff preview

Be thorough but efficient with tool use.`;
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error) {
    if (error.code === 'ECONNREFUSED' || error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      return 'Cannot connect to Ollama. Make sure Ollama is running: ollama serve';
    }

    if (error.message.includes('model') && error.message.includes('not found')) {
      return 'Model not found. Pull it first with: ollama pull <model-name>';
    }

    return `Ollama Error: ${error.message}`;
  }
}

module.exports = OllamaAdapter;
