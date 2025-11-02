-- Rollback Migration: Resource Performance Optimization
-- Description: Remove performance optimization indexes and materialized views

-- Drop materialized views
DROP MATERIALIZED VIEW IF EXISTS "resource_analytics_summary_mv";
DROP MATERIALIZED VIEW IF EXISTS "popular_resources_mv";

-- Drop functions
DROP FUNCTION IF EXISTS refresh_resource_analytics_summary_mv();
DROP FUNCTION IF EXISTS refresh_popular_resources_mv();

-- Drop custom text search configuration
DROP TEXT SEARCH CONFIGURATION IF EXISTS resource_search;

-- Restore original search vector trigger
CREATE OR REPLACE FUNCTION update_resources_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop composite indexes
DROP INDEX IF EXISTS "resource_access_history_analysis_accessed_idx";
DROP INDEX IF EXISTS "resource_access_history_resource_type_idx";
DROP INDEX IF EXISTS "resource_access_history_user_accessed_idx";
DROP INDEX IF EXISTS "resource_analytics_performance_idx";
DROP INDEX IF EXISTS "resource_analytics_resource_date_range_idx";
DROP INDEX IF EXISTS "resource_ratings_resource_recent_idx";
DROP INDEX IF EXISTS "resource_ratings_resource_helpful_idx";
DROP INDEX IF EXISTS "user_bookmarks_user_created_idx";
DROP INDEX IF EXISTS "resources_idea_types_gin_idx";
DROP INDEX IF EXISTS "resources_phase_relevance_gin_idx";
DROP INDEX IF EXISTS "resources_recent_idx";
DROP INDEX IF EXISTS "resources_popular_idx";
DROP INDEX IF EXISTS "resources_active_premium_idx";
DROP INDEX IF EXISTS "resources_active_category_rating_idx";

