/**
 * Database Performance Monitor
 * 
 * Monitors database query performance, tracks slow queries,
 * and provides insights for optimization.
 */

import { db, pool } from '../db';
import { sql } from 'drizzle-orm';

interface QueryMetrics {
  query: string;
  executionTime: number;
  timestamp: Date;
  params?: any[];
}

interface SlowQuery {
  query: string;
  avgExecutionTime: number;
  count: number;
  maxExecutionTime: number;
  minExecutionTime: number;
}

interface DatabaseStats {
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  slowQueries: SlowQuery[];
  avgQueryTime: number;
  totalQueries: number;
}

class DatabasePerformanceMonitor {
  private queryMetrics: QueryMetrics[] = [];
  private slowQueryThreshold: number = 1000; // 1 second
  private maxMetricsSize: number = 1000;
  private isMonitoring: boolean = false;

  constructor() {
    // Start monitoring if enabled
    if (process.env.DB_MONITORING_ENABLED === 'true') {
      this.startMonitoring();
    }
  }

  /**
   * Start monitoring database performance
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('⚠️ Database monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    console.log('📊 Database performance monitoring started');

    // Log stats periodically
    setInterval(() => {
      this.logPerformanceStats();
    }, 60000); // Every minute
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('📊 Database performance monitoring stopped');
  }

  /**
   * Track a query execution
   */
  trackQuery(query: string, executionTime: number, params?: any[]): void {
    if (!this.isMonitoring) return;

    const metric: QueryMetrics = {
      query: this.sanitizeQuery(query),
      executionTime,
      timestamp: new Date(),
      params,
    };

    this.queryMetrics.push(metric);

    // Enforce size limit
    if (this.queryMetrics.length > this.maxMetricsSize) {
      this.queryMetrics.shift();
    }

    // Log slow queries immediately
    if (executionTime > this.slowQueryThreshold) {
      console.warn('🐌 Slow query detected:', {
        query: metric.query,
        executionTime: `${executionTime}ms`,
        timestamp: metric.timestamp,
      });
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    const poolStats = {
      activeConnections: pool.totalCount - pool.idleCount,
      idleConnections: pool.idleCount,
      totalConnections: pool.totalCount,
    };

    const slowQueries = this.getSlowQueries();
    const avgQueryTime = this.getAverageQueryTime();

    return {
      ...poolStats,
      slowQueries,
      avgQueryTime,
      totalQueries: this.queryMetrics.length,
    };
  }

  /**
   * Get slow queries summary
   */
  getSlowQueries(limit: number = 10): SlowQuery[] {
    const queryMap = new Map<string, number[]>();

    // Group execution times by query
    for (const metric of this.queryMetrics) {
      if (metric.executionTime > this.slowQueryThreshold) {
        const times = queryMap.get(metric.query) || [];
        times.push(metric.executionTime);
        queryMap.set(metric.query, times);
      }
    }

    // Calculate statistics
    const slowQueries: SlowQuery[] = [];
    for (const [query, times] of queryMap.entries()) {
      const sum = times.reduce((a, b) => a + b, 0);
      slowQueries.push({
        query,
        avgExecutionTime: sum / times.length,
        count: times.length,
        maxExecutionTime: Math.max(...times),
        minExecutionTime: Math.min(...times),
      });
    }

    // Sort by average execution time
    slowQueries.sort((a, b) => b.avgExecutionTime - a.avgExecutionTime);

    return slowQueries.slice(0, limit);
  }

  /**
   * Get average query execution time
   */
  getAverageQueryTime(): number {
    if (this.queryMetrics.length === 0) return 0;

    const sum = this.queryMetrics.reduce(
      (acc, metric) => acc + metric.executionTime,
      0
    );
    return sum / this.queryMetrics.length;
  }

  /**
   * Get query metrics for a time range
   */
  getMetricsInRange(startTime: Date, endTime: Date): QueryMetrics[] {
    return this.queryMetrics.filter(
      (metric) =>
        metric.timestamp >= startTime && metric.timestamp <= endTime
    );
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.queryMetrics = [];
  }

  /**
   * Get PostgreSQL statistics
   */
  async getPostgresStats() {
    try {
      // Get table sizes
      const tableSizes = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
          pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10
      `);

      // Get index usage
      const indexUsage = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan as index_scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_fetched
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        ORDER BY idx_scan DESC
        LIMIT 10
      `);

      // Get cache hit ratio
      const cacheHitRatio = await db.execute(sql`
        SELECT 
          sum(heap_blks_read) as heap_read,
          sum(heap_blks_hit) as heap_hit,
          sum(heap_blks_hit) / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100 as cache_hit_ratio
        FROM pg_statio_user_tables
      `);

      // Get active queries
      const activeQueries = await db.execute(sql`
        SELECT 
          pid,
          usename,
          application_name,
          state,
          query,
          query_start,
          state_change
        FROM pg_stat_activity
        WHERE state != 'idle'
        AND pid != pg_backend_pid()
        ORDER BY query_start
        LIMIT 10
      `);

      return {
        tableSizes: tableSizes.rows,
        indexUsage: indexUsage.rows,
        cacheHitRatio: cacheHitRatio.rows[0],
        activeQueries: activeQueries.rows,
      };
    } catch (error) {
      console.error('Failed to get PostgreSQL stats:', error);
      return null;
    }
  }

