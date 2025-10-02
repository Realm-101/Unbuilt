# Security Database Migration Scripts

This directory contains scripts for implementing comprehensive security enhancements to the database schema. These scripts are part of the security hardening implementation plan.

## Overview

The security migration adds the following enhancements:

### 1. Enhanced User Security Fields
- **Account Lockout**: Failed login attempt tracking and automatic account locking
- **Password Security**: Password history, strength scoring, and expiration management
- **Session Management**: Enhanced session tracking and security

### 2. JWT Token Management
- **Token Storage**: Secure JWT token storage and blacklisting
- **Token Lifecycle**: Proper token expiration and revocation handling
- **Device Tracking**: Track tokens by device and IP address

### 3. Security Audit Logging
- **Comprehensive Logging**: All security events are logged with full context
- **Event Classification**: Different event types and severity levels
- **Audit Trail**: Complete audit trail for compliance and monitoring

### 4. Security Alerts System
- **Automated Alerts**: System-generated security alerts for suspicious activity
- **Alert Management**: Alert status tracking and resolution workflow
- **Notification System**: Alert notification and escalation

### 5. Password History Tracking
- **Password Reuse Prevention**: Track previous passwords to prevent reuse
- **History Management**: Automatic cleanup of old password history
- **Security Compliance**: Meet password policy requirements

## Files

### Migration Scripts

#### `migrate-comprehensive-security.sql`
The main migration script that applies all security enhancements:
- Creates all security tables
- Adds security columns to existing tables
- Creates indexes for performance
- Sets up database functions and triggers
- Creates monitoring views
- Adds proper constraints and validations

#### `runSecurityMigration.ts`
TypeScript script to execute the migration programmatically:
- Executes the SQL migration
- Validates the migration results
- Provides detailed feedback and metrics
- Can be integrated into application startup

#### `validateSecuritySchema.ts`
Comprehensive validation script that checks:
- All required tables exist
- All required columns exist
- All indexes are created
- All functions work correctly
- All views are accessible

### Individual Migration Scripts (Legacy)
These scripts handle specific aspects of the security migration:
- `migrate-session-security.sql` - Session management fields
- `migrate-security-logging.sql` - Audit logging tables
- `migrate-password-security.sql` - Password security features

## Usage

### Running the Migration

#### Option 1: Using npm scripts (Recommended)
```bash
# Run the complete security migration
npm run migrate:security

# Validate the migration was successful
npm run validate:security

# Run periodic maintenance
npm run security:maintenance
```

#### Option 2: Direct execution
```bash
# Run migration
tsx server/scripts/runSecurityMigration.ts

# Validate schema
tsx server/scripts/validateSecuritySchema.ts
```

#### Option 3: SQL directly
```bash
# Connect to your database and run:
psql -d your_database -f server/scripts/migrate-comprehensive-security.sql
```

### Validation

After running the migration, validate that everything was applied correctly:

```bash
npm run validate:security
```

This will check:
- ✅ All required tables exist
- ✅ All required columns exist  
- ✅ All indexes are created
- ✅ All functions work correctly
- ✅ All views are accessible

### Maintenance

Run periodic maintenance to clean up old data:

```bash
npm run security:maintenance
```

This will:
- Clean up expired JWT tokens
- Remove old password history (keeps last 5 per user)
- Archive old audit logs (older than 2 years)

## Database Schema Changes

### New Tables

#### `jwt_tokens`
Stores JWT tokens for management and blacklisting:
```sql
CREATE TABLE jwt_tokens (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token_type TEXT NOT NULL, -- 'access' | 'refresh'
    issued_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP,
    revoked_by TEXT,
    device_info TEXT,
    ip_address TEXT
);
```

#### `security_audit_logs`
Comprehensive security event logging:
```sql
CREATE TABLE security_audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    event_type TEXT NOT NULL,
    user_id INTEGER,
    user_email TEXT,
    ip_address TEXT,
    user_agent TEXT,
    action TEXT NOT NULL,
    resource TEXT,
    resource_id TEXT,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    severity TEXT DEFAULT 'info',
    session_id TEXT,
    request_id TEXT
);
```

#### `security_alerts`
Automated security alert management:
```sql
CREATE TABLE security_alerts (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    alert_type TEXT NOT NULL,
    severity TEXT DEFAULT 'medium',
    user_id INTEGER,
    ip_address TEXT,
    description TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    status TEXT DEFAULT 'open',
    resolved_by INTEGER,
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    notifications_sent BOOLEAN DEFAULT FALSE
);
```

