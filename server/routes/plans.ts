import { Router } from 'express';
import { jwtAuth } from '../middleware/jwtAuth';
import { asyncHandler, sendSuccess, AppError } from '../middleware/errorHandler';
import { exportRateLimit } from '../middleware/rateLimiting';
import { PlanService } from '../services/planService';
import { TaskService } from '../services/taskService';
import { planWebSocketService } from '../services/planWebSocketService';
import { z } from 'zod';

const router = Router();
const planService = new PlanService();
const taskService = new TaskService();

// Validation schemas
const createPlanSchema = z.object({
  searchId: z.number().int().positive(),
  templateId: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

const updatePlanSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
});

const createTaskSchema = z.object({
  phaseId: z.number().int().positive(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  estimatedTime: z.string().optional(),
  resources: z.array(z.string()).optional(),
  order: z.number().int().min(0),
  assigneeId: z.number().int().positive().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  estimatedTime: z.string().optional(),
  resources: z.array(z.string()).optional(),
  order: z.number().int().min(0).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'skipped']).optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
});

const reorderTasksSchema = z.object({
  taskIds: z.array(z.number().int().positive()).min(1),
});

/**
 * Middleware to verify plan ownership
 * Loads the plan and verifies the authenticated user owns it
 */
const verifyPlanOwnership = asyncHandler(async (req, res, next) => {
  const planId = parseInt(req.params.planId);
  const userId = req.user!.id;

  if (isNaN(planId)) {
    throw AppError.createValidationError('Invalid plan ID', 'VAL_INVALID_ID');
  }

  const plan = await planService.getPlanById(planId);
  
  if (!plan) {
    throw AppError.createNotFoundError('Plan not found', 'PLAN_NOT_FOUND');
  }

  if (plan.userId !== userId) {
    throw AppError.createAuthorizationError('Access denied', 'PLAN_ACCESS_DENIED');
  }

  // Attach plan to request for use in route handlers
  (req as any).plan = plan;
  if (next) next();
});

/**
 * GET /api/plans/users/:userId/progress/summary
 * Get progress summary across all active plans for a user
 * Used for dashboard overview
 * NOTE: This route must come before other parameterized routes to avoid conflicts
 */
router.get('/users/:userId/progress/summary', jwtAuth, asyncHandler(async (req, res) => {
  const requestedUserId = parseInt(req.params.userId);
  const authenticatedUserId = req.user!.id;

  if (isNaN(requestedUserId)) {
    throw AppError.createValidationError('Invalid user ID', 'VAL_INVALID_ID');
  }

  // Verify user can only access their own summary
  if (requestedUserId !== authenticatedUserId) {
    throw AppError.createAuthorizationError('Access denied', 'USER_ACCESS_DENIED');
  }

  // Import ProgressService and cache service
  const { progressService } = await import('../services/progressService');
  const { cacheService, CacheNamespaces, CacheTTL } = await import('../services/cache');

  // Generate cache key for this user's summary
  const cacheKey = cacheService.generateKey(
    CacheNamespaces.SEARCH_RESULTS,
    `user-progress-summary:${requestedUserId}`
  );

  // Check cache first
  let summary = await cacheService.get<{
    activePlans: number;
    totalTasks: number;
    completedTasks: number;
    overallCompletionPercentage: number;
    averageVelocity: number;
  }>(cacheKey);

  if (!summary) {
    // Calculate summary from database
    summary = await progressService.getUserProgressSummary(requestedUserId);

    // Cache for 5 minutes (summary changes frequently)
    await cacheService.set(cacheKey, summary, CacheTTL.SHORT);
  }

  sendSuccess(res, summary);
}));

/**
 * GET /api/plans/search/:searchId
 * Fetch action plan for a search
 */
router.get('/search/:searchId', jwtAuth, asyncHandler(async (req, res) => {
  const searchId = parseInt(req.params.searchId);
  const userId = req.user!.id;

  if (isNaN(searchId)) {
    throw AppError.createValidationError('Invalid search ID', 'VAL_INVALID_ID');
  }

  const plan = await planService.getPlanBySearchId(searchId, userId);
  
  if (!plan) {
    throw AppError.createNotFoundError('Plan not found for this search', 'PLAN_NOT_FOUND');
  }

  sendSuccess(res, plan);
}));

