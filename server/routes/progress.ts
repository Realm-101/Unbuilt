import { Router } from "express";
import { db } from "../db";
import { actionPlanProgress, searches } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { jwtAuth } from "../middleware/jwtAuth";
import { asyncHandler, sendSuccess, sendError, AppError } from "../middleware/errorHandler";
import { z } from "zod";

const router = Router();

// Validation schemas
const updateProgressSchema = z.object({
  completedSteps: z.array(z.string()),
  phaseCompletion: z.record(z.string(), z.number()),
  overallCompletion: z.number().min(0).max(100),
});

const completeStepSchema = z.object({
  stepId: z.string(),
  phaseId: z.string(),
  totalStepsInPhase: z.number().positive(),
});

/**
 * GET /api/progress/:analysisId
 * Get progress for a specific analysis
 * 
 * Requirements: 6.2, 6.4, 6.5
 */
router.get("/:analysisId", jwtAuth, asyncHandler(async (req, res) => {
  const analysisId = parseInt(req.params.analysisId);
  const userId = req.user!.id;
  
  if (isNaN(analysisId)) {
    throw AppError.createValidationError('Invalid analysis ID', 'VAL_INVALID_ID');
  }
  
  // Verify the search belongs to the user
  const search = await db
    .select()
    .from(searches)
    .where(and(
      eq(searches.id, analysisId),
      eq(searches.userId, userId)
    ))
    .limit(1);
  
  if (search.length === 0) {
    throw AppError.createNotFoundError('Analysis not found', 'NOT_FOUND_ANALYSIS');
  }
  
  // Get progress
  const progress = await db
    .select()
    .from(actionPlanProgress)
    .where(and(
      eq(actionPlanProgress.searchId, analysisId),
      eq(actionPlanProgress.userId, userId)
    ))
    .limit(1);
  
  if (progress.length === 0) {
    // Return empty progress if none exists
    return sendSuccess(res, {
      progress: {
        completedSteps: [],
        phaseCompletion: {},
        overallCompletion: 0,
        lastUpdated: new Date(),
      }
    });
  }
  
  sendSuccess(res, { progress: progress[0] });
}));

/**
 * POST /api/progress/:analysisId
 * Update progress for a specific analysis
 * 
 * Requirements: 6.2, 6.4
 */
router.post("/:analysisId", jwtAuth, asyncHandler(async (req, res) => {
  const analysisId = parseInt(req.params.analysisId);
  const userId = req.user!.id;
  
  if (isNaN(analysisId)) {
    throw AppError.createValidationError('Invalid analysis ID', 'VAL_INVALID_ID');
  }
  
  // Validate request body
  const validatedData = updateProgressSchema.parse(req.body);
  
  // Verify the search belongs to the user
  const search = await db
    .select()
    .from(searches)
    .where(and(
      eq(searches.id, analysisId),
      eq(searches.userId, userId)
    ))
    .limit(1);
  
  if (search.length === 0) {
    throw AppError.createNotFoundError('Analysis not found', 'NOT_FOUND_ANALYSIS');
  }
  
  // Check if progress exists
  const existingProgress = await db
    .select()
    .from(actionPlanProgress)
    .where(and(
      eq(actionPlanProgress.searchId, analysisId),
      eq(actionPlanProgress.userId, userId)
    ))
    .limit(1);
  
  let progress;
  
  if (existingProgress.length === 0) {
    // Create new progress
    const newProgress = await db
      .insert(actionPlanProgress)
      .values({
        userId,
        searchId: analysisId,
        completedSteps: validatedData.completedSteps,
        phaseCompletion: validatedData.phaseCompletion,
        overallCompletion: validatedData.overallCompletion,
        lastUpdated: new Date().toISOString(),
      })
      .returning();
    
    progress = newProgress[0];
  } else {
    // Update existing progress
    const updatedProgress = await db
      .update(actionPlanProgress)
      .set({
        completedSteps: validatedData.completedSteps,
        phaseCompletion: validatedData.phaseCompletion,
        overallCompletion: validatedData.overallCompletion,
        lastUpdated: new Date().toISOString(),
      })
      .where(and(
        eq(actionPlanProgress.searchId, analysisId),
        eq(actionPlanProgress.userId, userId)
      ))
      .returning();
    
    progress = updatedProgress[0];
  }
  
  sendSuccess(res, { progress, message: 'Progress updated successfully' });
}));

