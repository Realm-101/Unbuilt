-- Migration: Resource Performance Optimization
-- Description: Add additional indexes and optimizations for resource library queries
-- Requirements: All

-- ============================================================================
-- Composite Indexes for Common Query Patterns
-- ============================================================================

-- Composite index for filtering active resources by category and rating
CREATE INDEX IF NOT EXISTS "resources_active_category_rating_idx" 
ON "resources" ("is_active", "category_id", "average_rating" DESC)
WHERE "is_active" = TRUE;

-- Composite index for filtering active premium resources
CREATE INDEX IF NOT EXISTS "resources_active_premium_idx" 
ON "resources" ("is_active", "is_premium")
WHERE "is_active" = TRUE;

-- Composite index for popular resources (active, sorted by views and rating)
CREATE INDEX IF NOT EXISTS "resources_popular_idx" 
ON "resources" ("is_active", "view_count" DESC, "average_rating" DESC)
WHERE "is_active" = TRUE;

-- Composite index for recent resources
CREATE INDEX IF NOT EXISTS "resources_recent_idx" 
ON "resources" ("is_active", "created_at" DESC)
WHERE "is_active" = TRUE;

-- ============================================================================
-- JSONB Indexes for Phase and Idea Type Filtering
-- ============================================================================

-- GIN index for phase_relevance JSONB array queries
CREATE INDEX IF NOT EXISTS "resources_phase_relevance_gin_idx" 
ON "resources" USING GIN ("phase_relevance" jsonb_path_ops);

-- GIN index for idea_types JSONB array queries
CREATE INDEX IF NOT EXISTS "resources_idea_types_gin_idx" 
ON "resources" USING GIN ("idea_types" jsonb_path_ops);

-- ============================================================================
-- Indexes for User Interaction Queries
-- ============================================================================

-- Composite index for user bookmarks with resource details
CREATE INDEX IF NOT EXISTS "user_bookmarks_user_created_idx" 
ON "user_bookmarks" ("user_id", "created_at" DESC);

-- Composite index for resource ratings by resource and helpfulness
CREATE INDEX IF NOT EXISTS "resource_ratings_resource_helpful_idx" 
ON "resource_ratings" ("resource_id", "is_helpful_count" DESC);

-- Composite index for resource ratings by resource and recency
CREATE INDEX IF NOT EXISTS "resource_ratings_resource_recent_idx" 
ON "resource_ratings" ("resource_id", "created_at" DESC);

-- ============================================================================
-- Indexes for Analytics Queries
-- ============================================================================

-- Composite index for analytics by resource and date range
CREATE INDEX IF NOT EXISTS "resource_analytics_resource_date_range_idx" 
ON "resource_analytics" ("resource_id", "date" DESC);

-- Composite index for top performing resources
CREATE INDEX IF NOT EXISTS "resource_analytics_performance_idx" 
ON "resource_analytics" ("date", "view_count" DESC, "unique_users" DESC);

-- ============================================================================
-- Indexes for Access History Queries
-- ============================================================================

-- Composite index for user access history
CREATE INDEX IF NOT EXISTS "resource_access_history_user_accessed_idx" 
ON "resource_access_history" ("user_id", "accessed_at" DESC);

-- Composite index for resource access patterns
CREATE INDEX IF NOT EXISTS "resource_access_history_resource_type_idx" 
ON "resource_access_history" ("resource_id", "access_type", "accessed_at" DESC);

-- Composite index for analysis-related access
CREATE INDEX IF NOT EXISTS "resource_access_history_analysis_accessed_idx" 
ON "resource_access_history" ("analysis_id", "accessed_at" DESC)
WHERE "analysis_id" IS NOT NULL;

-- ============================================================================
-- Materialized View for Popular Resources
-- ============================================================================

-- Create materialized view for popular resources (refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS "popular_resources_mv" AS
SELECT 
  r.id,
  r.title,
  r.description,
  r.url,
  r.resource_type,
  r.category_id,
  r.phase_relevance,
  r.idea_types,
  r.difficulty_level,
  r.estimated_time_minutes,
  r.is_premium,
  r.average_rating,
  r.rating_count,
  r.view_count,
  r.bookmark_count,
  r.created_at,
  -- Calculate popularity score
  (
    (r.view_count * 0.3) +
    (r.bookmark_count * 10 * 0.3) +
    (r.rating_count * 5 * 0.2) +
    (r.average_rating * 0.2)
  ) AS popularity_score
FROM resources r
WHERE r.is_active = TRUE
ORDER BY popularity_score DESC;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS "popular_resources_mv_score_idx" 
ON "popular_resources_mv" ("popularity_score" DESC);

CREATE INDEX IF NOT EXISTS "popular_resources_mv_category_idx" 
ON "popular_resources_mv" ("category_id", "popularity_score" DESC);

-- ============================================================================
-- Materialized View for Resource Analytics Summary
-- ============================================================================

-- Create materialized view for resource analytics summary (last 30 days)
CREATE MATERIALIZED VIEW IF NOT EXISTS "resource_analytics_summary_mv" AS
SELECT 
  ra.resource_id,
  SUM(ra.view_count) AS total_views_30d,
  SUM(ra.unique_users) AS total_unique_users_30d,
  SUM(ra.bookmark_count) AS total_bookmarks_30d,
  SUM(ra.download_count) AS total_downloads_30d,
  SUM(ra.external_click_count) AS total_external_clicks_30d,
  AVG(ra.average_time_spent_seconds) AS avg_time_spent_30d,
  MAX(ra.date) AS last_activity_date
FROM resource_analytics ra
WHERE ra.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ra.resource_id;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS "resource_analytics_summary_mv_resource_idx" 
ON "resource_analytics_summary_mv" ("resource_id");

CREATE INDEX IF NOT EXISTS "resource_analytics_summary_mv_views_idx" 
ON "resource_analytics_summary_mv" ("total_views_30d" DESC);

-- ============================================================================
-- Function to Refresh Materialized Views
-- ============================================================================

-- Function to refresh popular resources view
CREATE OR REPLACE FUNCTION refresh_popular_resources_mv()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY popular_resources_mv;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh analytics summary view
CREATE OR REPLACE FUNCTION refresh_resource_analytics_summary_mv()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY resource_analytics_summary_mv;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Optimized Full-Text Search Configuration
-- ============================================================================

-- Create custom text search configuration for resources
CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS resource_search (COPY = english);

-- Add custom dictionary for common resource terms
-- This helps with stemming and relevance for technical terms

-- Update the search vector trigger to use the custom configuration
CREATE OR REPLACE FUNCTION update_resources_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('resource_search', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('resource_search', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Statistics and Maintenance
-- ============================================================================

-- Update statistics for better query planning
ANALYZE resources;
ANALYZE resource_categories;
ANALYZE resource_tags;
ANALYZE user_bookmarks;
ANALYZE resource_ratings;
ANALYZE resource_access_history;
ANALYZE resource_analytics;

-- Add comments for documentation
COMMENT ON INDEX "resources_active_category_rating_idx" IS 'Composite index for filtering active resources by category and rating';
COMMENT ON INDEX "resources_phase_relevance_gin_idx" IS 'GIN index for efficient JSONB array queries on phase_relevance';
COMMENT ON INDEX "resources_idea_types_gin_idx" IS 'GIN index for efficient JSONB array queries on idea_types';
COMMENT ON MATERIALIZED VIEW "popular_resources_mv" IS 'Materialized view of popular resources with calculated popularity score';
COMMENT ON MATERIALIZED VIEW "resource_analytics_summary_mv" IS 'Materialized view of resource analytics summary for last 30 days';

