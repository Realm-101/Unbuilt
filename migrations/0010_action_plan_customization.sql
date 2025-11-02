-- Migration: Action Plan Customization & Progress Tracking
-- Description: Add tables for interactive, customizable action plans with task management
-- Requirements: 1.1, 1.4, 2.1, 4.1

-- ============================================================================
-- Enum Types
-- ============================================================================

-- Plan status enum
CREATE TYPE plan_status AS ENUM ('active', 'completed', 'archived');

-- Task status enum
CREATE TYPE task_status AS ENUM ('not_started', 'in_progress', 'completed', 'skipped');

-- Task history action enum
CREATE TYPE task_history_action AS ENUM ('created', 'updated', 'completed', 'skipped', 'deleted', 'reordered');

-- ============================================================================
-- Action Plans Table
-- ============================================================================

CREATE TABLE "action_plans" (
  "id" serial PRIMARY KEY NOT NULL,
  "search_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "template_id" integer,
  "title" varchar(200) NOT NULL,
  "description" text,
  "status" plan_status DEFAULT 'active' NOT NULL,
  "original_plan" jsonb NOT NULL, -- AI-generated plan (immutable)
  "customizations" jsonb DEFAULT '{}'::jsonb NOT NULL, -- User modifications
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp,
  CONSTRAINT "action_plans_search_id_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "searches"("id") ON DELETE CASCADE,
  CONSTRAINT "action_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Indexes for action_plans
CREATE INDEX "action_plans_search_id_idx" ON "action_plans" ("search_id");
CREATE INDEX "action_plans_user_id_idx" ON "action_plans" ("user_id");
CREATE INDEX "action_plans_status_idx" ON "action_plans" ("status");
CREATE INDEX "action_plans_user_status_idx" ON "action_plans" ("user_id", "status");
CREATE INDEX "action_plans_updated_at_idx" ON "action_plans" ("updated_at" DESC);

-- Unique constraint: one active plan per search
CREATE UNIQUE INDEX "action_plans_search_unique_active" ON "action_plans" ("search_id") 
WHERE "status" = 'active';

-- ============================================================================
-- Plan Phases Table
-- ============================================================================

CREATE TABLE "plan_phases" (
  "id" serial PRIMARY KEY NOT NULL,
  "plan_id" integer NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" text,
  "order" integer NOT NULL,
  "estimated_duration" varchar(50), -- e.g., "2 weeks"
  "is_custom" boolean DEFAULT false NOT NULL, -- User-created vs AI-generated
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "plan_phases_plan_id_action_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "action_plans"("id") ON DELETE CASCADE
);

-- Indexes for plan_phases
CREATE INDEX "plan_phases_plan_id_idx" ON "plan_phases" ("plan_id");
CREATE INDEX "plan_phases_plan_order_idx" ON "plan_phases" ("plan_id", "order");

-- Unique constraint: order within plan
CREATE UNIQUE INDEX "plan_phases_plan_order_unique" ON "plan_phases" ("plan_id", "order");

-- ============================================================================
-- Plan Tasks Table
-- ============================================================================

CREATE TABLE "plan_tasks" (
  "id" serial PRIMARY KEY NOT NULL,
  "phase_id" integer NOT NULL,
  "plan_id" integer NOT NULL, -- Denormalized for faster queries
  "title" varchar(200) NOT NULL,
  "description" text,
  "estimated_time" varchar(50), -- e.g., "4 hours"
  "resources" jsonb DEFAULT '[]'::jsonb NOT NULL, -- Links to resources (string[])
  "order" integer NOT NULL,
  "status" task_status DEFAULT 'not_started' NOT NULL,
  "is_custom" boolean DEFAULT false NOT NULL, -- User-created vs AI-generated
  "assignee_id" integer, -- For team collaboration
  "completed_at" timestamp,
  "completed_by" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "plan_tasks_phase_id_plan_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "plan_phases"("id") ON DELETE CASCADE,
  CONSTRAINT "plan_tasks_plan_id_action_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "action_plans"("id") ON DELETE CASCADE,
  CONSTRAINT "plan_tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "plan_tasks_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "users"("id") ON DELETE SET NULL
);

-- Indexes for plan_tasks
CREATE INDEX "plan_tasks_phase_id_idx" ON "plan_tasks" ("phase_id");
CREATE INDEX "plan_tasks_plan_id_idx" ON "plan_tasks" ("plan_id");
CREATE INDEX "plan_tasks_status_idx" ON "plan_tasks" ("status");
CREATE INDEX "plan_tasks_plan_status_idx" ON "plan_tasks" ("plan_id", "status");
CREATE INDEX "plan_tasks_phase_order_idx" ON "plan_tasks" ("phase_id", "order");
CREATE INDEX "plan_tasks_assignee_id_idx" ON "plan_tasks" ("assignee_id");
CREATE INDEX "plan_tasks_completed_at_idx" ON "plan_tasks" ("completed_at" DESC);

-- Unique constraint: order within phase
CREATE UNIQUE INDEX "plan_tasks_phase_order_unique" ON "plan_tasks" ("phase_id", "order");

-- GIN index for resources JSONB array
CREATE INDEX "plan_tasks_resources_gin_idx" ON "plan_tasks" USING GIN ("resources" jsonb_path_ops);

-- ============================================================================
-- Task Dependencies Table
-- ============================================================================

CREATE TABLE "task_dependencies" (
  "id" serial PRIMARY KEY NOT NULL,
  "task_id" integer NOT NULL, -- Dependent task
  "prerequisite_task_id" integer NOT NULL, -- Must be completed first
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "task_dependencies_task_id_plan_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "plan_tasks"("id") ON DELETE CASCADE,
  CONSTRAINT "task_dependencies_prerequisite_task_id_plan_tasks_id_fk" FOREIGN KEY ("prerequisite_task_id") REFERENCES "plan_tasks"("id") ON DELETE CASCADE,
  CONSTRAINT "task_dependencies_no_self_reference" CHECK ("task_id" != "prerequisite_task_id")
);

-- Indexes for task_dependencies
CREATE INDEX "task_dependencies_task_id_idx" ON "task_dependencies" ("task_id");
CREATE INDEX "task_dependencies_prerequisite_task_id_idx" ON "task_dependencies" ("prerequisite_task_id");

-- Unique constraint: no duplicate dependencies
CREATE UNIQUE INDEX "task_dependencies_unique" ON "task_dependencies" ("task_id", "prerequisite_task_id");

-- ============================================================================
-- Plan Templates Table
-- ============================================================================

CREATE TABLE "plan_templates" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" text,
  "category" varchar(50) NOT NULL, -- 'software', 'physical', 'service', etc.
  "icon" varchar(50), -- Icon identifier
  "phases" jsonb NOT NULL, -- Template structure
  "is_default" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes for plan_templates
CREATE INDEX "plan_templates_category_idx" ON "plan_templates" ("category");
CREATE INDEX "plan_templates_is_active_idx" ON "plan_templates" ("is_active");
CREATE INDEX "plan_templates_is_default_idx" ON "plan_templates" ("is_default");

-- Unique constraint: template name
CREATE UNIQUE INDEX "plan_templates_name_unique" ON "plan_templates" ("name");

-- ============================================================================
-- Task History Table (Audit Trail)
-- ============================================================================

CREATE TABLE "task_history" (
  "id" serial PRIMARY KEY NOT NULL,
  "task_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "action" task_history_action NOT NULL,
  "previous_state" jsonb,
  "new_state" jsonb,
  "timestamp" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "task_history_task_id_plan_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "plan_tasks"("id") ON DELETE CASCADE,
  CONSTRAINT "task_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Indexes for task_history
CREATE INDEX "task_history_task_id_idx" ON "task_history" ("task_id");
CREATE INDEX "task_history_user_id_idx" ON "task_history" ("user_id");
CREATE INDEX "task_history_timestamp_idx" ON "task_history" ("timestamp" DESC);
CREATE INDEX "task_history_task_timestamp_idx" ON "task_history" ("task_id", "timestamp" DESC);

-- ============================================================================
-- Progress Snapshots Table (Analytics)
-- ============================================================================

CREATE TABLE "progress_snapshots" (
  "id" serial PRIMARY KEY NOT NULL,
  "plan_id" integer NOT NULL,
  "total_tasks" integer NOT NULL,
  "completed_tasks" integer NOT NULL,
  "in_progress_tasks" integer NOT NULL,
  "skipped_tasks" integer NOT NULL,
  "completion_percentage" integer NOT NULL, -- 0-100
  "average_task_time" integer, -- In hours
  "velocity" numeric(10, 2), -- Tasks per week
  "timestamp" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "progress_snapshots_plan_id_action_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "action_plans"("id") ON DELETE CASCADE
);

-- Indexes for progress_snapshots
CREATE INDEX "progress_snapshots_plan_id_idx" ON "progress_snapshots" ("plan_id");
CREATE INDEX "progress_snapshots_timestamp_idx" ON "progress_snapshots" ("timestamp" DESC);
CREATE INDEX "progress_snapshots_plan_timestamp_idx" ON "progress_snapshots" ("plan_id", "timestamp" DESC);

-- ============================================================================
-- Foreign Key for Template Reference
-- ============================================================================

ALTER TABLE "action_plans" 
ADD CONSTRAINT "action_plans_template_id_plan_templates_id_fk" 
FOREIGN KEY ("template_id") REFERENCES "plan_templates"("id") ON DELETE SET NULL;

CREATE INDEX "action_plans_template_id_idx" ON "action_plans" ("template_id");

-- ============================================================================
-- Triggers for Automatic Timestamp Updates
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Trigger for action_plans
CREATE TRIGGER update_action_plans_updated_at
BEFORE UPDATE ON "action_plans"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for plan_phases
CREATE TRIGGER update_plan_phases_updated_at
BEFORE UPDATE ON "plan_phases"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for plan_tasks
CREATE TRIGGER update_plan_tasks_updated_at
BEFORE UPDATE ON "plan_tasks"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for plan_templates
CREATE TRIGGER update_plan_templates_updated_at
BEFORE UPDATE ON "plan_templates"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function to Calculate Plan Progress
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_plan_progress(p_plan_id integer)
RETURNS TABLE (
  total_tasks integer,
  completed_tasks integer,
  in_progress_tasks integer,
  skipped_tasks integer,
  completion_percentage integer
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::integer AS total_tasks,
    COUNT(*) FILTER (WHERE status = 'completed')::integer AS completed_tasks,
    COUNT(*) FILTER (WHERE status = 'in_progress')::integer AS in_progress_tasks,
    COUNT(*) FILTER (WHERE status = 'skipped')::integer AS skipped_tasks,
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*)::numeric) * 100)::integer
    END AS completion_percentage
  FROM plan_tasks
  WHERE plan_id = p_plan_id;
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- Function to Create Progress Snapshot
-- ============================================================================

