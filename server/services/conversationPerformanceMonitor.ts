/**
 * Conversation Performance Monitor
 * 
 * Tracks and monitors performance metrics for conversation queries
 * and AI operations. Provides insights for optimization.
 */

/**
 * Query performance metrics
 */
export interface QueryMetrics {
  queryName: string;
  executionTime: number;
  timestamp: Date;
  rowCount?: number;
  cached?: boolean;
}

/**
 * Performance statistics
 */
export interface PerformanceStats {
  totalQueries: number;
  avgExecutionTime: number;
  slowQueries: QueryMetrics[];
  fastQueries: QueryMetrics[];
  cacheHitRate: number;
}

// In-memory storage for metrics (last 1000 queries)
const queryMetrics: QueryMetrics[] = [];
const MAX_METRICS = 1000;
const SLOW_QUERY_THRESHOLD = 1000; // 1 second

/**
 * Record query execution time
 * 
 * @param queryName - Name/identifier of the query
 * @param executionTime - Execution time in milliseconds
 * @param rowCount - Number of rows returned (optional)
 * @param cached - Whether result was cached
 */
export function recordQuery(
  queryName: string,
  executionTime: number,
  rowCount?: number,
  cached: boolean = false
): void {
  const metric: QueryMetrics = {
    queryName,
    executionTime,
    timestamp: new Date(),
    rowCount,
    cached,
  };

  queryMetrics.push(metric);

  // Keep only last MAX_METRICS entries
  if (queryMetrics.length > MAX_METRICS) {
    queryMetrics.shift();
  }

  // Log slow queries
  if (executionTime > SLOW_QUERY_THRESHOLD) {
    console.warn(`⚠️ Slow query detected: ${queryName} took ${executionTime}ms`);
  }
}

/**
 * Measure and record query execution
 * 
 * @param queryName - Name/identifier of the query
 * @param queryFn - Async function to execute
 * @returns Query result
 */
export async function measureQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await queryFn();
    const executionTime = Date.now() - startTime;
    
    // Determine row count if result is an array
    const rowCount = Array.isArray(result) ? result.length : undefined;
    
    recordQuery(queryName, executionTime, rowCount);
    
    return result;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    recordQuery(queryName, executionTime);
    throw error;
  }
}

/**
 * Get performance statistics
 * 
 * @param timeWindowMs - Time window in milliseconds (default: last hour)
 * @returns Performance statistics
 */
export function getPerformanceStats(
  timeWindowMs: number = 3600000 // 1 hour
): PerformanceStats {
  const cutoffTime = new Date(Date.now() - timeWindowMs);
  
  // Filter metrics within time window
  const recentMetrics = queryMetrics.filter(
    (m) => m.timestamp >= cutoffTime
  );

  if (recentMetrics.length === 0) {
    return {
      totalQueries: 0,
      avgExecutionTime: 0,
      slowQueries: [],
      fastQueries: [],
      cacheHitRate: 0,
    };
  }

  // Calculate statistics
  const totalExecutionTime = recentMetrics.reduce(
    (sum, m) => sum + m.executionTime,
    0
  );
  const avgExecutionTime = totalExecutionTime / recentMetrics.length;

  // Find slow and fast queries
  const slowQueries = recentMetrics
    .filter((m) => m.executionTime > SLOW_QUERY_THRESHOLD)
    .sort((a, b) => b.executionTime - a.executionTime)
    .slice(0, 10); // Top 10 slowest

  const fastQueries = recentMetrics
    .filter((m) => m.executionTime <= 100) // Under 100ms
    .sort((a, b) => a.executionTime - b.executionTime)
    .slice(0, 10); // Top 10 fastest

  // Calculate cache hit rate
  const cachedQueries = recentMetrics.filter((m) => m.cached).length;
  const cacheHitRate = cachedQueries / recentMetrics.length;

  return {
    totalQueries: recentMetrics.length,
    avgExecutionTime: Math.round(avgExecutionTime),
    slowQueries,
    fastQueries,
    cacheHitRate,
  };
}

/**
 * Get query breakdown by name
 * 
 * @param timeWindowMs - Time window in milliseconds
 * @returns Map of query names to their statistics
 */
export function getQueryBreakdown(
  timeWindowMs: number = 3600000
): Map<string, {
  count: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  cacheHitRate: number;
}> {
  const cutoffTime = new Date(Date.now() - timeWindowMs);
  const recentMetrics = queryMetrics.filter(
    (m) => m.timestamp >= cutoffTime
  );

  const breakdown = new Map<string, {
    count: number;
    avgTime: number;
    minTime: number;
    maxTime: number;
    cacheHitRate: number;
  }>();

  // Group by query name
  const grouped = new Map<string, QueryMetrics[]>();
  recentMetrics.forEach((metric) => {
    const existing = grouped.get(metric.queryName) || [];
    existing.push(metric);
    grouped.set(metric.queryName, existing);
  });

  // Calculate statistics for each query
  grouped.forEach((metrics, queryName) => {
    const times = metrics.map((m) => m.executionTime);
    const cachedCount = metrics.filter((m) => m.cached).length;

    breakdown.set(queryName, {
      count: metrics.length,
      avgTime: Math.round(times.reduce((sum, t) => sum + t, 0) / times.length),
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      cacheHitRate: cachedCount / metrics.length,
    });
  });

  return breakdown;
}

/**
 * Get slow query report
 * 
 * @param threshold - Threshold in milliseconds (default: 1000ms)
 * @param limit - Maximum number of queries to return
 * @returns Array of slow queries
 */
export function getSlowQueries(
  threshold: number = SLOW_QUERY_THRESHOLD,
  limit: number = 20
): QueryMetrics[] {
  return queryMetrics
    .filter((m) => m.executionTime > threshold)
    .sort((a, b) => b.executionTime - a.executionTime)
    .slice(0, limit);
}

/**
 * Clear all metrics
 */
export function clearMetrics(): void {
  queryMetrics.length = 0;
}

/**
 * Get current metrics count
 */
export function getMetricsCount(): number {
  return queryMetrics.length;
}

/**
 * Export metrics for analysis
 * 
 * @param timeWindowMs - Time window in milliseconds
 * @returns Array of metrics
 */
export function exportMetrics(
  timeWindowMs?: number
): QueryMetrics[] {
  if (!timeWindowMs) {
    return [...queryMetrics];
  }

  const cutoffTime = new Date(Date.now() - timeWindowMs);
  return queryMetrics.filter((m) => m.timestamp >= cutoffTime);
}

export const conversationPerformanceMonitor = {
  recordQuery,
  measureQuery,
  getPerformanceStats,
  getQueryBreakdown,
  getSlowQueries,
  clearMetrics,
  getMetricsCount,
  exportMetrics,
};
