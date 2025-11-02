/**
 * Unit Tests for TemplateGenerationService
 * Tests template variable extraction, rendering, and generation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Centralized test utilities
import {
  createMockDb,
  configureMockDbChain,
  createMockSearch,
  createMockSearchResult,
  createMockResource,
  resetAllMocks,
} from '../../imports';

// Service being tested
import { TemplateGenerationService } from '../../../services/templateGenerationService';

// Mock database module (must be before creating mockDb due to hoisting)
vi.mock('../../../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  },
}));

describe('TemplateGenerationService', () => {
  let service: TemplateGenerationService;
  let mockSearch: any;
  let mockResults: any[];
  let mockTemplate: any;

  beforeEach(() => {
    service = new TemplateGenerationService();

    // Create test data using factory methods
    mockSearch = createMockSearch({
      id: 1,
      query: 'AI-powered fitness app',
      userId: 1,
    });

    mockResults = [
      createMockSearchResult({
        id: 1,
        searchId: 1,
        title: 'Personalized Workout Plans',
        description: 'AI-generated workout plans',
        innovationScore: 85,
        feasibility: 'high',
        marketPotential: 'large',
        marketSize: '$500M TAM',
        gapReason: 'No AI-powered personalization',
        category: 'Fitness Tech',
        confidenceScore: 90,
        priority: 'high',
        actionableRecommendations: [
          'Build MVP with core AI features',
          'Partner with fitness trainers',
          'Launch beta program',
        ],
        competitorAnalysis: 'Fitbit and MyFitnessPal lack AI personalization',
        industryContext: 'Growing fitness tech market',
        targetAudience: 'Health-conscious millennials',
        keyTrends: ['AI in fitness', 'Personalization', 'Mobile-first'],
      }),
    ];

    mockTemplate = createMockResource({
      id: 1,
      title: 'Business Plan Template',
      description: 'Comprehensive business plan',
      resourceType: 'template',
      metadata: null,
    });
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('extractVariables', () => {
    it('should extract variables from analysis', async () => {
      // Get the mocked db
      const { db } = await import('../../../db');
      
      // Configure mock to return search first, then results
      configureMockDbChain(db as any, {
        select: {
          result: mockResults,
          multipleResults: [
            [mockSearch],   // First call returns search
            mockResults,    // Second call returns results
          ],
        },
      });

      const variables = await service.extractVariables(1);

      expect(variables).toBeDefined();
      expect(variables?.ideaTitle).toBe('Personalized Workout Plans');
      expect(variables?.innovationScore).toBe(85);
      expect(variables?.feasibility).toBe('high');
      expect(variables?.marketPotential).toBe('large');
      expect(variables?.marketSize).toBe('$500M TAM');
      expect(variables?.category).toBe('Fitness Tech');
      expect(variables?.confidenceScore).toBe(90);
      expect(variables?.priority).toBe('high');
    });

    it('should extract competitors from competitor analysis', async () => {
      const { db } = await import('../../../db');
      
      configureMockDbChain(db as any, {
        select: {
          result: mockResults,
          multipleResults: [
            [mockSearch],
            mockResults,
          ],
        },
      });

      const variables = await service.extractVariables(1);

      expect(variables?.topCompetitors).toBeDefined();
      expect(Array.isArray(variables?.topCompetitors)).toBe(true);
      expect(variables?.topCompetitors.length).toBeGreaterThan(0);
    });

    it('should extract key features from actionable recommendations', async () => {
      const { db } = await import('../../../db');
      
      configureMockDbChain(db as any, {
        select: {
          result: mockResults,
          multipleResults: [
            [mockSearch],
            mockResults,
          ],
        },
      });

      const variables = await service.extractVariables(1);

      expect(variables?.keyFeatures).toEqual(mockResults[0].actionableRecommendations);
      expect(variables?.actionableRecommendations).toEqual(mockResults[0].actionableRecommendations);
    });

    it('should return null for non-existent analysis', async () => {
      const { db } = await import('../../../db');
      
      configureMockDbChain(db as any, {
        select: {
          result: [],
          chain: ['from', 'where', 'limit'],
        },
      });

      const variables = await service.extractVariables(999);

      expect(variables).toBeNull();
    });

    it('should return null for analysis with no results', async () => {
      const { db } = await import('../../../db');
      
      configureMockDbChain(db as any, {
        select: {
          result: [],
          multipleResults: [
            [mockSearch],
            [],  // No results
          ],
        },
      });

      const variables = await service.extractVariables(1);

      expect(variables).toBeNull();
    });
  });

  describe('generateTemplate', () => {
    it('should generate template with pre-filled data', async () => {
      const { db } = await import('../../../db');
      
      configureMockDbChain(db as any, {
        select: {
          multipleResults: [
            [mockTemplate],  // First call: get template
            [mockSearch],    // Second call: get search
            mockResults,     // Third call: get results
          ],
        },
      });

      const generated = await service.generateTemplate(1, 1, 'docx');

      expect(generated).toBeDefined();
      expect(generated).not.toBeNull();
      if (generated) {
        expect(generated.url).toContain('/api/resources/templates/download/');
        expect(generated.filename).toContain('.docx');
        expect(generated.format).toBe('docx');
        expect(generated.expiresAt).toBeInstanceOf(Date);
        expect(generated.variables).toBeDefined();
      }
    });

    it('should return null for non-template resource', async () => {
      const { db } = await import('../../../db');
      
      const nonTemplate = { ...mockTemplate, resourceType: 'guide' };
      
      configureMockDbChain(db as any, {
        select: {
          result: [nonTemplate],
        },
      });

      const generated = await service.generateTemplate(1, 1, 'docx');

      expect(generated).toBeNull();
    });

    it('should support different formats', async () => {
      const { db } = await import('../../../db');
      
      // First call for PDF
      configureMockDbChain(db as any, {
        select: {
          multipleResults: [
            [mockTemplate],
            [mockSearch],
            mockResults,
          ],
        },
      });

      const pdfTemplate = await service.generateTemplate(1, 1, 'pdf');
      expect(pdfTemplate).not.toBeNull();
      if (pdfTemplate) {
        expect(pdfTemplate.format).toBe('pdf');
        expect(pdfTemplate.filename).toContain('.pdf');
      }

      // Reset and configure for second call (gdocs)
      resetAllMocks();
      configureMockDbChain(db as any, {
        select: {
          multipleResults: [
            [mockTemplate],
            [mockSearch],
            mockResults,
          ],
        },
      });

      const gdocsTemplate = await service.generateTemplate(1, 1, 'gdocs');
      expect(gdocsTemplate).not.toBeNull();
      if (gdocsTemplate) {
        expect(gdocsTemplate.format).toBe('gdocs');
        expect(gdocsTemplate.filename).toContain('.gdocs');
      }
    });

    it('should set expiration time correctly', async () => {
      const { db } = await import('../../../db');
      
      configureMockDbChain(db as any, {
        select: {
          multipleResults: [
            [mockTemplate],
            [mockSearch],
            mockResults,
          ],
        },
      });

      const generated = await service.generateTemplate(1, 1, 'docx');

      expect(generated).not.toBeNull();
      if (generated) {
        const now = new Date();
        const expiresAt = generated.expiresAt;
        const hoursDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

        expect(hoursDiff).toBeGreaterThan(23);
        expect(hoursDiff).toBeLessThan(25);
      }
    });
  });

  describe('getTemplateByToken', () => {
    it('should retrieve template by token', async () => {
      const { db } = await import('../../../db');
      
      configureMockDbChain(db as any, {
        select: {
          multipleResults: [
            [mockTemplate],
            [mockSearch],
            mockResults,
          ],
        },
      });

      const generated = await service.generateTemplate(1, 1, 'docx');
      
      expect(generated).not.toBeNull();
      if (generated) {
        const token = generated.url.split('/').pop()!;
        const retrieved = service.getTemplateByToken(token);

        expect(retrieved).toBeDefined();
        expect(retrieved?.filename).toBe(generated.filename);
      }
    });

    it('should return null for invalid token', () => {
      const retrieved = service.getTemplateByToken('invalid-token');

      expect(retrieved).toBeNull();
    });

    it('should return null for expired template', async () => {
      const { db } = await import('../../../db');
      
      configureMockDbChain(db as any, {
        select: {
          multipleResults: [
            [mockTemplate],
            [mockSearch],
            mockResults,
          ],
        },
      });

      const generated = await service.generateTemplate(1, 1, 'docx');
      
      expect(generated).not.toBeNull();
      if (generated) {
        const token = generated.url.split('/').pop()!;

        // Manually expire the template
        const template = (service as any).tempStorage.get(token);
        template.expiresAt = new Date(Date.now() - 1000);

        const retrieved = service.getTemplateByToken(token);

        expect(retrieved).toBeNull();
      }
    });
  });

  describe('getAvailableTemplates', () => {
    it('should return available templates for analysis', async () => {
      const { db } = await import('../../../db');
      
      const mockTemplates = [
        { ...mockTemplate, id: 1, title: 'Template 1' },
        { ...mockTemplate, id: 2, title: 'Template 2' },
      ];

      configureMockDbChain(db as any, {
        select: {
          multipleResults: [
            [mockSearch],     // First call: get search
            mockTemplates,    // Second call: get templates
          ],
        },
      });

      const templates = await service.getAvailableTemplates(1);

      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBe(2);
      expect(templates[0]).toHaveProperty('id');
      expect(templates[0]).toHaveProperty('title');
      expect(templates[0]).toHaveProperty('formats');
    });

    it('should return empty array for non-existent analysis', async () => {
      const { db } = await import('../../../db');
      
      configureMockDbChain(db as any, {
        select: {
          result: [],
        },
      });

      const templates = await service.getAvailableTemplates(999);

      expect(templates).toEqual([]);
    });
  });

  describe('template rendering', () => {
    it('should replace all variable placeholders', () => {
      const templateContent = `
# {{idea_title}}
Innovation Score: {{innovation_score}}
Market: {{target_market}}
Competitors: {{top_competitors}}
Features: {{key_features}}
      `.trim();

      const mockTemplateWithContent = {
        ...mockTemplate,
        metadata: { templateContent },
      };

      const variables = {
        ideaTitle: 'Test Idea',
        innovationScore: 85,
        targetMarket: 'Test Market',
        topCompetitors: ['Competitor 1', 'Competitor 2'],
        keyFeatures: ['Feature 1', 'Feature 2'],
        actionPlanSummary: 'Test Plan',
        marketSize: '$100M',
        feasibility: 'high',
        marketPotential: 'large',
        gapReason: 'Test Reason',
        category: 'Test Category',
        confidenceScore: 90,
        priority: 'high',
        actionableRecommendations: ['Rec 1'],
        keyTrends: ['Trend 1'],
      };

      const rendered = (service as any).renderTemplate(
        mockTemplateWithContent,
        variables,
        'docx'
      );

      expect(rendered).toContain('Test Idea');
      expect(rendered).toContain('85');
      expect(rendered).toContain('Test Market');
      expect(rendered).toContain('Competitor 1');
      expect(rendered).toContain('Feature 1');
    });

    it('should format lists correctly', () => {
      const list = ['Item 1', 'Item 2', 'Item 3'];
      const formatted = (service as any).formatList(list);

      expect(formatted).toContain('1. Item 1');
      expect(formatted).toContain('2. Item 2');
      expect(formatted).toContain('3. Item 3');
    });

    it('should handle empty lists', () => {
      const formatted = (service as any).formatList([]);

      expect(formatted).toBe('N/A');
    });
  });

  describe('filename generation', () => {
    it('should generate valid filename', () => {
      const filename = (service as any).generateFilename('Business Plan Template', 'docx');

      expect(filename).toMatch(/^business-plan-template-\d+\.docx$/);
    });

    it('should sanitize special characters', () => {
      const filename = (service as any).generateFilename('Test@#$%Template!', 'pdf');

      expect(filename).toMatch(/^test-template-\d+\.pdf$/);
    });

    it('should handle different formats', () => {
      const docxFilename = (service as any).generateFilename('Template', 'docx');
      const pdfFilename = (service as any).generateFilename('Template', 'pdf');
      const gdocsFilename = (service as any).generateFilename('Template', 'gdocs');

      expect(docxFilename).toContain('.docx');
      expect(pdfFilename).toContain('.pdf');
      expect(gdocsFilename).toContain('.gdocs');
    });
  });
});
