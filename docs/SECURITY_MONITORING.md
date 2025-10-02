# Security Monitoring and Logging System

This document describes the comprehensive security monitoring and logging system implemented for the application.

## Overview

The security monitoring system provides:
- **Comprehensive audit logging** for all security-related events
- **Real-time security alerts** for suspicious activities
- **Security dashboard** for monitoring and analysis
- **Automated threat detection** and response
- **API endpoints** for security data access

## Components

### 1. Security Logger (`server/services/securityLogger.ts`)

The central logging service that handles all security events:

```typescript
import { securityLogger } from '../services/securityLogger';

// Log authentication events
await securityLogger.logAuthenticationEvent(
  'AUTH_SUCCESS',
  'user@example.com',
  {
    userId: 1,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0'
  }
);

// Log API access
await securityLogger.logApiAccess(
  'GET',
  '/api/users',
  200,
  { userId: 1, ipAddress: '192.168.1.1' }
);

// Create security alerts
await securityLogger.createSecurityAlert(
  'BRUTE_FORCE_ATTACK',
  'Multiple failed login attempts detected',
  {
    ipAddress: '192.168.1.1',
    severity: 'high'
  }
);
```

### 2. Security Monitoring Middleware (`server/middleware/securityMonitoring.ts`)

Automatic logging middleware that captures security context:

```typescript
import { addSecurityContext, logApiAccess } from '../middleware/securityMonitoring';

// Add to Express app
app.use(addSecurityContext);
app.use(logApiAccess);
```

### 3. Database Schema

Two main tables for security data:

#### Security Audit Logs (`security_audit_logs`)
- Comprehensive event logging
- User actions and API access
- Authentication events
- Data access tracking

#### Security Alerts (`security_alerts`)
- Automated threat detection
- Alert management and resolution
- Severity classification

### 4. Security Dashboard

Access the security dashboard at `/api/security-dashboard` (admin only):
- Real-time security metrics
- Active alerts monitoring
- Failed login tracking
- IP-based threat analysis

## Event Types

### Authentication Events
- `AUTH_SUCCESS` - Successful login
- `AUTH_FAILURE` - Failed login attempt
- `PASSWORD_CHANGE` - Password modification
- `ACCOUNT_LOCKED` - Account lockout
- `ACCOUNT_UNLOCKED` - Account unlock

### Session Events
- `SESSION_CREATED` - New session established
- `SESSION_TERMINATED` - Session ended

### Security Events
- `SUSPICIOUS_LOGIN` - Unusual login patterns
- `RATE_LIMIT_EXCEEDED` - Rate limiting triggered
- `ADMIN_ACTION` - Administrative actions
- `AUTHORIZATION_FAILURE` - Access denied
- `SECURITY_VIOLATION` - Security policy violation

### Data Events
- `DATA_ACCESS` - Data read operations
- `DATA_MODIFICATION` - Data write operations
- `API_ACCESS` - API endpoint access

## Alert Types

### Automated Alerts
- `BRUTE_FORCE_ATTACK` - Multiple failed logins
- `SUSPICIOUS_LOGIN_PATTERN` - Unusual login behavior
- `RATE_LIMIT_EXCEEDED` - Excessive requests
- `MULTIPLE_FAILED_LOGINS` - Failed authentication attempts
- `ACCOUNT_ENUMERATION` - User enumeration attempts

### Alert Severities
- `critical` - Immediate attention required
- `high` - High priority security issue
- `medium` - Moderate security concern
- `low` - Low priority notification

## API Endpoints

### Security Monitoring (Admin Only)

#### Get Security Events
```http
GET /api/security-monitoring/events?limit=100&eventType=AUTH_FAILURE
```

#### Get Security Alerts
```http
GET /api/security-monitoring/alerts?status=open&severity=high
```

#### Get Security Metrics
```http
GET /api/security-monitoring/metrics?timeWindow=24
```

#### Resolve Security Alert
```http
POST /api/security-monitoring/alerts/123/resolve
{
  "resolutionNotes": "False positive - legitimate user",
  "status": "resolved"
}
```

### User Security Events

#### Get My Security Events
```http
GET /api/security-monitoring/my-events?limit=50
```