CREATE OR REPLACE FUNCTION create_progress_snapshot(p_plan_id integer)
RETURNS void AS $
DECLARE
  v_progress RECORD;
  v_avg_time integer;
  v_velocity numeric(10, 2);
BEGIN
  -- Get current progress
  SELECT * INTO v_progress FROM calculate_plan_progress(p_plan_id);
  
  -- Calculate average task completion time (in hours)
  SELECT 
    COALESCE(
      AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600)::integer,
      0
    ) INTO v_avg_time
  FROM plan_tasks
  WHERE plan_id = p_plan_id AND status = 'completed' AND completed_at IS NOT NULL;
  
  -- Calculate velocity (tasks per week)
  SELECT 
    COALESCE(
      (COUNT(*) FILTER (WHERE completed_at >= now() - INTERVAL '7 days')::numeric / 7) * 7,
      0
    ) INTO v_velocity
  FROM plan_tasks
  WHERE plan_id = p_plan_id AND status = 'completed';
  
  -- Insert snapshot
  INSERT INTO progress_snapshots (
    plan_id,
    total_tasks,
    completed_tasks,
    in_progress_tasks,
    skipped_tasks,
    completion_percentage,
    average_task_time,
    velocity
  ) VALUES (
    p_plan_id,
    v_progress.total_tasks,
    v_progress.completed_tasks,
    v_progress.in_progress_tasks,
    v_progress.skipped_tasks,
    v_progress.completion_percentage,
    v_avg_time,
    v_velocity
  );
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- Trigger to Create Task History on Changes
-- ============================================================================

