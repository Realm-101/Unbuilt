# Service Documentation

This document provides comprehensive documentation for all active services in the application.

---

## Table of Contents

1. [Perplexity Service](#perplexity-service)
2. [Service Status Overview](#service-status-overview)

---

## Perplexity Service

**File:** `server/services/perplexity.ts`  
**Status:** ✅ Active  
**Version:** 1.0  
**Last Updated:** October 2025

### Overview

The Perplexity service provides real-time market research and trend analysis using the Perplexity AI API. It's designed to discover untapped business opportunities and market gaps by leveraging Perplexity's online search capabilities and AI analysis.

### Purpose

- Identify market gaps and business opportunities
- Analyze market trends and consumer needs
- Provide structured, actionable market intelligence
- Support the gap analysis feature with real-time data

### Architecture

```
┌─────────────────┐
│   API Route     │
│  /api/search    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Gemini Service │
│  analyzeGaps()  │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ Perplexity Service  │
│ discoverMarketGaps()│
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Perplexity AI API  │
│  (External Service) │
└─────────────────────┘
```

### API Reference

#### `discoverMarketGaps(query: string): Promise<MarketGap[]>`

Discovers market gaps and business opportunities based on a search query.

**Parameters:**
- `query` (string) - The market research query or topic to analyze

**Returns:**
- `Promise<MarketGap[]>` - Array of market gap opportunities

**Example:**
```typescript
import { discoverMarketGaps } from './services/perplexity';

const gaps = await discoverMarketGaps('AI-powered healthcare solutions');

console.log(gaps);
// [
//   {
//     title: "AI Health Companion for Chronic Conditions",
//     description: "24/7 AI-powered health monitoring...",
//     category: "Tech That's Missing",
//     feasibility: "high",
//     marketPotential: "high",
//     innovationScore: 8,
//     marketSize: "$4.2B",
//     gapReason: "Privacy concerns and regulatory approval...",
//     targetAudience: "Chronic disease patients...",
//     keyTrends: ["Aging population", "AI in healthcare"]
//   }
// ]
```

### Data Types

#### `MarketGap` Interface

```typescript
export interface MarketGap {
  title: string;                                    // Name of the opportunity
  description: string;                              // Detailed explanation
  category: string;                                 // Category classification
  feasibility: 'high' | 'medium' | 'low';          // Technical feasibility
  marketPotential: 'high' | 'medium' | 'low';      // Market opportunity size
  innovationScore: number;                          // 1-10 innovation rating
  marketSize: string;                               // TAM estimate (e.g., "$2.3B")
  gapReason: string;                                // Why it doesn't exist yet
  competitors?: string[];                           // Optional: Existing competitors
  targetAudience?: string;                          // Optional: Target users
  keyTrends?: string[];                             // Optional: Supporting trends
}
```

#### Categories

The service classifies opportunities into four categories:
- **"Tech That's Missing"** - Technology solutions not yet built
- **"Services That Don't Exist"** - Service businesses with unmet demand
- **"Products Nobody's Made"** - Physical or digital products needed
- **"Business Models"** - New ways to monetize or deliver value

### Configuration

#### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PERPLEXITY_API_KEY` | Optional | API key for Perplexity AI service |

**Setup:**
```bash
# Add to .env file
PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

**Getting an API Key:**
1. Visit [Perplexity AI](https://www.perplexity.ai/)
2. Sign up for an API account
3. Generate an API key from the dashboard
4. Add the key to your environment configuration

#### API Configuration

The service uses the following Perplexity API settings:
- **Model:** `llama-3.1-sonar-large-128k-online`
- **Endpoint:** `https://api.perplexity.ai/chat/completions`
- **Temperature:** 0.7
- **Max Tokens:** 4000
- **Search Recency:** Last month
- **Citations:** Enabled

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| axios | ^1.11.0 | HTTP client for API requests |

**Installation:**
```bash
npm install axios
```

### Error Handling

The service implements robust error handling:

1. **Missing API Key**
   - Falls back to demo data
   - Logs warning message
   - Continues operation without API

2. **API Request Failure**
   - Catches axios errors
   - Logs error details
   - Returns fallback data

3. **JSON Parse Errors**
   - Handles malformed responses
   - Cleans markdown code blocks
   - Falls back to demo data

**Example Error Handling:**
```typescript
try {
  const gaps = await discoverMarketGaps('market research query');
  // Process gaps
} catch (error) {
  console.error('Failed to discover market gaps:', error);
  // Service automatically provides fallback data
}
```

### Fallback Mechanism

When the API is unavailable or not configured, the service provides intelligent fallback data:

- **Query-Aware Fallbacks** - Returns relevant demo data based on query keywords
- **Domain-Specific Data** - Provides specialized examples for health, education, etc.
- **General Opportunities** - Includes diverse market gaps when no specific match

**Fallback Categories:**
- Health/Medical queries → Healthcare-related opportunities
- Education/Learning queries → EdTech opportunities
- General queries → Mixed category opportunities

### Performance Considerations

- **Response Time:** Typically 2-5 seconds for API calls
- **Caching:** Results are cached by the Gemini service layer
- **Rate Limiting:** Subject to Perplexity API rate limits
- **Fallback Speed:** Instant (no API call required)

### Integration Guide

#### Basic Integration

```typescript
import { discoverMarketGaps, type MarketGap } from './services/perplexity';

async function analyzeMarket(userQuery: string) {
  try {
    const opportunities = await discoverMarketGaps(userQuery);
    
    // Filter high-potential opportunities
    const highPotential = opportunities.filter(
      gap => gap.marketPotential === 'high' && gap.feasibility === 'high'
    );
    
    return highPotential;
  } catch (error) {
    console.error('Market analysis failed:', error);
    throw error;
  }
}
```

#### With Caching

```typescript
import { discoverMarketGaps } from './services/perplexity';
import { aiCache } from './services/ai-cache';

async function getCachedMarketGaps(query: string) {
  // Check cache first
  const cached = aiCache.get(query);
  if (cached) {
    return cached;
  }
  
  // Fetch fresh data
  const gaps = await discoverMarketGaps(query);
  
  // Cache results
  aiCache.set(query, gaps);
  
  return gaps;
}
```

#### With Error Recovery

```typescript
import { discoverMarketGaps } from './services/perplexity';

async function robustMarketAnalysis(query: string) {
  try {
    const gaps = await discoverMarketGaps(query);
    
    if (gaps.length === 0) {
      throw new Error('No opportunities found');
    }
    
    return {
      success: true,
      data: gaps,
      source: 'perplexity'
    };
  } catch (error) {
    console.warn('Perplexity failed, using fallback');
    
    return {
      success: false,
      data: [],
      source: 'fallback',
      error: error.message
    };
  }
}
```

### Testing

#### Unit Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { discoverMarketGaps } from './perplexity';

describe('Perplexity Service', () => {
  it('should return market gaps for valid query', async () => {
    const gaps = await discoverMarketGaps('AI healthcare');
    
    expect(gaps).toBeInstanceOf(Array);
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps[0]).toHaveProperty('title');
    expect(gaps[0]).toHaveProperty('marketSize');
  });
  
  it('should handle missing API key gracefully', async () => {
    // API key not configured in test environment
    const gaps = await discoverMarketGaps('test query');
    
    // Should return fallback data
    expect(gaps).toBeInstanceOf(Array);
    expect(gaps.length).toBeGreaterThan(0);
  });
});
```

### Monitoring

#### Key Metrics to Track

- API response time
- API success/failure rate
- Fallback usage frequency
- Cache hit rate
- Query patterns

#### Logging

The service logs important events:
```typescript
// API key missing
console.warn('⚠️ Perplexity API key not configured - using fallback data');

// API errors
console.error('Perplexity API error:', error);
console.error('Response data:', error.response?.data);

// Parse errors
console.error('Error parsing Perplexity response:', parseError);
console.error('Raw content:', content);
```

### Troubleshooting

#### Common Issues

**1. API Key Not Working**
```
Error: 401 Unauthorized
```
**Solution:** Verify API key is correct and active in Perplexity dashboard

**2. Rate Limit Exceeded**
```
Error: 429 Too Many Requests
```
**Solution:** Implement request throttling or upgrade API plan

**3. Timeout Errors**
```
Error: ETIMEDOUT
```
**Solution:** Increase axios timeout or check network connectivity

**4. Invalid JSON Response**
```
Error: Unexpected token in JSON
```
**Solution:** Service automatically handles this with fallback data

#### Debug Mode

Enable detailed logging:
```typescript
// Set environment variable
DEBUG=perplexity:*

// Or add console logs
console.log('Perplexity request:', { query, model, temperature });
console.log('Perplexity response:', response.data);
```

### Security Considerations

1. **API Key Protection**
   - Never commit API keys to version control
   - Use environment variables
   - Rotate keys periodically

2. **Input Validation**
   - Validate query strings before API calls
   - Sanitize user input
   - Limit query length

3. **Rate Limiting**
   - Implement application-level rate limiting
   - Monitor API usage
   - Set up alerts for unusual patterns

### Future Enhancements

Potential improvements for future versions:

- [ ] Add request caching at service level
- [ ] Implement retry logic with exponential backoff
- [ ] Add support for multiple Perplexity models
- [ ] Include citation tracking and source attribution
- [ ] Add streaming response support
- [ ] Implement query optimization
- [ ] Add A/B testing for different prompts
- [ ] Create analytics dashboard for service usage

### Related Services

- **Gemini Service** (`server/services/gemini.ts`) - Primary consumer, provides fallback
- **AI Cache** (`server/services/ai-cache.ts`) - Caches results to reduce API calls

### Support

For issues or questions:
- Check the [troubleshooting section](#troubleshooting)
- Review [Perplexity API documentation](https://docs.perplexity.ai/)
- Contact the development team

---

## Service Status Overview

| Service | Status | File | Purpose |
|---------|--------|------|---------|
| Perplexity | ✅ Active | `server/services/perplexity.ts` | Market gap discovery |
| Email | ⏳ Pending | `server/services/email.ts` | Email notifications |
| PDF Generator | ⏳ Pending | `server/services/pdf-generator.ts` | PDF export |

**Legend:**
- ✅ Active - Currently in use
- ⏳ Pending - Audit in progress
- ❌ Unused - Marked for removal
- 📝 Documented - Fully documented

---

**Last Updated:** October 3, 2025  
**Maintained By:** Development Team  
**Version:** 1.0
