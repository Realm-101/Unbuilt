import { db } from '../db';
import {
  conversations,
  conversationMessages,
  conversationAnalytics,
  searches,
  users,
} from '@shared/schema';
import { eq, and, gte, lte, sql, desc, count, avg, sum } from 'drizzle-orm';

/**
 * Conversation Metrics Service
 * 
 * Tracks and calculates key metrics for conversation feature:
 * - Engagement metrics (adoption rate, questions per conversation)
 * - Quality metrics (response time, error rate)
 * - Business metrics (conversion, retention)
 * - Cost metrics (tokens, API costs)
 */

export interface ConversationMetrics {
  // Engagement Metrics
  conversationAdoptionRate: number; // % of analyses with conversations
  avgQuestionsPerConversation: number;
  avgConversationLength: number; // in messages
  returnRate: number; // % of users who return to conversations
  totalConversations: number;
  activeConversations: number; // conversations with activity in last 7 days
  
  // Quality Metrics
  avgResponseTime: number; // in milliseconds
  responseRelevanceScore: number; // 1-5 from user ratings
  errorRate: number; // % of failed requests
  inappropriateResponseRate: number;
  
  // Business Metrics
  conversionImpact: number; // conversion rate difference
  retentionImpact: number; // retention rate difference
  avgCostPerConversation: number;
  apiCostEfficiency: number; // % of queries using optimized context
  
  // Time period
  periodStart: Date;
  periodEnd: Date;
}

export interface UserEngagementMetrics {
  userId: number;
  totalConversations: number;
  totalMessages: number;
  avgQuestionsPerConversation: number;
  lastConversationDate: Date | null;
  userSatisfactionAvg: number | null;
  totalTokensUsed: number;
}

export interface ConversationQualityMetrics {
  conversationId: number;
  messageCount: number;
  avgResponseTime: number;
  totalTokensUsed: number;
  userSatisfaction: number | null;
  errorCount: number;
  createdAt: Date;
}

/**
 * Calculate conversation adoption rate
 * % of analyses that have at least one conversation
 */
export async function calculateAdoptionRate(
  startDate: Date,
  endDate: Date
): Promise<number> {
  // Total analyses in period
  const totalAnalyses = await db
    .select({ count: count() })
    .from(searches)
    .where(
      and(
        gte(searches.timestamp, startDate.toISOString()),
        lte(searches.timestamp, endDate.toISOString())
      )
    );

  // Analyses with conversations
  const analysesWithConversations = await db
    .select({ count: count() })
    .from(searches)
    .innerJoin(conversations, eq(searches.id, conversations.analysisId))
    .where(
      and(
        gte(searches.timestamp, startDate.toISOString()),
        lte(searches.timestamp, endDate.toISOString())
      )
    );

  const total = totalAnalyses[0]?.count || 0;
  const withConversations = analysesWithConversations[0]?.count || 0;

  return total > 0 ? (withConversations / total) * 100 : 0;
}

/**
 * Calculate average questions per conversation
 */
export async function calculateAvgQuestionsPerConversation(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const result = await db
    .select({
      avgMessages: avg(conversationAnalytics.messageCount),
    })
    .from(conversationAnalytics)
    .innerJoin(conversations, eq(conversationAnalytics.conversationId, conversations.id))
    .where(
      and(
        gte(conversations.createdAt, startDate.toISOString()),
        lte(conversations.createdAt, endDate.toISOString())
      )
    );

  // Divide by 2 since each question has a response (user + AI messages)
  const avgMessages = parseFloat(result[0]?.avgMessages || '0');
  return avgMessages > 0 ? avgMessages / 2 : 0;
}

/**
 * Calculate average response time across all conversations
 */
export async function calculateAvgResponseTime(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const result = await db
    .select({
      avgTime: avg(conversationAnalytics.avgResponseTime),
    })
    .from(conversationAnalytics)
    .innerJoin(conversations, eq(conversationAnalytics.conversationId, conversations.id))
    .where(
      and(
        gte(conversations.createdAt, startDate.toISOString()),
        lte(conversations.createdAt, endDate.toISOString())
      )
    );

  return parseFloat(result[0]?.avgTime || '0');
}

/**
 * Calculate user satisfaction score (1-5 rating)
 */
