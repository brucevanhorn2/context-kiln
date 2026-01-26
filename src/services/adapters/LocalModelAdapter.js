const BaseAdapter = require('./BaseAdapter');

/**
 * LocalModelAdapter - Adapter for embedded models (node-llama-cpp)
 *
 * Phase E: Load and run GGUF models directly in Context Kiln
 * No external API - models run in-process
 *
 * Features:
 * - Load GGUF files from disk
 * - GPU acceleration
 * - Free (no API costs)
 * - Works offline
 *
 * @extends BaseAdapter
 */
class LocalModelAdapter extends BaseAdapter {
  constructor(config = {}, localModelService) {
    super('local', config);

    if (!localModelService) {
      throw new Error('LocalModelAdapter requires a LocalModelService instance');
    }

    this.localModelService = localModelService;
    this.apiKey = null; // Local models don't need API keys
  }

  /**
   * Format internal context to local model format
   * Similar to other adapters, but simplified
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

    // Build request options
    const request = {
      messages: messages,
      maxTokens: 1024,
      temperature: 0.7,
    };

    // Apply preferences if specified
    if (internalContext.preferences) {
      if (internalContext.preferences.temperature !== undefined) {
        request.temperature = internalContext.preferences.temperature;
      }
      if (internalContext.preferences.maxTokens) {
        request.maxTokens = internalContext.preferences.maxTokens;
      }
    }

    return request;
  }

  /**
   * Parse local model response to internal format
   */
  parseResponse(response) {
    // Response from LocalModelService is already in internal format
    if (response.type === 'chunk') {
      return response;
    }

    if (response.type === 'complete') {
      return response;
    }

    // Handle full response
    if (response.content) {
      return {
        content: response.content,
        model: response.model,
        usage: {
          inputTokens: 0, // LocalModelService doesn't track input tokens yet
          outputTokens: response.tokensGenerated || 0,
        },
      };
    }

    return response;
  }

  /**
   * Get available models
   * Returns info about currently loaded model
   */
  getAvailableModels() {
    const loadedModel = this.localModelService.getLoadedModelInfo();

    if (loadedModel) {
      return [
        {
          id: loadedModel.name,
          name: loadedModel.name,
          contextWindow: loadedModel.contextSize,
          pricing: { inputPerMToken: 0, outputPerMToken: 0 },
          sizeMB: loadedModel.sizeMB,
          loadedAt: loadedModel.loadedAt,
        },
      ];
    }

    // No model loaded - return placeholder
    return [
      {
        id: 'no-model-loaded',
        name: 'No Model Loaded',
        contextWindow: 0,
        pricing: { inputPerMToken: 0, outputPerMToken: 0 },
        description: 'Use File > Load Model to load a GGUF file',
      },
    ];
  }

  /**
   * Send request to local model with streaming support
   */
  async sendRequest(formattedRequest, onChunk, onComplete, onError) {
    try {
      // Check if model is loaded
      if (!this.localModelService.isModelLoaded()) {
        const error = new Error('No model loaded. Use File > Load Model to load a GGUF file.');
        if (onError) onError(error);
        throw error;
      }

      // Generate with streaming
      const result = await this.localModelService.generateChatCompletion(
        formattedRequest.messages,
        {
          maxTokens: formattedRequest.maxTokens,
          temperature: formattedRequest.temperature,
        },
        (token) => {
          // Stream tokens to UI
          if (onChunk) {
            onChunk({
              type: 'chunk',
              content: token,
            });
          }
        }
      );

      // Send completion
      if (onComplete) {
        onComplete({
          content: result.content,
          model: result.model,
          usage: {
            inputTokens: 0,
            outputTokens: result.tokensGenerated,
          },
        });
      }

      return result;
    } catch (error) {
      console.error('[LocalModelAdapter] Generation error:', error);
      if (onError) {
        onError(error);
      }
      throw error;
    }
  }

  /**
   * Check if this adapter supports tool use
   * Local models don't support tool use yet (Phase E.1 is basic completion only)
   */
  supportsToolUse() {
    return false; // TODO: Add in Phase E.2
  }

  /**
   * Get tool definitions
   * Not supported yet
   */
  getToolDefinitions() {
    return [];
  }

  /**
   * Parse tool calls from response
   * Not supported yet
   */
  parseToolCalls(_apiResponse) {
    return [];
  }

  /**
   * Format tool execution result
   * Not supported yet
   */
  formatToolResult(_toolCallId, _result) {
    return {};
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error) {
    if (error.message.includes('No model loaded')) {
      return 'No model loaded. Use File > Load Model to load a GGUF file from disk.';
    }

    if (error.message.includes('not found')) {
      return 'Model file not found. Please check the file path and try again.';
    }

    if (error.message.includes('memory') || error.message.includes('RAM')) {
      return 'Not enough memory to load this model. Try a smaller model or free up RAM.';
    }

    return error.message || 'Local model error';
  }

  /**
   * Load a model from disk
   * This is a convenience method that calls LocalModelService
   */
  async loadModel(modelPath, options = {}) {
    return await this.localModelService.loadModel(modelPath, options);
  }

  /**
   * Unload current model
   */
  async unloadModel() {
    return await this.localModelService.unloadModel();
  }

  /**
   * Get system capabilities
   */
  getSystemCapabilities() {
    return this.localModelService.getSystemCapabilities();
  }

  /**
   * Recommend settings for a model
   */
  recommendModelSettings(modelSizeMB) {
    return this.localModelService.recommendModelSettings(modelSizeMB);
  }
}

module.exports = LocalModelAdapter;
