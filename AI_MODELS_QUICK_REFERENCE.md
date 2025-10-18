# AI Models - Quick Reference Card

## Current Configuration (Updated ✅)

| Service | Model | Use Case | Cost | Status |
|---------|-------|----------|------|--------|
| **Perplexity** | `sonar-pro` | Market gap discovery (real-time web search) | ~$3-5/1M tokens | ✅ Updated |
| **Gemini** | `gemini-2.5-pro-latest` | Fallback analysis, deep reasoning | ~$1.25-5/1M tokens | ✅ Updated |
| **Grok (xAI)** | `grok-beta` | Business plans, market research | ~$2-3/1M tokens | ✅ Updated |
| **OpenAI** | N/A | Not currently used | N/A | - |

---

## When Each Model is Used

### Perplexity `sonar-pro`
**File:** `server/services/perplexity.ts`
**Triggered by:** User searches for market opportunities
**Purpose:** Real-time market gap discovery
**Example:** "Find untapped opportunities in healthcare"

### Gemini `gemini-2.5-pro-latest`
**File:** `server/services/gemini.ts`
**Triggered by:** Perplexity fails OR as fallback
**Purpose:** Comprehensive market analysis
**Example:** Analyzing complex market dynamics

### Grok `grok-beta`
**File:** `server/services/xai.ts`
**Triggered by:** User requests business plan or market research
**Purpose:** Structured business content generation
**Example:** "Generate business plan for this idea"

---

## API Keys Required

```bash
# .env file
PERPLEXITY_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
XAI_API_KEY=your_key_here
```

---

## Quick Troubleshooting

### Perplexity Issues
- **Error:** "Model not found"
  - **Fix:** Verify model name is `sonar-pro`
- **Error:** "Invalid API key"
  - **Fix:** Check PERPLEXITY_API_KEY in .env

### Gemini Issues
- **Error:** "Model not found"
  - **Fix:** Verify model name is `gemini-2.5-pro-latest`
- **Error:** "Quota exceeded"
  - **Fix:** Check Google Cloud quota limits

### Grok Issues
- **Error:** "Model not found"
  - **Fix:** Verify model name is `grok-beta`
- **Error:** "Rate limit exceeded"
  - **Fix:** Implement rate limiting or upgrade tier

---

## Cost Estimates (Per 1,000 Searches)

Assuming 5,000 tokens per search (3k input + 2k output):

| Model | Cost per 1M tokens | Cost per 1,000 searches |
|-------|-------------------|------------------------|
| Perplexity sonar-pro | $4 | $20 |
| Gemini 2.5 Pro | $3 | $15 |
| Grok beta | $2.50 | $12.50 |

**Total estimated monthly cost (1,000 searches):** ~$25-30

---

## Model Comparison

| Feature | Perplexity | Gemini 2.5 Pro | Grok beta |
|---------|-----------|----------------|-----------|
| Real-time web search | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Deep reasoning | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Structured output | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Cost efficiency | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Speed | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## Future Updates to Monitor

### Perplexity
- Watch for new Sonar model releases
- Monitor Search API improvements
- Check for pricing changes

### Gemini
- Gemini 2.5 Flash (cheaper alternative)
- Gemini 3.0 (when released)
- Search capability improvements

### Grok
- **grok-4-fast-search** (coming soon - switch when available)
- Vision capabilities
- Pricing tier changes

---

## Rollback Commands (Emergency Only)

If you need to quickly rollback:

```typescript
// Perplexity (NOT RECOMMENDED - deprecated)
model: 'llama-3.1-sonar-large-128k-online'

// Gemini (NOT RECOMMENDED - deprecated)
model: 'gemini-2.0-flash-exp'

// Grok (OK for temporary rollback)
model: 'grok-2-1212'
```

---

## Testing Checklist

- [ ] Test market gap search with Perplexity
- [ ] Verify Gemini fallback works
- [ ] Test business plan generation with Grok
- [ ] Check all JSON parsing works
- [ ] Monitor response times
- [ ] Verify costs are as expected

---

## Support Links

- **Perplexity:** https://docs.perplexity.ai
- **Gemini:** https://ai.google.dev/gemini-api/docs
- **Grok:** https://docs.x.ai
- **Status Pages:** Check respective provider status pages

---

## Last Updated
Date: January 2025
Updated by: AI Model Migration
Next review: April 2025
