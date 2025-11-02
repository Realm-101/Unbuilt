/**
 * Test Database Helper
 * 
 * Provides utilities for working with the test database in tests.
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../../../shared/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

// Re-export setup and cleanup functions
export { setupTestDatabase, cleanupTestDatabase } from '../setup-test-db.js';

// Use DATABASE_URL from env, or fallback to test database
const TEST_DATABASE_URL = 
  process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_oLQaeU8v4bNM@ep-little-tree-agutidhi-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

let dbInstance: ReturnType<typeof drizzle> | null = null;

/**
 * Get or create database connection
 */
export function getTestDb() {
  if (!TEST_DATABASE_URL) {
    throw new Error('DATABASE_URL not configured in .env.test');
  }

  if (!dbInstance) {
    const sql = neon(TEST_DATABASE_URL);
    dbInstance = drizzle(sql, { schema });
  }

  return dbInstance;
}

/**
 * Check if database is available
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    const db = getTestDb();
    await db.select().from(schema.users).limit(1);
    return true;
  } catch (error) {
    console.warn('Database not available:', error);
    return false;
  }
}

/**
 * Create a test user
 */
export async function createTestUser(overrides: Partial<typeof schema.users.$inferInsert> = {}) {
  const db = getTestDb();
  
  const defaultUser = {
    email: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
    password: await bcrypt.hash('TestPassword123!', 4),
    name: 'Test User',
    plan: 'free' as const,
    searchCount: 0,
    isActive: true,
    ...overrides,
  };

  const [user] = await db.insert(schema.users).values(defaultUser).returning();
  
  // Generate JWT token for the user
  const { jwtService } = await import('../../jwt.js');
  const tokenPair = await jwtService.generateTokens({ id: user.id, email: user.email, plan: user.plan });
  
  return { user, token: tokenPair.accessToken };
}

/**
 * Create a test search
 */
export async function createTestSearch(
  userId: number,
  overrides: Partial<typeof schema.searches.$inferInsert> = {}
) {
  const db = getTestDb();
  
  const defaultSearch = {
    userId,
    query: `Test search ${Date.now()}`,
    resultsCount: 5,
    isFavorite: false,
    ...overrides,
  };

  const [search] = await db.insert(schema.searches).values(defaultSearch).returning();
  return search;
}

/**
 * Create a test project
 */
export async function createTestProject(
  userId: number,
  overrides: Partial<typeof schema.projects.$inferInsert> = {}
) {
  const db = getTestDb();
  
  const defaultProject = {
    userId,
    name: `Test Project ${Date.now()}`,
    description: 'Test project description',
    tags: ['test'],
    archived: false,
    ...overrides,
  };

  const [project] = await db.insert(schema.projects).values(defaultProject).returning();
  return project;
}

/**
 * Clean up test user and all related data
 */
export async function cleanupTestUser(userId: number) {
  const db = getTestDb();
  
  try {
    // Delete in order of dependencies
    await db.delete(schema.shareLinks).where(eq(schema.shareLinks.userId, userId));
    await db.delete(schema.actionPlanProgress).where(eq(schema.actionPlanProgress.userId, userId));
    await db.delete(schema.projectAnalyses).where(
      eq(schema.projectAnalyses.projectId, 
        db.select({ id: schema.projects.id }).from(schema.projects).where(eq(schema.projects.userId, userId)) as any
      )
    );
    await db.delete(schema.projects).where(eq(schema.projects.userId, userId));
    await db.delete(schema.searchResults).where(
      eq(schema.searchResults.searchId,
        db.select({ id: schema.searches.id }).from(schema.searches).where(eq(schema.searches.userId, userId)) as any
      )
    );
    await db.delete(schema.searches).where(eq(schema.searches.userId, userId));
    await db.delete(schema.userPreferences).where(eq(schema.userPreferences.userId, userId));
    await db.delete(schema.jwtTokens).where(eq(schema.jwtTokens.userId, userId));
    await db.delete(schema.analyticsEvents).where(eq(schema.analyticsEvents.userId, userId));
    await db.delete(schema.passwordHistory).where(eq(schema.passwordHistory.userId, userId));
    await db.delete(schema.securityAuditLogs).where(eq(schema.securityAuditLogs.userId, userId));
    await db.delete(schema.users).where(eq(schema.users.id, userId));
  } catch (error) {
    console.warn(`Failed to cleanup user ${userId}:`, error);
  }
}

/**
 * Clean up test search and related data
 */
