CREATE TABLE "activity_feed" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer,
	"idea_id" integer,
	"user_id" text NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"action" varchar(50) NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"entity_type" varchar(50),
	"entity_id" integer
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"idea_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"parent_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_resolved" boolean DEFAULT false,
	"reactions" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "idea_shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"idea_id" integer NOT NULL,
	"team_id" integer,
	"shared_with" text,
	"shared_by" text NOT NULL,
	"permissions" jsonb DEFAULT '{"canEdit":false,"canComment":true,"canShare":false}'::jsonb,
	"shared_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ideas" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"target_market" text NOT NULL,
	"business_model" text NOT NULL,
	"category" text NOT NULL,
	"originality_score" integer DEFAULT 0 NOT NULL,
	"credibility_score" integer DEFAULT 0 NOT NULL,
	"market_gap_score" integer DEFAULT 0 NOT NULL,
	"competition_score" integer DEFAULT 0 NOT NULL,
	"overall_score" integer DEFAULT 0 NOT NULL,
	"initial_investment" integer DEFAULT 0,
	"monthly_revenue" integer DEFAULT 0,
	"monthly_expenses" integer DEFAULT 0,
	"break_even_months" integer DEFAULT 0,
	"projected_roi" integer DEFAULT 0,
	"financial_projections" jsonb,
	"source_search_result_id" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jwt_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_type" text NOT NULL,
	"issued_at" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp,
	"revoked_by" text,
	"device_info" text,
	"ip_address" text
);
--> statement-breakpoint
CREATE TABLE "password_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"replaced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"search_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"feasibility" text NOT NULL,
	"market_potential" text NOT NULL,
	"innovation_score" integer NOT NULL,
	"market_size" text NOT NULL,
	"gap_reason" text NOT NULL,
	"is_saved" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "searches" (
	"id" serial PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"results_count" integer DEFAULT 0 NOT NULL,
	"user_id" integer
);
--> statement-breakpoint
CREATE TABLE "security_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"alert_type" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"user_id" integer,
	"ip_address" text,
	"description" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_by" integer,
	"resolved_at" timestamp,
	"resolution_notes" text,
	"notifications_sent" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"event_type" text NOT NULL,
	"user_id" integer,
	"user_email" text,
	"ip_address" text,
	"user_agent" text,
	"action" text NOT NULL,
	"resource" text,
	"resource_id" text,
	"success" boolean NOT NULL,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"severity" text DEFAULT 'info' NOT NULL,
	"session_id" text,
	"request_id" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sid" text PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"invited_by" text,
	"status" varchar(50) DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"owner_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"plan" varchar(50) DEFAULT 'free'
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text,
	"name" text,
	"plan" text DEFAULT 'free' NOT NULL,
	"search_count" integer DEFAULT 0 NOT NULL,
	"last_reset_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"subscription_status" text DEFAULT 'inactive',
	"trial_used" boolean DEFAULT false NOT NULL,
	"trial_expiration" timestamp,
	"preferences" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"avatar" text,
	"provider" text DEFAULT 'local' NOT NULL,
	"provider_id" text,
	"first_name" text,
	"last_name" text,
	"profile_image_url" text,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"last_failed_login" timestamp,
	"account_locked" boolean DEFAULT false NOT NULL,
	"lockout_expires" timestamp,
	"last_password_change" timestamp DEFAULT now(),
	"password_expiry_warning_sent" boolean DEFAULT false NOT NULL,
	"force_password_change" boolean DEFAULT false NOT NULL,
	"password_strength_score" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "activity_feed" ADD CONSTRAINT "activity_feed_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_feed" ADD CONSTRAINT "activity_feed_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_shares" ADD CONSTRAINT "idea_shares_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_shares" ADD CONSTRAINT "idea_shares_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_source_search_result_id_search_results_id_fk" FOREIGN KEY ("source_search_result_id") REFERENCES "public"."search_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jwt_tokens" ADD CONSTRAINT "jwt_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_history" ADD CONSTRAINT "password_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_results" ADD CONSTRAINT "search_results_search_id_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."searches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "searches" ADD CONSTRAINT "searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_alerts" ADD CONSTRAINT "security_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_alerts" ADD CONSTRAINT "security_alerts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_audit_logs" ADD CONSTRAINT "security_audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comments_parent_id_idx" ON "comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "jwt_tokens_user_id_idx" ON "jwt_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "jwt_tokens_expires_at_idx" ON "jwt_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "password_history_user_id_idx" ON "password_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_history_created_at_idx" ON "password_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "password_history_user_created_idx" ON "password_history" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "security_alerts_timestamp_idx" ON "security_alerts" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "security_alerts_alert_type_idx" ON "security_alerts" USING btree ("alert_type");--> statement-breakpoint
CREATE INDEX "security_alerts_severity_idx" ON "security_alerts" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "security_alerts_status_idx" ON "security_alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "security_audit_logs_timestamp_idx" ON "security_audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "security_audit_logs_event_type_idx" ON "security_audit_logs" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "security_audit_logs_user_id_idx" ON "security_audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "security_audit_logs_ip_address_idx" ON "security_audit_logs" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "security_audit_logs_severity_idx" ON "security_audit_logs" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "session" USING btree ("expire" timestamp_ops);