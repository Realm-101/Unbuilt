# UX Features API Documentation

This document describes the API endpoints for UX and Information Architecture features.

## Table of Contents

- [User Preferences](#user-preferences)
- [Projects](#projects)
- [Progress Tracking](#progress-tracking)
- [Share Links](#share-links)
- [Help System](#help-system)
- [Global Search](#global-search)

## Authentication

All endpoints (except public share links) require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting

- **Free Tier**: 100 requests per hour
- **Pro Tier**: 1000 requests per hour
- **Enterprise Tier**: 10000 requests per hour

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

## User Preferences

### Get User Preferences

Retrieve the current user's preferences.

**Endpoint**: `GET /api/user/preferences`

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": {
    "userId": "user_123",
    "role": "entrepreneur",
    "onboardingCompleted": true,
    "tourCompleted": true,
    "expandedSections": {
      "competitive-analysis": true,
      "market-intelligence": false
    },
    "keyboardShortcuts": {
      "globalSearch": "ctrl+k",
      "newSearch": "ctrl+n"
    },
    "accessibilitySettings": {
      "highContrast": false,
      "reducedMotion": false,
      "screenReaderOptimized": false
    },
    "notificationSettings": {
      "email": true,
      "inApp": true,
      "frequency": "daily"
    },
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T12:30:00Z"
  }
}
```

### Update User Preferences

Update user preferences (full replacement).

**Endpoint**: `PUT /api/user/preferences`

**Authentication**: Required

**Request Body**:
```json
{
  "role": "investor",
  "onboardingCompleted": true,
  "tourCompleted": true,
  "expandedSections": {
    "competitive-analysis": true
  },
  "keyboardShortcuts": {
    "globalSearch": "ctrl+k"
  },
  "accessibilitySettings": {
    "highContrast": true,
    "reducedMotion": false,
    "screenReaderOptimized": true
  },
  "notificationSettings": {
    "email": true,
    "inApp": false,
    "frequency": "weekly"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "userId": "user_123",
    "role": "investor",
    ...
  }
}
```

### Mark Onboarding Complete

Mark onboarding as completed.

**Endpoint**: `PATCH /api/user/preferences/onboarding`

**Authentication**: Required

**Request Body**:
```json
{
  "completed": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Onboarding marked as complete"
}
```

### Mark Tour Complete

Mark interactive tour as completed.

**Endpoint**: `PATCH /api/user/preferences/tour`

**Authentication**: Required

**Request Body**:
```json
{
  "completed": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Tour marked as complete"
}
```

## Projects

### List Projects

Get all projects for the current user.

**Endpoint**: `GET /api/projects`

**Authentication**: Required

**Query Parameters**:
- `archived` (boolean, optional): Filter by archived status
- `page` (number, optional): Page number (default: 1)
- `pageSize` (number, optional): Items per page (default: 20)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "proj_123",
      "userId": "user_123",
      "name": "Healthcare Innovation",
      "description": "Exploring gaps in healthcare technology",
      "analyses": ["analysis_1", "analysis_2"],
      "tags": ["healthcare", "technology"],
      "archived": false,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-15T12:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 5
  }
}
```

### Create Project

Create a new project.

**Endpoint**: `POST /api/projects`

**Authentication**: Required

**Request Body**:
```json
{
  "name": "Healthcare Innovation",
  "description": "Exploring gaps in healthcare technology",
  "tags": ["healthcare", "technology"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "proj_123",
    "userId": "user_123",
    "name": "Healthcare Innovation",
    "description": "Exploring gaps in healthcare technology",
    "analyses": [],
    "tags": ["healthcare", "technology"],
    "archived": false,
    "createdAt": "2025-01-15T12:30:00Z",
    "updatedAt": "2025-01-15T12:30:00Z"
  }
}
```

### Get Project

Get a specific project by ID.

**Endpoint**: `GET /api/projects/:id`

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "proj_123",
    "userId": "user_123",
    "name": "Healthcare Innovation",
    "description": "Exploring gaps in healthcare technology",
    "analyses": ["analysis_1", "analysis_2"],
    "tags": ["healthcare", "technology"],
    "archived": false,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-15T12:30:00Z"
  }
}
```

### Update Project

Update a project.

**Endpoint**: `PUT /api/projects/:id`

**Authentication**: Required

**Request Body**:
```json
{
  "name": "Healthcare Innovation 2.0",
  "description": "Updated description",
  "tags": ["healthcare", "technology", "ai"],
  "archived": false
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "proj_123",
    "name": "Healthcare Innovation 2.0",
    ...
  }
}
```

### Delete Project

Delete a project.

**Endpoint**: `DELETE /api/projects/:id`

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

### Add Analysis to Project

Add an analysis to a project.

**Endpoint**: `POST /api/projects/:id/analyses/:analysisId`

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "message": "Analysis added to project"
}
```

### Remove Analysis from Project

Remove an analysis from a project.

**Endpoint**: `DELETE /api/projects/:id/analyses/:analysisId`

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "message": "Analysis removed from project"
}
```

## Progress Tracking

### Get Progress

Get action plan progress for a specific analysis.

**Endpoint**: `GET /api/progress/:analysisId`

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "progress_123",
    "userId": "user_123",
    "analysisId": "analysis_123",
    "completedSteps": ["step_1", "step_2", "step_3"],
    "phaseCompletion": {
      "validation": 75,
      "planning": 50,
      "development": 0,
      "launch": 0
    },
    "overallCompletion": 31,
    "lastUpdated": "2025-01-15T12:30:00Z",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

### Mark Step Complete

Mark an action plan step as complete.

**Endpoint**: `POST /api/progress/:analysisId/steps/:stepId/complete`

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": {
    "completedSteps": ["step_1", "step_2", "step_3", "step_4"],
    "phaseCompletion": {
      "validation": 100,
      "planning": 50,
      "development": 0,
      "launch": 0
    },
    "overallCompletion": 37
  }
}
```

