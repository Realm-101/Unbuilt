-- Rollback Migration: Interactive AI Conversations
-- Description: Remove conversation tables and related structures

-- Drop tables in reverse order (respecting foreign key dependencies)
DROP TABLE IF EXISTS "conversation_analytics" CASCADE;
DROP TABLE IF EXISTS "suggested_questions" CASCADE;
DROP TABLE IF EXISTS "conversation_messages" CASCADE;
DROP TABLE IF EXISTS "conversations" CASCADE;

-- Note: Indexes are automatically dropped when tables are dropped
