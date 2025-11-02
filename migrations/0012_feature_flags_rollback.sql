-- Feature Flags Rollback Migration
-- This migration removes the feature flags tables

-- Drop user_feature_flags table first (has foreign keys)
DROP TABLE IF EXISTS "user_feature_flags";

-- Drop feature_flags table
DROP TABLE IF EXISTS "feature_flags";

-- Drop indexes (if they weren't dropped with the tables)
DROP INDEX IF EXISTS "idx_feature_flags_name";
DROP INDEX IF EXISTS "idx_feature_flags_enabled";
DROP INDEX IF EXISTS "idx_user_feature_flags_user_id";
DROP INDEX IF EXISTS "idx_user_feature_flags_feature_flag_id";
