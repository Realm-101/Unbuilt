-- Comprehensive Security Database Migration Script
-- This script applies all security enhancements in the correct order
-- Run this script to ensure all security tables and fields are properly created

BEGIN;

-- ============================================================================
-- 1. Add security-related fields to users table
-- ============================================================================

-- Session management and account lockout fields
DO $$ 
BEGIN
    -- Failed login attempts tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'failed_login_attempts') THEN
        ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0 NOT NULL;
    END IF;
    
    -- Last failed login timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_failed_login') THEN
        ALTER TABLE users ADD COLUMN last_failed_login TIMESTAMP;
    END IF;
    
    -- Account locked status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'account_locked') THEN
        ALTER TABLE users ADD COLUMN account_locked BOOLEAN DEFAULT FALSE NOT NULL;
    END IF;
    
    -- Lockout expiration timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'lockout_expires') THEN
        ALTER TABLE users ADD COLUMN lockout_expires TIMESTAMP;
    END IF;
    
    -- Password security fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_password_change') THEN
        ALTER TABLE users ADD COLUMN last_password_change TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_expiry_warning_sent') THEN
        ALTER TABLE users ADD COLUMN password_expiry_warning_sent BOOLEAN DEFAULT FALSE NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'force_password_change') THEN
        ALTER TABLE users ADD COLUMN force_password_change BOOLEAN DEFAULT FALSE NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_strength_score') THEN
        ALTER TABLE users ADD COLUMN password_strength_score INTEGER DEFAULT 0 NOT NULL;
    END IF;
END $$;

-- Update existing users with default security values
UPDATE users 
SET 
    failed_login_attempts = COALESCE(failed_login_attempts, 0),
    account_locked = COALESCE(account_locked, FALSE),
    last_password_change = COALESCE(last_password_change, created_at, CURRENT_TIMESTAMP),
    password_expiry_warning_sent = COALESCE(password_expiry_warning_sent, FALSE),
    force_password_change = COALESCE(force_password_change, FALSE),
    password_strength_score = COALESCE(password_strength_score, 0);

-- ============================================================================
-- 2. Create JWT tokens table for token management and blacklisting
-- ============================================================================

CREATE TABLE IF NOT EXISTS jwt_tokens (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_type TEXT NOT NULL CHECK (token_type IN ('access', 'refresh')),
    issued_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE NOT NULL,
    revoked_at TIMESTAMP,
    revoked_by TEXT,
    device_info TEXT,
    ip_address TEXT
);

-- ============================================================================
-- 3. Create security audit log table for comprehensive event tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    event_type TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id),
    user_email TEXT,
    ip_address TEXT,
    user_agent TEXT,
    action TEXT NOT NULL,
    resource TEXT,
    resource_id TEXT,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    severity TEXT DEFAULT 'info' NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    session_id TEXT,
    request_id TEXT
);

-- ============================================================================
-- 4. Create security alerts table
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_alerts (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    alert_type TEXT NOT NULL,
    severity TEXT DEFAULT 'medium' NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    user_id INTEGER REFERENCES users(id),
    ip_address TEXT,
    description TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    status TEXT DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
    resolved_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    notifications_sent BOOLEAN DEFAULT FALSE NOT NULL
);

-- ============================================================================
-- 5. Create password history table
-- ============================================================================

CREATE TABLE IF NOT EXISTS password_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    replaced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. Create indexes for performance optimization
-- ============================================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_account_locked ON users(account_locked);
CREATE INDEX IF NOT EXISTS idx_users_lockout_expires ON users(lockout_expires);
CREATE INDEX IF NOT EXISTS idx_users_failed_login_attempts ON users(failed_login_attempts);
CREATE INDEX IF NOT EXISTS idx_users_last_password_change ON users(last_password_change);

-- JWT tokens table indexes
CREATE INDEX IF NOT EXISTS jwt_tokens_user_id_idx ON jwt_tokens(user_id);
CREATE INDEX IF NOT EXISTS jwt_tokens_expires_at_idx ON jwt_tokens(expires_at);
CREATE INDEX IF NOT EXISTS jwt_tokens_token_type_idx ON jwt_tokens(token_type);
CREATE INDEX IF NOT EXISTS jwt_tokens_is_revoked_idx ON jwt_tokens(is_revoked);

