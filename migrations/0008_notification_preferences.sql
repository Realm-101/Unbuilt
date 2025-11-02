-- Add notification preferences to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "resourceNotifications": true,
  "frequency": "weekly",
  "categories": [],
  "contributionUpdates": true
}'::jsonb NOT NULL;

-- Create index for faster queries on notification preferences
CREATE INDEX IF NOT EXISTS user_preferences_notification_preferences_idx 
ON user_preferences USING GIN (notification_preferences);

-- Add comment for documentation
COMMENT ON COLUMN user_preferences.notification_preferences IS 'User notification preferences for resource library updates and contribution status';