### Mark Step Incomplete (Undo)

Mark a previously completed step as incomplete.

**Endpoint**: `DELETE /api/progress/:analysisId/steps/:stepId/complete`

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": {
    "completedSteps": ["step_1", "step_2"],
    "phaseCompletion": {
      "validation": 50,
      "planning": 50,
      "development": 0,
      "launch": 0
    },
    "overallCompletion": 25
  }
}
```

### Get Progress Summary

Get progress summary across all analyses.

**Endpoint**: `GET /api/progress/summary`

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": {
    "totalAnalyses": 10,
    "analysesWithProgress": 7,
    "averageCompletion": 42,
    "completedPhases": 15,
    "recentActivity": [
      {
        "analysisId": "analysis_123",
        "analysisTitle": "Healthcare Gap Analysis",
        "lastUpdated": "2025-01-15T12:30:00Z",
        "completion": 75
      }
    ]
  }
}
```

## Share Links

### Create Share Link

Generate a secure share link for an analysis.

**Endpoint**: `POST /api/share/:analysisId`

**Authentication**: Required

**Request Body**:
```json
{
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "share_123",
    "userId": "user_123",
    "analysisId": "analysis_123",
    "token": "abc123xyz789",
    "url": "https://unbuilt.one/share/abc123xyz789",
    "expiresAt": "2025-12-31T23:59:59Z",
    "viewCount": 0,
    "active": true,
    "createdAt": "2025-01-15T12:30:00Z",
    "lastAccessedAt": null
  }
}
```

### List Share Links

Get all share links created by the current user.

**Endpoint**: `GET /api/share/links`

**Authentication**: Required

**Query Parameters**:
- `active` (boolean, optional): Filter by active status
- `page` (number, optional): Page number (default: 1)
- `pageSize` (number, optional): Items per page (default: 20)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "share_123",
      "analysisId": "analysis_123",
      "analysisTitle": "Healthcare Gap Analysis",
      "token": "abc123xyz789",
      "url": "https://unbuilt.one/share/abc123xyz789",
      "expiresAt": "2025-12-31T23:59:59Z",
      "viewCount": 15,
      "active": true,
      "createdAt": "2025-01-15T12:30:00Z",
      "lastAccessedAt": "2025-01-20T10:15:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 3
  }
}
```

### Access Shared Analysis (Public)

Access an analysis via share token (no authentication required).

**Endpoint**: `GET /api/share/:token`

**Authentication**: Not required

**Response**:
```json
{
  "success": true,
  "data": {
    "analysis": {
      "id": "analysis_123",
      "title": "Healthcare Gap Analysis",
      "innovationScore": 85,
      "feasibilityRating": 4.2,
      "marketPotential": "High",
      "insights": [...],
      "competitiveAnalysis": {...},
      "actionPlan": {...}
    },
    "sharedBy": "John Doe",
    "sharedAt": "2025-01-15T12:30:00Z"
  }
}
```

**Error Responses**:
- `404`: Share link not found or expired
- `403`: Share link has been revoked

### Revoke Share Link

Revoke a share link (makes it inactive).

**Endpoint**: `DELETE /api/share/links/:linkId`

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "message": "Share link revoked successfully"
}
```

### Update Share Link

Update share link expiration.

**Endpoint**: `PATCH /api/share/links/:linkId`

**Authentication**: Required

**Request Body**:
```json
{
  "expiresAt": "2026-12-31T23:59:59Z"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "share_123",
    "expiresAt": "2026-12-31T23:59:59Z",
    ...
  }
}
```