export async function calculateUserSatisfaction(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const result = await db
    .select({
      avgSatisfaction: avg(conversationAnalytics.userSatisfaction),
    })
    .from(conversationAnalytics)
    .innerJoin(conversations, eq(conversationAnalytics.conversationId, conversations.id))
    .where(
      and(
        gte(conversations.createdAt, startDate.toISOString()),
        lte(conversations.createdAt, endDate.toISOString()),
        sql`${conversationAnalytics.userSatisfaction} IS NOT NULL`
      )
    );

  return parseFloat(result[0]?.avgSatisfaction || '0');
}

/**
 * Calculate return rate - % of users who return to conversations
 */
export async function calculateReturnRate(
  startDate: Date,
  endDate: Date
): Promise<number> {
  // Users who started conversations
  const usersWithConversations = await db
    .selectDistinct({ userId: conversations.userId })
    .from(conversations)
    .where(
      and(
        gte(conversations.createdAt, startDate.toISOString()),
        lte(conversations.createdAt, endDate.toISOString())
      )
    );

  const totalUsers = usersWithConversations.length;

  if (totalUsers === 0) return 0;

  // Users who returned (have messages after initial conversation creation)
  let returnedUsers = 0;
  for (const { userId } of usersWithConversations) {
    const userConversations = await db
      .select({ id: conversations.id, createdAt: conversations.createdAt })
      .from(conversations)
      .where(
        and(
          eq(conversations.userId, userId),
          gte(conversations.createdAt, startDate.toISOString()),
          lte(conversations.createdAt, endDate.toISOString())
        )
      )
      .limit(1);

    if (userConversations.length > 0) {
      const conversationId = userConversations[0].id;
      const createdAt = new Date(userConversations[0].createdAt);

      // Check if there are messages after 1 hour of creation (indicating return)
      const laterMessages = await db
        .select({ count: count() })
        .from(conversationMessages)
        .where(
          and(
            eq(conversationMessages.conversationId, conversationId),
            gte(
              conversationMessages.createdAt,
              new Date(createdAt.getTime() + 60 * 60 * 1000).toISOString()
            )
          )
        );

      if ((laterMessages[0]?.count || 0) > 0) {
        returnedUsers++;
      }
    }
  }

  return (returnedUsers / totalUsers) * 100;
}

/**
 * Calculate conversion impact
 * Compares conversion rate of users who use conversations vs those who don't
 */
export async function calculateConversionImpact(
  startDate: Date,
  endDate: Date
): Promise<number> {
  // Users who used conversations and converted to paid
  const conversationUsersConverted = await db
    .select({ count: count() })
    .from(users)
    .innerJoin(conversations, eq(users.id, conversations.userId))
    .where(
      and(
        gte(conversations.createdAt, startDate.toISOString()),
        lte(conversations.createdAt, endDate.toISOString()),
        sql`${users.subscriptionTier} != 'free'`,
        sql`${users.subscriptionStatus} = 'active'`
      )
    );

  // Total users who used conversations
  const totalConversationUsers = await db
    .selectDistinct({ userId: conversations.userId })
    .from(conversations)
    .where(
      and(
        gte(conversations.createdAt, startDate.toISOString()),
        lte(conversations.createdAt, endDate.toISOString())
      )
    );

  const conversationConversionRate =
    totalConversationUsers.length > 0
      ? ((conversationUsersConverted[0]?.count || 0) / totalConversationUsers.length) * 100
      : 0;

  // Users who didn't use conversations and converted
  const nonConversationUsersConverted = await db
    .select({ count: count() })
    .from(users)
    .leftJoin(conversations, eq(users.id, conversations.userId))
    .where(
      and(
        gte(users.createdAt, startDate.toISOString()),
        lte(users.createdAt, endDate.toISOString()),
        sql`${conversations.id} IS NULL`,
        sql`${users.subscriptionStatus} = 'active'`,
        sql`${users.subscriptionTier} != 'free'`
      )
    );

  // Total users who didn't use conversations
  const totalNonConversationUsers = await db
    .select({ count: count() })
    .from(users)
    .leftJoin(conversations, eq(users.id, conversations.userId))
    .where(
      and(
        gte(users.createdAt, startDate.toISOString()),
        lte(users.createdAt, endDate.toISOString()),
        sql`${conversations.id} IS NULL`
      )
    );

  const nonConversationConversionRate =
    (totalNonConversationUsers[0]?.count || 0) > 0
      ? ((nonConversationUsersConverted[0]?.count || 0) / (totalNonConversationUsers[0]?.count || 1)) * 100
      : 0;

  // Return the difference (positive means conversations improve conversion)
  return conversationConversionRate - nonConversationConversionRate;
}

