-- Rollback Migration: Resource Library Enhancement
-- Description: Rollback script to remove all resource library tables

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS "resource_analytics" CASCADE;
DROP TABLE IF EXISTS "resource_access_history" CASCADE;
DROP TABLE IF EXISTS "resource_contributions" CASCADE;
DROP TABLE IF EXISTS "resource_ratings" CASCADE;
DROP TABLE IF EXISTS "user_bookmarks" CASCADE;
DROP TABLE IF EXISTS "resource_tag_mappings" CASCADE;
DROP TABLE IF EXISTS "resources" CASCADE;
DROP TABLE IF EXISTS "resource_tags" CASCADE;
DROP TABLE IF EXISTS "resource_categories" CASCADE;

-- Drop the trigger function
DROP FUNCTION IF EXISTS update_resources_search_vector() CASCADE;

