import { tokenEstimator } from './tokenEstimator';

/**
 * Optimization result with original and optimized content
 */
export interface OptimizationResult {
  original: string;
  optimized: string;
  originalTokens: number;
  optimizedTokens: number;
  compressionRatio: number;
}

/**
 * Cache entry for analysis context
 */
interface CacheEntry {
  content: string;
  timestamp: number;
  tokens: number;
}

/**
 * Context Optimizer Service
 * Provides optimization techniques for context window management
 */
export class ContextOptimizer {
  private analysisContextCache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 3600000; // 1 hour in milliseconds

  /**
   * Optimize analysis data by including only top gaps
   */
  optimizeAnalysisData(analysis: any, topN: number = 5): any {
    const optimized = { ...analysis };

    // Limit gaps to top N
    if (optimized.topGaps && Array.isArray(optimized.topGaps)) {
      optimized.topGaps = optimized.topGaps.slice(0, topN);
    }

    // Limit competitors to top N
    if (optimized.competitors && Array.isArray(optimized.competitors)) {
      optimized.competitors = optimized.competitors.slice(0, topN);
    }

    // Simplify action plan (keep only phase names and brief descriptions)
    if (optimized.actionPlan?.phases && Array.isArray(optimized.actionPlan.phases)) {
      optimized.actionPlan.phases = optimized.actionPlan.phases.map((phase: any) => ({
        name: phase.name,
        description: phase.description
          ? this.truncateText(phase.description, 80)
          : undefined,
      }));
    }

    return optimized;
  }

  /**
   * Smart truncation for long messages
   * Keeps beginning and end, summarizes middle
   */
  async smartTruncate(text: string, maxTokens: number): Promise<OptimizationResult> {
    const originalTokens = await tokenEstimator.estimateTokens(text);

    if (originalTokens <= maxTokens) {
      return {
        original: text,
        optimized: text,
        originalTokens,
        optimizedTokens: originalTokens,
        compressionRatio: 1,
      };
    }

    // Calculate how much to keep from beginning and end
    const targetChars = maxTokens * 4; // Approximate characters
    const keepChars = Math.floor(targetChars * 0.4); // 40% from each end

    // Extract beginning and end
    const beginning = text.substring(0, keepChars);
    const end = text.substring(text.length - keepChars);

    // Create truncated version with indicator
    const optimized = `${beginning}\n\n[... content truncated ...]\n\n${end}`;
    const optimizedTokens = await tokenEstimator.estimateTokens(optimized);

    return {
      original: text,
      optimized,
      originalTokens,
      optimizedTokens,
      compressionRatio: optimizedTokens / originalTokens,
    };
  }