/**
 * Calculate average cost per conversation
 */
export async function calculateAvgCostPerConversation(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const result = await db
    .select({
      totalTokens: sum(conversationAnalytics.totalTokensUsed),
      conversationCount: count(),
    })
    .from(conversationAnalytics)
    .innerJoin(conversations, eq(conversationAnalytics.conversationId, conversations.id))
    .where(
      and(
        gte(conversations.createdAt, startDate.toISOString()),
        lte(conversations.createdAt, endDate.toISOString())
      )
    );

  const totalTokens = parseInt(result[0]?.totalTokens || '0');
  const conversationCount = result[0]?.conversationCount || 0;

  if (conversationCount === 0) return 0;

  // Gemini 2.5 Pro pricing (approximate)
  // Input: $0.00125 per 1K tokens
  // Output: $0.005 per 1K tokens
  // Assuming 50/50 split for simplicity
  const avgCostPer1KTokens = (0.00125 + 0.005) / 2;
  const avgTokensPerConversation = totalTokens / conversationCount;
  const avgCost = (avgTokensPerConversation / 1000) * avgCostPer1KTokens;

  return avgCost;
}

/**
 * Get comprehensive metrics for a time period
 */
export async function getConversationMetrics(
  startDate: Date,
  endDate: Date
): Promise<ConversationMetrics> {
  const [
    adoptionRate,
    avgQuestions,
    avgResponseTime,
    userSatisfaction,
    returnRate,
    conversionImpact,
    avgCost,
  ] = await Promise.all([
    calculateAdoptionRate(startDate, endDate),
    calculateAvgQuestionsPerConversation(startDate, endDate),
    calculateAvgResponseTime(startDate, endDate),
    calculateUserSatisfaction(startDate, endDate),
    calculateReturnRate(startDate, endDate),
    calculateConversionImpact(startDate, endDate),
    calculateAvgCostPerConversation(startDate, endDate),
  ]);

  // Get total and active conversations
  const totalConversationsResult = await db
    .select({ count: count() })
    .from(conversations)
    .where(
      and(
        gte(conversations.createdAt, startDate.toISOString()),
        lte(conversations.createdAt, endDate.toISOString())
      )
    );

  const sevenDaysAgo = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const activeConversationsResult = await db
    .select({ count: count() })
    .from(conversations)
    .innerJoin(conversationMessages, eq(conversations.id, conversationMessages.conversationId))
    .where(
      and(
        gte(conversations.createdAt, startDate.toISOString()),
        lte(conversations.createdAt, endDate.toISOString()),
        gte(conversationMessages.createdAt, sevenDaysAgo.toISOString())
      )
    );

  return {
    conversationAdoptionRate: adoptionRate,
    avgQuestionsPerConversation: avgQuestions,
    avgConversationLength: avgQuestions * 2, // Each question has a response
    returnRate,
    totalConversations: totalConversationsResult[0]?.count || 0,
    activeConversations: activeConversationsResult[0]?.count || 0,
    avgResponseTime,
    responseRelevanceScore: userSatisfaction,
    errorRate: 0, // TODO: Implement error tracking
    inappropriateResponseRate: 0, // TODO: Implement from content moderation logs
    conversionImpact,
    retentionImpact: 0, // TODO: Implement retention calculation
    avgCostPerConversation: avgCost,
    apiCostEfficiency: 0, // TODO: Implement from cache hit rate
    periodStart: startDate,
    periodEnd: endDate,
  };
}

/**
 * Get user engagement metrics
 */
