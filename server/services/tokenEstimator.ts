import { Tiktoken, encoding_for_model } from 'tiktoken';

/**
 * Token Estimator Service
 * Provides accurate token counting for AI models using tiktoken
 */
export class TokenEstimator {
  private encoder: Tiktoken | null = null;
  private readonly modelName = 'gpt-4'; // Use GPT-4 encoding as proxy for Gemini

  /**
   * Initialize the token encoder
   */
  private async initializeEncoder(): Promise<void> {
    if (!this.encoder) {
      try {
        // Use GPT-4 encoding as it's similar to Gemini's tokenization
        this.encoder = encoding_for_model('gpt-4');
      } catch (error) {
        console.error('Failed to initialize tiktoken encoder:', error);
        // Fallback to null, will use approximation
        this.encoder = null;
      }
    }
  }

  /**
   * Estimate tokens for a given text
   * Uses tiktoken for accurate counting, falls back to approximation if unavailable
   */
  async estimateTokens(text: string): Promise<number> {
    if (!text) {
      return 0;
    }

    try {
      await this.initializeEncoder();

      if (this.encoder) {
        // Use tiktoken for accurate token counting
        const tokens = this.encoder.encode(text);
        return tokens.length;
      }
    } catch (error) {
      console.warn('Tiktoken encoding failed, using approximation:', error);
    }

    // Fallback to approximation (1 token ≈ 4 characters)
    return this.approximateTokens(text);
  }

  /**
   * Estimate tokens for multiple text segments
   */
  async estimateTokensForSegments(segments: string[]): Promise<number> {
    const counts = await Promise.all(segments.map((s) => this.estimateTokens(s)));
    return counts.reduce((sum, count) => sum + count, 0);
  }

  /**
   * Approximate token count using character-based heuristic
   * Used as fallback when tiktoken is unavailable
   */
  private approximateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    // This is a simplified approach but works reasonably well
    return Math.ceil(text.length / 4);
  }

  /**
   * Validate if text fits within token budget
   */
  async validateBudget(text: string, maxTokens: number): Promise<boolean> {
    const tokens = await this.estimateTokens(text);
    return tokens <= maxTokens;
  }

  /**
   * Validate if multiple segments fit within token budget
   */
  async validateBudgetForSegments(
    segments: string[],
    maxTokens: number
  ): Promise<boolean> {
    const totalTokens = await this.estimateTokensForSegments(segments);
    return totalTokens <= maxTokens;
  }

  /**
   * Get token breakdown for context components
   */
  async getTokenBreakdown(components: {
    systemPrompt: string;
    analysisContext: string;
    conversationHistory: string;
    currentQuery: string;
  }): Promise<{
    systemPrompt: number;
    analysisContext: number;
    conversationHistory: number;
    currentQuery: number;
    total: number;
  }> {
    const [systemPrompt, analysisContext, conversationHistory, currentQuery] =
      await Promise.all([
        this.estimateTokens(components.systemPrompt),
        this.estimateTokens(components.analysisContext),
        this.estimateTokens(components.conversationHistory),
        this.estimateTokens(components.currentQuery),
      ]);

    return {
      systemPrompt,
      analysisContext,
      conversationHistory,
      currentQuery,
      total: systemPrompt + analysisContext + conversationHistory + currentQuery,
    };
  }

  /**
   * Calculate remaining tokens for response
   */
  async calculateRemainingTokens(
    contextTokens: number,
    maxContextTokens: number
  ): Promise<number> {
    return Math.max(0, maxContextTokens - contextTokens);
  }

  /**
   * Cleanup encoder resources
   */
  cleanup(): void {
    if (this.encoder) {
      this.encoder.free();
      this.encoder = null;
    }
  }
}

// Export singleton instance
export const tokenEstimator = new TokenEstimator();

// Cleanup on process exit
process.on('exit', () => {
  tokenEstimator.cleanup();
});
