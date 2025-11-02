import { conversationRepository } from './conversationRepository';
import { trackTokenUsage } from './tokenUsageTracker';
import type {
  Conversation,
  ConversationMessage,
  SuggestedQuestion,
  ConversationAnalytics,
} from '@shared/schema';

/**
 * Conversation Service
 * Business logic layer for conversation operations
 */
export class ConversationService {
  /**
   * Get or create a conversation for an analysis
   * Automatically generates initial suggested questions for new conversations
   */
  async getOrCreateConversation(
    analysisId: number,
    userId: number
  ): Promise<Conversation> {
    const conversation = await conversationRepository.getOrCreateConversation(analysisId, userId);
    
    // Check if this is a new conversation (no messages yet)
    const messageCount = await this.getMessageCount(conversation.id);
    
    if (messageCount === 0) {
      // Generate initial suggested questions
      await this.generateInitialSuggestedQuestions(conversation.id, analysisId);
    }
    
    return conversation;
  }

  /**
   * Generate initial suggested questions for a new conversation
   */
  private async generateInitialSuggestedQuestions(
    conversationId: number,
    analysisId: number
  ): Promise<void> {
    try {
      const { db } = await import('../db');
      const { searches, searchResults } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      const { generateInitialQuestions } = await import('./questionGeneratorService');
      
      // Get analysis data
      const analysis = await db
        .select()
        .from(searches)
        .where(eq(searches.id, analysisId))
        .limit(1);

      if (analysis.length === 0) {
        return; // Analysis not found, skip question generation
      }

      // Get search results for context
      const { desc } = await import('drizzle-orm');
      const results = await db
        .select()
        .from(searchResults)
        .where(eq(searchResults.searchId, analysisId))
        .orderBy(desc(searchResults.innovationScore))
        .limit(5);

      if (results.length === 0) {
        return; // No results, skip question generation
      }

      // Build analysis data
      const analysisData = {
        query: analysis[0].query,
        innovationScore: results[0]?.innovationScore,
        feasibilityRating: results[0]?.feasibility,
        topGaps: results.map(r => ({
          title: r.title,
          category: r.category,
          feasibility: r.feasibility,
          marketPotential: r.marketPotential,
          innovationScore: r.innovationScore,
        })),
      };

      // Generate initial questions
      const generatedQuestions = await generateInitialQuestions(analysisData);

      // Add questions to database
      const questionsToInsert = generatedQuestions.map(q => ({
        questionText: q.text,
        category: q.category,
        priority: q.priority,
      }));

      await this.addSuggestedQuestions(conversationId, questionsToInsert);
    } catch (error) {
      console.error('Failed to generate initial suggested questions:', error);
      // Don't throw - question generation is not critical
    }
  }

  /**
   * Get conversation with messages and suggestions
   */
  async getConversationWithDetails(conversationId: number) {
    const conversation = await conversationRepository.getConversationById(conversationId);
    if (!conversation) {
      return null;
    }

    const [messages, suggestions, analytics] = await Promise.all([
      conversationRepository.getMessages(conversationId),
      conversationRepository.getSuggestedQuestions(conversationId),
      conversationRepository.getAnalytics(conversationId),
    ]);

    return {
      conversation,
      messages,
      suggestions,
      analytics,
    };
  }

  /**
   * Add a user message to a conversation
   */
  async addUserMessage(
    conversationId: number,
    content: string
  ): Promise<ConversationMessage> {
    const message = await conversationRepository.addMessage({
      conversationId,
      role: 'user',
      content,
      metadata: {},
    });

    // Increment message count
    await conversationRepository.incrementMessageCount(conversationId);

    return message;
  }

  /**
   * Add an AI response to a conversation
   */
  async addAIResponse(
    conversationId: number,
    content: string,
    metadata: {
      tokensUsed?: {
        input: number;
        output: number;
        total: number;
      };
      processingTime?: number;
      confidence?: number;
      sources?: string[];
      assumptions?: string[];
    }
  ): Promise<ConversationMessage> {
    const message = await conversationRepository.addMessage({
      conversationId,
      role: 'assistant',
      content,
      metadata,
    });

    // Update analytics
    await conversationRepository.incrementMessageCount(conversationId);

    // Track token usage with detailed breakdown
    if (metadata.tokensUsed) {
      const { input, output, total } = metadata.tokensUsed;
      
      // Track in analytics table
      await conversationRepository.addTokenUsage(conversationId, total);
      
      // Track with cost calculation
      await trackTokenUsage(
        conversationId,
        message.id,
        input,
        output,
        metadata.processingTime || 0
      );
    }

    if (metadata.processingTime) {
      await conversationRepository.updateAvgResponseTime(
        conversationId,
        metadata.processingTime
      );
    }

    return message;
  }

  /**
   * Get messages with pagination
   */
  async getMessages(
    conversationId: number,
    limit?: number,
    offset?: number
  ): Promise<ConversationMessage[]> {
    return await conversationRepository.getMessages(conversationId, limit, offset);
  }

  /**
   * Get message count
   */
  async getMessageCount(conversationId: number): Promise<number> {
    return await conversationRepository.getMessageCount(conversationId);
  }

  /**
   * Update a message (within edit window)
   */
  async updateMessage(
    messageId: number,
    content: string
  ): Promise<ConversationMessage | undefined> {
    return await conversationRepository.updateMessage(messageId, content);
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: number): Promise<void> {
    await conversationRepository.deleteMessage(messageId);
  }