export async function getUserEngagementMetrics(
  userId: number,
  startDate?: Date,
  endDate?: Date
): Promise<UserEngagementMetrics> {
  const whereConditions = [eq(conversations.userId, userId)];
  
  if (startDate) {
    whereConditions.push(gte(conversations.createdAt, startDate.toISOString()));
  }
  if (endDate) {
    whereConditions.push(lte(conversations.createdAt, endDate.toISOString()));
  }

  const userConversations = await db
    .select({
      conversationId: conversations.id,
      createdAt: conversations.createdAt,
    })
    .from(conversations)
    .where(and(...whereConditions));

  const totalConversations = userConversations.length;

  if (totalConversations === 0) {
    return {
      userId,
      totalConversations: 0,
      totalMessages: 0,
      avgQuestionsPerConversation: 0,
      lastConversationDate: null,
      userSatisfactionAvg: null,
      totalTokensUsed: 0,
    };
  }

  const conversationIds = userConversations.map((c) => c.conversationId);

  const analyticsResult = await db
    .select({
      totalMessages: sum(conversationAnalytics.messageCount),
      avgSatisfaction: avg(conversationAnalytics.userSatisfaction),
      totalTokens: sum(conversationAnalytics.totalTokensUsed),
    })
    .from(conversationAnalytics)
    .where(sql`${conversationAnalytics.conversationId} IN ${conversationIds}`);

  const totalMessages = parseInt(analyticsResult[0]?.totalMessages || '0');
  const avgSatisfaction = parseFloat(analyticsResult[0]?.avgSatisfaction || '0');
  const totalTokens = parseInt(analyticsResult[0]?.totalTokens || '0');

  const lastConversation = userConversations.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];

  return {
    userId,
    totalConversations,
    totalMessages,
    avgQuestionsPerConversation: totalMessages / totalConversations / 2,
    lastConversationDate: lastConversation ? new Date(lastConversation.createdAt) : null,
    userSatisfactionAvg: avgSatisfaction > 0 ? avgSatisfaction : null,
    totalTokensUsed: totalTokens,
  };
}

/**
 * Get top performing conversations
 */
export async function getTopConversations(
  limit: number = 10,
  startDate?: Date,
  endDate?: Date
): Promise<ConversationQualityMetrics[]> {
  const whereConditions = [];
  
  if (startDate) {
    whereConditions.push(gte(conversations.createdAt, startDate.toISOString()));
  }
  if (endDate) {
    whereConditions.push(lte(conversations.createdAt, endDate.toISOString()));
  }

  const results = await db
    .select({
      conversationId: conversationAnalytics.conversationId,
      messageCount: conversationAnalytics.messageCount,
      avgResponseTime: conversationAnalytics.avgResponseTime,
      totalTokensUsed: conversationAnalytics.totalTokensUsed,
      userSatisfaction: conversationAnalytics.userSatisfaction,
      createdAt: conversations.createdAt,
    })
    .from(conversationAnalytics)
    .innerJoin(conversations, eq(conversationAnalytics.conversationId, conversations.id))
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    .orderBy(desc(conversationAnalytics.userSatisfaction), desc(conversationAnalytics.messageCount))
    .limit(limit);

  return results.map((r) => ({
    conversationId: r.conversationId,
    messageCount: r.messageCount,
    avgResponseTime: r.avgResponseTime,
    totalTokensUsed: r.totalTokensUsed,
    userSatisfaction: r.userSatisfaction,
    errorCount: 0, // TODO: Implement error tracking
    createdAt: new Date(r.createdAt),
  }));
}

/**
 * Track conversation event for metrics
 */
export async function trackConversationEvent(
  eventType: 'start' | 'message' | 'error' | 'rating' | 'export',
  conversationId: number,
  metadata?: Record<string, any>
): Promise<void> {
  // This would integrate with a logging/analytics system
  // For now, we'll just log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Conversation Event]', {
      eventType,
      conversationId,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }

  // TODO: Send to analytics service (e.g., Mixpanel, Amplitude, custom analytics)
}

export const conversationMetricsService = {
  getConversationMetrics,
  getUserEngagementMetrics,
  getTopConversations,
  calculateAdoptionRate,
  calculateAvgQuestionsPerConversation,
  calculateAvgResponseTime,
  calculateUserSatisfaction,
  calculateReturnRate,
  calculateConversionImpact,
  calculateAvgCostPerConversation,
  trackConversationEvent,
};
