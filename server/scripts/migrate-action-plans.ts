import { db, pool } from '../db.js';
import { 
  searches, 
  searchResults, 
  actionPlans, 
  planPhases, 
  planTasks,
  planTemplates,
  progressSnapshots,
  actionPlanProgress,
  type InsertActionPlan,
  type InsertPlanPhase,
  type InsertPlanTask,
  type InsertProgressSnapshot
} from '@shared/schema';
import { eq, and, isNotNull, sql } from 'drizzle-orm';

/**
 * Migration script to convert existing search action plans to the new
 * interactive action plan system.
 * 
 * This script:
 * 1. Finds all searches with action plan data
 * 2. Creates action plan records
 * 3. Extracts and creates phases
 * 4. Extracts and creates tasks
 * 5. Migrates existing progress data
 * 6. Creates initial progress snapshots
 * 
 * The migration is idempotent - it can be run multiple times safely.
 * Already migrated searches will be skipped.
 */

interface MigrationStats {
  searchesProcessed: number;
  plansCreated: number;
  phasesCreated: number;
  tasksCreated: number;
  progressMigrated: number;
  snapshotsCreated: number;
  errors: number;
  skipped: number;
}

interface ActionPlanData {
  phases: Array<{
    name: string;
    description?: string;
    tasks: Array<{
      title: string;
      description?: string;
      estimatedTime?: string;
      resources?: string[];
    }>;
  }>;
}

const stats: MigrationStats = {
  searchesProcessed: 0,
  plansCreated: 0,
  phasesCreated: 0,
  tasksCreated: 0,
  progressMigrated: 0,
  snapshotsCreated: 0,
  errors: 0,
  skipped: 0,
};

/**
 * Get default template (Software Startup)
 */
async function getDefaultTemplate() {
  const templates = await db
    .select()
    .from(planTemplates)
    .where(eq(planTemplates.isDefault, true))
    .limit(1);
  
  return templates[0] || null;
}

/**
 * Extract action plan data from search results
 */
async function getActionPlanData(searchId: number): Promise<ActionPlanData | null> {
  const results = await db
    .select()
    .from(searchResults)
    .where(eq(searchResults.searchId, searchId))
    .limit(1);
  
  if (results.length === 0) {
    return null;
  }
  
  // Action plan data might be stored in different formats
  // Check for actionPlan field or extract from other fields
  const result = results[0];
  
  // Try to find action plan data in the result
  // This is a placeholder - adjust based on actual data structure
  const actionPlanData = (result as any).actionPlan || (result as any).action_plan;
  
  if (!actionPlanData) {
    return null;
  }
  
  // Ensure data has the expected structure
  if (typeof actionPlanData === 'string') {
    try {
      return JSON.parse(actionPlanData);
    } catch (e) {
      console.error(`Failed to parse action plan JSON for search ${searchId}:`, e);
      return null;
    }
  }
  
  return actionPlanData as ActionPlanData;
}

/**
 * Check if search has already been migrated
 */
async function isAlreadyMigrated(searchId: number): Promise<boolean> {
  const existing = await db
    .select()
    .from(actionPlans)
    .where(eq(actionPlans.searchId, searchId))
    .limit(1);
  
  return existing.length > 0;
}

/**
 * Migrate a single search to action plan
 */
