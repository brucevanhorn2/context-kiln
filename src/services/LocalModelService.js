const { LlamaModel, LlamaContext, LlamaChatSession } = require('node-llama-cpp');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

/**
 * LocalModelService - Embedded model hosting using node-llama-cpp
 *
 * Phase E: Load and run GGUF models directly in Context Kiln
 * No external services (Ollama/LM Studio) required
 *
 * Features:
 * - Load GGUF files from disk
 * - GPU acceleration (CUDA, Metal, Vulkan)
 * - Multiple quantization support (Q4, Q8, F16)
 * - Memory management (load/unload models)
 * - Chat completions with streaming
 *
 * @class LocalModelService
 */
class LocalModelService {
  constructor() {
    this.loadedModel = null;
    this.modelContext = null;
    this.chatSession = null;
    this.modelInfo = null;
    this.isLoading = false;
  }

  /**
   * Load a GGUF model from disk
   *
   * @param {string} modelPath - Absolute path to .gguf file
   * @param {object} options - Loading options
   * @param {number} [options.gpuLayers] - Number of layers to offload to GPU (default: auto-detect)
   * @param {number} [options.contextSize] - Context window size (default: 2048)
   * @param {number} [options.threads] - CPU threads to use (default: auto)
   * @returns {Promise<object>} Model info
   */
  async loadModel(modelPath, options = {}) {
    if (this.isLoading) {
      throw new Error('Another model is currently loading');
    }

    if (this.loadedModel) {
      throw new Error('A model is already loaded. Unload it first.');
    }

    try {
      this.isLoading = true;
      console.log('[LocalModelService] Loading model:', modelPath);

      // Check if file exists
      try {
        await fs.access(modelPath);
      } catch (err) {
        throw new Error(`Model file not found: ${modelPath}`);
      }

      // Get file stats
      const stats = await fs.stat(modelPath);
      const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`[LocalModelService] Model file size: ${fileSizeMB} MB`);

      // Determine GPU layers (auto-detect if not specified)
      const gpuLayers = options.gpuLayers !== undefined
        ? options.gpuLayers
        : this._detectOptimalGpuLayers();

      console.log(`[LocalModelService] GPU layers: ${gpuLayers}`);

      // Load model
      this.loadedModel = new LlamaModel({
        modelPath: modelPath,
        gpuLayers: gpuLayers,
      });

      console.log('[LocalModelService] Model loaded, creating context...');

      // Create context
      const contextSize = options.contextSize || 2048;
      this.modelContext = new LlamaContext({
        model: this.loadedModel,
        contextSize: contextSize,
        threads: options.threads || Math.max(1, os.cpus().length - 1),
      });

      console.log('[LocalModelService] Context created, initializing chat session...');

      // Create chat session
      this.chatSession = new LlamaChatSession({
        context: this.modelContext,
      });

      // Store model info
      this.modelInfo = {
        path: modelPath,
        name: path.basename(modelPath, path.extname(modelPath)),
        size: stats.size,
        sizeMB: fileSizeMB,
        contextSize: contextSize,
        gpuLayers: gpuLayers,
        loadedAt: new Date().toISOString(),
      };

      console.log('[LocalModelService] Model ready:', this.modelInfo.name);

      return this.modelInfo;
    } catch (error) {
      console.error('[LocalModelService] Failed to load model:', error);
      // Clean up on error
      await this.unloadModel();
      throw new Error(`Failed to load model: ${error.message}`);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Unload current model and free memory
   */
  async unloadModel() {
    console.log('[LocalModelService] Unloading model...');

    if (this.chatSession) {
      this.chatSession = null;
    }

    if (this.modelContext) {
      // Note: node-llama-cpp handles cleanup automatically
      this.modelContext = null;
    }

    if (this.loadedModel) {
      this.loadedModel = null;
    }

    this.modelInfo = null;
    console.log('[LocalModelService] Model unloaded');
  }

  /**
   * Check if a model is currently loaded
   */
  isModelLoaded() {
    return this.loadedModel !== null && this.chatSession !== null;
  }

  /**
   * Get info about currently loaded model
   */
  getLoadedModelInfo() {
    return this.modelInfo;
  }

  /**
   * Generate chat completion
   *
   * @param {Array} messages - Chat messages in OpenAI format
   * @param {object} options - Generation options
   * @param {Function} onToken - Callback for streaming tokens
   * @returns {Promise<object>} Completion result
   */
  async generateChatCompletion(messages, options = {}, onToken = null) {
    if (!this.isModelLoaded()) {
      throw new Error('No model loaded. Load a model first.');
    }

    try {
      console.log('[LocalModelService] Generating completion...');

      // Build prompt from messages (simple concatenation for now)
      const prompt = this._formatMessagesAsPrompt(messages);

      let fullResponse = '';
      let tokenCount = 0;

      // Generate with streaming
      const result = await this.chatSession.prompt(prompt, {
        maxTokens: options.maxTokens || 1024,
        temperature: options.temperature !== undefined ? options.temperature : 0.7,
        topP: options.topP || 0.9,
        topK: options.topK || 40,
        onToken: (token) => {
          fullResponse += token;
          tokenCount++;

          // Call streaming callback if provided
          if (onToken) {
            onToken(token);
          }
        },
      });

      console.log(`[LocalModelService] Completion done (${tokenCount} tokens)`);

      return {
        content: fullResponse,
        tokensGenerated: tokenCount,
        model: this.modelInfo.name,
      };
    } catch (error) {
      console.error('[LocalModelService] Generation error:', error);
      throw new Error(`Failed to generate completion: ${error.message}`);
    }
  }

  /**
   * Format messages array as a single prompt string
   * Simple implementation - can be improved with better templates
   *
   * @private
   */
  _formatMessagesAsPrompt(messages) {
    let prompt = '';

    for (const message of messages) {
      if (message.role === 'system') {
        prompt += `System: ${message.content}\n\n`;
      } else if (message.role === 'user') {
        prompt += `User: ${message.content}\n\n`;
      } else if (message.role === 'assistant') {
        prompt += `Assistant: ${message.content}\n\n`;
      }
    }

    prompt += 'Assistant: ';
    return prompt;
  }

  /**
   * Detect optimal GPU layers based on available hardware
   * @private
   */
  _detectOptimalGpuLayers() {
    // Simple heuristic - can be improved with actual GPU detection
    const platform = os.platform();

    if (platform === 'darwin') {
      // macOS - likely has Metal GPU
      return 33; // Offload most layers to GPU
    } else if (platform === 'win32') {
      // Windows - might have NVIDIA/AMD GPU
      // TODO: Actually detect GPU presence
      return 20; // Conservative default
    } else {
      // Linux - might have CUDA
      return 20;
    }
  }

  /**
   * Get system capabilities for model loading
   */
  getSystemCapabilities() {
    const cpus = os.cpus();
    const totalMemoryGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const freeMemoryGB = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);

    return {
      platform: os.platform(),
      cpuModel: cpus[0]?.model || 'Unknown',
      cpuCores: cpus.length,
      totalMemoryGB: parseFloat(totalMemoryGB),
      freeMemoryGB: parseFloat(freeMemoryGB),
      // GPU detection would go here - node-llama-cpp doesn't expose this easily
    };
  }

