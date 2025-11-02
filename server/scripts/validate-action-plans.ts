import { db, pool } from '../db.js';
import { 
  searches,
  actionPlans, 
  planPhases, 
  planTasks,
  taskDependencies,
  progressSnapshots
} from '@shared/schema';
import { eq, sql, and, isNull } from 'drizzle-orm';

/**
 * Validation script for Action Plan migration
 * 
 * This script performs comprehensive validation checks to ensure
 * the migration completed successfully and data integrity is maintained.
 * 
 * Validation checks:
 * 1. All searches with action plans have corresponding plan records
 * 2. Phase counts are correct (typically 4 per plan)
 * 3. Task ordering is sequential within phases
 * 4. Progress data is consistent
 * 5. No orphaned records
 * 6. Foreign key integrity
 * 7. Data completeness
 */

interface ValidationResult {
  check: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: ValidationResult[] = [];

/**
 * Add validation result
 */
function addResult(check: string, passed: boolean, message: string, details?: any) {
  results.push({ check, passed, message, details });
  
  const icon = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';
  
  console.log(`${color}${icon}${reset} ${check}: ${message}`);
  
  if (details && !passed) {
    console.log(`  Details:`, details);
  }
}

/**
 * Check 1: All searches have corresponding plans
 */
async function checkSearchPlanMapping(): Promise<void> {
  console.log('\n📋 Checking search-plan mapping...');
  
  try {
    // Find searches that should have plans but don't
    const searchesWithoutPlans = await db
      .select({
        searchId: searches.id,
        query: searches.query,
        userId: searches.userId,
      })
      .from(searches)
      .leftJoin(actionPlans, eq(searches.id, actionPlans.searchId))
      .where(
        and(
          isNull(actionPlans.id),
          // Add condition to check if search should have a plan
          // This depends on your data structure
        )
      )
      .limit(10);
    
    if (searchesWithoutPlans.length === 0) {
      addResult(
        'Search-Plan Mapping',
        true,
        'All searches have corresponding plans'
      );
    } else {
      addResult(
        'Search-Plan Mapping',
        false,
        `Found ${searchesWithoutPlans.length} searches without plans`,
        searchesWithoutPlans
      );
    }
  } catch (error) {
    addResult(
      'Search-Plan Mapping',
      false,
      'Error checking search-plan mapping',
      error
    );
  }
}

/**
 * Check 2: Phase counts are correct
 */
async function checkPhaseCounts(): Promise<void> {
  console.log('\n📊 Checking phase counts...');
  
  try {
    const planPhaseCounts = await db
      .select({
        planId: actionPlans.id,
        planTitle: actionPlans.title,
        phaseCount: sql<number>`count(${planPhases.id})`,
      })
      .from(actionPlans)
      .leftJoin(planPhases, eq(actionPlans.id, planPhases.planId))
      .groupBy(actionPlans.id, actionPlans.title)
      .having(sql`count(${planPhases.id}) = 0 OR count(${planPhases.id}) > 6`);
    
    if (planPhaseCounts.length === 0) {
      addResult(
        'Phase Counts',
        true,
        'All plans have reasonable phase counts (1-6)'
      );
    } else {
      addResult(
        'Phase Counts',
        false,
        `Found ${planPhaseCounts.length} plans with unusual phase counts`,
        planPhaseCounts.slice(0, 5)
      );
    }
  } catch (error) {
    addResult(
      'Phase Counts',
      false,
      'Error checking phase counts',
      error
    );
  }
}

/**
 * Check 3: Task ordering is sequential
 */
async function checkTaskOrdering(): Promise<void> {
  console.log('\n🔢 Checking task ordering...');
  
  try {
    // Find phases with non-sequential task ordering
    const badOrdering = await pool.query(`
      WITH task_orders AS (
        SELECT 
          phase_id,
          "order",
          ROW_NUMBER() OVER (PARTITION BY phase_id ORDER BY "order") as expected_order
        FROM plan_tasks
      )
      SELECT 
        phase_id,
        COUNT(*) as issues
      FROM task_orders
      WHERE "order" != expected_order
      GROUP BY phase_id
      LIMIT 10;
    `);
    
    if (badOrdering.rows.length === 0) {
      addResult(
        'Task Ordering',
        true,
        'All tasks have sequential ordering within phases'
      );
    } else {
      addResult(
        'Task Ordering',
        false,
        `Found ${badOrdering.rows.length} phases with ordering issues`,
        badOrdering.rows
      );
    }
  } catch (error) {
    addResult(
      'Task Ordering',
      false,
      'Error checking task ordering',
      error
    );
  }
}

/**
 * Check 4: No duplicate task orders within phases
 */
async function checkDuplicateOrders(): Promise<void> {
  console.log('\n🔍 Checking for duplicate task orders...');
  
  try {
    const duplicates = await pool.query(`
      SELECT 
        phase_id,
        "order",
        COUNT(*) as count
      FROM plan_tasks
      GROUP BY phase_id, "order"
      HAVING COUNT(*) > 1
      LIMIT 10;
    `);
    
    if (duplicates.rows.length === 0) {
      addResult(
        'Duplicate Orders',
        true,
        'No duplicate task orders found'
      );
    } else {
      addResult(
        'Duplicate Orders',
        false,
        `Found ${duplicates.rows.length} duplicate order values`,
        duplicates.rows
      );
    }
  } catch (error) {
    addResult(
      'Duplicate Orders',
      false,
      'Error checking duplicate orders',
      error
    );
  }
}

/**
 * Check 5: No orphaned phases
 */
async function checkOrphanedPhases(): Promise<void> {
  console.log('\n🔗 Checking for orphaned phases...');
  
  try {
    const orphanedPhases = await db
      .select({
        phaseId: planPhases.id,
        phaseName: planPhases.name,
        planId: planPhases.planId,
      })
      .from(planPhases)
      .leftJoin(actionPlans, eq(planPhases.planId, actionPlans.id))
      .where(isNull(actionPlans.id))
      .limit(10);
    
    if (orphanedPhases.length === 0) {
      addResult(
        'Orphaned Phases',
        true,
        'No orphaned phases found'
      );
    } else {
      addResult(
        'Orphaned Phases',
        false,
        `Found ${orphanedPhases.length} orphaned phases`,
        orphanedPhases
      );
    }
  } catch (error) {
    addResult(
      'Orphaned Phases',
      false,
      'Error checking orphaned phases',
      error
    );
  }
}

/**
 * Check 6: No orphaned tasks
 */
async function checkOrphanedTasks(): Promise<void> {
  console.log('\n🔗 Checking for orphaned tasks...');
  
  try {
    const orphanedTasks = await db
      .select({
        taskId: planTasks.id,
        taskTitle: planTasks.title,
        phaseId: planTasks.phaseId,
      })
      .from(planTasks)
      .leftJoin(planPhases, eq(planTasks.phaseId, planPhases.id))
      .where(isNull(planPhases.id))
      .limit(10);
    
    if (orphanedTasks.length === 0) {
      addResult(
        'Orphaned Tasks',
        true,
        'No orphaned tasks found'
      );
    } else {
      addResult(
        'Orphaned Tasks',
        false,
        `Found ${orphanedTasks.length} orphaned tasks`,
        orphanedTasks
      );
    }
  } catch (error) {
    addResult(
      'Orphaned Tasks',
      false,
      'Error checking orphaned tasks',
      error
    );
  }
}

/**
 * Check 7: Progress data consistency
 */
async function checkProgressConsistency(): Promise<void> {
  console.log('\n📈 Checking progress data consistency...');
  
  try {
    const inconsistentProgress = await pool.query(`
      SELECT 
        ps.plan_id,
        ps.total_tasks,
        ps.completed_tasks,
        ps.completion_percentage,
        COUNT(pt.id) as actual_total,
        COUNT(pt.id) FILTER (WHERE pt.status = 'completed') as actual_completed,
        ROUND(
          COUNT(pt.id) FILTER (WHERE pt.status = 'completed')::numeric / 
          NULLIF(COUNT(pt.id), 0) * 100
        ) as actual_percentage
      FROM progress_snapshots ps
      JOIN plan_tasks pt ON pt.plan_id = ps.plan_id
      WHERE ps.id IN (
        SELECT MAX(id) FROM progress_snapshots GROUP BY plan_id
      )
      GROUP BY ps.plan_id, ps.total_tasks, ps.completed_tasks, ps.completion_percentage
      HAVING 
        ps.total_tasks != COUNT(pt.id) OR
        ps.completed_tasks != COUNT(pt.id) FILTER (WHERE pt.status = 'completed')
      LIMIT 10;
    `);
    
    if (inconsistentProgress.rows.length === 0) {
      addResult(
        'Progress Consistency',
        true,
        'Progress data is consistent with task data'
      );
    } else {
      addResult(
        'Progress Consistency',
        false,
        `Found ${inconsistentProgress.rows.length} plans with inconsistent progress`,
        inconsistentProgress.rows
      );
    }
  } catch (error) {
    addResult(
      'Progress Consistency',
      false,
      'Error checking progress consistency',
      error
    );
  }
}

/**
 * Check 8: Task dependencies are valid
 */
async function checkTaskDependencies(): Promise<void> {
  console.log('\n🔗 Checking task dependencies...');
  
  try {
    // Check for self-referencing dependencies
    const selfReferences = await db
      .select({
        id: taskDependencies.id,
        taskId: taskDependencies.taskId,
      })
      .from(taskDependencies)
      .where(sql`${taskDependencies.taskId} = ${taskDependencies.prerequisiteTaskId}`)
      .limit(10);
    
    if (selfReferences.length === 0) {
      addResult(
        'Task Dependencies',
        true,
        'No self-referencing dependencies found'
      );
    } else {
      addResult(
        'Task Dependencies',
        false,
        `Found ${selfReferences.length} self-referencing dependencies`,
        selfReferences
      );
    }
    
    // Check for dependencies pointing to non-existent tasks
    const invalidDependencies = await db
      .select({
        id: taskDependencies.id,
        taskId: taskDependencies.taskId,
        prerequisiteTaskId: taskDependencies.prerequisiteTaskId,
      })
      .from(taskDependencies)
      .leftJoin(planTasks, eq(taskDependencies.prerequisiteTaskId, planTasks.id))
      .where(isNull(planTasks.id))
      .limit(10);
    
    if (invalidDependencies.length === 0) {
      addResult(
        'Invalid Dependencies',
        true,
        'All dependencies point to valid tasks'
      );
    } else {
      addResult(
        'Invalid Dependencies',
        false,
        `Found ${invalidDependencies.length} dependencies pointing to non-existent tasks`,
        invalidDependencies
      );
    }
  } catch (error) {
    addResult(
      'Task Dependencies',
      false,
      'Error checking task dependencies',
      error
    );
  }
}

/**
 * Check 9: Data completeness
 */
async function checkDataCompleteness(): Promise<void> {
  console.log('\n📊 Checking data completeness...');
  
  try {
    const counts = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(actionPlans),
      db.select({ count: sql<number>`count(*)` }).from(planPhases),
      db.select({ count: sql<number>`count(*)` }).from(planTasks),
      db.select({ count: sql<number>`count(*)` }).from(progressSnapshots),
    ]);
    