CREATE OR REPLACE FUNCTION create_task_history()
RETURNS TRIGGER AS $
DECLARE
  v_action task_history_action;
  v_user_id integer;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      IF NEW.status = 'completed' THEN
        v_action := 'completed';
      ELSIF NEW.status = 'skipped' THEN
        v_action := 'skipped';
      ELSE
        v_action := 'updated';
      END IF;
    ELSIF OLD.order != NEW.order THEN
      v_action := 'reordered';
    ELSE
      v_action := 'updated';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
  END IF;
  
  -- Get user_id from completed_by or assignee_id
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.completed_by;
  ELSE
    v_user_id := COALESCE(NEW.completed_by, NEW.assignee_id);
  END IF;
  
  -- Insert history record
  IF v_user_id IS NOT NULL THEN
    INSERT INTO task_history (
      task_id,
      user_id,
      action,
      previous_state,
      new_state
    ) VALUES (
      COALESCE(NEW.id, OLD.id),
      v_user_id,
      v_action,
      CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) ELSE NULL END,
      CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$ LANGUAGE plpgsql;

-- Trigger for task history
CREATE TRIGGER create_task_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON "plan_tasks"
FOR EACH ROW
EXECUTE FUNCTION create_task_history();

-- ============================================================================
-- Statistics and Comments
-- ============================================================================

