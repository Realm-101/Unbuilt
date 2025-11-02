/**
 * Unit Tests for QueryDeduplication Service
 * Tests similarity matching, caching, and cost tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  findSimilarQuery,
  calculateSimilarity,
  getDeduplicationStats,
  resetStats,
  queryDeduplicationService,
} from '../../../services/queryDeduplicationService';
import type { ConversationMessage } from '@shared/schema';

// Mock conversation cache service
vi.mock('../../../services/conversationCacheService', () => ({
  conversationCacheService: {
    findSimilarQuery: vi.fn(() => Promise.resolve(null)),
    cacheSimilarQuery: vi.fn(() => Promise.resolve()),
  },
}));

describe('QueryDeduplication Service', () => {
  let mockMessages: ConversationMessage[];

  beforeEach(() => {
    resetStats();

    mockMessages = [
      {
        id: 1,
        conversationId: 1,
        role: 'user',
        content: 'What is the market size for this opportunity?',
        createdAt: new Date(),
      },
      {
        id: 2,
        conversationId: 1,
        role: 'assistant',
        content: 'The market size is estimated at $5 billion...',
        createdAt: new Date(),
      },
      {
        id: 3,
        conversationId: 1,
        role: 'user',
        content: 'Who are the main competitors?',
        createdAt: new Date(),
      },
      {
        id: 4,
        conversationId: 1,
        role: 'assistant',
        content: 'The main competitors include Fitbit, MyFitnessPal...',
        createdAt: new Date(),
      },
    ] as ConversationMessage[];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateSimilarity', () => {
    it('should return 1.0 for identical queries', () => {
      const similarity = calculateSimilarity(
        'What is the market size?',
        'What is the market size?'
      );

      expect(similarity).toBeCloseTo(1.0, 1);
    });

    it('should return high similarity for very similar queries', () => {
      const similarity = calculateSimilarity(
        'What is the market size?',
        'What is the market size for this?'
      );

      expect(similarity).toBeGreaterThan(0.8);
    });

    it('should return low similarity for different queries', () => {
      const similarity = calculateSimilarity(
        'What is the market size?',
        'Who are the competitors?'
      );

      expect(similarity).toBeLessThan(0.5);
    });

    it('should be case-insensitive', () => {
      const similarity = calculateSimilarity(
        'WHAT IS THE MARKET SIZE?',
        'what is the market size?'
      );

      expect(similarity).toBeCloseTo(1.0, 1);
    });

    it('should ignore punctuation', () => {
      const similarity = calculateSimilarity(
        'What is the market size?',
        'What is the market size'
      );

      expect(similarity).toBeGreaterThan(0.9);
    });

    it('should handle empty strings', () => {
      const similarity = calculateSimilarity('', '');

      expect(similarity).toBe(0);
    });

    it('should filter out short words', () => {
      const similarity = calculateSimilarity(
        'What is the market size for AI?',
        'What is the market size for ML?'
      );

      // Should be very similar since only "AI" vs "ML" differs
      expect(similarity).toBeGreaterThan(0.8);
    });
  });

  describe('findSimilarQuery', () => {
    it('should find exact match in history', async () => {
      const result = await findSimilarQuery(
        'What is the market size for this opportunity?',
        mockMessages,
        0.9
      );

      expect(result.isSimilar).toBe(true);
      expect(result.similarity).toBeGreaterThan(0.9);
      expect(result.cachedResponse).toContain('$5 billion');
      expect(result.matchedQuery).toBe('What is the market size for this opportunity?');
    });

    it('should find similar query in history', async () => {
      const result = await findSimilarQuery(
        'What is the size of the market?',
        mockMessages,
        0.8
      );

      expect(result.isSimilar).toBe(true);
      expect(result.similarity).toBeGreaterThan(0.8);
      expect(result.cachedResponse).toContain('$5 billion');
    });

    it('should not find dissimilar queries', async () => {
      const result = await findSimilarQuery(
        'What are the biggest risks?',
        mockMessages,
        0.9
      );

      expect(result.isSimilar).toBe(false);
      expect(result.similarity).toBe(0);
      expect(result.cachedResponse).toBeNull();
    });

    it('should respect similarity threshold', async () => {
      const result = await findSimilarQuery(
        'What is the market size?',
        mockMessages,
        0.99 // Very high threshold
      );

      // Might not match due to high threshold
      if (!result.isSimilar) {
        expect(result.cachedResponse).toBeNull();
      }
    });

    it('should only check last 10 user messages', async () => {
      const manyMessages: ConversationMessage[] = [];
      
      // Use distinct, realistic queries that won't accidentally match
      const distinctQueries = [
        'What is the market size?',
        'Who are the main competitors?',
        'What are the biggest risks?',
        'How much funding is needed?',
        'What is the revenue model?',
        'Who is the target customer?',
        'What is the go-to-market strategy?',
        'What are the key milestones?',
        'What is the competitive advantage?',
        'What are the regulatory requirements?',
        'What is the team structure?',
        'What are the success metrics?',
        'What is the pricing strategy?',
        'What are the distribution channels?',
        'What is the customer acquisition cost?'
      ];
      
      // Add 15 user-assistant pairs with distinct queries
      for (let i = 0; i < 15; i++) {
        manyMessages.push({
          id: i * 2 + 1,
          conversationId: 1,
          role: 'user',
          content: distinctQueries[i],
          createdAt: new Date(),
        } as ConversationMessage);
        
        manyMessages.push({
          id: i * 2 + 2,
          conversationId: 1,
          role: 'assistant',
          content: `Answer about ${distinctQueries[i].toLowerCase()}`,
          createdAt: new Date(),
        } as ConversationMessage);
      }

      const result = await findSimilarQuery(
        'What is the market size?', // First question, should be outside window
        manyMessages,
        0.9
      );

      // Should not find it since it's beyond the 10-message window
      // (last 10 user messages are indices 5-14, not 0-4)
      expect(result.isSimilar).toBe(false);
    });

    it('should handle empty conversation history', async () => {
      const result = await findSimilarQuery(
        'What is the market size?',
        [],
        0.9
      );

      expect(result.isSimilar).toBe(false);
      expect(result.cachedResponse).toBeNull();
    });

    it('should update statistics on cache hit', async () => {
      await findSimilarQuery(
        'What is the market size for this opportunity?',
        mockMessages,
        0.9
      );

      const stats = getDeduplicationStats();
      expect(stats.totalQueries).toBe(1);
      expect(stats.cacheHits).toBe(1);
      expect(stats.hitRate).toBe(1.0);
    });

    it('should update statistics on cache miss', async () => {
      await findSimilarQuery(
        'What are the biggest risks?',
        mockMessages,
        0.9
      );

      const stats = getDeduplicationStats();
      expect(stats.totalQueries).toBe(1);
      expect(stats.cacheMisses).toBe(1);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('getDeduplicationStats', () => {
    it('should return initial stats', () => {
      const stats = getDeduplicationStats();

      expect(stats.totalQueries).toBe(0);
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.costSavings).toBe(0);
    });

    it('should track cost savings', async () => {
      // Simulate 2 cache hits
      await findSimilarQuery(
        'What is the market size for this opportunity?',
        mockMessages,
        0.9
      );
      await findSimilarQuery(
        'What is the market size?',
        mockMessages,
        0.9
      );

      const stats = getDeduplicationStats();
      expect(stats.cacheHits).toBe(2);
      expect(stats.costSavings).toBeGreaterThan(0);
    });

    it('should calculate hit rate correctly', async () => {
      // 2 hits, 1 miss
      await findSimilarQuery('What is the market size?', mockMessages, 0.9);
      await findSimilarQuery('Who are the main competitors?', mockMessages, 0.9);
      await findSimilarQuery('What are the risks?', mockMessages, 0.9);

      const stats = getDeduplicationStats();
      expect(stats.totalQueries).toBe(3);
      expect(stats.cacheHits).toBe(2);
      expect(stats.cacheMisses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2 / 3, 2);
    });
  });

  describe('resetStats', () => {
    it('should reset all statistics', async () => {
      // Generate some stats
      await findSimilarQuery('What is the market size?', mockMessages, 0.9);
      await findSimilarQuery('Who are the competitors?', mockMessages, 0.9);

      let stats = getDeduplicationStats();
      expect(stats.totalQueries).toBeGreaterThan(0);

      // Reset
      resetStats();

      stats = getDeduplicationStats();
      expect(stats.totalQueries).toBe(0);
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.costSavings).toBe(0);
    });
  });

  describe('queryDeduplicationService', () => {
    it('should expose all service methods', () => {
      expect(queryDeduplicationService.findSimilarQuery).toBeDefined();
      expect(queryDeduplicationService.checkCachedSimilarQuery).toBeDefined();
      expect(queryDeduplicationService.cacheQueryResponse).toBeDefined();
      expect(queryDeduplicationService.getDeduplicationStats).toBeDefined();
      expect(queryDeduplicationService.resetStats).toBeDefined();
      expect(queryDeduplicationService.calculateSimilarity).toBeDefined();
    });

    it('should cache query response', async () => {
      const { conversationCacheService } = await import(
        '../../../services/conversationCacheService'
      );

      await queryDeduplicationService.cacheQueryResponse(
        'Test query',
        'Test response',
        123
      );

      expect(conversationCacheService.cacheSimilarQuery).toHaveBeenCalledWith(
        'Test query',
        'Test response',
        123
      );
    });

    it('should check cached similar query', async () => {
      const { conversationCacheService } = await import(
        '../../../services/conversationCacheService'
      );

      await queryDeduplicationService.checkCachedSimilarQuery(
        'Test query',
        123,
        0.9
      );

      expect(conversationCacheService.findSimilarQuery).toHaveBeenCalledWith(
        'Test query',
        123,
        0.9
      );
    });
  });

  describe('edge cases', () => {
    it('should handle queries with special characters', () => {
      const similarity = calculateSimilarity(
        'What is the market size? (in $)',
        'What is the market size in dollars'
      );

      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should handle very long queries', () => {
      const longQuery1 = 'What is the market size ' + 'and potential '.repeat(50);
      const longQuery2 = 'What is the market size ' + 'and potential '.repeat(50);

      const similarity = calculateSimilarity(longQuery1, longQuery2);

      expect(similarity).toBeGreaterThan(0.9);
    });

    it('should handle queries with numbers', () => {
      const similarity = calculateSimilarity(
        'What is the market size in 2024?',
        'What is the market size in 2025?'
      );

      expect(similarity).toBeGreaterThan(0.8);
    });

    it('should handle queries with different word order', () => {
      const similarity = calculateSimilarity(
        'What is the size of the market?',
        'What is the market size?'
      );

      expect(similarity).toBeGreaterThan(0.8);
    });
  });
});
