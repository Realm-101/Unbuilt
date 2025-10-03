# API Documentation

## 🚀 Overview

The Unbuilt API provides secure, RESTful endpoints for gap analysis, user management, and platform administration. All endpoints implement comprehensive security measures including authentication, authorization, input validation, and rate limiting.

## 🔐 Authentication

### JWT Token Authentication

All protected endpoints require a valid JWT access token in the Authorization header:

```http
Authorization: Bearer <access_token>
```

### Token Management

**Access Tokens:** Short-lived (15 minutes) for API access  
**Refresh Tokens:** Long-lived (7 days) stored in HttpOnly cookies  
**Token Rotation:** Automatic refresh token rotation on renewal

## 📊 Rate Limiting

API endpoints are protected with intelligent rate limiting:

- **Authentication endpoints:** 5 requests per 15 minutes per IP
- **General API endpoints:** 100 requests per 15 minutes per user
- **Search endpoints:** 10 requests per minute per user
- **CAPTCHA verification:** 3 attempts per 5 minutes per IP

## 🛡️ Security Features

### Input Validation
- Comprehensive Zod schema validation
- SQL injection prevention with parameterized queries
- XSS protection with input sanitization
- File upload security with type validation

### CSRF Protection
- Token-based CSRF protection for web forms
- Automatic bypass for JWT-authenticated API calls
- Multiple token extraction methods

### Security Headers
All responses include security headers:
- Content Security Policy (CSP)
- Strict Transport Security (HSTS)
- X-Frame-Options, X-Content-Type-Options
- Referrer Policy, Permissions Policy

## 📝 Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "details": {
    "field": "Additional context"
  }
}
```

### Common Error Codes

#### Authentication Errors (AUTH_*)
- `AUTH_INVALID_TOKEN` - Invalid or malformed JWT token
- `AUTH_TOKEN_EXPIRED` - JWT token has expired
- `AUTH_INVALID_CREDENTIALS` - Invalid email or password
- `AUTH_ACCOUNT_LOCKED` - Account temporarily locked due to failed attempts
- `AUTH_SESSION_EXPIRED` - Session has expired, re-authentication required

#### Authorization Errors (AUTHZ_*)
- `AUTHZ_INSUFFICIENT` - Insufficient permissions for this action
- `AUTHZ_FORBIDDEN` - Access to resource is forbidden
- `AUTHZ_ROLE_REQUIRED` - Specific role required (admin, enterprise)

#### Validation Errors (VAL_*)
- `VAL_INVALID_INPUT` - General input validation failed
- `VAL_EMAIL_REQUIRED` - Email field is required
- `VAL_EMAIL_INVALID` - Invalid email format
- `VAL_PASSWORD_WEAK` - Password does not meet security requirements
- `VAL_MISSING_FIELDS` - Required fields are missing

#### Rate Limiting Errors
- `RATE_LIMIT_EXCEEDED` - Too many requests, retry after cooldown
- `RATE_LIMIT_IP_BLOCKED` - IP address temporarily blocked
- `CAPTCHA_REQUIRED` - CAPTCHA verification needed to continue

#### Security Errors
- `CSRF_TOKEN_INVALID` - CSRF token validation failed
- `CSRF_PROTECTION_ERROR` - CSRF protection system error
- `SESSION_HIJACK_DETECTED` - Suspicious session activity detected

#### Resource Errors
- `RESOURCE_NOT_FOUND` - Requested resource does not exist
- `USER_NOT_FOUND` - User account not found
- `SEARCH_NOT_FOUND` - Search record not found
- `ACCESS_DENIED` - Access to resource denied

#### System Errors (SYS_*)
- `SYS_UNKNOWN` - Unknown system error occurred
- `SYS_DATABASE_ERROR` - Database operation failed
- `SYS_SERVICE_UNAVAILABLE` - External service unavailable

## 🔗 Base URLs

- **Development:** `http://localhost:5000/api`
- **Production:** `https://unbuilt.one/api`

## 📚 API Endpoints

### Authentication & Authorization

#### POST /auth/register
Register a new user account with comprehensive validation.

**Rate Limit:** 5 requests per 15 minutes per IP

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Validation Rules:**
- Email: Valid format, not already registered
- Password: Min 8 chars, mixed case, numbers, symbols
- Name: 2-50 characters, no special characters

**Response (201 Created):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "emailVerified": false
  },
  "accessToken": "jwt_access_token"
}
```

#### POST /auth/login
Authenticate user with account lockout protection.

**Rate Limit:** 5 requests per 15 minutes per IP  
**Account Lockout:** Progressive lockout after failed attempts

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "lastLogin": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "jwt_access_token"
}
```

