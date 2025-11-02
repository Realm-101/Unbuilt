# Interactive AI Conversations - API Documentation

## Overview

The Conversations API enables interactive follow-up discussions with the AI about gap analyses. Users can ask questions, explore alternatives, and refine analyses through natural conversation.

## Base URL

- **Development:** `http://localhost:5000/api`
- **Production:** `https://unbuilt.one/api`

## Authentication

All conversation endpoints require JWT authentication:

```http
Authorization: Bearer <access_token>
```

## Rate Limiting

**Tier-Based Limits:**
- Free tier: 5 questions per analysis, 20 questions per day
- Pro tier: Unlimited questions per analysis
- Enterprise tier: Unlimited questions

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1704067200
X-RateLimit-Tier: free
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-15T12:30:00.000Z",
  "details": {
    "field": "Additional context"
  }
}
```

### Common Error Codes

- `CONV_RATE_LIMIT_EXCEEDED` - Question limit reached for tier
- `CONV_NOT_FOUND` - Conversation not found
- `CONV_INVALID_INPUT` - Invalid message content
- `CONV_INAPPROPRIATE_CONTENT` - Content flagged by filter
- `CONV_AI_SERVICE_ERROR` - AI service temporarily unavailable
- `CONV_CONTEXT_TOO_LARGE` - Conversation too long (auto-handled)
- `CONV_UNAUTHORIZED` - User doesn't own the analysis

## API Endpoints

### Conversation Management

#### GET /api/conversations/:analysisId

Get or create conversation for an analysis.

**Headers:** `Authorization: Bearer <access_token>`  
**Authorization:** User must own the analysis

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "conv_123",
    "analysisId": "analysis_456",
    "userId": "user_789",
    "messages": [
      {
        "id": "msg_1",
        "conversationId": "conv_123",
        "role": "user",
        "content": "What evidence supports the market demand?",
        "timestamp": "2025-01-15T12:30:00.000Z",
        "metadata": {}
      },
      {
        "id": "msg_2",
        "conversationId": "conv_123",
        "role": "assistant",
        "content": "Based on your analysis...",
        "timestamp": "2025-01-15T12:30:05.000Z",
        "metadata": {
          "tokensUsed": 450,
          "processingTime": 3200,
          "confidence": 0.92,
          "sources": ["Market Research Report 2024"]
        }
      }
    ],
    "suggestedQuestions": [
      {
        "id": "sq_1",
        "text": "How can I validate this idea with a limited budget?",
        "category": "execution_strategy",
        "priority": 95
      }
    ],
    "variantIds": ["variant_1", "variant_2"],
    "createdAt": "2025-01-15T12:00:00.000Z",
    "updatedAt": "2025-01-15T12:30:05.000Z"
  }
}
```


#### POST /api/conversations/:analysisId/messages

Send a message and get AI response.

**Headers:** `Authorization: Bearer <access_token>`  
**Rate Limit:** Based on user tier  
**Authorization:** User must own the analysis

**Request Body:**
```json
{
  "content": "How can I validate this idea with a $5,000 budget?"
}
```

**Validation:**
- Content: 1-1000 characters (Pro), 1-500 characters (Free)
- Content filtered for inappropriate language
- Prompt injection detection applied

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userMessage": {
      "id": "msg_3",
      "conversationId": "conv_123",
      "role": "user",
      "content": "How can I validate this idea with a $5,000 budget?",
      "timestamp": "2025-01-15T12:35:00.000Z"
    },
    "aiMessage": {
      "id": "msg_4",
      "conversationId": "conv_123",
      "role": "assistant",
      "content": "With a $5,000 budget, here are the most effective validation strategies...",
      "timestamp": "2025-01-15T12:35:04.000Z",
      "metadata": {
        "tokensUsed": 520,
        "processingTime": 3800,
        "confidence": 0.88,
        "sources": ["Lean Startup Methodology"],
        "assumptions": ["Assuming US market", "Assuming B2C model"]
      }
    },
    "suggestedQuestions": [
      {
        "id": "sq_2",
        "text": "What metrics should I track during validation?",
        "category": "execution_strategy",
        "priority": 92
      },
      {
        "id": "sq_3",
        "text": "Which customer segment should I target first?",
        "category": "market_validation",
        "priority": 88
      }
    ],
    "usage": {
      "questionsRemaining": 3,
      "questionsLimit": 5,
      "resetDate": "2025-02-01T00:00:00.000Z"
    }
  }
}
```

**Streaming Response (Pro/Enterprise):**

For Pro and Enterprise users, responses can be streamed:

```http
Content-Type: text/event-stream
```

```
data: {"type":"chunk","content":"With a $5,000 budget"}

