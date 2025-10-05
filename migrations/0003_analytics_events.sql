-- Migration: Add analytics_events table for usage tracking
-- Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7

CREATE TABLE IF NOT EXISTS "analytics_events" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "event_type" TEXT NOT NULL,
  "user_id" INTEGER,
  "timestamp" TIMESTAMP DEFAULT NOW() NOT NULL,
  "metadata" JSONB DEFAULT '{}',
  "ip_address" TEXT,
  "user_agent" TEXT,
  "session_id" TEXT,
  CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS "analytics_events_timestamp_idx" ON "analytics_events" ("timestamp");
CREATE INDEX IF NOT EXISTS "analytics_events_event_type_idx" ON "analytics_events" ("event_type");
CREATE INDEX IF NOT EXISTS "analytics_events_user_id_idx" ON "analytics_events" ("user_id");

-- Add comment for documentation
COMMENT ON TABLE "analytics_events" IS 'Tracks user behavior and feature usage for analytics';
COMMENT ON COLUMN "analytics_events"."event_type" IS 'Type of event: search_performed, export_generated, page_view, feature_usage, user_signup, subscription_event';
COMMENT ON COLUMN "analytics_events"."metadata" IS 'Event-specific data stored as JSON (query, format, page, etc.)';

-- Add privacy control field to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "analytics_opt_out" BOOLEAN DEFAULT FALSE NOT NULL;

COMMENT ON COLUMN "users"."analytics_opt_out" IS 'User preference to opt out of analytics tracking';
