import type { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { db } from '../db';
import { conversationMessages, conversations, users } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Conversation Rate Limiting Middleware
 * Implements tier-based rate limiting for conversation messages
 */

// Tier-based conversation limits
export const CONVERSATION_LIMITS = {
  free: {
    questionsPerAnalysis: 5,
    maxMessageLength: 500,
    questionsPerDay: 20,
  },
  pro: {
    questionsPerAnalysis: Infinity,
    maxMessageLength: 1000,
    questionsPerDay: 500, // Soft limit for monitoring
  },
  enterprise: {
    questionsPerAnalysis: Infinity,
    maxMessageLength: 2000,
    questionsPerDay: Infinity,
  },
} as const;

export type UserTier = keyof typeof CONVERSATION_LIMITS;

/**
 * Get user's subscription tier
 */
function getUserTier(user: any): UserTier {
  const tier = user?.subscriptionTier || user?.plan || 'free';
  
  // Normalize tier names
  if (tier === 'business' || tier === 'enterprise') return 'enterprise';
  if (tier === 'pro' || tier === 'premium') return 'pro';
  
  return 'free';
}

/**
 * Check conversation rate limit for a specific analysis
 * Enforces per-analysis question limits based on user tier
 */
export async function checkConversationRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;
    const analysisId = parseInt(req.params.analysisId);

    if (!userId) {
      return next(AppError.createAuthenticationError('User not authenticated', 'NOT_AUTHENTICATED'));
    }

    if (isNaN(analysisId)) {
      return next(AppError.createValidationError('Invalid analysis ID', 'INVALID_ANALYSIS_ID'));
    }

    // Get user tier
    const tier = getUserTier(req.user);
    const limits = CONVERSATION_LIMITS[tier];

    // Pro and Enterprise users have unlimited questions per analysis
    if (limits.questionsPerAnalysis === Infinity) {
      return next();
    }

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
      // No conversation yet, allow first message
      return next();
    }

    const conversationId = conversation[0].id;

    // Count user messages in this conversation
    const messageCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversationMessages)
      .where(
        and(
          eq(conversationMessages.conversationId, conversationId),
          eq(conversationMessages.role, 'user')
        )
      );

    const userMessageCount = Number(messageCount[0]?.count || 0);

    // Check if limit is reached
    if (userMessageCount >= limits.questionsPerAnalysis) {
      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': limits.questionsPerAnalysis.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': 'upgrade',
      });

      return next(
        AppError.createRateLimitError(
          `You've reached the ${limits.questionsPerAnalysis} question limit for free users. Upgrade to Pro for unlimited questions.`,
          'CONVERSATION_LIMIT_REACHED',
          {
            limit: limits.questionsPerAnalysis,
            current: userMessageCount,
            tier,
            upgradeRequired: true,
          }
        )
      );
    }

    // Add rate limit headers
    const remaining = limits.questionsPerAnalysis - userMessageCount;
    res.set({
      'X-RateLimit-Limit': limits.questionsPerAnalysis.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Type': 'conversation',
    });

    next();
  } catch (error) {
    console.error('Conversation rate limiting error:', error);
    next(AppError.createSystemError('Rate limiting system error', 'RATE_LIMIT_SYSTEM_ERROR'));
  }
}

/**
 * Check daily conversation rate limit
 * Enforces per-day question limits based on user tier
 */
