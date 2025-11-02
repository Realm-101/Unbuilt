import { Router } from 'express';
import { jwtAuth } from '../middleware/jwtAuth';
import { asyncHandler, sendSuccess, AppError } from '../middleware/errorHandler';
import { TemplateService } from '../services/templateService';
import { z } from 'zod';

const router = Router();
const templateService = new TemplateService();

// Validation schemas
const applyTemplateSchema = z.object({
  templateId: z.number().int().positive(),
});

/**
 * GET /api/templates
 * Get all active templates, optionally filtered by category
 */
router.get('/', jwtAuth, asyncHandler(async (req, res) => {
  const category = req.query.category as string | undefined;
  
  const templates = await templateService.getTemplates(category);
  
  sendSuccess(res, templates);
}));

/**
 * GET /api/templates/:templateId
 * Get template details by ID
 */
router.get('/:templateId', jwtAuth, asyncHandler(async (req, res) => {
  const templateId = parseInt(req.params.templateId);
  
  if (isNaN(templateId)) {
    throw AppError.createValidationError('Invalid template ID', 'VAL_INVALID_ID');
  }
  
  const template = await templateService.getTemplateById(templateId);
  
  if (!template) {
    throw AppError.createNotFoundError('Template not found', 'TEMPLATE_NOT_FOUND');
  }
  
  sendSuccess(res, template);
}));

/**
 * GET /api/templates/default
 * Get the default template
 */
router.get('/default/template', jwtAuth, asyncHandler(async (req, res) => {
  const template = await templateService.getDefaultTemplate();
  
  if (!template) {
    throw AppError.createNotFoundError('No default template found', 'TEMPLATE_NOT_FOUND');
  }
  
  sendSuccess(res, template);
}));

/**
 * GET /api/templates/:templateId/stats
 * Get usage statistics for a template
 */
router.get('/:templateId/stats', jwtAuth, asyncHandler(async (req, res) => {
  const templateId = parseInt(req.params.templateId);
  
  if (isNaN(templateId)) {
    throw AppError.createValidationError('Invalid template ID', 'VAL_INVALID_ID');
  }
  
  const stats = await templateService.getTemplateUsageStats(templateId);
  
  sendSuccess(res, stats);
}));

/**
 * POST /api/templates/:templateId/apply
 * Apply template to an existing plan
 * This is handled in the plans route, but kept here for reference
 */
router.post('/:templateId/apply', jwtAuth, asyncHandler(async (req, res) => {
  const templateId = parseInt(req.params.templateId);
  const { planId } = applyTemplateSchema.parse(req.body);
  const userId = req.user!.id;
  
  if (isNaN(templateId)) {
    throw AppError.createValidationError('Invalid template ID', 'VAL_INVALID_ID');
  }
  
  const updatedPlan = await templateService.applyTemplateToPlan(
    planId,
    templateId,
    userId
  );
  
  sendSuccess(res, updatedPlan);
}));

export default router;
