/**
 * Unit Tests for ContextWindowManager Service
 * Tests context building, token estimation, and history management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ContextWindowManager } from '../../../services/contextWindowManager';
import type { ConversationMessage } from '@shared/schema';
import type { AnalysisData } from '../../../services/contextWindowManager';

// Mock dependencies
vi.mock('../../../services/tokenEstimator', () => ({
  tokenEstimator: {
    estimateTokens: vi.fn((text: string) => Promise.resolve(Math.ceil(text.length / 4))),
    estimateTokensForSegments: vi.fn((segments: string[]) => {
      const total = segments.reduce((sum, s) => sum + Math.ceil(s.length / 4), 0);
      return Promise.resolve(total);
    }),
    getTokenBreakdown: vi.fn((segments: Record<string, string>) => {
      const breakdown: Record<string, number> = {};
      for (const [key, value] of Object.entries(segments)) {
        breakdown[key] = Math.ceil(value.length / 4);
      }
      return Promise.resolve(breakdown);
    }),
  },
}));

vi.mock('../../../services/historySummarizer', () => ({
  historySummarizer: {
    needsSummarization: vi.fn((messageCount: number) => messageCount > 10),
    summarizeHistory: vi.fn(async (messages: ConversationMessage[]) => ({
      summary: 'Summarized conversation history',
      recentMessages: messages.slice(-5),
    })),
    formatForContext: vi.fn((summarized: any) => {
      let formatted = summarized.summary + '\n\n';
      summarized.recentMessages.forEach((msg: ConversationMessage) => {
        formatted += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`;
      });
      return formatted;
    }),
  },
}));

vi.mock('../../../services/contextOptimizer', () => ({
  contextOptimizer: {
    optimizeAnalysisData: vi.fn((analysis: any, topN: number) => ({
      ...analysis,
      topGaps: analysis.topGaps?.slice(0, topN) || [],
    })),
    optimizeContextWindow: vi.fn(async (context: any) => context),
    getCachedAnalysisContext: vi.fn(() => null),
    cacheAnalysisContext: vi.fn(),
    getCacheStats: vi.fn(() => ({ hits: 0, misses: 0, size: 0 })),
    clearCache: vi.fn(),
  },
}));


vi.mock('../../../services/conversationCacheService', () => ({
  conversationCacheService: {
    getAnalysisContext: vi.fn(() => Promise.resolve(null)),
    cacheAnalysisContext: vi.fn(() => Promise.resolve()),
  },
}));

describe('ContextWindowManager', () => {
  let manager: ContextWindowManager;
  let mockAnalysis: AnalysisData;
  let mockMessages: ConversationMessage[];

  beforeEach(() => {
    manager = new ContextWindowManager();
    
    // Create mock analysis data
    mockAnalysis = {
      searchQuery: 'AI-powered fitness app',
      innovationScore: 85,
      feasibilityRating: 'high',
      topGaps: [
        {
          title: 'Personalized workout plans',
          description: 'AI-generated workout plans based on user goals',
          score: 90,
        },
        {
          title: 'Real-time form correction',
          description: 'Computer vision for exercise form feedback',
          score: 85,
        },
        {
          title: 'Nutrition integration',
          description: 'Meal planning integrated with workout plans',
          score: 80,
        },
      ],
      competitors: [
        { name: 'Fitbit', description: 'Fitness tracking device' },
        { name: 'MyFitnessPal', description: 'Calorie tracking app' },
      ],
      actionPlan: {
        phases: [
          { name: 'MVP Development', description: 'Build core features' },
          { name: 'Beta Testing', description: 'Test with early users' },
        ],
      },
    };

    // Create mock conversation messages
    mockMessages = [
      {
        id: 1,
        conversationId: 1,
        role: 'user',
        content: 'What makes this opportunity unique?',
        createdAt: new Date(),
      },
      {
        id: 2,
        conversationId: 1,
        role: 'assistant',
        content: 'The AI-powered personalization sets it apart...',
        createdAt: new Date(),
      },
    ] as ConversationMessage[];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('buildContext', () => {
    it('should build complete context window', async () => {
      const result = await manager.buildContext(
        mockAnalysis,
        mockMessages,
        'How do I validate market demand?'
      );

      expect(result).toHaveProperty('systemPrompt');
      expect(result).toHaveProperty('analysisContext');
      expect(result).toHaveProperty('conversationHistory');
      expect(result).toHaveProperty('currentQuery');
      expect(result).toHaveProperty('totalTokens');
      
      expect(result.systemPrompt).toContain('AI advisor for Unbuilt');
      expect(result.analysisContext).toContain('AI-powered fitness app');
      expect(result.currentQuery).toBe('How do I validate market demand?');
    });

    it('should include analysis data in context', async () => {
      const result = await manager.buildContext(
        mockAnalysis,
        mockMessages,
        'Tell me more'
      );

      expect(result.analysisContext).toContain('Innovation Score: 85');
      expect(result.analysisContext).toContain('Feasibility: high');
      expect(result.analysisContext).toContain('Personalized workout plans');
    });

    it('should limit gaps to top 5', async () => {
      const manyGaps = Array.from({ length: 10 }, (_, i) => ({
        title: `Gap ${i + 1}`,
        description: `Description ${i + 1}`,
        score: 90 - i,
      }));

      const analysisWithManyGaps = {
        ...mockAnalysis,
        topGaps: manyGaps,
      };

      const result = await manager.buildContext(
        analysisWithManyGaps,
        [],
        'Test query'
      );

      // Should only include top 5 gaps
      const gapMatches = result.analysisContext.match(/Gap \d+/g);
      expect(gapMatches?.length).toBeLessThanOrEqual(5);
    });

    it('should handle empty conversation history', async () => {
      const result = await manager.buildContext(
        mockAnalysis,
        [],
        'First question'
      );

      expect(result.conversationHistory).toBe('');
      expect(result.totalTokens).toBeGreaterThan(0);
    });

    it('should truncate long queries', async () => {
      const longQuery = 'A'.repeat(3000);
      
      const result = await manager.buildContext(
        mockAnalysis,
        mockMessages,
        longQuery
      );

      // Should be truncated to fit budget (500 tokens * 4 chars = 2000 chars)
      expect(result.currentQuery.length).toBeLessThanOrEqual(2003); // +3 for ellipsis
    });

    it('should respect custom max tokens', async () => {
      const result = await manager.buildContext(
        mockAnalysis,
        mockMessages,
        'Test query',
        4000 // Half the default
      );

      expect(result.totalTokens).toBeLessThanOrEqual(4000);
    });

    it('should use cache when available', async () => {
      const { conversationCacheService } = await import('../../../services/conversationCacheService');
      const mockCached = 'Cached analysis context';
      vi.mocked(conversationCacheService.getAnalysisContext).mockResolvedValueOnce(mockCached);

      const analysisWithId = { ...mockAnalysis, id: 123 };
      const result = await manager.buildContext(
        analysisWithId,
        mockMessages,
        'Test query',
        8000,
        { useCache: true }
      );

      expect(result.analysisContext).toBe(mockCached);
      expect(conversationCacheService.getAnalysisContext).toHaveBeenCalledWith(123);
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens for text', async () => {
      const text = 'This is a test message with some words';
      const tokens = await manager.estimateTokens(text);

      // Rough estimate: 1 token ≈ 4 characters
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThanOrEqual(Math.ceil(text.length / 4) + 1);
    });

    it('should handle empty text', async () => {
      const tokens = await manager.estimateTokens('');
      expect(tokens).toBe(0);
    });
  });

  describe('validateBudget', () => {
    it('should validate context fits within budget', async () => {
      const context = {
        systemPrompt: 'System prompt',
        analysisContext: 'Analysis context',
        conversationHistory: 'History',
        currentQuery: 'Query',
        totalTokens: 500,
      };

      const isValid = await manager.validateBudget(context, 1000);
      expect(isValid).toBe(true);
    });

    it('should reject context exceeding budget', async () => {
      const context = {
        systemPrompt: 'System prompt',
        analysisContext: 'Analysis context',
        conversationHistory: 'History',
        currentQuery: 'Query',
        totalTokens: 1500,
      };

      const isValid = await manager.validateBudget(context, 1000);
      expect(isValid).toBe(false);
    });
  });

  describe('getTokenBudget', () => {
    it('should return default budget for 8000 tokens', () => {
      const budget = manager.getTokenBudget(8000);

      expect(budget.systemPrompt).toBe(200);
      expect(budget.analysisContext).toBe(2000);
      expect(budget.conversationHistory).toBe(1500);
      expect(budget.currentQuery).toBe(500);
      expect(budget.responseBuffer).toBe(3000);
    });

    it('should scale budget proportionally', () => {
      const budget = manager.getTokenBudget(4000);

      expect(budget.systemPrompt).toBe(100);
      expect(budget.analysisContext).toBe(1000);
      expect(budget.conversationHistory).toBe(750);
      expect(budget.currentQuery).toBe(250);
      expect(budget.responseBuffer).toBe(1500);
    });
  });

  describe('getTokenBreakdown', () => {
    it('should return token breakdown for context', async () => {
      const context = {
        systemPrompt: 'System prompt text',
        analysisContext: 'Analysis context text',
        conversationHistory: 'History text',
        currentQuery: 'Query text',
        totalTokens: 100,
      };

      const breakdown = await manager.getTokenBreakdown(context);

      expect(breakdown).toHaveProperty('systemPrompt');
      expect(breakdown).toHaveProperty('analysisContext');
      expect(breakdown).toHaveProperty('conversationHistory');
      expect(breakdown).toHaveProperty('currentQuery');
    });
  });

  describe('clearCache', () => {
    it('should clear optimization cache', async () => {
      const { contextOptimizer } = await import('../../../services/contextOptimizer');
      
      manager.clearCache();

      expect(contextOptimizer.clearCache).toHaveBeenCalled();
    });
  });
});
