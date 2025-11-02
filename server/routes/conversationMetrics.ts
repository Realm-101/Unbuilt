import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/authorization';
import { apiRateLimit } from '../middleware/rateLimiting';
import { asyncHandler, sendSuccess, AppError } from '../middleware/errorHandler';
import { conversationMetricsService } from '../services/conversationMetricsService';
import { UserRole } from '../services/authorizationService';

const router = Router();

/**
 * GET /api/conversation-metrics
 * Get comprehensive conversation metrics for a time period
 * Admin only
 */
router.get(
  '/',
  requireAuth,
  requireRole(UserRole.ADMIN),
  apiRateLimit,
  asyncHandler(async (req, res) => {
    const { startDate, endDate, period } = req.query;

    let start: Date;
    let end: Date = new Date();

    if (startDate && endDate) {
      start = new Date(startDate as string);
      end = new Date(endDate as string);
    } else {
      // Default to last 30 days
      const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : period === 'year' ? 365 : 30;
      start = new Date(end.getTime() - periodDays * 24 * 60 * 60 * 1000);
    }

    const metrics = await conversationMetricsService.getConversationMetrics(start, end);

    sendSuccess(res, {
      metrics,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
  })
);

/**
 * GET /api/conversation-metrics/user/:userId
 * Get engagement metrics for a specific user
 * Admin or the user themselves
 */
router.get(
  '/user/:userId',
  requireAuth,
  apiRateLimit,
  asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.userId);
    const { startDate, endDate } = req.query;

    // Check authorization - users can only view their own metrics unless admin
    // Note: Admin check is handled by middleware if needed
    if (req.user!.id !== userId) {
      throw AppError.createAuthorizationError('Unauthorized to view this user\'s metrics', 'UNAUTHORIZED_METRICS_ACCESS');
    }

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const metrics = await conversationMetricsService.getUserEngagementMetrics(
      userId,
      start,
      end
    );

    sendSuccess(res, { metrics });
  })
);

/**
 * GET /api/conversation-metrics/top-conversations
 * Get top performing conversations
 * Admin only
 */
router.get(
  '/top-conversations',
  requireAuth,
  requireRole(UserRole.ADMIN),
  apiRateLimit,
  asyncHandler(async (req, res) => {
    const { limit, startDate, endDate } = req.query;

    const limitNum = limit ? parseInt(limit as string) : 10;
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const topConversations = await conversationMetricsService.getTopConversations(
      limitNum,
      start,
      end
    );

    sendSuccess(res, { conversations: topConversations });
  })
);

/**
 * GET /api/conversation-metrics/adoption-rate
 * Get conversation adoption rate
 * Admin only
 */
router.get(
  '/adoption-rate',
  requireAuth,
  requireRole(UserRole.ADMIN),
  apiRateLimit,
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate ? new Date(startDate as string) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const adoptionRate = await conversationMetricsService.calculateAdoptionRate(start, end);

    sendSuccess(res, {
      adoptionRate,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
  })
);

/**
 * GET /api/conversation-metrics/conversion-impact
 * Get conversion impact of conversations
 * Admin only
 */
router.get(
  '/conversion-impact',
  requireAuth,
  requireRole(UserRole.ADMIN),
  apiRateLimit,
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate ? new Date(startDate as string) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const conversionImpact = await conversationMetricsService.calculateConversionImpact(start, end);

    sendSuccess(res, {
      conversionImpact,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
  })
);

/**
 * POST /api/conversation-metrics/track-event
 * Track a conversation event
 * Authenticated users
 */
router.post(
  '/track-event',
  requireAuth,
  apiRateLimit,
  asyncHandler(async (req, res) => {
    const { eventType, conversationId, metadata } = req.body;

    if (!eventType || !conversationId) {
      throw AppError.createValidationError('Event type and conversation ID are required', 'MISSING_REQUIRED_FIELDS');
    }

    await conversationMetricsService.trackConversationEvent(
      eventType,
      conversationId,
      metadata
    );

    sendSuccess(res, { message: 'Event tracked successfully' });
  })
);

export default router;
