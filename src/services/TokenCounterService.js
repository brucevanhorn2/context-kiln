const { encoding_for_model } = require('tiktoken');

/**
 * TokenCounterService - Estimate token counts for context
 *
 * Uses tiktoken library (OpenAI's tokenizer) as a close approximation
 * for all models. Anthropic uses a different tokenizer but similar counts.
 *
 * Purpose:
 * - Warn users before sending context that's too large
 * - Track estimated vs actual token usage
 * - Help manage context window efficiently
 *
 * Note: Always trust the actual token counts from API responses.
 * These are estimates to prevent errors before sending.
 */
class TokenCounterService {
  constructor() {
    this.encoder = null;
    this.fallbackMultiplier = 0.25; // Rough estimate: 1 token ≈ 4 characters
  }

  /**
   * Initialize tokenizer
   * Using cl100k_base encoding (GPT-4, GPT-3.5-turbo)
   */
  initialize() {
    try {
      // cl100k_base is used by GPT-4 and GPT-3.5-turbo
      // It's also a good approximation for Claude
      this.encoder = encoding_for_model('gpt-4');
    } catch (error) {
      console.warn('Failed to initialize tiktoken, falling back to character-based estimation:', error);
      this.encoder = null;
    }
  }

  /**
   * Count tokens in text
   *
   * @param {string} text - Text to count
   * @returns {number} Token count
   */
  countTokens(text) {
    if (!text || text.length === 0) {
      return 0;
    }

    if (this.encoder) {
      try {
        const tokens = this.encoder.encode(text);
        return tokens.length;
      } catch (error) {
        console.warn('Token encoding failed, using fallback:', error);
        return this._fallbackCount(text);
      }
    }

    return this._fallbackCount(text);
  }

  /**
   * Fallback token counting (character-based estimation)
   *
   * @param {string} text - Text to count
   * @returns {number} Estimated token count
   * @private
   */
  _fallbackCount(text) {
    // Rough estimate: 1 token ≈ 4 characters for English text
    // For code, it might be slightly different
    return Math.ceil(text.length * this.fallbackMultiplier);
  }

  /**
   * Count tokens for internal context object
   *
   * @param {object} internalContext - Internal context format
   * @returns {object} Token breakdown
   */
  countContextTokens(internalContext) {
    const breakdown = {
      contextFiles: 0,
      userMessage: 0,
      sessionContext: 0,
      total: 0,
    };

    // Count context files
    if (internalContext.contextFiles && internalContext.contextFiles.length > 0) {
      for (const file of internalContext.contextFiles) {
        const fileTokens = this.countTokens(file.content);
        breakdown.contextFiles += fileTokens;

        // Add overhead for formatting (markdown headers, code blocks, etc.)
        // Approximately 50-100 tokens per file for formatting
        breakdown.contextFiles += 75;
      }
    }

    // Count user message
    if (internalContext.userMessage) {
      breakdown.userMessage = this.countTokens(internalContext.userMessage);
    }

    // Count session context
    if (internalContext.sessionContext) {
      if (internalContext.sessionContext.summary) {
        breakdown.sessionContext += this.countTokens(internalContext.sessionContext.summary);
      }

      if (internalContext.sessionContext.previousMessages) {
        for (const msg of internalContext.sessionContext.previousMessages) {
          if (msg.content) {
            breakdown.sessionContext += this.countTokens(msg.content);
          }
        }
      }
    }

    // Calculate total
    breakdown.total = breakdown.contextFiles + breakdown.userMessage + breakdown.sessionContext;

    return breakdown;
  }

  /**
   * Check if context exceeds limit
   *
   * @param {object} internalContext - Internal context format
   * @param {number} maxTokens - Maximum allowed tokens (default: 150000)
   * @returns {object} Check result
   */
  checkContextSize(internalContext, maxTokens = 150000) {
    const breakdown = this.countContextTokens(internalContext);

    return {
      ...breakdown,
      maxTokens,
      remaining: maxTokens - breakdown.total,
      isOverLimit: breakdown.total > maxTokens,
      percentUsed: (breakdown.total / maxTokens) * 100,
      recommendation: this._getRecommendation(breakdown.total, maxTokens),
    };
  }

  /**
   * Get recommendation based on token usage
   *
   * @param {number} currentTokens - Current token count
   * @param {number} maxTokens - Maximum tokens
   * @returns {string} Recommendation message
   * @private
   */
  _getRecommendation(currentTokens, maxTokens) {
    const percentUsed = (currentTokens / maxTokens) * 100;

    if (percentUsed > 100) {
      return 'Context is too large. Remove some files or archive old messages.';
    } else if (percentUsed > 80) {
      return 'Context is very large. Consider archiving old messages.';
    } else if (percentUsed > 60) {
      return 'Context size is good, but watch for large additions.';
    } else {
      return 'Context size is optimal.';
    }
  }

  /**
   * Estimate cost for context
   *
   * @param {object} internalContext - Internal context format
   * @param {string} model - Model to use
   * @param {object} modelPricing - Model pricing info
   * @param {number} modelPricing.inputPerMToken - Input cost per million tokens
   * @param {number} estimatedOutputTokens - Expected output tokens (default: 1000)
   * @returns {object} Cost estimate
   */
  estimateCost(internalContext, model, modelPricing, estimatedOutputTokens = 1000) {
    const breakdown = this.countContextTokens(internalContext);

    const inputCost = (breakdown.total / 1000000) * modelPricing.inputPerMToken;
    const outputCost = (estimatedOutputTokens / 1000000) * modelPricing.outputPerMToken;

    return {
      inputTokens: breakdown.total,
      outputTokens: estimatedOutputTokens,
      inputCostUsd: inputCost,
      outputCostUsd: outputCost,
      totalCostUsd: inputCost + outputCost,
      model,
    };
  }

  /**
   * Suggest files to remove if context is too large
   *
   * @param {object} internalContext - Internal context format
   * @param {number} targetTokens - Target token count
   * @returns {Array<string>} Array of file paths to consider removing
   */
  suggestFilesToRemove(internalContext, targetTokens) {
    const current = this.countContextTokens(internalContext);

    if (current.total <= targetTokens) {
      return []; // Already under target
    }

    const tokensToRemove = current.total - targetTokens;

    // Sort files by token count (largest first)
    const filesWithTokens = internalContext.contextFiles.map(file => ({
      path: file.path,
      tokens: this.countTokens(file.content),
    })).sort((a, b) => b.tokens - a.tokens);

    // Find minimum set of files to remove
    const suggestions = [];
    let removedTokens = 0;

    for (const file of filesWithTokens) {
      if (removedTokens >= tokensToRemove) {
        break;
      }

      suggestions.push({
        path: file.path,
        tokens: file.tokens,
        reason: 'Large file',
      });

      removedTokens += file.tokens;
    }

    return suggestions;
  }

  /**
   * Close encoder (cleanup)
   */
  close() {
    if (this.encoder) {
      this.encoder.free();
      this.encoder = null;
    }
  }
}

module.exports = TokenCounterService;
