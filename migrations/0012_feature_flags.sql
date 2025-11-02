-- Feature Flags Migration
-- This migration adds support for feature flags to enable gradual rollout and A/B testing

-- Create feature_flags table
CREATE TABLE IF NOT EXISTS "feature_flags" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT NOT NULL,
  "enabled" BOOLEAN DEFAULT false NOT NULL,
  "rollout_percentage" INTEGER DEFAULT 0 NOT NULL,
  "allowed_tiers" JSONB DEFAULT '[]'::jsonb NOT NULL,
  "allowed_user_ids" JSONB DEFAULT '[]'::jsonb NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT "feature_flags_name_unique" UNIQUE("name")
);

-- Create indexes for feature_flags
CREATE INDEX IF NOT EXISTS "idx_feature_flags_name" ON "feature_flags" ("name");
CREATE INDEX IF NOT EXISTS "idx_feature_flags_enabled" ON "feature_flags" ("enabled");

-- Create user_feature_flags table for tracking individual user feature access
CREATE TABLE IF NOT EXISTS "user_feature_flags" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL,
  "feature_flag_id" INTEGER NOT NULL,
  "enabled" BOOLEAN DEFAULT true NOT NULL,
  "enabled_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "disabled_at" TIMESTAMP,
  CONSTRAINT "user_feature_flags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "user_feature_flags_feature_flag_id_feature_flags_id_fk" FOREIGN KEY ("feature_flag_id") REFERENCES "feature_flags"("id") ON DELETE CASCADE,
  CONSTRAINT "user_feature_flags_user_feature_unique" UNIQUE("user_id", "feature_flag_id")
);

-- Create indexes for user_feature_flags
CREATE INDEX IF NOT EXISTS "idx_user_feature_flags_user_id" ON "user_feature_flags" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_feature_flags_feature_flag_id" ON "user_feature_flags" ("feature_flag_id");

-- Insert default feature flag for action plan customization
INSERT INTO "feature_flags" ("name", "description", "enabled", "rollout_percentage", "allowed_tiers", "allowed_user_ids")
VALUES (
  'action_plan_customization',
  'Interactive action plan customization with task management, progress tracking, and collaboration features',
  false,
  0,
  '[]'::jsonb,
  '[]'::jsonb
) ON CONFLICT ("name") DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE "feature_flags" IS 'Feature flags for gradual rollout and A/B testing';
COMMENT ON TABLE "user_feature_flags" IS 'Tracks individual user access to features';
COMMENT ON COLUMN "feature_flags"."rollout_percentage" IS 'Percentage of users (0-100) who have access to this feature';
COMMENT ON COLUMN "feature_flags"."allowed_tiers" IS 'Array of subscription tiers allowed to access this feature (e.g., ["pro", "enterprise"])';
COMMENT ON COLUMN "feature_flags"."allowed_user_ids" IS 'Array of specific user IDs who have explicit access to this feature';
