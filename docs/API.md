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

- `VALIDATION_ERROR` - Input validation failed
- `AUTHENTICATION_REQUIRED` - Missing or invalid authentication
- `AUTHORIZATION_FAILED` - Insufficient permissions
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `CSRF_TOKEN_INVALID` - CSRF token validation failed
- `ACCOUNT_LOCKED` - Account temporarily locked
- `CAPTCHA_REQUIRED` - CAPTCHA verification needed

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

### Security & Monitoring

#### POST /captcha/verify
Verify CAPTCHA challenge.

**Rate Limit:** 3 attempts per 5 minutes per IP

**Request Body:**
```json
{
  "captchaToken": "captcha_response_token",
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

#### GET /security/dashboard
Security monitoring dashboard (Admin only).

**Headers:** `Authorization: Bearer <admin_access_token>`  
**Authorization:** Admin role required

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
  ]
}
```

#### GET /security/events
Security event logs (Admin only).

**Headers:** `Authorization: Bearer <admin_access_token>`  
**Authorization:** Admin role required

**Query Parameters:**
- `type` (optional): Event type filter
- `userId` (optional): User ID filter
- `startDate` (optional): Start date filter
- `endDate` (optional): End date filter
- `page` (optional): Page number
- `limit` (optional): Results per page

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
    "total": 1250
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
  "message": "Free trial activated",
  "trial": {
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-08T00:00:00.000Z",
    "features": ["unlimited_searches", "advanced_analytics"]
  }
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