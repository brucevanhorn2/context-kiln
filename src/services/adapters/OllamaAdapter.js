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
      console.log(`[OllamaAdapter] Fetching models from ${this.endpoint}/api/tags`);
      const response = await fetch(`${this.endpoint}/api/tags`);

      if (!response.ok) {
        console.error(`[OllamaAdapter] HTTP ${response.status}: ${response.statusText}`);
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[OllamaAdapter] Received data:`, data);

      if (!data.models || !Array.isArray(data.models)) {
        console.error('[OllamaAdapter] Invalid response format:', data);
        throw new Error('Invalid response from Ollama API');
      }

      // Transform Ollama model list to our format
      const models = data.models.map(model => ({
        id: model.name,
        name: model.name,
        description: `Local - ${(model.size / 1024 / 1024 / 1024).toFixed(1)} GB`,
        contextWindow: 8192, // Default, may vary by model
        pricing: {
          inputPerMToken: 0, // Local models are free
          outputPerMToken: 0,
        },
        size: model.size,
        modified: model.modified_at,
      }));

      console.log(`[OllamaAdapter] Returning ${models.length} models:`, models.map(m => m.id));
      return models;
    } catch (error) {
      console.error('[OllamaAdapter] Failed to fetch Ollama models:', error);
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
   * Note: Only certain Ollama models support function calling (e.g., qwen2.5-coder, llama3.1:70b+)
   * For Phase B, we'll return false until we add model-specific support
   */
  supportsToolUse() {
    return false; // TODO: Add model-specific detection
  }

  /**
   * Get tool definitions in Ollama format (function calling)
   * Currently returns empty array - not all Ollama models support this
   */
  getToolDefinitions() {
    return []; // TODO: Implement when model supports it
  }

  /**
   * Parse tool calls from Ollama response
   * Currently returns empty array - not all Ollama models support this
   */
  parseToolCalls(_apiResponse) {
    return []; // TODO: Implement when model supports it
  }

  /**
   * Format tool execution result for Ollama
   * Currently a stub - not all Ollama models support this
   */
  formatToolResult(_toolCallId, _result) {
    return {}; // TODO: Implement when model supports it
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
