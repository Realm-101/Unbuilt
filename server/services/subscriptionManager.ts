import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Subscription tier limits
 */
export const SUBSCRIPTION_LIMITS = {
  free: {
    searches: 5,
    exports: 3,
    aiAnalysis: false,
    advancedExports: false,
    collaboration: false,
    prioritySupport: false,
  },
  pro: {
    searches: 100,
    exports: 50,
    aiAnalysis: true,
    advancedExports: true,
    collaboration: false,
    prioritySupport: false,
  },
  business: {
    searches: 500,
    exports: 200,
    aiAnalysis: true,
    advancedExports: true,
    collaboration: true,
    prioritySupport: true,
  },
  enterprise: {
    searches: -1, // unlimited
    exports: -1, // unlimited
    aiAnalysis: true,
    advancedExports: true,
    collaboration: true,
    prioritySupport: true,
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_LIMITS;

/**
 * Check if user has an active subscription
 */
export async function hasActiveSubscription(userId: number): Promise<boolean> {
  const [user] = await db.select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return false;
  }

  // Check if subscription is active and not expired
  if (user.subscriptionStatus === 'active' && user.subscriptionPeriodEnd) {
    const periodEnd = new Date(user.subscriptionPeriodEnd);
    return periodEnd > new Date();
  }

  return false;
}

/**
 * Get user's subscription tier
 */
export async function getUserSubscriptionTier(userId: number): Promise<SubscriptionTier> {
  const [user] = await db.select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return 'free';
  }

  // Check if subscription is expired
  if (user.subscriptionPeriodEnd) {
    const periodEnd = new Date(user.subscriptionPeriodEnd);
    if (periodEnd < new Date()) {
      // Subscription expired, downgrade to free
      await db.update(users)
        .set({ 
          subscriptionTier: 'free',
          subscriptionStatus: 'expired',
        })
        .where(eq(users.id, userId));
      return 'free';
    }
  }

  return (user.subscriptionTier as SubscriptionTier) || 'free';
}

/**
 * Get subscription limits for a user
 */
export async function getUserLimits(userId: number) {
  const tier = await getUserSubscriptionTier(userId);
  return SUBSCRIPTION_LIMITS[tier];
}

/**
 * Check if user can perform an action based on their subscription
 */
export async function canPerformAction(
  userId: number,
  action: 'search' | 'export' | 'aiAnalysis' | 'advancedExports' | 'collaboration'
): Promise<{ allowed: boolean; reason?: string }> {
  const [user] = await db.select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  const limits = await getUserLimits(userId);

  switch (action) {
    case 'search':
      if (limits.searches === -1) {
        return { allowed: true };
      }
      if (user.searchCount >= limits.searches) {
        return { 
          allowed: false, 
          reason: `Search limit reached (${limits.searches} searches per month). Upgrade to continue.` 
        };
      }
      return { allowed: true };

    case 'export':
      // This would need to track export count - for now just check if feature is available
      return { allowed: true };

    case 'aiAnalysis':
      if (!limits.aiAnalysis) {
        return { 
          allowed: false, 
          reason: 'AI analysis is only available on Pro plans and above. Upgrade to access this feature.' 
        };
      }
      return { allowed: true };

    case 'advancedExports':
      if (!limits.advancedExports) {
        return { 
          allowed: false, 
          reason: 'Advanced exports (PDF, Excel, PowerPoint) are only available on Pro plans and above.' 
        };
      }
      return { allowed: true };

    case 'collaboration':
      if (!limits.collaboration) {
        return { 
          allowed: false, 
          reason: 'Collaboration features are only available on Business plans and above.' 
        };
      }
      return { allowed: true };

    default:
      return { allowed: false, reason: 'Unknown action' };
  }
}

/**
 * Increment user's search count
 */
export async function incrementSearchCount(userId: number): Promise<void> {
  const [user] = await db.select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  // Check if we need to reset the count (monthly reset)
  const lastReset = user.lastResetDate ? new Date(user.lastResetDate) : new Date();
  const now = new Date();
  const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceReset >= 30) {
    // Reset count
    await db.update(users)
      .set({ 
        searchCount: 1,
        lastResetDate: now.toISOString(),
      })
      .where(eq(users.id, userId));
  } else {
    // Increment count
    await db.update(users)
      .set({ 
        searchCount: user.searchCount + 1,
      })
      .where(eq(users.id, userId));
  }
}

/**
 * Update user's subscription
 */
export async function updateSubscription(
  userId: number,
  tier: SubscriptionTier,
  status: string,
  periodEnd?: Date
): Promise<void> {
  await db.update(users)
    .set({
      subscriptionTier: tier,
      subscriptionStatus: status,
      subscriptionPeriodEnd: periodEnd?.toISOString(),
    })
    .where(eq(users.id, userId));
}

/**
 * Cancel user's subscription (downgrade to free)
 */
export async function cancelSubscription(userId: number): Promise<void> {
  await db.update(users)
    .set({
      subscriptionTier: 'free',
      subscriptionStatus: 'canceled',
      subscriptionPeriodEnd: null,
    })
    .where(eq(users.id, userId));
}

/**
 * Get subscription status for display
 */
export async function getSubscriptionStatus(userId: number) {
  const [user] = await db.select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return null;
  }

  const tier = await getUserSubscriptionTier(userId);
  const limits = SUBSCRIPTION_LIMITS[tier];
  const isActive = await hasActiveSubscription(userId);

  return {
    tier,
    status: user.subscriptionStatus,
    periodEnd: user.subscriptionPeriodEnd,
    isActive,
    limits,
    usage: {
      searches: user.searchCount,
      searchesLimit: limits.searches,
    },
  };
}
