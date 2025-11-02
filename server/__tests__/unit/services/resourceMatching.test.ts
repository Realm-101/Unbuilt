/**
 * Unit Tests for ResourceMatchingService
 * Tests resource matching algorithm, scoring, and keyword extraction
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ResourceMatchingService } from '../../../services/resourceMatchingService';
import type { Resource } from '@shared/schema';
import type { MatchingContext } from '../../../services/resourceMatchingService';

// Mock the resource repository
vi.mock('../../../repositories/resourceRepository', () => ({
  resourceRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByIds: vi.fn(),
  },
}));

describe('ResourceMatchingService', () => {
  let service: ResourceMatchingService;
  let mockResources: Resource[];

  beforeEach(() => {
    service = new ResourceMatchingService();

    // Create mock resources
    mockResources = [
      {
        id: 1,
        title: 'Market Research Template',
        description: 'Comprehensive market research template for startups',
        url: 'https://example.com/market-research',
        resourceType: 'template',
        categoryId: 1,
        phaseRelevance: ['research', 'validation'],
        ideaTypes: ['software', 'service'],
        difficultyLevel: 'beginner',
        estimatedTimeMinutes: 60,
        isPremium: false,
        isActive: true,
        averageRating: 450, // 4.5 stars
        ratingCount: 20,
        viewCount: 500,
        bookmarkCount: 50,
        metadata: null,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Resource,
      {
        id: 2,
        title: 'MVP Development Guide',
        description: 'Step-by-step guide for building your minimum viable product',
        url: 'https://example.com/mvp-guide',
        resourceType: 'guide',
        categoryId: 2,
        phaseRelevance: ['development'],
        ideaTypes: ['software'],
        difficultyLevel: 'intermediate',
        estimatedTimeMinutes: 120,
        isPremium: false,
        isActive: true,
        averageRating: 480, // 4.8 stars
        ratingCount: 35,
        viewCount: 800,
        bookmarkCount: 75,
        metadata: null,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Resource,
      {
        id: 3,
        title: 'Pitch Deck Template',
        description: 'Professional pitch deck template for investors',
        url: 'https://example.com/pitch-deck',
        resourceType: 'template',
        categoryId: 3,
        phaseRelevance: ['validation', 'launch'],
        ideaTypes: ['software', 'physical_product', 'service'],
        difficultyLevel: 'beginner',
        estimatedTimeMinutes: 90,
        isPremium: true,
        isActive: true,
        averageRating: 490, // 4.9 stars
        ratingCount: 50,
        viewCount: 1200,
        bookmarkCount: 100,
        metadata: null,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Resource,
    ];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateRelevanceScore', () => {
    it('should calculate perfect score for exact matches', () => {
      const context: MatchingContext = {
        phase: 'research',
        ideaType: 'software',
        stepKeywords: ['market', 'research', 'template'],
        userExperience: 'beginner',
      };

      const result = service.calculateRelevanceScore(mockResources[0], context);

      expect(result.score).toBeGreaterThan(0.8);
      expect(result.scoreBreakdown.phaseMatch).toBe(1.0);
      expect(result.scoreBreakdown.ideaTypeMatch).toBe(1.0);
      expect(result.scoreBreakdown.experienceMatch).toBe(1.0);
    });

    it('should give lower score for partial matches', () => {
      const context: MatchingContext = {
        phase: 'launch',
        ideaType: 'marketplace',
        stepKeywords: ['funding', 'investors'],
        userExperience: 'advanced',
      };

      const result = service.calculateRelevanceScore(mockResources[0], context);

      expect(result.score).toBeLessThan(0.5);
      expect(result.scoreBreakdown.phaseMatch).toBe(0);
      expect(result.scoreBreakdown.ideaTypeMatch).toBe(0);
    });

    it('should handle missing context gracefully', () => {
      const context: MatchingContext = {
        phase: '',
      };

      const result = service.calculateRelevanceScore(mockResources[0], context);

      expect(result.score).toBeGreaterThan(0);
      expect(result.scoreBreakdown.phaseMatch).toBe(0.5); // Neutral
      expect(result.scoreBreakdown.ideaTypeMatch).toBe(0.5); // Neutral
    });

    it('should boost score for popular resources', () => {
      const context: MatchingContext = {
        phase: 'validation',
        ideaType: 'software',
      };

      const result = service.calculateRelevanceScore(mockResources[2], context);

      // High rating and views should boost popularity score
      expect(result.scoreBreakdown.popularityBoost).toBeGreaterThan(0.8);
    });

    it('should give adjacent phase partial credit', () => {
      const context: MatchingContext = {
        phase: 'validation',
      };

      // Resource is relevant to 'research' and 'validation'
      const result = service.calculateRelevanceScore(mockResources[0], context);

      expect(result.scoreBreakdown.phaseMatch).toBe(1.0); // Exact match
    });

    it('should calculate keyword similarity correctly', () => {
      const context: MatchingContext = {
        phase: 'research',
        stepKeywords: ['market', 'research', 'analysis'],
      };

      const result = service.calculateRelevanceScore(mockResources[0], context);

      // Should have high keyword similarity
      expect(result.scoreBreakdown.keywordSimilarity).toBeGreaterThan(0.3);
    });
  });

  describe('matchResources', () => {
    it('should return resources sorted by relevance', async () => {
      const { resourceRepository } = await import('../../../repositories/resourceRepository');
      vi.mocked(resourceRepository.findAll).mockResolvedValue({
        resources: mockResources,
        pagination: { page: 1, pageSize: 50, total: 3, totalPages: 1 },
      });

      const context: MatchingContext = {
        phase: 'research',
        ideaType: 'software',
      };

      const results = await service.matchResources(context, 3);

      expect(results).toHaveLength(3);
      expect(resourceRepository.findAll).toHaveBeenCalled();
    });

    it('should filter out premium resources for free users', async () => {
      const { resourceRepository } = await import('../../../repositories/resourceRepository');
      vi.mocked(resourceRepository.findAll).mockResolvedValue({
        resources: mockResources,
        pagination: { page: 1, pageSize: 50, total: 3, totalPages: 1 },
      });

      const context: MatchingContext = {
        phase: 'validation',
        userTier: 'free',
      };

      await service.matchResources(context, 3);

      // Should have called findAll with isPremium: false filter
      expect(resourceRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ isPremium: false }),
        expect.any(Object)
      );
    });

    it('should exclude previously viewed resources', async () => {
      const { resourceRepository } = await import('../../../repositories/resourceRepository');
      vi.mocked(resourceRepository.findAll).mockResolvedValue({
        resources: mockResources,
        pagination: { page: 1, pageSize: 50, total: 3, totalPages: 1 },
      });

      const context: MatchingContext = {
        phase: 'research',
        previouslyViewed: [1, 2],
      };

      const results = await service.matchResources(context, 3);

      // Should only return resource 3
      expect(results.every(r => ![1, 2].includes(r.id))).toBe(true);
    });

    it('should limit results to requested amount', async () => {
      const { resourceRepository } = await import('../../../repositories/resourceRepository');
      vi.mocked(resourceRepository.findAll).mockResolvedValue({
        resources: mockResources,
        pagination: { page: 1, pageSize: 50, total: 3, totalPages: 1 },
      });

      const context: MatchingContext = {
        phase: 'research',
      };

      const results = await service.matchResources(context, 2);

      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('matchResourcesToStep', () => {
    it('should extract keywords and match resources', async () => {
      const { resourceRepository } = await import('../../../repositories/resourceRepository');
      vi.mocked(resourceRepository.findAll).mockResolvedValue({
        resources: mockResources,
        pagination: { page: 1, pageSize: 50, total: 3, totalPages: 1 },
      });

      const results = await service.matchResourcesToStep(
        'step-1',
        'Conduct market research to validate demand',
        'research',
        'software',
        3
      );

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(resourceRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('getPhaseResources', () => {
    it('should get resources for a specific phase', async () => {
      const { resourceRepository } = await import('../../../repositories/resourceRepository');
      vi.mocked(resourceRepository.findAll).mockResolvedValue({
        resources: mockResources,
        pagination: { page: 1, pageSize: 50, total: 3, totalPages: 1 },
      });

      const results = await service.getPhaseResources('research', 'software', 'free', 10);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('getSimilarResources', () => {
    it('should find similar resources based on reference', async () => {
      const { resourceRepository } = await import('../../../repositories/resourceRepository');
      vi.mocked(resourceRepository.findById).mockResolvedValue(mockResources[0]);
      vi.mocked(resourceRepository.findAll).mockResolvedValue({
        resources: mockResources,
        pagination: { page: 1, pageSize: 50, total: 3, totalPages: 1 },
      });

      const results = await service.getSimilarResources(1, 5);

      expect(results).toBeDefined();
      expect(resourceRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should return empty array for non-existent resource', async () => {
      const { resourceRepository } = await import('../../../repositories/resourceRepository');
      vi.mocked(resourceRepository.findById).mockResolvedValue(null);

      const results = await service.getSimilarResources(999, 5);

      expect(results).toEqual([]);
    });
  });

  describe('keyword extraction', () => {
    it('should extract meaningful keywords', () => {
      const text = 'Conduct comprehensive market research and competitive analysis';
      const keywords = (service as any).extractKeywords(text);

      expect(keywords).toContain('conduct');
      expect(keywords).toContain('comprehensive');
      expect(keywords).toContain('market');
      expect(keywords).toContain('research');
      expect(keywords).toContain('competitive');
      expect(keywords).toContain('analysis');
    });

    it('should filter out stop words', () => {
      const text = 'This is a test with the and for';
      const keywords = (service as any).extractKeywords(text);

      expect(keywords).not.toContain('this');
      expect(keywords).not.toContain('is');
      expect(keywords).not.toContain('a');
      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('and');
      expect(keywords).not.toContain('for');
    });

    it('should remove duplicates', () => {
      const text = 'market market research research';
      const keywords = (service as any).extractKeywords(text);

      expect(keywords.filter(k => k === 'market').length).toBe(1);
      expect(keywords.filter(k => k === 'research').length).toBe(1);
    });

    it('should filter short words', () => {
      const text = 'a ab abc abcd';
      const keywords = (service as any).extractKeywords(text);

      expect(keywords).not.toContain('a');
      expect(keywords).not.toContain('ab');
      expect(keywords).toContain('abc');
      expect(keywords).toContain('abcd');
    });
  });

  describe('scoring components', () => {
    it('should calculate phase match correctly', () => {
      const resource = mockResources[0];
      
      // Exact match
      let context: MatchingContext = { phase: 'research' };
      let score = (service as any).calculatePhaseMatch(resource, context);
      expect(score).toBe(1.0);

      // Adjacent phase
      context = { phase: 'development' };
      score = (service as any).calculatePhaseMatch(resource, context);
      expect(score).toBe(0.5);

      // No match
      context = { phase: 'launch' };
      score = (service as any).calculatePhaseMatch(resource, context);
      expect(score).toBe(0);
    });

    it('should calculate idea type match correctly', () => {
      const resource = mockResources[0];
      
      // Exact match
      let context: MatchingContext = { ideaType: 'software' };
      let score = (service as any).calculateIdeaTypeMatch(resource, context);
      expect(score).toBe(1.0);

      // No match
      context = { ideaType: 'marketplace' };
      score = (service as any).calculateIdeaTypeMatch(resource, context);
      expect(score).toBe(0);
    });

    it('should calculate experience match correctly', () => {
      const resource = mockResources[0];
      
      // Exact match
      let context: MatchingContext = { userExperience: 'beginner' };
      let score = (service as any).calculateExperienceMatch(resource, context);
      expect(score).toBe(1.0);

      // Adjacent level
      context = { userExperience: 'intermediate' };
      score = (service as any).calculateExperienceMatch(resource, context);
      expect(score).toBe(0.6);

      // Two levels apart
      context = { userExperience: 'advanced' };
      score = (service as any).calculateExperienceMatch(resource, context);
      expect(score).toBe(0.2);
    });

    it('should calculate popularity boost correctly', () => {
      // High rating, high views
      let score = (service as any).calculatePopularityBoost(mockResources[2]);
      expect(score).toBeGreaterThan(0.8);

      // Lower rating, lower views
      score = (service as any).calculatePopularityBoost(mockResources[0]);
      expect(score).toBeGreaterThan(0.5);
      expect(score).toBeLessThan(0.8);
    });
  });
});