    const planCount = Number(counts[0][0].count);
    const phaseCount = Number(counts[1][0].count);
    const taskCount = Number(counts[2][0].count);
    const snapshotCount = Number(counts[3][0].count);
    
    console.log(`\n  Plans: ${planCount}`);
    console.log(`  Phases: ${phaseCount}`);
    console.log(`  Tasks: ${taskCount}`);
    console.log(`  Snapshots: ${snapshotCount}`);
    
    const avgPhasesPerPlan = planCount > 0 ? (phaseCount / planCount).toFixed(2) : 0;
    const avgTasksPerPlan = planCount > 0 ? (taskCount / planCount).toFixed(2) : 0;
    
    console.log(`\n  Avg phases per plan: ${avgPhasesPerPlan}`);
    console.log(`  Avg tasks per plan: ${avgTasksPerPlan}`);
    
    const hasData = planCount > 0 && phaseCount > 0 && taskCount > 0;
    
    addResult(
      'Data Completeness',
      hasData,
      hasData ? 'Migration data is present' : 'No migration data found'
    );
  } catch (error) {
    addResult(
      'Data Completeness',
      false,
      'Error checking data completeness',
      error
    );
  }
}

/**
 * Generate validation report
 */
function generateReport(): void {
  console.log('\n' + '='.repeat(60));
  console.log('📋 VALIDATION REPORT');
  console.log('='.repeat(60) + '\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`Total checks: ${total}`);
  console.log(`Passed: ${passed} ✓`);
  console.log(`Failed: ${failed} ✗`);
  console.log(`Success rate: ${((passed / total) * 100).toFixed(1)}%\n`);
  
  if (failed > 0) {
    console.log('❌ VALIDATION FAILED\n');
    console.log('Failed checks:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.check}: ${r.message}`);
    });
    console.log('\nReview the details above and consider running rollback if issues are severe.\n');
  } else {
    console.log('✅ ALL VALIDATION CHECKS PASSED\n');
    console.log('Migration appears to be successful!\n');
  }
  
  console.log('='.repeat(60) + '\n');
}

/**
 * Main validation function
 */
async function validateActionPlans(): Promise<void> {
  console.log('🔍 Action Plan Migration Validation\n');
  console.log('Running comprehensive validation checks...\n');
  
  try {
    await checkSearchPlanMapping();
    await checkPhaseCounts();
    await checkTaskOrdering();
    await checkDuplicateOrders();
    await checkOrphanedPhases();
    await checkOrphanedTasks();
    await checkProgressConsistency();
    await checkTaskDependencies();
    await checkDataCompleteness();
    
    generateReport();
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateActionPlans()
    .then(() => {
      const failed = results.filter(r => !r.passed).length;
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

export { validateActionPlans };
