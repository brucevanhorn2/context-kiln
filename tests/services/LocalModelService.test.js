/**
 * Unit tests for LocalModelService
 */

const path = require('path');
const fsSync = require('fs');
const os = require('os');

// Mock node-llama-cpp module (ESM)
const mockLlamaModel = jest.fn().mockImplementation(() => ({}));
const mockLlamaContext = jest.fn().mockImplementation(() => ({}));
const mockLlamaChatSession = jest.fn().mockImplementation(() => ({
  prompt: jest.fn().mockResolvedValue('Generated response'),
}));

// We need to mock the dynamic import
jest.mock('node-llama-cpp', () => ({
  LlamaModel: mockLlamaModel,
  LlamaContext: mockLlamaContext,
  LlamaChatSession: mockLlamaChatSession,
}), { virtual: true });

const LocalModelService = require('../../src/services/LocalModelService');

describe('LocalModelService', () => {
  let service;
  let testModelPath;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LocalModelService();
    
    // Create a fake model file for testing
    testModelPath = path.join(global.TEST_DIR, 'test-model.gguf');
    if (!fsSync.existsSync(path.dirname(testModelPath))) {
      fsSync.mkdirSync(path.dirname(testModelPath), { recursive: true });
    }
    fsSync.writeFileSync(testModelPath, 'fake model data for testing');
  });

  afterEach(async () => {
    if (service.loadedModel) {
      await service.unloadModel();
    }
  });

  describe('constructor', () => {
    it('should initialize with null values', () => {
      expect(service.loadedModel).toBeNull();
      expect(service.modelContext).toBeNull();
      expect(service.chatSession).toBeNull();
      expect(service.modelInfo).toBeNull();
      expect(service.isLoading).toBe(false);
    });
  });

  describe('isModelLoaded', () => {
    it('should return false when no model loaded', () => {
      expect(service.isModelLoaded()).toBe(false);
    });

    it('should return true when model and session exist', () => {
      service.loadedModel = {};
      service.chatSession = {};
      
      expect(service.isModelLoaded()).toBe(true);
    });

    it('should return false when only model loaded', () => {
      service.loadedModel = {};
      
      expect(service.isModelLoaded()).toBe(false);
    });
  });

  describe('getLoadedModelInfo', () => {
    it('should return null when no model loaded', () => {
      expect(service.getLoadedModelInfo()).toBeNull();
    });

    it('should return model info when available', () => {
      const info = { name: 'test-model', size: 1024 };
      service.modelInfo = info;
      
      expect(service.getLoadedModelInfo()).toBe(info);
    });
  });

  describe('unloadModel', () => {
    it('should clear all model references', async () => {
      service.loadedModel = {};
      service.modelContext = {};
      service.chatSession = {};
      service.modelInfo = { name: 'test' };
      
      await service.unloadModel();
      
      expect(service.loadedModel).toBeNull();
      expect(service.modelContext).toBeNull();
      expect(service.chatSession).toBeNull();
      expect(service.modelInfo).toBeNull();
    });

    it('should handle unload when nothing loaded', async () => {
      await expect(service.unloadModel()).resolves.not.toThrow();
    });
  });

  describe('_formatMessagesAsPrompt', () => {
    it('should format system message', () => {
      const messages = [{ role: 'system', content: 'You are a helpful assistant.' }];
      
      const prompt = service._formatMessagesAsPrompt(messages);
      
      expect(prompt).toContain('System: You are a helpful assistant.');
      expect(prompt).toContain('Assistant: ');
    });

    it('should format user message', () => {
      const messages = [{ role: 'user', content: 'Hello' }];
      
      const prompt = service._formatMessagesAsPrompt(messages);
      
      expect(prompt).toContain('User: Hello');
    });

    it('should format assistant message', () => {
      const messages = [{ role: 'assistant', content: 'Hi there!' }];
      
      const prompt = service._formatMessagesAsPrompt(messages);
      
      expect(prompt).toContain('Assistant: Hi there!');
    });

    it('should format conversation with multiple messages', () => {
      const messages = [
        { role: 'system', content: 'Be helpful' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' },
        { role: 'user', content: 'How are you?' },
      ];
      
      const prompt = service._formatMessagesAsPrompt(messages);
      
      expect(prompt).toContain('System: Be helpful');
      expect(prompt).toContain('User: Hello');
      expect(prompt).toContain('Assistant: Hi!');
      expect(prompt).toContain('User: How are you?');
      expect(prompt.endsWith('Assistant: ')).toBe(true);
    });
  });

  describe('_detectOptimalGpuLayers', () => {
    it('should return a number', () => {
      const layers = service._detectOptimalGpuLayers();
      
      expect(typeof layers).toBe('number');
      expect(layers).toBeGreaterThan(0);
    });

    it('should return expected value based on platform', () => {
      const layers = service._detectOptimalGpuLayers();
      const platform = process.platform;
      
      if (platform === 'darwin') {
        expect(layers).toBe(33);
      } else {
        // Windows and Linux default
        expect(layers).toBe(20);
      }
    });
  });

  describe('getSystemCapabilities', () => {
    it('should return system info object', () => {
      const capabilities = service.getSystemCapabilities();
      
      expect(capabilities).toHaveProperty('platform');
      expect(capabilities).toHaveProperty('cpuModel');
      expect(capabilities).toHaveProperty('cpuCores');
      expect(capabilities).toHaveProperty('totalMemoryGB');
      expect(capabilities).toHaveProperty('freeMemoryGB');
    });

    it('should return numeric values for memory', () => {
      const capabilities = service.getSystemCapabilities();
      
      expect(typeof capabilities.totalMemoryGB).toBe('number');
      expect(typeof capabilities.freeMemoryGB).toBe('number');
      expect(capabilities.totalMemoryGB).toBeGreaterThan(0);
    });

    it('should return cpu core count', () => {
      const capabilities = service.getSystemCapabilities();
      
      expect(capabilities.cpuCores).toBeGreaterThan(0);
      expect(capabilities.cpuCores).toBe(os.cpus().length);
    });
  });

  describe('recommendModelSettings', () => {
    it('should return recommendations object', () => {
      const recommendations = service.recommendModelSettings(1000);
      
      expect(recommendations).toHaveProperty('canLoad');
      expect(recommendations).toHaveProperty('warnings');
      expect(recommendations).toHaveProperty('settings');
    });

    it('should include context size setting', () => {
      const recommendations = service.recommendModelSettings(1000);
      
      expect(recommendations.settings).toHaveProperty('contextSize');
      expect(recommendations.settings.contextSize).toBeGreaterThan(0);
    });

    it('should include gpu layers setting', () => {
      const recommendations = service.recommendModelSettings(1000);
      
      expect(recommendations.settings).toHaveProperty('gpuLayers');
      expect(recommendations.settings.gpuLayers).toBeGreaterThan(0);
    });

    it('should include threads setting', () => {
      const recommendations = service.recommendModelSettings(1000);
      
      expect(recommendations.settings).toHaveProperty('threads');
      expect(recommendations.settings.threads).toBeGreaterThan(0);
    });

    it('should warn if model too large for available RAM', () => {
      // Request a huge model
      const recommendations = service.recommendModelSettings(1000000); // 1TB
      
      expect(recommendations.canLoad).toBe(false);
      expect(recommendations.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('loadModel', () => {
    it('should throw if already loading', async () => {
      service.isLoading = true;
      
      await expect(service.loadModel(testModelPath))
        .rejects.toThrow('Another model is currently loading');
    });

    it('should throw if model already loaded', async () => {
      service.loadedModel = {};
      
      await expect(service.loadModel(testModelPath))
        .rejects.toThrow('A model is already loaded');
    });

    it('should throw if file not found', async () => {
      await expect(service.loadModel('/nonexistent/model.gguf'))
        .rejects.toThrow('Model file not found');
    });

    it('should reset isLoading flag on error', async () => {
      try {
        await service.loadModel('/nonexistent/model.gguf');
      } catch (e) {
        // Expected to throw
      }
      
      expect(service.isLoading).toBe(false);
    });
  });

  describe('generateChatCompletion', () => {
    it('should throw if no model loaded', async () => {
      await expect(service.generateChatCompletion([{ role: 'user', content: 'Hi' }]))
        .rejects.toThrow('No model loaded');
    });

    it('should call chatSession.prompt when model loaded', async () => {
      const mockPrompt = jest.fn().mockResolvedValue('Response');
      service.loadedModel = {};
      service.chatSession = { prompt: mockPrompt };
      service.modelInfo = { name: 'test-model' };
      
      await service.generateChatCompletion([{ role: 'user', content: 'Hello' }]);
      
      expect(mockPrompt).toHaveBeenCalled();
    });

    it('should return completion result', async () => {
      const mockPrompt = jest.fn().mockImplementation(async (prompt, options) => {
        if (options.onToken) {
          options.onToken('Hello');
          options.onToken(' there');
        }
        return 'Hello there';
      });
      service.loadedModel = {};
      service.chatSession = { prompt: mockPrompt };
      service.modelInfo = { name: 'test-model' };
      
      const result = await service.generateChatCompletion([{ role: 'user', content: 'Hi' }]);
      
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('tokensGenerated');
      expect(result).toHaveProperty('model');
      expect(result.model).toBe('test-model');
    });

    it('should call onToken callback for streaming', async () => {
      const mockPrompt = jest.fn().mockImplementation(async (prompt, options) => {
        if (options.onToken) {
          options.onToken('tok1');
          options.onToken('tok2');
        }
        return 'tok1tok2';
      });
      service.loadedModel = {};
      service.chatSession = { prompt: mockPrompt };
      service.modelInfo = { name: 'test-model' };
      
      const onToken = jest.fn();
      await service.generateChatCompletion([{ role: 'user', content: 'Hi' }], {}, onToken);
      
      expect(onToken).toHaveBeenCalledWith('tok1');
      expect(onToken).toHaveBeenCalledWith('tok2');
    });

    it('should use provided options', async () => {
      const mockPrompt = jest.fn().mockResolvedValue('Response');
      service.loadedModel = {};
      service.chatSession = { prompt: mockPrompt };
      service.modelInfo = { name: 'test-model' };
      
      await service.generateChatCompletion(
        [{ role: 'user', content: 'Hi' }],
        { maxTokens: 512, temperature: 0.5 }
      );
      
      expect(mockPrompt).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          maxTokens: 512,
          temperature: 0.5,
        })
      );
    });
  });
});
