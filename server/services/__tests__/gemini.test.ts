import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeGaps, type GapAnalysisResult } from '../gemini';

describe('Enhanced Gemini Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeGaps', () => {
    it('should return results with enhanced fields', async () => {
      const query = 'AI-powered fitness tracking';
      const results = await analyzeGaps(query);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      // Verify enhanced fields are present
      const firstResult = results[0];
      expect(firstResult).toHaveProperty('title');
      expect(firstResult).toHaveProperty('description');
      expect(firstResult).toHaveProperty('category');
      expect(firstResult).toHaveProperty('confidenceScore');
      expect(firstResult).toHaveProperty('priority');
      expect(firstResult).toHaveProperty('actionableRecommendations');
      expect(firstResult).toHaveProperty('competitorAnalysis');
      expect(firstResult).toHaveProperty('industryContext');
    });

    it('should categorize gaps into structured categories', async () => {
      const query = 'sustainable technology solutions';
      const results = await analyzeGaps(query);

      const validCategories = ['market', 'technology', 'ux', 'business_model'];
      
      results.forEach(gap => {
        expect(validCategories).toContain(gap.category);
      });
    });

    it('should provide confidence scores between 0-100', async () => {
      const query = 'healthcare innovations';
      const results = await analyzeGaps(query);

      results.forEach(gap => {
        expect(gap.confidenceScore).toBeGreaterThanOrEqual(0);
        expect(gap.confidenceScore).toBeLessThanOrEqual(100);
      });
    });

    it('should include actionable recommendations', async () => {
      const query = 'fintech opportunities';
      const results = await analyzeGaps(query);

      results.forEach(gap => {
        expect(Array.isArray(gap.actionableRecommendations)).toBe(true);
        expect(gap.actionableRecommendations.length).toBeGreaterThan(0);
        expect(gap.actionableRecommendations.length).toBeLessThanOrEqual(5);
      });
    });

    it('should calculate priority correctly', async () => {
      const query = 'market opportunities';
      const results = await analyzeGaps(query);

      const validPriorities = ['high', 'medium', 'low'];
      
      results.forEach(gap => {
        expect(validPriorities).toContain(gap.priority);
      });
    });

    it('should include competitor analysis', async () => {
      const query = 'e-commerce innovations';
      const results = await analyzeGaps(query);

      results.forEach(gap => {
        expect(typeof gap.competitorAnalysis).toBe('string');
        expect(gap.competitorAnalysis.length).toBeGreaterThan(0);
      });
    });

    it('should include industry context', async () => {
      const query = 'education technology';
      const results = await analyzeGaps(query);

      results.forEach(gap => {
        expect(typeof gap.industryContext).toBe('string');
        expect(gap.industryContext.length).toBeGreaterThan(0);
      });
    });

    it('should maintain consistency across multiple searches', async () => {
      const query1 = 'AI solutions';
      const query2 = 'blockchain applications';

      const results1 = await analyzeGaps(query1);
      const results2 = await analyzeGaps(query2);

      // Both should have same structure
      const validateStructure = (results: GapAnalysisResult[]) => {
        results.forEach(gap => {
          expect(gap).toHaveProperty('confidenceScore');
          expect(gap).toHaveProperty('priority');
          expect(gap).toHaveProperty('actionableRecommendations');
          expect(gap).toHaveProperty('competitorAnalysis');
          expect(gap).toHaveProperty('industryContext');
        });
      };

      validateStructure(results1);
      validateStructure(results2);
    });

    it('should prioritize high market potential + high feasibility as high priority', async () => {
      const query = 'business opportunities';
      const results = await analyzeGaps(query);

      const highPriorityGaps = results.filter(
        gap => gap.marketPotential === 'high' && gap.feasibility === 'high'
      );

      highPriorityGaps.forEach(gap => {
        expect(gap.priority).toBe('high');
      });
    });
  });
});
