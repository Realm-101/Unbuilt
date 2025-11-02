import { db } from '../db';
import { conversationAnalytics, conversationMessages, conversations, users } from '@shared/schema';
import { eq, and, sql, gte } from 'drizzle-orm';

/**
 * Usage Tracking Service
 * Tracks conversation usage, token consumption, and generates usage statistics
 */

export interface UsageStats {
  questionsAsked: number;
  tokensUsed: number;
  conversationsStarted: number;
  averageQuestionsPerConversation: number;
  totalCost: number;
}

export interface MonthlyUsageStats extends UsageStats {
  month: string;
  year: number;
  dailyBreakdown: DailyUsageStats[];
}

export interface DailyUsageStats {
  date: string;
  questionsAsked: number;
  tokensUsed: number;
  cost: number;
}

export interface AnalysisUsageStats {
  analysisId: number;
  conversationId: number;
  questionsAsked: number;
  tokensUsed: number;
  averageResponseTime: number;
  firstMessageAt: Date;
  lastMessageAt: Date;
  cost: number;
}

/**
 * Track a question asked in a conversation
 * Updates conversation analytics with question count and token usage
 */
export async function trackQuestionAsked(
  conversationId: number,
  tokensUsed: { input: number; output: number; total: number },
  responseTime: number
): Promise<void> {
  try {
    // Get existing analytics
    const existing = await db
      .select()
      .from(conversationAnalytics)
      .where(eq(conversationAnalytics.conversationId, conversationId))
      .limit(1);

    if (existing.length === 0) {
      // Create new analytics record
      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (conversation.length === 0) {
        throw new Error('Conversation not found');
      }

      await db.insert(conversationAnalytics).values({
        conversationId,
        userId: conversation[0].userId,
        messageCount: 1,
        totalTokensUsed: tokensUsed.total,
        avgResponseTime: responseTime,
        userSatisfaction: null,
      });
    } else {
      // Update existing analytics
      const current = existing[0];
      const newMessageCount = current.messageCount + 1;
      const newTotalTokens = current.totalTokensUsed + tokensUsed.total;
      
      // Calculate new average response time
      const newAvgResponseTime = 
        (current.avgResponseTime * current.messageCount + responseTime) / newMessageCount;

      await db
        .update(conversationAnalytics)
        .set({
          messageCount: newMessageCount,
          totalTokensUsed: newTotalTokens,
          avgResponseTime: Math.round(newAvgResponseTime),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(conversationAnalytics.conversationId, conversationId));
    }
  } catch (error) {
    console.error('Error tracking question:', error);
    // Don't throw - tracking failures shouldn't break the conversation flow
  }
}

/**
 * Get usage statistics for a specific user
 */
export async function getUserUsageStats(
  userId: number,
  startDate?: Date,
  endDate?: Date
): Promise<UsageStats> {
  try {
    const start = startDate || new Date(0); // Beginning of time if not specified
    const end = endDate || new Date(); // Now if not specified

    // Get all conversations for the user in the date range
    const userConversations = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.userId, userId),
          gte(conversations.createdAt, start.toISOString()),
          sql`${conversations.createdAt} <= ${end.toISOString()}`
        )
      );

    if (userConversations.length === 0) {
      return {
        questionsAsked: 0,
        tokensUsed: 0,
        conversationsStarted: 0,
        averageQuestionsPerConversation: 0,
        totalCost: 0,
      };
    }

    const conversationIds = userConversations.map(c => c.id);

    // Get analytics for these conversations
    const analytics = await db
      .select()
      .from(conversationAnalytics)
      .where(
        and(
          eq(conversationAnalytics.userId, userId),
          sql`${conversationAnalytics.conversationId} = ANY(${conversationIds})`
        )
      );

    // Calculate totals
    const totalQuestions = analytics.reduce((sum, a) => sum + a.messageCount, 0);
    const totalTokens = analytics.reduce((sum, a) => sum + a.totalTokensUsed, 0);
    const conversationsStarted = userConversations.length;
    const averageQuestions = conversationsStarted > 0 
      ? totalQuestions / conversationsStarted 
      : 0;

    // Calculate cost (using Gemini 2.5 Pro pricing)
    // Input: $0.00125 per 1K tokens, Output: $0.005 per 1K tokens
    // Assuming 40% input, 60% output for estimation
    const inputTokens = totalTokens * 0.4;
    const outputTokens = totalTokens * 0.6;
    const totalCost = (inputTokens / 1000 * 0.00125) + (outputTokens / 1000 * 0.005);

    return {
      questionsAsked: totalQuestions,
      tokensUsed: totalTokens,
      conversationsStarted,
      averageQuestionsPerConversation: Math.round(averageQuestions * 10) / 10,
      totalCost: Math.round(totalCost * 100) / 100,
    };
  } catch (error) {
    console.error('Error getting user usage stats:', error);
    throw error;
  }
}

/**
 * Get monthly usage statistics for a user
 */
export async function getMonthlyUsageStats(
  userId: number,
  year: number,
  month: number
): Promise<MonthlyUsageStats> {
  try {
    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Get overall stats for the month
    const monthStats = await getUserUsageStats(userId, startDate, endDate);

    // Get daily breakdown
    const dailyBreakdown: DailyUsageStats[] = [];
    const daysInMonth = endDate.getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
      const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);

      const dayStats = await getUserUsageStats(userId, dayStart, dayEnd);

      dailyBreakdown.push({
        date: dayStart.toISOString().split('T')[0],
        questionsAsked: dayStats.questionsAsked,
        tokensUsed: dayStats.tokensUsed,
        cost: dayStats.totalCost,
      });
    }

    return {
      ...monthStats,
      month: startDate.toLocaleString('default', { month: 'long' }),
      year,
      dailyBreakdown,
    };
  } catch (error) {
    console.error('Error getting monthly usage stats:', error);
    throw error;
  }
}

