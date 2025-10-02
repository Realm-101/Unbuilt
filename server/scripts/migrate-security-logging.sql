-- Migration script for security logging and monitoring tables
-- Run this script to add security audit logging capabilities

-- Create security_audit_logs table
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
    severity TEXT DEFAULT 'info' NOT NULL,
    session_id TEXT,
    request_id TEXT
);

-- Create indexes for security_audit_logs
CREATE INDEX IF NOT EXISTS security_audit_logs_timestamp_idx ON security_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS security_audit_logs_event_type_idx ON security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS security_audit_logs_user_id_idx ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS security_audit_logs_ip_address_idx ON security_audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS security_audit_logs_severity_idx ON security_audit_logs(severity);

-- Create security_alerts table
CREATE TABLE IF NOT EXISTS security_alerts (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    alert_type TEXT NOT NULL,
    severity TEXT DEFAULT 'medium' NOT NULL,
    user_id INTEGER REFERENCES users(id),
    ip_address TEXT,
    description TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    status TEXT DEFAULT 'open' NOT NULL,
    resolved_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    notifications_sent BOOLEAN DEFAULT FALSE NOT NULL
);

-- Create indexes for security_alerts
CREATE INDEX IF NOT EXISTS security_alerts_timestamp_idx ON security_alerts(timestamp);
CREATE INDEX IF NOT EXISTS security_alerts_alert_type_idx ON security_alerts(alert_type);
CREATE INDEX IF NOT EXISTS security_alerts_severity_idx ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS security_alerts_status_idx ON security_alerts(status);

-- Add constraints
ALTER TABLE security_audit_logs 
ADD CONSTRAINT security_audit_logs_severity_check 
CHECK (severity IN ('info', 'warning', 'error', 'critical'));

ALTER TABLE security_alerts 
ADD CONSTRAINT security_alerts_severity_check 
CHECK (severity IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE security_alerts 
ADD CONSTRAINT security_alerts_status_check 
CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive'));

-- Create a view for recent security events (last 24 hours)
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
WHERE timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- Create a view for active security alerts
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

-- Create a function to clean up old audit logs (older than 2 years)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM security_audit_logs 
    WHERE timestamp < NOW() - INTERVAL '2 years';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get security metrics for a time period
CREATE OR REPLACE FUNCTION get_security_metrics(hours_back INTEGER DEFAULT 24)
RETURNS TABLE (
    total_events BIGINT,
    failed_logins BIGINT,
    suspicious_activities BIGINT,
    active_alerts BIGINT,
    unique_ips BIGINT,
    unique_users BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM security_audit_logs 
         WHERE timestamp >= NOW() - (hours_back || ' hours')::INTERVAL) as total_events,
        
        (SELECT COUNT(*) FROM security_audit_logs 
         WHERE timestamp >= NOW() - (hours_back || ' hours')::INTERVAL 
         AND event_type = 'AUTH_FAILURE') as failed_logins,
        
        (SELECT COUNT(*) FROM security_audit_logs 
         WHERE timestamp >= NOW() - (hours_back || ' hours')::INTERVAL 
         AND event_type = 'SUSPICIOUS_LOGIN') as suspicious_activities,
        
        (SELECT COUNT(*) FROM security_alerts 
         WHERE status IN ('open', 'investigating')) as active_alerts,
        
        (SELECT COUNT(DISTINCT ip_address) FROM security_audit_logs 
         WHERE timestamp >= NOW() - (hours_back || ' hours')::INTERVAL 
         AND ip_address IS NOT NULL) as unique_ips,
        
        (SELECT COUNT(DISTINCT user_id) FROM security_audit_logs 
         WHERE timestamp >= NOW() - (hours_back || ' hours')::INTERVAL 
         AND user_id IS NOT NULL) as unique_users;
END;
$$ LANGUAGE plpgsql;

-- Insert some sample data for testing (remove in production)
-- INSERT INTO security_audit_logs (event_type, action, success, ip_address, user_agent, metadata)
-- VALUES 
--     ('AUTH_SUCCESS', 'login_success', true, '192.168.1.100', 'Mozilla/5.0', '{"endpoint": "/api/auth/login"}'),
--     ('AUTH_FAILURE', 'login_failure', false, '192.168.1.101', 'Mozilla/5.0', '{"endpoint": "/api/auth/login", "reason": "invalid_credentials"}'),
--     ('API_ACCESS', 'GET /api/users', true, '192.168.1.100', 'Mozilla/5.0', '{"statusCode": 200, "duration": 45}');

COMMENT ON TABLE security_audit_logs IS 'Comprehensive audit trail for all security-related events';
COMMENT ON TABLE security_alerts IS 'Security alerts generated by automated monitoring systems';
COMMENT ON VIEW recent_security_events IS 'Recent security events for quick monitoring dashboard';
COMMENT ON VIEW active_security_alerts IS 'Currently active security alerts ordered by severity';
COMMENT ON FUNCTION cleanup_old_audit_logs() IS 'Maintenance function to clean up audit logs older than 2 years';
COMMENT ON FUNCTION get_security_metrics(INTEGER) IS 'Get security metrics for dashboard display';

-- Grant appropriate permissions (adjust based on your user roles)
-- GRANT SELECT ON security_audit_logs TO security_readonly;
-- GRANT SELECT ON security_alerts TO security_readonly;
-- GRANT SELECT ON recent_security_events TO security_readonly;
-- GRANT SELECT ON active_security_alerts TO security_readonly;