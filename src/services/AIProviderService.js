const AnthropicAdapter = require('./adapters/AnthropicAdapter');
const OpenAIAdapter = require('./adapters/OpenAIAdapter');
const OllamaAdapter = require('./adapters/OllamaAdapter');
const LMStudioAdapter = require('./adapters/LMStudioAdapter');
const LocalModelAdapter = require('./adapters/LocalModelAdapter');
const logService = require('./LogService');

/**
 * AIProviderService - Facade for all AI provider adapters
 *
 * Design Pattern: Facade Pattern
 * Purpose: Provide a unified interface for interacting with multiple AI providers
 *
 * This service:
 * - Registers and manages adapter instances
 * - Routes requests to the appropriate adapter
 * - Handles provider selection and configuration
 * - Provides a consistent API regardless of underlying provider
 *
 * Usage:
 *   const service = new AIProviderService(settingsService, databaseService);
 *   service.setActiveProvider('anthropic', apiKey);
 *   const response = await service.sendMessage(internalContext, 'claude-3-5-sonnet');
 */
class AIProviderService {
  /**
   * @param {object} settingsService - Service for managing settings (API keys, etc.)
   * @param {object} databaseService - Service for logging usage
   */
  constructor(settingsService, databaseService) {
    this.settingsService = settingsService;
    this.databaseService = databaseService;

    // Registry of adapter instances
    this.adapters = {};

    // Currently active provider
    this.activeProvider = null;

    // Register default adapters
    this.registerAdapter('anthropic', AnthropicAdapter);
    this.registerAdapter('openai', OpenAIAdapter);
    this.registerAdapter('ollama', OllamaAdapter);
    this.registerAdapter('lmstudio', LMStudioAdapter);
    // Local adapter registered separately via setLocalModelService()
  }

  /**
   * Register LocalModelService and create LocalModelAdapter
   * Phase E: Must be called after LocalModelService is initialized
   *
   * @param {LocalModelService} localModelService - Instance of LocalModelService
   */
  setLocalModelService(localModelService) {
    if (!localModelService) {
      throw new Error('LocalModelService instance is required');
    }

    // Create LocalModelAdapter instance with the service
    const localAdapter = new LocalModelAdapter({}, localModelService);

    // Register it directly as an instance (not a class)
    this.adapters['local'] = {
      AdapterClass: LocalModelAdapter,
      instance: localAdapter,
      config: { localModelService },
    };
  }

  /**
   * Register a new adapter
   *
   * @param {string} providerName - Provider identifier (e.g., 'anthropic', 'openai')
   * @param {class} AdapterClass - Adapter class (must extend BaseAdapter)
   * @param {object} config - Optional configuration for the adapter
   */
  registerAdapter(providerName, AdapterClass, config = {}) {
    this.adapters[providerName] = {
      AdapterClass,
      instance: null,
      config,
    };
  }

  /**
   * Get or create adapter instance
   *
   * @param {string} providerName - Provider identifier
   * @returns {BaseAdapter} Adapter instance
   * @private
   */
  _getAdapter(providerName) {
    const adapter = this.adapters[providerName];

    if (!adapter) {
      throw new Error(`Unknown provider: ${providerName}`);
    }

    // Create instance if it doesn't exist
    if (!adapter.instance) {
      adapter.instance = new adapter.AdapterClass(adapter.config);
    }

    return adapter.instance;
  }

  /**
   * Set active provider and configure it
   *
   * @param {string} providerName - Provider identifier
   * @param {string} apiKey - API key (if required)
   * @param {object} additionalConfig - Additional configuration
   */
  setActiveProvider(providerName, apiKey = null, additionalConfig = {}) {
    const adapter = this._getAdapter(providerName);

    // Configure the adapter
    if (apiKey && adapter.setApiKey) {
      adapter.setApiKey(apiKey);
    }

    // Update config if needed
    if (Object.keys(additionalConfig).length > 0) {
      this.adapters[providerName].config = {
        ...this.adapters[providerName].config,
        ...additionalConfig,
      };

      // Recreate instance with new config
      this.adapters[providerName].instance = new this.adapters[providerName].AdapterClass({
        ...this.adapters[providerName].config,
        apiKey,
      });
    }

    this.activeProvider = providerName;
  }

  /**
   * Get active provider name
   *
   * @returns {string|null} Active provider name or null
   */
  getActiveProvider() {
    return this.activeProvider;
  }

  /**
   * Get list of available providers
   *
   * @returns {Array<object>} Array of provider info
   */
  getAvailableProviders() {
    return Object.keys(this.adapters).map(providerName => ({
      id: providerName,
      name: this._getProviderDisplayName(providerName),
      requiresApiKey: providerName !== 'ollama',
      isConfigured: this.adapters[providerName].instance !== null,
    }));
  }

