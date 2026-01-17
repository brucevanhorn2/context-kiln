/**
 * Unit tests for TokenCounterService
 */

// Mock tiktoken
jest.mock('tiktoken', () => ({
  encoding_for_model: jest.fn(() => ({
    encode: jest.fn((text) => {
      // Simulate token encoding - roughly 1 token per 4 chars
      return new Array(Math.ceil(text.length / 4));
    }),
    free: jest.fn(),
  })),
}));

const TokenCounterService = require('../../src/services/TokenCounterService');

describe('TokenCounterService', () => {
  let tokenCounter;

  beforeEach(() => {
    tokenCounter = new TokenCounterService();
  });

  afterEach(() => {
    tokenCounter.close();
  });

  describe('constructor', () => {
    it('should initialize with null encoder', () => {
      expect(tokenCounter.encoder).toBeNull();
    });

    it('should have fallback multiplier', () => {
      expect(tokenCounter.fallbackMultiplier).toBe(0.25);
    });
  });

  describe('initialize', () => {
    it('should initialize encoder', () => {
      tokenCounter.initialize();
      expect(tokenCounter.encoder).not.toBeNull();
    });
  });

  describe('countTokens', () => {
    beforeEach(() => {
      tokenCounter.initialize();
    });

    it('should return 0 for empty string', () => {
      expect(tokenCounter.countTokens('')).toBe(0);
    });

    it('should return 0 for null', () => {
      expect(tokenCounter.countTokens(null)).toBe(0);
    });

    it('should count tokens in text', () => {
      const count = tokenCounter.countTokens('Hello, world!');
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('_fallbackCount', () => {
    it('should estimate tokens based on character count', () => {
      const text = 'This is a test string with some characters';
      const count = tokenCounter._fallbackCount(text);
      // 43 chars * 0.25 = 10.75, ceil = 11
      expect(count).toBe(Math.ceil(text.length * 0.25));
    });
  });

  describe('countContextTokens', () => {
    beforeEach(() => {
      tokenCounter.initialize();
    });

    it('should count tokens in context files', () => {
      const context = {
        contextFiles: [
          { path: 'file1.js', content: 'const x = 1;' },
          { path: 'file2.js', content: 'const y = 2;' },
        ],
      };

      const breakdown = tokenCounter.countContextTokens(context);

      expect(breakdown.contextFiles).toBeGreaterThan(0);
      expect(breakdown.total).toBe(breakdown.contextFiles);
    });

    it('should count tokens in user message', () => {
      const context = {
        userMessage: 'Please help me with this code',
        contextFiles: [],
      };

      const breakdown = tokenCounter.countContextTokens(context);

      expect(breakdown.userMessage).toBeGreaterThan(0);
    });

    it('should count tokens in session context', () => {
      const context = {
        contextFiles: [],
        sessionContext: {
          summary: 'This is a summary',
          previousMessages: [
            { content: 'Message 1' },
            { content: 'Message 2' },
          ],
        },
      };

      const breakdown = tokenCounter.countContextTokens(context);

      expect(breakdown.sessionContext).toBeGreaterThan(0);
    });

    it('should calculate total correctly', () => {
      const context = {
        contextFiles: [{ path: 'file.js', content: 'code' }],
        userMessage: 'help',
        sessionContext: { summary: 'summary' },
      };

      const breakdown = tokenCounter.countContextTokens(context);

      expect(breakdown.total).toBe(
        breakdown.contextFiles + breakdown.userMessage + breakdown.sessionContext
      );
    });
  });

  describe('checkContextSize', () => {
    beforeEach(() => {
      tokenCounter.initialize();
    });

    it('should return context size info', () => {
      const context = {
        contextFiles: [{ path: 'file.js', content: 'const x = 1;' }],
        userMessage: 'Test',
      };

      const result = tokenCounter.checkContextSize(context, 1000);

      expect(result.total).toBeDefined();
      expect(result.maxTokens).toBe(1000);
      expect(result.remaining).toBeDefined();
      expect(result.isOverLimit).toBeDefined();
      expect(result.percentUsed).toBeDefined();
    });

    it('should detect when over limit', () => {
      const context = {
        contextFiles: [{ path: 'file.js', content: 'x'.repeat(1000) }],
      };

      const result = tokenCounter.checkContextSize(context, 10);

      expect(result.isOverLimit).toBe(true);
    });

    it('should detect when under limit', () => {
      const context = {
        contextFiles: [{ path: 'file.js', content: 'x' }],
      };

      const result = tokenCounter.checkContextSize(context, 10000);

      expect(result.isOverLimit).toBe(false);
    });
  });

  describe('_getRecommendation', () => {
    it('should warn when over 100%', () => {
      const rec = tokenCounter._getRecommendation(150, 100);
      expect(rec).toContain('too large');
    });

    it('should suggest archiving when over 80%', () => {
      const rec = tokenCounter._getRecommendation(85, 100);
      expect(rec).toContain('archiving');
    });

    it('should be cautious when over 60%', () => {
      const rec = tokenCounter._getRecommendation(70, 100);
      expect(rec).toContain('watch');
    });

    it('should report optimal when under 60%', () => {
      const rec = tokenCounter._getRecommendation(50, 100);
      expect(rec).toContain('optimal');
    });
  });

  describe('estimateCost', () => {
    beforeEach(() => {
      tokenCounter.initialize();
    });

    it('should estimate cost', () => {
      const context = {
        contextFiles: [{ path: 'file.js', content: 'const x = 1;' }],
      };

      const pricing = {
        inputPerMToken: 3.0,
        outputPerMToken: 15.0,
      };

      const cost = tokenCounter.estimateCost(context, 'claude-3-opus', pricing, 500);

      expect(cost.inputTokens).toBeGreaterThan(0);
      expect(cost.outputTokens).toBe(500);
      expect(cost.totalCostUsd).toBeGreaterThan(0);
      expect(cost.model).toBe('claude-3-opus');
    });
  });

  describe('suggestFilesToRemove', () => {
    beforeEach(() => {
      tokenCounter.initialize();
    });

    it('should return empty array when under target', () => {
      const context = {
        contextFiles: [{ path: 'small.js', content: 'x' }],
      };

      const suggestions = tokenCounter.suggestFilesToRemove(context, 10000);

      expect(suggestions).toEqual([]);
    });

    it('should suggest largest files first', () => {
      const context = {
        contextFiles: [
          { path: 'small.js', content: 'x' },
          { path: 'large.js', content: 'x'.repeat(1000) },
          { path: 'medium.js', content: 'x'.repeat(100) },
        ],
      };

      const suggestions = tokenCounter.suggestFilesToRemove(context, 10);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].path).toBe('large.js');
    });
  });

  describe('close', () => {
    it('should free encoder', () => {
      tokenCounter.initialize();
      tokenCounter.close();
      expect(tokenCounter.encoder).toBeNull();
    });

    it('should handle double close', () => {
      tokenCounter.initialize();
      tokenCounter.close();
      expect(() => tokenCounter.close()).not.toThrow();
    });
  });
});
