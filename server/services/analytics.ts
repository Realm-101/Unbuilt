import { db } from "../db";
import { analyticsEvents, users } from "@shared/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

export interface AnalyticsEvent {
  eventType: string;
  userId?: number;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AnalyticsMetrics {
  totalSearches: number;
  totalExports: number;
  totalPageViews: number;
  activeUsers: number;
  popularSearches: Array<{ query: string; count: number }>;
  exportsByFormat: Record<string, number>;
  conversionRate: number;
}

/**
 * Analytics Service
 * Tracks user behavior and feature usage for data-driven product decisions
 */
export class AnalyticsService {
  /**
   * Check if user has opted out of analytics
   */
  private async hasOptedOut(userId?: number): Promise<boolean> {
    if (!userId) return false;

    try {
      const [user] = await db
        .select({ analyticsOptOut: users.analyticsOptOut })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      return user?.analyticsOptOut || false;
    } catch (error) {
      console.error("Failed to check opt-out status:", error);
      return false;
    }
  }

  /**
   * Anonymize sensitive data in metadata
   */
  private anonymizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const anonymized = { ...metadata };

    // Remove or hash sensitive fields
    const sensitiveFields = ['email', 'password', 'token', 'apiKey', 'creditCard'];
    sensitiveFields.forEach(field => {
      if (anonymized[field]) {
        delete anonymized[field];
      }
    });

    return anonymized;
  }

  /**
   * Track a generic analytics event
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // Check if user has opted out
      if (event.userId && await this.hasOptedOut(event.userId)) {
        return; // Don't track if user opted out
      }

      // Anonymize sensitive data
      const anonymizedMetadata = this.anonymizeMetadata(event.metadata || {});

      await db.insert(analyticsEvents).values({
        eventType: event.eventType,
        userId: event.userId,
        metadata: anonymizedMetadata,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to track analytics event:", error);
      // Don't throw - analytics failures shouldn't break the app
    }
  }

  /**
   * Track a search query
   */
  async trackSearch(userId: number | undefined, query: string, resultsCount: number): Promise<void> {
    await this.trackEvent({
      eventType: "search_performed",
      userId,
      metadata: {
        query,
        resultsCount,
      },
    });
  }

  /**
   * Track an export action
   */
  async trackExport(userId: number | undefined, format: string, searchId: number): Promise<void> {
    await this.trackEvent({
      eventType: "export_generated",
      userId,
      metadata: {
        format,
        searchId,
      },
    });
  }

  /**
   * Track a page view
   */
  async trackPageView(userId: number | undefined, page: string, referrer?: string): Promise<void> {
    await this.trackEvent({
      eventType: "page_view",
      userId,
      metadata: {
        page,
        referrer,
      },
    });
  }

  /**
   * Track feature usage
   */
  async trackFeatureUsage(userId: number | undefined, feature: string, action: string): Promise<void> {
    await this.trackEvent({
      eventType: "feature_usage",
      userId,
      metadata: {
        feature,
        action,
      },
    });
  }

  /**
   * Track user signup
   */
  async trackSignup(userId: number, provider: string): Promise<void> {
    await this.trackEvent({
      eventType: "user_signup",
      userId,
      metadata: {
        provider,
      },
    });
  }

  /**
   * Track subscription events
   */
  async trackSubscription(userId: number, action: string, tier: string): Promise<void> {
    await this.trackEvent({
      eventType: "subscription_event",
      userId,
      metadata: {
        action, // created, updated, cancelled
        tier,
      },
    });
  }

