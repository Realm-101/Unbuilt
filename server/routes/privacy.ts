import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users, analyticsEvents } from '@shared/schema';
import { eq, and, lte } from 'drizzle-orm';
import { jwtAuth } from '../middleware/jwtAuth';
import { asyncHandler, sendSuccess, AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * Get user's privacy settings
 * GET /api/privacy/settings
 */
router.get('/settings', jwtAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const [user] = await db
    .select({
      analyticsOptOut: users.analyticsOptOut,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw AppError.createNotFoundError('User not found', 'USER_NOT_FOUND');
  }

  sendSuccess(res, {
    analyticsOptOut: user.analyticsOptOut,
  });
}));

/**
 * Update user's privacy settings
 * PUT /api/privacy/settings
 */
router.put('/settings', jwtAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { analyticsOptOut } = req.body;

  if (typeof analyticsOptOut !== 'boolean') {
    throw AppError.createValidationError('analyticsOptOut must be a boolean', 'VAL_INVALID_TYPE');
  }

  await db
    .update(users)
    .set({ analyticsOptOut })
    .where(eq(users.id, userId));

  sendSuccess(res, {
    analyticsOptOut,
    message: analyticsOptOut 
      ? 'You have opted out of analytics tracking' 
      : 'You have opted in to analytics tracking',
  });
}));

/**
 * Delete user's analytics data
 * DELETE /api/privacy/analytics-data
 */
router.delete('/analytics-data', jwtAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  // Delete all analytics events for this user
  const result = await db
    .delete(analyticsEvents)
    .where(eq(analyticsEvents.userId, userId));

  const deletedCount = result.rowCount || 0;

  sendSuccess(res, {
    deletedCount,
    message: `Deleted ${deletedCount} analytics events`,
  });
}));

/**
 * Export user's analytics data (GDPR compliance)
 * GET /api/privacy/export-data
 */
router.get('/export-data', jwtAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  // Get all analytics events for this user
  const events = await db
    .select()
    .from(analyticsEvents)
    .where(eq(analyticsEvents.userId, userId))
    .orderBy(analyticsEvents.timestamp);

  // Get user data
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      plan: users.plan,
      createdAt: users.createdAt,
      analyticsOptOut: users.analyticsOptOut,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  sendSuccess(res, {
    user,
    analyticsEvents: events,
    exportDate: new Date().toISOString(),
  });
}));

export default router;