  /**
   * Add suggested questions
   */
  async addSuggestedQuestions(
    conversationId: number,
    questions: Array<{
      questionText: string;
      category: 'market_validation' | 'competitive_analysis' | 'execution_strategy' | 'risk_assessment';
      priority?: number;
    }>
  ): Promise<SuggestedQuestion[]> {
    const questionsToInsert = questions.map((q) => ({
      conversationId,
      questionText: q.questionText,
      category: q.category,
      priority: q.priority || 0,
      used: false,
    }));

    return await conversationRepository.addSuggestedQuestions(questionsToInsert);
  }

  /**
   * Get suggested questions
   */
  async getSuggestedQuestions(
    conversationId: number,
    includeUsed: boolean = false
  ): Promise<SuggestedQuestion[]> {
    return await conversationRepository.getSuggestedQuestions(conversationId, includeUsed);
  }

  /**
   * Mark a question as used
   */
  async markQuestionAsUsed(questionId: number): Promise<void> {
    await conversationRepository.markQuestionAsUsed(questionId);
  }

  /**
   * Refresh suggested questions (delete old, add new)
   */
  async refreshSuggestedQuestions(
    conversationId: number,
    newQuestions: Array<{
      questionText: string;
      category: 'market_validation' | 'competitive_analysis' | 'execution_strategy' | 'risk_assessment';
      priority?: number;
    }>
  ): Promise<SuggestedQuestion[]> {
    // Delete existing unused questions
    await conversationRepository.deleteSuggestedQuestions(conversationId);

    // Add new questions
    return await this.addSuggestedQuestions(conversationId, newQuestions);
  }

  /**
   * Clear conversation (delete all messages and suggestions)
   */
  async clearConversation(conversationId: number): Promise<void> {
    // Use repository methods to clear data
    // Messages will be deleted via repository
    const messages = await conversationRepository.getMessages(conversationId);
    for (const message of messages) {
      await conversationRepository.deleteMessage(message.id);
    }

    // Delete suggestions
    await conversationRepository.deleteSuggestedQuestions(conversationId);

    // Reset analytics
    await conversationRepository.updateAnalytics(conversationId, {
      messageCount: 0,
      totalTokensUsed: 0,
      avgResponseTime: 0,
      userSatisfaction: undefined,
    });
  }

  /**
   * Delete conversation completely
   */
  async deleteConversation(conversationId: number): Promise<void> {
    await conversationRepository.deleteConversation(conversationId);
  }

  /**
   * Get conversation analytics
   */
  async getAnalytics(conversationId: number): Promise<ConversationAnalytics | undefined> {
    return await conversationRepository.getAnalytics(conversationId);
  }

  /**
   * Update user satisfaction rating
   */
  async updateSatisfactionRating(
    conversationId: number,
    rating: number
  ): Promise<void> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    await conversationRepository.updateAnalytics(conversationId, {
      userSatisfaction: rating,
    });
  }

  /**
   * Get user's conversation statistics
   */
  async getUserStats(userId: number) {
    const [conversationCount, totalMessages, totalTokens] = await Promise.all([
      conversationRepository.getUserConversationCount(userId),
      conversationRepository.getUserTotalMessages(userId),
      conversationRepository.getUserTotalTokens(userId),
    ]);

    return {
      conversationCount,
      totalMessages,
      totalTokens,
      avgMessagesPerConversation:
        conversationCount > 0 ? Math.round(totalMessages / conversationCount) : 0,
    };
  }

  /**
   * Get token usage for a conversation
   */
  async getTokenUsage(conversationId: number) {
    const { getConversationUsage } = await import('./tokenUsageTracker');
    return await getConversationUsage(conversationId);
  }

  /**
   * Get monthly token usage for a user
   */
  async getMonthlyUsage(userId: number, year?: number, month?: number) {
    const { getMonthlyUsage, getCurrentMonthUsage } = await import('./tokenUsageTracker');
    
    if (year && month) {
      return await getMonthlyUsage(userId, year, month);
    }
    
    return await getCurrentMonthUsage(userId);
  }

  /**
   * Check if user is within token limits
   */
  async checkTokenLimits(userId: number, userTier: 'free' | 'pro' | 'enterprise') {
    const { checkTokenLimits } = await import('./tokenUsageTracker');
    return await checkTokenLimits(userId, userTier);
  }

  /**
   * Add variant to conversation
   */
  async addVariant(conversationId: number, variantId: string): Promise<void> {
    const conversation = await conversationRepository.getConversationById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const variantIds = Array.isArray(conversation.variantIds)
      ? [...conversation.variantIds, variantId]
      : [variantId];

    await conversationRepository.updateVariantIds(conversationId, variantIds);
  }

  /**
   * Rate a message (thumbs up/down)
   */
  async rateMessage(
    messageId: number,
    userId: number,
    rating: number,
    feedback?: string
  ): Promise<{ success: boolean }> {
    try {
      const message = await conversationRepository.getMessageById(messageId);

      if (!message) {
        return { success: false };
      }

      // Update message metadata with rating
      const metadata: Record<string, any> = message.metadata || {};
      metadata.rating = rating;
      metadata.ratingFeedback = feedback;
      metadata.ratedAt = new Date().toISOString();
      metadata.ratedBy = userId;

      await conversationRepository.updateMessageMetadata(messageId, metadata);

      // Log rating for analytics
      console.log(`⭐ Message rated`, {
        messageId,
        rating,
        userId,
        hasFeedback: !!feedback
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to rate message:', error);
      return { success: false };
    }
  }
}

// Export singleton instance
export const conversationService = new ConversationService();
