/**
 * Unit tests for AIProviderService
 */

// Mock the adapters before importing AIProviderService
jest.mock('../../src/services/adapters/AnthropicAdapter');
jest.mock('../../src/services/adapters/OpenAIAdapter');
jest.mock('../../src/services/adapters/OllamaAdapter');
jest.mock('../../src/services/adapters/LMStudioAdapter');
jest.mock('../../src/services/adapters/LocalModelAdapter');

const AIProviderService = require('../../src/services/AIProviderService');
const AnthropicAdapter = require('../../src/services/adapters/AnthropicAdapter');
const OpenAIAdapter = require('../../src/services/adapters/OpenAIAdapter');
const OllamaAdapter = require('../../src/services/adapters/OllamaAdapter');

describe('AIProviderService', () => {
  let service;
  let mockSettingsService;
  let mockDatabaseService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock services
    mockSettingsService = {
      getActiveApiKeyId: jest.fn().mockResolvedValue('api-key-123'),
    };

    mockDatabaseService = {
      recordUsage: jest.fn().mockResolvedValue(undefined),
    };

    // Setup default adapter mock behavior
    AnthropicAdapter.mockImplementation(() => ({
      setApiKey: jest.fn(),
      getAvailableModels: jest.fn().mockReturnValue([
        { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', contextWindow: 200000 },
      ]),
      formatRequest: jest.fn().mockReturnValue({ messages: [] }),
      sendRequest: jest.fn().mockImplementation(async (req, onChunk, onComplete) => {
        const response = { content: 'Hello', usage: { inputTokens: 10, outputTokens: 5 } };
        if (onComplete) await onComplete(response);
        return response;
      }),
      parseToolCalls: jest.fn().mockReturnValue([]),
      getErrorMessage: jest.fn().mockReturnValue('Error message'),
      supportsToolUse: jest.fn().mockReturnValue(false),
      validateApiKey: jest.fn().mockResolvedValue(true),
    }));

    OpenAIAdapter.mockImplementation(() => ({
      setApiKey: jest.fn(),
      getAvailableModels: jest.fn().mockReturnValue([
        { id: 'gpt-4', name: 'GPT-4', contextWindow: 128000 },
      ]),
      formatRequest: jest.fn().mockReturnValue({ messages: [] }),
      sendRequest: jest.fn().mockResolvedValue({ content: 'Hello' }),
      getErrorMessage: jest.fn().mockReturnValue('Error message'),
      supportsToolUse: jest.fn().mockReturnValue(false),
      validateApiKey: jest.fn().mockResolvedValue(true),
    }));

    OllamaAdapter.mockImplementation(() => ({
      getAvailableModels: jest.fn().mockReturnValue([
        { id: 'llama2', name: 'Llama 2', contextWindow: 4096 },
      ]),
      formatRequest: jest.fn().mockReturnValue({ messages: [] }),
      sendRequest: jest.fn().mockResolvedValue({ content: 'Hello' }),
      getErrorMessage: jest.fn().mockReturnValue('Error message'),
      supportsToolUse: jest.fn().mockReturnValue(false),
      validateApiKey: jest.fn().mockResolvedValue(true),
    }));

    service = new AIProviderService(mockSettingsService, mockDatabaseService);
  });

  describe('constructor', () => {
    it('should initialize with settings and database services', () => {
      expect(service.settingsService).toBe(mockSettingsService);
      expect(service.databaseService).toBe(mockDatabaseService);
    });

    it('should register default adapters', () => {
      expect(service.adapters).toHaveProperty('anthropic');
      expect(service.adapters).toHaveProperty('openai');
      expect(service.adapters).toHaveProperty('ollama');
      expect(service.adapters).toHaveProperty('lmstudio');
    });

    it('should start with no active provider', () => {
      expect(service.activeProvider).toBeNull();
    });
  });

  describe('registerAdapter', () => {
    it('should register new adapter', () => {
      const MockAdapter = jest.fn();
      service.registerAdapter('custom', MockAdapter, { option: 'value' });

      expect(service.adapters).toHaveProperty('custom');
      expect(service.adapters.custom.AdapterClass).toBe(MockAdapter);
      expect(service.adapters.custom.config).toEqual({ option: 'value' });
    });

    it('should register adapter with default config', () => {
      const MockAdapter = jest.fn();
      service.registerAdapter('custom', MockAdapter);

      expect(service.adapters.custom.config).toEqual({});
    });
  });

  describe('setLocalModelService', () => {
    it('should register LocalModelAdapter with service', () => {
      const mockLocalModelService = {
        loadModel: jest.fn(),
        generate: jest.fn(),
      };

      service.setLocalModelService(mockLocalModelService);

      expect(service.adapters).toHaveProperty('local');
      expect(service.adapters.local.instance).not.toBeNull();
    });

    it('should throw error if no service provided', () => {
      expect(() => service.setLocalModelService(null)).toThrow('LocalModelService instance is required');
    });
  });

  describe('_getAdapter', () => {
    it('should return adapter instance', () => {
      const adapter = service._getAdapter('anthropic');
      expect(adapter).toBeDefined();
    });

    it('should create instance if not exists', () => {
      expect(service.adapters.anthropic.instance).toBeNull();
      
      service._getAdapter('anthropic');
      
      expect(service.adapters.anthropic.instance).not.toBeNull();
    });

    it('should throw error for unknown provider', () => {
      expect(() => service._getAdapter('unknown')).toThrow('Unknown provider: unknown');
    });

    it('should return same instance on subsequent calls', () => {
      const adapter1 = service._getAdapter('anthropic');
      const adapter2 = service._getAdapter('anthropic');
      
      expect(adapter1).toBe(adapter2);
    });
  });

  describe('setActiveProvider', () => {
    it('should set active provider', () => {
      service.setActiveProvider('anthropic', 'test-key');
      
      expect(service.activeProvider).toBe('anthropic');
    });

    it('should configure adapter with API key', () => {
      service.setActiveProvider('anthropic', 'test-key');
      
      const adapter = service._getAdapter('anthropic');
      expect(adapter.setApiKey).toHaveBeenCalledWith('test-key');
    });

    it('should handle provider without API key', () => {
      service.setActiveProvider('ollama');
      
      expect(service.activeProvider).toBe('ollama');
    });

    it('should update config with additional options', () => {
      service.setActiveProvider('anthropic', 'test-key', { baseUrl: 'http://custom' });
      
      expect(service.adapters.anthropic.config).toMatchObject({ baseUrl: 'http://custom' });
    });
  });

  describe('getActiveProvider', () => {
    it('should return null when no provider active', () => {
      expect(service.getActiveProvider()).toBeNull();
    });

    it('should return active provider name', () => {
      service.setActiveProvider('anthropic', 'test-key');
      
      expect(service.getActiveProvider()).toBe('anthropic');
    });
  });

  describe('getAvailableProviders', () => {
    it('should return list of providers', () => {
      const providers = service.getAvailableProviders();
      
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });

    it('should include provider info', () => {
      const providers = service.getAvailableProviders();
      const anthropic = providers.find(p => p.id === 'anthropic');
      
      expect(anthropic).toBeDefined();
      expect(anthropic.name).toBe('Anthropic (Claude)');
      expect(anthropic.requiresApiKey).toBe(true);
    });

    it('should mark ollama as not requiring API key', () => {
      const providers = service.getAvailableProviders();
      const ollama = providers.find(p => p.id === 'ollama');
      
      expect(ollama.requiresApiKey).toBe(false);
    });
  });

  describe('_getProviderDisplayName', () => {
    it('should return display name for known providers', () => {
      expect(service._getProviderDisplayName('anthropic')).toBe('Anthropic (Claude)');
      expect(service._getProviderDisplayName('openai')).toBe('OpenAI (GPT)');
      expect(service._getProviderDisplayName('ollama')).toBe('Ollama (Local Models)');
    });

    it('should return provider name for unknown providers', () => {
      expect(service._getProviderDisplayName('custom')).toBe('custom');
    });
  });

  describe('getAvailableModels', () => {
    it('should return models for active provider', () => {
      service.setActiveProvider('anthropic', 'test-key');
      
      const models = service.getAvailableModels();
      
      expect(Array.isArray(models)).toBe(true);
      expect(models[0].id).toBe('claude-3-5-sonnet');
    });

    it('should return models for specified provider', () => {
      service.setActiveProvider('anthropic', 'test-key');
      
      const models = service.getAvailableModels('openai');
      
      expect(models[0].id).toBe('gpt-4');
    });

    it('should throw error when no provider specified or active', () => {
      expect(() => service.getAvailableModels()).toThrow('No provider specified or active');
    });
  });

  describe('sendMessage', () => {
    const mockContext = {
      userMessage: 'Hello',
      contextFiles: [],
      sessionContext: {
        projectId: 'proj-1',
        sessionId: 'sess-1',
      },
      preferences: {},
    };

    beforeEach(() => {
      service.setActiveProvider('anthropic', 'test-key');
    });

    it('should send message to active provider', async () => {
      await service.sendMessage(mockContext, 'claude-3-5-sonnet');
      
      const adapter = service._getAdapter('anthropic');
      expect(adapter.formatRequest).toHaveBeenCalled();
      expect(adapter.sendRequest).toHaveBeenCalled();
    });

    it('should throw error when no provider configured', async () => {
      service.activeProvider = null;
      
      await expect(service.sendMessage(mockContext, 'claude-3-5-sonnet'))
        .rejects.toThrow('No AI provider configured');
    });

    it('should call onComplete callback', async () => {
      const onComplete = jest.fn();
      
      await service.sendMessage(mockContext, 'claude-3-5-sonnet', null, null, onComplete);
      
      expect(onComplete).toHaveBeenCalled();
    });

    it('should call onError callback on failure', async () => {
      // Get the adapter and reconfigure it to fail
      const adapter = service._getAdapter('anthropic');
      adapter.sendRequest.mockRejectedValue(new Error('API Error'));
      adapter.getErrorMessage.mockReturnValue('User-friendly error');
      
      const onError = jest.fn();
      
      await expect(
        service.sendMessage(mockContext, 'claude-3-5-sonnet', null, null, null, onError)
      ).rejects.toThrow('User-friendly error');
      
      expect(onError).toHaveBeenCalled();
    });

    it('should log usage to database', async () => {
      await service.sendMessage(mockContext, 'claude-3-5-sonnet');
      
      expect(mockDatabaseService.recordUsage).toHaveBeenCalled();
    });

    it('should use specified provider over active', async () => {
      // Setup openai adapter
      const openaiAdapter = {
        setApiKey: jest.fn(),
        getAvailableModels: jest.fn().mockReturnValue([]),
        formatRequest: jest.fn().mockReturnValue({ messages: [] }),
        sendRequest: jest.fn().mockImplementation(async (req, onChunk, onComplete) => {
          const response = { content: 'From OpenAI' };
          if (onComplete) onComplete(response);
          return response;
        }),
        parseToolCalls: jest.fn().mockReturnValue([]),
        getErrorMessage: jest.fn(),
        supportsToolUse: jest.fn().mockReturnValue(false),
      };
      OpenAIAdapter.mockImplementation(() => openaiAdapter);
      
      // Re-register to get new mock
      service.registerAdapter('openai', OpenAIAdapter);
      service._getAdapter('openai'); // Force instance creation
      
      await service.sendMessage(mockContext, 'gpt-4', 'openai');
      
      expect(openaiAdapter.sendRequest).toHaveBeenCalled();
    });
  });

  describe('validateApiKey', () => {
    it('should validate API key with adapter', async () => {
      const result = await service.validateApiKey('anthropic', 'test-key');
      
      expect(result).toBe(true);
    });

    it('should return false for invalid key', async () => {
      const adapter = service._getAdapter('anthropic');
      adapter.validateApiKey.mockResolvedValue(false);
      
      const result = await service.validateApiKey('anthropic', 'invalid-key');
      
      expect(result).toBe(false);
    });
  });

  describe('buildInternalContext', () => {
    it('should build context with defaults', () => {
      const context = service.buildInternalContext('Hello');
      
      expect(context.userMessage).toBe('Hello');
      expect(context.contextFiles).toEqual([]);
      expect(context.sessionContext).toEqual({});
      expect(context.preferences.maxContextTokens).toBe(150000);
      expect(context.preferences.includeLineNumbers).toBe(true);
    });

    it('should include provided context files', () => {
      const files = [{ path: '/test.js', content: 'code' }];
      
      const context = service.buildInternalContext('Hello', files);
      
      expect(context.contextFiles).toEqual(files);
    });

    it('should include session context', () => {
      const session = { projectId: 'proj-1', sessionId: 'sess-1' };
      
      const context = service.buildInternalContext('Hello', [], session);
      
      expect(context.sessionContext).toEqual(session);
    });

    it('should merge preferences with defaults', () => {
      const prefs = { maxContextTokens: 50000 };
      
      const context = service.buildInternalContext('Hello', [], {}, prefs);
      
      expect(context.preferences.maxContextTokens).toBe(50000);
      expect(context.preferences.includeLineNumbers).toBe(true);
    });
  });

  describe('_logUsage', () => {
    it('should record usage in database', async () => {
      const context = {
        sessionContext: {
          projectId: 'proj-1',
          sessionId: 'sess-1',
        },
      };
      const usage = { inputTokens: 100, outputTokens: 50 };

      service.setActiveProvider('anthropic', 'test-key');
      await service._logUsage('anthropic', 'claude-3-5-sonnet', context, usage);

      expect(mockDatabaseService.recordUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'proj-1',
          sessionId: 'sess-1',
          model: 'claude-3-5-sonnet',
          provider: 'anthropic',
          inputTokens: 100,
          outputTokens: 50,
        })
      );
    });

    it('should not throw if database service is null', async () => {
      service.databaseService = null;
      
      await expect(
        service._logUsage('anthropic', 'claude-3-5-sonnet', {}, {})
      ).resolves.not.toThrow();
    });

    it('should handle logging errors gracefully', async () => {
      mockDatabaseService.recordUsage.mockRejectedValue(new Error('DB Error'));
      
      // Should not throw
      await expect(
        service._logUsage('anthropic', 'claude-3-5-sonnet', {}, { inputTokens: 10, outputTokens: 5 })
      ).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should enhance error with provider info', async () => {
      service.setActiveProvider('anthropic', 'test-key');
      const adapter = service._getAdapter('anthropic');
      adapter.sendRequest.mockRejectedValue(new Error('API Error'));
      adapter.getErrorMessage.mockReturnValue('User-friendly error');

      try {
        await service.sendMessage({ userMessage: 'test' }, 'claude-3-5-sonnet');
        fail('Should have thrown');
      } catch (error) {
        expect(error.message).toBe('User-friendly error');
        expect(error.provider).toBe('anthropic');
        expect(error.originalError).toBeDefined();
      }
    });
  });
});
