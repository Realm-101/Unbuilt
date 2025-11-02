import { db, pool } from '../db.js';
import { 
  actionPlans, 
  planPhases, 
  planTasks,
  taskDependencies,
  taskHistory,
  progressSnapshots
} from '@shared/schema';
import { sql } from 'drizzle-orm';

/**
 * Rollback script for Action Plan migration
 * 
 * This script safely removes all migrated action plan data while preserving
 * the original search data. It can be used to revert the migration if issues
 * are discovered.
 * 
 * WARNING: This will delete all action plan data including:
 * - Action plans
 * - Plan phases
 * - Plan tasks
 * - Task dependencies
 * - Task history
 * - Progress snapshots
 * 
 * Original search data and search results are NOT affected.
 */

interface RollbackStats {
  snapshotsDeleted: number;
  historyDeleted: number;
  dependenciesDeleted: number;
  tasksDeleted: number;
  phasesDeleted: number;
  plansDeleted: number;
  errors: number;
}

const stats: RollbackStats = {
  snapshotsDeleted: 0,
  historyDeleted: 0,
  dependenciesDeleted: 0,
  tasksDeleted: 0,
  phasesDeleted: 0,
  plansDeleted: 0,
  errors: 0,
};

/**
 * Confirm rollback with user
 */
async function confirmRollback(): Promise<boolean> {
  // In production, you might want to add an interactive prompt
  // For now, we'll check for an environment variable
  const confirmed = process.env.CONFIRM_ROLLBACK === 'yes';
  
  if (!confirmed) {
    console.log('\n⚠️  ROLLBACK NOT CONFIRMED');
    console.log('To proceed with rollback, set environment variable:');
    console.log('  CONFIRM_ROLLBACK=yes npm run rollback:action-plans\n');
    return false;
  }
  
  return true;
}

/**
 * Get counts before rollback
 */
async function getPreRollbackCounts() {
  const [
    snapshotCount,
    historyCount,
    dependencyCount,
    taskCount,
    phaseCount,
    planCount
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(progressSnapshots),
    db.select({ count: sql<number>`count(*)` }).from(taskHistory),
    db.select({ count: sql<number>`count(*)` }).from(taskDependencies),
    db.select({ count: sql<number>`count(*)` }).from(planTasks),
    db.select({ count: sql<number>`count(*)` }).from(planPhases),
    db.select({ count: sql<number>`count(*)` }).from(actionPlans),
  ]);
  
  return {
    snapshots: Number(snapshotCount[0].count),
    history: Number(historyCount[0].count),
    dependencies: Number(dependencyCount[0].count),
    tasks: Number(taskCount[0].count),
    phases: Number(phaseCount[0].count),
    plans: Number(planCount[0].count),
  };
}

/**
 * Delete all action plan data in correct order (respecting foreign keys)
 */
async function deleteActionPlanData(): Promise<void> {
  console.log('\n🗑️  Deleting action plan data...\n');
  
  try {
    // Delete in reverse order of dependencies
    
    // 1. Delete progress snapshots
    console.log('  Deleting progress snapshots...');
    const deletedSnapshots = await db.delete(progressSnapshots).returning();
    stats.snapshotsDeleted = deletedSnapshots.length;
    console.log(`  ✓ Deleted ${stats.snapshotsDeleted} progress snapshots`);
    
    // 2. Delete task history
    console.log('  Deleting task history...');
    const deletedHistory = await db.delete(taskHistory).returning();
    stats.historyDeleted = deletedHistory.length;
    console.log(`  ✓ Deleted ${stats.historyDeleted} history records`);
    
    // 3. Delete task dependencies
    console.log('  Deleting task dependencies...');
    const deletedDependencies = await db.delete(taskDependencies).returning();
    stats.dependenciesDeleted = deletedDependencies.length;
    console.log(`  ✓ Deleted ${stats.dependenciesDeleted} dependencies`);
    
    // 4. Delete plan tasks
    console.log('  Deleting plan tasks...');
    const deletedTasks = await db.delete(planTasks).returning();
    stats.tasksDeleted = deletedTasks.length;
    console.log(`  ✓ Deleted ${stats.tasksDeleted} tasks`);
    
    // 5. Delete plan phases
    console.log('  Deleting plan phases...');
    const deletedPhases = await db.delete(planPhases).returning();
    stats.phasesDeleted = deletedPhases.length;
    console.log(`  ✓ Deleted ${stats.phasesDeleted} phases`);
    
    // 6. Delete action plans
    console.log('  Deleting action plans...');
    const deletedPlans = await db.delete(actionPlans).returning();
    stats.plansDeleted = deletedPlans.length;
    console.log(`  ✓ Deleted ${stats.plansDeleted} plans`);
    
  } catch (error) {
    console.error('  ❌ Error during deletion:', error);
    stats.errors++;
    throw error;
  }
}

