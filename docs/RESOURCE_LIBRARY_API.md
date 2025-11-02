# Resource Library API Documentation

## Overview

This document provides comprehensive API documentation for the Unbuilt Resource Library endpoints. All endpoints require authentication unless otherwise specified.

**Base URL**: `https://api.unbuilt.one`  
**API Version**: v1  
**Authentication**: JWT Bearer Token

---

## Table of Contents

1. [Authentication](#authentication)
2. [Rate Limiting](#rate-limiting)
3. [Resource Endpoints](#resource-endpoints)
4. [Bookmark Endpoints](#bookmark-endpoints)
5. [Rating Endpoints](#rating-endpoints)
6. [Contribution Endpoints](#contribution-endpoints)
7. [Suggestion Endpoints](#suggestion-endpoints)
8. [Admin Endpoints](#admin-endpoints)
9. [Error Handling](#error-handling)
10. [Response Formats](#response-formats)

---

## Authentication

### Required Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Authentication Flow

1. Obtain JWT token via `/api/auth/login`
2. Include token in Authorization header for all requests
3. Token expires after 24 hours
4. Refresh token using `/api/auth/refresh`

### Example Request

```bash
curl -X GET https://api.unbuilt.one/api/resources \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

---

## Rate Limiting

### Limits by Endpoint Type

| Endpoint Type | Free Tier | Pro Tier | Enterprise |
|--------------|-----------|----------|------------|
| GET requests | 100/hour | 500/hour | Unlimited |
| POST/PUT/DELETE | 50/hour | 200/hour | Unlimited |
| Contributions | 5/day | 20/day | Unlimited |
| Ratings | 10/hour | 50/hour | Unlimited |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1635724800
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "retryAfter": 3600
}
```

---

## Resource Endpoints

### List Resources

Get a paginated list of resources with optional filtering.

**Endpoint**: `GET /api/resources`

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Items per page (default: 20, max: 100) |
| category | integer | No | Filter by category ID |
| phase | string | No | Filter by phase (research, validation, development, launch) |
| ideaType | string | No | Filter by idea type |
| search | string | No | Search query |
| sortBy | string | No | Sort by: rating, recent, popular (default: popular) |
| minRating | number | No | Minimum rating filter (1-5) |
| isPremium | boolean | No | Filter premium resources |

**Example Request**:

```bash
GET /api/resources?phase=research&category=1&limit=10&sortBy=rating
```

**Example Response**:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Customer Interview Script Template",
      "description": "Comprehensive template for conducting customer discovery interviews...",
      "url": "https://example.com/template",
      "resourceType": "template",
      "category": {
        "id": 1,
        "name": "Research",
        "slug": "research"
      },
      "phaseRelevance": ["research", "validation"],
      "ideaTypes": ["software", "service"],
      "difficultyLevel": "beginner",
      "estimatedTimeMinutes": 30,
      "isPremium": false,
      "averageRating": 4.5,
      "ratingCount": 42,
      "viewCount": 1250,
      "bookmarkCount": 89,
      "createdAt": "2025-10-15T10:30:00Z",
      "updatedAt": "2025-10-20T14:22:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 156,
    "totalPages": 16
  }
}
```


### Get Single Resource

Retrieve detailed information about a specific resource.

**Endpoint**: `GET /api/resources/:id`

**Path Parameters**:
- `id` (integer, required): Resource ID

**Example Request**:

```bash
GET /api/resources/1
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Customer Interview Script Template",
    "description": "Comprehensive template for conducting customer discovery interviews...",
    "url": "https://example.com/template",
    "resourceType": "template",
    "category": {
      "id": 1,
      "name": "Research",
      "slug": "research",
      "icon": "search"
    },
    "tags": ["interviews", "customer-discovery", "validation"],
    "phaseRelevance": ["research", "validation"],
    "ideaTypes": ["software", "service"],
    "difficultyLevel": "beginner",
    "estimatedTimeMinutes": 30,
    "isPremium": false,
    "averageRating": 4.5,
    "ratingCount": 42,
    "viewCount": 1250,
    "bookmarkCount": 89,
    "metadata": {
      "templateVariables": ["idea_title", "target_market"],
      "formats": ["docx", "pdf", "gdocs"]
    },
    "createdBy": {
      "id": 5,
      "name": "Admin User"
    },
    "createdAt": "2025-10-15T10:30:00Z",
    "updatedAt": "2025-10-20T14:22:00Z"
  }
}
```

### Track Resource Access

Log when a user accesses a resource.

**Endpoint**: `POST /api/resources/:id/access`

**Authentication**: Required

**Path Parameters**:
- `id` (integer, required): Resource ID

**Request Body**:

```json
{
  "analysisId": 123,
  "stepId": "step-1",
  "accessType": "view"
}
```

**Body Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| analysisId | integer | No | Associated gap analysis ID |
| stepId | string | No | Associated action plan step ID |
| accessType | string | Yes | Type: view, download, external_link |

**Example Response**:

```json
{
  "success": true,
  "message": "Access tracked successfully"
}
```

### Search Resources

Full-text search across resources.

**Endpoint**: `GET /api/resources/search`

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Search query |
| page | integer | No | Page number |
| limit | integer | No | Items per page |
| category | integer | No | Filter by category |
| phase | string | No | Filter by phase |

**Example Request**:

```bash
GET /api/resources/search?q=pitch+deck&phase=launch
```

**Example Response**:

```json
{
  "success": true,
  "data": [
    {
      "id": 15,
      "title": "Investor Pitch Deck Template",
      "description": "Professional pitch deck template for seed funding...",
      "url": "https://example.com/pitch-deck",
      "relevanceScore": 0.95,
      "highlightedTitle": "Investor <mark>Pitch Deck</mark> Template",
      "highlightedDescription": "Professional <mark>pitch deck</mark> template...",
      "category": {
        "id": 2,
        "name": "Funding"
      },
      "averageRating": 4.8,
      "bookmarkCount": 234
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 8
  }
}
```

---

## Bookmark Endpoints

### Get User Bookmarks

Retrieve all bookmarked resources for the authenticated user.

**Endpoint**: `GET /api/resources/bookmarks`

**Authentication**: Required

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | integer | No | Page number |
| limit | integer | No | Items per page |
| category | integer | No | Filter by category |
| search | string | No | Search within bookmarks |

**Example Request**:

```bash
GET /api/resources/bookmarks?category=1
```

**Example Response**:

```json
{
  "success": true,
  "data": [
    {
      "id": 42,
      "resource": {
        "id": 1,
        "title": "Customer Interview Script Template",
        "description": "Comprehensive template...",
        "url": "https://example.com/template",
        "category": {
          "id": 1,
          "name": "Research"
        },
        "averageRating": 4.5
      },
      "notes": "Use this for next customer interviews",
      "customTags": ["urgent", "validation-phase"],
      "createdAt": "2025-10-22T09:15:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 15
  }
}
```

### Add Bookmark

Bookmark a resource for the authenticated user.

**Endpoint**: `POST /api/resources/:id/bookmark`

**Authentication**: Required

**Path Parameters**:
- `id` (integer, required): Resource ID

**Request Body**:

```json
{
  "notes": "Great template for customer interviews",
  "customTags": ["validation", "interviews"]
}
```

**Body Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| notes | string | No | Personal notes about the resource |
| customTags | array | No | Custom tags for organization |

**Example Response**:

```json
{
  "success": true,
  "data": {
    "id": 42,
    "resourceId": 1,
    "notes": "Great template for customer interviews",
    "customTags": ["validation", "interviews"],
    "createdAt": "2025-10-29T10:30:00Z"
  }
}
```

### Remove Bookmark

Remove a bookmarked resource.

**Endpoint**: `DELETE /api/resources/:id/bookmark`

**Authentication**: Required

**Path Parameters**:
- `id` (integer, required): Resource ID

**Example Response**:

```json
{
  "success": true,
  "message": "Bookmark removed successfully"
}
```

### Update Bookmark

Update notes or tags for a bookmarked resource.

**Endpoint**: `PATCH /api/resources/bookmarks/:bookmarkId`

**Authentication**: Required

**Path Parameters**:
- `bookmarkId` (integer, required): Bookmark ID

**Request Body**:

```json
{
  "notes": "Updated notes",
  "customTags": ["new-tag", "updated"]
}
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "id": 42,
    "notes": "Updated notes",
    "customTags": ["new-tag", "updated"],
    "updatedAt": "2025-10-29T11:00:00Z"
  }
}
```

---

## Rating Endpoints

### Get Resource Ratings

Retrieve ratings and reviews for a specific resource.

**Endpoint**: `GET /api/resources/:id/ratings`

**Path Parameters**:
- `id` (integer, required): Resource ID

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | integer | No | Page number |
| limit | integer | No | Items per page |
| sortBy | string | No | Sort by: recent, helpful (default: recent) |

**Example Request**:

```bash
GET /api/resources/1/ratings?sortBy=helpful&limit=10
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "averageRating": 4.5,
    "ratingCount": 42,
    "ratingDistribution": {
      "5": 25,
      "4": 12,
      "3": 3,
      "2": 1,
      "1": 1
    },
    "reviews": [
      {
        "id": 101,
        "user": {
          "id": 15,
          "name": "John Doe"
        },
        "rating": 5,
        "review": "Excellent template! Saved me hours of work.",
        "isHelpfulCount": 12,
        "createdAt": "2025-10-25T14:30:00Z",
        "updatedAt": "2025-10-25T14:30:00Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 42
  }
}
```

### Submit Rating

Submit a rating and optional review for a resource.

**Endpoint**: `POST /api/resources/:id/ratings`

**Authentication**: Required

**Path Parameters**:
- `id` (integer, required): Resource ID

**Request Body**:

```json
{
  "rating": 5,
  "review": "Excellent template! Very comprehensive and easy to use."
}
```

**Body Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| rating | integer | Yes | Rating from 1-5 |
| review | string | No | Optional review text (max 1000 chars) |

**Example Response**:

```json
{
  "success": true,
  "data": {
    "id": 101,
    "resourceId": 1,
    "rating": 5,
    "review": "Excellent template! Very comprehensive and easy to use.",
    "isHelpfulCount": 0,
    "createdAt": "2025-10-29T10:30:00Z"
  }
}
```

### Update Rating

Update an existing rating or review.

**Endpoint**: `PATCH /api/resources/ratings/:ratingId`

**Authentication**: Required (must be rating owner)

**Path Parameters**:
- `ratingId` (integer, required): Rating ID

**Request Body**:

```json
{
  "rating": 4,
  "review": "Updated review text"
}
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "id": 101,
    "rating": 4,
    "review": "Updated review text",
    "updatedAt": "2025-10-29T11:00:00Z"
  }
}
```

### Mark Review as Helpful

Mark a review as helpful.

**Endpoint**: `POST /api/resources/ratings/:ratingId/helpful`

**Authentication**: Required

**Path Parameters**:
- `ratingId` (integer, required): Rating ID

**Example Response**:

```json
{
  "success": true,
  "data": {
    "isHelpfulCount": 13
  }
}
```

---

## Contribution Endpoints

### Submit Contribution

Submit a new resource for review.

**Endpoint**: `POST /api/resources/contributions`

**Authentication**: Required

**Request Body**:

```json
{
  "title": "New Resource Title",
  "description": "Detailed description of the resource...",
  "url": "https://example.com/resource",
  "suggestedCategoryId": 1,
  "suggestedTags": ["tag1", "tag2", "tag3"]
}
```

**Body Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| title | string | Yes | Resource title (max 255 chars) |
| description | string | Yes | Resource description (min 50 chars) |
| url | string | Yes | Valid URL to the resource |
| suggestedCategoryId | integer | Yes | Suggested category ID |
| suggestedTags | array | No | Suggested tags (max 10) |

**Example Response**:

```json
{
  "success": true,
  "data": {
    "id": 201,
    "title": "New Resource Title",
    "description": "Detailed description...",
    "url": "https://example.com/resource",
    "status": "pending",
    "createdAt": "2025-10-29T10:30:00Z"
  },
  "message": "Contribution submitted successfully. It will be reviewed within 3-5 business days."
}
```

### Get User Contributions

Retrieve all contributions submitted by the authenticated user.

**Endpoint**: `GET /api/resources/contributions/mine`

**Authentication**: Required

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by status: pending, approved, rejected |
| page | integer | No | Page number |
| limit | integer | No | Items per page |

**Example Request**:

```bash
GET /api/resources/contributions/mine?status=pending
```

**Example Response**:

```json
{
  "success": true,
  "data": [
    {
      "id": 201,
      "title": "New Resource Title",
      "description": "Detailed description...",
      "url": "https://example.com/resource",
      "status": "pending",
      "suggestedCategory": {
        "id": 1,
        "name": "Research"
      },
      "suggestedTags": ["tag1", "tag2"],
      "adminNotes": null,
      "createdAt": "2025-10-29T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 5
  }
}
```

### Get Contribution Status

Get detailed status of a specific contribution.

**Endpoint**: `GET /api/resources/contributions/:id`

**Authentication**: Required (must be contribution owner or admin)

**Path Parameters**:
- `id` (integer, required): Contribution ID

**Example Response**:

```json
{
  "success": true,
  "data": {
    "id": 201,
    "title": "New Resource Title",
    "description": "Detailed description...",
    "url": "https://example.com/resource",
    "status": "approved",
    "suggestedCategory": {
      "id": 1,
      "name": "Research"
    },
    "suggestedTags": ["tag1", "tag2"],
    "adminNotes": "Great resource! Added to library.",
    "reviewedBy": {
      "id": 1,
      "name": "Admin User"
    },
    "reviewedAt": "2025-10-29T15:00:00Z",
    "createdAt": "2025-10-29T10:30:00Z"
  }
}
```

---

## Suggestion Endpoints

### Get Step Suggestions

Get contextually relevant resources for an action plan step.

**Endpoint**: `GET /api/resources/suggestions/step/:stepId`

**Authentication**: Required

**Path Parameters**:
- `stepId` (string, required): Action plan step ID

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| analysisId | integer | Yes | Gap analysis ID |
| limit | integer | No | Max resources to return (default: 3) |

**Example Request**:

```bash
GET /api/resources/suggestions/step/step-1?analysisId=123&limit=3
```

**Example Response**:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Customer Interview Script Template",
      "description": "Comprehensive template...",
      "url": "https://example.com/template",
      "category": {
        "id": 1,
        "name": "Research"
      },
      "averageRating": 4.5,
      "relevanceScore": 0.92,
      "matchReason": "Highly relevant for customer research phase"
    }
  ]
}
```

### Get Analysis Suggestions

Get resource recommendations for an entire gap analysis.

**Endpoint**: `GET /api/resources/suggestions/analysis/:analysisId`

**Authentication**: Required

**Path Parameters**:
- `analysisId` (integer, required): Gap analysis ID

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| phase | string | No | Filter by specific phase |
| limit | integer | No | Max resources per phase (default: 5) |

**Example Request**:

```bash
GET /api/resources/suggestions/analysis/123?phase=research
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "research": [
      {
        "id": 1,
        "title": "Customer Interview Script Template",
        "description": "Comprehensive template...",
        "relevanceScore": 0.92
      }
    ],
    "validation": [
      {
        "id": 5,
        "title": "MVP Testing Framework",
        "description": "Framework for testing...",
        "relevanceScore": 0.88
      }
    ]
  }
}
```

### Get Personalized Recommendations

Get personalized resource recommendations based on user activity.

**Endpoint**: `GET /api/resources/recommendations`

**Authentication**: Required

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| analysisId | integer | No | Context from specific analysis |
| limit | integer | No | Max resources to return (default: 10) |

**Example Response**:

```json
{
  "success": true,
  "data": [
    {
      "id": 8,
      "title": "Recommended Resource",
      "description": "Based on your activity...",
      "recommendationReason": "Users with similar analyses found this helpful",
      "averageRating": 4.7
    }
  ]
}
```

---

## Admin Endpoints

All admin endpoints require admin role authentication.

### Create Resource

Create a new resource (admin only).

**Endpoint**: `POST /api/admin/resources`

**Authentication**: Required (Admin)

**Request Body**:

```json
{
  "title": "New Resource",
  "description": "Detailed description...",
  "url": "https://example.com/resource",
  "resourceType": "template",
  "categoryId": 1,
  "phaseRelevance": ["research", "validation"],
  "ideaTypes": ["software"],
  "difficultyLevel": "beginner",
  "estimatedTimeMinutes": 30,
  "isPremium": false,
  "tags": ["tag1", "tag2"],
  "metadata": {
    "templateVariables": ["idea_title"]
  }
}
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "id": 50,
    "title": "New Resource",
    "status": "active",
    "createdAt": "2025-10-29T10:30:00Z"
  }
}
```

### Update Resource

Update an existing resource (admin only).

**Endpoint**: `PATCH /api/admin/resources/:id`

**Authentication**: Required (Admin)

**Path Parameters**:
- `id` (integer, required): Resource ID

**Request Body**: (partial update supported)

```json
{
  "title": "Updated Title",
  "description": "Updated description"
}
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "id": 50,
    "title": "Updated Title",
    "updatedAt": "2025-10-29T11:00:00Z"
  }
}
```

### Delete Resource

Delete a resource (admin only).

**Endpoint**: `DELETE /api/admin/resources/:id`

**Authentication**: Required (Admin)

**Path Parameters**:
- `id` (integer, required): Resource ID

**Example Response**:

```json
{
  "success": true,
  "message": "Resource deleted successfully"
}
```

### Get Pending Contributions

Get all pending contributions for review (admin only).

**Endpoint**: `GET /api/admin/resources/contributions/pending`

**Authentication**: Required (Admin)

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | integer | No | Page number |
| limit | integer | No | Items per page |
| sortBy | string | No | Sort by: date, category |

**Example Response**:

```json
{
  "success": true,
  "data": [
    {
      "id": 201,
      "title": "Pending Resource",
      "description": "Description...",
      "url": "https://example.com/resource",
      "status": "pending",
      "submittedBy": {
        "id": 15,
        "name": "John Doe",
        "email": "john@example.com"
      },
      "createdAt": "2025-10-29T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 8
  }
}
```

### Approve Contribution

Approve a contribution and add to library (admin only).

**Endpoint**: `POST /api/admin/resources/contributions/:id/approve`

**Authentication**: Required (Admin)

**Path Parameters**:
- `id` (integer, required): Contribution ID

**Request Body**:

```json
{
  "resourceData": {
    "title": "Approved Resource",
    "description": "Updated description...",
    "categoryId": 1,
    "phaseRelevance": ["research"],
    "difficultyLevel": "beginner"
  },
  "adminNotes": "Great contribution! Added to library."
}
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "contributionId": 201,
    "resourceId": 51,
    "status": "approved"
  },
  "message": "Contribution approved and added to library"
}
```

### Reject Contribution

Reject a contribution (admin only).

**Endpoint**: `POST /api/admin/resources/contributions/:id/reject`

**Authentication**: Required (Admin)

**Path Parameters**:
- `id` (integer, required): Contribution ID

**Request Body**:

```json
{
  "reason": "Resource already exists in library. See resource #15."
}
```

**Example Response**:

```json
{
  "success": true,
  "message": "Contribution rejected. User has been notified."
}
```

### Get Resource Analytics

Get detailed analytics for a resource (admin only).

**Endpoint**: `GET /api/admin/resources/:id/analytics`

**Authentication**: Required (Admin)

**Path Parameters**:
- `id` (integer, required): Resource ID

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | Yes | Start date (YYYY-MM-DD) |
| endDate | string | Yes | End date (YYYY-MM-DD) |

**Example Request**:

```bash
GET /api/admin/resources/1/analytics?startDate=2025-10-01&endDate=2025-10-29
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "resourceId": 1,
    "dateRange": {
      "start": "2025-10-01",
      "end": "2025-10-29"
    },
    "metrics": {
      "totalViews": 1250,
      "uniqueUsers": 892,
      "bookmarks": 89,
      "downloads": 234,
      "externalClicks": 567,
      "averageTimeSpent": 180
    },
    "trends": [
      {
        "date": "2025-10-01",
        "views": 45,
        "uniqueUsers": 32
      }
    ],
    "topReferrers": [
      {
        "source": "action_plan",
        "count": 450
      },
      {
        "source": "search",
        "count": 320
      }
    ]
  }
}
```

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | INVALID_REQUEST | Invalid request parameters |
| 401 | UNAUTHORIZED | Authentication required |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource already exists |
| 422 | VALIDATION_ERROR | Validation failed |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

### Example Error Responses

**Validation Error**:

```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "fields": {
      "title": "Title is required",
      "url": "Invalid URL format"
    }
  }
}
```

**Not Found**:

```json
{
  "success": false,
  "error": "Resource not found",
  "code": "NOT_FOUND"
}
```

**Unauthorized**:

```json
{
  "success": false,
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

---

## Response Formats

### Success Response

```json
{
  "success": true,
  "data": {},
  "message": "Optional success message"
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Empty Response

```json
{
  "success": true,
  "data": [],
  "message": "No resources found"
}
```

---

## Changelog

### Version 1.0 (October 2025)
- Initial API release
- Resource CRUD operations
- Bookmark management
- Rating and review system
- Contribution workflow
- Contextual suggestions
- Admin endpoints

---

## Support

For API support and questions:
- **Email**: api-support@unbuilt.one
- **Documentation**: https://docs.unbuilt.one
- **Status Page**: https://status.unbuilt.one

---

**Last Updated**: October 29, 2025  
**API Version**: 1.0  
**Maintained By**: Unbuilt Platform Team
