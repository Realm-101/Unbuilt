-- UX Information Architecture Migration
-- Creates tables for user preferences, projects, progress tracking, share links, and help articles

-- User Preferences Table
CREATE TABLE IF NOT EXISTS "user_preferences" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL,
  "role" TEXT,
  "onboarding_completed" BOOLEAN DEFAULT false NOT NULL,
  "tour_progress" JSONB DEFAULT '[]'::jsonb NOT NULL,
  "expanded_sections" JSONB DEFAULT '{}'::jsonb NOT NULL,
  "keyboard_shortcuts" JSONB DEFAULT '{}'::jsonb NOT NULL,
  "accessibility_settings" JSONB DEFAULT '{"highContrast": false, "reducedMotion": false, "screenReaderOptimized": false}'::jsonb NOT NULL,
  "created_at" TIMESTAMP DEFAULT now() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT now() NOT NULL,
  CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);

CREATE INDEX IF NOT EXISTS "user_preferences_user_id_idx" ON "user_preferences" ("user_id");

-- Projects Table
CREATE TABLE IF NOT EXISTS "projects" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "description" TEXT,
  "tags" JSONB DEFAULT '[]'::jsonb NOT NULL,
  "archived" BOOLEAN DEFAULT false NOT NULL,
  "created_at" TIMESTAMP DEFAULT now() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT now() NOT NULL,
  CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "projects_user_id_idx" ON "projects" ("user_id");
CREATE INDEX IF NOT EXISTS "projects_archived_idx" ON "projects" ("archived");

-- Project Analyses Junction Table
CREATE TABLE IF NOT EXISTS "project_analyses" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "project_id" INTEGER NOT NULL,
  "search_id" INTEGER NOT NULL,
  "added_at" TIMESTAMP DEFAULT now() NOT NULL,
  CONSTRAINT "project_analyses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "project_analyses_search_id_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "searches"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "project_analyses_project_search_unique" UNIQUE("project_id", "search_id")
);

CREATE INDEX IF NOT EXISTS "project_analyses_project_id_idx" ON "project_analyses" ("project_id");
CREATE INDEX IF NOT EXISTS "project_analyses_search_id_idx" ON "project_analyses" ("search_id");

-- Action Plan Progress Table
CREATE TABLE IF NOT EXISTS "action_plan_progress" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL,
  "search_id" INTEGER NOT NULL,
  "completed_steps" JSONB DEFAULT '[]'::jsonb NOT NULL,
  "phase_completion" JSONB DEFAULT '{}'::jsonb NOT NULL,
  "overall_completion" INTEGER DEFAULT 0 NOT NULL,
  "last_updated" TIMESTAMP DEFAULT now() NOT NULL,
  "created_at" TIMESTAMP DEFAULT now() NOT NULL,
  CONSTRAINT "action_plan_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "action_plan_progress_search_id_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "searches"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "action_plan_progress_user_search_unique" UNIQUE("user_id", "search_id")
);

CREATE INDEX IF NOT EXISTS "action_plan_progress_user_id_idx" ON "action_plan_progress" ("user_id");
CREATE INDEX IF NOT EXISTS "action_plan_progress_search_id_idx" ON "action_plan_progress" ("search_id");

-- Share Links Table
CREATE TABLE IF NOT EXISTS "share_links" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL,
  "search_id" INTEGER NOT NULL,
  "token" VARCHAR(64) NOT NULL,
  "expires_at" TIMESTAMP,
  "view_count" INTEGER DEFAULT 0 NOT NULL,
  "active" BOOLEAN DEFAULT true NOT NULL,
  "created_at" TIMESTAMP DEFAULT now() NOT NULL,
  "last_accessed_at" TIMESTAMP,
  CONSTRAINT "share_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "share_links_search_id_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "searches"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "share_links_token_unique" UNIQUE("token")
);

CREATE INDEX IF NOT EXISTS "share_links_user_id_idx" ON "share_links" ("user_id");
CREATE INDEX IF NOT EXISTS "share_links_token_idx" ON "share_links" ("token");
CREATE INDEX IF NOT EXISTS "share_links_active_idx" ON "share_links" ("active");

-- Help Articles Table
CREATE TABLE IF NOT EXISTS "help_articles" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "content" TEXT NOT NULL,
  "context" JSONB DEFAULT '[]'::jsonb NOT NULL,
  "category" VARCHAR(50) NOT NULL,
  "tags" JSONB DEFAULT '[]'::jsonb NOT NULL,
  "video_url" TEXT,
  "related_articles" JSONB DEFAULT '[]'::jsonb NOT NULL,
  "view_count" INTEGER DEFAULT 0 NOT NULL,
  "helpful_count" INTEGER DEFAULT 0 NOT NULL,
  "created_at" TIMESTAMP DEFAULT now() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "help_articles_category_idx" ON "help_articles" ("category");
CREATE INDEX IF NOT EXISTS "help_articles_view_count_idx" ON "help_articles" ("view_count" DESC);

-- Add comments for documentation
COMMENT ON TABLE "user_preferences" IS 'Stores user preferences including role, onboarding status, and UI settings';
COMMENT ON TABLE "projects" IS 'User-created projects for organizing gap analyses';
COMMENT ON TABLE "project_analyses" IS 'Junction table linking projects to searches/analyses';
COMMENT ON TABLE "action_plan_progress" IS 'Tracks user progress through action plan steps';
COMMENT ON TABLE "share_links" IS 'Secure shareable links for analyses';
COMMENT ON TABLE "help_articles" IS 'Contextual help content and documentation';