data: {"type":"chunk","content":", here are the most"}

data: {"type":"chunk","content":" effective validation strategies..."}

data: {"type":"complete","metadata":{"tokensUsed":520}}
```

**Error Response (429 Too Many Requests):**
```json
{
  "error": "Rate limit exceeded",
  "code": "CONV_RATE_LIMIT_EXCEEDED",
  "details": {
    "questionsUsed": 5,
    "questionsLimit": 5,
    "resetDate": "2025-02-01T00:00:00.000Z",
    "upgradeUrl": "/pricing"
  }
}
```

#### GET /api/conversations/:conversationId/messages

Get paginated conversation messages.

**Headers:** `Authorization: Bearer <access_token>`  
**Authorization:** User must own the conversation

**Query Parameters:**
- `limit` (number, optional): Messages per page (default: 50, max: 100)
- `offset` (number, optional): Offset for pagination (default: 0)
- `order` (string, optional): Sort order - 'asc' or 'desc' (default: 'asc')

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg_1",
        "role": "user",
        "content": "What evidence supports the market demand?",
        "timestamp": "2025-01-15T12:30:00.000Z"
      },
      {
        "id": "msg_2",
        "role": "assistant",
        "content": "Based on your analysis...",
        "timestamp": "2025-01-15T12:30:05.000Z",
        "metadata": {
          "tokensUsed": 450,
          "confidence": 0.92
        }
      }
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 24,
      "hasMore": false
    }
  }
}
```

#### DELETE /api/conversations/:conversationId

Clear conversation thread while preserving analysis.

**Headers:** `Authorization: Bearer <access_token>`  
**Authorization:** User must own the conversation

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Conversation cleared successfully",
  "data": {
    "conversationId": "conv_123",
    "messagesDeleted": 24,
    "analysisPreserved": true
  }
}
```

#### POST /api/conversations/:conversationId/rate

Rate an AI response.

**Headers:** `Authorization: Bearer <access_token>`  
**Authorization:** User must own the conversation

**Request Body:**
```json
{
  "messageId": "msg_2",
  "rating": 1
}
```

**Validation:**
- messageId: Must be an assistant message in this conversation
- rating: 1 (thumbs up) or -1 (thumbs down)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Rating recorded successfully",
  "data": {
    "messageId": "msg_2",
    "rating": 1
  }
}
```

#### POST /api/conversations/:conversationId/report

Report inappropriate AI response.

**Headers:** `Authorization: Bearer <access_token>`  
**Authorization:** User must own the conversation

**Request Body:**
```json
{
  "messageId": "msg_2",
  "reason": "inaccurate",
  "details": "The response contradicts the analysis data"
}
```

