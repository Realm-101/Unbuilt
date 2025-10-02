# Password Security Implementation

This document describes the password security and account protection features implemented in the application.

## Overview

The password security system provides comprehensive protection against common password-related attacks and enforces strong password policies. It includes:

- **Password Strength Validation**: Enforces complex password requirements
- **Account Lockout Protection**: Prevents brute force attacks
- **Password History Tracking**: Prevents password reuse
- **Secure Password Hashing**: Uses bcrypt with high salt rounds
- **Password Expiration**: Enforces periodic password changes

## Features

### 1. Password Strength Requirements

All passwords must meet the following criteria:

- **Minimum Length**: 8 characters
- **Maximum Length**: 128 characters
- **Character Requirements**:
  - At least one lowercase letter (a-z)
  - At least one uppercase letter (A-Z)
  - At least one number (0-9)
  - At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
- **Common Password Protection**: Rejects commonly used passwords
- **Strength Scoring**: Provides a 0-100 score based on complexity

### 2. Account Lockout Protection

Protects against brute force attacks with:

- **Failed Attempt Tracking**: Monitors failed login attempts per user
- **Progressive Lockout**: Increases lockout duration with repeated failures
- **Automatic Unlock**: Releases locks after expiration
- **Manual Unlock**: Administrators can unlock accounts
- **Configurable Settings**:
  - Maximum failed attempts: 5 (default)
  - Lockout duration: 15 minutes (default)
  - Progressive lockout: Enabled (default)
  - Reset attempts after: 60 minutes (default)

### 3. Password History Tracking

Prevents password reuse by:

- **History Storage**: Keeps last 5 password hashes per user
- **Reuse Prevention**: Blocks reusing previous passwords
- **Automatic Cleanup**: Maintains only recent password history
- **Secure Storage**: Stores only hashed passwords, never plaintext

### 4. Secure Password Hashing

Uses industry-standard security practices:

- **Algorithm**: bcrypt with 12 salt rounds
- **Salt Generation**: Automatic unique salt per password
- **Hash Verification**: Secure comparison without timing attacks
- **Upgrade Path**: Easy to increase salt rounds in future

### 5. Password Expiration

Enforces periodic password changes:

- **Expiration Period**: 90 days (configurable)
- **Warning System**: Notifies users before expiration
- **Force Change**: Can require immediate password change
- **Grace Period**: Allows login with expired password to change it

## API Endpoints

### Change Password
```
POST /api/auth/change-password
```

**Request Body:**
```json
{
  "currentPassword": "string",
  "newPassword": "string",
  "confirmPassword": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### Validate Password Strength
```
POST /api/auth/validate-password-strength
```

**Request Body:**
```json
{
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "score": 85,
    "feedback": [],
    "requirements": {
      "minLength": true,
      "hasLowercase": true,
      "hasUppercase": true,
      "hasNumber": true,
      "hasSpecialChar": true,
      "notCommon": true
    }
  }
}
```

### Get Password Status
```
GET /api/auth/password-status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "passwordStatus": {
      "strengthScore": 85,
      "lastChanged": "2024-01-15T10:30:00Z",
      "isExpired": false,
      "daysUntilExpiry": 45,
      "forceChange": false
    },
    "requiresChange": false
  }
}
```

## Database Schema

### Users Table Extensions
```sql
-- Password security fields
last_password_change TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
password_expiry_warning_sent BOOLEAN DEFAULT FALSE,
force_password_change BOOLEAN DEFAULT FALSE,
password_strength_score INTEGER DEFAULT 0,

-- Account lockout fields
failed_login_attempts INTEGER DEFAULT 0,
last_failed_login TIMESTAMP,
account_locked BOOLEAN DEFAULT FALSE,
lockout_expires TIMESTAMP
```

### Password History Table
```sql
CREATE TABLE password_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    replaced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Security Events

The system logs the following security events:

- **PASSWORD_CHANGED**: User successfully changed password
- **PASSWORD_CHANGE_FAILED**: Password change attempt failed
- **ACCOUNT_LOCKED**: Account locked due to failed attempts
- **ACCOUNT_UNLOCKED**: Account manually unlocked by admin
- **PASSWORD_EXPIRED**: User attempted login with expired password
- **WEAK_PASSWORD_REJECTED**: Attempt to set weak password