**Error Response (423 Locked):**
```json
{
  "error": "Account temporarily locked",
  "code": "ACCOUNT_LOCKED",
  "lockoutExpires": "2024-01-01T00:15:00.000Z"
}
```

#### POST /auth/refresh
Refresh access token with automatic token rotation.

**Request:** Uses HttpOnly refresh token cookie

**Response (200 OK):**
```json
{
  "accessToken": "new_jwt_access_token"
}
```

#### POST /auth/logout
Secure logout with token invalidation.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

#### POST /auth/change-password
Change password with history validation.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass456!",
  "confirmPassword": "NewSecurePass456!"
}
```

**Validation:**
- Current password must be correct
- New password cannot match last 12 passwords
- Password complexity requirements enforced

**Response (200 OK):**
```json
{
  "message": "Password changed successfully"
}
```

### Gap Analysis & Search

#### POST /search
Create a new AI-powered gap analysis search.

**Headers:** `Authorization: Bearer <access_token>`  
**Rate Limit:** 10 requests per minute per user

**Request Body:**
```json
{
  "query": "AI-powered fitness tracking for seniors",
  "category": "health-tech",
  "targetMarket": "North America",
  "budget": "startup"
}
```

**Validation:**
- Query: 10-500 characters, content filtered
- Category: Valid predefined category
- User must have available searches

**Response (201 Created):**
```json
{
  "id": 123,
  "query": "AI-powered fitness tracking for seniors",
  "status": "processing",
  "estimatedCompletion": "2024-01-01T00:05:00.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### GET /search/:id
Get detailed search results and analysis.

**Headers:** `Authorization: Bearer <access_token>`  
**Authorization:** User must own the search or have admin role

**Response (200 OK):**
```json
{
  "id": 123,
  "query": "AI-powered fitness tracking for seniors",
  "status": "completed",
  "results": {
    "gapAnalysis": "Comprehensive market gap analysis...",
    "marketPotential": 8.5,
    "innovationScore": 9.2,
    "feasibilityRating": 7.8,
    "competitorAnalysis": {
      "directCompetitors": 3,
      "indirectCompetitors": 12,
      "marketLeader": "FitBit"
    },
    "actionPlan": {
      "phases": [
        {
          "phase": 1,
          "title": "Market Research & Validation",
          "duration": "2-3 months",
          "tasks": [
            "Conduct senior focus groups",
            "Analyze competitor offerings"
          ],
          "budget": "$15,000 - $25,000"
        }
      ]
    },
    "riskAssessment": {
      "technicalRisk": "Medium",
      "marketRisk": "Low",
      "competitiveRisk": "High"
    }
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "completedAt": "2024-01-01T00:05:00.000Z"
}
```

#### GET /searches
Get user's search history with pagination.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10, max: 50)
- `status` (optional): Filter by status
- `category` (optional): Filter by category

**Response (200 OK):**
```json
{
  "searches": [
    {
      "id": 123,
      "query": "AI-powered fitness tracking for seniors",
      "status": "completed",
      "category": "health-tech",
      "marketPotential": 8.5,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### User Management

#### GET /auth/user
Get current user profile with subscription details.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "emailVerified": true,
  "subscription": {
    "tier": "free",
    "searchesUsed": 3,
    "searchesLimit": 5,
    "resetDate": "2024-02-01T00:00:00.000Z"
  },
  "security": {
    "lastLogin": "2024-01-01T00:00:00.000Z",
    "activeSessions": 2,
    "passwordLastChanged": "2023-12-01T00:00:00.000Z"
  },
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### PUT /auth/user/profile
Update user profile information.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "name": "John Smith",
  "preferences": {
    "emailNotifications": true,
    "marketingEmails": false
  }
}
```

**Response (200 OK):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": 1,
    "name": "John Smith",
    "email": "user@example.com"
  }
}
```

### Session Management

#### GET /sessions
List active user sessions.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**
```json
{
  "sessions": [
    {
      "id": "session_123",
      "device": "Chrome on Windows",
      "location": "New York, US",
      "ipAddress": "192.168.1.100",
      "lastActivity": "2024-01-01T00:00:00.000Z",
      "current": true
    }
  ]
}
```

#### DELETE /sessions/:id
Terminate a specific session.

**Headers:** `Authorization: Bearer <access_token>`  
**Authorization:** User can only terminate their own sessions

**Response (200 OK):**
```json
{
  "message": "Session terminated successfully"
}
```

#### DELETE /sessions/all
Terminate all sessions except current.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**
```json
{
  "message": "All other sessions terminated",
  "terminatedSessions": 3
}
```

#### GET /sessions/stats
Get session statistics.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**
```json
{
  "totalSessions": 5,
  "activeSessions": 2,
  "expiredSessions": 3,
  "oldestSession": "2024-01-01T00:00:00.000Z",
  "newestSession": "2024-01-03T00:00:00.000Z"
}
```

#### POST /sessions/invalidate-bulk
Invalidate multiple sessions at once.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "sessionIds": ["session_123", "session_456"]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Sessions invalidated successfully",
  "invalidatedCount": 2
}
```

