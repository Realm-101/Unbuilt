import { db } from '../db';
import {
  resourceAccessHistory,
  resources,
  searches,
  users,
  type ResourceAccessHistory,
  type InsertResourceAccessHistory
} from '@shared/schema';
import { eq, and, sql, desc, gte, lte } from 'drizzle-orm';

export interface AccessHistoryWithDetails extends ResourceAccessHistory {
  resource?: typeof resources.$inferSelect;
  analysis?: typeof searches.$inferSelect | null;
  user?: {
    id: number;
    name: string | null;
    email: string;
  };
}

export type AccessType = 'view' | 'download' | 'external_link';

export interface AccessStats {
  totalAccesses: number;
  uniqueUsers: number;
  byType: {
    view: number;
    download: number;
    external_link: number;
  };
}

/**
 * Access History Repository
 * Handles all database operations for resource access tracking
 */
export class AccessHistoryRepository {
  /**
   * Log a resource access
   */
  async logAccess(data: InsertResourceAccessHistory): Promise<ResourceAccessHistory> {
    const [access] = await db
      .insert(resourceAccessHistory)
      .values(data)
      .returning();

    return access;
  }

  /**
   * Get access history for a user
   */
  async findByUserId(
    userId: number,
    limit?: number
  ): Promise<AccessHistoryWithDetails[]> {
    let query = db
      .select()
      .from(resourceAccessHistory)
      .where(eq(resourceAccessHistory.userId, userId))
      .orderBy(desc(resourceAccessHistory.accessedAt));

    if (limit) {
      query = query.limit(limit) as any;
    }

    const history = await query;

    return this.enrichAccessHistory(history);
  }

  /**
   * Get access history for a resource
   */
  async findByResourceId(
    resourceId: number,
    limit?: number
  ): Promise<AccessHistoryWithDetails[]> {
    let query = db
      .select()
      .from(resourceAccessHistory)
      .where(eq(resourceAccessHistory.resourceId, resourceId))
      .orderBy(desc(resourceAccessHistory.accessedAt));

    if (limit) {
      query = query.limit(limit) as any;
    }

    const history = await query;

    return this.enrichAccessHistory(history);
  }

  /**
   * Get access history for an analysis
   */
  async findByAnalysisId(
    analysisId: number,
    limit?: number
  ): Promise<AccessHistoryWithDetails[]> {
    let query = db
      .select()
      .from(resourceAccessHistory)
      .where(eq(resourceAccessHistory.analysisId, analysisId))
      .orderBy(desc(resourceAccessHistory.accessedAt));

    if (limit) {
      query = query.limit(limit) as any;
    }

    const history = await query;

    return this.enrichAccessHistory(history);
  }

  /**
   * Get access history by user and resource
   */
  async findByUserAndResource(
    userId: number,
    resourceId: number
  ): Promise<ResourceAccessHistory[]> {
    return db
      .select()
      .from(resourceAccessHistory)
      .where(
        and(
          eq(resourceAccessHistory.userId, userId),
          eq(resourceAccessHistory.resourceId, resourceId)
        )
      )
      .orderBy(desc(resourceAccessHistory.accessedAt));
  }

  /**
   * Check if user has accessed a resource
   */
  async hasAccessed(userId: number, resourceId: number): Promise<boolean> {
    const access = await db
      .select()
      .from(resourceAccessHistory)
      .where(
        and(
          eq(resourceAccessHistory.userId, userId),
          eq(resourceAccessHistory.resourceId, resourceId)
        )
      )
      .limit(1);

    return access.length > 0;
  }

  /**
   * Get accessed resource IDs for a user
   */
  async getAccessedResourceIds(userId: number): Promise<number[]> {
    const accesses = await db
      .select({ resourceId: resourceAccessHistory.resourceId })
      .from(resourceAccessHistory)
      .where(eq(resourceAccessHistory.userId, userId))
      .groupBy(resourceAccessHistory.resourceId);

    return accesses.map(a => a.resourceId);
  }