/**
 * Get usage statistics for a specific analysis/conversation
 */
export async function getAnalysisUsageStats(
  analysisId: number,
  userId: number
): Promise<AnalysisUsageStats | null> {
  try {
    // Get conversation for this analysis
    const conversation = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.analysisId, analysisId),
          eq(conversations.userId, userId)
        )
      )
      .limit(1);

    if (conversation.length === 0) {
      return null;
    }

    const conversationId = conversation[0].id;

    // Get analytics
    const analytics = await db
      .select()
      .from(conversationAnalytics)
      .where(eq(conversationAnalytics.conversationId, conversationId))
      .limit(1);

    if (analytics.length === 0) {
      return {
        analysisId,
        conversationId,
        questionsAsked: 0,
        tokensUsed: 0,
        averageResponseTime: 0,
        firstMessageAt: new Date(conversation[0].createdAt),
        lastMessageAt: new Date(conversation[0].updatedAt),
        cost: 0,
      };
    }

    const analytic = analytics[0];

    // Get first and last message timestamps
    const messages = await db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.conversationId, conversationId))
      .orderBy(conversationMessages.createdAt);

    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];

    // Calculate cost
    const inputTokens = analytic.totalTokensUsed * 0.4;
    const outputTokens = analytic.totalTokensUsed * 0.6;
    const cost = (inputTokens / 1000 * 0.00125) + (outputTokens / 1000 * 0.005);

    return {
      analysisId,
      conversationId,
      questionsAsked: analytic.messageCount,
      tokensUsed: analytic.totalTokensUsed,
      averageResponseTime: analytic.avgResponseTime,
      firstMessageAt: new Date(firstMessage?.createdAt || conversation[0].createdAt),
      lastMessageAt: new Date(lastMessage?.createdAt || conversation[0].updatedAt),
      cost: Math.round(cost * 100) / 100,
    };
  } catch (error) {
    console.error('Error getting analysis usage stats:', error);
    throw error;
  }
}

/**
 * Get total token usage for a user in the current month
 */
export async function getCurrentMonthTokenUsage(userId: number): Promise<number> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = await getUserUsageStats(userId, startOfMonth);
    return stats.tokensUsed;
  } catch (error) {
    console.error('Error getting current month token usage:', error);
    return 0;
  }
}

/**
 * Get total questions asked by a user in the current month
 */
export async function getCurrentMonthQuestionCount(userId: number): Promise<number> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = await getUserUsageStats(userId, startOfMonth);
    return stats.questionsAsked;
  } catch (error) {
    console.error('Error getting current month question count:', error);
    return 0;
  }
}

/**
 * Get usage summary for all users (admin function)
 */
export async function getAllUsersUsageSummary(
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalUsers: number;
  totalQuestions: number;
  totalTokens: number;
  totalCost: number;
  averageQuestionsPerUser: number;
  averageTokensPerUser: number;
}> {
  try {
    const start = startDate || new Date(0);
    const end = endDate || new Date();

    // Get all users
    const allUsers = await db.select().from(users);

    let totalQuestions = 0;
    let totalTokens = 0;
    let totalCost = 0;

    // Aggregate stats for all users
    for (const user of allUsers) {
      const stats = await getUserUsageStats(user.id, start, end);
      totalQuestions += stats.questionsAsked;
      totalTokens += stats.tokensUsed;
      totalCost += stats.totalCost;
    }

    const totalUsers = allUsers.length;

    return {
      totalUsers,
      totalQuestions,
      totalTokens,
      totalCost: Math.round(totalCost * 100) / 100,
      averageQuestionsPerUser: totalUsers > 0 
        ? Math.round((totalQuestions / totalUsers) * 10) / 10 
        : 0,
      averageTokensPerUser: totalUsers > 0 
        ? Math.round(totalTokens / totalUsers) 
        : 0,
    };
  } catch (error) {
    console.error('Error getting all users usage summary:', error);
    throw error;
  }
}

/**
 * Store usage data in conversation analytics
 * This is called after each AI response is generated
 */
export async function storeUsageData(
  conversationId: number,
  tokensUsed: { input: number; output: number; total: number },
  responseTime: number,
  cost: number
): Promise<void> {
  try {
    await trackQuestionAsked(conversationId, tokensUsed, responseTime);
    
    // Log usage for monitoring
    console.log(`[USAGE] Conversation ${conversationId}: ${tokensUsed.total} tokens, ${responseTime}ms, $${cost.toFixed(4)}`);
  } catch (error) {
    console.error('Error storing usage data:', error);
    // Don't throw - tracking failures shouldn't break the conversation flow
  }
}

/**
 * Calculate cost for token usage
 * Using Gemini 2.5 Pro pricing
 */
export function calculateCost(tokensUsed: { input: number; output: number }): number {
  // Gemini 2.5 Pro pricing (as of 2025)
  // Input: $0.00125 per 1K tokens
  // Output: $0.005 per 1K tokens
  const inputCost = (tokensUsed.input / 1000) * 0.00125;
  const outputCost = (tokensUsed.output / 1000) * 0.005;
  
  return inputCost + outputCost;
}

export const usageTrackingService = {
  trackQuestionAsked,
  getUserUsageStats,
  getMonthlyUsageStats,
  getAnalysisUsageStats,
  getCurrentMonthTokenUsage,
  getCurrentMonthQuestionCount,
  getAllUsersUsageSummary,
  storeUsageData,
  calculateCost,
};
