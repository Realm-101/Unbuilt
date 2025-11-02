/**
 * Query Optimizer Service
 * 
 * Provides utilities for optimizing database queries, preventing N+1 queries,
 * and implementing efficient data loading patterns.
 */

import { db } from '../db';
import { eq, inArray, and, sql } from 'drizzle-orm';
import {
  actionPlans,
  planPhases,
  planTasks,
  taskDependencies,
  searches,
  searchResults,
  conversations,
  conversationMessages,
  resources,
  users,
} from '@shared/schema';
import { cacheService } from './cacheService';

/**
 * Load action plan with all related data in a single optimized query
 */
export async function loadPlanWithRelations(planId: number) {
  const cacheKey = cacheService.keys.planWithTasks(planId);
  
  return cacheService.getOrSet(
    cacheKey,
    async () => {
      // Load plan
      const plan = await db.query.actionPlans.findFirst({
        where: eq(actionPlans.id, planId),
      });

      if (!plan) {
        return null;
      }

      // Load phases with tasks in a single query
      const phases = await db.query.planPhases.findMany({
        where: eq(planPhases.planId, planId),
        orderBy: (phases, { asc }) => [asc(phases.order)],
        with: {
          tasks: {
            orderBy: (tasks, { asc }) => [asc(tasks.order)],
          },
        },
      });

      // Load all task IDs for dependency lookup
      const taskIds = phases.flatMap((phase) =>
        phase.tasks.map((task) => task.id)
      );

      // Load dependencies for all tasks in a single query
      const dependencies = taskIds.length > 0
        ? await db.query.taskDependencies.findMany({
            where: inArray(taskDependencies.taskId, taskIds),
          })
        : [];

      // Build dependency map
      const dependencyMap = new Map<number, number[]>();
      for (const dep of dependencies) {
        const existing = dependencyMap.get(dep.taskId) || [];
        existing.push(dep.prerequisiteTaskId);
        dependencyMap.set(dep.taskId, existing);
      }

      return {
        plan,
        phases: phases.map((phase) => ({
          ...phase,
          tasks: phase.tasks.map((task) => ({
            ...task,
            dependencies: dependencyMap.get(task.id) || [],
          })),
        })),
      };
    },
    { ttl: cacheService.ttl.default }
  );
}

/**
 * Load multiple plans with their phases (optimized batch loading)
 */
export async function loadPlansWithPhases(planIds: number[]) {
  if (planIds.length === 0) return [];

  // Load all plans
  const plans = await db.query.actionPlans.findMany({
    where: inArray(actionPlans.id, planIds),
  });

  // Load all phases for these plans in a single query
  const phases = await db.query.planPhases.findMany({
    where: inArray(planPhases.planId, planIds),
    orderBy: (phases, { asc }) => [asc(phases.order)],
  });

  // Group phases by plan ID
  const phasesByPlan = new Map<number, typeof phases>();
  for (const phase of phases) {
    const existing = phasesByPlan.get(phase.planId) || [];
    existing.push(phase);
    phasesByPlan.set(phase.planId, existing);
  }

  return plans.map((plan) => ({
    ...plan,
    phases: phasesByPlan.get(plan.id) || [],
  }));
}

/**
 * Load search with results (optimized)
 */
export async function loadSearchWithResults(searchId: number) {
  const cacheKey = cacheService.keys.searchResults(searchId);
  
  return cacheService.getOrSet(
    cacheKey,
    async () => {
      const search = await db.query.searches.findFirst({
        where: eq(searches.id, searchId),
        with: {
          results: {
            orderBy: (results, { desc }) => [desc(results.innovationScore)],
          },
        },
      });

      return search;
    },
    { ttl: cacheService.ttl.long }
  );
}

/**
 * Load conversation with messages (paginated and optimized)
 */
export async function loadConversationWithMessages(
  conversationId: number,
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 50, offset = 0 } = options;
  
  // Don't cache paginated results
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });

  if (!conversation) {
    return null;
  }

  const messages = await db.query.conversationMessages.findMany({
    where: eq(conversationMessages.conversationId, conversationId),
    orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    limit,
    offset,
  });

  return {
    ...conversation,
    messages,
  };
}

/**
 * Batch load users by IDs (prevents N+1 queries)
 */
export async function batchLoadUsers(userIds: number[]) {
  if (userIds.length === 0) return new Map<number, typeof users.$inferSelect>();

  const uniqueIds = [...new Set(userIds)];
  
  const userList = await db.query.users.findMany({
    where: inArray(users.id, uniqueIds),
  });

  const userMap = new Map<number, typeof users.$inferSelect>();
  for (const user of userList) {
    userMap.set(user.id, user);
  }

  return userMap;
}

/**
 * Batch load resources by IDs
 */
export async function batchLoadResources(resourceIds: number[]) {
  if (resourceIds.length === 0) return new Map<number, typeof resources.$inferSelect>();

  const uniqueIds = [...new Set(resourceIds)];
  
  const resourceList = await db.query.resources.findMany({
    where: inArray(resources.id, uniqueIds),
  });

  const resourceMap = new Map<number, typeof resources.$inferSelect>();
  for (const resource of resourceList) {
    resourceMap.set(resource.id, resource);
  }

  return resourceMap;
}

/**
 * Get task completion statistics for a plan (optimized single query)
 */
