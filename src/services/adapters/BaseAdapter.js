/**
 * BaseAdapter - Abstract base class for AI provider adapters
 *
 * All provider adapters must extend this class and implement its methods.
 * This ensures a consistent interface across all AI providers (Anthropic, OpenAI, Ollama, etc.)
 *
 * Design Pattern: Adapter Pattern
 * Purpose: Decouple Context Kiln's internal representation from provider-specific API formats
 *
 * @abstract
 */
class BaseAdapter {
  /**
   * @param {string} providerName - Name of the provider (e.g., 'anthropic', 'openai', 'ollama')
   * @param {object} config - Provider-specific configuration (API keys, endpoints, etc.)
   */
  constructor(providerName, config = {}) {
    if (this.constructor === BaseAdapter) {
      throw new Error('BaseAdapter is abstract and cannot be instantiated directly');
    }

    this.providerName = providerName;
    this.config = config;
  }

  /**
   * Transform internal context format to provider-specific API request format
   *
   * @param {object} internalContext - Context Kiln's internal format
   * @param {Array} internalContext.contextFiles - Array of file objects with path, content, metadata
   * @param {string} internalContext.userMessage - The user's message/question
   * @param {object} internalContext.sessionContext - Session info (previous messages, summary, etc.)
   * @param {object} internalContext.preferences - User preferences (token limits, etc.)
   * @param {string} model - Model to use (e.g., 'claude-3-5-sonnet', 'gpt-4')
   * @returns {object} Provider-specific API request object
   * @abstract
   */
  formatRequest(_internalContext, _model) {
    throw new Error('formatRequest() must be implemented by subclass');
  }

  /**
   * Parse provider-specific API response back to internal format
   *
   * @param {object} apiResponse - Raw API response from the provider
   * @returns {object} Internal format response
   * @returns {string} return.content - The response content
   * @returns {string} return.model - Model that generated the response
   * @returns {object} return.usage - Token usage information
   * @returns {number} return.usage.inputTokens - Input tokens used
   * @returns {number} return.usage.outputTokens - Output tokens used
   * @abstract
   */
  parseResponse(_apiResponse) {
    throw new Error('parseResponse() must be implemented by subclass');
  }

  /**
   * Get available models for this provider
   *
   * @returns {Array<object>} Array of model objects
   * @returns {string} return[].id - Model ID
   * @returns {string} return[].name - Human-readable model name
   * @returns {number} return[].contextWindow - Context window size in tokens
   * @returns {object} return[].pricing - Pricing information
   * @abstract
   */
  getAvailableModels() {
    throw new Error('getAvailableModels() must be implemented by subclass');
  }

  /**
   * Make the actual API call to the provider
   *
   * @param {object} formattedRequest - Request formatted by formatRequest()
   * @param {function} onChunk - Callback for streaming chunks (if supported)
   * @param {function} onComplete - Callback when streaming completes
   * @param {function} onError - Callback for errors
   * @returns {Promise<object>} API response
   * @abstract
   */
  async sendRequest(_formattedRequest, _onChunk, _onComplete, _onError) {
    throw new Error('sendRequest() must be implemented by subclass');
  }

  /**
   * Validate API key for this provider
   *
   * @param {string} apiKey - API key to validate
   * @returns {Promise<boolean>} True if valid, false otherwise
   * @abstract
   */
  async validateApiKey(_apiKey) {
    throw new Error('validateApiKey() must be implemented by subclass');
  }

  /**
   * Get provider-specific error message
   *
   * @param {Error} error - Error object from API call
   * @returns {string} User-friendly error message
   */
  getErrorMessage(error) {
    // Default implementation, can be overridden
    if (error.message) {
      return error.message;
    }
    return `Unknown error from ${this.providerName}`;
  }

  /**
   * Format context files into provider-specific string representation
   * Helper method for subclasses
   *
   * @param {Array} contextFiles - Array of file objects
   * @param {string} format - Format to use ('markdown', 'xml', 'plain')
   * @returns {string} Formatted context string
   * @protected
   */
  formatContextFiles(contextFiles, format = 'markdown') {
    if (!contextFiles || contextFiles.length === 0) {
      return '';
    }

    switch (format) {
      case 'markdown':
        return this._formatAsMarkdown(contextFiles);
      case 'xml':
        return this._formatAsXML(contextFiles);
      case 'plain':
        return this._formatAsPlain(contextFiles);
      default:
        return this._formatAsMarkdown(contextFiles);
    }
  }

  /**
   * Format context files as markdown
   * @private
   */
  _formatAsMarkdown(contextFiles) {
    let content = '# Context Files\n\n';

    for (const file of contextFiles) {
      content += `## ${file.relativePath || file.path}`;
      if (file.metadata) {
        content += ` (${file.metadata.lines} lines`;
        if (file.metadata.estimatedTokens) {
          content += `, ~${file.metadata.estimatedTokens} tokens`;
        }
        content += ')';
      }
      content += '\n\n';
      content += `\`\`\`${file.language || ''}\n`;
      content += file.content;
      content += '\n\`\`\`\n\n';
    }

    return content;
  }

  /**
   * Format context files as XML
   * @private
   */
  _formatAsXML(contextFiles) {
    let content = '<context>\n';

    for (const file of contextFiles) {
      content += `  <file path="${file.relativePath || file.path}"`;
      if (file.metadata) {
        content += ` lines="${file.metadata.lines}"`;
        if (file.metadata.estimatedTokens) {
          content += ` tokens="${file.metadata.estimatedTokens}"`;
        }
      }
      content += '>\n';
      content += '  <![CDATA[\n';
      content += file.content;
      content += '\n  ]]>\n';
      content += '  </file>\n';
    }

    content += '</context>';
    return content;
  }

  /**
   * Format context files as plain text
   * @private
   */
  _formatAsPlain(contextFiles) {
    let content = '=== CONTEXT FILES ===\n\n';

    for (const file of contextFiles) {
      content += `=== FILE: ${file.relativePath || file.path} ===\n`;
      content += file.content;
      content += '\n=== END FILE ===\n\n';
    }

    return content;
  }
}

module.exports = BaseAdapter;