/**
 * Reset sequences to ensure clean state
 */
async function resetSequences(): Promise<void> {
  console.log('\n🔄 Resetting sequences...');
  
  try {
    await pool.query(`
      SELECT setval('action_plans_id_seq', 1, false);
      SELECT setval('plan_phases_id_seq', 1, false);
      SELECT setval('plan_tasks_id_seq', 1, false);
      SELECT setval('task_dependencies_id_seq', 1, false);
      SELECT setval('task_history_id_seq', 1, false);
      SELECT setval('progress_snapshots_id_seq', 1, false);
    `);
    console.log('  ✓ Sequences reset');
  } catch (error) {
    console.error('  ⚠️  Error resetting sequences:', error);
    // Non-fatal error
  }
}

/**
 * Verify rollback completed successfully
 */
async function verifyRollback(): Promise<boolean> {
  console.log('\n🔍 Verifying rollback...');
  
  try {
    const counts = await getPreRollbackCounts();
    
    const allZero = 
      counts.snapshots === 0 &&
      counts.history === 0 &&
      counts.dependencies === 0 &&
      counts.tasks === 0 &&
      counts.phases === 0 &&
      counts.plans === 0;
    
    if (allZero) {
      console.log('  ✓ All action plan data removed');
      return true;
    } else {
      console.error('  ❌ Some data remains:');
      if (counts.snapshots > 0) console.error(`     - ${counts.snapshots} snapshots`);
      if (counts.history > 0) console.error(`     - ${counts.history} history records`);
      if (counts.dependencies > 0) console.error(`     - ${counts.dependencies} dependencies`);
      if (counts.tasks > 0) console.error(`     - ${counts.tasks} tasks`);
      if (counts.phases > 0) console.error(`     - ${counts.phases} phases`);
      if (counts.plans > 0) console.error(`     - ${counts.plans} plans`);
      return false;
    }
  } catch (error) {
    console.error('  ❌ Error verifying rollback:', error);
    return false;
  }
}

/**
 * Main rollback function
 */
async function rollbackActionPlans(): Promise<void> {
  console.log('🔙 Action Plan Migration Rollback\n');
  console.log('⚠️  WARNING: This will delete all action plan data!');
  console.log('Original search data will be preserved.\n');
  
  try {
    // Confirm rollback
    const confirmed = await confirmRollback();
    if (!confirmed) {
      console.log('Rollback cancelled.');
      return;
    }
    
    // Get counts before rollback
    console.log('📊 Current data counts:');
    const preCounts = await getPreRollbackCounts();
    console.log(`   - Progress snapshots: ${preCounts.snapshots}`);
    console.log(`   - Task history: ${preCounts.history}`);
    console.log(`   - Task dependencies: ${preCounts.dependencies}`);
    console.log(`   - Plan tasks: ${preCounts.tasks}`);
    console.log(`   - Plan phases: ${preCounts.phases}`);
    console.log(`   - Action plans: ${preCounts.plans}`);
    
    if (preCounts.plans === 0) {
      console.log('\n✓ No action plan data found. Nothing to rollback.');
      return;
    }
    
    // Perform rollback
    await deleteActionPlanData();
    
    // Reset sequences
    await resetSequences();
    
    // Verify rollback
    const verified = await verifyRollback();
    
    // Print final statistics
    console.log('\n' + '='.repeat(60));
    if (verified) {
      console.log('✅ Rollback completed successfully!\n');
    } else {
      console.log('⚠️  Rollback completed with warnings!\n');
    }
    console.log('📈 Statistics:');
    console.log(`   - Progress snapshots deleted: ${stats.snapshotsDeleted}`);
    console.log(`   - Task history deleted: ${stats.historyDeleted}`);
    console.log(`   - Task dependencies deleted: ${stats.dependenciesDeleted}`);
    console.log(`   - Plan tasks deleted: ${stats.tasksDeleted}`);
    console.log(`   - Plan phases deleted: ${stats.phasesDeleted}`);
    console.log(`   - Action plans deleted: ${stats.plansDeleted}`);
    console.log(`   - Errors: ${stats.errors}`);
    console.log('='.repeat(60) + '\n');
    
    if (!verified) {
      console.warn('⚠️  Some data may remain. Manual cleanup may be required.');
      console.warn('Check the verification output above for details.\n');
    }
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    console.error('\n⚠️  Database may be in an inconsistent state!');
    console.error('Consider restoring from backup.\n');
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  rollbackActionPlans()
    .then(() => {
      console.log('✨ Done!');
      process.exit(stats.errors > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

export { rollbackActionPlans };
