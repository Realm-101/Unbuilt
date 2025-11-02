-- Migration: Interactive AI Conversations
-- Description: Add tables for conversation management, messages, suggested questions, and analytics
-- Requirements: 1.7, 5.1, 5.2

-- Create conversations table
CREATE TABLE IF NOT EXISTS "conversations" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "analysis_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "variant_ids" JSONB DEFAULT '[]'::jsonb NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT "conversations_analysis_user_unique" UNIQUE("analysis_id", "user_id"),
  CONSTRAINT "conversations_analysis_id_searches_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "searches"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for conversations
CREATE INDEX IF NOT EXISTS "conversations_analysis_id_idx" ON "conversations" ("analysis_id");
CREATE INDEX IF NOT EXISTS "conversations_user_id_idx" ON "conversations" ("user_id");
CREATE INDEX IF NOT EXISTS "conversations_updated_at_idx" ON "conversations" ("updated_at" DESC);

-- Create conversation_messages table
CREATE TABLE IF NOT EXISTS "conversation_messages" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "conversation_id" INTEGER NOT NULL,
  "role" VARCHAR(20) NOT NULL CHECK ("role" IN ('user', 'assistant')),
  "content" TEXT NOT NULL,
  "metadata" JSONB DEFAULT '{}'::jsonb NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "edited_at" TIMESTAMP,
  CONSTRAINT "conversation_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for conversation_messages
CREATE INDEX IF NOT EXISTS "conversation_messages_conversation_id_idx" ON "conversation_messages" ("conversation_id");
CREATE INDEX IF NOT EXISTS "conversation_messages_created_at_idx" ON "conversation_messages" ("created_at");
CREATE INDEX IF NOT EXISTS "conversation_messages_role_idx" ON "conversation_messages" ("role");

-- Create suggested_questions table
CREATE TABLE IF NOT EXISTS "suggested_questions" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "conversation_id" INTEGER NOT NULL,
  "question_text" TEXT NOT NULL,
  "category" VARCHAR(50) NOT NULL CHECK ("category" IN ('market_validation', 'competitive_analysis', 'execution_strategy', 'risk_assessment')),
  "priority" INTEGER DEFAULT 0 NOT NULL,
  "used" BOOLEAN DEFAULT FALSE NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT "suggested_questions_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for suggested_questions
CREATE INDEX IF NOT EXISTS "suggested_questions_conversation_id_idx" ON "suggested_questions" ("conversation_id");
CREATE INDEX IF NOT EXISTS "suggested_questions_category_idx" ON "suggested_questions" ("category");
CREATE INDEX IF NOT EXISTS "suggested_questions_priority_idx" ON "suggested_questions" ("priority" DESC);
CREATE INDEX IF NOT EXISTS "suggested_questions_used_idx" ON "suggested_questions" ("used");

-- Create conversation_analytics table
CREATE TABLE IF NOT EXISTS "conversation_analytics" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "conversation_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "message_count" INTEGER DEFAULT 0 NOT NULL,
  "total_tokens_used" INTEGER DEFAULT 0 NOT NULL,
  "avg_response_time" INTEGER DEFAULT 0 NOT NULL,
  "user_satisfaction" INTEGER CHECK ("user_satisfaction" >= 1 AND "user_satisfaction" <= 5),
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT "conversation_analytics_conversation_unique" UNIQUE("conversation_id"),
  CONSTRAINT "conversation_analytics_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "conversation_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for conversation_analytics
CREATE INDEX IF NOT EXISTS "conversation_analytics_user_id_idx" ON "conversation_analytics" ("user_id");
CREATE INDEX IF NOT EXISTS "conversation_analytics_message_count_idx" ON "conversation_analytics" ("message_count" DESC);
CREATE INDEX IF NOT EXISTS "conversation_analytics_total_tokens_idx" ON "conversation_analytics" ("total_tokens_used" DESC);

-- Add comment for documentation
COMMENT ON TABLE "conversations" IS 'Stores conversation threads linked to gap analyses';
COMMENT ON TABLE "conversation_messages" IS 'Stores individual messages in conversations between users and AI';
COMMENT ON TABLE "suggested_questions" IS 'Stores AI-generated suggested follow-up questions';
COMMENT ON TABLE "conversation_analytics" IS 'Tracks metrics and analytics for conversations';
