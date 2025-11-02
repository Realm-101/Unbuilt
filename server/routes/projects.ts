import { Router } from "express";
import { db } from "../db";
import { 
  projects, 
  projectAnalyses, 
  searches,
  createProjectSchema,
  updateProjectSchema
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { jwtAuth } from "../middleware/jwtAuth";
import { asyncHandler, sendSuccess, AppError } from "../middleware/errorHandler";

const router = Router();

// GET /api/projects - List user's projects
router.get("/", jwtAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const includeArchived = req.query.includeArchived === 'true';

  // Build query conditions
  const conditions = includeArchived 
    ? eq(projects.userId, userId)
    : and(eq(projects.userId, userId), eq(projects.archived, false));

  // Get projects with analysis counts
  const userProjects = await db
    .select({
      id: projects.id,
      userId: projects.userId,
      name: projects.name,
      description: projects.description,
      tags: projects.tags,
      archived: projects.archived,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(conditions)
    .orderBy(desc(projects.updatedAt));

  // Get analysis counts for each project
  const projectsWithCounts = await Promise.all(
    userProjects.map(async (project) => {
      const analyses = await db
        .select()
        .from(projectAnalyses)
        .where(eq(projectAnalyses.projectId, project.id));

      return {
        ...project,
        analysisCount: analyses.length,
      };
    })
  );

  sendSuccess(res, projectsWithCounts);
}));

// POST /api/projects - Create new project
router.post("/", jwtAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const validatedData = createProjectSchema.parse(req.body);

  const [newProject] = await db
    .insert(projects)
    .values({
      userId,
      name: validatedData.name,
      description: validatedData.description || null,
      tags: validatedData.tags,
      archived: false,
    })
    .returning();

  sendSuccess(res, newProject, "Project created successfully", 201);
}));

// GET /api/projects/:id - Get project details with analyses
router.get("/:id", jwtAuth, asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const userId = req.user!.id;

  if (isNaN(projectId)) {
    throw AppError.createValidationError("Invalid project ID", "VAL_INVALID_ID");
  }

  // Get project
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

  if (!project) {
    throw AppError.createNotFoundError("Project not found", "NOT_FOUND_PROJECT");
  }

  // Get associated analyses
  const analyses = await db
    .select({
      id: searches.id,
      query: searches.query,
      timestamp: searches.timestamp,
      resultsCount: searches.resultsCount,
      isFavorite: searches.isFavorite,
      addedAt: projectAnalyses.addedAt,
    })
    .from(projectAnalyses)
    .innerJoin(searches, eq(projectAnalyses.searchId, searches.id))
    .where(eq(projectAnalyses.projectId, projectId))
    .orderBy(desc(projectAnalyses.addedAt));

  sendSuccess(res, {
    ...project,
    analyses,
  });
}));

// PUT /api/projects/:id - Update project
router.put("/:id", jwtAuth, asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const userId = req.user!.id;

  if (isNaN(projectId)) {
    throw AppError.createValidationError("Invalid project ID", "VAL_INVALID_ID");
  }

  const validatedData = updateProjectSchema.parse(req.body);

  // Check project exists and belongs to user
  const [existingProject] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

  if (!existingProject) {
    throw AppError.createNotFoundError("Project not found", "NOT_FOUND_PROJECT");
  }

  // Update project
  const [updatedProject] = await db
    .update(projects)
    .set({
      ...validatedData,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(projects.id, projectId))
    .returning();

  sendSuccess(res, updatedProject);
}));

// DELETE /api/projects/:id - Delete project
router.delete("/:id", jwtAuth, asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const userId = req.user!.id;

  if (isNaN(projectId)) {
    throw AppError.createValidationError("Invalid project ID", "VAL_INVALID_ID");
  }

  // Check project exists and belongs to user
  const [existingProject] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

  if (!existingProject) {
    throw AppError.createNotFoundError("Project not found", "NOT_FOUND_PROJECT");
  }

  // Delete project (cascade will handle project_analyses)
  await db.delete(projects).where(eq(projects.id, projectId));

  sendSuccess(res, { message: "Project deleted successfully" });
}));

// POST /api/projects/:id/analyses/:analysisId - Add analysis to project
router.post("/:id/analyses/:analysisId", jwtAuth, asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const analysisId = parseInt(req.params.analysisId);
  const userId = req.user!.id;

  if (isNaN(projectId) || isNaN(analysisId)) {
    throw AppError.createValidationError("Invalid project or analysis ID", "VAL_INVALID_ID");
  }

  // Check project exists and belongs to user
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

  if (!project) {
    throw AppError.createNotFoundError("Project not found", "NOT_FOUND_PROJECT");
  }

  // Check analysis exists and belongs to user
  const [analysis] = await db
    .select()
    .from(searches)
    .where(and(eq(searches.id, analysisId), eq(searches.userId, userId)));

  if (!analysis) {
    throw AppError.createNotFoundError("Analysis not found", "NOT_FOUND_ANALYSIS");
  }

  // Check if association already exists
  const [existing] = await db
    .select()
    .from(projectAnalyses)
    .where(
      and(
        eq(projectAnalyses.projectId, projectId),
        eq(projectAnalyses.searchId, analysisId)
      )
    );

  if (existing) {
    throw AppError.createValidationError(
      "Analysis is already in this project",
      "VAL_DUPLICATE_ASSOCIATION"
    );
  }

  // Create association
  const [association] = await db
    .insert(projectAnalyses)
    .values({
      projectId,
      searchId: analysisId,
    })
    .returning();

  // Update project's updatedAt timestamp
  await db
    .update(projects)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(projects.id, projectId));

  sendSuccess(res, association, "Analysis added to project successfully", 201);
}));

// DELETE /api/projects/:id/analyses/:analysisId - Remove analysis from project
router.delete("/:id/analyses/:analysisId", jwtAuth, asyncHandler(async (req, res) => {
  const projectId = parseInt(req.params.id);
  const analysisId = parseInt(req.params.analysisId);
  const userId = req.user!.id;

  if (isNaN(projectId) || isNaN(analysisId)) {
    throw AppError.createValidationError("Invalid project or analysis ID", "VAL_INVALID_ID");
  }

  // Check project exists and belongs to user
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

  if (!project) {
    throw AppError.createNotFoundError("Project not found", "NOT_FOUND_PROJECT");
  }

  // Check if association exists
  const [existing] = await db
    .select()
    .from(projectAnalyses)
    .where(
      and(
        eq(projectAnalyses.projectId, projectId),
        eq(projectAnalyses.searchId, analysisId)
      )
    );

  if (!existing) {
    throw AppError.createNotFoundError(
      "Analysis not found in this project",
      "NOT_FOUND_ASSOCIATION"
    );
  }

  // Delete association
  await db
    .delete(projectAnalyses)
    .where(
      and(
        eq(projectAnalyses.projectId, projectId),
        eq(projectAnalyses.searchId, analysisId)
      )
    );

  // Update project's updatedAt timestamp
  await db
    .update(projects)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(projects.id, projectId));

  sendSuccess(res, { message: "Analysis removed from project successfully" });
}));

export default router;
