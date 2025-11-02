import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/authorization';
import { apiRateLimit } from '../middleware/rateLimiting';
import { asyncHandler, sendSuccess, AppError } from '../middleware/errorHandler';
import { conversationAlertingService } from '../services/conversationAlertingService';
import { UserRole } from '../services/authorizationService';

const router = Router();

/**
 * GET /api/conversation-alerts
 * Get all alerts with optional filtering
 * Admin only
 */
router.get(
  '/',
  requireAuth,
  requireRole(UserRole.ADMIN),
  apiRateLimit,
  asyncHandler(async (req, res) => {
    const { severity, type, resolved, limit } = req.query;

    const alerts = conversationAlertingService.getAlerts({
      severity: severity as any,
      type: type as any,
      resolved: resolved === 'true' ? true : resolved === 'false' ? false : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    sendSuccess(res, { alerts, count: alerts.length });
  })
);

/**
 * GET /api/conversation-alerts/unresolved
 * Get unresolved alerts
 * Admin only
 */
router.get(
  '/unresolved',
  requireAuth,
  requireRole(UserRole.ADMIN),
  apiRateLimit,
  asyncHandler(async (req, res) => {
    const alerts = conversationAlertingService.getUnresolvedAlerts();
    sendSuccess(res, { alerts, count: alerts.length });
  })
);

/**
 * GET /api/conversation-alerts/stats
 * Get alert statistics
 * Admin only
 */
router.get(
  '/stats',
  requireAuth,
  requireRole(UserRole.ADMIN),
  apiRateLimit,
  asyncHandler(async (req, res) => {
    const stats = conversationAlertingService.getAlertStats();
    sendSuccess(res, { stats });
  })
);

/**
 * POST /api/conversation-alerts/:alertId/resolve
 * Resolve a specific alert
 * Admin only
 */
router.post(
  '/:alertId/resolve',
  requireAuth,
  requireRole(UserRole.ADMIN),
  apiRateLimit,
  asyncHandler(async (req, res) => {
    const { alertId } = req.params;

    const resolved = conversationAlertingService.resolveAlert(alertId);

    if (!resolved) {
      throw AppError.createNotFoundError('Alert not found', 'ALERT_NOT_FOUND');
    }

    sendSuccess(res, { message: 'Alert resolved successfully' });
  })
);

/**
 * POST /api/conversation-alerts/resolve-by-type
 * Resolve all alerts of a specific type
 * Admin only
 */
router.post(
  '/resolve-by-type',
  requireAuth,
  requireRole(UserRole.ADMIN),
  apiRateLimit,
  asyncHandler(async (req, res) => {
    const { type } = req.body;

    if (!type) {
      throw AppError.createValidationError('Alert type is required', 'ALERT_TYPE_REQUIRED');
    }

    const count = conversationAlertingService.resolveAlertsByType(type);

    sendSuccess(res, { message: `Resolved ${count} alerts`, count });
  })
);

/**
 * GET /api/conversation-alerts/thresholds
 * Get current alert thresholds
 * Admin only
 */
router.get(
  '/thresholds',
  requireAuth,
  requireRole(UserRole.ADMIN),
  apiRateLimit,
  asyncHandler(async (req, res) => {
    const thresholds = conversationAlertingService.getThresholds();
    sendSuccess(res, { thresholds });
  })
);

/**
 * PUT /api/conversation-alerts/thresholds
 * Update alert thresholds
 * Admin only
 */
router.put(
  '/thresholds',
  requireAuth,
  requireRole(UserRole.ADMIN),
  apiRateLimit,
  asyncHandler(async (req, res) => {
    const { errorRate, responseTime, costSpike, inappropriateContentRate } = req.body;

    const updates: any = {};
    if (errorRate !== undefined) updates.errorRate = errorRate;
    if (responseTime !== undefined) updates.responseTime = responseTime;
    if (costSpike !== undefined) updates.costSpike = costSpike;
    if (inappropriateContentRate !== undefined) {
      updates.inappropriateContentRate = inappropriateContentRate;
    }

    conversationAlertingService.updateThresholds(updates);

    const thresholds = conversationAlertingService.getThresholds();
    sendSuccess(res, { thresholds, message: 'Thresholds updated successfully' });
  })
);

/**
 * POST /api/conversation-alerts/start-monitoring
 * Start alert monitoring
 * Admin only
 */
router.post(
  '/start-monitoring',
  requireAuth,
  requireRole(UserRole.ADMIN),
  apiRateLimit,
  asyncHandler(async (req, res) => {
    conversationAlertingService.startMonitoring();
    sendSuccess(res, { message: 'Monitoring started' });
  })
);

/**
 * POST /api/conversation-alerts/stop-monitoring
 * Stop alert monitoring
 * Admin only
 */
router.post(
  '/stop-monitoring',
  requireAuth,
  requireRole(UserRole.ADMIN),
  apiRateLimit,
  asyncHandler(async (req, res) => {
    conversationAlertingService.stopMonitoring();
    sendSuccess(res, { message: 'Monitoring stopped' });
  })
);

/**
 * DELETE /api/conversation-alerts
 * Clear all alerts
 * Admin only
 */
router.delete(
  '/',
  requireAuth,
  requireRole(UserRole.ADMIN),
  apiRateLimit,
  asyncHandler(async (req, res) => {
    conversationAlertingService.clearAlerts();
    sendSuccess(res, { message: 'All alerts cleared' });
  })
);

export default router;