-- Security audit logs indexes
CREATE INDEX IF NOT EXISTS security_audit_logs_timestamp_idx ON security_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS security_audit_logs_event_type_idx ON security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS security_audit_logs_user_id_idx ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS security_audit_logs_ip_address_idx ON security_audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS security_audit_logs_severity_idx ON security_audit_logs(severity);
CREATE INDEX IF NOT EXISTS security_audit_logs_success_idx ON security_audit_logs(success);

-- Security alerts indexes
CREATE INDEX IF NOT EXISTS security_alerts_timestamp_idx ON security_alerts(timestamp);
CREATE INDEX IF NOT EXISTS security_alerts_alert_type_idx ON security_alerts(alert_type);
CREATE INDEX IF NOT EXISTS security_alerts_severity_idx ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS security_alerts_status_idx ON security_alerts(status);
CREATE INDEX IF NOT EXISTS security_alerts_user_id_idx ON security_alerts(user_id);

-- Password history indexes
CREATE INDEX IF NOT EXISTS password_history_user_id_idx ON password_history(user_id);
CREATE INDEX IF NOT EXISTS password_history_created_at_idx ON password_history(created_at);
CREATE INDEX IF NOT EXISTS password_history_user_created_idx ON password_history(user_id, created_at DESC);

-- ============================================================================
-- 7. Create database functions and triggers
-- ============================================================================

-- Function to automatically track password changes
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
        
        -- Update last password change timestamp and reset security flags
        NEW.last_password_change = CURRENT_TIMESTAMP;
        NEW.password_expiry_warning_sent = FALSE;
        NEW.force_password_change = FALSE;
        
        -- Reset failed login attempts on password change
        NEW.failed_login_attempts = 0;
        NEW.account_locked = FALSE;
        NEW.lockout_expires = NULL;
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

-- Function to clean up expired JWT tokens
CREATE OR REPLACE FUNCTION cleanup_expired_jwt_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM jwt_tokens 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old password history (keep last 5 passwords per user)
CREATE OR REPLACE FUNCTION cleanup_password_history()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM password_history
    WHERE id NOT IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
            FROM password_history
        ) ranked
        WHERE rn <= 5
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old audit logs (older than 2 years)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM security_audit_logs 
    WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '2 years';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. Create useful views for security monitoring
-- ============================================================================

-- View for recent security events (last 24 hours)
CREATE OR REPLACE VIEW recent_security_events AS
SELECT 
    id,
    timestamp,
    event_type,
    user_id,
    user_email,
    ip_address,
    action,
    resource,
    success,
    severity,
    error_message
FROM security_audit_logs 
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- View for active security alerts
CREATE OR REPLACE VIEW active_security_alerts AS
SELECT 
    id,
    timestamp,
    alert_type,
    severity,
    user_id,
    ip_address,
    description,
    details,
    status
FROM security_alerts 
WHERE status IN ('open', 'investigating')
ORDER BY 
    CASE severity 
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END,
    timestamp DESC;

-- View for locked accounts
CREATE OR REPLACE VIEW locked_accounts AS
SELECT 
    id,
    email,
    name,
    failed_login_attempts,
    last_failed_login,
    lockout_expires,
    created_at
FROM users 
WHERE account_locked = TRUE
ORDER BY lockout_expires DESC NULLS FIRST;