**Validation:**
- messageId: Must be an assistant message
- reason: One of 'inaccurate', 'inappropriate', 'offensive', 'other'
- details: 0-500 characters, optional

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Report submitted successfully",
  "data": {
    "reportId": "report_123",
    "status": "pending_review"
  }
}
```

### Suggested Questions

#### GET /api/conversations/:conversationId/suggestions

Get suggested follow-up questions.

**Headers:** `Authorization: Bearer <access_token>`  
**Authorization:** User must own the conversation

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "id": "sq_1",
        "text": "How can I validate this idea with a limited budget?",
        "category": "execution_strategy",
        "priority": 95,
        "used": false
      },
      {
        "id": "sq_2",
        "text": "What metrics should I track during validation?",
        "category": "execution_strategy",
        "priority": 92,
        "used": false
      },
      {
        "id": "sq_3",
        "text": "Which customer segment should I target first?",
        "category": "market_validation",
        "priority": 88,
        "used": false
      }
    ],
    "categories": {
      "market_validation": 1,
      "competitive_analysis": 0,
      "execution_strategy": 2,
      "risk_assessment": 0
    }
  }
}
```

#### POST /api/conversations/:conversationId/suggestions/refresh

Generate new suggested questions based on current context.

**Headers:** `Authorization: Bearer <access_token>`  
**Rate Limit:** 10 requests per hour per user  
**Authorization:** User must own the conversation

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "id": "sq_4",
        "text": "What are the biggest risks in the first 6 months?",
        "category": "risk_assessment",
        "priority": 90,
        "used": false
      }
    ]
  }
}
```

### Analysis Variants

#### POST /api/conversations/:conversationId/variants

Create an analysis variant from refinement request.

**Headers:** `Authorization: Bearer <access_token>`  
**Rate Limit:** Based on user tier (Pro: 5 variants, Enterprise: unlimited)  
**Authorization:** User must own the conversation

**Request Body:**
```json
{
  "modifiedParameters": {
    "targetMarket": "European Union",
    "customerSegment": "Small businesses",
    "businessModel": "Subscription-based"
  },
  "reason": "Exploring EU market opportunity"
}
```

**Validation:**
- modifiedParameters: Object with at least one parameter
- reason: 0-200 characters, optional

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "variant": {
      "id": "variant_3",
      "originalAnalysisId": "analysis_456",
      "userId": "user_789",
      "modifiedParameters": {
        "targetMarket": "European Union",
        "customerSegment": "Small businesses",
        "businessModel": "Subscription-based"
      },
      "analysis": {
        "id": "analysis_789",
        "innovationScore": 87,
        "feasibilityRating": 4.1,
        "marketPotential": "High"
      },
      "conversationId": "conv_456",
      "createdAt": "2025-01-15T12:40:00.000Z"
    },
    "comparison": {
      "innovationScoreDiff": 2,
      "feasibilityRatingDiff": -0.1,
      "topGapsChanged": true,
      "competitorsChanged": true
    }
  }
}
```

**Error Response (403 Forbidden):**
```json
{
  "error": "Variant limit reached",
  "code": "CONV_VARIANT_LIMIT_EXCEEDED",
  "details": {
    "variantsUsed": 5,
    "variantsLimit": 5,
    "tier": "pro",
    "upgradeUrl": "/pricing"
  }
}
```

#### GET /api/conversations/:conversationId/variants

Get all variants for a conversation.