## Configuration

### Environment Variables

```bash
# Password security settings
PASSWORD_MIN_LENGTH=8
PASSWORD_MAX_LENGTH=128
PASSWORD_EXPIRY_DAYS=90
BCRYPT_SALT_ROUNDS=12

# Account lockout settings
MAX_FAILED_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15
PROGRESSIVE_LOCKOUT=true
RESET_ATTEMPTS_AFTER_MINUTES=60
```

### Service Configuration

```typescript
// Password security service
const passwordConfig = {
  minLength: 8,
  maxLength: 128,
  expiryDays: 90,
  saltRounds: 12
};

// Account lockout service
const lockoutConfig = {
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 15,
  progressiveLockout: true,
  resetAttemptsAfterMinutes: 60
};
```

## Best Practices

### For Users
1. Use unique, complex passwords
2. Don't reuse previous passwords
3. Change passwords regularly
4. Use a password manager
5. Enable two-factor authentication when available

### For Administrators
1. Monitor security events regularly
2. Review locked accounts promptly
3. Adjust lockout settings based on threat level
4. Educate users on password security
5. Implement additional security measures for high-risk accounts

## Monitoring and Alerts

The system provides monitoring capabilities for:

- **Failed Login Attempts**: Track patterns and potential attacks
- **Account Lockouts**: Monitor frequency and causes
- **Password Changes**: Audit password change activities
- **Weak Password Attempts**: Identify users needing education
- **Expired Passwords**: Track users with outdated passwords

## Migration Guide

To implement password security in an existing system:

1. **Run Database Migration**: Execute `migrate-password-security.sql`
2. **Update User Registration**: Include password strength validation
3. **Update Login Process**: Add account lockout checks
4. **Add Password Change Endpoints**: Implement secure password change
5. **Configure Monitoring**: Set up security event logging
6. **User Communication**: Notify users of new password requirements

## Testing

The implementation includes comprehensive tests:

- **Unit Tests**: Individual service functionality
- **Integration Tests**: End-to-end password security flows
- **Security Tests**: Vulnerability and attack simulation
- **Performance Tests**: Impact on authentication performance

Run tests with:
```bash
npm test -- server/services/__tests__/passwordSecurity
npm test -- server/services/__tests__/accountLockout
npm test -- server/services/__tests__/passwordHistory
```

## Troubleshooting

### Common Issues

1. **Account Locked**: Check lockout expiration and failed attempt count
2. **Password Rejected**: Verify password meets all strength requirements
3. **History Conflict**: Ensure password hasn't been used recently
4. **Performance Issues**: Consider adjusting bcrypt salt rounds
5. **Migration Errors**: Verify database permissions and schema

### Debug Commands

```bash
# Check account lockout status
curl -X GET /api/auth/password-status -H "Authorization: Bearer <token>"

# Validate password strength
curl -X POST /api/auth/validate-password-strength \
  -H "Content-Type: application/json" \
  -d '{"password": "TestPassword123!"}'

# View security events
curl -X GET /api/security/events -H "Authorization: Bearer <admin-token>"
```

## Security Considerations

1. **Rate Limiting**: Implement additional rate limiting on password endpoints
2. **HTTPS Only**: Ensure all password operations use HTTPS
3. **Secure Storage**: Never log or store plaintext passwords
4. **Memory Safety**: Clear password variables after use
5. **Audit Trail**: Maintain comprehensive security event logs
6. **Regular Updates**: Keep bcrypt and security libraries updated
7. **Penetration Testing**: Regularly test password security measures

## Future Enhancements

Planned improvements include:

- **Two-Factor Authentication**: Add TOTP/SMS verification
- **Biometric Authentication**: Support for fingerprint/face recognition
- **Password Breach Detection**: Check against known compromised passwords
- **Advanced Threat Detection**: Machine learning for attack pattern recognition
- **Single Sign-On**: Integration with enterprise identity providers
- **Password Recovery**: Secure password reset mechanisms