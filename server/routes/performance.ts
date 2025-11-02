import { Router } from 'express';
import { jwtAuth } from '../middleware/jwtAuth';
import { apiRateLimit } from '../middleware/rateLimiting';
import { asyncHandler, sendSuccess, AppError } from '../middleware/errorHandler';
import { conversationPerformanceMonitor } from '../services/conversationPerformanceMonitor';
import { conversationCacheService } from '../services/conversationCacheService';
import { queryDeduplicationService } from '../services/queryDeduplicationService';

const router = Router();

/**
 * GET /api/performance/conversation-queries
 * Get performance statistics for conversation queries
 * Admin only
 */
router.get(
  '/conversation-queries',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    // Check if user is admin
    const { db } = await import('../db');
    const { users } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0 || user[0].role !== 'admin') {
      throw AppError.createAuthorizationError(
        'Admin access required',
        'ADMIN_REQUIRED'
      );
    }

    // Get time window from query (default: 1 hour)
    const timeWindowMs = parseInt(req.query.timeWindow as string) || 3600000;

    // Get performance stats
    const stats = conversationPerformanceMonitor.getPerformanceStats(timeWindowMs);
    const breakdown = conversationPerformanceMonitor.getQueryBreakdown(timeWindowMs);
    const slowQueries = conversationPerformanceMonitor.getSlowQueries(1000, 10);

    sendSuccess(res, {
      stats,
      breakdown: Object.fromEntries(breakdown),
      slowQueries,
      timeWindowMs,
    });
  })
);

/**
 * GET /api/performance/cache-stats
 * Get cache statistics
 * Admin only
 */
router.get(
  '/cache-stats',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    // Check if user is admin
    const { db } = await import('../db');
    const { users } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0 || user[0].role !== 'admin') {
      throw AppError.createAuthorizationError(
        'Admin access required',
        'ADMIN_REQUIRED'
      );
    }

    // Get cache stats
    const cacheStats = await conversationCacheService.getCacheStats();
    const deduplicationStats = queryDeduplicationService.getDeduplicationStats();

    sendSuccess(res, {
      redis: cacheStats,
      deduplication: deduplicationStats,
    });
  })
);

/**
 * POST /api/performance/clear-cache
 * Clear conversation caches
 * Admin only
 */
router.post(
  '/clear-cache',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    // Check if user is admin
    const { db } = await import('../db');
    const { users } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0 || user[0].role !== 'admin') {
      throw AppError.createAuthorizationError(
        'Admin access required',
        'ADMIN_REQUIRED'
      );
    }

    // Clear caches
    await conversationCacheService.clearCache();
    conversationPerformanceMonitor.clearMetrics();
    queryDeduplicationService.resetStats();

    sendSuccess(res, {
      message: 'All caches cleared successfully',
    });
  })
);

/**
 * GET /api/performance/export-metrics
 * Export performance metrics for analysis
 * Admin only
 */
router.get(
  '/export-metrics',
  apiRateLimit,
  jwtAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    // Check if user is admin
    const { db } = await import('../db');
    const { users } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0 || user[0].role !== 'admin') {
      throw AppError.createAuthorizationError(
        'Admin access required',
        'ADMIN_REQUIRED'
      );
    }

    // Get time window from query (default: 24 hours)
    const timeWindowMs = parseInt(req.query.timeWindow as string) || 86400000;

    // Export metrics
    const metrics = conversationPerformanceMonitor.exportMetrics(timeWindowMs);

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="performance-metrics.csv"');

    // Convert to CSV
    const csv = [
      'Query Name,Execution Time (ms),Timestamp,Row Count,Cached',
      ...metrics.map(m =>
        `"${m.queryName}",${m.executionTime},"${m.timestamp.toISOString()}",${m.rowCount || ''},${m.cached || false}`
      ),
    ].join('\n');

    res.send(csv);
  })
);

export default router;