#### POST /sessions/invalidate-others
Invalidate all other sessions (keep current).

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "All other sessions invalidated",
  "invalidatedCount": 3
}
```

#### POST /sessions/logout-all
Force logout from all devices (including current).

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out from all devices",
  "invalidatedCount": 4
}
```

### Security Management

#### POST /security/change-password
Change user password with enhanced security.

**Headers:** `Authorization: Bearer <access_token>`  
**Note:** Requires fresh authentication (within 30 minutes)

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass456!",
  "confirmPassword": "NewSecurePass456!"
}
```

**Validation:**
- Current password must be correct
- New password cannot match last 12 passwords
- Password complexity requirements enforced
- Requires fresh session (authenticated within 30 minutes)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

#### POST /security/lock-account
Lock a user account (Admin only).

**Headers:** `Authorization: Bearer <admin_access_token>`  
**Authorization:** Admin or Enterprise role required

**Request Body:**
```json
{
  "userId": 123,
  "reason": "Suspicious activity detected",
  "duration": 3600
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Account locked successfully",
  "lockExpires": "2024-01-01T01:00:00.000Z"
}
```

#### POST /security/unlock-account
Unlock a user account (Admin only).

**Headers:** `Authorization: Bearer <admin_access_token>`  
**Authorization:** Admin or Enterprise role required

**Request Body:**
```json
{
  "userId": 123
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Account unlocked successfully"
}
```

#### POST /security/terminate-sessions
Terminate user sessions (Admin only).

**Headers:** `Authorization: Bearer <admin_access_token>`  
**Authorization:** Admin or Enterprise role required

**Request Body:**
```json
{
  "userId": 123
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User sessions terminated",
  "sessionsTerminated": 3
}
```

#### GET /security/account-status/:userId
Check if an account is locked (Admin only).

**Headers:** `Authorization: Bearer <admin_access_token>`  
**Authorization:** Admin or Enterprise role required

**Response (200 OK):**
```json
{
  "userId": 123,
  "locked": false,
  "lockExpires": null,
  "failedAttempts": 0,
  "lastFailedAttempt": null
}
```

#### GET /security/my-account-status
Check current user's account status.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**
```json
{
  "locked": false,
  "lockExpires": null,
  "failedAttempts": 0,
  "lastLogin": "2024-01-01T00:00:00.000Z",
  "activeSessions": 2,
  "passwordLastChanged": "2023-12-01T00:00:00.000Z"
}
```

### Security & Monitoring

#### POST /captcha/challenge
Create a new CAPTCHA challenge.

**Rate Limit:** 3 attempts per 5 minutes per IP

**Response (200 OK):**
```json
{
  "challengeId": "challenge_123",
  "challenge": "What is 5 + 3?",
  "expiresAt": "2024-01-01T00:05:00.000Z"
}
```

#### POST /captcha/verify
Verify CAPTCHA challenge response.

**Rate Limit:** 3 attempts per 5 minutes per IP

**Request Body:**
```json
{
  "challengeId": "challenge_123",
  "response": "8",
  "action": "login"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "score": 0.9,
  "action": "login"
}
```

#### GET /captcha/challenge/:challengeId
Get CAPTCHA challenge information.

**Response (200 OK):**
```json
{
  "challengeId": "challenge_123",
  "challenge": "What is 5 + 3?",
  "expiresAt": "2024-01-01T00:05:00.000Z",
  "attempts": 0
}
```

#### GET /captcha/stats
Get CAPTCHA statistics (Admin only).

**Headers:** `Authorization: Bearer <admin_access_token>`

**Response (200 OK):**
```json
{
  "totalChallenges": 1250,
  "successfulVerifications": 980,
  "failedVerifications": 270,
  "successRate": 78.4
}
```

#### GET /security-monitoring/events
Get security audit events (Admin/Enterprise only).

**Headers:** `Authorization: Bearer <admin_access_token>`  
**Authorization:** Admin or Enterprise role required

**Query Parameters:**
- `type` (optional): Event type filter
- `userId` (optional): User ID filter
- `startDate` (optional): Start date filter
- `endDate` (optional): End date filter
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 50)

**Response (200 OK):**
```json
{
  "events": [
    {
      "id": 1,
      "type": "AUTHENTICATION_SUCCESS",
      "userId": 123,
      "ip": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "details": {
        "method": "password",
        "sessionId": "session_123"
      },
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1250,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### GET /security-monitoring/alerts
Get security alerts (Admin/Enterprise only).

**Headers:** `Authorization: Bearer <admin_access_token>`

**Response (200 OK):**
```json
{
  "alerts": [
    {
      "id": 1,
      "severity": "high",
      "type": "SUSPICIOUS_LOGIN",
      "message": "Multiple failed login attempts detected",
      "userId": 123,
      "count": 5,
      "timestamp": "2024-01-01T00:00:00.000Z",
      "resolved": false
    }
  ]
}
```

#### GET /security-monitoring/metrics
Get security dashboard metrics (Admin/Enterprise only).

**Headers:** `Authorization: Bearer <admin_access_token>`

**Response (200 OK):**
```json
{
  "metrics": {
    "totalUsers": 1250,
    "activeUsers": 89,
    "failedLogins": 12,
    "blockedIPs": 3,
    "securityEvents": 45,
    "activeThreats": 0
  }
}
```

#### POST /security-monitoring/alerts/:alertId/resolve
Resolve a security alert (Admin/Enterprise only).

**Headers:** `Authorization: Bearer <admin_access_token>`

**Request Body:**
```json
{
  "resolution": "False positive - user verified",
  "action": "none"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Alert resolved successfully",
  "alert": {
    "id": 1,
    "resolved": true,
    "resolvedAt": "2024-01-01T00:00:00.000Z",
    "resolution": "False positive - user verified"
  }
}
```

#### GET /security-monitoring/user-events/:userId
Get security events for a specific user (Admin/Enterprise only).

**Headers:** `Authorization: Bearer <admin_access_token>`

**Response (200 OK):**
```json
{
  "userId": 123,
  "events": [
    {
      "type": "LOGIN_SUCCESS",
      "ip": "192.168.1.100",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### GET /security-monitoring/my-events
Get security events for current user.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**
```json
{
  "events": [
    {
      "type": "LOGIN_SUCCESS",
      "ip": "192.168.1.100",
      "location": "New York, US",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### GET /security-monitoring/ip-events/:ipAddress
Get security events for a specific IP (Admin/Enterprise only).

**Headers:** `Authorization: Bearer <admin_access_token>`

**Response (200 OK):**
```json
{
  "ipAddress": "192.168.1.100",
  "events": [
    {
      "type": "FAILED_LOGIN",
      "userId": 123,
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ],
  "riskScore": 45,
  "blocked": false
}
```

#### GET /security-monitoring/dashboard
Get comprehensive security dashboard data (Admin/Enterprise only).

**Headers:** `Authorization: Bearer <admin_access_token>`

**Response (200 OK):**
```json
{
  "metrics": {
    "totalUsers": 1250,
    "activeUsers": 89,
    "failedLogins": 12,
    "blockedIPs": 3,
    "securityEvents": 45
  },
  "recentEvents": [
    {
      "type": "FAILED_LOGIN",
      "userId": 123,
      "ip": "192.168.1.100",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ],
  "alerts": [
    {
      "severity": "medium",
      "message": "Unusual login pattern detected",
      "count": 5
    }
  ],
  "trends": {
    "loginAttempts": [
      { "date": "2024-01-01", "count": 150 }
    ],
    "securityEvents": [
      { "date": "2024-01-01", "count": 12 }
    ]
  }
}
```

#### GET /security-dashboard
Serve HTML security dashboard (Admin/Enterprise only).

**Headers:** `Authorization: Bearer <admin_access_token>`

**Response (200 OK):** HTML page with interactive security dashboard

### Admin - User Management

#### GET /admin/users
Get all users (Admin only).

**Headers:** `Authorization: Bearer <admin_access_token>`  
**Authorization:** Admin role with MANAGE_USERS permission

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 50)
- `role` (optional): Filter by role
- `plan` (optional): Filter by subscription plan
- `status` (optional): Filter by account status

**Response (200 OK):**
```json
{
  "users": [
    {
      "id": 123,
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "plan": "pro",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "lastLogin": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1250,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### GET /admin/users/:id
Get specific user details (Admin only).

**Headers:** `Authorization: Bearer <admin_access_token>`  
**Authorization:** Admin role with READ_USER_DATA permission

**Response (200 OK):**
```json
{
  "user": {
    "id": 123,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "plan": "pro",
    "status": "active",
    "emailVerified": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastLogin": "2024-01-01T00:00:00.000Z",
    "subscription": {
      "tier": "pro",
      "status": "active",
      "startDate": "2024-01-01T00:00:00.000Z"
    },
    "security": {
      "failedLoginAttempts": 0,
      "accountLocked": false,
      "activeSessions": 2
    }
  }
}
```

#### PUT /admin/users/:id
Update user details (Super Admin only).

**Headers:** `Authorization: Bearer <admin_access_token>`  
**Authorization:** Super Admin role with WRITE_USER_DATA permission

**Request Body:**
```json
{
  "name": "John Smith",
  "role": "admin",
  "plan": "enterprise",
  "status": "active"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "name": "John Smith",
    "role": "admin",
    "plan": "enterprise"
  }
}
```

#### POST /admin/users/:id/unlock
Unlock user account (Admin only).

**Headers:** `Authorization: Bearer <admin_access_token>`  
**Authorization:** Admin role with MANAGE_USERS permission

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Account unlocked successfully",
  "userId": 123
}
```

#### POST /admin/users/:id/reset-password
Reset user password (Super Admin only).

**Headers:** `Authorization: Bearer <admin_access_token>`  
**Authorization:** Super Admin role only

**Request Body:**
```json
{
  "newPassword": "NewSecurePass123!",
  "requirePasswordChange": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successfully",
  "requirePasswordChange": true
}
```

#### DELETE /admin/users/:id/sessions
Invalidate all user sessions (Admin only).

**Headers:** `Authorization: Bearer <admin_access_token>`  
**Authorization:** Admin role with MANAGE_USERS permission

**Response (200 OK):**
```json
{
  "success": true,
  "message": "All user sessions invalidated",
  "sessionsInvalidated": 3
}
```

#### GET /admin/analytics
Get system analytics (Admin only).

**Headers:** `Authorization: Bearer <admin_access_token>`  
**Authorization:** Admin role with VIEW_ANALYTICS permission

**Query Parameters:**
- `range` (optional): Time range - '7d', '30d', '90d' (default: '30d')

**Response (200 OK):**
```json
{
  "users": {
    "total": 1250,
    "active": 89,
    "new": 45,
    "churn": 12
  },
  "searches": {
    "total": 5600,
    "avgPerUser": 4.5,
    "topCategories": [
      { "category": "health-tech", "count": 890 }
    ]
  },
  "revenue": {
    "mrr": 15000,
    "arr": 180000,
    "growth": 12.5
  },
  "engagement": {
    "dau": 45,
    "mau": 320,
    "avgSessionDuration": 1200
  }
}
```

### Subscription & Billing

#### POST /trial/activate
Activate free trial for Pro features.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Free trial activated successfully",
  "trialExpiration": "2024-01-08T00:00:00.000Z"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Free trial has already been used",
  "code": "TRIAL_ALREADY_USED"
}
```

#### POST /create-subscription
Create a new subscription (Stripe integration).

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "plan": "pro"
}
```

**Response (200 OK):**
```json
{
  "subscriptionId": "sub_123",
  "clientSecret": "pi_123_secret_456"
}
```

#### GET /subscription-status
Check current subscription status.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**
```json
{
  "status": "active",
  "plan": "pro",
  "currentPeriodEnd": 1704067200
}
```

### Analytics

#### GET /analytics
Get comprehensive analytics data with time-series metrics.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `range` (optional): Time range - '7d', '30d', or '90d' (default: '30d')
- `category` (optional): Filter by category (default: 'all')

**Response (200 OK):**
```json
{
  "summary": {
    "totalSearches": 1250,
    "uniqueUsers": 89,
    "totalValidations": 450,
    "avgValidationScore": 72.5,
    "growthRate": "15.3"
  },
  "timeSeries": [
    {
      "date": "2024-01-01",
      "searches": 45,
      "uniqueUsers": 12
    }
  ],
  "categoryDistribution": [
    {
      "category": "health-tech",
      "count": 125
    }
  ],
  "topOpportunities": [
    {
      "name": "AI-powered fitness tracking",
      "score": 92,
      "growth": "high",
      "category": "health-tech"
    }
  ],
  "engagementMetrics": {
    "avgSearches": 3.5,
    "uniqueUsers": 89
  },
  "range": "30d",
  "category": "all"
}
```

#### GET /analytics/realtime
Get real-time activity metrics for dashboard auto-refresh.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "activeUsers": 12,
  "recentSearches": 5
}
```

### AI Assistant

#### POST /ai-assistant/chat
Chat with AI assistant for help and guidance.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "message": "How do I find market gaps?",
  "context": {
    "page": "home",
    "previousMessages": []
  },
  "sessionId": "session_123"
}
```

**Response (200 OK):**
```json
{
  "response": "To find market gaps, use our search feature...",
  "suggestions": [
    "Try searching for 'sustainable packaging'",
    "Check out our Pro plan features"
  ],
  "sessionId": "session_123"
}
```

#### GET /ai-assistant/history/:sessionId
Get chat history for a session.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**
```json
{
  "sessionId": "session_123",
  "messages": [
    {
      "role": "user",
      "content": "How do I find market gaps?",
      "timestamp": "2024-01-01T00:00:00.000Z"
    },
    {
      "role": "assistant",
      "content": "To find market gaps...",
      "timestamp": "2024-01-01T00:00:01.000Z"
    }
  ]
}
```

### Health & Status

#### GET /health
Application health check endpoint.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "2.0.0",
  "uptime": 86400,
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "ai": "healthy"
  }
}
```

#### GET /status
Detailed system status (Admin only).

**Headers:** `Authorization: Bearer <admin_access_token>`

**Response (200 OK):**
```json
{
  "system": {
    "cpu": 45.2,
    "memory": 67.8,
    "disk": 23.1
  },
  "database": {
    "connections": 15,
    "queries": 1250,
    "avgResponseTime": 45
  },
  "security": {
    "activeThreats": 0,
    "blockedRequests": 23,
    "lastScan": "2024-01-01T00:00:00.000Z"
  }
}
```

## 🔌 WebSocket API

### Real-time Search Updates

Connect to WebSocket for real-time search progress:

**Connection:** `wss://unbuilt.one/ws`  
**Authentication:** JWT token in query: `?token=jwt_access_token`

