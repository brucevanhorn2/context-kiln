const BaseAdapter = require('./BaseAdapter');

/**
 * OpenAIAdapter - Adapter for OpenAI API (GPT models)
 *
 * STUB IMPLEMENTATION - To be completed in Phase 2
 *
 * This adapter will support GPT-4, GPT-3.5, and other OpenAI models
 * Format may differ from Claude (OpenAI might prefer different context structure)
 *
 * @extends BaseAdapter
 */
class OpenAIAdapter extends BaseAdapter {
  constructor(config = {}) {
    super('openai', config);

    this.apiKey = config.apiKey || null;
    this.client = null;

    // TODO Phase 2: Initialize OpenAI client
    // const OpenAI = require('openai');
    // if (this.apiKey) {
    //   this.client = new OpenAI({ apiKey: this.apiKey });
    // }
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
    // TODO Phase 2: Reinitialize client
  }

  formatRequest(internalContext, model) {
    // TODO Phase 2: Implement OpenAI-specific formatting
    // OpenAI uses similar structure but might prefer different context format
    throw new Error('OpenAIAdapter not yet implemented - coming in Phase 2');
  }

  parseResponse(apiResponse) {
    // TODO Phase 2: Parse OpenAI response format
    throw new Error('OpenAIAdapter not yet implemented - coming in Phase 2');
  }

  getAvailableModels() {
    // TODO Phase 2: Return GPT models
    return [
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        contextWindow: 128000,
        pricing: {
          inputPerMToken: 10.00,
          outputPerMToken: 30.00,
        },
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        contextWindow: 8192,
        pricing: {
          inputPerMToken: 30.00,
          outputPerMToken: 60.00,
        },
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        contextWindow: 16384,
        pricing: {
          inputPerMToken: 0.50,
          outputPerMToken: 1.50,
        },
      },
    ];
  }

  async sendRequest(formattedRequest, onChunk, onComplete, onError) {
    // TODO Phase 2: Implement OpenAI API call with streaming
    throw new Error('OpenAIAdapter not yet implemented - coming in Phase 2');
  }

  async validateApiKey(apiKey) {
    // TODO Phase 2: Validate OpenAI API key
    console.warn('OpenAI API key validation not implemented yet');
    return false;
  }

  getErrorMessage(error) {
    // TODO Phase 2: OpenAI-specific error messages
    return `OpenAI Error: ${error.message}`;
  }
}

module.exports = OpenAIAdapter;
