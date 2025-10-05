import { Router, Request, Response } from 'express';
import { jwtAuth } from '../middleware/jwtAuth';
import { requirePermission } from '../middleware/authorization';
import { Permission } from '../services/authorizationService';
import { asyncHandler, sendSuccess, AppError } from '../middleware/errorHandler';
import { analyticsService } from '../services/analytics';

const router = Router();

/**
 * Get analytics metrics for a date range
 * GET /api/analytics-admin/metrics
 * Requires admin permission
 */
router.get('/metrics', jwtAuth, requirePermission(Permission.MANAGE_USERS), asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    throw AppError.createValidationError('startDate and endDate are required', 'VAL_MISSING_FIELDS');
  }

  const start = new Date(startDate as string);
  const end = new Date(endDate as string);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw AppError.createValidationError('Invalid date format', 'VAL_INVALID_DATE');
  }

  const metrics = await analyticsService.getMetrics(start, end);

  sendSuccess(res, metrics);
}));

/**
 * Get user-specific analytics
 * GET /api/analytics-admin/user/:userId
 * Requires admin permission
 */
router.get('/user/:userId', jwtAuth, requirePermission(Permission.MANAGE_USERS), asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    throw AppError.createValidationError('startDate and endDate are required', 'VAL_MISSING_FIELDS');
  }

  const start = new Date(startDate as string);
  const end = new Date(endDate as string);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw AppError.createValidationError('Invalid date format', 'VAL_INVALID_DATE');
  }

  const events = await analyticsService.getUserAnalytics(userId, start, end);

  sendSuccess(res, { userId, events });
}));

/**
 * Clean up old analytics data
 * DELETE /api/analytics-admin/cleanup
 * Requires admin permission
 */
router.delete('/cleanup', jwtAuth, requirePermission(Permission.MANAGE_USERS), asyncHandler(async (req: Request, res: Response) => {
  const { daysToKeep } = req.body;

  const days = daysToKeep ? parseInt(daysToKeep) : 90;

  if (isNaN(days) || days < 1) {
    throw AppError.createValidationError('daysToKeep must be a positive number', 'VAL_INVALID_VALUE');
  }

  const deletedCount = await analyticsService.cleanupOldData(days);

  sendSuccess(res, {
    deletedCount,
    message: `Deleted ${deletedCount} analytics events older than ${days} days`,
  });
}));

export default router;