**Events:**
```json
{
  "type": "search_progress",
  "searchId": 123,
  "progress": 75,
  "stage": "Analyzing competitors"
}
```

```json
{
  "type": "search_completed",
  "searchId": 123,
  "results": { /* search results */ }
}
```

## 🛡️ Security Best Practices

### API Key Management
- Store tokens securely (environment variables)
- Implement token refresh logic
- Handle authentication errors gracefully
- Use different environments for dev/prod

### Request Security
- Always use HTTPS in production
- Validate all input data client-side
- Implement proper error handling
- Use rate limiting on client side
- Handle CSRF tokens for web forms

### Data Protection
- Never log sensitive data
- Implement proper session management
- Use secure cookie settings
- Sanitize all user inputs
- Validate file uploads

## 📖 SDK Examples

### JavaScript/TypeScript
```typescript
// Authentication
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!'
  })
});

const { user, accessToken } = await response.json();

// Authenticated request
const searchResponse = await fetch('/api/search', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: 'AI-powered fitness tracking for seniors'
  })
});
```

### Python
```python
import requests

# Authentication
auth_response = requests.post('https://unbuilt.one/api/auth/login', json={
    'email': 'user@example.com',
    'password': 'SecurePass123!'
})

auth_data = auth_response.json()
access_token = auth_data['accessToken']

# Authenticated request
search_response = requests.post(
    'https://unbuilt.one/api/search',
    headers={'Authorization': f'Bearer {access_token}'},
    json={'query': 'AI-powered fitness tracking for seniors'}
)
```

### cURL
```bash
# Authentication
curl -X POST https://unbuilt.one/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}'

# Authenticated request
curl -X POST https://unbuilt.one/api/search \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"AI-powered fitness tracking for seniors"}'
```

## 📞 Support

- **API Issues:** Create an issue on GitHub
- **Security Concerns:** Email security@unbuilt.one
- **Documentation:** Visit [docs.unbuilt.one](https://docs.unbuilt.one)
- **Live Demo:** Test at [unbuilt.one](https://unbuilt.one)

---

**Last Updated:** October 2024  
**API Version:** 2.0  
**Documentation Version:** 2.0