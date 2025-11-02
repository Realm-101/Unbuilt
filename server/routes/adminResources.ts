import { Router, Request, Response } from 'express';
import { jwtAuth } from '../middleware/jwtAuth';
import {
  requirePermission,
  addUserAuthorization,
  logAuthorizationEvent
} from '../middleware/authorization';
import { Permission } from '../services/authorizationService';
import {
  AppError,
  asyncHandler,
  sendSuccess
} from '../middleware/errorHandler';
import { resourceRepository } from '../repositories/resourceRepository';
import { contributionRepository } from '../repositories/contributionRepository';
import { categoryRepository } from '../repositories/categoryRepository';
import { tagRepository } from '../repositories/tagRepository';
import { createResourceSchema, type InsertResource } from '@shared/schema';
import {
  notifyAdminsOfNewContribution,
  notifyContributorOfApproval,
  notifyContributorOfRejection
} from '../services/contributionNotificationService';
import { resourceCacheService } from '../services/resourceCacheService';

const router = Router();

// Apply JWT auth and authorization to all admin resource routes
router.use(jwtAuth);
router.use(addUserAuthorization);

/**
 * POST /api/admin/resources
 * Create a new resource (admin only)
 */
router.post(
  '/',
  requirePermission(Permission.MANAGE_USERS), // Using MANAGE_USERS as proxy for admin
  logAuthorizationEvent('create_resource'),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    // Validate input
    const validatedData = createResourceSchema.parse(req.body);
    
    const resourceData: InsertResource = {
      ...validatedData,
      createdBy: userId,
      isActive: true,
      averageRating: 0,
      ratingCount: 0,
      viewCount: 0,
      bookmarkCount: 0
    };

    // Create resource
    const resource = await resourceRepository.create(resourceData);

    // Assign tags if provided
    if (req.body.tagIds && Array.isArray(req.body.tagIds)) {
      await resourceRepository.assignTags(resource.id, req.body.tagIds);
    }

    // Invalidate all resource caches
    await resourceCacheService.invalidateAllResourceCaches();

    // Fetch complete resource with relations
    const completeResource = await resourceRepository.findById(resource.id);

    sendSuccess(res, completeResource, 'Resource created successfully');
  })
);

/**
 * PATCH /api/admin/resources/:id
 * Update a resource (admin only)
 */
router.patch(
  '/:id',
  requirePermission(Permission.MANAGE_USERS),
  logAuthorizationEvent('update_resource'),
  asyncHandler(async (req: Request, res: Response) => {
    const resourceId = parseInt(req.params.id);

    if (isNaN(resourceId)) {
      throw AppError.createValidationError('Invalid resource ID', 'INVALID_RESOURCE_ID');
    }

    // Check if resource exists
    const existingResource = await resourceRepository.findById(resourceId);
    if (!existingResource) {
      throw AppError.createNotFoundError('Resource not found', 'RESOURCE_NOT_FOUND');
    }

    // Extract tag IDs before validation
    const { tagIds, ...updateData } = req.body;

    // Update resource
    const updatedResource = await resourceRepository.update(resourceId, updateData);

    if (!updatedResource) {
      throw AppError.createNotFoundError('Resource not found', 'RESOURCE_NOT_FOUND');
    }

    // Invalidate caches for this resource
    await resourceCacheService.invalidateResourceCaches(resourceId);

    // Update tags if provided
    if (tagIds && Array.isArray(tagIds)) {
      await resourceRepository.assignTags(resourceId, tagIds);
    }

    // Fetch complete resource with relations
    const completeResource = await resourceRepository.findById(resourceId);

    sendSuccess(res, completeResource, 'Resource updated successfully');
  })
);

/**
 * DELETE /api/admin/resources/:id
 * Delete a resource (admin only)
 */
router.delete(
  '/:id',
  requirePermission(Permission.MANAGE_USERS),
  logAuthorizationEvent('delete_resource'),
  asyncHandler(async (req: Request, res: Response) => {
    const resourceId = parseInt(req.params.id);

    if (isNaN(resourceId)) {
      throw AppError.createValidationError('Invalid resource ID', 'INVALID_RESOURCE_ID');
    }

    // Check if resource exists
    const existingResource = await resourceRepository.findById(resourceId);
    if (!existingResource) {
      throw AppError.createNotFoundError('Resource not found', 'RESOURCE_NOT_FOUND');
    }

    // Soft delete (set isActive to false)
    const deleted = await resourceRepository.delete(resourceId);

    if (!deleted) {
      throw AppError.createNotFoundError('Resource not found or already deleted', 'DELETE_FAILED');
    }

    // Invalidate caches for this resource
    await resourceCacheService.invalidateResourceCaches(resourceId);

    sendSuccess(res, null, 'Resource deleted successfully');
  })
);

