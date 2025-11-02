/**
 * Feature Flag Service
 * 
 * Manages feature flags for gradual rollout and A/B testing.
 * Supports percentage-based rollout, user-based targeting, and tier-based access.
 */

import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { featureFlags, userFeatureFlags } from '@shared/schema';
import { logger } from '../config/logger';

export interface FeatureFlag {
  id: number;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  allowedTiers: string[];
  allowedUserIds: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureFlagCheck {
  enabled: boolean;
  reason: string;
}

class FeatureFlagService {
  private cache: Map<string, FeatureFlag> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if a feature is enabled for a specific user
   */
  async isFeatureEnabled(
    featureName: string,
    userId?: number,
    userTier?: string
  ): Promise<FeatureFlagCheck> {
    try {
      const flag = await this.getFeatureFlag(featureName);

      if (!flag) {
        logger.warn(`Feature flag not found: ${featureName}`);
        return { enabled: false, reason: 'Feature flag not found' };
      }

      // Check if feature is globally disabled
      if (!flag.enabled) {
        return { enabled: false, reason: 'Feature globally disabled' };
      }

      // Check if user is explicitly allowed
      if (userId && flag.allowedUserIds.includes(userId)) {
        return { enabled: true, reason: 'User explicitly allowed' };
      }

      // Check tier-based access
      if (userTier && flag.allowedTiers.length > 0) {
        if (!flag.allowedTiers.includes(userTier)) {
          return { enabled: false, reason: `Tier ${userTier} not allowed` };
        }
      }

      // Check rollout percentage
      if (flag.rolloutPercentage < 100) {
        if (!userId) {
          return { enabled: false, reason: 'User ID required for percentage rollout' };
        }

        const userHash = this.hashUserId(userId, featureName);
        const isInRollout = userHash < flag.rolloutPercentage;

        if (!isInRollout) {
          return { enabled: false, reason: `User not in ${flag.rolloutPercentage}% rollout` };
        }
      }

      return { enabled: true, reason: 'Feature enabled' };
    } catch (error) {
      logger.error('Error checking feature flag', { featureName, userId, error });
      return { enabled: false, reason: 'Error checking feature flag' };
    }
  }

  /**
   * Get feature flag configuration
   */
  async getFeatureFlag(featureName: string): Promise<FeatureFlag | null> {
    // Check cache first
    const cached = this.getCachedFlag(featureName);
    if (cached) {
      return cached;
    }

    try {
      const flag = await db.query.featureFlags.findFirst({
        where: eq(featureFlags.name, featureName)
      });

      if (flag) {
        this.cacheFlag(featureName, flag);
      }

      return flag || null;
    } catch (error) {
      logger.error('Error fetching feature flag', { featureName, error });
      return null;
    }
  }

  /**
   * Create or update a feature flag
   */
  async upsertFeatureFlag(
    name: string,
    config: {
      description?: string;
      enabled?: boolean;
      rolloutPercentage?: number;
      allowedTiers?: string[];
      allowedUserIds?: number[];
    }
  ): Promise<FeatureFlag> {
    try {
      const existing = await this.getFeatureFlag(name);

      if (existing) {
        // Update existing flag
        const [updated] = await db
          .update(featureFlags)
          .set({
            ...config,
            updatedAt: new Date()
          })
          .where(eq(featureFlags.name, name))
          .returning();

        this.invalidateCache(name);
        logger.info('Feature flag updated', { name, config });
        return updated;
      } else {
        // Create new flag
        const [created] = await db
          .insert(featureFlags)
          .values({
            name,
            description: config.description || '',
            enabled: config.enabled ?? false,
            rolloutPercentage: config.rolloutPercentage ?? 0,
            allowedTiers: config.allowedTiers || [],
            allowedUserIds: config.allowedUserIds || []
          })
          .returning();

        logger.info('Feature flag created', { name, config });
        return created;
      }
    } catch (error) {
      logger.error('Error upserting feature flag', { name, config, error });
      throw error;
    }
  }

  /**
   * Update rollout percentage for gradual rollout
   */
  async updateRolloutPercentage(
    featureName: string,
    percentage: number
  ): Promise<void> {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }

    await this.upsertFeatureFlag(featureName, {
      rolloutPercentage: percentage
    });

    logger.info('Rollout percentage updated', { featureName, percentage });
  }

  /**
   * Enable feature for specific users (beta testers)
   */
  async addUserToFeature(featureName: string, userId: number): Promise<void> {
    const flag = await this.getFeatureFlag(featureName);
    if (!flag) {
      throw new Error(`Feature flag not found: ${featureName}`);
    }

    const allowedUserIds = [...flag.allowedUserIds];
    if (!allowedUserIds.includes(userId)) {
      allowedUserIds.push(userId);
      await this.upsertFeatureFlag(featureName, { allowedUserIds });
    }

    logger.info('User added to feature', { featureName, userId });
  }

  /**
   * Remove user from feature
   */
  async removeUserFromFeature(featureName: string, userId: number): Promise<void> {
    const flag = await this.getFeatureFlag(featureName);
    if (!flag) {
      throw new Error(`Feature flag not found: ${featureName}`);
    }

    const allowedUserIds = flag.allowedUserIds.filter(id => id !== userId);
    await this.upsertFeatureFlag(featureName, { allowedUserIds });

    logger.info('User removed from feature', { featureName, userId });
  }

  /**
   * Get all feature flags
   */
  async getAllFeatureFlags(): Promise<FeatureFlag[]> {
    try {
      return await db.query.featureFlags.findMany({
        orderBy: (flags, { asc }) => [asc(flags.name)]
      });
    } catch (error) {
      logger.error('Error fetching all feature flags', { error });
      return [];
    }
  }

  /**
   * Get features enabled for a user
   */
  async getUserFeatures(userId: number, userTier?: string): Promise<string[]> {
    try {
      const allFlags = await this.getAllFeatureFlags();
      const enabledFeatures: string[] = [];

      for (const flag of allFlags) {
        const check = await this.isFeatureEnabled(flag.name, userId, userTier);
        if (check.enabled) {
          enabledFeatures.push(flag.name);
        }
      }

      return enabledFeatures;
    } catch (error) {
      logger.error('Error getting user features', { userId, error });
      return [];
    }
  }

  /**
   * Hash user ID for consistent percentage-based rollout
   */
  private hashUserId(userId: number, featureName: string): number {
    // Simple hash function for consistent user bucketing
    const str = `${userId}-${featureName}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash % 100);
  }

  /**
   * Cache management
   */
  private getCachedFlag(featureName: string): FeatureFlag | null {
    const expiry = this.cacheExpiry.get(featureName);
    if (expiry && Date.now() < expiry) {
      return this.cache.get(featureName) || null;
    }
    return null;
  }

  private cacheFlag(featureName: string, flag: FeatureFlag): void {
    this.cache.set(featureName, flag);
    this.cacheExpiry.set(featureName, Date.now() + this.CACHE_TTL);
  }

  private invalidateCache(featureName: string): void {
    this.cache.delete(featureName);
    this.cacheExpiry.delete(featureName);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
    logger.info('Feature flag cache cleared');
  }
}

export const featureFlagService = new FeatureFlagService();
