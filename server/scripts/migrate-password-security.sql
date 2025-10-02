-- Migration script for password security enhancements
-- This script adds password history tracking and security fields

-- Create password history table
CREATE TABLE IF NOT EXISTS password_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    replaced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for password history
CREATE INDEX IF NOT EXISTS password_history_user_id_idx ON password_history(user_id);
CREATE INDEX IF NOT EXISTS password_history_created_at_idx ON password_history(created_at);

-- Add password security fields to users table if they don't exist
DO $$ 
BEGIN
    -- Add last password change timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_password_change') THEN
        ALTER TABLE users ADD COLUMN last_password_change TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    -- Add password expiration warning sent flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_expiry_warning_sent') THEN
        ALTER TABLE users ADD COLUMN password_expiry_warning_sent BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add force password change flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'force_password_change') THEN
        ALTER TABLE users ADD COLUMN force_password_change BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add password strength score
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_strength_score') THEN
        ALTER TABLE users ADD COLUMN password_strength_score INTEGER DEFAULT 0;
    END IF;
END $$;

-- Update existing users to have last_password_change set to their created_at date
UPDATE users 
SET last_password_change = created_at 
WHERE last_password_change IS NULL AND created_at IS NOT NULL;

-- Create function to automatically track password changes
CREATE OR REPLACE FUNCTION track_password_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only track if password actually changed
    IF OLD.password IS DISTINCT FROM NEW.password AND NEW.password IS NOT NULL THEN
        -- Insert old password into history (if it exists)
        IF OLD.password IS NOT NULL THEN
            INSERT INTO password_history (user_id, password_hash, created_at, replaced_at)
            VALUES (OLD.id, OLD.password, OLD.last_password_change, CURRENT_TIMESTAMP);
        END IF;
        
        -- Update last password change timestamp
        NEW.last_password_change = CURRENT_TIMESTAMP;
        NEW.password_expiry_warning_sent = FALSE;
        NEW.force_password_change = FALSE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for password change tracking
DROP TRIGGER IF EXISTS password_change_trigger ON users;
CREATE TRIGGER password_change_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION track_password_change();

-- Create function to clean up old password history (keep last 5 passwords per user)
CREATE OR REPLACE FUNCTION cleanup_password_history()
RETURNS void AS $$
BEGIN
    DELETE FROM password_history
    WHERE id NOT IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
            FROM password_history
        ) ranked
        WHERE rn <= 5
    );
END;
$$ LANGUAGE plpgsql;

-- Create index for efficient password history cleanup
CREATE INDEX IF NOT EXISTS password_history_user_created_idx ON password_history(user_id, created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE password_history IS 'Stores password history for users to prevent password reuse';
COMMENT ON COLUMN password_history.user_id IS 'Reference to the user who owns this password history';
COMMENT ON COLUMN password_history.password_hash IS 'Hashed password that was previously used';
COMMENT ON COLUMN password_history.created_at IS 'When this password was originally set';
COMMENT ON COLUMN password_history.replaced_at IS 'When this password was replaced with a new one';

COMMENT ON COLUMN users.last_password_change IS 'Timestamp of when the password was last changed';
COMMENT ON COLUMN users.password_expiry_warning_sent IS 'Whether password expiry warning has been sent';
COMMENT ON COLUMN users.force_password_change IS 'Whether user must change password on next login';
COMMENT ON COLUMN users.password_strength_score IS 'Calculated strength score of current password (0-100)';

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON password_history TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE password_history_id_seq TO your_app_user;