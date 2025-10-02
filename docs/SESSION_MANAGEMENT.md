# Session Management System

This document describes the comprehensive session management system implemented for secure user authentication and session tracking.

## Overview

The session management system provides:

- **Secure JWT-based authentication** with access and refresh tokens
- **Device and IP tracking** for session security monitoring
- **Concurrent session limits** to prevent abuse
- **Automatic session invalidation** on security events
- **Session cleanup** and monitoring capabilities
- **Security event handling** for password changes, account lockouts, etc.

## Architecture

### Core Components

1. **SessionManager** (`server/services/sessionManager.ts`)
   - Central service for session lifecycle management
   - Handles session creation, validation, and cleanup
   - Enforces security policies and limits

2. **SecurityEventHandler** (`server/services/securityEventHandler.ts`)
   - Handles security-related events that require session invalidation
   - Manages password changes, account lockouts, and suspicious activity

3. **Session Middleware** (`server/middleware/sessionManagement.ts`)
   - Tracks session activity and device information
   - Monitors for suspicious behavior
   - Enforces session security policies

4. **Scheduled Tasks** (`server/services/scheduledTasks.ts`)
   - Automated session cleanup
   - Session statistics logging
   - Maintenance operations

## Features

### 1. Enhanced Session Creation

Sessions are created with comprehensive tracking:

```typescript
const sessionResult = await sessionManager.createSession(
  userId,
  deviceInfo,  // Browser, OS, device type
  ipAddress    // Client IP address
);
```

**Device Information Tracked:**
- User agent string
- Browser type (Chrome, Firefox, Safari, Edge)
- Operating system (Windows, macOS, Linux, Android, iOS)
- Device type (desktop, mobile, tablet)
- Platform details

### 2. Concurrent Session Management

**Default Limits:**
- Maximum 5 concurrent sessions per user
- Oldest sessions automatically revoked when limit exceeded
- Configurable per user or plan type

**Session Enforcement:**
```typescript
// Automatically enforced during session creation
await sessionManager.createSession(userId, deviceInfo, ipAddress, {
  maxConcurrentSessions: 3  // Custom limit
});
```

### 3. Security Event Handling

**Automatic Session Invalidation:**

- **Password Changes**: All other sessions invalidated except current
- **Account Lockout**: All sessions immediately terminated
- **Suspicious Activity**: Logged and monitored
- **Admin Actions**: Targeted or bulk session termination

**Example Usage:**
```typescript
// Password change invalidates other sessions
await securityEventHandler.handlePasswordChange({
  userId,
  currentPassword,
  newPassword,
  currentSessionId  // Keep this session active
});

// Account lockout terminates all sessions
await securityEventHandler.handleAccountLockout({
  userId,
  reason: "Too many failed login attempts",
  lockedBy: "system"
});
```

### 4. Session Monitoring

**Real-time Monitoring:**
- IP address changes detection
- Device consistency validation
- Suspicious activity logging
- Session statistics tracking

**Security Alerts:**
- IP address changes during session
- Device fingerprint mismatches
- Multiple failed login attempts
- Concurrent session limit violations

### 5. Failed Login Protection

**Account Lockout System:**
- 5 failed attempts trigger 30-minute lockout
- Progressive delays for repeated attempts
- Automatic unlock after timeout
- Admin override capabilities

**Implementation:**
```typescript
// Automatic handling in login route
if (!user) {
  await securityEventHandler.handleFailedLoginAttempt(
    email, 
    ipAddress, 
    userAgent
  );
  throw new Error('Invalid credentials');
}

// Reset on successful login
await securityEventHandler.handleSuccessfulLogin(user.id);
```

## API Endpoints

### Session Management

#### Get User Sessions
```http
GET /api/auth/sessions
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "session-id",
        "userId": 1,
        "deviceInfo": {
          "browser": "Chrome",
          "platform": "Windows",
          "deviceType": "desktop"
        },
        "ipAddress": "192.168.1.1",
        "issuedAt": "2024-01-01T00:00:00Z",
        "expiresAt": "2024-01-08T00:00:00Z",
        "isActive": true,
        "isCurrent": true
      }
    ],
    "totalSessions": 1,
    "activeSessions": 1
  }
}
```

#### Invalidate Specific Session
```http
DELETE /api/sessions/{sessionId}
Authorization: Bearer <access_token>
```

#### Invalidate All Other Sessions
```http
POST /api/sessions/invalidate-others
Authorization: Bearer <access_token>
```

#### Logout from All Devices
```http
POST /api/auth/logout-all
Authorization: Bearer <access_token>
```

### Security Management

#### Change Password
```http
POST /api/security/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentPassword": "current123",
  "newPassword": "newPassword123",
  "confirmPassword": "newPassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "invalidatedSessions": 2,
    "message": "Password changed successfully. 2 other sessions have been logged out."
  }
}
```

#### Check Account Status
```http
GET /api/security/my-account-status
Authorization: Bearer <access_token>
```

### Admin Endpoints

#### Lock User Account
```http
POST /api/security/lock-account
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "userId": 123,
  "reason": "Suspicious activity detected"
}
```