**Headers:** `Authorization: Bearer <access_token>`  
**Authorization:** User must own the conversation

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "original": {
      "analysisId": "analysis_456",
      "innovationScore": 85,
      "feasibilityRating": 4.2,
      "parameters": {
        "targetMarket": "North America",
        "customerSegment": "Enterprises"
      }
    },
    "variants": [
      {
        "id": "variant_1",
        "analysisId": "analysis_789",
        "innovationScore": 87,
        "feasibilityRating": 4.1,
        "modifiedParameters": {
          "targetMarket": "European Union"
        },
        "createdAt": "2025-01-15T12:40:00.000Z"
      }
    ]
  }
}
```

#### GET /api/conversations/:conversationId/variants/:variantId/compare

Compare variant with original analysis.

**Headers:** `Authorization: Bearer <access_token>`  
**Authorization:** User must own the conversation

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "comparison": {
      "innovationScore": {
        "original": 85,
        "variant": 87,
        "difference": 2,
        "percentChange": 2.35
      },
      "feasibilityRating": {
        "original": 4.2,
        "variant": 4.1,
        "difference": -0.1,
        "percentChange": -2.38
      },
      "topGaps": {
        "original": ["Gap A", "Gap B", "Gap C"],
        "variant": ["Gap A", "Gap D", "Gap E"],
        "changed": true,
        "newGaps": ["Gap D", "Gap E"],
        "removedGaps": ["Gap B", "Gap C"]
      },
      "competitors": {
        "original": ["Competitor X", "Competitor Y"],
        "variant": ["Competitor X", "Competitor Z"],
        "changed": true,
        "newCompetitors": ["Competitor Z"],
        "removedCompetitors": ["Competitor Y"]
      },
      "actionPlan": {
        "phasesChanged": true,
        "durationDiff": "2 months longer",
        "budgetDiff": "$15,000 higher"
      }
    },
    "modifiedParameters": {
      "targetMarket": "European Union",
      "customerSegment": "Small businesses"
    },
    "summary": "The EU market variant shows slightly higher innovation potential but similar feasibility. Key differences include new competitors and adjusted timeline."
  }
}
```

### Conversation Export

#### POST /api/conversations/:conversationId/export

Export conversation thread.

**Headers:** `Authorization: Bearer <access_token>`  
**Rate Limit:** 10 exports per hour per user  
**Authorization:** User must own the conversation

**Request Body:**
```json
{
  "format": "pdf",
  "includeAnalysis": true,
  "includeMetadata": false
}
```

**Validation:**
- format: One of 'pdf', 'markdown', 'json'
- includeAnalysis: boolean, default true
- includeMetadata: boolean, default false

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "exportId": "export_123",
    "format": "pdf",
    "downloadUrl": "https://unbuilt.one/api/downloads/export_123.pdf",
    "expiresAt": "2025-01-15T13:40:00.000Z",
    "fileSize": 245678
  }
}
```

**PDF Format:**
- Formatted document with Unbuilt branding
- Analysis summary at top
- Conversation thread in chronological order
- Timestamps and metadata included

**Markdown Format:**
- Plain text with markdown formatting
- Easy to copy/paste
- Compatible with most text editors

**JSON Format:**
- Raw data structure
- Includes all metadata
- Suitable for programmatic processing

### Usage Tracking

#### GET /api/conversations/usage

Get conversation usage statistics for current user.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `period` (string, optional): 'day', 'month', 'all' (default: 'month')

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "tier": "free",
    "limits": {
      "questionsPerAnalysis": 5,
      "questionsPerDay": 20,
      "variantsPerAnalysis": 0
    },
    "usage": {
      "totalQuestions": 45,
      "totalConversations": 12,
      "totalVariants": 0,
      "avgQuestionsPerConversation": 3.75,
      "totalTokensUsed": 125000,
      "estimatedCost": 0.25
    },
    "currentPeriod": {
      "questionsToday": 3,
      "questionsThisMonth": 45,
      "resetDate": "2025-02-01T00:00:00.000Z"
    },
    "topAnalyses": [
      {
        "analysisId": "analysis_456",
        "analysisTitle": "Healthcare Gap Analysis",
        "questionCount": 12,
        "lastActivity": "2025-01-15T12:40:00.000Z"
      }
    ]
  }
}
```

### Performance & Monitoring

#### GET /api/conversations/metrics

Get conversation performance metrics (Admin/Enterprise only).

**Headers:** `Authorization: Bearer <admin_access_token>`  
**Authorization:** Admin or Enterprise role required