export async function getPlanTaskStats(planId: number) {
  const cacheKey = cacheService.keys.planProgress(planId);
  
  return cacheService.getOrSet(
    cacheKey,
    async () => {
      const result = await db
        .select({
          total: sql<number>`count(*)::int`,
          completed: sql<number>`count(*) filter (where status = 'completed')::int`,
          inProgress: sql<number>`count(*) filter (where status = 'in_progress')::int`,
          notStarted: sql<number>`count(*) filter (where status = 'not_started')::int`,
          skipped: sql<number>`count(*) filter (where status = 'skipped')::int`,
        })
        .from(planTasks)
        .where(eq(planTasks.planId, planId));

      return result[0] || {
        total: 0,
        completed: 0,
        inProgress: 0,
        notStarted: 0,
        skipped: 0,
      };
    },
    { ttl: cacheService.ttl.short }
  );
}

/**
 * Get user's active plans with task counts (optimized)
 */
export async function getUserActivePlansWithStats(userId: number) {
  const cacheKey = cacheService.keys.userPlans(userId, 'active');
  
  return cacheService.getOrSet(
    cacheKey,
    async () => {
      // Get active plans
      const plans = await db.query.actionPlans.findMany({
        where: and(
          eq(actionPlans.userId, userId),
          eq(actionPlans.status, 'active')
        ),
        orderBy: (plans, { desc }) => [desc(plans.updatedAt)],
      });

      if (plans.length === 0) {
        return [];
      }

      // Get task counts for all plans in a single query
      const planIds = plans.map((p) => p.id);
      const taskCounts = await db
        .select({
          planId: planTasks.planId,
          total: sql<number>`count(*)::int`,
          completed: sql<number>`count(*) filter (where status = 'completed')::int`,
        })
        .from(planTasks)
        .where(inArray(planTasks.planId, planIds))
        .groupBy(planTasks.planId);

      // Build count map
      const countMap = new Map<number, { total: number; completed: number }>();
      for (const count of taskCounts) {
        countMap.set(count.planId, {
          total: count.total,
          completed: count.completed,
        });
      }

      return plans.map((plan) => {
        const counts = countMap.get(plan.id) || { total: 0, completed: 0 };
        return {
          ...plan,
          taskStats: counts,
          completionPercentage:
            counts.total > 0
              ? Math.round((counts.completed / counts.total) * 100)
              : 0,
        };
      });
    },
    { ttl: cacheService.ttl.short }
  );
}

/**
 * Get resource with related data (optimized)
 */
export async function loadResourceWithRelations(resourceId: number) {
  const cacheKey = cacheService.keys.resource(resourceId);
  
  return cacheService.getOrSet(
    cacheKey,
    async () => {
      const resource = await db.query.resources.findFirst({
        where: eq(resources.id, resourceId),
        with: {
          category: true,
          tagMappings: {
            with: {
              tag: true,
            },
          },
        },
      });

      return resource;
    },
    { ttl: cacheService.ttl.long }
  );
}

/**
 * Prefetch related data for multiple entities
 */
export async function prefetchPlanData(planIds: number[]) {
  if (planIds.length === 0) return;

  // Prefetch plans
  const plans = await db.query.actionPlans.findMany({
    where: inArray(actionPlans.id, planIds),
  });

  // Prefetch phases
  await db.query.planPhases.findMany({
    where: inArray(planPhases.planId, planIds),
  });

  // Prefetch tasks
  await db.query.planTasks.findMany({
    where: inArray(planTasks.planId, planIds),
  });

  // Cache the results
  for (const plan of plans) {
    await cacheService.set(
      cacheService.keys.plan(plan.id),
      plan,
      { ttl: cacheService.ttl.default }
    );
  }
}

/**
 * Invalidate cache for plan and related entities
 */
export async function invalidatePlanCache(planId: number) {
  await cacheService.invalidateEntity('plan', planId);
  await cacheService.delete(cacheService.keys.planWithTasks(planId));
  await cacheService.delete(cacheService.keys.planProgress(planId));
}

/**
 * Invalidate cache for user's plans
 */
export async function invalidateUserPlansCache(userId: number) {
  await cacheService.deletePattern(`user:${userId}:plans*`);
  await cacheService.delete(cacheService.keys.userProgress(userId));
}

/**
 * Invalidate cache for search and results
 */
export async function invalidateSearchCache(searchId: number) {
  await cacheService.invalidateEntity('search', searchId);
  await cacheService.delete(cacheService.keys.searchResults(searchId));
}

/**
 * Warm up cache with frequently accessed data
 */
export async function warmUpCache() {
  console.log('🔥 Warming up cache...');

  try {
    // Load templates
    const templates = await db.query.planTemplates.findMany({
      where: eq(sql`is_active`, true),
    });
    await cacheService.set(
      cacheService.keys.templates(),
      templates,
      { ttl: cacheService.ttl.long }
    );

    console.log('✅ Cache warmed up successfully');
  } catch (error) {
    console.error('❌ Failed to warm up cache:', error);
  }
}

// Export all functions
export const queryOptimizer = {
  loadPlanWithRelations,
  loadPlansWithPhases,
  loadSearchWithResults,
  loadConversationWithMessages,
  batchLoadUsers,
  batchLoadResources,
  getPlanTaskStats,
  getUserActivePlansWithStats,
  loadResourceWithRelations,
  prefetchPlanData,
  invalidatePlanCache,
  invalidateUserPlansCache,
  invalidateSearchCache,
  warmUpCache,
};