#### Terminate User Sessions
```http
POST /api/security/terminate-sessions
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "userId": 123,
  "sessionId": "optional-specific-session",
  "reason": "Admin investigation"
}
```

## Database Schema

### Enhanced Users Table

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS
  failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
  last_failed_login TIMESTAMP,
  account_locked BOOLEAN DEFAULT FALSE NOT NULL,
  lockout_expires TIMESTAMP;
```

### JWT Tokens Table

```sql
CREATE TABLE jwt_tokens (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token_type TEXT NOT NULL, -- 'access' | 'refresh'
  issued_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE NOT NULL,
  revoked_at TIMESTAMP,
  revoked_by TEXT,
  device_info TEXT, -- JSON string
  ip_address TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Configuration

### Environment Variables

```env
# JWT Configuration
JWT_ACCESS_SECRET=your-access-token-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-token-secret-min-32-chars

# Session Configuration (optional)
MAX_CONCURRENT_SESSIONS=5
SESSION_TIMEOUT_MINUTES=15
REFRESH_TOKEN_EXPIRY_DAYS=7

# Security Configuration
MAX_FAILED_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30
```

### Default Limits

```typescript
const defaultLimits = {
  maxConcurrentSessions: 5,
  sessionTimeoutMinutes: 15,
  refreshTokenExpiryDays: 7
};
```

## Monitoring and Maintenance

### Scheduled Tasks

**Session Cleanup:**
- Runs every 30 minutes
- Removes expired tokens from database
- Updates session statistics

**Statistics Logging:**
- Runs every hour
- Logs active session counts
- Tracks user engagement metrics

### Manual Operations

```typescript
// Manual session cleanup
const cleanedCount = await scheduledTaskService.runSessionCleanup();

// Get current statistics
const stats = await scheduledTaskService.getSessionStats();

// Force session invalidation
await sessionManager.invalidateAllUserSessions(userId, 'admin_action');
```

### Monitoring Metrics

- Total active sessions
- Average sessions per user
- Expired sessions per day
- Failed login attempts
- Account lockout events
- Security event frequency

## Security Considerations

### Best Practices

1. **Token Security:**
   - Access tokens expire in 15 minutes
   - Refresh tokens expire in 7 days
   - Tokens stored securely in database
   - Automatic cleanup of expired tokens

2. **Session Validation:**
   - IP address monitoring
   - Device fingerprint validation
   - Concurrent session limits
   - Fresh authentication for sensitive operations

3. **Event Logging:**
   - All security events logged
   - Suspicious activity monitoring
   - Admin action audit trail
   - Failed login attempt tracking

4. **Account Protection:**
   - Progressive lockout system
   - Automatic unlock after timeout
   - Admin override capabilities
   - Password change session invalidation

### Security Headers

```typescript
// Refresh token cookie configuration
res.cookie('refreshToken', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});
```

## Testing

### Unit Tests

Run session management tests:
```bash
npm test server/services/__tests__/sessionManager.test.ts
```

### Integration Tests

Test complete authentication flows:
```bash
npm test -- --grep "session management"
```

### Manual Testing

1. **Multiple Device Login:**
   - Login from different browsers/devices
   - Verify session tracking
   - Test concurrent limits

2. **Security Events:**
   - Change password and verify other sessions invalidated
   - Test account lockout after failed attempts
   - Verify IP change detection

3. **Session Cleanup:**
   - Wait for tokens to expire
   - Verify automatic cleanup
   - Check statistics logging

## Troubleshooting

### Common Issues

1. **Sessions Not Invalidating:**
   - Check JWT token blacklist
   - Verify database connectivity
   - Review error logs

2. **Account Lockout Issues:**
   - Check failed attempt counters
   - Verify lockout expiration times
   - Review security event logs

3. **Device Detection Problems:**
   - Verify User-Agent parsing
   - Check device info storage
   - Review parsing logic

### Debug Commands

```typescript
// Check user sessions
const sessions = await sessionManager.getUserSessions(userId);

// Verify account status
const isLocked = await securityEventHandler.isAccountLocked(userId);

// Get session statistics
const stats = await sessionManager.getSessionStats();

// Manual cleanup
const cleaned = await sessionManager.cleanupExpiredSessions();
```

## Migration Guide

### From Simple Sessions

1. **Run Migration Script:**
   ```bash
   psql -d your_database -f server/scripts/migrate-session-security.sql
   ```

2. **Update Environment:**
   - Add JWT secrets
   - Configure session limits
   - Set security parameters

3. **Deploy Changes:**
   - Update application code
   - Restart services
   - Monitor session creation

### Backward Compatibility

The system maintains compatibility with existing sessions while adding enhanced features. Existing users will be migrated to the new system on their next login.

## Performance Considerations

### Database Optimization

- Indexes on frequently queried fields
- Automatic cleanup of expired tokens
- Efficient session lookup queries
- Batch operations for bulk updates

### Memory Usage

- Minimal in-memory caching
- Database-backed session storage
- Efficient token validation
- Cleanup of unused resources

### Scalability

- Horizontal scaling support
- Database connection pooling
- Async operation handling
- Rate limiting protection

This session management system provides enterprise-grade security while maintaining excellent user experience and system performance.