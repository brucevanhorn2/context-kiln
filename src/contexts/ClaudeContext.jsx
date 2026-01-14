import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

/**
 * ClaudeContext - Manage AI chat state and interactions
 *
 * Responsibilities:
 * - Message history state
 * - Streaming responses from AI providers
 * - Provider and model selection
 * - Error handling
 * - Context file management for prompts
 *
 * Uses AIProviderService via IPC (window.electron.sendAIMessage)
 */

const ClaudeContext = createContext(null);

/**
 * Hook to access ClaudeContext
 * @returns {object} Context value
 */
export const useClaude = () => {
  const context = useContext(ClaudeContext);
  if (!context) {
    throw new Error('useClaude must be used within ClaudeProvider');
  }
  return context;
};

/**
 * Message format:
 * {
 *   id: string,
 *   role: 'user' | 'assistant',
 *   content: string,
 *   timestamp: Date,
 *   model?: string,
 *   tokens?: { input: number, output: number },
 *   cost?: number,
 *   isStreaming?: boolean
 * }
 */

export const ClaudeProvider = ({ children }) => {
  // State
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentProvider, setCurrentProvider] = useState('anthropic');
  const [currentModel, setCurrentModel] = useState('claude-3-5-sonnet-20241022');
  const [error, setError] = useState(null);
  const [contextFiles, setContextFiles] = useState([]);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);

  // Refs for streaming
  const streamingMessageIdRef = useRef(null);
  const streamingContentRef = useRef('');

  /**
   * Load available providers on mount
   */
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const providers = await window.electron.getAIProviders();
        setAvailableProviders(providers);
      } catch (err) {
        console.error('Failed to load providers:', err);
      }
    };

    loadProviders();
  }, []);

  /**
   * Load available models when provider changes
   */
  useEffect(() => {
    const loadModels = async () => {
      if (!currentProvider) return;

      try {
        const models = await window.electron.getAIModels(currentProvider);
        setAvailableModels(models);
      } catch (err) {
        console.error('Failed to load models:', err);
        setAvailableModels([]);
      }
    };

    loadModels();
  }, [currentProvider]);

  /**
   * Handle streaming chunks from AI
   */
  useEffect(() => {
    const handleChunk = (event, chunk) => {
      if (!streamingMessageIdRef.current) return;

      if (chunk.type === 'chunk' && chunk.content) {
        // Append to streaming content
        streamingContentRef.current += chunk.content;

        // Update message in state
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === streamingMessageIdRef.current
              ? { ...msg, content: streamingContentRef.current }
              : msg
          )
        );
      } else if (chunk.type === 'done') {
        // Streaming complete
        const finalMessage = chunk.message;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === streamingMessageIdRef.current
              ? {
                  ...msg,
                  content: finalMessage.content,
                  tokens: finalMessage.usage,
                  cost: finalMessage.cost,
                  isStreaming: false,
                }
              : msg
          )
        );

        // Reset streaming state
        streamingMessageIdRef.current = null;
        streamingContentRef.current = '';
        setIsStreaming(false);
      } else if (chunk.type === 'error') {
        // Streaming error
        setError(chunk.error);
        setIsStreaming(false);
        streamingMessageIdRef.current = null;
        streamingContentRef.current = '';
      }
    };

    window.electron.onAIChunk(handleChunk);

    // Cleanup
    return () => {
      window.electron.offAIChunk(handleChunk);
    };
  }, []);

  /**
   * Send message to AI
   *
   * @param {string} userMessage - User's message
   * @param {object} options - Optional settings
   * @param {string} options.provider - Override current provider
   * @param {string} options.model - Override current model
   * @param {Array} options.contextFiles - Override context files
   */
  const sendMessage = useCallback(
    async (userMessage, options = {}) => {
      try {
        setError(null);
        setIsStreaming(true);

        // Add user message to history
        const userMsg = {
          id: `user-${Date.now()}`,
          role: 'user',
          content: userMessage,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg]);

        // Create placeholder for assistant response
        const assistantMsgId = `assistant-${Date.now()}`;
        const assistantMsg = {
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          model: options.model || currentModel,
          isStreaming: true,
        };

        setMessages((prev) => [...prev, assistantMsg]);

        // Set up streaming refs
        streamingMessageIdRef.current = assistantMsgId;
        streamingContentRef.current = '';

        // Build internal context format
        const internalContext = {
          userMessage,
          contextFiles: options.contextFiles || contextFiles,
          sessionContext: {
            previousMessages: messages.slice(-5), // Last 5 messages for context
          },
          preferences: {
            includeLineNumbers: true,
            includeMetadata: true,
            contextFormat: 'markdown',
          },
        };

        // Send to main process
        await window.electron.sendAIMessage({
          internalContext,
          model: options.model || currentModel,
          provider: options.provider || currentProvider,
        });
      } catch (err) {
        console.error('Failed to send message:', err);
        setError(err.message || 'Failed to send message');
        setIsStreaming(false);
        streamingMessageIdRef.current = null;
        streamingContentRef.current = '';
      }
    },
    [messages, contextFiles, currentModel, currentProvider]
  );

  /**
   * Stop streaming (if in progress)
   */
  const stopStreaming = useCallback(() => {
    // TODO: Implement abort signal in AIProviderService
    setIsStreaming(false);
    streamingMessageIdRef.current = null;
    streamingContentRef.current = '';
  }, []);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  /**
   * Add context file
   *
   * @param {object} file - File metadata from FileService
   */
  const addContextFile = useCallback((file) => {
    setContextFiles((prev) => {
      // Don't add duplicates
      if (prev.some((f) => f.path === file.path)) {
        return prev;
      }
      return [...prev, file];
    });
  }, []);

  /**
   * Remove context file
   *
   * @param {string} filePath - Path of file to remove
   */
  const removeContextFile = useCallback((filePath) => {
    setContextFiles((prev) => prev.filter((f) => f.path !== filePath));
  }, []);

  /**
   * Clear all context files
   */
  const clearContextFiles = useCallback(() => {
    setContextFiles([]);
  }, []);

  /**
   * Switch AI provider
   *
   * @param {string} provider - Provider name ('anthropic', 'openai', 'ollama')
   */
  const switchProvider = useCallback((provider) => {
    setCurrentProvider(provider);
    setError(null);
  }, []);

  /**
   * Switch AI model
   *
   * @param {string} model - Model ID
   */
  const switchModel = useCallback((model) => {
    setCurrentModel(model);
  }, []);

  /**
   * Regenerate last response
   */
  const regenerateResponse = useCallback(() => {
    // Find last user message
    const lastUserMessage = [...messages]
      .reverse()
      .find((msg) => msg.role === 'user');

    if (!lastUserMessage) {
      setError('No user message to regenerate from');
      return;
    }

    // Remove last assistant message if exists
    setMessages((prev) => {
      const lastIndex = prev.length - 1;
      if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
        return prev.slice(0, -1);
      }
      return prev;
    });

    // Resend last user message
    sendMessage(lastUserMessage.content);
  }, [messages, sendMessage]);

  /**
   * Validate API key for current provider
   *
   * @param {string} apiKey - API key to validate
   * @returns {Promise<boolean>} True if valid
   */
  const validateApiKey = useCallback(
    async (apiKey) => {
      try {
        const isValid = await window.electron.validateApiKey(
          currentProvider,
          apiKey
        );
        return isValid;
      } catch (err) {
        console.error('Failed to validate API key:', err);
        return false;
      }
    },
    [currentProvider]
  );

  // Context value
  const value = {
    // State
    messages,
    isStreaming,
    currentProvider,
    currentModel,
    error,
    contextFiles,
    availableProviders,
    availableModels,

    // Actions
    sendMessage,
    stopStreaming,
    clearMessages,
    addContextFile,
    removeContextFile,
    clearContextFiles,
    switchProvider,
    switchModel,
    regenerateResponse,
    validateApiKey,
  };

  return (
    <ClaudeContext.Provider value={value}>{children}</ClaudeContext.Provider>
  );
};

export default ClaudeContext;
