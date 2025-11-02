-- Migration: Resource Library Enhancement
-- Description: Add tables for resource management, categories, tags, bookmarks, ratings, contributions, and analytics
-- Requirements: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11

-- Create resource_categories table
CREATE TABLE IF NOT EXISTS "resource_categories" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "slug" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "icon" VARCHAR(50),
  "display_order" INTEGER DEFAULT 0 NOT NULL,
  "parent_id" INTEGER,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT "resource_categories_name_unique" UNIQUE("name"),
  CONSTRAINT "resource_categories_slug_unique" UNIQUE("slug"),
  CONSTRAINT "resource_categories_parent_id_resource_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "resource_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes for resource_categories
CREATE INDEX IF NOT EXISTS "resource_categories_parent_id_idx" ON "resource_categories" ("parent_id");
CREATE INDEX IF NOT EXISTS "resource_categories_display_order_idx" ON "resource_categories" ("display_order");

-- Create resource_tags table
CREATE TABLE IF NOT EXISTS "resource_tags" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" VARCHAR(50) NOT NULL,
  "slug" VARCHAR(50) NOT NULL,
  "usage_count" INTEGER DEFAULT 0 NOT NULL,
  CONSTRAINT "resource_tags_name_unique" UNIQUE("name"),
  CONSTRAINT "resource_tags_slug_unique" UNIQUE("slug")
);

-- Create indexes for resource_tags
CREATE INDEX IF NOT EXISTS "resource_tags_usage_count_idx" ON "resource_tags" ("usage_count" DESC);

-- Create resources table
CREATE TABLE IF NOT EXISTS "resources" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "resource_type" VARCHAR(50) NOT NULL CHECK ("resource_type" IN ('tool', 'template', 'guide', 'video', 'article')),
  "category_id" INTEGER,
  "phase_relevance" JSONB DEFAULT '[]'::jsonb NOT NULL,
  "idea_types" JSONB DEFAULT '[]'::jsonb NOT NULL,
  "difficulty_level" VARCHAR(20) CHECK ("difficulty_level" IN ('beginner', 'intermediate', 'advanced')),
  "estimated_time_minutes" INTEGER,
  "is_premium" BOOLEAN DEFAULT FALSE NOT NULL,
  "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
  "average_rating" INTEGER DEFAULT 0 NOT NULL,
  "rating_count" INTEGER DEFAULT 0 NOT NULL,
  "view_count" INTEGER DEFAULT 0 NOT NULL,
  "bookmark_count" INTEGER DEFAULT 0 NOT NULL,
  "metadata" JSONB DEFAULT '{}'::jsonb NOT NULL,
  "search_vector" TSVECTOR,
  "created_by" INTEGER,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT "resources_category_id_resource_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "resource_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "resources_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes for resources
CREATE INDEX IF NOT EXISTS "resources_category_id_idx" ON "resources" ("category_id");
CREATE INDEX IF NOT EXISTS "resources_is_active_idx" ON "resources" ("is_active");
CREATE INDEX IF NOT EXISTS "resources_average_rating_idx" ON "resources" ("average_rating" DESC);
CREATE INDEX IF NOT EXISTS "resources_view_count_idx" ON "resources" ("view_count" DESC);
CREATE INDEX IF NOT EXISTS "resources_resource_type_idx" ON "resources" ("resource_type");
CREATE INDEX IF NOT EXISTS "resources_search_vector_idx" ON "resources" USING GIN ("search_vector");

-- Create trigger to update search_vector on insert/update
CREATE OR REPLACE FUNCTION update_resources_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resources_search_vector_update
BEFORE INSERT OR UPDATE ON "resources"
FOR EACH ROW
EXECUTE FUNCTION update_resources_search_vector();