  /**
   * Get display name for provider
   *
   * @param {string} providerName - Provider identifier
   * @returns {string} Display name
   * @private
   */
  _getProviderDisplayName(providerName) {
    const names = {
      anthropic: 'Anthropic (Claude)',
      openai: 'OpenAI (GPT)',
      ollama: 'Ollama (Local Models)',
    };

    return names[providerName] || providerName;
  }

  /**
   * Get available models for a provider
   *
   * @param {string} providerName - Provider identifier (defaults to active)
   * @returns {Array<object>} Array of model info
   */
  getAvailableModels(providerName = null) {
    const provider = providerName || this.activeProvider;

    if (!provider) {
      throw new Error('No provider specified or active');
    }

    const adapter = this._getAdapter(provider);
    return adapter.getAvailableModels();
  }

  /**
   * Send message to AI provider
   *
   * @param {object} internalContext - Internal context format
   * @param {string} model - Model to use
   * @param {string} providerName - Provider (defaults to active)
   * @param {function} onChunk - Callback for streaming chunks
   * @param {function} onComplete - Callback when complete
   * @param {function} onError - Callback for errors
   * @param {object} toolExecutionService - Tool execution service (optional)
   * @param {object} toolContext - Tool context for approval (optional)
   * @param {string} projectRoot - Project root path (optional)
   * @returns {Promise<object>} Response in internal format
   */
  async sendMessage(
    internalContext,
    model,
    providerName = null,
    onChunk = null,
    onComplete = null,
    onError = null,
    toolExecutionService = null,
    toolContext = null,
    projectRoot = null
  ) {
    const provider = providerName || this.activeProvider;

    if (!provider) {
      const error = new Error('No AI provider configured. Please set up an API key in settings.');
      if (onError) onError(error);
      throw error;
    }

    try {
      const adapter = this._getAdapter(provider);

      // Check if adapter supports tool use
      const supportsTools = adapter.supportsToolUse && adapter.supportsToolUse();

      // Format request using adapter (this will include tools if supported)
      const formattedRequest = adapter.formatRequest(internalContext, model);

      // Send request
      const response = await adapter.sendRequest(
        formattedRequest,
        onChunk,
        async (adapterResponse) => {
          // Log usage to database
          if (this.databaseService && adapterResponse.usage) {
            await this._logUsage(
              provider,
              model,
              internalContext,
              adapterResponse.usage
            );
          }

          // Check for tool calls in response
          if (supportsTools && toolExecutionService && toolContext && projectRoot) {
            const toolCalls = adapter.parseToolCalls(adapterResponse);

            if (toolCalls && toolCalls.length > 0) {
              logService.info('AIProviderService', 'Tool calls detected', { count: toolCalls.length });
              // Execute tools and send results back
              await this._handleToolCalls(
                toolCalls,
                adapterResponse,
                internalContext,
                adapter,
                toolExecutionService,
                toolContext,
                projectRoot,
                model,
                provider,
                onChunk,
                onComplete,
                onError
              );
              return; // Don't call onComplete yet - tool loop will handle it
            }
          }

          if (onComplete) {
            onComplete(adapterResponse);
          }
        },
        onError
      );

      return response;
    } catch (error) {
      logService.error('AIProviderService', 'AI provider error', {
        provider,
        error: error.message,
        stack: error.stack
      });

      const adapter = this._getAdapter(provider);
      const userMessage = adapter.getErrorMessage(error);

      const enhancedError = new Error(userMessage);
      enhancedError.originalError = error;
      enhancedError.provider = provider;

      if (onError) {
        onError(enhancedError);
      }

      throw enhancedError;
    }
  }