#### `password_history`
Password history tracking:
```sql
CREATE TABLE password_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    replaced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Enhanced Users Table

New security columns added to the `users` table:
- `failed_login_attempts` - Track failed login attempts
- `last_failed_login` - Timestamp of last failed login
- `account_locked` - Account lockout status
- `lockout_expires` - When lockout expires
- `last_password_change` - Password change tracking
- `password_expiry_warning_sent` - Warning notification status
- `force_password_change` - Force password change flag
- `password_strength_score` - Password strength score (0-100)

### Database Functions

#### `track_password_change()`
Automatically triggered when passwords change:
- Stores old password in history
- Updates password change timestamp
- Resets security flags
- Unlocks account on password change

#### `cleanup_expired_jwt_tokens()`
Maintenance function to remove expired tokens:
```sql
SELECT cleanup_expired_jwt_tokens();
```

#### `cleanup_password_history()`
Keeps only the last 5 passwords per user:
```sql
SELECT cleanup_password_history();
```

#### `cleanup_old_audit_logs()`
Removes audit logs older than 2 years:
```sql
SELECT cleanup_old_audit_logs();
```

#### `get_security_metrics(hours_back)`
Returns security metrics for monitoring:
```sql
SELECT * FROM get_security_metrics(24); -- Last 24 hours
```

### Monitoring Views

#### `recent_security_events`
Shows security events from the last 24 hours:
```sql
SELECT * FROM recent_security_events;
```

#### `active_security_alerts`
Shows currently active security alerts:
```sql
SELECT * FROM active_security_alerts;
```

#### `locked_accounts`
Shows currently locked user accounts:
```sql
SELECT * FROM locked_accounts;
```

## Security Monitoring

### Key Metrics to Monitor

1. **Authentication Metrics**
   - Failed login attempts
   - Successful logins
   - Account lockouts
   - Password changes

2. **Security Events**
   - Suspicious login attempts
   - Rate limiting triggers
   - Token revocations
   - Permission violations

3. **System Health**
   - Active security alerts
   - Expired tokens
   - Locked accounts
   - Audit log growth

### Monitoring Queries

```sql
-- Get security overview
SELECT * FROM get_security_metrics(24);

-- Check active alerts
SELECT * FROM active_security_alerts;

-- Recent suspicious activity
SELECT * FROM recent_security_events 
WHERE event_type IN ('SUSPICIOUS_LOGIN', 'BRUTE_FORCE_ATTEMPT', 'RATE_LIMIT_EXCEEDED');

-- Account security status
SELECT 
    email,
    failed_login_attempts,
    account_locked,
    lockout_expires,
    last_password_change
FROM users 
WHERE account_locked = TRUE OR failed_login_attempts > 3;
```

## Troubleshooting

### Common Issues

#### Migration Fails
1. Check database permissions
2. Ensure database is accessible
3. Verify no conflicting table names
4. Check for syntax errors in custom modifications

#### Validation Fails
1. Run migration again
2. Check database connection
3. Verify user permissions
4. Review error messages for specific issues

#### Performance Issues
1. Ensure all indexes are created
2. Run `ANALYZE` on new tables
3. Monitor query performance
4. Consider partitioning for large audit logs

### Getting Help

1. Check the validation output for specific issues
2. Review database logs for errors
3. Ensure all dependencies are installed
4. Verify database user has necessary permissions

## Security Best Practices

### After Migration

1. **Configure Monitoring**
   - Set up alerts for security events
   - Monitor failed login attempts
   - Track suspicious activities

2. **Set Security Policies**
   - Configure account lockout thresholds
   - Set password expiration policies
   - Define alert escalation procedures

3. **Regular Maintenance**
   - Run cleanup functions regularly
   - Monitor audit log growth
   - Review security metrics

4. **Testing**
   - Test authentication flows
   - Verify security controls work
   - Validate monitoring and alerting

### Compliance Considerations

- **Audit Logs**: Retained for 2 years minimum
- **Password History**: Prevents reuse of last 5 passwords
- **Account Lockout**: Automatic protection against brute force
- **Event Tracking**: Comprehensive audit trail for compliance

## Integration with Application

After running the migration, update your application code to:

1. Use the new security fields in authentication logic
2. Implement JWT token management with the new table
3. Add security event logging throughout the application
4. Set up monitoring dashboards using the new views
5. Implement alert handling for security events

The migration provides the database foundation - application code changes are needed to fully utilize these security features.