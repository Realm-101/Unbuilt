import { Router } from 'express';
import { jwtAuth } from '../middleware/jwtAuth';
import { asyncHandler, sendSuccess, AppError } from '../middleware/errorHandler';
import { validateIdParam } from '../middleware/validation';
import { TaskService } from '../services/taskService';
import { PlanService } from '../services/planService';
import { dependencyService } from '../services/dependencyService';
import { planWebSocketService } from '../services/planWebSocketService';
import { z } from 'zod';

const router = Router();
const taskService = new TaskService();
const planService = new PlanService();

// Validation schemas
const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  estimatedTime: z.string().optional(),
  resources: z.array(z.string()).optional(),
  order: z.number().int().min(0).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'skipped']).optional(),
  assigneeId: z.number().int().positive().optional(),
  overridePrerequisites: z.boolean().optional(),
});

const addDependencySchema = z.object({
  prerequisiteTaskId: z.number().int().positive(),
});

const validateDependencySchema = z.object({
  prerequisiteTaskId: z.number().int().positive(),
});

/**
 * Middleware to verify task ownership
 * Loads the task and verifies the authenticated user owns the parent plan
 */
const verifyTaskOwnership = asyncHandler(async (req, res, next) => {
  const taskId = parseInt(req.params.taskId);
  const userId = req.user!.id;

  if (isNaN(taskId)) {
    throw AppError.createValidationError('Invalid task ID', 'VAL_INVALID_ID');
  }

  const task = await taskService.getTaskById(taskId, userId);
  
  if (!task) {
    throw AppError.createNotFoundError('Task not found', 'TASK_NOT_FOUND');
  }

  // Attach task to request for use in route handlers
  (req as any).task = task;
  if (next) next();
});

/**
 * PATCH /api/tasks/:taskId
 * Update task
 * 
 * Requirements: 5.5 - Dependency warnings with override
 */
router.patch('/:taskId', jwtAuth, validateIdParam, verifyTaskOwnership, asyncHandler(async (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const userId = req.user!.id;
  const data = updateTaskSchema.parse(req.body);

  let updatedTask;

  // If status is being updated, use updateTaskStatus with override support
  if (data.status !== undefined) {
    updatedTask = await taskService.updateTaskStatus(
      taskId,
      userId,
      data.status,
      data.overridePrerequisites || false
    );
  } else {
    // Otherwise use regular update
    const { overridePrerequisites, ...updateData } = data;
    updatedTask = await taskService.updateTask(taskId, userId, updateData);
  }

  // Broadcast task update via WebSocket
  if (updatedTask && updatedTask.planId) {
    planWebSocketService.broadcastTaskUpdate(
      updatedTask.planId.toString(),
      updatedTask,
      userId
    );
  }

  sendSuccess(res, updatedTask);
}));

/**
 * DELETE /api/tasks/:taskId
 * Delete task
 */
router.delete('/:taskId', jwtAuth, validateIdParam, verifyTaskOwnership, asyncHandler(async (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const userId = req.user!.id;
  const task = (req as any).task; // Loaded by verifyTaskOwnership middleware

  // Store planId before deletion
  const planId = task.planId;

  await taskService.deleteTask(taskId, userId);

  // Broadcast task deletion via WebSocket
  if (planId) {
    planWebSocketService.broadcastTaskDeleted(
      planId.toString(),
      taskId.toString(),
      userId
    );
  }

  sendSuccess(res, { message: 'Task deleted successfully' });
}));

/**
 * GET /api/tasks/:taskId/dependencies
 * Get all dependencies for a task (both prerequisites and dependents)
 * 
 * Requirements: 5.1, 5.6
 */
router.get('/:taskId/dependencies', jwtAuth, validateIdParam, asyncHandler(async (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const userId = req.user!.id;

  if (isNaN(taskId)) {
    throw AppError.createValidationError('Invalid task ID', 'VAL_INVALID_ID');
  }

  const dependencies = await dependencyService.getTaskDependencies(taskId, userId);

  sendSuccess(res, dependencies);
}));

/**
 * GET /api/tasks/:taskId/incomplete-prerequisites
 * Get incomplete prerequisite tasks for a task
 * Used for displaying dependency warnings
 * 
 * Requirements: 5.5
 */
router.get('/:taskId/incomplete-prerequisites', jwtAuth, validateIdParam, asyncHandler(async (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const userId = req.user!.id;

  if (isNaN(taskId)) {
    throw AppError.createValidationError('Invalid task ID', 'VAL_INVALID_ID');
  }

  const incompletePrerequisites = await dependencyService.getIncompletePrerequisites(taskId, userId);

  sendSuccess(res, incompletePrerequisites);
}));

/**
 * POST /api/tasks/:taskId/dependencies
 * Add a dependency to a task
 * 
 * Requirements: 5.1, 5.6
 */
router.post('/:taskId/dependencies', jwtAuth, validateIdParam, asyncHandler(async (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const userId = req.user!.id;

  if (isNaN(taskId)) {
    throw AppError.createValidationError('Invalid task ID', 'VAL_INVALID_ID');
  }

  const data = addDependencySchema.parse(req.body);

  try {
    const dependency = await dependencyService.addDependency(
      taskId,
      data.prerequisiteTaskId,
      userId
    );

    sendSuccess(res, dependency);
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific dependency errors
      if (error.message.includes('circular dependency') || 
          error.message.includes('Cannot add dependency')) {
        throw AppError.createValidationError(error.message, 'DEP_CIRCULAR_DEPENDENCY');
      }
      if (error.message.includes('already exists')) {
        throw AppError.createValidationError(error.message, 'DEP_ALREADY_EXISTS');
      }
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        throw AppError.createNotFoundError(error.message, 'TASK_NOT_FOUND');
      }
      if (error.message.includes('same plan')) {
        throw AppError.createValidationError(error.message, 'DEP_DIFFERENT_PLANS');
      }
    }
    throw error;
  }
}));

/**
 * POST /api/tasks/:taskId/dependencies/validate
 * Validate a potential dependency (check for circular dependencies)
 * 
 * Requirements: 5.1, 5.6
 */
router.post('/:taskId/dependencies/validate', jwtAuth, validateIdParam, asyncHandler(async (req, res) => {
  const taskId = parseInt(req.params.taskId);

  if (isNaN(taskId)) {
    throw AppError.createValidationError('Invalid task ID', 'VAL_INVALID_ID');
  }

  const data = validateDependencySchema.parse(req.body);

  const validation = await dependencyService.validateDependency(
    taskId,
    data.prerequisiteTaskId
  );

  sendSuccess(res, validation);
}));

/**
 * DELETE /api/dependencies/:dependencyId
 * Remove a dependency
 * 
 * Requirements: 5.1, 5.6
 */
router.delete('/dependencies/:dependencyId', jwtAuth, validateIdParam, asyncHandler(async (req, res) => {
  const dependencyId = parseInt(req.params.dependencyId);
  const userId = req.user!.id;

  if (isNaN(dependencyId)) {
    throw AppError.createValidationError('Invalid dependency ID', 'VAL_INVALID_ID');
  }

  try {
    await dependencyService.removeDependency(dependencyId, userId);
    sendSuccess(res, { message: 'Dependency removed successfully' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        throw AppError.createNotFoundError(error.message, 'DEPENDENCY_NOT_FOUND');
      }
      if (error.message.includes('access denied')) {
        throw AppError.createForbiddenError(error.message, 'ACCESS_DENIED');
      }
    }
    throw error;
  }
}));

export default router;