async function migrateSearch(search: any, defaultTemplate: any): Promise<boolean> {
  try {
    // Check if already migrated
    if (await isAlreadyMigrated(search.id)) {
      console.log(`  ⏭️  Search ${search.id} already migrated, skipping...`);
      stats.skipped++;
      return true;
    }
    
    // Get action plan data
    const actionPlanData = await getActionPlanData(search.id);
    
    if (!actionPlanData || !actionPlanData.phases || actionPlanData.phases.length === 0) {
      console.log(`  ⚠️  No action plan data found for search ${search.id}, skipping...`);
      stats.skipped++;
      return true;
    }
    
    // Create action plan record
    const planData: InsertActionPlan = {
      searchId: search.id,
      userId: search.userId,
      templateId: defaultTemplate?.id || null,
      title: search.query || 'Action Plan',
      description: `Action plan for: ${search.query}`,
      status: 'active',
      originalPlan: actionPlanData,
      customizations: {},
      createdAt: search.timestamp || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const [plan] = await db.insert(actionPlans).values(planData).returning();
    stats.plansCreated++;
    
    // Create phases and tasks
    for (let phaseIndex = 0; phaseIndex < actionPlanData.phases.length; phaseIndex++) {
      const phaseData = actionPlanData.phases[phaseIndex];
      
      const phaseRecord: InsertPlanPhase = {
        planId: plan.id,
        name: phaseData.name || `Phase ${phaseIndex + 1}`,
        description: phaseData.description || null,
        order: phaseIndex + 1,
        estimatedDuration: null, // Can be extracted if available
        isCustom: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const [phase] = await db.insert(planPhases).values(phaseRecord).returning();
      stats.phasesCreated++;
      
      // Create tasks for this phase
      if (phaseData.tasks && Array.isArray(phaseData.tasks)) {
        for (let taskIndex = 0; taskIndex < phaseData.tasks.length; taskIndex++) {
          const taskData = phaseData.tasks[taskIndex];
          
          const taskRecord: InsertPlanTask = {
            phaseId: phase.id,
            planId: plan.id,
            title: taskData.title || `Task ${taskIndex + 1}`,
            description: taskData.description || null,
            estimatedTime: taskData.estimatedTime || null,
            resources: taskData.resources || [],
            order: taskIndex + 1,
            status: 'not_started',
            isCustom: false,
            assigneeId: null,
            completedAt: null,
            completedBy: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          await db.insert(planTasks).values(taskRecord);
          stats.tasksCreated++;
        }
      }
    }
    
    // Migrate existing progress data if available
    await migrateProgressData(search.id, plan.id, search.userId);
    
    // Create initial progress snapshot
    await createProgressSnapshot(plan.id);
    
    return true;
  } catch (error) {
    console.error(`  ❌ Error migrating search ${search.id}:`, error);
    stats.errors++;
    return false;
  }
}

/**
 * Migrate existing progress data from action_plan_progress table
 */
async function migrateProgressData(searchId: number, planId: number, userId: number): Promise<void> {
  try {
    // Check if old progress data exists
    const oldProgress = await db
      .select()
      .from(actionPlanProgress)
      .where(
        and(
          eq(actionPlanProgress.searchId, searchId),
          eq(actionPlanProgress.userId, userId)
        )
      )
      .limit(1);
    
    if (oldProgress.length === 0) {
      return;
    }
    
    const progress = oldProgress[0];
    const completedSteps = (progress.completedSteps as string[]) || [];
    
    // Update task statuses based on completed steps
    if (completedSteps.length > 0) {
      // Get all tasks for this plan
      const tasks = await db
        .select()
        .from(planTasks)
        .where(eq(planTasks.planId, planId));
      
      // Mark tasks as completed based on title matching
      // This is a best-effort approach
      for (const task of tasks) {
        const isCompleted = completedSteps.some(step => 
          step.toLowerCase().includes(task.title.toLowerCase()) ||
          task.title.toLowerCase().includes(step.toLowerCase())
        );
        
        if (isCompleted) {
          await db
            .update(planTasks)
            .set({
              status: 'completed',
              completedAt: progress.lastUpdated,
              completedBy: userId,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(planTasks.id, task.id));
        }
      }
      
      stats.progressMigrated++;
    }
  } catch (error) {
    console.error(`  ⚠️  Error migrating progress for search ${searchId}:`, error);
    // Don't fail the entire migration for progress errors
  }
}

/**
 * Create initial progress snapshot for a plan
 */
async function createProgressSnapshot(planId: number): Promise<void> {
  try {
    // Calculate progress metrics
    const tasks = await db
      .select()
      .from(planTasks)
      .where(eq(planTasks.planId, planId));
    
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const skippedTasks = tasks.filter(t => t.status === 'skipped').length;
    const completionPercentage = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100) 
      : 0;
    
    // Calculate average task time (in hours)
    const completedTasksWithTime = tasks.filter(
      t => t.status === 'completed' && t.completedAt && t.createdAt
    );
    
    let averageTaskTime = null;
    if (completedTasksWithTime.length > 0) {
      const totalTime = completedTasksWithTime.reduce((sum, task) => {
        const created = new Date(task.createdAt).getTime();
        const completed = new Date(task.completedAt!).getTime();
        return sum + (completed - created);
      }, 0);
      averageTaskTime = Math.round(totalTime / completedTasksWithTime.length / (1000 * 60 * 60));
    }
    
    const snapshotData: InsertProgressSnapshot = {
      planId,
      totalTasks,
      completedTasks,
      inProgressTasks,
      skippedTasks,
      completionPercentage,
      averageTaskTime,
      velocity: null, // Will be calculated over time
      timestamp: new Date().toISOString(),
    };
    
    await db.insert(progressSnapshots).values(snapshotData);
    stats.snapshotsCreated++;
  } catch (error) {
    console.error(`  ⚠️  Error creating progress snapshot for plan ${planId}:`, error);
    // Don't fail the entire migration for snapshot errors
  }
}

/**
 * Main migration function
 */
async function migrateActionPlans(): Promise<void> {
  console.log('🚀 Starting Action Plan migration...\n');
  
  try {
    // Get default template
    console.log('📋 Loading default template...');
    const defaultTemplate = await getDefaultTemplate();
    
    if (!defaultTemplate) {
      console.warn('⚠️  No default template found. Plans will be created without template reference.');
    } else {
      console.log(`✓ Using template: ${defaultTemplate.name}\n`);
    }
    
    // Find all searches with action plan data
    console.log('🔍 Finding searches with action plans...');
    
    // Get all searches that have associated search results
    // We'll check each one for action plan data
    const allSearches = await db
      .select()
      .from(searches)
      .where(isNotNull(searches.userId))
      .orderBy(searches.id);
    
    console.log(`📊 Found ${allSearches.length} total searches\n`);
    
    // Process searches in batches
    const batchSize = 100;
    let processedCount = 0;
    
    for (let i = 0; i < allSearches.length; i += batchSize) {
      const batch = allSearches.slice(i, i + batchSize);
      
      console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allSearches.length / batchSize)}...`);
      
      for (const search of batch) {
        processedCount++;
        
        if (processedCount % 10 === 0) {
          console.log(`  Progress: ${processedCount}/${allSearches.length} (${Math.round(processedCount / allSearches.length * 100)}%)`);
        }
        
        await migrateSearch(search, defaultTemplate);
        stats.searchesProcessed++;
      }
    }
    
    // Print final statistics
    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration completed successfully!\n');
    console.log('📈 Statistics:');
    console.log(`   - Searches processed: ${stats.searchesProcessed}`);
    console.log(`   - Plans created: ${stats.plansCreated}`);
    console.log(`   - Phases created: ${stats.phasesCreated}`);
    console.log(`   - Tasks created: ${stats.tasksCreated}`);
    console.log(`   - Progress records migrated: ${stats.progressMigrated}`);
    console.log(`   - Progress snapshots created: ${stats.snapshotsCreated}`);
    console.log(`   - Searches skipped: ${stats.skipped}`);
    console.log(`   - Errors: ${stats.errors}`);
    console.log('='.repeat(60) + '\n');
    
    if (stats.errors > 0) {
      console.warn('⚠️  Some searches failed to migrate. Check logs above for details.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateActionPlans()
    .then(() => {
      console.log('✨ Done!');
      process.exit(stats.errors > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

export { migrateActionPlans };