-- ============================================================================
-- 9. Create security metrics function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_security_metrics(hours_back INTEGER DEFAULT 24)
RETURNS TABLE (
    total_events BIGINT,
    failed_logins BIGINT,
    successful_logins BIGINT,
    suspicious_activities BIGINT,
    active_alerts BIGINT,
    locked_accounts BIGINT,
    unique_ips BIGINT,
    unique_users BIGINT,
    expired_tokens BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM security_audit_logs 
         WHERE timestamp >= CURRENT_TIMESTAMP - (hours_back || ' hours')::INTERVAL) as total_events,
        
        (SELECT COUNT(*) FROM security_audit_logs 
         WHERE timestamp >= CURRENT_TIMESTAMP - (hours_back || ' hours')::INTERVAL 
         AND event_type = 'AUTH_FAILURE') as failed_logins,
         
        (SELECT COUNT(*) FROM security_audit_logs 
         WHERE timestamp >= CURRENT_TIMESTAMP - (hours_back || ' hours')::INTERVAL 
         AND event_type = 'AUTH_SUCCESS') as successful_logins,
        
        (SELECT COUNT(*) FROM security_audit_logs 
         WHERE timestamp >= CURRENT_TIMESTAMP - (hours_back || ' hours')::INTERVAL 
         AND event_type IN ('SUSPICIOUS_LOGIN', 'RATE_LIMIT_EXCEEDED', 'BRUTE_FORCE_ATTEMPT')) as suspicious_activities,
        
        (SELECT COUNT(*) FROM security_alerts 
         WHERE status IN ('open', 'investigating')) as active_alerts,
         
        (SELECT COUNT(*) FROM users WHERE account_locked = TRUE) as locked_accounts,
        
        (SELECT COUNT(DISTINCT ip_address) FROM security_audit_logs 
         WHERE timestamp >= CURRENT_TIMESTAMP - (hours_back || ' hours')::INTERVAL 
         AND ip_address IS NOT NULL) as unique_ips,
        
        (SELECT COUNT(DISTINCT user_id) FROM security_audit_logs 
         WHERE timestamp >= CURRENT_TIMESTAMP - (hours_back || ' hours')::INTERVAL 
         AND user_id IS NOT NULL) as unique_users,
         
        (SELECT COUNT(*) FROM jwt_tokens 
         WHERE expires_at < CURRENT_TIMESTAMP AND is_revoked = FALSE) as expired_tokens;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. Add table comments for documentation
-- ============================================================================

COMMENT ON TABLE jwt_tokens IS 'JWT token management and blacklisting for secure authentication';
COMMENT ON TABLE security_audit_logs IS 'Comprehensive audit trail for all security-related events';
COMMENT ON TABLE security_alerts IS 'Security alerts generated by automated monitoring systems';
COMMENT ON TABLE password_history IS 'Password history tracking to prevent password reuse';

-- Column comments for users table security fields
COMMENT ON COLUMN users.failed_login_attempts IS 'Number of consecutive failed login attempts';
COMMENT ON COLUMN users.last_failed_login IS 'Timestamp of the last failed login attempt';
COMMENT ON COLUMN users.account_locked IS 'Whether the account is currently locked due to security reasons';
COMMENT ON COLUMN users.lockout_expires IS 'When the account lockout expires (NULL if not locked or permanent)';
COMMENT ON COLUMN users.last_password_change IS 'Timestamp of when the password was last changed';
COMMENT ON COLUMN users.password_expiry_warning_sent IS 'Whether password expiry warning has been sent';
COMMENT ON COLUMN users.force_password_change IS 'Whether user must change password on next login';
COMMENT ON COLUMN users.password_strength_score IS 'Calculated strength score of current password (0-100)';

-- ============================================================================
-- 11. Verify migration success
-- ============================================================================

-- Check that all required tables exist
DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    tbl_name TEXT;
BEGIN
    -- Check for required tables
    FOR tbl_name IN SELECT unnest(ARRAY['jwt_tokens', 'security_audit_logs', 'security_alerts', 'password_history']) LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE information_schema.tables.table_name = tbl_name) THEN
            missing_tables := array_append(missing_tables, tbl_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Migration failed: Missing tables: %', array_to_string(missing_tables, ', ');
    END IF;
    
    RAISE NOTICE 'Security migration completed successfully. All required tables and fields are present.';
END $$;

COMMIT;

-- ============================================================================
-- 12. Post-migration recommendations
-- ============================================================================

-- Run these commands periodically for maintenance:
-- SELECT cleanup_expired_jwt_tokens(); -- Clean up expired tokens
-- SELECT cleanup_password_history();   -- Clean up old password history
-- SELECT cleanup_old_audit_logs();     -- Clean up old audit logs

-- Monitor security with:
-- SELECT * FROM get_security_metrics(24); -- Get 24-hour security metrics
-- SELECT * FROM active_security_alerts;   -- View active alerts
-- SELECT * FROM recent_security_events;   -- View recent events
-- SELECT * FROM locked_accounts;          -- View locked accounts