  /**
   * Compress JSON data by removing unnecessary fields
   */
  compressJSON(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.compressJSON(item));
    }

    const compressed: any = {};

    // Fields to exclude (metadata, timestamps, etc.)
    const excludeFields = [
      'createdAt',
      'updatedAt',
      'metadata',
      'id',
      'userId',
      'analysisId',
    ];

    for (const [key, value] of Object.entries(data)) {
      if (!excludeFields.includes(key)) {
        compressed[key] = this.compressJSON(value);
      }
    }

    return compressed;
  }

  /**
   * Cache analysis context to avoid rebuilding
   */
  cacheAnalysisContext(analysisId: string, content: string, tokens: number): void {
    this.analysisContextCache.set(analysisId, {
      content,
      timestamp: Date.now(),
      tokens,
    });

    // Clean up old cache entries
    this.cleanupCache();
  }

  /**
   * Get cached analysis context if available and not expired
   */
  getCachedAnalysisContext(analysisId: string): CacheEntry | null {
    const entry = this.analysisContextCache.get(analysisId);

    if (!entry) {
      return null;
    }

    // Check if cache is expired
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.analysisContextCache.delete(analysisId);
      return null;
    }

    return entry;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.analysisContextCache.forEach((entry, key) => {
      if (now - entry.timestamp > this.CACHE_TTL) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => {
      this.analysisContextCache.delete(key);
    });
  }

  /**
   * Optimize text by removing redundant whitespace and formatting
   */
  optimizeWhitespace(text: string): string {
    return text
      .replace(/\n{3,}/g, '\n\n') // Replace 3+ newlines with 2
      .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
      .replace(/\n /g, '\n') // Remove leading spaces after newlines
      .trim();
  }

  /**
   * Extract key sentences from text (for summarization)
   */
  extractKeySentences(text: string, maxSentences: number = 3): string[] {
    // Split into sentences
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    if (sentences.length <= maxSentences) {
      return sentences.map((s) => s.trim());
    }

    // Simple heuristic: take first, middle, and last sentences
    const keySentences: string[] = [];

    // First sentence
    keySentences.push(sentences[0].trim());

    // Middle sentence
    if (maxSentences > 2) {
      const middleIndex = Math.floor(sentences.length / 2);
      keySentences.push(sentences[middleIndex].trim());
    }

    // Last sentence
    if (maxSentences > 1) {
      keySentences.push(sentences[sentences.length - 1].trim());
    }

    return keySentences.slice(0, maxSentences);
  }

  /**
   * Truncate text to approximate character count
   */
  private truncateText(text: string, maxChars: number): string {
    if (text.length <= maxChars) {
      return text;
    }

    return text.substring(0, maxChars - 3) + '...';
  }

  /**
   * Calculate compression statistics
   */
  async calculateCompressionStats(original: string, optimized: string) {
    const [originalTokens, optimizedTokens] = await Promise.all([
      tokenEstimator.estimateTokens(original),
      tokenEstimator.estimateTokens(optimized),
    ]);

    return {
      originalLength: original.length,
      optimizedLength: optimized.length,
      originalTokens,
      optimizedTokens,
      charCompressionRatio: optimized.length / original.length,
      tokenCompressionRatio: optimizedTokens / originalTokens,
      charsSaved: original.length - optimized.length,
      tokensSaved: originalTokens - optimizedTokens,
    };
  }

  /**
   * Optimize entire context window
   */
  async optimizeContextWindow(context: {
    systemPrompt: string;
    analysisContext: string;
    conversationHistory: string;
    currentQuery: string;
  }): Promise<{
    systemPrompt: string;
    analysisContext: string;
    conversationHistory: string;
    currentQuery: string;
    stats: {
      originalTokens: number;
      optimizedTokens: number;
      compressionRatio: number;
    };
  }> {
    // System prompt is fixed, no optimization needed
    const systemPrompt = context.systemPrompt;

    // Optimize analysis context (whitespace)
    const analysisContext = this.optimizeWhitespace(context.analysisContext);

    // Optimize conversation history (whitespace)
    const conversationHistory = this.optimizeWhitespace(context.conversationHistory);

    // Optimize current query (whitespace)
    const currentQuery = this.optimizeWhitespace(context.currentQuery);

    // Calculate token stats
    const [originalTokens, optimizedTokens] = await Promise.all([
      tokenEstimator.estimateTokensForSegments([
        context.systemPrompt,
        context.analysisContext,
        context.conversationHistory,
        context.currentQuery,
      ]),
      tokenEstimator.estimateTokensForSegments([
        systemPrompt,
        analysisContext,
        conversationHistory,
        currentQuery,
      ]),
    ]);

    return {
      systemPrompt,
      analysisContext,
      conversationHistory,
      currentQuery,
      stats: {
        originalTokens,
        optimizedTokens,
        compressionRatio: optimizedTokens / originalTokens,
      },
    };
  }

  /**
   * Clear cache (for testing or manual cleanup)
   */
  clearCache(): void {
    this.analysisContextCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.analysisContextCache.size,
      entries: Array.from(this.analysisContextCache.entries()).map(([key, entry]) => ({
        analysisId: key,
        tokens: entry.tokens,
        age: Date.now() - entry.timestamp,
      })),
    };
  }
}

// Export singleton instance
export const contextOptimizer = new ContextOptimizer();
