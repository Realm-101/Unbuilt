import { db } from '../db';
import { 
  resourceAccessHistory, 
  resources,
  resourceAnalytics,
  type InsertResourceAccessHistory,
  type ResourceAccessHistory
} from '@shared/schema';
import { accessHistoryRepository } from '../repositories/accessHistoryRepository';
import { resourceRepository } from '../repositories/resourceRepository';
import { eq, sql, and } from 'drizzle-orm';

export interface LogAccessParams {
  userId: number;
  resourceId: number;
  analysisId?: number;
  actionPlanStepId?: string;
  accessType: 'view' | 'download' | 'external_link';
}

export interface AccessTrackingResult {
  success: boolean;
  accessRecord?: ResourceAccessHistory;
  error?: string;
}

/**
 * Resource Access Tracking Service
 * Handles logging resource access, updating view counts, and maintaining analytics
 */
export class ResourceAccessTrackingService {
  /**
   * Log a resource access event
   * This is the main entry point for tracking resource usage
   */
  async logAccess(params: LogAccessParams): Promise<AccessTrackingResult> {
    const { userId, resourceId, analysisId, actionPlanStepId, accessType } = params;

    try {
      // Validate that the resource exists
      const resource = await resourceRepository.findById(resourceId);
      if (!resource) {
        return {
          success: false,
          error: 'Resource not found'
        };
      }

      // Create access history record
      const accessData: InsertResourceAccessHistory = {
        userId,
        resourceId,
        analysisId: analysisId || null,
        actionPlanStepId: actionPlanStepId || null,
        accessType,
        accessedAt: new Date().toISOString()
      };

      const accessRecord = await accessHistoryRepository.logAccess(accessData);

      // Update resource view count (only for 'view' access type)
      if (accessType === 'view') {
        await this.incrementResourceViewCount(resourceId);
      }

      // Update daily analytics in the background (don't await)
      this.updateDailyAnalytics(resourceId, userId, accessType).catch(error => {
        console.error('Failed to update daily analytics:', error);
      });

      return {
        success: true,
        accessRecord
      };
    } catch (error) {
      console.error('Error logging resource access:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Increment the view count for a resource
   */
  private async incrementResourceViewCount(resourceId: number): Promise<void> {
    await resourceRepository.incrementViewCount(resourceId);
  }

  /**
   * Update daily analytics aggregates
   * This maintains the resource_analytics table with daily statistics
   */
  private async updateDailyAnalytics(
    resourceId: number,
    userId: number,
    accessType: 'view' | 'download' | 'external_link'
  ): Promise<void> {
    try {
      // Get today's date (start of day in UTC)
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      // Check if analytics record exists for today
      const existingAnalytics = await db
        .select()
        .from(resourceAnalytics)
        .where(
          and(
            eq(resourceAnalytics.resourceId, resourceId),
            eq(resourceAnalytics.date, todayStr)
          )
        )
        .limit(1);

      if (existingAnalytics.length > 0) {
        // Update existing record
        await this.updateExistingAnalytics(resourceId, todayStr, userId, accessType);
      } else {
        // Create new record
        await this.createNewAnalytics(resourceId, todayStr, userId, accessType);
      }
    } catch (error) {
      console.error('Error updating daily analytics:', error);
      throw error;
    }
  }

  /**
   * Update existing analytics record for today
   */
  private async updateExistingAnalytics(
    resourceId: number,
    date: string,
    userId: number,
    accessType: 'view' | 'download' | 'external_link'
  ): Promise<void> {
    // Build update based on access type
    const updates: Record<string, any> = {};

    if (accessType === 'view') {
      updates.viewCount = sql`${resourceAnalytics.viewCount} + 1`;
    } else if (accessType === 'download') {
      updates.downloadCount = sql`${resourceAnalytics.downloadCount} + 1`;
    } else if (accessType === 'external_link') {
      updates.externalClickCount = sql`${resourceAnalytics.externalClickCount} + 1`;
    }

    // Update unique users count
    // Get count of unique users who accessed this resource today
    const uniqueUsersResult = await db
      .select({ count: sql<number>`count(DISTINCT ${resourceAccessHistory.userId})::int` })
      .from(resourceAccessHistory)
      .where(
        and(
          eq(resourceAccessHistory.resourceId, resourceId),
          sql`DATE(${resourceAccessHistory.accessedAt}) = DATE(${date})`
        )
      );

    updates.uniqueUsers = uniqueUsersResult[0]?.count || 0;

    await db
      .update(resourceAnalytics)
      .set(updates)
      .where(
        and(
          eq(resourceAnalytics.resourceId, resourceId),
          eq(resourceAnalytics.date, date)
        )
      );
  }

  /**
   * Create new analytics record for today
   */
  private async createNewAnalytics(
    resourceId: number,
    date: string,
    userId: number,
    accessType: 'view' | 'download' | 'external_link'
  ): Promise<void> {
    const analyticsData = {
      resourceId,
      date,
      viewCount: accessType === 'view' ? 1 : 0,
      uniqueUsers: 1,
      bookmarkCount: 0,
      downloadCount: accessType === 'download' ? 1 : 0,
      externalClickCount: accessType === 'external_link' ? 1 : 0,
      averageTimeSpentSeconds: 0
    };

    await db
      .insert(resourceAnalytics)
      .values(analyticsData)
      .onConflictDoNothing(); // In case of race condition
  }

  /**
   * Get access statistics for a resource
   */
  async getResourceAccessStats(
    resourceId: number,
    startDate?: Date,
    endDate?: Date
  ) {
    return accessHistoryRepository.getResourceStats(resourceId, startDate, endDate);
  }

  /**
   * Get access history for a user
   */
  async getUserAccessHistory(userId: number, limit?: number) {
    return accessHistoryRepository.findByUserId(userId, limit);
  }

  /**
   * Get access history for an analysis
   */
  async getAnalysisAccessHistory(analysisId: number, limit?: number) {
    return accessHistoryRepository.findByAnalysisId(analysisId, limit);
  }

  /**
   * Check if a user has accessed a resource
   */
  async hasUserAccessedResource(userId: number, resourceId: number): Promise<boolean> {
    return accessHistoryRepository.hasAccessed(userId, resourceId);
  }

  /**
   * Get list of resource IDs accessed by a user
   */
  async getUserAccessedResourceIds(userId: number): Promise<number[]> {
    return accessHistoryRepository.getAccessedResourceIds(userId);
  }

  /**
   * Get daily analytics for a resource
   */
  async getResourceDailyAnalytics(
    resourceId: number,
    startDate: Date,
    endDate: Date
  ) {
    const analytics = await db
      .select()
      .from(resourceAnalytics)
      .where(
        and(
          eq(resourceAnalytics.resourceId, resourceId),
          sql`${resourceAnalytics.date} >= ${startDate.toISOString()}`,
          sql`${resourceAnalytics.date} <= ${endDate.toISOString()}`
        )
      )
      .orderBy(resourceAnalytics.date);

    return analytics;
  }

  /**
   * Get aggregated analytics across all resources
   */
  async getAggregatedAnalytics(startDate: Date, endDate: Date) {
    const result = await db
      .select({
        totalViews: sql<number>`sum(${resourceAnalytics.viewCount})::int`,
        totalUniqueUsers: sql<number>`sum(${resourceAnalytics.uniqueUsers})::int`,
        totalDownloads: sql<number>`sum(${resourceAnalytics.downloadCount})::int`,
        totalExternalClicks: sql<number>`sum(${resourceAnalytics.externalClickCount})::int`,
        totalBookmarks: sql<number>`sum(${resourceAnalytics.bookmarkCount})::int`
      })
      .from(resourceAnalytics)
      .where(
        and(
          sql`${resourceAnalytics.date} >= ${startDate.toISOString()}`,
          sql`${resourceAnalytics.date} <= ${endDate.toISOString()}`
        )
      );

    return result[0] || {
      totalViews: 0,
      totalUniqueUsers: 0,
      totalDownloads: 0,
      totalExternalClicks: 0,
      totalBookmarks: 0
    };
  }

  /**
   * Get most accessed resources in a time period
   */
  async getMostAccessedResources(
    startDate: Date,
    endDate: Date,
    limit: number = 10
  ) {
    const result = await db
      .select({
        resourceId: resourceAnalytics.resourceId,
        totalViews: sql<number>`sum(${resourceAnalytics.viewCount})::int`,
        totalUniqueUsers: sql<number>`sum(${resourceAnalytics.uniqueUsers})::int`,
        totalDownloads: sql<number>`sum(${resourceAnalytics.downloadCount})::int`
      })
      .from(resourceAnalytics)
      .where(
        and(
          sql`${resourceAnalytics.date} >= ${startDate.toISOString()}`,
          sql`${resourceAnalytics.date} <= ${endDate.toISOString()}`
        )
      )
      .groupBy(resourceAnalytics.resourceId)
      .orderBy(sql`sum(${resourceAnalytics.viewCount}) desc`)
      .limit(limit);

    // Enrich with resource details
    const resourceIds = result.map(r => r.resourceId);
    const resourcesData = await resourceRepository.findByIds(resourceIds);
    
    const resourceMap = new Map(resourcesData.map(r => [r.id, r]));

    return result.map(stat => ({
      ...stat,
      resource: resourceMap.get(stat.resourceId)
    }));
  }

  /**
   * Clean up old access history records
   * Should be run periodically to maintain database size
   */
  async cleanupOldAccessHistory(daysToKeep: number = 90): Promise<number> {
    return accessHistoryRepository.deleteOlderThan(daysToKeep);
  }
}

// Export singleton instance
export const resourceAccessTrackingService = new ResourceAccessTrackingService();
