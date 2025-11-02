import { Router } from 'express';
import { jwtAuth } from '../middleware/jwtAuth';
import { asyncHandler, sendSuccess, AppError } from '../middleware/errorHandler';
import { validateIdParam } from '../middleware/validation';
import { dependencyService } from '../services/dependencyService';
import { z } from 'zod';

const router = Router();

// Validation schemas
const addDependencySchema = z.object({
  prerequisiteTaskId: z.number().int().positive(),
});

const validateDependencySchema = z.object({
  prerequisiteTaskId: z.number().int().positive(),
});

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
router.delete('/:dependencyId', jwtAuth, validateIdParam, asyncHandler(async (req, res) => {
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