/**
 * GET /api/admin/resources/contributions/pending
 * Get pending contributions (admin only)
 */
router.get(
  '/contributions/pending',
  requirePermission(Permission.MANAGE_USERS),
  logAuthorizationEvent('view_pending_contributions'),
  asyncHandler(async (req: Request, res: Response) => {
    const pendingContributions = await contributionRepository.findPending();

    sendSuccess(res, {
      contributions: pendingContributions,
      count: pendingContributions.length
    });
  })
);

/**
 * POST /api/admin/resources/contributions/:id/approve
 * Approve a contribution (admin only)
 */
router.post(
  '/contributions/:id/approve',
  requirePermission(Permission.MANAGE_USERS),
  logAuthorizationEvent('approve_contribution'),
  asyncHandler(async (req: Request, res: Response) => {
    const contributionId = parseInt(req.params.id);
    const adminId = req.user!.id;

    if (isNaN(contributionId)) {
      throw AppError.createValidationError('Invalid contribution ID', 'INVALID_CONTRIBUTION_ID');
    }

    // Get contribution
    const contribution = await contributionRepository.findById(contributionId);
    if (!contribution) {
      throw AppError.createNotFoundError('Contribution not found', 'CONTRIBUTION_NOT_FOUND');
    }

    if (contribution.status !== 'pending') {
      throw AppError.createValidationError(
        'Only pending contributions can be approved',
        'INVALID_STATUS'
      );
    }

    const { resourceData, adminNotes } = req.body;

    // Create resource from contribution
    const newResource = await resourceRepository.create({
      title: resourceData?.title || contribution.title,
      description: resourceData?.description || contribution.description,
      url: resourceData?.url || contribution.url,
      resourceType: resourceData?.resourceType || 'tool',
      categoryId: resourceData?.categoryId || contribution.suggestedCategoryId || null,
      phaseRelevance: resourceData?.phaseRelevance || [],
      ideaTypes: resourceData?.ideaTypes || [],
      difficultyLevel: resourceData?.difficultyLevel || null,
      estimatedTimeMinutes: resourceData?.estimatedTimeMinutes || null,
      isPremium: resourceData?.isPremium || false,
      isActive: true,
      metadata: resourceData?.metadata || {},
      createdBy: contribution.userId
    });

    // Assign tags if provided
    if (contribution.suggestedTags && Array.isArray(contribution.suggestedTags) && contribution.suggestedTags.length > 0) {
      // Find or create tags
      const tagIds = await Promise.all(
        contribution.suggestedTags.map(async (tagName: string) => {
          const existingTag = await tagRepository.findByName(tagName);
          if (existingTag) {
            return existingTag.id;
          }
          const newTag = await tagRepository.create({
            name: tagName,
            slug: tagName.toLowerCase().replace(/\s+/g, '-')
          });
          return newTag.id;
        })
      );
      await resourceRepository.assignTags(newResource.id, tagIds);
    }

    // Mark contribution as approved
    await contributionRepository.approve(contributionId, adminId, adminNotes);

    // Invalidate all resource caches since a new resource was created
    await resourceCacheService.invalidateAllResourceCaches();

    // Send notification to contributor
    await notifyContributorOfApproval(contributionId, adminNotes);

    // Fetch complete resource
    const completeResource = await resourceRepository.findById(newResource.id);

    sendSuccess(res, {
      resource: completeResource,
      contribution: await contributionRepository.findById(contributionId)
    }, 'Contribution approved and resource created');
  })
);

/**
 * POST /api/admin/resources/contributions/:id/reject
 * Reject a contribution (admin only)
 */
router.post(
  '/contributions/:id/reject',
  requirePermission(Permission.MANAGE_USERS),
  logAuthorizationEvent('reject_contribution'),
  asyncHandler(async (req: Request, res: Response) => {
    const contributionId = parseInt(req.params.id);
    const adminId = req.user!.id;

    if (isNaN(contributionId)) {
      throw AppError.createValidationError('Invalid contribution ID', 'INVALID_CONTRIBUTION_ID');
    }

    const { reason } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw AppError.createValidationError(
        'Rejection reason is required',
        'MISSING_REASON'
      );
    }

    // Get contribution
    const contribution = await contributionRepository.findById(contributionId);
    if (!contribution) {
      throw AppError.createNotFoundError('Contribution not found', 'CONTRIBUTION_NOT_FOUND');
    }

    if (contribution.status !== 'pending') {
      throw AppError.createValidationError(
        'Only pending contributions can be rejected',
        'INVALID_STATUS'
      );
    }

    // Mark contribution as rejected
    const rejectedContribution = await contributionRepository.reject(
      contributionId,
      adminId,
      reason
    );

    // Send notification to contributor
    await notifyContributorOfRejection(contributionId, reason);

    sendSuccess(res, rejectedContribution, 'Contribution rejected');
  })
);