  /**
   * Get access statistics for a resource
   */
  async getResourceStats(
    resourceId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<AccessStats> {
    const conditions = [eq(resourceAccessHistory.resourceId, resourceId)];

    if (startDate) {
      conditions.push(gte(resourceAccessHistory.accessedAt, startDate.toISOString()));
    }

    if (endDate) {
      conditions.push(lte(resourceAccessHistory.accessedAt, endDate.toISOString()));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [totalResult, uniqueUsersResult, typeResults] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(resourceAccessHistory)
        .where(whereClause),
      db
        .select({ count: sql<number>`count(DISTINCT ${resourceAccessHistory.userId})::int` })
        .from(resourceAccessHistory)
        .where(whereClause),
      db
        .select({
          accessType: resourceAccessHistory.accessType,
          count: sql<number>`count(*)::int`
        })
        .from(resourceAccessHistory)
        .where(whereClause)
        .groupBy(resourceAccessHistory.accessType)
    ]);

    const byType = {
      view: 0,
      download: 0,
      external_link: 0
    };

    typeResults.forEach(result => {
      byType[result.accessType as AccessType] = result.count;
    });

    return {
      totalAccesses: totalResult[0]?.count || 0,
      uniqueUsers: uniqueUsersResult[0]?.count || 0,
      byType
    };
  }

  /**
   * Get access statistics for a user
   */
  async getUserStats(userId: number): Promise<{
    totalAccesses: number;
    uniqueResources: number;
    byType: {
      view: number;
      download: number;
      external_link: number;
    };
  }> {
    const [totalResult, uniqueResourcesResult, typeResults] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(resourceAccessHistory)
        .where(eq(resourceAccessHistory.userId, userId)),
      db
        .select({ count: sql<number>`count(DISTINCT ${resourceAccessHistory.resourceId})::int` })
        .from(resourceAccessHistory)
        .where(eq(resourceAccessHistory.userId, userId)),
      db
        .select({
          accessType: resourceAccessHistory.accessType,
          count: sql<number>`count(*)::int`
        })
        .from(resourceAccessHistory)
        .where(eq(resourceAccessHistory.userId, userId))
        .groupBy(resourceAccessHistory.accessType)
    ]);

    const byType = {
      view: 0,
      download: 0,
      external_link: 0
    };

    typeResults.forEach(result => {
      byType[result.accessType as AccessType] = result.count;
    });

    return {
      totalAccesses: totalResult[0]?.count || 0,
      uniqueResources: uniqueResourcesResult[0]?.count || 0,
      byType
    };
  }

  /**
   * Get most accessed resources
   */
  async getMostAccessed(limit: number = 10): Promise<Array<{
    resourceId: number;
    accessCount: number;
  }>> {
    const result = await db
      .select({
        resourceId: resourceAccessHistory.resourceId,
        accessCount: sql<number>`count(*)::int`
      })
      .from(resourceAccessHistory)
      .groupBy(resourceAccessHistory.resourceId)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    return result;
  }

  /**
   * Get recent accesses across all resources
   */
  async getRecent(limit: number = 20): Promise<AccessHistoryWithDetails[]> {
    const history = await db
      .select()
      .from(resourceAccessHistory)
      .orderBy(desc(resourceAccessHistory.accessedAt))
      .limit(limit);

    return this.enrichAccessHistory(history);
  }

  /**
   * Delete old access history records
   */
  async deleteOlderThan(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await db
      .delete(resourceAccessHistory)
      .where(lte(resourceAccessHistory.accessedAt, cutoffDate.toISOString()));

    return result.rowCount || 0;
  }

  /**
   * Get access count for a resource
   */
  async countByResourceId(resourceId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resourceAccessHistory)
      .where(eq(resourceAccessHistory.resourceId, resourceId));

    return result[0]?.count || 0;
  }

  /**
   * Get unique user count for a resource
   */
  async countUniqueUsersByResourceId(resourceId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(DISTINCT ${resourceAccessHistory.userId})::int` })
      .from(resourceAccessHistory)
      .where(eq(resourceAccessHistory.resourceId, resourceId));

    return result[0]?.count || 0;
  }

  /**
   * Enrich access history with related data
   */
  private async enrichAccessHistory(
    history: ResourceAccessHistory[]
  ): Promise<AccessHistoryWithDetails[]> {
    return Promise.all(
      history.map(async (access) => {
        const [resourceResult, analysisResult, userResult] = await Promise.all([
          db
            .select()
            .from(resources)
            .where(eq(resources.id, access.resourceId))
            .limit(1),
          access.analysisId
            ? db
                .select()
                .from(searches)
                .where(eq(searches.id, access.analysisId))
                .limit(1)
            : Promise.resolve([]),
          db
            .select({
              id: users.id,
              name: users.name,
              email: users.email
            })
            .from(users)
            .where(eq(users.id, access.userId))
            .limit(1)
        ]);

        return {
          ...access,
          resource: resourceResult[0],
          analysis: analysisResult[0] || null,
          user: userResult[0]
        };
      })
    );
  }
}

// Export singleton instance
export const accessHistoryRepository = new AccessHistoryRepository();