export async function cleanupTestSearch(searchId: number) {
  const db = getTestDb();
  
  try {
    await db.delete(schema.searchResults).where(eq(schema.searchResults.searchId, searchId));
    await db.delete(schema.actionPlanProgress).where(eq(schema.actionPlanProgress.searchId, searchId));
    await db.delete(schema.shareLinks).where(eq(schema.shareLinks.searchId, searchId));
    await db.delete(schema.searches).where(eq(schema.searches.id, searchId));
  } catch (error) {
    console.warn(`Failed to cleanup search ${searchId}:`, error);
  }
}

/**
 * Clean up test project
 */
export async function cleanupTestProject(projectId: number) {
  const db = getTestDb();
  
  try {
    await db.delete(schema.projectAnalyses).where(eq(schema.projectAnalyses.projectId, projectId));
    await db.delete(schema.projects).where(eq(schema.projects.id, projectId));
  } catch (error) {
    console.warn(`Failed to cleanup project ${projectId}:`, error);
  }
}

/**
 * Create a test action plan
 */
export async function createTestPlan(
  userId: number,
  overrides: Partial<typeof schema.actionPlans.$inferInsert> = {}
) {
  const db = getTestDb();
  
  const defaultPlan = {
    userId,
    title: `Test Plan ${Date.now()}`,
    description: 'Test plan description',
    status: 'active' as const,
    originalPlan: {},
    customizations: {},
    ...overrides,
  };

  const [plan] = await db.insert(schema.actionPlans).values(defaultPlan).returning();
  return plan;
}

/**
 * Create a test plan phase
 */
export async function createTestPhase(
  planId: number,
  overrides: Partial<typeof schema.planPhases.$inferInsert> = {}
) {
  const db = getTestDb();
  
  const defaultPhase = {
    planId,
    name: `Test Phase ${Date.now()}`,
    description: 'Test phase description',
    order: 1,
    estimatedDuration: '2 weeks',
    isCustom: false,
    ...overrides,
  };

  const [phase] = await db.insert(schema.planPhases).values(defaultPhase).returning();
  return phase;
}

/**
 * Create a test plan task
 */
export async function createTestTask(
  planId: number,
  phaseId: number,
  overrides: Partial<typeof schema.planTasks.$inferInsert> = {}
) {
  const db = getTestDb();
  
  const defaultTask = {
    planId,
    phaseId,
    title: `Test Task ${Date.now()}`,
    description: 'Test task description',
    estimatedTime: '2 hours',
    resources: [],
    order: 1,
    status: 'not_started' as const,
    isCustom: false,
    ...overrides,
  };

  const [task] = await db.insert(schema.planTasks).values(defaultTask).returning();
  return task;
}

/**
 * Clean up test plan and related data
 */
export async function cleanupTestPlan(planId: number) {
  const db = getTestDb();
  
  try {
    await db.delete(schema.taskDependencies).where(
      eq(schema.taskDependencies.taskId,
        db.select({ id: schema.planTasks.id }).from(schema.planTasks).where(eq(schema.planTasks.planId, planId)) as any
      )
    );
    await db.delete(schema.taskHistory).where(
      eq(schema.taskHistory.taskId,
        db.select({ id: schema.planTasks.id }).from(schema.planTasks).where(eq(schema.planTasks.planId, planId)) as any
      )
    );
    await db.delete(schema.planTasks).where(eq(schema.planTasks.planId, planId));
    await db.delete(schema.planPhases).where(eq(schema.planPhases.planId, planId));
    await db.delete(schema.progressSnapshots).where(eq(schema.progressSnapshots.planId, planId));
    await db.delete(schema.actionPlans).where(eq(schema.actionPlans.id, planId));
  } catch (error) {
    console.warn(`Failed to cleanup plan ${planId}:`, error);
  }
}

/**
 * Truncate all tables (use with caution!)
 */
export async function truncateAllTables() {
  const db = getTestDb();
  const sql = neon(TEST_DATABASE_URL!);
  
  const tables = [
    'conversation_analytics',
    'suggested_questions',
    'conversation_messages',
    'conversations',
    'help_articles',
    'share_links',
    'action_plan_progress',
    'project_analyses',
    'projects',
    'user_preferences',
    'analytics_events',
    'password_history',
    'security_alerts',
    'security_audit_logs',
    'activity_feed',
    'comments',
    'idea_shares',
    'team_members',
    'teams',
    'ideas',
    'jwt_tokens',
    'search_results',
    'searches',
    'session',
    'users',
    'task_dependencies',
    'task_history',
    'plan_tasks',
    'plan_phases',
    'progress_snapshots',
    'action_plans',
  ];

  for (const table of tables) {
    try {
      await sql(`TRUNCATE TABLE "${table}" CASCADE`);
    } catch (error) {
      console.warn(`Could not truncate ${table}:`, error);
    }
  }
}
