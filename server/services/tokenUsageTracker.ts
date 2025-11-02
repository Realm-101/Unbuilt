import { db } from "../db";
import { conversationAnalytics } from "@shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";

/**
 * Token Usage Tracker
 * 
 * Tracks token usage for conversations, calculates costs,
 * and provides usage analytics.
 */

// Pricing per 1M tokens (Gemini 2.5 Pro pricing as of 2025)
const PRICING = {
  INPUT_PER_MILLION: 1.25, // $1.25 per 1M input tokens
  OUTPUT_PER_MILLION: 5.0, // $5.00 per 1M output tokens
};

/**
 * Token usage data
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

/**
 * Monthly usage statistics
 */
export interface MonthlyUsage {
  userId: string;
  month: string;
  totalConversations: number;
  totalMessages: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

/**
 * Calculate cost from token usage
 */
export function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * PRICING.INPUT_PER_MILLION;
  const outputCost = (outputTokens / 1_000_000) * PRICING.OUTPUT_PER_MILLION;
  return inputCost + outputCost;
}

/**
 * Track token usage for a conversation message
 */
export async function trackTokenUsage(
  conversationId: number,
  messageId: number,
  inputTokens: number,
  outputTokens: number,
  processingTime: number
): Promise<void> {
  try {
    const totalTokens = inputTokens + outputTokens;
    const estimatedCost = calculateCost(inputTokens, outputTokens);
    
    // Get existing analytics record
    const existing = await db.query.conversationAnalytics.findFirst({
      where: eq(conversationAnalytics.conversationId, conversationId),
    });
    
    if (existing) {
      // Update existing record
      await db
        .update(conversationAnalytics)
        .set({
          messageCount: sql`${conversationAnalytics.messageCount} + 1`,
          totalTokensUsed: sql`${conversationAnalytics.totalTokensUsed} + ${totalTokens}`,
          avgResponseTime: sql`(${conversationAnalytics.avgResponseTime} * ${conversationAnalytics.messageCount} + ${processingTime}) / (${conversationAnalytics.messageCount} + 1)`,
          updatedAt: sql`NOW()`,
        })
        .where(eq(conversationAnalytics.conversationId, conversationId));
    } else {
      // Create new record
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversationAnalytics.conversationId, conversationId),
      });
      
      if (conversation) {
        await db.insert(conversationAnalytics).values({
          conversationId,
          userId: conversation.userId,
          messageCount: 1,
          totalTokensUsed: totalTokens,
          avgResponseTime: processingTime,
        });
      }
    }
    
    console.log(`📊 Token usage tracked:`, {
      conversationId,
      messageId,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost: `$${estimatedCost.toFixed(4)}`,
      processingTime: `${processingTime}ms`,
    });
  } catch (error) {
    console.error("Failed to track token usage:", error);
    // Don't throw - tracking failure shouldn't break the conversation
  }
}

/**
 * Get token usage for a specific conversation
 */
export async function getConversationUsage(
  conversationId: number
): Promise<TokenUsage | null> {
  try {
    const analytics = await db.query.conversationAnalytics.findFirst({
      where: eq(conversationAnalytics.conversationId, conversationId),
    });
    
    if (!analytics) {
      return null;
    }
    
    // For now, we estimate 70% input / 30% output split
    // In future, we can track these separately
    const totalTokens = analytics.totalTokensUsed;
    const inputTokens = Math.floor(totalTokens * 0.7);
    const outputTokens = totalTokens - inputTokens;
    
    return {
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost: calculateCost(inputTokens, outputTokens),
    };
  } catch (error) {
    console.error("Failed to get conversation usage:", error);
    return null;
  }
}

/**
 * Get monthly usage statistics for a user
 */