/**
 * POST /api/progress/:analysisId/steps/:stepId/complete
 * Mark a step as complete
 * 
 * Requirements: 6.1, 6.2
 */
router.post("/:analysisId/steps/:stepId/complete", jwtAuth, asyncHandler(async (req, res) => {
  const analysisId = parseInt(req.params.analysisId);
  const stepId = req.params.stepId;
  const userId = req.user!.id;
  
  if (isNaN(analysisId)) {
    throw AppError.createValidationError('Invalid analysis ID', 'VAL_INVALID_ID');
  }
  
  // Validate request body
  const { phaseId, totalStepsInPhase } = completeStepSchema.parse({
    stepId,
    phaseId: req.body.phaseId,
    totalStepsInPhase: req.body.totalStepsInPhase,
  });
  
  // Verify the search belongs to the user
  const search = await db
    .select()
    .from(searches)
    .where(and(
      eq(searches.id, analysisId),
      eq(searches.userId, userId)
    ))
    .limit(1);
  
  if (search.length === 0) {
    throw AppError.createNotFoundError('Analysis not found', 'NOT_FOUND_ANALYSIS');
  }
  
  // Get existing progress
  const existingProgress = await db
    .select()
    .from(actionPlanProgress)
    .where(and(
      eq(actionPlanProgress.searchId, analysisId),
      eq(actionPlanProgress.userId, userId)
    ))
    .limit(1);
  
  let completedSteps: string[] = [];
  let phaseCompletion: Record<string, number> = {};
  
  if (existingProgress.length > 0) {
    completedSteps = (existingProgress[0].completedSteps as string[]) || [];
    phaseCompletion = (existingProgress[0].phaseCompletion as Record<string, number>) || {};
  }
  
  // Add step if not already completed
  if (!completedSteps.includes(stepId)) {
    completedSteps.push(stepId);
  }
  
  // Calculate phase completion
  const phaseSteps = completedSteps.filter(s => s.startsWith(phaseId));
  phaseCompletion[phaseId] = (phaseSteps.length / totalStepsInPhase) * 100;
  
  // Calculate overall completion (average of all phases)
  const phaseCompletions = Object.values(phaseCompletion);
  const overallCompletion = phaseCompletions.length > 0
    ? phaseCompletions.reduce((sum, val) => sum + val, 0) / phaseCompletions.length
    : 0;
  
  // Update or create progress
  let progress;
  
  if (existingProgress.length === 0) {
    const newProgress = await db
      .insert(actionPlanProgress)
      .values({
        userId,
        searchId: analysisId,
        completedSteps,
        phaseCompletion,
        overallCompletion,
        lastUpdated: new Date().toISOString(),
      })
      .returning();
    
    progress = newProgress[0];
  } else {
    const updatedProgress = await db
      .update(actionPlanProgress)
      .set({
        completedSteps,
        phaseCompletion,
        overallCompletion,
        lastUpdated: new Date().toISOString(),
      })
      .where(and(
        eq(actionPlanProgress.searchId, analysisId),
        eq(actionPlanProgress.userId, userId)
      ))
      .returning();
    
    progress = updatedProgress[0];
  }
  
  sendSuccess(res, { progress, message: 'Step marked as complete' });
}));

/**
 * DELETE /api/progress/:analysisId/steps/:stepId/complete
 * Mark a step as incomplete (undo)
 * 
 * Requirements: 6.1, 6.2
 */
