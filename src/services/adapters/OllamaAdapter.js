const BaseAdapter = require('./BaseAdapter');

/**
 * OllamaAdapter - Adapter for Ollama (local AI models)
 *
 * STUB IMPLEMENTATION - To be completed in Phase 2
 *
 * This adapter will support local models via Ollama
 * Endpoint: http://localhost:11434 (default)
 * Format: OpenAI-compatible API
 *
 * @extends BaseAdapter
 */
class OllamaAdapter extends BaseAdapter {
  constructor(config = {}) {
    super('ollama', config);

    this.endpoint = config.endpoint || 'http://localhost:11434';
    this.apiKey = null; // Ollama doesn't require API keys
  }

  formatRequest(internalContext, model) {
    // TODO Phase 2: Implement Ollama-specific formatting
    // Ollama uses OpenAI-compatible format but may have quirks
    throw new Error('OllamaAdapter not yet implemented - coming in Phase 2');
  }

  parseResponse(apiResponse) {
    // TODO Phase 2: Parse Ollama response format
    throw new Error('OllamaAdapter not yet implemented - coming in Phase 2');
  }

  getAvailableModels() {
    // TODO Phase 2: Query Ollama API for installed models
    // This will vary per user installation
    return [
      {
        id: 'llama3.1',
        name: 'Llama 3.1 (Local)',
        contextWindow: 8192,
        pricing: {
          inputPerMToken: 0,
          outputPerMToken: 0,
        },
      },
      {
        id: 'codellama',
        name: 'Code Llama (Local)',
        contextWindow: 16384,
        pricing: {
          inputPerMToken: 0,
          outputPerMToken: 0,
        },
      },
      {
        id: 'mistral',
        name: 'Mistral (Local)',
        contextWindow: 8192,
        pricing: {
          inputPerMToken: 0,
          outputPerMToken: 0,
        },
      },
    ];
  }

  async sendRequest(formattedRequest, onChunk, onComplete, onError) {
    // TODO Phase 2: Implement Ollama API call
    // POST to http://localhost:11434/api/chat
    throw new Error('OllamaAdapter not yet implemented - coming in Phase 2');
  }

  async validateApiKey(apiKey) {
    // Ollama doesn't use API keys, but we can check if it's running
    // TODO Phase 2: Ping Ollama endpoint to check availability
    console.warn('Ollama validation not implemented yet');
    return true; // No key needed for local
  }

  getErrorMessage(error) {
    if (error.code === 'ECONNREFUSED') {
      return 'Cannot connect to Ollama. Is it running on localhost:11434?';
    }

    return `Ollama Error: ${error.message}`;
  }
}

module.exports = OllamaAdapter;