export async function getMonthlyUsage(
  userId: number,
  year: number,
  month: number
): Promise<MonthlyUsage> {
  try {
    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    // Get all analytics for user's conversations in this month
    const analytics = await db.query.conversationAnalytics.findMany({
      where: and(
        eq(conversationAnalytics.userId, userId),
        gte(conversationAnalytics.createdAt, startDate.toISOString()),
        sql`${conversationAnalytics.createdAt} <= ${endDate.toISOString()}`
      ),
    });
    
    // Aggregate statistics
    const totalConversations = analytics.length;
    const totalMessages = analytics.reduce((sum: number, a: any) => sum + a.messageCount, 0);
    const totalTokens = analytics.reduce((sum: number, a: any) => sum + a.totalTokensUsed, 0);
    
    // Estimate input/output split (70/30)
    const inputTokens = Math.floor(totalTokens * 0.7);
    const outputTokens = totalTokens - inputTokens;
    
    return {
      userId: String(userId),
      month: `${year}-${String(month).padStart(2, "0")}`,
      totalConversations,
      totalMessages,
      totalTokens,
      inputTokens,
      outputTokens,
      estimatedCost: calculateCost(inputTokens, outputTokens),
    };
  } catch (error) {
    console.error("Failed to get monthly usage:", error);
    return {
      userId: String(userId),
      month: `${year}-${String(month).padStart(2, "0")}`,
      totalConversations: 0,
      totalMessages: 0,
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0,
    };
  }
}

/**
 * Get current month usage for a user
 */
export async function getCurrentMonthUsage(userId: number): Promise<MonthlyUsage> {
  const now = new Date();
  return getMonthlyUsage(userId, now.getFullYear(), now.getMonth() + 1);
}

/**
 * Get usage summary for all users (admin)
 */
export async function getAllUsageSummary(
  year: number,
  month: number
): Promise<{
  totalConversations: number;
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  averageCostPerConversation: number;
}> {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const analytics = await db.query.conversationAnalytics.findMany({
      where: and(
        gte(conversationAnalytics.createdAt, startDate.toISOString()),
        sql`${conversationAnalytics.createdAt} <= ${endDate.toISOString()}`
      ),
    });
    
    const totalConversations = analytics.length;
    const totalMessages = analytics.reduce((sum: number, a: any) => sum + a.messageCount, 0);
    const totalTokens = analytics.reduce((sum: number, a: any) => sum + a.totalTokensUsed, 0);
    
    const inputTokens = Math.floor(totalTokens * 0.7);
    const outputTokens = totalTokens - inputTokens;
    const totalCost = calculateCost(inputTokens, outputTokens);
    
    return {
      totalConversations,
      totalMessages,
      totalTokens,
      totalCost,
      averageCostPerConversation:
        totalConversations > 0 ? totalCost / totalConversations : 0,
    };
  } catch (error) {
    console.error("Failed to get usage summary:", error);
    return {
      totalConversations: 0,
      totalMessages: 0,
      totalTokens: 0,
      totalCost: 0,
      averageCostPerConversation: 0,
    };
  }
}

/**
 * Check if user is approaching token limits (for free tier)
 */
export async function checkTokenLimits(
  userId: number,
  userTier: "free" | "pro" | "enterprise"
): Promise<{
  withinLimit: boolean;
  usage: number;
  limit: number;
  percentage: number;
}> {
  // Pro and enterprise have unlimited tokens
  if (userTier !== "free") {
    return {
      withinLimit: true,
      usage: 0,
      limit: Infinity,
      percentage: 0,
    };
  }
  
  // Free tier limit: 50,000 tokens per month
  const FREE_TIER_LIMIT = 50_000;
  
  const monthlyUsage = await getCurrentMonthUsage(userId);
  const usage = monthlyUsage.totalTokens;
  const percentage = (usage / FREE_TIER_LIMIT) * 100;
  
  return {
    withinLimit: usage < FREE_TIER_LIMIT,
    usage,
    limit: FREE_TIER_LIMIT,
    percentage,
  };
}

export { PRICING };
