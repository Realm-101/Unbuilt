import { db } from '../db';
import { 
  conversations, 
  conversationMessages, 
  suggestedQuestions, 
  conversationAnalytics,
  type Conversation,
  type InsertConversation,
  type ConversationMessage,
  type InsertConversationMessage,
  type SuggestedQuestion,
  type InsertSuggestedQuestion,
  type ConversationAnalytics,
  type InsertConversationAnalytics,
  type UpdateConversationAnalytics
} from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

/**
 * Conversation Repository
 * Provides data access methods for conversation-related operations
 */
export class ConversationRepository {
  /**
   * Get or create a conversation for an analysis
   */
  async getOrCreateConversation(
    analysisId: number,
    userId: number
  ): Promise<Conversation> {
    // Try to find existing conversation
    const existing = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.analysisId, analysisId),
          eq(conversations.userId, userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new conversation
    const [newConversation] = await db
      .insert(conversations)
      .values({
        analysisId,
        userId,
        variantIds: [],
      })
      .returning();

    // Initialize analytics
    await db.insert(conversationAnalytics).values({
      conversationId: newConversation.id,
      userId,
      messageCount: 0,
      totalTokensUsed: 0,
      avgResponseTime: 0,
    });

    return newConversation;
  }

  /**
   * Get conversation by ID
   */
  async getConversationById(conversationId: number): Promise<Conversation | undefined> {
    const result = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    return result[0];
  }

