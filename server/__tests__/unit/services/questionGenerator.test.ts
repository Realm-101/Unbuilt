/**
 * Unit Tests for QuestionGenerator Service
 * Tests question generation, prioritization, and deduplication
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateInitialQuestions,
  generateFollowUpQuestions,
  deduplicateQuestions,
  filterExistingQuestions,
  type GeneratedQuestion,
  type AnalysisData,
} from '../../../services/questionGeneratorService';
import type { ConversationMessage, SuggestedQuestion } from '@shared/schema';

// Mock Gemini service
vi.mock('../../../services/geminiConversationService', () => ({
  isGeminiAvailable: vi.fn(() => false), // Default to template-based generation
  getGeminiClient: vi.fn(() => ({
    models: {
      get: vi.fn(() => ({
        generateContent: vi.fn(),
      })),
    },
  })),
}));

describe('QuestionGenerator Service', () => {
  let mockAnalysis: AnalysisData;
  let mockMessages: ConversationMessage[];

  beforeEach(() => {
    mockAnalysis = {
      query: 'AI-powered fitness app',
      innovationScore: 85,
      feasibilityRating: 'high',
      topGaps: [
        {
          title: 'Personalized workout plans',
          category: 'Product Innovation',
          feasibility: 'high',
          marketPotential: 'high',
          innovationScore: 90,
        },
        {
          title: 'Real-time form correction',
          category: 'Technology',
          feasibility: 'medium',
          marketPotential: 'high',
          innovationScore: 85,
        },
      ],
      competitors: ['Fitbit', 'MyFitnessPal', 'Peloton'],
      actionPlan: {},
    };

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

  describe('generateInitialQuestions', () => {
    it('should generate 5 initial questions', async () => {
      const questions = await generateInitialQuestions(mockAnalysis);

      expect(questions).toHaveLength(5);
      expect(questions.every(q => q.text && q.category && q.priority)).toBe(true);
    });

    it('should include questions from multiple categories', async () => {
      const questions = await generateInitialQuestions(mockAnalysis);

      const categories = new Set(questions.map(q => q.category));
      expect(categories.size).toBeGreaterThan(1);
    });

    it('should prioritize market validation questions', async () => {
      const questions = await generateInitialQuestions(mockAnalysis);

      const marketValidationQuestions = questions.filter(
        q => q.category === 'market_validation'
      );
      expect(marketValidationQuestions.length).toBeGreaterThan(0);
    });

    it('should sort questions by priority', async () => {
      const questions = await generateInitialQuestions(mockAnalysis);

      for (let i = 0; i < questions.length - 1; i++) {
        expect(questions[i].priority).toBeGreaterThanOrEqual(questions[i + 1].priority);
      }
    });

    it('should include gap title in questions', async () => {
      const questions = await generateInitialQuestions(mockAnalysis);

      const hasGapReference = questions.some(q =>
        q.text.includes('Personalized workout plans') || q.text.includes('this opportunity')
      );
      expect(hasGapReference).toBe(true);
    });

    it('should adjust priority based on innovation score', async () => {
      const highScoreAnalysis = { ...mockAnalysis, innovationScore: 95 };
      const lowScoreAnalysis = { ...mockAnalysis, innovationScore: 50 };

      const highScoreQuestions = await generateInitialQuestions(highScoreAnalysis);
      const lowScoreQuestions = await generateInitialQuestions(lowScoreAnalysis);

      const highMarketQ = highScoreQuestions.find(q => q.category === 'market_validation');
      const lowMarketQ = lowScoreQuestions.find(q => q.category === 'market_validation');

      if (highMarketQ && lowMarketQ) {
        expect(highMarketQ.priority).toBeGreaterThan(lowMarketQ.priority);
      }
    });

    it('should boost risk assessment for low feasibility', async () => {
      const lowFeasibilityAnalysis = { ...mockAnalysis, feasibilityRating: 'low' };
      const questions = await generateInitialQuestions(lowFeasibilityAnalysis);

      const riskQuestions = questions.filter(q => q.category === 'risk_assessment');
      expect(riskQuestions.length).toBeGreaterThan(0);
    });
  });

  describe('generateFollowUpQuestions', () => {
    it('should generate follow-up questions based on conversation', async () => {
      const questions = await generateFollowUpQuestions(mockAnalysis, mockMessages);

      expect(questions).toHaveLength(5);
      expect(questions.every(q => q.text && q.category && q.priority)).toBe(true);
    });

    it('should avoid questions similar to conversation history', async () => {
      const messagesWithMarketQuestion = [
        ...mockMessages,
        {
          id: 3,
          conversationId: 1,
          role: 'user',
          content: 'What evidence supports the market demand for this opportunity?',
          createdAt: new Date(),
        } as ConversationMessage,
      ];

      const questions = await generateFollowUpQuestions(
        mockAnalysis,
        messagesWithMarketQuestion
      );

      // Should not include very similar market demand question
      const similarQuestion = questions.find(q =>
        q.text.toLowerCase().includes('market demand') &&
        q.text.toLowerCase().includes('evidence')
      );
      expect(similarQuestion).toBeUndefined();
    });

    it('should reduce priority for heavily discussed topics', async () => {
      const messagesWithManyMarketQuestions = [
        ...mockMessages,
        {
          id: 3,
          conversationId: 1,
          role: 'user',
          content: 'What is the market size?',
          createdAt: new Date(),
        },
        {
          id: 4,
          conversationId: 1,
          role: 'user',
          content: 'Who are the target customers in this market?',
          createdAt: new Date(),
        },
        {
          id: 5,
          conversationId: 1,
          role: 'user',
          content: 'What market trends support this?',
          createdAt: new Date(),
        },
      ] as ConversationMessage[];

      const questions = await generateFollowUpQuestions(
        mockAnalysis,
        messagesWithManyMarketQuestions
      );

      // Market validation questions should have lower priority
      const marketQuestions = questions.filter(q => q.category === 'market_validation');
      const otherQuestions = questions.filter(q => q.category !== 'market_validation');

      if (marketQuestions.length > 0 && otherQuestions.length > 0) {
        const avgMarketPriority =
          marketQuestions.reduce((sum, q) => sum + q.priority, 0) / marketQuestions.length;
        const avgOtherPriority =
          otherQuestions.reduce((sum, q) => sum + q.priority, 0) / otherQuestions.length;

        expect(avgMarketPriority).toBeLessThan(avgOtherPriority);
      }
    });

    it('should boost undiscussed topics', async () => {
      const messagesWithoutRiskDiscussion = [
        ...mockMessages,
        {
          id: 3,
          conversationId: 1,
          role: 'user',
          content: 'Tell me about the market opportunity',
          createdAt: new Date(),
        },
        {
          id: 4,
          conversationId: 1,
          role: 'user',
          content: 'What about competitors?',
          createdAt: new Date(),
        },
      ] as ConversationMessage[];

      const questions = await generateFollowUpQuestions(
        mockAnalysis,
        messagesWithoutRiskDiscussion
      );

      // Risk assessment should be included since it wasn't discussed
      const riskQuestions = questions.filter(q => q.category === 'risk_assessment');
      expect(riskQuestions.length).toBeGreaterThan(0);
    });

    it('should handle empty conversation history', async () => {
      const questions = await generateFollowUpQuestions(mockAnalysis, []);

      expect(questions).toHaveLength(5);
    });
  });

  describe('deduplicateQuestions', () => {
    it('should remove duplicate questions', () => {
      const questions: GeneratedQuestion[] = [
        {
          text: 'What is the market size?',
          category: 'market_validation',
          priority: 80,
          relevanceScore: 75,
        },
        {
          text: 'What is the market size for this opportunity?',
          category: 'market_validation',
          priority: 75,
          relevanceScore: 70,
        },
        {
          text: 'Who are the competitors?',
          category: 'competitive_analysis',
          priority: 70,
          relevanceScore: 65,
        },
      ];

      const unique = deduplicateQuestions(questions);

      expect(unique.length).toBe(2);
      expect(unique.find(q => q.text.includes('market size'))).toBeDefined();
      expect(unique.find(q => q.text.includes('competitors'))).toBeDefined();
    });

    it('should keep all questions if none are similar', () => {
      const questions: GeneratedQuestion[] = [
        {
          text: 'What is the market size?',
          category: 'market_validation',
          priority: 80,
          relevanceScore: 75,
        },
        {
          text: 'Who are the competitors?',
          category: 'competitive_analysis',
          priority: 75,
          relevanceScore: 70,
        },
        {
          text: 'What are the biggest risks?',
          category: 'risk_assessment',
          priority: 70,
          relevanceScore: 65,
        },
      ];

      const unique = deduplicateQuestions(questions);

      expect(unique.length).toBe(3);
    });

    it('should handle empty array', () => {
      const unique = deduplicateQuestions([]);

      expect(unique).toEqual([]);
    });
  });

  describe('filterExistingQuestions', () => {
    it('should filter out questions that already exist', () => {
      const newQuestions: GeneratedQuestion[] = [
        {
          text: 'What is the market size?',
          category: 'market_validation',
          priority: 80,
          relevanceScore: 75,
        },
        {
          text: 'Who are the competitors?',
          category: 'competitive_analysis',
          priority: 75,
          relevanceScore: 70,
        },
      ];

      const existingQuestions: SuggestedQuestion[] = [
        {
          id: 1,
          conversationId: 1,
          questionText: 'What is the market size for this?',
          category: 'market_validation',
          priority: 80,
          used: false,
          createdAt: new Date(),
        },
      ] as SuggestedQuestion[];

      const filtered = filterExistingQuestions(newQuestions, existingQuestions);

      expect(filtered.length).toBe(1);
      expect(filtered[0].text).toContain('competitors');
    });

    it('should keep all questions if none exist', () => {
      const newQuestions: GeneratedQuestion[] = [
        {
          text: 'What is the market size?',
          category: 'market_validation',
          priority: 80,
          relevanceScore: 75,
        },
      ];

      const filtered = filterExistingQuestions(newQuestions, []);

      expect(filtered.length).toBe(1);
    });
  });
});