**Query Parameters:**
- `startDate` (string, optional): ISO date string
- `endDate` (string, optional): ISO date string
- `userId` (string, optional): Filter by user

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "engagement": {
      "totalConversations": 1250,
      "activeConversations": 450,
      "adoptionRate": 0.42,
      "avgQuestionsPerConversation": 4.2,
      "returnRate": 0.78
    },
    "quality": {
      "avgResponseTime": 3.8,
      "responseRelevanceScore": 4.3,
      "errorRate": 0.018,
      "inappropriateResponseRate": 0.001
    },
    "business": {
      "conversionImpact": 2.1,
      "retentionImpact": 1.32,
      "avgCostPerConversation": 0.08,
      "apiCostEfficiency": 0.84
    },
    "usage": {
      "totalMessages": 5250,
      "totalTokens": 2500000,
      "totalCost": 100.50,
      "avgTokensPerMessage": 476
    }
  }
}
```

## WebSocket API (Real-time Streaming)

### Connection

Connect to WebSocket for real-time response streaming (Pro/Enterprise only):

**Endpoint:** `wss://unbuilt.one/ws/conversations`  
**Authentication:** JWT token in query: `?token=jwt_access_token`

### Events

**Client → Server:**

```json
{
  "type": "conversation_message",
  "conversationId": "conv_123",
  "content": "How can I validate this idea?"
}
```

**Server → Client:**

```json
{
  "type": "response_start",
  "messageId": "msg_4",
  "timestamp": "2025-01-15T12:35:00.000Z"
}
```

```json
{
  "type": "response_chunk",
  "messageId": "msg_4",
  "content": "With a $5,000 budget"
}
```

```json
{
  "type": "response_complete",
  "messageId": "msg_4",
  "metadata": {
    "tokensUsed": 520,
    "processingTime": 3800
  },
  "suggestedQuestions": [...]
}
```

```json
{
  "type": "error",
  "code": "CONV_RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded"
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
// Send a message
const response = await fetch('/api/conversations/conv_123/messages', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    content: 'How can I validate this idea with a $5,000 budget?'
  })
});

const { data } = await response.json();
console.log(data.aiMessage.content);

// Stream response (Pro/Enterprise)
const eventSource = new EventSource(
  `/api/conversations/conv_123/messages/stream?token=${accessToken}`
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'chunk') {
    console.log(data.content);
  }
};
```

### Python

```python
import requests

# Send a message
response = requests.post(
    'https://unbuilt.one/api/conversations/conv_123/messages',
    headers={'Authorization': f'Bearer {access_token}'},
    json={'content': 'How can I validate this idea with a $5,000 budget?'}
)

data = response.json()
print(data['data']['aiMessage']['content'])

# Create a variant
variant_response = requests.post(
    'https://unbuilt.one/api/conversations/conv_123/variants',
    headers={'Authorization': f'Bearer {access_token}'},
    json={
        'modifiedParameters': {
            'targetMarket': 'European Union'
        }
    }
)
```

### cURL

```bash
# Send a message
curl -X POST https://unbuilt.one/api/conversations/conv_123/messages \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"How can I validate this idea with a $5,000 budget?"}'

# Get conversation
curl -X GET https://unbuilt.one/api/conversations/analysis_456 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Create variant
curl -X POST https://unbuilt.one/api/conversations/conv_123/variants \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"modifiedParameters":{"targetMarket":"European Union"}}'
```

## Best Practices

### Rate Limiting
- Implement exponential backoff for rate limit errors
- Cache suggested questions to reduce API calls
- Monitor usage to avoid hitting limits

### Error Handling
- Always handle rate limit errors gracefully
- Implement retry logic for transient errors
- Show clear error messages to users

### Performance
- Use streaming for better perceived performance (Pro/Enterprise)
- Implement client-side caching for conversations
- Paginate message history for long conversations

### Security
- Never log message content
- Validate all inputs client-side
- Handle inappropriate content errors gracefully
- Respect user privacy in analytics

## Support

- **API Issues:** Create an issue on GitHub
- **Security Concerns:** Email security@unbuilt.one
- **Documentation:** Visit [docs.unbuilt.one](https://docs.unbuilt.one)
- **Live Demo:** Test at [unbuilt.one](https://unbuilt.one)

---

**Last Updated:** October 28, 2025  
**API Version:** 1.0  
**Feature Status:** Production Ready
