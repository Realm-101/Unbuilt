-- Rollback Migration: Database Performance Optimization
-- Description: Remove performance optimization indexes
-- Date: 2025-11-01

-- ============================================================================
-- Drop Action Plan Customization Indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_action_plans_user_status_updated;
DROP INDEX IF EXISTS idx_plan_tasks_plan_status_completed;
DROP INDEX IF EXISTS idx_plan_tasks_assignee_status;
DROP INDEX IF EXISTS idx_task_dependencies_both;
DROP INDEX IF EXISTS idx_progress_snapshots_plan_recent;
DROP INDEX IF EXISTS idx_task_history_task_action_timestamp;

-- ============================================================================
-- Drop Search and Results Indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_searches_user_favorite_timestamp;
DROP INDEX IF EXISTS idx_search_results_search_category_score;
DROP INDEX IF EXISTS idx_search_results_priority_confidence;

-- ============================================================================
-- Drop Conversation and Message Indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_conversation_messages_conv_created;
DROP INDEX IF EXISTS idx_suggested_questions_conv_category_priority;
DROP INDEX IF EXISTS idx_conversation_analytics_user_tokens;

-- ============================================================================
-- Drop Resource Library Indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_resources_active_category_rating;
DROP INDEX IF EXISTS idx_user_bookmarks_user_created;
DROP INDEX IF EXISTS idx_resource_access_user_date;
DROP INDEX IF EXISTS idx_resource_analytics_date_views;

-- ============================================================================
-- Drop User and Authentication Indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_users_active_tier;
DROP INDEX IF EXISTS idx_users_locked_accounts;
DROP INDEX IF EXISTS idx_jwt_tokens_expired;

-- ============================================================================
-- Drop Security and Audit Indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_security_audit_user_event_timestamp;
DROP INDEX IF EXISTS idx_security_alerts_critical_open;
DROP INDEX IF EXISTS idx_password_history_user_created_desc;

-- ============================================================================
-- Drop Analytics and Tracking Indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_analytics_events_type_timestamp;
DROP INDEX IF EXISTS idx_analytics_events_user_timestamp;

-- ============================================================================
-- Drop Project and Collaboration Indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_projects_user_active_updated;
DROP INDEX IF EXISTS idx_project_analyses_project_added;
DROP INDEX IF EXISTS idx_team_members_team_role_status;

-- ============================================================================
-- Drop Partial Indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_plan_tasks_incomplete;
DROP INDEX IF EXISTS idx_conversations_active;
DROP INDEX IF EXISTS idx_resource_contributions_pending;
