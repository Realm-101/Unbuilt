-- Migration: Database Performance Optimization
-- Description: Add indexes for common query patterns and optimize existing queries
-- Date: 2025-11-01

-- ============================================================================
-- Action Plan Customization Indexes
-- ============================================================================

-- Composite indexes for common action plan queries
CREATE INDEX IF NOT EXISTS idx_action_plans_user_status_updated 
  ON action_plans(user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_plan_tasks_plan_status_completed 
  ON plan_tasks(plan_id, status, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_plan_tasks_assignee_status 
  ON plan_tasks(assignee_id, status) 
  WHERE assignee_id IS NOT NULL;

-- Index for task dependency lookups
CREATE INDEX IF NOT EXISTS idx_task_dependencies_both 
  ON task_dependencies(task_id, prerequisite_task_id);

-- Index for progress tracking queries
CREATE INDEX IF NOT EXISTS idx_progress_snapshots_plan_recent 
  ON progress_snapshots(plan_id, timestamp DESC);

-- Index for task history audit queries
CREATE INDEX IF NOT EXISTS idx_task_history_task_action_timestamp 
  ON task_history(task_id, action, timestamp DESC);

-- ============================================================================
-- Search and Results Indexes
-- ============================================================================

-- Composite index for user's favorite searches
CREATE INDEX IF NOT EXISTS idx_searches_user_favorite_timestamp 
  ON searches(user_id, is_favorite, timestamp DESC) 
  WHERE is_favorite = true;

-- Index for search results by category and score
CREATE INDEX IF NOT EXISTS idx_search_results_search_category_score 
  ON search_results(search_id, category, innovation_score DESC);

-- Index for high-priority search results
CREATE INDEX IF NOT EXISTS idx_search_results_priority_confidence 
  ON search_results(priority, confidence_score DESC) 
  WHERE priority = 'high';

-- ============================================================================
-- Conversation and Message Indexes
-- ============================================================================

-- Composite index for conversation message retrieval
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conv_created 
  ON conversation_messages(conversation_id, created_at ASC);

-- Index for suggested questions by category and priority
CREATE INDEX IF NOT EXISTS idx_suggested_questions_conv_category_priority 
  ON suggested_questions(conversation_id, category, priority DESC) 
  WHERE used = false;

-- Index for conversation analytics by user
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_user_tokens 
  ON conversation_analytics(user_id, total_tokens_used DESC);

-- ============================================================================
-- Resource Library Indexes
-- ============================================================================

-- Composite index for active resources by category and rating
CREATE INDEX IF NOT EXISTS idx_resources_active_category_rating 
  ON resources(is_active, category_id, average_rating DESC) 
  WHERE is_active = true;

-- Index for resource bookmarks by user
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_created 
  ON user_bookmarks(user_id, created_at DESC);

-- Index for resource access history by user and date
CREATE INDEX IF NOT EXISTS idx_resource_access_user_date 
  ON resource_access_history(user_id, accessed_at DESC);

-- Index for resource analytics by date range
CREATE INDEX IF NOT EXISTS idx_resource_analytics_date_views 
  ON resource_analytics(date DESC, view_count DESC);

-- ============================================================================
-- User and Authentication Indexes
-- ============================================================================

-- Index for active users by subscription tier
CREATE INDEX IF NOT EXISTS idx_users_active_tier 
  ON users(is_active, subscription_tier) 
  WHERE is_active = true;

-- Index for locked accounts
CREATE INDEX IF NOT EXISTS idx_users_locked_accounts 
  ON users(account_locked, lockout_expires) 
  WHERE account_locked = true;

-- Index for JWT token cleanup
CREATE INDEX IF NOT EXISTS idx_jwt_tokens_expired 
  ON jwt_tokens(expires_at, is_revoked) 
  WHERE is_revoked = false;

-- ============================================================================
-- Security and Audit Indexes
-- ============================================================================

-- Composite index for security audit log queries
CREATE INDEX IF NOT EXISTS idx_security_audit_user_event_timestamp 
  ON security_audit_logs(user_id, event_type, timestamp DESC);

-- Index for critical security alerts
CREATE INDEX IF NOT EXISTS idx_security_alerts_critical_open 
  ON security_alerts(severity, status, timestamp DESC) 
  WHERE status = 'open' AND severity IN ('high', 'critical');

-- Index for password history by user and date
CREATE INDEX IF NOT EXISTS idx_password_history_user_created_desc 
  ON password_history(user_id, created_at DESC);

-- ============================================================================
-- Analytics and Tracking Indexes
-- ============================================================================

-- Index for analytics events by type and date
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_timestamp 
  ON analytics_events(event_type, timestamp DESC);

-- Index for user analytics events
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_timestamp 
  ON analytics_events(user_id, timestamp DESC) 
  WHERE user_id IS NOT NULL;

-- ============================================================================
-- Project and Collaboration Indexes
-- ============================================================================

-- Index for active projects by user
CREATE INDEX IF NOT EXISTS idx_projects_user_active_updated 
  ON projects(user_id, archived, updated_at DESC);

-- Index for project analyses
CREATE INDEX IF NOT EXISTS idx_project_analyses_project_added 
  ON project_analyses(project_id, added_at DESC);

-- Index for team members by team and role
CREATE INDEX IF NOT EXISTS idx_team_members_team_role_status 
  ON team_members(team_id, role, status);

-- ============================================================================
-- Partial Indexes for Common Filters
-- ============================================================================

-- Index for incomplete tasks (most common query)
CREATE INDEX IF NOT EXISTS idx_plan_tasks_incomplete 
  ON plan_tasks(plan_id, phase_id, order) 
  WHERE status IN ('not_started', 'in_progress');

-- Index for active conversations
CREATE INDEX IF NOT EXISTS idx_conversations_active 
  ON conversations(user_id, updated_at DESC);

-- Index for pending resource contributions
CREATE INDEX IF NOT EXISTS idx_resource_contributions_pending 
  ON resource_contributions(status, created_at DESC) 
  WHERE status = 'pending';

-- ============================================================================
-- Statistics Update
-- ============================================================================

-- Update table statistics for query planner
ANALYZE action_plans;
ANALYZE plan_phases;
ANALYZE plan_tasks;
ANALYZE task_dependencies;
ANALYZE progress_snapshots;
ANALYZE searches;
ANALYZE search_results;
ANALYZE conversations;
ANALYZE conversation_messages;
ANALYZE resources;
ANALYZE users;
ANALYZE security_audit_logs;
ANALYZE analytics_events;
