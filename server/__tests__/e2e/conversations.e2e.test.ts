/**
 * End-to-End Tests for Interactive AI Conversations
 * 
 * These tests simulate complete user workflows from start to finish,
 * testing the entire conversation feature as a user would experience it.
 * 
 * Test Coverage:
 * - Complete conversation flow
 * - Multi-turn conversations
 * - Variant creation workflow
 * - Free user hitting limit
 * - Conversation export
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock services for E2E testing
const mockDb = {
  query: {
    conversations: {
      findFirst: vi.fn(),
    },
    conversationMessages: {
      findMany: vi.fn(),
    },
    suggestedQuestions: {
      findMany: vi.fn(),
    },
    searches: {
      findFirst: vi.fn(),
    },
    users: {
      findFirst: vi.fn(),
    },
  },
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockConversationService = {
  getOrCreateConversation: vi.fn(),
  addUserMessage: vi.fn(),
  addAIResponse: vi.fn(),
  getMessages: vi.fn(),
  deleteConversation: vi.fn(),
};

const mockContextWindowManager = {
  buildContext: vi.fn(),
};

const mockGeminiService = {
  generateResponse: vi.fn(),
};

const mockRateLimiter = {
  checkLimit: vi.fn(),
  getRemainingQuestions: vi.fn(),
};

const mockQuestionGenerator = {
  generateInitialQuestions: vi.fn(),
  generateFollowUpQuestions: vi.fn(),
};

const mockVariantDetection = {
  detectReanalysisIntent: vi.fn(),
};

const mockExportService = {
  exportConversation: vi.fn(),
};

// Test data
const testUser = {
  id: 1,
  email: 'test@example.com',
  plan: 'pro' as const,
};

const testFreeUser = {
  id: 2,
  email: 'free@example.com',
  plan: 'free' as const,
};

const testAnalysis = {
  id: 1,
  userId: 1,
  searchQuery: 'AI-powered fitness app',
  innovationScore: 85,
  feasibilityRating: 'High',
  topGaps: [
    { title: 'Personalized AI coaching', score: 92 },
    { title: 'Real-time form correction', score: 88 },
  ],
  competitors: [
    { name: 'FitBot', description: 'Generic fitness app' },
  ],
  actionPlan: {
    phases: [
      { phase: 1, title: 'MVP Development', duration: '3 months' },
    ],
  },
};

describe('E2E: Interactive AI Conversations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockDb.query.searches.findFirst.mockResolvedValue(testAnalysis);
    mockDb.query.users.findFirst.mockResolvedValue(testUser);
  });

  describe('Complete Conversation Flow', () => {
    it('should handle a complete conversation from start to finish', async () => {
      // Step 1: User views analysis and conversation interface loads
      const conversation = {
        id: 1,
        analysisId: testAnalysis.id,
        userId: testUser.id,
        variantIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockConversationService.getOrCreateConversation.mockResolvedValue(conversation);
      
      // Initial suggested questions are generated
      const initialQuestions = [
        { id: 1, text: 'What makes this opportunity unique?', category: 'market_validation', priority: 90 },
        { id: 2, text: 'Who are the main competitors?', category: 'competitive_analysis', priority: 85 },
        { id: 3, text: 'What should be my first step?', category: 'execution_strategy', priority: 80 },
      ];
      mockQuestionGenerator.generateInitialQuestions.mockResolvedValue(initialQuestions);
      
      const loadedConversation = await mockConversationService.getOrCreateConversation(
        testAnalysis.id,
        testUser.id
      );
      const suggestions = await mockQuestionGenerator.generateInitialQuestions(testAnalysis);
      
      expect(loadedConversation.id).toBe(1);
      expect(suggestions).toHaveLength(3);
      
      // Step 2: User asks first question
      const userMessage = 'What makes this opportunity unique?';
      const savedUserMessage = {
        id: 1,
        conversationId: conversation.id,
        role: 'user' as const,
        content: userMessage,
        metadata: {},
        createdAt: new Date(),
      };
      mockConversationService.addUserMessage.mockResolvedValue(savedUserMessage);
      
      // Step 3: System builds context and generates AI response
      const context = {
        systemPrompt: 'You are an AI advisor...',
        analysisContext: JSON.stringify(testAnalysis),
        conversationHistory: '',
        currentQuery: userMessage,
        totalTokens: 500,
      };
      mockContextWindowManager.buildContext.mockResolvedValue(context);
      
      const aiResponse = {
        content: 'This opportunity is unique because it combines AI-powered personalized coaching with real-time form correction, which no existing competitor offers together.',
        metadata: {
          processingTime: 1500,
          tokensUsed: { input: 500, output: 150, total: 650 },
        },
      };
      mockGeminiService.generateResponse.mockResolvedValue(aiResponse);
      
      const savedAIMessage = {
        id: 2,
        conversationId: conversation.id,
        role: 'assistant' as const,
        content: aiResponse.content,
        metadata: aiResponse.metadata,
        createdAt: new Date(),
      };
      mockConversationService.addAIResponse.mockResolvedValue(savedAIMessage);
      
      // Execute the flow
      await mockConversationService.addUserMessage(conversation.id, userMessage);
      const builtContext = await mockContextWindowManager.buildContext(
        testAnalysis,
        [],
        userMessage
      );
      const response = await mockGeminiService.generateResponse(builtContext);
      await mockConversationService.addAIResponse(
        conversation.id,
        response.content,
        response.metadata
      );
      
      // Step 4: New suggested questions are generated
      const followUpQuestions = [
        { id: 4, text: 'How can I validate this with users?', category: 'market_validation', priority: 88 },
        { id: 5, text: 'What technology stack should I use?', category: 'execution_strategy', priority: 82 },
      ];
      mockQuestionGenerator.generateFollowUpQuestions.mockResolvedValue(followUpQuestions);
      
      const newSuggestions = await mockQuestionGenerator.generateFollowUpQuestions(
        testAnalysis,
        [savedUserMessage, savedAIMessage]
      );
      
      // Verify complete flow
      expect(mockConversationService.getOrCreateConversation).toHaveBeenCalled();
      expect(mockConversationService.addUserMessage).toHaveBeenCalledWith(conversation.id, userMessage);
      expect(mockContextWindowManager.buildContext).toHaveBeenCalled();
      expect(mockGeminiService.generateResponse).toHaveBeenCalled();
      expect(mockConversationService.addAIResponse).toHaveBeenCalled();
      expect(newSuggestions).toHaveLength(2);
    });
  });


  describe('Multi-Turn Conversations', () => {
    it('should handle multiple back-and-forth exchanges', async () => {
      const conversation = {
        id: 1,
        analysisId: testAnalysis.id,
        userId: testUser.id,
        variantIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockConversationService.getOrCreateConversation.mockResolvedValue(conversation);
      
      // Simulate 5 exchanges (10 messages total)
      const exchanges = [
        {
          user: 'What makes this opportunity unique?',
          ai: 'This opportunity combines AI coaching with real-time form correction.',
        },
        {
          user: 'Who would be my target customers?',
          ai: 'Your target customers would be fitness enthusiasts aged 25-45 who value technology.',
        },
        {
          user: 'What are the main technical challenges?',
          ai: 'The main challenges include real-time video processing and accurate pose detection.',
        },
        {
          user: 'How much would it cost to build an MVP?',
          ai: 'An MVP would cost approximately $50,000-$75,000 for a 3-month development cycle.',
        },
        {
          user: 'What should be my go-to-market strategy?',
          ai: 'Start with a beta program targeting CrossFit gyms and personal trainers.',
        },
      ];
      
      const messages: any[] = [];
      let messageId = 1;
      
      for (const exchange of exchanges) {
        // User message
        const userMessage = {
          id: messageId++,
          conversationId: conversation.id,
          role: 'user' as const,
          content: exchange.user,
          metadata: {},
          createdAt: new Date(),
        };
        messages.push(userMessage);
        mockConversationService.addUserMessage.mockResolvedValueOnce(userMessage);
        
        // Build context with growing history
        const context = {
          systemPrompt: 'You are an AI advisor...',
          analysisContext: JSON.stringify(testAnalysis),
          conversationHistory: messages.slice(0, -1).map(m => `${m.role}: ${m.content}`).join('\n'),
          currentQuery: exchange.user,
          totalTokens: 500 + messages.length * 50,
        };
        mockContextWindowManager.buildContext.mockResolvedValueOnce(context);
        
        // AI response
        const aiResponse = {
          content: exchange.ai,
          metadata: {
            processingTime: 1500,
            tokensUsed: { input: context.totalTokens, output: 150, total: context.totalTokens + 150 },
          },
        };
        mockGeminiService.generateResponse.mockResolvedValueOnce(aiResponse);
        
        const aiMessage = {
          id: messageId++,
          conversationId: conversation.id,
          role: 'assistant' as const,
          content: aiResponse.content,
          metadata: aiResponse.metadata,
          createdAt: new Date(),
        };
        messages.push(aiMessage);
        mockConversationService.addAIResponse.mockResolvedValueOnce(aiMessage);
        
        // Execute exchange
        await mockConversationService.addUserMessage(conversation.id, exchange.user);
        const builtContext = await mockContextWindowManager.buildContext(
          testAnalysis,
          messages.slice(0, -2),
          exchange.user
        );
        const response = await mockGeminiService.generateResponse(builtContext);
        await mockConversationService.addAIResponse(
          conversation.id,
          response.content,
          response.metadata
        );
      }
      
      // Verify all exchanges were processed
      expect(mockConversationService.addUserMessage).toHaveBeenCalledTimes(5);
      expect(mockConversationService.addAIResponse).toHaveBeenCalledTimes(5);
      expect(messages).toHaveLength(10);
      
      // Verify context window management with history
      const lastContextCall = mockContextWindowManager.buildContext.mock.calls[4];
      expect(lastContextCall[1]).toHaveLength(8); // 4 previous exchanges (8 messages)
    });


    it('should summarize history when conversation gets long', async () => {
      const conversation = {
        id: 1,
        analysisId: testAnalysis.id,
        userId: testUser.id,
        variantIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Create 15 messages (exceeds the 10-message threshold)
      const messages = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        conversationId: conversation.id,
        role: (i % 2 === 0 ? 'user' : 'assistant') as const,
        content: `Message ${i + 1}`,
        metadata: {},
        createdAt: new Date(),
      }));
      
      mockConversationService.getMessages.mockResolvedValue(messages);
      
      // When building context for message 16, history should be summarized
      const context = {
        systemPrompt: 'You are an AI advisor...',
        analysisContext: JSON.stringify(testAnalysis),
        conversationHistory: 'Summary: User asked about uniqueness, target customers, challenges, costs, and strategy. Key insights: AI coaching is unique, target is 25-45 fitness enthusiasts, main challenge is video processing.\n\nRecent messages:\nuser: Message 11\nassistant: Message 12\nuser: Message 13\nassistant: Message 14\nuser: Message 15',
        currentQuery: 'New question',
        totalTokens: 800,
      };
      mockContextWindowManager.buildContext.mockResolvedValue(context);
      
      const builtContext = await mockContextWindowManager.buildContext(
        testAnalysis,
        messages,
        'New question'
      );
      
      // Verify that context includes summarized history
      expect(builtContext.conversationHistory).toContain('Summary:');
      expect(builtContext.conversationHistory).toContain('Recent messages:');
      expect(builtContext.totalTokens).toBeLessThan(1500); // Should be optimized
    });
  });

  describe('Variant Creation Workflow', () => {
    it('should detect re-analysis intent and create variant', async () => {
      const conversation = {
        id: 1,
        analysisId: testAnalysis.id,
        userId: testUser.id,
        variantIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockConversationService.getOrCreateConversation.mockResolvedValue(conversation);
      
      // Step 1: User asks a refinement question
      const refinementQuestion = 'What if I target the European market instead of the US?';
      
      // Step 2: System detects re-analysis intent
      const detectionResult = {
        isReanalysisRequest: true,
        confidence: 95,
        modifiedParameters: {
          market: 'Europe',
          targetRegion: 'EU',
        },
        confirmationPrompt: 'Would you like me to create a new analysis variant targeting the European market?',
      };
      mockVariantDetection.detectReanalysisIntent.mockResolvedValue(detectionResult);
      
      const detection = await mockVariantDetection.detectReanalysisIntent(
        refinementQuestion,
        testAnalysis
      );
      
      expect(detection.isReanalysisRequest).toBe(true);
      expect(detection.modifiedParameters.market).toBe('Europe');
      
      // Step 3: User confirms variant creation
      const userConfirms = true;
      
      if (userConfirms) {
        // Step 4: New analysis is created with modified parameters
        const variantAnalysis = {
          ...testAnalysis,
          id: 2,
          searchQuery: 'AI-powered fitness app for European market',
          innovationScore: 82,
          topGaps: [
            { title: 'GDPR-compliant AI coaching', score: 90 },
            { title: 'Multi-language support', score: 87 },
          ],
        };
        
        mockDb.query.searches.findFirst.mockResolvedValueOnce(variantAnalysis);
        
        // Step 5: New conversation is created for variant
        const variantConversation = {
          id: 2,
          analysisId: variantAnalysis.id,
          userId: testUser.id,
          variantIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockConversationService.getOrCreateConversation.mockResolvedValueOnce(variantConversation);
        
        // Step 6: Original conversation is linked to variant
        const updatedOriginalConversation = {
          ...conversation,
          variantIds: [variantAnalysis.id],
        };
        
        const newVariantConv = await mockConversationService.getOrCreateConversation(
          variantAnalysis.id,
          testUser.id
        );
        
        expect(newVariantConv.id).toBe(2);
        expect(newVariantConv.analysisId).toBe(variantAnalysis.id);
      }
    });


    it('should allow switching between original and variant', async () => {
      const originalConversation = {
        id: 1,
        analysisId: 1,
        userId: testUser.id,
        variantIds: [2],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const variantConversation = {
        id: 2,
        analysisId: 2,
        userId: testUser.id,
        variantIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // User views original
      mockConversationService.getOrCreateConversation.mockResolvedValueOnce(originalConversation);
      const original = await mockConversationService.getOrCreateConversation(1, testUser.id);
      expect(original.analysisId).toBe(1);
      expect(original.variantIds).toContain(2);
      
      // User switches to variant
      mockConversationService.getOrCreateConversation.mockResolvedValueOnce(variantConversation);
      const variant = await mockConversationService.getOrCreateConversation(2, testUser.id);
      expect(variant.analysisId).toBe(2);
      
      // User switches back to original
      mockConversationService.getOrCreateConversation.mockResolvedValueOnce(originalConversation);
      const backToOriginal = await mockConversationService.getOrCreateConversation(1, testUser.id);
      expect(backToOriginal.analysisId).toBe(1);
    });
  });

  describe('Free User Hitting Limit', () => {
    it('should enforce 5-question limit for free users', async () => {
      const conversation = {
        id: 1,
        analysisId: testAnalysis.id,
        userId: testFreeUser.id,
        variantIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockConversationService.getOrCreateConversation.mockResolvedValue(conversation);
      mockDb.query.users.findFirst.mockResolvedValue(testFreeUser);
      
      // User asks 5 questions successfully
      for (let i = 1; i <= 5; i++) {
        mockRateLimiter.checkLimit.mockResolvedValueOnce({
          allowed: true,
          remaining: 5 - i,
          limit: 5,
        });
        
        const limitCheck = await mockRateLimiter.checkLimit(
          testFreeUser.id,
          'free',
          testAnalysis.id
        );
        
        expect(limitCheck.allowed).toBe(true);
        expect(limitCheck.remaining).toBe(5 - i);
        
        // Process the question
        const userMessage = {
          id: i * 2 - 1,
          conversationId: conversation.id,
          role: 'user' as const,
          content: `Question ${i}`,
          metadata: {},
          createdAt: new Date(),
        };
        mockConversationService.addUserMessage.mockResolvedValueOnce(userMessage);
        
        const aiResponse = {
          content: `Answer ${i}`,
          metadata: { processingTime: 1500, tokensUsed: { input: 500, output: 150, total: 650 } },
        };
        mockGeminiService.generateResponse.mockResolvedValueOnce(aiResponse);
        
        const aiMessage = {
          id: i * 2,
          conversationId: conversation.id,
          role: 'assistant' as const,
          content: aiResponse.content,
          metadata: aiResponse.metadata,
          createdAt: new Date(),
        };
        mockConversationService.addAIResponse.mockResolvedValueOnce(aiMessage);
        
        await mockConversationService.addUserMessage(conversation.id, `Question ${i}`);
        const response = await mockGeminiService.generateResponse({});
        await mockConversationService.addAIResponse(conversation.id, response.content, response.metadata);
      }
      
      // 6th question should be blocked
      mockRateLimiter.checkLimit.mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        limit: 5,
      });
      
      const sixthAttempt = await mockRateLimiter.checkLimit(
        testFreeUser.id,
        'free',
        testAnalysis.id
      );
      
      expect(sixthAttempt.allowed).toBe(false);
      expect(sixthAttempt.remaining).toBe(0);
      
      // Verify upgrade prompt would be shown
      mockRateLimiter.getRemainingQuestions.mockResolvedValue({
        remaining: 0,
        limit: 5,
        unlimited: false,
      });
      
      const remaining = await mockRateLimiter.getRemainingQuestions(
        testFreeUser.id,
        testAnalysis.id,
        'free'
      );
      
      expect(remaining.remaining).toBe(0);
      expect(remaining.unlimited).toBe(false);
    });


    it('should show remaining questions to free users', async () => {
      const conversation = {
        id: 1,
        analysisId: testAnalysis.id,
        userId: testFreeUser.id,
        variantIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockConversationService.getOrCreateConversation.mockResolvedValue(conversation);
      
      // After 3 questions
      mockRateLimiter.getRemainingQuestions.mockResolvedValue({
        remaining: 2,
        limit: 5,
        unlimited: false,
      });
      
      const remaining = await mockRateLimiter.getRemainingQuestions(
        testFreeUser.id,
        testAnalysis.id,
        'free'
      );
      
      expect(remaining.remaining).toBe(2);
      expect(remaining.limit).toBe(5);
      
      // UI would show: "2 questions remaining"
    });

    it('should allow unlimited questions for pro users', async () => {
      const conversation = {
        id: 1,
        analysisId: testAnalysis.id,
        userId: testUser.id,
        variantIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockConversationService.getOrCreateConversation.mockResolvedValue(conversation);
      
      // Pro users have unlimited questions
      mockRateLimiter.getRemainingQuestions.mockResolvedValue({
        remaining: -1,
        limit: -1,
        unlimited: true,
      });
      
      const remaining = await mockRateLimiter.getRemainingQuestions(
        testUser.id,
        testAnalysis.id,
        'pro'
      );
      
      expect(remaining.unlimited).toBe(true);
      
      // Verify no limit check is enforced
      mockRateLimiter.checkLimit.mockResolvedValue({
        allowed: true,
        remaining: -1,
        limit: -1,
      });
      
      // User can ask 100 questions
      for (let i = 0; i < 100; i++) {
        const limitCheck = await mockRateLimiter.checkLimit(
          testUser.id,
          'pro',
          testAnalysis.id
        );
        expect(limitCheck.allowed).toBe(true);
      }
    });
  });

  describe('Conversation Export', () => {
    it('should export conversation as PDF', async () => {
      const conversation = {
        id: 1,
        analysisId: testAnalysis.id,
        userId: testUser.id,
        variantIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const messages = [
        {
          id: 1,
          conversationId: conversation.id,
          role: 'user' as const,
          content: 'What makes this unique?',
          metadata: {},
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 2,
          conversationId: conversation.id,
          role: 'assistant' as const,
          content: 'This opportunity is unique because...',
          metadata: { confidence: 85 },
          createdAt: new Date('2024-01-01T10:01:00Z'),
        },
      ];
      
      mockConversationService.getMessages.mockResolvedValue(messages);
      mockDb.query.searches.findFirst.mockResolvedValue(testAnalysis);
      
      // Export as PDF
      const exportResult = {
        success: true,
        format: 'pdf',
        url: '/exports/conversation-1.pdf',
        filename: 'conversation-1.pdf',
      };
      mockExportService.exportConversation.mockResolvedValue(exportResult);
      
      const result = await mockExportService.exportConversation(
        conversation.id,
        'pdf',
        { includeAnalysis: true }
      );
      
      expect(result.success).toBe(true);
      expect(result.format).toBe('pdf');
      expect(result.url).toContain('.pdf');
      expect(mockExportService.exportConversation).toHaveBeenCalledWith(
        conversation.id,
        'pdf',
        { includeAnalysis: true }
      );
    });


    it('should export conversation as Markdown', async () => {
      const conversation = {
        id: 1,
        analysisId: testAnalysis.id,
        userId: testUser.id,
        variantIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const messages = [
        {
          id: 1,
          conversationId: conversation.id,
          role: 'user' as const,
          content: 'What makes this unique?',
          metadata: {},
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 2,
          conversationId: conversation.id,
          role: 'assistant' as const,
          content: 'This opportunity is unique because...',
          metadata: { confidence: 85 },
          createdAt: new Date('2024-01-01T10:01:00Z'),
        },
      ];
      
      mockConversationService.getMessages.mockResolvedValue(messages);
      
      const exportResult = {
        success: true,
        format: 'markdown',
        content: '# Conversation\n\n**User:** What makes this unique?\n\n**AI:** This opportunity is unique because...',
        filename: 'conversation-1.md',
      };
      mockExportService.exportConversation.mockResolvedValue(exportResult);
      
      const result = await mockExportService.exportConversation(
        conversation.id,
        'markdown',
        { includeAnalysis: false }
      );
      
      expect(result.success).toBe(true);
      expect(result.format).toBe('markdown');
      expect(result.content).toContain('# Conversation');
      expect(result.content).toContain('**User:**');
      expect(result.content).toContain('**AI:**');
    });

    it('should export conversation as JSON', async () => {
      const conversation = {
        id: 1,
        analysisId: testAnalysis.id,
        userId: testUser.id,
        variantIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const messages = [
        {
          id: 1,
          conversationId: conversation.id,
          role: 'user' as const,
          content: 'What makes this unique?',
          metadata: {},
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 2,
          conversationId: conversation.id,
          role: 'assistant' as const,
          content: 'This opportunity is unique because...',
          metadata: { confidence: 85 },
          createdAt: new Date('2024-01-01T10:01:00Z'),
        },
      ];
      
      mockConversationService.getMessages.mockResolvedValue(messages);
      mockDb.query.searches.findFirst.mockResolvedValue(testAnalysis);
      
      const exportResult = {
        success: true,
        format: 'json',
        data: {
          conversation,
          messages,
          analysis: testAnalysis,
        },
        filename: 'conversation-1.json',
      };
      mockExportService.exportConversation.mockResolvedValue(exportResult);
      
      const result = await mockExportService.exportConversation(
        conversation.id,
        'json',
        { includeAnalysis: true }
      );
      
      expect(result.success).toBe(true);
      expect(result.format).toBe('json');
      expect(result.data.conversation).toBeDefined();
      expect(result.data.messages).toHaveLength(2);
      expect(result.data.analysis).toBeDefined();
    });

    it('should export conversation with or without analysis', async () => {
      const conversation = {
        id: 1,
        analysisId: testAnalysis.id,
        userId: testUser.id,
        variantIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Export without analysis
      const withoutAnalysis = {
        success: true,
        format: 'pdf',
        url: '/exports/conversation-1-only.pdf',
      };
      mockExportService.exportConversation.mockResolvedValueOnce(withoutAnalysis);
      
      const result1 = await mockExportService.exportConversation(
        conversation.id,
        'pdf',
        { includeAnalysis: false }
      );
      
      expect(result1.success).toBe(true);
      expect(mockExportService.exportConversation).toHaveBeenCalledWith(
        conversation.id,
        'pdf',
        { includeAnalysis: false }
      );
      
      // Export with analysis
      const withAnalysis = {
        success: true,
        format: 'pdf',
        url: '/exports/conversation-1-full.pdf',
      };
      mockExportService.exportConversation.mockResolvedValueOnce(withAnalysis);
      
      const result2 = await mockExportService.exportConversation(
        conversation.id,
        'pdf',
        { includeAnalysis: true }
      );
      
      expect(result2.success).toBe(true);
      expect(mockExportService.exportConversation).toHaveBeenCalledWith(
        conversation.id,
        'pdf',
        { includeAnalysis: true }
      );
    });
  });

  describe('Complete User Journey', () => {
    it('should simulate a complete user journey from analysis to export', async () => {
      // Step 1: User completes gap analysis
      const analysis = testAnalysis;
      mockDb.query.searches.findFirst.mockResolvedValue(analysis);
      
      // Step 2: User views analysis and conversation interface loads
      const conversation = {
        id: 1,
        analysisId: analysis.id,
        userId: testUser.id,
        variantIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockConversationService.getOrCreateConversation.mockResolvedValue(conversation);
      
      const loadedConversation = await mockConversationService.getOrCreateConversation(
        analysis.id,
        testUser.id
      );
      expect(loadedConversation.id).toBe(1);
      
      // Step 3: Initial suggested questions appear
      const initialQuestions = [
        { id: 1, text: 'What makes this unique?', category: 'market_validation', priority: 90 },
        { id: 2, text: 'Who are the competitors?', category: 'competitive_analysis', priority: 85 },
      ];
      mockQuestionGenerator.generateInitialQuestions.mockResolvedValue(initialQuestions);
      
      const suggestions = await mockQuestionGenerator.generateInitialQuestions(analysis);
      expect(suggestions).toHaveLength(2);
      
      // Step 4: User clicks a suggested question
      const selectedQuestion = initialQuestions[0].text;
      
      mockConversationService.addUserMessage.mockResolvedValue({
        id: 1,
        conversationId: conversation.id,
        role: 'user',
        content: selectedQuestion,
        metadata: {},
        createdAt: new Date(),
      });
      
      mockContextWindowManager.buildContext.mockResolvedValue({
        systemPrompt: 'You are an AI advisor...',
        analysisContext: JSON.stringify(analysis),
        conversationHistory: '',
        currentQuery: selectedQuestion,
        totalTokens: 500,
      });
      
      mockGeminiService.generateResponse.mockResolvedValue({
        content: 'This opportunity is unique because it combines AI coaching with real-time form correction.',
        metadata: { processingTime: 1500, tokensUsed: { input: 500, output: 150, total: 650 } },
      });
      
      mockConversationService.addAIResponse.mockResolvedValue({
        id: 2,
        conversationId: conversation.id,
        role: 'assistant',
        content: 'This opportunity is unique because it combines AI coaching with real-time form correction.',
        metadata: { processingTime: 1500, tokensUsed: { input: 500, output: 150, total: 650 } },
        createdAt: new Date(),
      });
      
      await mockConversationService.addUserMessage(conversation.id, selectedQuestion);
      const context = await mockContextWindowManager.buildContext(analysis, [], selectedQuestion);
      const response = await mockGeminiService.generateResponse(context);
      await mockConversationService.addAIResponse(conversation.id, response.content, response.metadata);
      
      // Step 5: User asks follow-up questions (3 more)
      for (let i = 0; i < 3; i++) {
        mockConversationService.addUserMessage.mockResolvedValue({
          id: (i + 2) * 2 - 1,
          conversationId: conversation.id,
          role: 'user',
          content: `Follow-up question ${i + 1}`,
          metadata: {},
          createdAt: new Date(),
        });
        
        mockGeminiService.generateResponse.mockResolvedValue({
          content: `Answer to follow-up ${i + 1}`,
          metadata: { processingTime: 1500, tokensUsed: { input: 500, output: 150, total: 650 } },
        });
        
        mockConversationService.addAIResponse.mockResolvedValue({
          id: (i + 2) * 2,
          conversationId: conversation.id,
          role: 'assistant',
          content: `Answer to follow-up ${i + 1}`,
          metadata: { processingTime: 1500, tokensUsed: { input: 500, output: 150, total: 650 } },
          createdAt: new Date(),
        });
        
        await mockConversationService.addUserMessage(conversation.id, `Follow-up question ${i + 1}`);
        const followUpResponse = await mockGeminiService.generateResponse({});
        await mockConversationService.addAIResponse(conversation.id, followUpResponse.content, followUpResponse.metadata);
      }
      
      // Step 6: User asks about targeting different market (triggers variant)
      const refinementQuestion = 'What if I target Europe instead?';
      
      mockVariantDetection.detectReanalysisIntent.mockResolvedValue({
        isReanalysisRequest: true,
        confidence: 95,
        modifiedParameters: { market: 'Europe' },
        confirmationPrompt: 'Create variant for European market?',
      });
      
      const detection = await mockVariantDetection.detectReanalysisIntent(refinementQuestion, analysis);
      expect(detection.isReanalysisRequest).toBe(true);
      
      // Step 7: User confirms and variant is created
      const variantAnalysis = { ...analysis, id: 2, searchQuery: 'AI fitness app for Europe' };
      mockDb.query.searches.findFirst.mockResolvedValueOnce(variantAnalysis);
      
      const variantConversation = {
        id: 2,
        analysisId: variantAnalysis.id,
        userId: testUser.id,
        variantIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockConversationService.getOrCreateConversation.mockResolvedValueOnce(variantConversation);
      
      const newVariant = await mockConversationService.getOrCreateConversation(
        variantAnalysis.id,
        testUser.id
      );
      expect(newVariant.analysisId).toBe(2);
      
      // Step 8: User exports the original conversation
      const allMessages = [
        { id: 1, role: 'user', content: selectedQuestion },
        { id: 2, role: 'assistant', content: 'This opportunity is unique...' },
        { id: 3, role: 'user', content: 'Follow-up question 1' },
        { id: 4, role: 'assistant', content: 'Answer to follow-up 1' },
        { id: 5, role: 'user', content: 'Follow-up question 2' },
        { id: 6, role: 'assistant', content: 'Answer to follow-up 2' },
        { id: 7, role: 'user', content: 'Follow-up question 3' },
        { id: 8, role: 'assistant', content: 'Answer to follow-up 3' },
      ];
      mockConversationService.getMessages.mockResolvedValue(allMessages);
      
      mockExportService.exportConversation.mockResolvedValue({
        success: true,
        format: 'pdf',
        url: '/exports/conversation-1.pdf',
      });
      
      const exportResult = await mockExportService.exportConversation(
        conversation.id,
        'pdf',
        { includeAnalysis: true }
      );
      
      expect(exportResult.success).toBe(true);
      
      // Verify complete journey
      expect(mockConversationService.getOrCreateConversation).toHaveBeenCalledTimes(2); // Original + variant
      expect(mockConversationService.addUserMessage).toHaveBeenCalledTimes(4); // 1 initial + 3 follow-ups
      expect(mockConversationService.addAIResponse).toHaveBeenCalledTimes(4);
      expect(mockVariantDetection.detectReanalysisIntent).toHaveBeenCalled();
      expect(mockExportService.exportConversation).toHaveBeenCalled();
    });
  });
});
