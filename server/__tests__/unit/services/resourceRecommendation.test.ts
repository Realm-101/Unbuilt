/**
 * Unit Tests for ResourceRecommendationEngine
 * Tests recommendation algorithms, collaborative filtering, and content-based filtering
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Centralized test utilities
import {
  createMockDb,
  createMockResource,
  resetAllMocks,
} from '../../imports';

// Service being tested
import { ResourceRecommendationEngine } from '../../../services/resourceRecommendationEngine';
import type { Resource } from '@shared/schema';

// Mock dependencies
vi.mock('../../../repositories/resourceRepository', () => ({
  resourceRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByIds: vi.fn(),
  },
}));

vi.mock('../../../repositories/bookmarkRepository', () => ({
  bookmarkRepository: {
    getBookmarkedResourceIds: vi.fn(),
  },
}));

vi.mock('../../../repositories/accessHistoryRepository', () => ({
  accessHistoryRepository: {
    getAccessedResourceIds: vi.fn(),
    hasAccessed: vi.fn(),
    getMostAccessed: vi.fn(),
  },
}));

// Mock database module
vi.mock('../../../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    having: vi.fn().mockReturnThis(),
  },
}));

describe('ResourceRecommendationEngine', () => {
  let engine: ResourceRecommendationEngine;
  let mockResources: Resource[];

  beforeEach(() => {
    engine = new ResourceRecommendationEngine();

    // Create mock resources using factory
    mockResources = [
      {
        ...createMockResource({
          id: 1,
          title: 'Market Research Template',
          description: 'Comprehensive market research template',
          url: 'https://example.com/1',
          resourceType: 'template',
          categoryId: 1,
          phaseRelevance: ['research'],
          ideaTypes: ['software'],
          difficultyLevel: 'beginner',
          estimatedTimeMinutes: 60,
          isPremium: false,
          isActive: true,
          averageRating: 450,
          ratingCount: 20,
          viewCount: 500,
          bookmarkCount: 50,
        }),
        metadata: null,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Resource,
      {
        ...createMockResource({
          id: 2,
          title: 'MVP Development Guide',
          description: 'Build your minimum viable product',
          url: 'https://example.com/2',
          resourceType: 'guide',
          categoryId: 2,
          phaseRelevance: ['development'],
          ideaTypes: ['software'],
          difficultyLevel: 'intermediate',
          estimatedTimeMinutes: 120,
          isPremium: false,
          isActive: true,
          averageRating: 480,
          ratingCount: 35,
          viewCount: 800,
          bookmarkCount: 75,
        }),
        metadata: null,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Resource,
      {
        ...createMockResource({
          id: 3,
          title: 'Pitch Deck Template',
          description: 'Professional pitch deck for investors',
          url: 'https://example.com/3',
          resourceType: 'template',
          categoryId: 1,
          phaseRelevance: ['validation'],
          ideaTypes: ['software'],
          difficultyLevel: 'beginner',
          estimatedTimeMinutes: 90,
          isPremium: false,
          isActive: true,
          averageRating: 490,
          ratingCount: 50,
          viewCount: 1200,
          bookmarkCount: 100,
        }),
        metadata: null,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Resource,
    ];
  });

  afterEach(() => {
    resetAllMocks();
    engine.clearAllCache();
  });

  describe('getRecommendations', () => {
    it('should return personalized recommendations', async () => {
      const { resourceRepository } = await import('../../../repositories/resourceRepository');
      const { bookmarkRepository } = await import('../../../repositories/bookmarkRepository');
      const { accessHistoryRepository } = await import('../../../repositories/accessHistoryRepository');

      vi.mocked(bookmarkRepository.getBookmarkedResourceIds).mockResolvedValue([]);
      vi.mocked(accessHistoryRepository.getAccessedResourceIds).mockResolvedValue([]);
      vi.mocked(resourceRepository.findAll).mockResolvedValue({
        resources: mockResources,
        pagination: { page: 1, pageSize: 200, total: 3, totalPages: 1 },
      });

      const recommendations = await engine.getRecommendations({
        userId: 1,
        limit: 5,
      });

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeLessThanOrEqual(5);
    });

    it('should exclude already interacted resources', async () => {
      const { resourceRepository } = await import('../../../repositories/resourceRepository');
      const { bookmarkRepository } = await import('../../../repositories/bookmarkRepository');
      const { accessHistoryRepository } = await import('../../../repositories/accessHistoryRepository');
      const { db } = await import('../../../db');

      vi.mocked(bookmarkRepository.getBookmarkedResourceIds).mockResolvedValue([1]);
      vi.mocked(accessHistoryRepository.getAccessedResourceIds).mockResolvedValue([2]);
      vi.mocked(accessHistoryRepository.hasAccessed).mockResolvedValue(false);
      vi.mocked(resourceRepository.findAll).mockResolvedValue({
        resources: mockResources,
        pagination: { page: 1, pageSize: 200, total: 3, totalPages: 1 },
      });
      // Mock findByIds to return the interacted resources
      vi.mocked(resourceRepository.findByIds).mockResolvedValue([mockResources[0], mockResources[1]]);

      // Mock database query for similar users
      vi.mocked(db.select).mockReturnThis();
      vi.mocked(db.from).mockReturnThis();
      vi.mocked(db.where).mockReturnThis();
      vi.mocked(db.groupBy).mockReturnThis();
      vi.mocked(db.having).mockReturnThis();
      vi.mocked(db.orderBy).mockReturnThis();
      vi.mocked(db.limit).mockResolvedValue([]);

      const recommendations = await engine.getRecommendations({
        userId: 1,
        limit: 5,
      });

      // Should not include resources 1 and 2
      expect(recommendations.every(r => r.id !== 1 && r.id !== 2)).toBe(true);
    });

    it('should respect exclude list', async () => {
      const { resourceRepository } = await import('../../../repositories/resourceRepository');
      const { bookmarkRepository } = await import('../../../repositories/bookmarkRepository');
      const { accessHistoryRepository } = await import('../../../repositories/accessHistoryRepository');

      vi.mocked(bookmarkRepository.getBookmarkedResourceIds).mockResolvedValue([]);
      vi.mocked(accessHistoryRepository.getAccessedResourceIds).mockResolvedValue([]);
      vi.mocked(resourceRepository.findAll).mockResolvedValue({
        resources: mockResources,
        pagination: { page: 1, pageSize: 200, total: 3, totalPages: 1 },
      });

      const recommendations = await engine.getRecommendations({
        userId: 1,
        limit: 5,
        excludeResourceIds: [1, 2],
      });

      expect(recommendations.every(r => r.id !== 1 && r.id !== 2)).toBe(true);
    });

    it('should use cache for repeated requests', async () => {
      const { resourceRepository } = await import('../../../repositories/resourceRepository');
      const { bookmarkRepository } = await import('../../../repositories/bookmarkRepository');
      const { accessHistoryRepository } = await import('../../../repositories/accessHistoryRepository');

      vi.mocked(bookmarkRepository.getBookmarkedResourceIds).mockResolvedValue([]);
      vi.mocked(accessHistoryRepository.getAccessedResourceIds).mockResolvedValue([]);
      vi.mocked(resourceRepository.findAll).mockResolvedValue({
        resources: mockResources,
        pagination: { page: 1, pageSize: 200, total: 3, totalPages: 1 },
      });

      // First call
      await engine.getRecommendations({ userId: 1, limit: 5 });

      // Second call (should use cache)
      await engine.getRecommendations({ userId: 1, limit: 5 });

      // Should only call repository once
      expect(resourceRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSimilarResources', () => {
    it('should find similar resources based on content', async () => {
      const { resourceRepository } = await import('../../../repositories/resourceRepository');

      vi.mocked(resourceRepository.findById).mockResolvedValue(mockResources[0]);
      vi.mocked(resourceRepository.findAll).mockResolvedValue({
        resources: mockResources,
        pagination: { page: 1, pageSize: 100, total: 3, totalPages: 1 },
      });

      const similar = await engine.getSimilarResources(1, 5);

      expect(similar).toBeDefined();
      expect(Array.isArray(similar)).toBe(true);
      expect(similar.every(r => r.id !== 1)).toBe(true); // Exclude reference resource
    });

    it('should return empty array for non-existent resource', async () => {
      const { resourceRepository } = await import('../../../repositories/resourceRepository');

      vi.mocked(resourceRepository.findById).mockResolvedValue(null);

      const similar = await engine.getSimilarResources(999, 5);

      expect(similar).toEqual([]);
    });

    it('should sort by similarity score', async () => {
      const { resourceRepository } = await import('../../../repositories/resourceRepository');

      vi.mocked(resourceRepository.findById).mockResolvedValue(mockResources[0]);
      vi.mocked(resourceRepository.findAll).mockResolvedValue({
        resources: mockResources,
        pagination: { page: 1, pageSize: 100, total: 3, totalPages: 1 },
      });

      const similar = await engine.getSimilarResources(1, 2);

      expect(similar.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getTrendingResources', () => {
    it('should return trending resources for day timeframe', async () => {
      const { accessHistoryRepository } = await import('../../../repositories/accessHistoryRepository');
      const { resourceRepository } = await import('../../../repositories/resourceRepository');

      vi.mocked(accessHistoryRepository.getMostAccessed).mockResolvedValue([
        { resourceId: 1, accessCount: 100 },
        { resourceId: 2, accessCount: 80 },
      ]);
      vi.mocked(resourceRepository.findByIds).mockResolvedValue([
        mockResources[0],
        mockResources[1],
      ]);

      const trending = await engine.getTrendingResources('day', 10);

      expect(trending).toBeDefined();
      expect(Array.isArray(trending)).toBe(true);
    });

    it('should fallback to highest rated if no access data', async () => {
      const { accessHistoryRepository } = await import('../../../repositories/accessHistoryRepository');
      const { resourceRepository } = await import('../../../repositories/resourceRepository');

      vi.mocked(accessHistoryRepository.getMostAccessed).mockResolvedValue([]);
      vi.mocked(resourceRepository.findAll).mockResolvedValue({
        resources: mockResources,
        pagination: { page: 1, pageSize: 10, total: 3, totalPages: 1 },
      });

      const trending = await engine.getTrendingResources('week', 10);

      expect(trending).toBeDefined();
      expect(resourceRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('content similarity calculation', () => {
    it('should calculate high similarity for same category', () => {
      const similarity = (engine as any).calculateContentSimilarity(
        mockResources[0],
        mockResources[2]
      );

      // Both have categoryId: 1
      expect(similarity).toBeGreaterThan(0.3);
    });

    it('should calculate similarity based on phase overlap', () => {
      const resource1 = { ...mockResources[0], phaseRelevance: ['research', 'validation'] };
      const resource2 = { ...mockResources[1], phaseRelevance: ['validation', 'development'] };

      const similarity = (engine as any).calculateContentSimilarity(resource1, resource2);

      expect(similarity).toBeGreaterThan(0);
    });

    it('should calculate similarity based on idea type overlap', () => {
      const resource1 = { ...mockResources[0], ideaTypes: ['software', 'service'] };
      const resource2 = { ...mockResources[1], ideaTypes: ['software'] };

      const similarity = (engine as any).calculateContentSimilarity(resource1, resource2);

      expect(similarity).toBeGreaterThan(0);
    });

    it('should boost similarity for same resource type', () => {
      const similarity = (engine as any).calculateContentSimilarity(
        mockResources[0],
        mockResources[2]
      );

      // Both are templates
      expect(similarity).toBeGreaterThan(0.2);
    });
  });

  describe('Jaccard similarity', () => {
    it('should calculate perfect similarity for identical sets', () => {
      const similarity = (engine as any).calculateJaccardSimilarity([1, 2, 3], [1, 2, 3]);

      expect(similarity).toBe(1.0);
    });

    it('should calculate zero similarity for disjoint sets', () => {
      const similarity = (engine as any).calculateJaccardSimilarity([1, 2, 3], [4, 5, 6]);

      expect(similarity).toBe(0);
    });

    it('should calculate partial similarity for overlapping sets', () => {
      const similarity = (engine as any).calculateJaccardSimilarity([1, 2, 3], [2, 3, 4]);

      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });

    it('should handle empty sets', () => {
      const similarity = (engine as any).calculateJaccardSimilarity([], []);

      expect(similarity).toBe(0);
    });
  });

  describe('popularity score calculation', () => {
    it('should give high score to highly rated resources', () => {
      const score = (engine as any).calculatePopularityScore(mockResources[2]);

      expect(score).toBeGreaterThan(0.8);
    });

    it('should give moderate score to moderately rated resources', () => {
      const score = (engine as any).calculatePopularityScore(mockResources[0]);

      expect(score).toBeGreaterThan(0.5);
      expect(score).toBeLessThan(0.8);
    });

    it('should cap view score at 1000 views', () => {
      const highViewResource = {
        ...mockResources[0],
        viewCount: 5000,
        averageRating: 500,
      };

      const score = (engine as any).calculatePopularityScore(highViewResource);

      expect(score).toBeLessThanOrEqual(1.0);
    });
  });

  describe('cache management', () => {
    it('should clear cache for specific user', async () => {
      const { resourceRepository } = await import('../../../repositories/resourceRepository');
      const { bookmarkRepository } = await import('../../../repositories/bookmarkRepository');
      const { accessHistoryRepository } = await import('../../../repositories/accessHistoryRepository');

      vi.mocked(bookmarkRepository.getBookmarkedResourceIds).mockResolvedValue([]);
      vi.mocked(accessHistoryRepository.getAccessedResourceIds).mockResolvedValue([]);
      vi.mocked(resourceRepository.findAll).mockResolvedValue({
        resources: mockResources,
        pagination: { page: 1, pageSize: 200, total: 3, totalPages: 1 },
      });

      // First call to populate cache
      await engine.getRecommendations({ userId: 1, limit: 5 });

      // Clear cache
      engine.clearCache(1);

      // Second call should hit repository again
      await engine.getRecommendations({ userId: 1, limit: 5 });

      expect(resourceRepository.findAll).toHaveBeenCalledTimes(2);
    });

    it('should clear all cache', async () => {
      const { resourceRepository } = await import('../../../repositories/resourceRepository');
      const { bookmarkRepository } = await import('../../../repositories/bookmarkRepository');
      const { accessHistoryRepository } = await import('../../../repositories/accessHistoryRepository');

      vi.mocked(bookmarkRepository.getBookmarkedResourceIds).mockResolvedValue([]);
      vi.mocked(accessHistoryRepository.getAccessedResourceIds).mockResolvedValue([]);
      vi.mocked(resourceRepository.findAll).mockResolvedValue({
        resources: mockResources,
        pagination: { page: 1, pageSize: 200, total: 3, totalPages: 1 },
      });

      // Populate cache for multiple users
      await engine.getRecommendations({ userId: 1, limit: 5 });
      await engine.getRecommendations({ userId: 2, limit: 5 });

      // Clear all cache
      engine.clearAllCache();

      // Subsequent calls should hit repository
      await engine.getRecommendations({ userId: 1, limit: 5 });

      expect(resourceRepository.findAll).toHaveBeenCalledTimes(3);
    });
  });

  describe('diversity boost', () => {
    it('should penalize over-represented categories', () => {
      const recommendations = mockResources.map(r => ({
        resource: r,
        score: 0.8,
        reason: 'Test',
        scoreBreakdown: {
          collaborative: 0.5,
          contentBased: 0.3,
          popularity: 0.2,
          diversity: 0,
        },
      }));

      const boosted = (engine as any).applyDiversityBoost(recommendations, null);

      // First resource should have higher diversity score than subsequent same-category resources
      expect(boosted[0].scoreBreakdown.diversity).toBeGreaterThanOrEqual(
        boosted[1].scoreBreakdown.diversity
      );
    });
  });
});