  /**
   * Get aggregated metrics for a date range
   */
  async getMetrics(startDate: Date, endDate: Date): Promise<AnalyticsMetrics> {
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

    // Get total searches
    const searchesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.eventType, "search_performed"),
          gte(analyticsEvents.timestamp, startDateStr),
          lte(analyticsEvents.timestamp, endDateStr)
        )
      );
    const totalSearches = Number(searchesResult[0]?.count || 0);

    // Get total exports
    const exportsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.eventType, "export_generated"),
          gte(analyticsEvents.timestamp, startDateStr),
          lte(analyticsEvents.timestamp, endDateStr)
        )
      );
    const totalExports = Number(exportsResult[0]?.count || 0);

    // Get total page views
    const pageViewsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.eventType, "page_view"),
          gte(analyticsEvents.timestamp, startDateStr),
          lte(analyticsEvents.timestamp, endDateStr)
        )
      );
    const totalPageViews = Number(pageViewsResult[0]?.count || 0);

    // Get active users (distinct user IDs)
    const activeUsersResult = await db
      .select({ count: sql<number>`count(distinct ${analyticsEvents.userId})` })
      .from(analyticsEvents)
      .where(
        and(
          gte(analyticsEvents.timestamp, startDateStr),
          lte(analyticsEvents.timestamp, endDateStr)
        )
      );
    const activeUsers = Number(activeUsersResult[0]?.count || 0);

    // Get popular searches
    const popularSearchesResult = await db
      .select({
        query: sql<string>`${analyticsEvents.metadata}->>'query'`,
        count: sql<number>`count(*)`,
      })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.eventType, "search_performed"),
          gte(analyticsEvents.timestamp, startDateStr),
          lte(analyticsEvents.timestamp, endDateStr)
        )
      )
      .groupBy(sql`${analyticsEvents.metadata}->>'query'`)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    const popularSearches = Array.isArray(popularSearchesResult)
      ? popularSearchesResult.map((row) => ({
          query: row.query || "Unknown",
          count: Number(row.count),
        }))
      : [];

    // Get exports by format
    const exportsByFormatResult = await db
      .select({
        format: sql<string>`${analyticsEvents.metadata}->>'format'`,
        count: sql<number>`count(*)`,
      })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.eventType, "export_generated"),
          gte(analyticsEvents.timestamp, startDateStr),
          lte(analyticsEvents.timestamp, endDateStr)
        )
      )
      .groupBy(sql`${analyticsEvents.metadata}->>'format'`);

    const exportsByFormat: Record<string, number> = {};
    if (Array.isArray(exportsByFormatResult)) {
      exportsByFormatResult.forEach((row) => {
        if (row.format) {
          exportsByFormat[row.format] = Number(row.count);
        }
      });
    }

    // Calculate conversion rate (users who exported / users who searched)
    const usersWhoSearched = await db
      .select({ count: sql<number>`count(distinct ${analyticsEvents.userId})` })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.eventType, "search_performed"),
          gte(analyticsEvents.timestamp, startDateStr),
          lte(analyticsEvents.timestamp, endDateStr)
        )
      );

    const usersWhoExported = await db
      .select({ count: sql<number>`count(distinct ${analyticsEvents.userId})` })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.eventType, "export_generated"),
          gte(analyticsEvents.timestamp, startDateStr),
          lte(analyticsEvents.timestamp, endDateStr)
        )
      );

    const searchedCount = Number(usersWhoSearched[0]?.count || 0);
    const exportedCount = Number(usersWhoExported[0]?.count || 0);
    const conversionRate = searchedCount > 0 ? (exportedCount / searchedCount) * 100 : 0;

    return {
      totalSearches,
      totalExports,
      totalPageViews,
      activeUsers,
      popularSearches,
      exportsByFormat,
      conversionRate,
    };
  }

  /**
   * Get user-specific analytics
   */
  async getUserAnalytics(userId: number, startDate: Date, endDate: Date) {
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

    const events = await db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.userId, userId),
          gte(analyticsEvents.timestamp, startDateStr),
          lte(analyticsEvents.timestamp, endDateStr)
        )
      )
      .orderBy(desc(analyticsEvents.timestamp));

    return events;
  }

  /**
   * Clean up old analytics data (data retention policy)
   */
  async cleanupOldData(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffDateStr = cutoffDate.toISOString();

    const result = await db
      .delete(analyticsEvents)
      .where(lte(analyticsEvents.timestamp, cutoffDateStr));

    return result.rowCount || 0;
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