  /**
   * Get conversation by analysis ID and user ID
   */
  async getConversationByAnalysis(
    analysisId: number,
    userId: number
  ): Promise<Conversation | undefined> {
    const result = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.analysisId, analysisId),
          eq(conversations.userId, userId)
        )
      )
      .limit(1);

    return result[0];
  }

  /**
   * Update conversation variant IDs
   */
  async updateVariantIds(
    conversationId: number,
    variantIds: string[]
  ): Promise<void> {
    await db
      .update(conversations)
      .set({
        variantIds: variantIds,
        updatedAt: sql`NOW()`,
      })
      .where(eq(conversations.id, conversationId));
  }

  /**
   * Delete conversation and all related data
   */
  async deleteConversation(conversationId: number): Promise<void> {
    // Foreign key constraints with CASCADE will handle related records
    await db
      .delete(conversations)
      .where(eq(conversations.id, conversationId));
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(
    message: InsertConversationMessage
  ): Promise<ConversationMessage> {
    const [newMessage] = await db
      .insert(conversationMessages)
      .values(message)
      .returning();

    // Update conversation timestamp
    await db
      .update(conversations)
      .set({ updatedAt: sql`NOW()` })
      .where(eq(conversations.id, message.conversationId));

    return newMessage;
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(
    conversationId: number,
    limit?: number,
    offset?: number
  ): Promise<ConversationMessage[]> {
    let query = db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.conversationId, conversationId))
      .orderBy(conversationMessages.createdAt);

    if (limit !== undefined) {
      query = query.limit(limit) as any;
    }

    if (offset !== undefined) {
      query = query.offset(offset) as any;
    }

    return await query;
  }

  /**
   * Get message count for a conversation
   */
  async getMessageCount(conversationId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversationMessages)
      .where(eq(conversationMessages.conversationId, conversationId));

    return Number(result[0]?.count || 0);
  }

  /**
   * Update a message (for edits)
   */
  async updateMessage(
    messageId: number,
    content: string
  ): Promise<ConversationMessage | undefined> {
    const [updated] = await db
      .update(conversationMessages)
      .set({
        content,
        editedAt: sql`NOW()`,
      })
      .where(eq(conversationMessages.id, messageId))
      .returning();

    return updated;
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: number): Promise<void> {
    await db
      .delete(conversationMessages)
      .where(eq(conversationMessages.id, messageId));
  }

  /**
   * Add suggested questions
   */
  async addSuggestedQuestions(
    questions: InsertSuggestedQuestion[]
  ): Promise<SuggestedQuestion[]> {
    if (questions.length === 0) {
      return [];
    }

    return await db
      .insert(suggestedQuestions)
      .values(questions)
      .returning();
  }

  /**
   * Get suggested questions for a conversation
   */
  async getSuggestedQuestions(
    conversationId: number,
    includeUsed: boolean = false
  ): Promise<SuggestedQuestion[]> {
    const conditions = [eq(suggestedQuestions.conversationId, conversationId)];

    if (!includeUsed) {
      conditions.push(eq(suggestedQuestions.used, false));
    }

    return await db
      .select()
      .from(suggestedQuestions)
      .where(and(...conditions))
      .orderBy(desc(suggestedQuestions.priority));
  }

  /**
   * Mark a suggested question as used
   */
  async markQuestionAsUsed(questionId: number): Promise<void> {
    await db
      .update(suggestedQuestions)
      .set({ used: true })
      .where(eq(suggestedQuestions.id, questionId));
  }

  /**
   * Delete suggested questions for a conversation
   */
  async deleteSuggestedQuestions(conversationId: number): Promise<void> {
    await db
      .delete(suggestedQuestions)
      .where(eq(suggestedQuestions.conversationId, conversationId));
  }

  /**
   * Get conversation analytics
   */
  async getAnalytics(
    conversationId: number
  ): Promise<ConversationAnalytics | undefined> {
    const result = await db
      .select()
      .from(conversationAnalytics)
      .where(eq(conversationAnalytics.conversationId, conversationId))
      .limit(1);

    return result[0];
  }

  /**
   * Update conversation analytics
   */
  async updateAnalytics(
    conversationId: number,
    updates: Partial<UpdateConversationAnalytics>
  ): Promise<void> {
    await db
      .update(conversationAnalytics)
      .set({
        ...updates,
        updatedAt: sql`NOW()`,
      })
      .where(eq(conversationAnalytics.conversationId, conversationId));
  }

  /**
   * Increment message count in analytics
   */
  async incrementMessageCount(conversationId: number): Promise<void> {
    await db
      .update(conversationAnalytics)
      .set({
        messageCount: sql`${conversationAnalytics.messageCount} + 1`,
        updatedAt: sql`NOW()`,
      })
      .where(eq(conversationAnalytics.conversationId, conversationId));
  }

  /**
   * Add tokens to total usage
   */
  async addTokenUsage(conversationId: number, tokens: number): Promise<void> {
    await db
      .update(conversationAnalytics)
      .set({
        totalTokensUsed: sql`${conversationAnalytics.totalTokensUsed} + ${tokens}`,
        updatedAt: sql`NOW()`,
      })
      .where(eq(conversationAnalytics.conversationId, conversationId));
  }

  /**
   * Update average response time
   */
  async updateAvgResponseTime(
    conversationId: number,
    newResponseTime: number
  ): Promise<void> {
    // Get current analytics
    const analytics = await this.getAnalytics(conversationId);
    if (!analytics) return;

    // Calculate new average
    const currentAvg = analytics.avgResponseTime;
    const messageCount = analytics.messageCount;
    const newAvg = Math.round(
      (currentAvg * (messageCount - 1) + newResponseTime) / messageCount
    );

    await db
      .update(conversationAnalytics)
      .set({
        avgResponseTime: newAvg,
        updatedAt: sql`NOW()`,
      })
      .where(eq(conversationAnalytics.conversationId, conversationId));
  }

  /**
   * Get user's conversation count
   */
  async getUserConversationCount(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(eq(conversations.userId, userId));

    return Number(result[0]?.count || 0);
  }

  /**
   * Get user's total message count across all conversations
   */
  async getUserTotalMessages(userId: number): Promise<number> {
    const result = await db
      .select({ total: sql<number>`sum(${conversationAnalytics.messageCount})` })
      .from(conversationAnalytics)
      .where(eq(conversationAnalytics.userId, userId));

    return Number(result[0]?.total || 0);
  }

  /**
   * Get user's total token usage across all conversations
   */
  async getUserTotalTokens(userId: number): Promise<number> {
    const result = await db
      .select({ total: sql<number>`sum(${conversationAnalytics.totalTokensUsed})` })
      .from(conversationAnalytics)
      .where(eq(conversationAnalytics.userId, userId));

    return Number(result[0]?.total || 0);
  }

  /**
   * Transaction wrapper for atomic operations
   */
  async transaction<T>(
    callback: (tx: any) => Promise<T>
  ): Promise<T> {
    return await db.transaction(callback);
  }

  /**
   * Get a message by ID
   */
  async getMessageById(messageId: number): Promise<ConversationMessage | null> {
    const result = await db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.id, messageId))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  }

  /**
   * Update message metadata
   */
  async updateMessageMetadata(
    messageId: number,
    metadata: Record<string, any>
  ): Promise<void> {
    await db
      .update(conversationMessages)
      .set({ metadata })
      .where(eq(conversationMessages.id, messageId));
  }
}

// Export singleton instance
export const conversationRepository = new ConversationRepository();