router.delete("/:analysisId/steps/:stepId/complete", jwtAuth, asyncHandler(async (req, res) => {
  const analysisId = parseInt(req.params.analysisId);
  const stepId = req.params.stepId;
  const userId = req.user!.id;
  
  if (isNaN(analysisId)) {
    throw AppError.createValidationError('Invalid analysis ID', 'VAL_INVALID_ID');
  }
  
  // Validate request body
  const { phaseId, totalStepsInPhase } = completeStepSchema.parse({
    stepId,
    phaseId: req.body.phaseId,
    totalStepsInPhase: req.body.totalStepsInPhase,
  });
  
  // Verify the search belongs to the user
  const search = await db
    .select()
    .from(searches)
    .where(and(
      eq(searches.id, analysisId),
      eq(searches.userId, userId)
    ))
    .limit(1);
  
  if (search.length === 0) {
    throw AppError.createNotFoundError('Analysis not found', 'NOT_FOUND_ANALYSIS');
  }
  
  // Get existing progress
  const existingProgress = await db
    .select()
    .from(actionPlanProgress)
    .where(and(
      eq(actionPlanProgress.searchId, analysisId),
      eq(actionPlanProgress.userId, userId)
    ))
    .limit(1);
  
  if (existingProgress.length === 0) {
    throw AppError.createNotFoundError('No progress found', 'NOT_FOUND_PROGRESS');
  }
  
  let completedSteps: string[] = (existingProgress[0].completedSteps as string[]) || [];
  let phaseCompletion: Record<string, number> = (existingProgress[0].phaseCompletion as Record<string, number>) || {};
  
  // Remove step
  completedSteps = completedSteps.filter(s => s !== stepId);
  
  // Recalculate phase completion
  const phaseSteps = completedSteps.filter(s => s.startsWith(phaseId));
  phaseCompletion[phaseId] = (phaseSteps.length / totalStepsInPhase) * 100;
  
  // Calculate overall completion
  const phaseCompletions = Object.values(phaseCompletion);
  const overallCompletion = phaseCompletions.length > 0
    ? phaseCompletions.reduce((sum, val) => sum + val, 0) / phaseCompletions.length
    : 0;
  
  // Update progress
  const updatedProgress = await db
    .update(actionPlanProgress)
    .set({
      completedSteps,
      phaseCompletion,
      overallCompletion,
      lastUpdated: new Date().toISOString(),
    })
    .where(and(
      eq(actionPlanProgress.searchId, analysisId),
      eq(actionPlanProgress.userId, userId)
    ))
    .returning();
  
  sendSuccess(res, { progress: updatedProgress[0], message: 'Step marked as incomplete' });
}));

/**
 * GET /api/progress/summary
 * Get progress summary across all projects
 * 
 * Requirements: 6.5
 */
router.get("/summary", jwtAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  
  // Get all progress for user
  const allProgress = await db
    .select()
    .from(actionPlanProgress)
    .where(eq(actionPlanProgress.userId, userId))
    .orderBy(desc(actionPlanProgress.lastUpdated));
  
  // Calculate summary statistics
  const totalProjects = allProgress.length;
  const completedProjects = allProgress.filter(p => p.overallCompletion === 100).length;
  const inProgressProjects = allProgress.filter(p => p.overallCompletion > 0 && p.overallCompletion < 100).length;
  const totalStepsCompleted = allProgress.reduce((sum, p) => {
    const steps = p.completedSteps as string[];
    return sum + (steps?.length || 0);
  }, 0);
  const averageCompletion = totalProjects > 0
    ? allProgress.reduce((sum, p) => sum + p.overallCompletion, 0) / totalProjects
    : 0;
  
  sendSuccess(res, {
    summary: {
      totalProjects,
      completedProjects,
      inProgressProjects,
      totalStepsCompleted,
      averageCompletion,
    },
    projects: allProgress,
  });
}));

export default router;
