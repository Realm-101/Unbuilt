-- Migration script to add session security fields to users table
-- Run this script to add the new security-related columns

-- Add security fields for session management
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS last_failed_login TIMESTAMP,
ADD COLUMN IF NOT EXISTS account_locked BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS lockout_expires TIMESTAMP;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_account_locked ON users(account_locked);
CREATE INDEX IF NOT EXISTS idx_users_lockout_expires ON users(lockout_expires);
CREATE INDEX IF NOT EXISTS idx_users_failed_login_attempts ON users(failed_login_attempts);

-- Update existing users to have default security values
UPDATE users 
SET 
  failed_login_attempts = 0,
  account_locked = FALSE
WHERE 
  failed_login_attempts IS NULL 
  OR account_locked IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.failed_login_attempts IS 'Number of consecutive failed login attempts';
COMMENT ON COLUMN users.last_failed_login IS 'Timestamp of the last failed login attempt';
COMMENT ON COLUMN users.account_locked IS 'Whether the account is currently locked due to security reasons';
COMMENT ON COLUMN users.lockout_expires IS 'When the account lockout expires (NULL if not locked or permanent)';

-- Verify the migration
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('failed_login_attempts', 'last_failed_login', 'account_locked', 'lockout_expires')
ORDER BY column_name;