-- Create resource_tag_mappings table
CREATE TABLE IF NOT EXISTS "resource_tag_mappings" (
  "resource_id" INTEGER NOT NULL,
  "tag_id" INTEGER NOT NULL,
  PRIMARY KEY ("resource_id", "tag_id"),
  CONSTRAINT "resource_tag_mappings_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "resource_tag_mappings_tag_id_resource_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "resource_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for resource_tag_mappings
CREATE INDEX IF NOT EXISTS "resource_tag_mappings_resource_id_idx" ON "resource_tag_mappings" ("resource_id");
CREATE INDEX IF NOT EXISTS "resource_tag_mappings_tag_id_idx" ON "resource_tag_mappings" ("tag_id");

-- Create user_bookmarks table
CREATE TABLE IF NOT EXISTS "user_bookmarks" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL,
  "resource_id" INTEGER NOT NULL,
  "notes" TEXT,
  "custom_tags" JSONB DEFAULT '[]'::jsonb NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT "user_bookmarks_user_resource_unique" UNIQUE("user_id", "resource_id"),
  CONSTRAINT "user_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_bookmarks_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for user_bookmarks
CREATE INDEX IF NOT EXISTS "user_bookmarks_user_id_idx" ON "user_bookmarks" ("user_id");
CREATE INDEX IF NOT EXISTS "user_bookmarks_resource_id_idx" ON "user_bookmarks" ("resource_id");

-- Create resource_ratings table
CREATE TABLE IF NOT EXISTS "resource_ratings" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL,
  "resource_id" INTEGER NOT NULL,
  "rating" INTEGER NOT NULL CHECK ("rating" >= 1 AND "rating" <= 5),
  "review" TEXT,
  "is_helpful_count" INTEGER DEFAULT 0 NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT "resource_ratings_user_resource_unique" UNIQUE("user_id", "resource_id"),
  CONSTRAINT "resource_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "resource_ratings_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for resource_ratings
CREATE INDEX IF NOT EXISTS "resource_ratings_resource_id_idx" ON "resource_ratings" ("resource_id");
CREATE INDEX IF NOT EXISTS "resource_ratings_rating_idx" ON "resource_ratings" ("rating" DESC);
CREATE INDEX IF NOT EXISTS "resource_ratings_is_helpful_count_idx" ON "resource_ratings" ("is_helpful_count" DESC);

-- Create resource_contributions table
CREATE TABLE IF NOT EXISTS "resource_contributions" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "suggested_category_id" INTEGER,
  "suggested_tags" JSONB DEFAULT '[]'::jsonb NOT NULL,
  "status" VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK ("status" IN ('pending', 'approved', 'rejected')),
  "admin_notes" TEXT,
  "reviewed_by" INTEGER,
  "reviewed_at" TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT "resource_contributions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "resource_contributions_suggested_category_id_resource_categories_id_fk" FOREIGN KEY ("suggested_category_id") REFERENCES "resource_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "resource_contributions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes for resource_contributions
CREATE INDEX IF NOT EXISTS "resource_contributions_status_idx" ON "resource_contributions" ("status");
CREATE INDEX IF NOT EXISTS "resource_contributions_user_id_idx" ON "resource_contributions" ("user_id");
CREATE INDEX IF NOT EXISTS "resource_contributions_created_at_idx" ON "resource_contributions" ("created_at" DESC);

-- Create resource_access_history table
CREATE TABLE IF NOT EXISTS "resource_access_history" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL,
  "resource_id" INTEGER NOT NULL,
  "analysis_id" INTEGER,
  "action_plan_step_id" TEXT,
  "access_type" VARCHAR(20) NOT NULL CHECK ("access_type" IN ('view', 'download', 'external_link')),
  "accessed_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT "resource_access_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "resource_access_history_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "resource_access_history_analysis_id_searches_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "searches"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes for resource_access_history
CREATE INDEX IF NOT EXISTS "resource_access_history_user_id_idx" ON "resource_access_history" ("user_id");
CREATE INDEX IF NOT EXISTS "resource_access_history_resource_id_idx" ON "resource_access_history" ("resource_id");
CREATE INDEX IF NOT EXISTS "resource_access_history_analysis_id_idx" ON "resource_access_history" ("analysis_id");
CREATE INDEX IF NOT EXISTS "resource_access_history_accessed_at_idx" ON "resource_access_history" ("accessed_at" DESC);

-- Create resource_analytics table
CREATE TABLE IF NOT EXISTS "resource_analytics" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "resource_id" INTEGER NOT NULL,
  "date" TIMESTAMP NOT NULL,
  "view_count" INTEGER DEFAULT 0 NOT NULL,
  "unique_users" INTEGER DEFAULT 0 NOT NULL,
  "bookmark_count" INTEGER DEFAULT 0 NOT NULL,
  "download_count" INTEGER DEFAULT 0 NOT NULL,
  "external_click_count" INTEGER DEFAULT 0 NOT NULL,
  "average_time_spent_seconds" INTEGER DEFAULT 0 NOT NULL,
  CONSTRAINT "resource_analytics_resource_date_unique" UNIQUE("resource_id", "date"),
  CONSTRAINT "resource_analytics_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for resource_analytics
CREATE INDEX IF NOT EXISTS "resource_analytics_resource_id_idx" ON "resource_analytics" ("resource_id");
CREATE INDEX IF NOT EXISTS "resource_analytics_date_idx" ON "resource_analytics" ("date" DESC);
CREATE INDEX IF NOT EXISTS "resource_analytics_view_count_idx" ON "resource_analytics" ("view_count" DESC);

-- Add comments for documentation
COMMENT ON TABLE "resource_categories" IS 'Hierarchical categories for organizing resources';
COMMENT ON TABLE "resource_tags" IS 'Tags for flexible resource classification';
COMMENT ON TABLE "resources" IS 'Core resource library with tools, templates, guides, videos, and articles';
COMMENT ON TABLE "resource_tag_mappings" IS 'Many-to-many relationship between resources and tags';
COMMENT ON TABLE "user_bookmarks" IS 'User-saved resources with personal notes and custom tags';
COMMENT ON TABLE "resource_ratings" IS 'User ratings and reviews for resources';
COMMENT ON TABLE "resource_contributions" IS 'User-submitted resources pending admin review';
COMMENT ON TABLE "resource_access_history" IS 'Tracks resource access for analytics and recommendations';
COMMENT ON TABLE "resource_analytics" IS 'Daily aggregated metrics for resource performance';