/**
 * GET /api/admin/resources/:id/analytics
 * Get resource analytics (admin only)
 */
router.get(
  '/:id/analytics',
  requirePermission(Permission.VIEW_ANALYTICS),
  logAuthorizationEvent('view_resource_analytics'),
  asyncHandler(async (req: Request, res: Response) => {
    const resourceId = parseInt(req.params.id);

    if (isNaN(resourceId)) {
      throw AppError.createValidationError('Invalid resource ID', 'INVALID_RESOURCE_ID');
    }

    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    // Get resource
    const resource = await resourceRepository.findById(resourceId);
    if (!resource) {
      throw AppError.createNotFoundError('Resource not found', 'RESOURCE_NOT_FOUND');
    }

    // Import analytics repository
    const { db } = await import('../db');
    const { resourceAnalytics } = await import('@shared/schema');
    const { eq, and, gte, lte, sql } = await import('drizzle-orm');

    // Build date filter
    const conditions = [eq(resourceAnalytics.resourceId, resourceId)];
    
    if (startDate) {
      conditions.push(gte(resourceAnalytics.date, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(resourceAnalytics.date, endDate));
    }

    // Get analytics data
    const analyticsData = await db
      .select()
      .from(resourceAnalytics)
      .where(and(...conditions))
      .orderBy(resourceAnalytics.date);

    // Calculate totals
    const totals = analyticsData.reduce(
      (acc, day) => ({
        totalViews: acc.totalViews + (day.viewCount || 0),
        totalUniqueUsers: acc.totalUniqueUsers + (day.uniqueUsers || 0),
        totalBookmarks: acc.totalBookmarks + (day.bookmarkCount || 0),
        totalDownloads: acc.totalDownloads + (day.downloadCount || 0),
        totalExternalClicks: acc.totalExternalClicks + (day.externalClickCount || 0)
      }),
      {
        totalViews: 0,
        totalUniqueUsers: 0,
        totalBookmarks: 0,
        totalDownloads: 0,
        totalExternalClicks: 0
      }
    );

    sendSuccess(res, {
      resource: {
        id: resource.id,
        title: resource.title,
        averageRating: resource.averageRating / 100, // Convert back to decimal
        ratingCount: resource.ratingCount,
        viewCount: resource.viewCount,
        bookmarkCount: resource.bookmarkCount
      },
      analytics: analyticsData,
      totals,
      dateRange: {
        start: startDate || analyticsData[0]?.date,
        end: endDate || analyticsData[analyticsData.length - 1]?.date
      }
    });
  })
);

/**
 * GET /api/admin/resources/stats
 * Get overall resource statistics (admin only)
 */
router.get(
  '/stats',
  requirePermission(Permission.VIEW_ANALYTICS),
  logAuthorizationEvent('view_resource_stats'),
  asyncHandler(async (req: Request, res: Response) => {
    const { db } = await import('../db');
    const { resources, resourceContributions } = await import('@shared/schema');
    const { sql, eq } = await import('drizzle-orm');

    // Get resource counts
    const [resourceStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) FILTER (WHERE ${resources.isActive} = true)::int`,
        premium: sql<number>`count(*) FILTER (WHERE ${resources.isPremium} = true)::int`
      })
      .from(resources);

    // Get contribution stats
    const contributionStats = await contributionRepository.getStats();

    // Get top resources by views
    const topByViews = await resourceRepository.findAll(
      { isActive: true },
      { sortBy: 'popular', limit: 10 }
    );

    // Get top resources by rating
    const topByRating = await resourceRepository.findAll(
      { isActive: true },
      { sortBy: 'rating', limit: 10 }
    );

    // Get top resources by bookmarks
    const topByBookmarksQuery = await db
      .select()
      .from(resources)
      .where(eq(resources.isActive, true))
      .orderBy(sql`${resources.bookmarkCount} DESC`)
      .limit(10);

    sendSuccess(res, {
      resources: resourceStats,
      contributions: contributionStats,
      topResources: {
        byViews: topByViews.resources.slice(0, 10),
        byRating: topByRating.resources.slice(0, 10),
        byBookmarks: topByBookmarksQuery
      }
    });
  })
);

export default router;
