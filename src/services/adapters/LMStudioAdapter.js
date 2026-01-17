const BaseAdapter = require('./BaseAdapter');

/**
 * LMStudioAdapter - Adapter for LM Studio (local AI models)
 *
 * LM Studio provides a local OpenAI-compatible API for running LLMs.
 * Default endpoint: http://localhost:1234/v1
 * Supports all models loaded in LM Studio
 *
 * @extends BaseAdapter
 */
class LMStudioAdapter extends BaseAdapter {
  constructor(config = {}) {
    super('lmstudio', config);

    this.endpoint = config.endpoint || 'http://localhost:1234/v1';
    this.apiKey = null; // LM Studio doesn't require API keys
  }

  /**
   * Format internal context to LM Studio API format
   * LM Studio uses OpenAI-compatible format
   */
  formatRequest(internalContext, model) {
    const messages = [];

    // Add previous messages from session context if they exist
    if (internalContext.sessionContext && internalContext.sessionContext.previousMessages) {
      messages.push(...internalContext.sessionContext.previousMessages);
    }

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

    // Build API request (OpenAI format)
    const request = {
      model: model || 'local-model',
      messages: messages,
      stream: true,
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

    return request;
  }

  /**
   * Parse LM Studio API response to internal format
   * Uses OpenAI-compatible streaming format
   */
  parseResponse(apiResponse) {
    // Handle streaming chunk (OpenAI format)
    if (apiResponse.choices && apiResponse.choices[0] && apiResponse.choices[0].delta) {
      const delta = apiResponse.choices[0].delta;
      if (delta.content) {
        return {
          type: 'chunk',
          content: delta.content,
        };
      }
    }

    // Handle completion
    if (apiResponse.choices && apiResponse.choices[0] && apiResponse.choices[0].finish_reason) {
      return {
        type: 'complete',
        usage: apiResponse.usage ? {
          inputTokens: apiResponse.usage.prompt_tokens || 0,
          outputTokens: apiResponse.usage.completion_tokens || 0,
        } : null,
      };
    }

    return apiResponse;
  }

  /**
   * Get available LM Studio models
   * Queries the local LM Studio instance for loaded models
   */
  async getAvailableModels() {
    try {
      const response = await fetch(`${this.endpoint}/models`);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform LM Studio model list to our format
      return data.data.map(model => ({
        id: model.id,
        name: model.id,
        contextWindow: 8192, // Default, actual varies by model
        pricing: {
          inputPerMToken: 0, // Local models are free
          outputPerMToken: 0,
        },
      }));
    } catch (error) {
      console.error('Failed to fetch LM Studio models:', error);
      // Return generic entry if LM Studio is not running
      return [
        {
          id: 'local-model',
          name: 'Local Model (LM Studio)',
          contextWindow: 8192,
          pricing: { inputPerMToken: 0, outputPerMToken: 0 },
        },
      ];
    }
  }

  /**
   * Send request to LM Studio API with streaming support
   * Uses OpenAI-compatible streaming (SSE format)
   */
  async sendRequest(formattedRequest, onChunk, onComplete, onError) {
    try {
      const response = await fetch(`${this.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedRequest),
      });

      if (!response.ok) {
        throw new Error(`LM Studio API error: ${response.statusText}`);
      }

      // LM Studio uses SSE (Server-Sent Events) format for streaming
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let usage = null;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process lines (SSE format: "data: {...}\n\n")
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          const data = line.slice(6); // Remove "data: " prefix

          if (data === '[DONE]') {
            const finalResponse = {
              content: fullContent,
              model: formattedRequest.model,
              usage: usage || {
                inputTokens: 0,
                outputTokens: 0,
              },
              cost: 0, // Local models are free
            };

            if (onComplete) {
              onComplete(finalResponse);
            }

            return finalResponse;
          }

          try {
            const parsed = JSON.parse(data);

            // Handle streaming chunk
            if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
              const delta = parsed.choices[0].delta;
              if (delta.content) {
                fullContent += delta.content;

                if (onChunk) {
                  onChunk({
                    type: 'chunk',
                    content: delta.content,
                  });
                }
              }
            }

            // Capture usage info if present
            if (parsed.usage) {
              usage = {
                inputTokens: parsed.usage.prompt_tokens || 0,
                outputTokens: parsed.usage.completion_tokens || 0,
              };
            }
          } catch (parseError) {
            console.error('Failed to parse LM Studio response:', parseError);
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
   * Validate LM Studio availability (no API key needed)
   */
  async validateApiKey(_apiKey) {
    try {
      const response = await fetch(`${this.endpoint}/models`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      console.error('LM Studio validation failed:', error);
      return false;
    }
  }

  /**
   * Check if this adapter supports tool use
   * Note: LM Studio uses OpenAI-compatible format, but tool use depends on the loaded model
   * For Phase B, we'll return false until we add model-specific support
   */
  supportsToolUse() {
    return false; // TODO: Add model-specific detection
  }

  /**
   * Get tool definitions in OpenAI format (LM Studio compatible)
   * Currently returns empty array - depends on loaded model
   */
  getToolDefinitions() {
    return []; // TODO: Implement when model supports it
  }

  /**
   * Parse tool calls from LM Studio response
   * Currently returns empty array - depends on loaded model
   */
  parseToolCalls(_apiResponse) {
    return []; // TODO: Implement when model supports it
  }

  /**
   * Format tool execution result for LM Studio
   * Currently a stub - depends on loaded model
   */
  formatToolResult(_toolCallId, _result) {
    return {}; // TODO: Implement when model supports it
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error) {
    if (error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
      return 'Cannot connect to LM Studio. Make sure LM Studio is running with local server enabled on localhost:1234';
    }

    if (error.message.includes('model') && error.message.includes('not found')) {
      return 'Model not loaded. Load a model in LM Studio first.';
    }

    return `LM Studio Error: ${error.message}`;
  }
}

module.exports = LMStudioAdapter;