/**
 * POST /api/plans
 * Create new action plan
 */
router.post('/', jwtAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const data = createPlanSchema.parse(req.body);

  // Create plan (service will verify search ownership)
  const plan = await planService.createPlan({
    searchId: data.searchId,
    userId,
    templateId: data.templateId || null,
    title: data.title,
    description: data.description || '',
  });

  sendSuccess(res, plan, 'Plan created successfully', 201);
}));

/**
 * PATCH /api/plans/:planId
 * Update plan metadata
 */
router.patch('/:planId', jwtAuth, verifyPlanOwnership, asyncHandler(async (req, res) => {
  const planId = parseInt(req.params.planId);
  const data = updatePlanSchema.parse(req.body);

  const updatedPlan = await planService.updatePlan(planId, data);

  sendSuccess(res, updatedPlan);
}));

/**
 * GET /api/plans/:planId/tasks
 * Fetch all tasks for a plan
 */
router.get('/:planId/tasks', jwtAuth, verifyPlanOwnership, asyncHandler(async (req, res) => {
  const planId = parseInt(req.params.planId);
  const userId = req.user!.id;

  const tasks = await taskService.getTasksByPlanId(planId, userId);

  sendSuccess(res, tasks);
}));

/**
 * POST /api/plans/:planId/tasks
 * Create new task
 */
router.post('/:planId/tasks', jwtAuth, verifyPlanOwnership, asyncHandler(async (req, res) => {
  const planId = parseInt(req.params.planId);
  const data = createTaskSchema.parse(req.body);
  const userId = req.user!.id;

  // Verify phase belongs to this plan
  const phase = await planService.getPhaseById(data.phaseId);
  
  if (!phase) {
    throw AppError.createNotFoundError('Phase not found', 'PHASE_NOT_FOUND');
  }

  if (phase.planId !== planId) {
    throw AppError.createValidationError('Phase does not belong to this plan', 'VAL_PHASE_MISMATCH');
  }

  const task = await taskService.createTask({
    phaseId: data.phaseId,
    planId,
    title: data.title,
    description: data.description || '',
    estimatedTime: data.estimatedTime || '',
    resources: data.resources || [],
    order: data.order,
    isCustom: true, // User-created tasks are always custom
    assigneeId: data.assigneeId || null,
  }, userId);

  // Broadcast task creation via WebSocket
  planWebSocketService.broadcastTaskCreated(
    planId.toString(),
    task,
    userId
  );

  sendSuccess(res, task, 'Task created successfully', 201);
}));

/**
 * POST /api/plans/:planId/tasks/reorder
 * Reorder tasks within a phase
 */
router.post('/:planId/tasks/reorder', jwtAuth, verifyPlanOwnership, asyncHandler(async (req, res) => {
  const planId = parseInt(req.params.planId);
  const { taskIds, phaseId } = z.object({
    taskIds: z.array(z.number().int().positive()).min(1),
    phaseId: z.number().int().positive(),
  }).parse(req.body);
  const userId = req.user!.id;

  await taskService.reorderTasks(phaseId, userId, taskIds);

  // Broadcast task reordering via WebSocket
  planWebSocketService.broadcastTaskReordered(
    planId.toString(),
    taskIds.map(id => id.toString()),
    userId
  );

  sendSuccess(res, { message: 'Tasks reordered successfully' });
}));

/**
 * POST /api/plans/:planId/apply-template
 * Apply a template to an existing plan
 * Warning: This will replace all existing phases and tasks
 */
router.post('/:planId/apply-template', jwtAuth, verifyPlanOwnership, asyncHandler(async (req, res) => {
  const planId = parseInt(req.params.planId);
  const { templateId } = z.object({
    templateId: z.number().int().positive(),
  }).parse(req.body);
  const userId = req.user!.id;

  // Import TemplateService
  const { TemplateService } = await import('../services/templateService');
  const templateService = new TemplateService();

  // Apply template to plan
  const updatedPlan = await templateService.applyTemplateToPlan(
    planId,
    templateId,
    userId
  );

  sendSuccess(res, updatedPlan, 'Template applied successfully');
}));