-- Update statistics for query planning
ANALYZE action_plans;
ANALYZE plan_phases;
ANALYZE plan_tasks;
ANALYZE task_dependencies;
ANALYZE plan_templates;
ANALYZE task_history;
ANALYZE progress_snapshots;

-- Add comments for documentation
COMMENT ON TABLE "action_plans" IS 'Interactive, customizable action plans for executing identified opportunities';
COMMENT ON TABLE "plan_phases" IS 'Major stages within an action plan (e.g., Research, Prototype, Marketing, Launch)';
COMMENT ON TABLE "plan_tasks" IS 'Individual actionable steps within plan phases';
COMMENT ON TABLE "task_dependencies" IS 'Prerequisites and dependencies between tasks';
COMMENT ON TABLE "plan_templates" IS 'Pre-configured action plan structures for specific project types';
COMMENT ON TABLE "task_history" IS 'Audit trail of all task modifications';
COMMENT ON TABLE "progress_snapshots" IS 'Historical progress metrics for analytics and tracking';

COMMENT ON COLUMN "action_plans"."original_plan" IS 'Immutable AI-generated plan for reference';
COMMENT ON COLUMN "action_plans"."customizations" IS 'User modifications to the original plan';
COMMENT ON COLUMN "plan_tasks"."resources" IS 'Array of resource links (URLs or IDs)';
COMMENT ON COLUMN "progress_snapshots"."velocity" IS 'Tasks completed per week';
COMMENT ON COLUMN "progress_snapshots"."average_task_time" IS 'Average time to complete a task in hours';

