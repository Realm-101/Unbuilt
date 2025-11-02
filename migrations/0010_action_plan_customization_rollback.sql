-- Rollback Migration: Action Plan Customization & Progress Tracking
-- Description: Rollback script to remove action plan tables and related objects

-- ============================================================================
-- Drop Triggers
-- ============================================================================

DROP TRIGGER IF EXISTS create_task_history_trigger ON "plan_tasks";
DROP TRIGGER IF EXISTS update_plan_templates_updated_at ON "plan_templates";
DROP TRIGGER IF EXISTS update_plan_tasks_updated_at ON "plan_tasks";
DROP TRIGGER IF EXISTS update_plan_phases_updated_at ON "plan_phases";
DROP TRIGGER IF EXISTS update_action_plans_updated_at ON "action_plans";

-- ============================================================================
-- Drop Functions
-- ============================================================================

DROP FUNCTION IF EXISTS create_task_history();
DROP FUNCTION IF EXISTS create_progress_snapshot(integer);
DROP FUNCTION IF EXISTS calculate_plan_progress(integer);
DROP FUNCTION IF EXISTS update_updated_at_column();

-- ============================================================================
-- Drop Tables (in reverse order of dependencies)
-- ============================================================================

DROP TABLE IF EXISTS "progress_snapshots";
DROP TABLE IF EXISTS "task_history";
DROP TABLE IF EXISTS "task_dependencies";
DROP TABLE IF EXISTS "plan_tasks";
DROP TABLE IF EXISTS "plan_phases";
DROP TABLE IF EXISTS "plan_templates";
DROP TABLE IF EXISTS "action_plans";

-- ============================================================================
-- Drop Enum Types
-- ============================================================================

DROP TYPE IF EXISTS task_history_action;
DROP TYPE IF EXISTS task_status;
DROP TYPE IF EXISTS plan_status;

-- ============================================================================
-- Confirmation
-- ============================================================================

-- Log rollback completion
DO $
BEGIN
  RAISE NOTICE 'Action Plan Customization rollback completed successfully';
END;
$;