  /**
   * Recommend model settings based on system capabilities
   */
  recommendModelSettings(modelSizeMB) {
    const capabilities = this.getSystemCapabilities();
    const recommendations = {
      canLoad: true,
      warnings: [],
      settings: {},
    };

    // Check if we have enough RAM
    const requiredMemoryGB = (modelSizeMB / 1024) * 1.5; // 1.5x for overhead
    if (requiredMemoryGB > capabilities.freeMemoryGB) {
      recommendations.canLoad = false;
      recommendations.warnings.push(
        `Model requires ~${requiredMemoryGB.toFixed(1)}GB RAM, but only ${capabilities.freeMemoryGB}GB available`
      );
    }

    // Recommend context size based on available memory
    if (capabilities.freeMemoryGB < 4) {
      recommendations.settings.contextSize = 1024;
      recommendations.warnings.push('Limited RAM - using small context window');
    } else if (capabilities.freeMemoryGB < 8) {
      recommendations.settings.contextSize = 2048;
    } else {
      recommendations.settings.contextSize = 4096;
    }

    // Recommend GPU layers
    recommendations.settings.gpuLayers = this._detectOptimalGpuLayers();

    // Recommend threads
    recommendations.settings.threads = Math.max(1, capabilities.cpuCores - 1);

    return recommendations;
  }
}

module.exports = LocalModelService;
