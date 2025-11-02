import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Materialized View Refresh Service
 * 
 * Manages periodic refresh of materialized views for resource analytics
 * and popular resources to maintain up-to-date cached data
 * 
 * Requirements: All
 */

export class MaterializedViewRefreshService {
  private refreshInterval: NodeJS.Timeout | null = null;
  private isRefreshing: boolean = false;

  /**
   * Refresh popular resources materialized view
   */
  async refreshPopularResources(): Promise<void> {
    try {
      console.log('[MaterializedView] Refreshing popular resources view...');
      await db.execute(sql`SELECT refresh_popular_resources_mv()`);
      console.log('[MaterializedView] Popular resources view refreshed successfully');
    } catch (error: any) {
      console.error('[MaterializedView] Failed to refresh popular resources view:', error.message);
      throw error;
    }
  }

  /**
   * Refresh resource analytics summary materialized view
   */
  async refreshAnalyticsSummary(): Promise<void> {
    try {
      console.log('[MaterializedView] Refreshing analytics summary view...');
      await db.execute(sql`SELECT refresh_resource_analytics_summary_mv()`);
      console.log('[MaterializedView] Analytics summary view refreshed successfully');
    } catch (error: any) {
      console.error('[MaterializedView] Failed to refresh analytics summary view:', error.message);
      throw error;
    }
  }

  /**
   * Refresh all materialized views
   */
  async refreshAll(): Promise<void> {
    if (this.isRefreshing) {
      console.log('[MaterializedView] Refresh already in progress, skipping...');
      return;
    }

    this.isRefreshing = true;

    try {
      console.log('[MaterializedView] Starting refresh of all materialized views...');
      
      // Refresh in parallel for better performance
      await Promise.all([
        this.refreshPopularResources(),
        this.refreshAnalyticsSummary(),
      ]);

      console.log('[MaterializedView] All materialized views refreshed successfully');
    } catch (error: any) {
      console.error('[MaterializedView] Failed to refresh materialized views:', error.message);
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Start periodic refresh of materialized views
   * 
   * @param intervalMinutes - Refresh interval in minutes (default: 60)
   */
  startPeriodicRefresh(intervalMinutes: number = 60): void {
    if (this.refreshInterval) {
      console.log('[MaterializedView] Periodic refresh already running');
      return;
    }

    const intervalMs = intervalMinutes * 60 * 1000;

    console.log(`[MaterializedView] Starting periodic refresh every ${intervalMinutes} minutes`);

    // Refresh immediately on start
    this.refreshAll().catch(err => {
      console.error('[MaterializedView] Initial refresh failed:', err);
    });

    // Set up periodic refresh
    this.refreshInterval = setInterval(() => {
      this.refreshAll().catch(err => {
        console.error('[MaterializedView] Periodic refresh failed:', err);
      });
    }, intervalMs);
  }

  /**
   * Stop periodic refresh
   */
  stopPeriodicRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log('[MaterializedView] Periodic refresh stopped');
    }
  }

  /**
   * Check if materialized views exist
   */
  async checkViewsExist(): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM pg_matviews
        WHERE matviewname IN ('popular_resources_mv', 'resource_analytics_summary_mv')
      `);

      const count = (result.rows[0] as any).count;
      return count === 2;
    } catch (error) {
      console.error('[MaterializedView] Failed to check if views exist:', error);
      return false;
    }
  }

  /**
   * Get last refresh time for materialized views
   */
  async getLastRefreshTime(): Promise<Record<string, Date | null>> {
    try {
      const result = await db.execute(sql`
        SELECT 
          matviewname,
          last_refresh
        FROM pg_matviews
        WHERE matviewname IN ('popular_resources_mv', 'resource_analytics_summary_mv')
      `);

      const refreshTimes: Record<string, Date | null> = {};
      
      for (const row of result.rows as any[]) {
        refreshTimes[row.matviewname] = row.last_refresh ? new Date(row.last_refresh) : null;
      }

      return refreshTimes;
    } catch (error) {
      console.error('[MaterializedView] Failed to get last refresh time:', error);
      return {};
    }
  }
}

// Export singleton instance
export const materializedViewRefreshService = new MaterializedViewRefreshService();

