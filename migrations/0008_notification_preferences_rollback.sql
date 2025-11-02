-- Rollback notification preferences migration
DROP INDEX IF EXISTS user_preferences_notification_preferences_idx;

ALTER TABLE user_preferences 
DROP COLUMN IF EXISTS notification_preferences;