/**
 * GET /api/plans/:planId/progress/history
 * Get progress history for a plan
 */
router.get('/:planId/progress/history', jwtAuth, verifyPlanOwnership, asyncHandler(async (req, res) => {
  const planId = parseInt(req.params.planId);
  const userId = req.user!.id;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;

  // Import ProgressService
  const { progressService } = await import('../services/progressService');

  const history = await progressService.getProgressHistory(planId, userId, limit);

  sendSuccess(res, history);
}));

/**
 * GET /api/plans/:planId/dependencies
 * Get all dependencies for a plan
 * Returns a map of task ID to its prerequisites and dependents
 */
router.get('/:planId/dependencies', jwtAuth, verifyPlanOwnership, asyncHandler(async (req, res) => {
  const planId = parseInt(req.params.planId);
  const userId = req.user!.id;

  // Import DependencyService
  const { dependencyService } = await import('../services/dependencyService');

  const dependencyMap = await dependencyService.getPlanDependencies(planId, userId);

  // Convert Map to object for JSON serialization
  const dependencyObject: Record<string, { prerequisites: number[]; dependents: number[] }> = {};
  dependencyMap.forEach((value, key) => {
    dependencyObject[key.toString()] = value;
  });

  sendSuccess(res, dependencyObject);
}));

/**
 * POST /api/plans/:planId/export
 * Export action plan to various formats
 * Supports: CSV, JSON, Markdown
 * Rate limited to prevent abuse
 * Requirements: 7.1, 7.7
 */
router.post('/:planId/export', exportRateLimit, jwtAuth, verifyPlanOwnership, asyncHandler(async (req, res) => {
  const planId = parseInt(req.params.planId);
  const plan = (req as any).plan; // Loaded by verifyPlanOwnership middleware

  // Validate export request
  const exportSchema = z.object({
    format: z.enum(['csv', 'json', 'markdown']),
    includeCompleted: z.boolean().optional().default(true),
    includeSkipped: z.boolean().optional().default(true),
  });

  const { format, includeCompleted, includeSkipped } = exportSchema.parse(req.body);

  // Import export service
  const { planExportService } = await import('../services/planExportService');

  // Get plan with phases and tasks
  const phases = await planService.getPhasesWithTasks(planId);

  // Generate export
  const exportBuffer = await planExportService.exportPlan(
    plan,
    phases,
    {
      format,
      includeCompleted,
      includeSkipped,
    }
  );

  // Generate filename
  const filename = planExportService.generateFilename(plan, format);
  const mimeType = planExportService.getMimeType(format);

  // Set response headers for file download
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', exportBuffer.length);

  // Send the file
  res.send(exportBuffer);
}));

/**
 * GET /api/plans/:planId/recommendations
 * Get recommendations for a plan
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */
router.get('/:planId/recommendations', jwtAuth, verifyPlanOwnership, asyncHandler(async (req, res) => {
  const planId = parseInt(req.params.planId);
  const userId = req.user!.id;

  // Import recommendation service
  const { recommendationService } = await import('../services/recommendationService');

  // Get recommendations
  const recommendations = await recommendationService.getRecommendationsForPlan(planId, userId);

  sendSuccess(res, recommendations);
}));

/**
 * POST /api/plans/:planId/recommendations/:recommendationId/dismiss
 * Dismiss a recommendation
 * 
 * Requirements: 8.5
 */
router.post('/:planId/recommendations/:recommendationId/dismiss', jwtAuth, verifyPlanOwnership, asyncHandler(async (req, res) => {
  const planId = parseInt(req.params.planId);
  const recommendationId = req.params.recommendationId;
  const userId = req.user!.id;

  // Import recommendation service
  const { recommendationService } = await import('../services/recommendationService');

  // Dismiss recommendation
  await recommendationService.dismissRecommendation(recommendationId, userId);

  sendSuccess(res, { dismissed: true });
}));

export default router;
