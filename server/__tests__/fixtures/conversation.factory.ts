/**
 * ConversationFactory - Test Data Factory for Conversations
 * 
 * Provides methods to create, persist, and cleanup test conversations for E2E testing.
 * Supports message generation and conversation state management.
 * 
 * Requirements: 8.2, 8.3
 * 
 * Example:
 * ```typescript
 * const conversation = ConversationFactory.create(analysisId, userId);
 * await ConversationFactory.persist(conversation);
 * // ... run tests
 * await ConversationFactory.cleanup(conversation.id);
 * ```
 */

import { db } from '../../db';
import { conversations, conversationMessages, suggestedQuestions } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface TestConversation {
  id?: number;
  analysisId: number;
  userId: number;
  variantIds?: string[];
  messages?: TestMessage[];
  suggestedQuestions?: TestSuggestedQuestion[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TestMessage {
  id?: number;
  conversationId?: number;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    tokensUsed?: number;
    processingTime?: number;
    confidence?: number;
    sources?: string[];
    assumptions?: string[];
  };
  createdAt?: Date;
  editedAt?: Date;
}

export interface TestSuggestedQuestion {
  id?: number;
  conversationId?: number;
  questionText: string;
  category: 'market_validation' | 'competitive_analysis' | 'execution_strategy' | 'risk_assessment';
  priority?: number;
  used?: boolean;
  createdAt?: Date;
}

export class ConversationFactory {
  private static counter = 0;

  /**
   * Create a test conversation with defaults and optional overrides
   * @param analysisId - Analysis (search) ID
   * @param userId - User ID
   * @param overrides - Partial conversation data to override defaults
   * @returns Test conversation object
   */
  static create(analysisId: number, userId: number, overrides: Partial<TestConversation> = {}): TestConversation {
    return {
      analysisId,
      userId,
      variantIds: [],
      messages: [],
      suggestedQuestions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Create a conversation with initial messages
   * @param analysisId - Analysis ID
   * @param userId - User ID
   * @param messageCount - Number of messages to generate
   * @param overrides - Optional overrides
   * @returns Test conversation with messages
   */
  static createWithMessages(
    analysisId: number,
    userId: number,
    messageCount: number = 4,
    overrides: Partial<TestConversation> = {}
  ): TestConversation {
    const messages = this.generateMessages(messageCount);
    const suggestedQuestions = this.generateSuggestedQuestions(3);

    return this.create(analysisId, userId, {
      messages,
      suggestedQuestions,
      ...overrides,
    });
  }

  /**
   * Generate test messages
   * @param count - Number of messages to generate (must be even for alternating roles)
   * @param overrides - Optional overrides for all messages
   * @returns Array of test messages
   */
  static generateMessages(count: number = 4, overrides: Partial<TestMessage> = {}): TestMessage[] {
    const messages: TestMessage[] = [];
    const counter = ++this.counter;

    for (let i = 0; i < count; i++) {
      const isUser = i % 2 === 0;
      
      messages.push({
        role: isUser ? 'user' : 'assistant',
        content: isUser
          ? `User question ${Math.floor(i / 2) + 1} in conversation ${counter}`
          : `AI assistant response ${Math.floor(i / 2) + 1} providing detailed analysis and insights.`,
        metadata: isUser ? {} : {
          tokensUsed: 150 + (i * 20),
          processingTime: 1200 + (i * 100),
          confidence: 85 + (i % 10),
          sources: [
            'Market research report',
            'Industry analysis',
            'Competitive intelligence',
          ],
          assumptions: [
            'Market growth continues at current rate',
            'Technology adoption follows predicted curve',
          ],
        },
        createdAt: new Date(Date.now() + (i * 60000)), // 1 minute apart
        ...overrides,
      });
    }

    return messages;
  }

  /**
   * Generate a single user message
   * @param content - Message content
   * @param overrides - Optional overrides
   * @returns Test user message
   */
  static createUserMessage(content: string, overrides: Partial<TestMessage> = {}): TestMessage {
    return {
      role: 'user',
      content,
      metadata: {},
      createdAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Generate a single assistant message
   * @param content - Message content
   * @param overrides - Optional overrides
   * @returns Test assistant message
   */
  static createAssistantMessage(content: string, overrides: Partial<TestMessage> = {}): TestMessage {
    return {
      role: 'assistant',
      content,
      metadata: {
        tokensUsed: 200,
        processingTime: 1500,
        confidence: 85,
        sources: ['Market research', 'Industry data'],
        assumptions: ['Current market conditions'],
      },
      createdAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Generate suggested questions
   * @param count - Number of questions to generate
   * @param overrides - Optional overrides for all questions
   * @returns Array of suggested questions
   */
  static generateSuggestedQuestions(
    count: number = 4,
    overrides: Partial<TestSuggestedQuestion> = {}
  ): TestSuggestedQuestion[] {
    const questions: TestSuggestedQuestion[] = [];
    const categories: Array<'market_validation' | 'competitive_analysis' | 'execution_strategy' | 'risk_assessment'> = [
      'market_validation',
      'competitive_analysis',
      'execution_strategy',
      'risk_assessment',
    ];

    const questionTemplates = {
      market_validation: [
        'What is the total addressable market size?',
        'Who are the primary target customers?',
        'What evidence supports market demand?',
        'How quickly is this market growing?',
      ],
      competitive_analysis: [
        'Who are the main competitors in this space?',
        'What are their key strengths and weaknesses?',
        'How can we differentiate from existing solutions?',
        'What barriers to entry exist?',
      ],
      execution_strategy: [
        'What are the critical first steps to launch?',
        'What resources are needed to get started?',
        'What partnerships would be most valuable?',
        'What is the optimal go-to-market strategy?',
      ],
      risk_assessment: [
        'What are the biggest risks to success?',
        'How can we mitigate regulatory challenges?',
        'What technical challenges might we face?',
        'What market conditions could impact viability?',
      ],
    };

    for (let i = 0; i < count; i++) {
      const category = categories[i % categories.length];
      const templates = questionTemplates[category];
      const questionText = templates[i % templates.length];

      questions.push({
        questionText,
        category,
        priority: 100 - (i * 10), // Decreasing priority
        used: false,
        createdAt: new Date(),
        ...overrides,
      });
    }

    return questions;
  }

  /**
   * Create a conversation at message limit (for free tier testing)
   * @param analysisId - Analysis ID
   * @param userId - User ID
   * @param messageLimit - Message limit (default 10 for free tier)
   * @returns Test conversation at limit
   */
  static createAtMessageLimit(
    analysisId: number,
    userId: number,
    messageLimit: number = 10
  ): TestConversation {
    return this.createWithMessages(analysisId, userId, messageLimit);
  }

  /**
   * Persist a test conversation to the database
   * @param conversation - Test conversation to persist
   * @returns Persisted conversation with database ID
   */
  static async persist(conversation: TestConversation): Promise<TestConversation> {
    try {
      const insertData: any = {
        analysisId: conversation.analysisId,
        userId: conversation.userId,
        variantIds: conversation.variantIds || [],
        createdAt: conversation.createdAt || new Date(),
        updatedAt: conversation.updatedAt || new Date(),
      };

      const result = await db.insert(conversations).values(insertData).returning();
      const persistedConversation = {
        ...conversation,
        id: result[0].id,
      };

      // Persist messages if provided
      if (conversation.messages && conversation.messages.length > 0) {
        const persistedMessages = await this.persistMessages(result[0].id, conversation.messages);
        persistedConversation.messages = persistedMessages;
      }

      // Persist suggested questions if provided
      if (conversation.suggestedQuestions && conversation.suggestedQuestions.length > 0) {
        const persistedQuestions = await this.persistSuggestedQuestions(
          result[0].id,
          conversation.suggestedQuestions
        );
        persistedConversation.suggestedQuestions = persistedQuestions;
      }

      return persistedConversation;
    } catch (error) {
      console.error('Failed to persist test conversation:', error);
      throw error;
    }
  }

  /**
   * Persist conversation messages to the database
   * @param conversationId - Conversation ID
   * @param messages - Array of messages
   * @returns Persisted messages with database IDs
   */
  static async persistMessages(conversationId: number, messages: TestMessage[]): Promise<TestMessage[]> {
    try {
      const insertData = messages.map(message => ({
        conversationId,
        role: message.role,
        content: message.content,
        metadata: message.metadata || {},
        createdAt: message.createdAt || new Date(),
        editedAt: message.editedAt || null,
      }));

      const persistedMessages = await db.insert(conversationMessages).values(insertData).returning();

      return persistedMessages.map((pm, index) => ({
        ...messages[index],
        id: pm.id,
        conversationId: pm.conversationId,
      }));
    } catch (error) {
      console.error('Failed to persist conversation messages:', error);
      throw error;
    }
  }

  /**
   * Persist suggested questions to the database
   * @param conversationId - Conversation ID
   * @param questions - Array of suggested questions
   * @returns Persisted questions with database IDs
   */
  static async persistSuggestedQuestions(
    conversationId: number,
    questions: TestSuggestedQuestion[]
  ): Promise<TestSuggestedQuestion[]> {
    try {
      const insertData = questions.map(question => ({
        conversationId,
        questionText: question.questionText,
        category: question.category,
        priority: question.priority || 0,
        used: question.used || false,
        createdAt: question.createdAt || new Date(),
      }));

      const persistedQuestions = await db.insert(suggestedQuestions).values(insertData).returning();

      return persistedQuestions.map((pq, index) => ({
        ...questions[index],
        id: pq.id,
        conversationId: pq.conversationId,
      }));
    } catch (error) {
      console.error('Failed to persist suggested questions:', error);
      throw error;
    }
  }

  /**
   * Create and persist a test conversation in one step
   * @param analysisId - Analysis ID
   * @param userId - User ID
   * @param overrides - Optional overrides
   * @returns Persisted test conversation
   */
  static async createAndPersist(
    analysisId: number,
    userId: number,
    overrides: Partial<TestConversation> = {}
  ): Promise<TestConversation> {
    const conversation = this.create(analysisId, userId, overrides);
    return await this.persist(conversation);
  }

  /**
   * Create and persist a conversation with messages
   * @param analysisId - Analysis ID
   * @param userId - User ID
   * @param messageCount - Number of messages
   * @param overrides - Optional overrides
   * @returns Persisted conversation with messages
   */
  static async createAndPersistWithMessages(
    analysisId: number,
    userId: number,
    messageCount: number = 4,
    overrides: Partial<TestConversation> = {}
  ): Promise<TestConversation> {
    const conversation = this.createWithMessages(analysisId, userId, messageCount, overrides);
    return await this.persist(conversation);
  }

  /**
   * Add a message to an existing conversation
   * @param conversationId - Conversation ID
   * @param message - Message to add
   * @returns Persisted message
   */
  static async addMessage(conversationId: number, message: TestMessage): Promise<TestMessage> {
    try {
      const messages = await this.persistMessages(conversationId, [message]);
      return messages[0];
    } catch (error) {
      console.error('Failed to add message to conversation:', error);
      throw error;
    }
  }

  /**
   * Cleanup a test conversation and its messages from the database
   * @param conversationId - ID of conversation to delete
   */
  static async cleanup(conversationId: number): Promise<void> {
    try {
      if (!conversationId) {
        console.warn('No conversation ID provided for cleanup');
        return;
      }

      // Delete messages first (foreign key constraint)
      await db.delete(conversationMessages).where(eq(conversationMessages.conversationId, conversationId));
      
      // Delete suggested questions
      await db.delete(suggestedQuestions).where(eq(suggestedQuestions.conversationId, conversationId));
      
      // Delete conversation
      await db.delete(conversations).where(eq(conversations.id, conversationId));
    } catch (error) {
      console.error('Failed to cleanup test conversation:', error);
      throw error;
    }
  }

  /**
   * Cleanup multiple test conversations
   * @param conversationIds - Array of conversation IDs to delete
   */
  static async cleanupMany(conversationIds: number[]): Promise<void> {
    try {
      for (const conversationId of conversationIds) {
        await this.cleanup(conversationId);
      }
    } catch (error) {
      console.error('Failed to cleanup test conversations:', error);
      throw error;
    }
  }

  /**
   * Cleanup all conversations for a specific analysis
   * @param analysisId - Analysis ID
   */
  static async cleanupByAnalysis(analysisId: number): Promise<void> {
    try {
      const analysisConversations = await db.query.conversations.findMany({
        where: (conversations, { eq }) => eq(conversations.analysisId, analysisId),
      });

      const conversationIds = analysisConversations.map(c => c.id);
      await this.cleanupMany(conversationIds);
    } catch (error) {
      console.error('Failed to cleanup analysis conversations:', error);
      throw error;
    }
  }

  /**
   * Cleanup all conversations for a specific user
   * @param userId - User ID
   */
  static async cleanupByUser(userId: number): Promise<void> {
    try {
      const userConversations = await db.query.conversations.findMany({
        where: (conversations, { eq }) => eq(conversations.userId, userId),
      });

      const conversationIds = userConversations.map(c => c.id);
      await this.cleanupMany(conversationIds);
    } catch (error) {
      console.error('Failed to cleanup user conversations:', error);
      throw error;
    }
  }

  /**
   * Get message count for a conversation
   * @param conversationId - Conversation ID
   * @returns Message count
   */
  static async getMessageCount(conversationId: number): Promise<number> {
    try {
      const messages = await db.query.conversationMessages.findMany({
        where: (conversationMessages, { eq }) => eq(conversationMessages.conversationId, conversationId),
      });

      return messages.length;
    } catch (error) {
      console.error('Failed to get message count:', error);
      return 0;
    }
  }

  /**
   * Mark a suggested question as used
   * @param questionId - Question ID
   */
  static async markQuestionAsUsed(questionId: number): Promise<void> {
    try {
      await db.update(suggestedQuestions)
        .set({ used: true })
        .where(eq(suggestedQuestions.id, questionId));
    } catch (error) {
      console.error('Failed to mark question as used:', error);
      throw error;
    }
  }
}