## Help System

### List Help Articles

Get all help articles.

**Endpoint**: `GET /api/help/articles`

**Authentication**: Optional (public access)

**Query Parameters**:
- `category` (string, optional): Filter by category
- `context` (string, optional): Filter by context
- `page` (number, optional): Page number (default: 1)
- `pageSize` (number, optional): Items per page (default: 20)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "article_123",
      "title": "Getting Started with Unbuilt",
      "content": "# Getting Started\n\n...",
      "context": ["dashboard", "onboarding"],
      "category": "getting-started",
      "tags": ["beginner", "tutorial"],
      "videoUrl": "https://youtube.com/watch?v=...",
      "relatedArticles": ["article_124", "article_125"],
      "viewCount": 1250,
      "helpfulCount": 980,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-10T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 45
  }
}
```

### Get Help Article

Get a specific help article.

**Endpoint**: `GET /api/help/articles/:id`

**Authentication**: Optional (public access)

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "article_123",
    "title": "Getting Started with Unbuilt",
    "content": "# Getting Started\n\n...",
    "context": ["dashboard", "onboarding"],
    "category": "getting-started",
    "tags": ["beginner", "tutorial"],
    "videoUrl": "https://youtube.com/watch?v=...",
    "relatedArticles": [
      {
        "id": "article_124",
        "title": "Understanding Innovation Scores"
      }
    ],
    "viewCount": 1250,
    "helpfulCount": 980,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-10T12:00:00Z"
  }
}
```

### Search Help Articles

Search help articles by query.

**Endpoint**: `GET /api/help/search`

**Authentication**: Optional (public access)

**Query Parameters**:
- `q` (string, required): Search query
- `page` (number, optional): Page number (default: 1)
- `pageSize` (number, optional): Items per page (default: 10)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "article_123",
      "title": "Getting Started with Unbuilt",
      "excerpt": "...relevant excerpt with search terms highlighted...",
      "category": "getting-started",
      "relevance": 0.95
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 8
  }
}
```

### Get Contextual Help

Get help articles for a specific context.

**Endpoint**: `GET /api/help/context/:context`

**Authentication**: Optional (public access)

**Response**:
```json
{
  "success": true,
  "data": {
    "context": "dashboard",
    "articles": [
      {
        "id": "article_123",
        "title": "Understanding Your Dashboard",
        "excerpt": "Learn how to navigate and use your dashboard..."
      }
    ],
    "faqs": [
      {
        "question": "How do I organize my searches?",
        "answer": "You can use projects, favorites, and tags..."
      }
    ],
    "videos": [
      {
        "title": "Dashboard Tour",
        "url": "https://youtube.com/watch?v=..."
      }
    ]
  }
}
```

### Submit Help Feedback

Submit feedback on a help article.

**Endpoint**: `POST /api/help/articles/:id/feedback`

**Authentication**: Optional

**Request Body**:
```json
{
  "helpful": true,
  "comment": "Very clear and helpful!"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Thank you for your feedback!"
}
```

## Global Search

### Search Globally

Search across analyses, resources, help articles, and pages.

**Endpoint**: `GET /api/search/global`

**Authentication**: Required

**Query Parameters**:
- `q` (string, required): Search query
- `types` (string[], optional): Filter by types (analysis, resource, help, page)
- `page` (number, optional): Page number (default: 1)
- `pageSize` (number, optional): Items per page (default: 10)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "type": "analysis",
      "id": "analysis_123",
      "title": "Healthcare Gap Analysis",
      "description": "Analysis of gaps in healthcare technology...",
      "path": "/search-result/analysis_123",
      "metadata": {
        "innovationScore": 85,
        "createdAt": "2025-01-15T12:30:00Z"
      },
      "relevance": 0.92
    },
    {
      "type": "help",
      "id": "article_456",
      "title": "Getting Started Guide",
      "description": "Learn how to use Unbuilt...",
      "path": "/help/article_456",
      "metadata": {
        "category": "getting-started"
      },
      "relevance": 0.85
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 23
  }
}
```

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

- `200 OK`: Request succeeded
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Rate Limit Errors

```json
{
  "success": false,
  "error": "Rate limit exceeded. Please try again in 3600 seconds.",
  "retryAfter": 3600
}
```

## Webhooks (Enterprise Only)

Enterprise users can configure webhooks for events:

- `progress.step_completed`: When a user completes an action plan step
- `project.created`: When a new project is created
- `share.accessed`: When a shared link is accessed
- `analysis.completed`: When a new analysis is completed

Contact enterprise@unbuilt.one to configure webhooks.

---

**Need help?** Email support@unbuilt.one or check our [Getting Started Guide](./UX_GETTING_STARTED.md).