## Configuration

### Alert Thresholds

Configure in `securityLogger.ts`:

```typescript
private alertThresholds = {
  FAILED_LOGIN_ATTEMPTS: 5,      // Failed logins before alert
  RATE_LIMIT_VIOLATIONS: 10,     // Rate limit hits before alert
  SUSPICIOUS_IPS: 3,             // Different IPs before alert
  TIME_WINDOW_MINUTES: 15        // Time window for analysis
};
```

### Database Setup

Run the migration script to create security tables:

```sql
-- Run server/scripts/migrate-security-logging.sql
```

## Usage Examples

### Logging Authentication Events

```typescript
// In authentication routes
import { securityLogger } from '../services/securityLogger';

// Success
await securityLogger.logAuthenticationEvent(
  'AUTH_SUCCESS',
  user.email,
  {
    userId: user.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    sessionId: jwtPayload.jti
  }
);

// Failure
await securityLogger.logAuthenticationEvent(
  'AUTH_FAILURE',
  email,
  {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  },
  'Invalid credentials'
);
```

### Logging Data Access

```typescript
// In API routes
import { logDataAccess } from '../middleware/securityMonitoring';

router.get('/users/:id', 
  jwtAuth,
  logDataAccess('users', 'read'),
  async (req, res) => {
    // Route handler
  }
);
```

### Creating Custom Alerts

```typescript
// Detect suspicious patterns
if (suspiciousActivity) {
  await securityLogger.createSecurityAlert(
    'UNUSUAL_ACCESS_PATTERN',
    'User accessing unusual resources',
    {
      userId: user.id,
      severity: 'medium',
      details: {
        resources: accessedResources,
        timePattern: 'off_hours'
      }
    }
  );
}
```

## Monitoring and Alerting

### Dashboard Features
- **Real-time metrics** - Current security status
- **Alert management** - View and resolve alerts
- **Event timeline** - Recent security events
- **IP analysis** - Failed attempts by IP
- **User activity** - Security events by user

### Automated Detection
- **Brute force attacks** - Multiple failed logins
- **Account enumeration** - User discovery attempts
- **Suspicious logins** - Unusual patterns
- **Rate limiting** - Excessive requests
- **Privilege escalation** - Unauthorized access attempts

### Response Actions
- **Account lockout** - Automatic protection
- **Session termination** - Force logout
- **IP blocking** - Rate limiting
- **Alert notifications** - Admin notifications
- **Audit logging** - Complete event trail

## Security Considerations

### Data Protection
- **Sensitive data masking** - Passwords and tokens redacted
- **Access control** - Admin-only security data
- **Audit integrity** - Tamper-proof logging
- **Data retention** - Configurable log retention

### Performance
- **Asynchronous logging** - Non-blocking operations
- **Batch processing** - Efficient database writes
- **Index optimization** - Fast query performance
- **Cleanup procedures** - Automatic log rotation

### Compliance
- **Audit trails** - Complete activity logging
- **Data retention** - Configurable policies
- **Access logging** - Who accessed what when
- **Change tracking** - All modifications logged

## Troubleshooting

### Common Issues

1. **Database connection errors**
   - Check DATABASE_URL configuration
   - Verify database permissions
   - Run migration scripts

2. **Missing security events**
   - Verify middleware is installed
   - Check error logs for failures
   - Confirm database schema

3. **Performance issues**
   - Review log retention settings
   - Check database indexes
   - Monitor query performance

### Debugging

Enable debug logging:
```typescript
// Set environment variable
DEBUG=security:*

// Or check console logs
console.log('Security event logged:', event);
```

## Future Enhancements

### Planned Features
- **Machine learning** - Anomaly detection
- **External integrations** - SIEM systems
- **Advanced analytics** - Behavioral analysis
- **Mobile alerts** - Push notifications
- **Compliance reports** - Automated reporting

### Integration Options
- **Slack notifications** - Real-time alerts
- **Email alerts** - Critical notifications
- **Webhook support** - External systems
- **API integrations** - Third-party tools
- **Export capabilities** - Data analysis

This security monitoring system provides comprehensive visibility into application security events and enables proactive threat detection and response.