  /**
   * Handle tool calls from AI response
   * Executes tools and sends results back to AI
   *
   * @param {Array} toolCalls - Array of tool call objects
   * @param {object} assistantResponse - The assistant's response containing tool_use blocks
   * @param {object} originalContext - The original internal context
   * @param {BaseAdapter} adapter - Adapter instance
   * @param {ToolExecutionService} toolExecutionService - Tool execution service
   * @param {object} toolContext - Tool context for approval
   * @param {string} projectRoot - Project root path
   * @param {string} model - Model being used
   * @param {string} provider - Provider name
   * @param {function} onChunk - Streaming callback
   * @param {function} onComplete - Completion callback
   * @param {function} onError - Error callback
   * @private
   */
  async _handleToolCalls(
    toolCalls,
    assistantResponse,
    originalContext,
    adapter,
    toolExecutionService,
    toolContext,
    projectRoot,
    model,
    provider,
    onChunk,
    onComplete,
    onError
  ) {
    try {
      // Set project root
      toolExecutionService.setProjectRoot(projectRoot);

      // Execute each tool call
      const toolResults = [];

      for (const toolCall of toolCalls) {
        try {
          // Execute tool (this will handle approval workflow)
          const result = await toolExecutionService.executeTool(toolCall, toolContext);

          // Format result for adapter
          const formattedResult = adapter.formatToolResult(toolCall.id, result);
          toolResults.push(formattedResult);
        } catch (toolError) {
          logService.error('AIProviderService', 'Tool execution failed', {
            toolType: toolCall.type,
            error: toolError.message
          });

          // Format error result
          const errorResult = adapter.formatToolResult(toolCall.id, {
            success: false,
            error: {
              type: 'execution_error',
              message: toolError.message,
              recoverable: true,
            },
          });

          toolResults.push(errorResult);
        }
      }

      // Send tool results back to AI
      // Build new request with tool results
      // We need to include the assistant's response and the tool results in the conversation history
      logService.info('AIProviderService', 'Tool execution complete, sending results to AI', { resultCount: toolResults.length });
      const previousMessages = originalContext.sessionContext?.previousMessages || [];

      // Add the assistant's response containing tool_use blocks
      const assistantMessage = {
        role: 'assistant',
        content: assistantResponse.content || '', // Raw content blocks from API (includes tool_use)
      };

      const toolResultContext = {
        sessionContext: {
          ...originalContext.sessionContext,
          previousMessages: [...previousMessages, assistantMessage],
        },
        toolResults, // Array of formatted tool_result content blocks
        preferences: originalContext.preferences,
      };

      // Make another request with tool results
      // This creates the tool loop
      const formattedRequest = adapter.formatRequest(toolResultContext, model);
      formattedRequest.tools = adapter.getToolDefinitions();

      // Send follow-up request
      await adapter.sendRequest(
        formattedRequest,
        (chunk) => {
          if (onChunk) onChunk(chunk);
        },
        async (followUpResponse) => {
          // Log usage for follow-up
          if (this.databaseService && followUpResponse.usage) {
            await this._logUsage(
              provider,
              model,
              toolResultContext,
              followUpResponse.usage
            );
          }

          // Check if AI wants to call more tools
          const moreToolCalls = adapter.parseToolCalls(followUpResponse);

          if (moreToolCalls && moreToolCalls.length > 0) {
            // Recursively handle more tool calls
            await this._handleToolCalls(
              moreToolCalls,
              followUpResponse,
              toolResultContext,
              adapter,
              toolExecutionService,
              toolContext,
              projectRoot,
              model,
              provider,
              onChunk,
              onComplete,
              onError
            );
          } else {
            // No more tool calls - we're done
            if (onComplete) {
              onComplete(followUpResponse);
            }
          }
        },
        onError
      );
    } catch (error) {
      logService.error('AIProviderService', 'Error handling tool calls', {
        error: error.message,
        stack: error.stack
      });
      if (onError) {
        onError(error);
      }
    }
  }

  /**
   * Validate API key for a provider
   *
   * @param {string} providerName - Provider identifier
   * @param {string} apiKey - API key to validate
   * @returns {Promise<boolean>} True if valid
   */
  async validateApiKey(providerName, apiKey) {
    const adapter = this._getAdapter(providerName);
    return await adapter.validateApiKey(apiKey);
  }

  /**
   * Log usage to database
   *
   * @param {string} provider - Provider name
   * @param {string} model - Model used
   * @param {object} internalContext - Context that was sent
   * @param {object} usage - Usage info from API response
   * @private
   */
  async _logUsage(provider, model, internalContext, usage) {
    if (!this.databaseService) {
      return;
    }

    try {
      // Get project ID if available
      const projectId = internalContext.sessionContext?.projectId || null;

      // Get session ID if available
      const sessionId = internalContext.sessionContext?.sessionId || null;

      // Get API key ID (we don't want to store the actual key)
      const apiKeyId = this.settingsService ? await this.settingsService.getActiveApiKeyId(provider) : null;

      // Calculate cost
      const models = await this.getAvailableModels(provider);
      const modelInfo = models ? models.find(m => m.id === model) : null;
      let costUsd = 0;

      if (modelInfo && modelInfo.pricing) {
        const inputCost = (usage.inputTokens / 1000000) * modelInfo.pricing.inputPerMToken;
        const outputCost = (usage.outputTokens / 1000000) * modelInfo.pricing.outputPerMToken;
        costUsd = inputCost + outputCost;
      }

      // Record usage
      await this.databaseService.recordUsage({
        projectId,
        apiKeyId,
        sessionId,
        model,
        provider,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costUsd,
      });
    } catch (error) {
      logService.error('AIProviderService', 'Failed to log usage', { error: error.message });
      // Don't throw - logging failure shouldn't break the main flow
    }
  }

  /**
   * Build internal context from raw inputs
   * Helper method for other services
   *
   * @param {string} userMessage - User's message
   * @param {Array} contextFiles - Array of context file objects
   * @param {object} sessionContext - Session information
   * @param {object} preferences - User preferences
   * @returns {object} Internal context format
   */
  buildInternalContext(userMessage, contextFiles = [], sessionContext = {}, preferences = {}) {
    return {
      contextFiles,
      userMessage,
      sessionContext,
      preferences: {
        maxContextTokens: 150000,
        includeLineNumbers: true,
        includeMetadata: true,
        ...preferences,
      },
    };
  }
}

module.exports = AIProviderService;