  /**
   * Analyze table and suggest optimizations
   */
  async analyzeTable(tableName: string) {
    try {
      // Get table statistics
      const stats = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables
        WHERE tablename = ${tableName}
      `);

      // Get index information
      const indexes = await db.execute(sql`
        SELECT 
          indexname,
          indexdef,
          idx_scan as scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_fetched
        FROM pg_stat_user_indexes
        JOIN pg_indexes ON pg_stat_user_indexes.indexname = pg_indexes.indexname
        WHERE pg_stat_user_indexes.tablename = ${tableName}
      `);

      // Get missing indexes suggestions
      const missingIndexes = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          attname as column_name,
          n_distinct,
          correlation
        FROM pg_stats
        WHERE tablename = ${tableName}
        AND n_distinct > 100
        ORDER BY n_distinct DESC
      `);

      const suggestions: string[] = [];

      // Check for dead tuples
      const tableStats = stats.rows[0] as any;
      if (tableStats && tableStats.dead_tuples > tableStats.live_tuples * 0.1) {
        suggestions.push(
          `Consider running VACUUM on ${tableName} (${tableStats.dead_tuples} dead tuples)`
        );
      }

      // Check for unused indexes
      for (const index of indexes.rows as any[]) {
        if (index.scans === 0) {
          suggestions.push(
            `Index ${index.indexname} is never used and could be dropped`
          );
        }
      }

      // Check for missing indexes
      for (const col of missingIndexes.rows as any[]) {
        if (col.n_distinct > 1000 && Math.abs(col.correlation) < 0.5) {
          suggestions.push(
            `Consider adding an index on ${tableName}.${col.column_name} (high cardinality, low correlation)`
          );
        }
      }

      return {
        stats: tableStats,
        indexes: indexes.rows,
        suggestions,
      };
    } catch (error) {
      console.error(`Failed to analyze table ${tableName}:`, error);
      return null;
    }
  }

  /**
   * Get connection pool health
   */
  getPoolHealth() {
    return {
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      activeConnections: pool.totalCount - pool.idleCount,
      waitingClients: pool.waitingCount,
      maxConnections: pool.options.max || 10,
      utilizationPercent: ((pool.totalCount - pool.idleCount) / (pool.options.max || 10)) * 100,
    };
  }

  /**
   * Log performance statistics
   */
  private logPerformanceStats(): void {
    const stats = {
      totalQueries: this.queryMetrics.length,
      avgQueryTime: Math.round(this.getAverageQueryTime()),
      slowQueriesCount: this.queryMetrics.filter(
        (m) => m.executionTime > this.slowQueryThreshold
      ).length,
      poolHealth: this.getPoolHealth(),
    };

    console.log('📊 Database Performance Stats:', stats);
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    // Remove parameter values
    return query
      .replace(/\$\d+/g, '?')
      .replace(/VALUES\s*\([^)]+\)/gi, 'VALUES (?)')
      .substring(0, 200); // Limit length
  }

  /**
   * Set slow query threshold
   */
  setSlowQueryThreshold(milliseconds: number): void {
    this.slowQueryThreshold = milliseconds;
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.queryMetrics,
      slowQueries: this.getSlowQueries(),
      avgQueryTime: this.getAverageQueryTime(),
      poolHealth: this.getPoolHealth(),
      timestamp: new Date(),
    }, null, 2);
  }
}

// Export singleton instance
export const dbPerformanceMonitor = new DatabasePerformanceMonitor();

// Middleware to track query execution time
export function withQueryTracking<T>(
  queryFn: () => Promise<T>,
  queryName: string
): Promise<T> {
  const startTime = Date.now();
  
  return queryFn()
    .then((result) => {
      const executionTime = Date.now() - startTime;
      dbPerformanceMonitor.trackQuery(queryName, executionTime);
      return result;
    })
    .catch((error) => {
      const executionTime = Date.now() - startTime;
      dbPerformanceMonitor.trackQuery(queryName, executionTime);
      throw error;
    });
}

// Export types
export type { QueryMetrics, SlowQuery, DatabaseStats };