export async function checkDailyConversationLimit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return next(AppError.createAuthenticationError('User not authenticated', 'NOT_AUTHENTICATED'));
    }

    // Get user tier
    const tier = getUserTier(req.user);
    const limits = CONVERSATION_LIMITS[tier];

    // Enterprise users have unlimited daily questions
    if (limits.questionsPerDay === Infinity) {
      return next();
    }

    // Get today's start timestamp
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count user messages today across all conversations
    const messageCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversationMessages)
      .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
      .where(
        and(
          eq(conversations.userId, userId),
          eq(conversationMessages.role, 'user'),
          sql`${conversationMessages.createdAt} >= ${today.toISOString()}`
        )
      );

    const dailyMessageCount = Number(messageCount[0]?.count || 0);

    // Check if daily limit is reached
    if (dailyMessageCount >= limits.questionsPerDay) {
      // Calculate reset time (midnight)
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const resetInSeconds = Math.ceil((tomorrow.getTime() - Date.now()) / 1000);

      // Add rate limit headers
      res.set({
        'X-RateLimit-Daily-Limit': limits.questionsPerDay.toString(),
        'X-RateLimit-Daily-Remaining': '0',
        'X-RateLimit-Daily-Reset': resetInSeconds.toString(),
      });

      return next(
        AppError.createRateLimitError(
          `You've reached your daily limit of ${limits.questionsPerDay} questions. ${tier === 'free' ? 'Upgrade to Pro for higher limits.' : 'Limit resets at midnight.'}`,
          'DAILY_CONVERSATION_LIMIT_REACHED',
          {
            limit: limits.questionsPerDay,
            current: dailyMessageCount,
            tier,
            resetInSeconds,
            upgradeRequired: tier === 'free',
          }
        )
      );
    }

    // Add rate limit headers
    const remaining = limits.questionsPerDay - dailyMessageCount;
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const resetInSeconds = Math.ceil((tomorrow.getTime() - Date.now()) / 1000);

    res.set({
      'X-RateLimit-Daily-Limit': limits.questionsPerDay.toString(),
      'X-RateLimit-Daily-Remaining': remaining.toString(),
      'X-RateLimit-Daily-Reset': resetInSeconds.toString(),
    });

    next();
  } catch (error) {
    console.error('Daily conversation rate limiting error:', error);
    next(AppError.createSystemError('Rate limiting system error', 'RATE_LIMIT_SYSTEM_ERROR'));
  }
}

/**
 * Validate message length based on user tier
 */
export function validateMessageLength(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const content = req.body?.content;

    if (!content || typeof content !== 'string') {
      return next(AppError.createValidationError('Message content is required', 'CONTENT_REQUIRED'));
    }

    // Get user tier
    const tier = getUserTier(req.user);
    const limits = CONVERSATION_LIMITS[tier];

    // Check message length
    if (content.length > limits.maxMessageLength) {
      return next(
        AppError.createValidationError(
          `Message exceeds maximum length of ${limits.maxMessageLength} characters for ${tier} tier`,
          'MESSAGE_TOO_LONG',
          {
            maxLength: limits.maxMessageLength,
            currentLength: content.length,
            tier,
          }
        )
      );
    }

    next();
  } catch (error) {
    console.error('Message length validation error:', error);
    next(AppError.createSystemError('Validation system error', 'VALIDATION_SYSTEM_ERROR'));
  }
}

/**
 * Get remaining questions for a user on a specific analysis
 */
export async function getRemainingQuestions(
  userId: number,
  analysisId: number,
  userTier: UserTier
): Promise<{ remaining: number; limit: number; unlimited: boolean }> {
  const limits = CONVERSATION_LIMITS[userTier];

  // Pro and Enterprise users have unlimited questions
  if (limits.questionsPerAnalysis === Infinity) {
    return {
      remaining: Infinity,
      limit: Infinity,
      unlimited: true,
    };
  }

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
    // No conversation yet, all questions available
    return {
      remaining: limits.questionsPerAnalysis,
      limit: limits.questionsPerAnalysis,
      unlimited: false,
    };
  }

  const conversationId = conversation[0].id;

  // Count user messages in this conversation
  const messageCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(conversationMessages)
    .where(
      and(
        eq(conversationMessages.conversationId, conversationId),
        eq(conversationMessages.role, 'user')
      )
    );

  const userMessageCount = Number(messageCount[0]?.count || 0);
  const remaining = Math.max(0, limits.questionsPerAnalysis - userMessageCount);

  return {
    remaining,
    limit: limits.questionsPerAnalysis,
    unlimited: false,
  };
}

/**
 * Get daily remaining questions for a user
 */
export async function getDailyRemainingQuestions(
  userId: number,
  userTier: UserTier
): Promise<{ remaining: number; limit: number; unlimited: boolean; resetAt: Date }> {
  const limits = CONVERSATION_LIMITS[userTier];

  // Calculate reset time (midnight)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Enterprise users have unlimited daily questions
  if (limits.questionsPerDay === Infinity) {
    return {
      remaining: Infinity,
      limit: Infinity,
      unlimited: true,
      resetAt: tomorrow,
    };
  }

  // Count user messages today across all conversations
  const messageCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(conversationMessages)
    .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
    .where(
      and(
        eq(conversations.userId, userId),
        eq(conversationMessages.role, 'user'),
        sql`${conversationMessages.createdAt} >= ${today.toISOString()}`
      )
    );

  const dailyMessageCount = Number(messageCount[0]?.count || 0);
  const remaining = Math.max(0, limits.questionsPerDay - dailyMessageCount);

  return {
    remaining,
    limit: limits.questionsPerDay,
    unlimited: false,
    resetAt: tomorrow,
  };
}
