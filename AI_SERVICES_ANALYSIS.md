# AI Services Analysis & Recommendations

## Current State

### 1. Perplexity AI
**Current Model:** `llama-3.1-sonar-large-128k-online` (DEPRECATED as of Feb 22, 2025)
**Usage:** Market gap discovery with real-time web search
**File:** `server/services/perplexity.ts`

### 2. Google Gemini
**Current Model:** `gemini-2.0-flash-exp` (DEPRECATED)
**Usage:** Fallback for market gap analysis when Perplexity fails
**File:** `server/services/gemini.ts`

### 3. xAI (Grok)
**Current Model:** `grok-2-1212` (OLD - from December 2024)
**Usage:** Business plan generation and market research
**File:** `server/services/xai.ts`

### 4. OpenAI
**Status:** Not currently used in the codebase
**Note:** Keep as-is for now

---

## Recommendations

### 1. Perplexity AI - NEEDS DECISION ⚠️

**Problem:** The discontinued model was used for real-time web search capabilities, which is critical for market gap discovery.

**Current Perplexity Options (as of 2025):**

#### Option A: Use Sonar Models (Recommended)
Perplexity now offers "Sonar" models specifically designed for web-grounded responses:
- **sonar** - Latest general-purpose model with web search
- **sonar-pro** - Enhanced reasoning with web search
- **sonar-reasoning** - Advanced reasoning capabilities

**Recommendation:** Use `sonar-pro` for market gap discovery
- Best balance of web search + reasoning
- Real-time data access (critical for market trends)
- Better structured outputs than basic sonar

#### Option B: Switch to Search API
Perplexity now has a dedicated Search API that returns ranked web results
- More control over search results
- Can combine with your own LLM for analysis
- May be more cost-effective

#### Option C: Remove Perplexity Entirely
**Consider if:**
- Cost is a major concern
- You don't need real-time web data
- Gemini 2.5 Pro can handle the analysis with its built-in search

**My Recommendation:** 
**Use `sonar-pro` model** - It maintains the real-time web search capability that was the original reason for using Perplexity, with improved reasoning over the deprecated model.

---

### 2. Google Gemini - UPGRADE REQUIRED ✅

**Current:** `gemini-2.0-flash-exp` (deprecated)
**Recommended:** `gemini-2.5-pro-latest`

**Why Gemini 2.5 Pro:**
- Much better reasoning and analysis capabilities
- Handles complex market analysis tasks
- Better structured output generation
- More reliable for business-critical tasks
- Flash models are too lightweight for comprehensive gap analysis

**Alternative:** `gemini-2.5-flash-latest` if cost is critical
- But this is NOT recommended for your use case
- Flash is for simple, fast tasks
- Your market analysis needs deep reasoning

**Action Required:** Update model name in `server/services/gemini.ts`

---

### 3. xAI (Grok) - UPGRADE REQUIRED ✅

**Current:** `grok-2-1212` (December 2024 - outdated)
**Recommended:** `grok-beta` or wait for `grok-4-fast-search`

**Current Grok Models (as of early 2025):**
- **grok-beta** - Latest production model
- **grok-vision-beta** - With vision capabilities
- **grok-4-fast-search** - Coming soon (you mentioned this)

**My Recommendation:**
1. **Immediate:** Switch to `grok-beta` (latest stable)
2. **Future:** Monitor for `grok-4-fast-search` release and switch when available

**Why Grok for Business Plans:**
- Good at structured, analytical content
- Strong reasoning capabilities
- Cost-effective for long-form generation

**Action Required:** Update model name in `server/services/xai.ts`

---

## Implementation Priority

### High Priority (Do Now)
1. ✅ **Gemini:** Update to `gemini-2.5-pro-latest`
2. ✅ **Grok:** Update to `grok-beta`

### Medium Priority (Decide & Implement)
3. ⚠️ **Perplexity:** Choose between:
   - `sonar-pro` (recommended)
   - Search API + own LLM
   - Remove entirely

---

## Cost Considerations

### Perplexity Pricing (approximate)
- **sonar:** ~$1-3 per 1M tokens
- **sonar-pro:** ~$3-5 per 1M tokens
- **Search API:** Pay per search request

### Gemini Pricing
- **2.5 Pro:** ~$1.25 per 1M input tokens, $5 per 1M output
- **2.5 Flash:** ~$0.075 per 1M input tokens (much cheaper but less capable)

### Grok Pricing
- **grok-beta:** Competitive with GPT-4 class models
- Exact pricing varies by usage tier

**Cost Optimization Strategy:**
1. Use Gemini 2.5 Pro as primary (good balance)
2. Use Perplexity sonar-pro only when real-time web data is critical
3. Use Grok for long-form content generation (business plans)

---

## Recommended Architecture

```
User Query
    ↓
┌─────────────────────────────────────┐
│  Primary: Perplexity sonar-pro      │
│  (Real-time market gap discovery)   │
└─────────────────────────────────────┘
    ↓ (if fails)
┌─────────────────────────────────────┐
│  Fallback: Gemini 2.5 Pro           │
│  (Comprehensive analysis)           │
└─────────────────────────────────────┘
    ↓ (if fails)
┌─────────────────────────────────────┐
│  Last Resort: Demo Data             │
└─────────────────────────────────────┘

For Business Plans:
┌─────────────────────────────────────┐
│  Primary: Grok beta                 │
│  (Structured business content)      │
└─────────────────────────────────────┘
```

---

## Action Items

### ✅ Changes Completed:

1. **✅ Updated Gemini Model** (`server/services/gemini.ts`)
   ```typescript
   // Changed from:
   model: "gemini-2.0-flash-exp"
   // To:
   model: "gemini-2.5-pro-latest"
   ```

2. **✅ Updated Grok Model** (`server/services/xai.ts`)
   ```typescript
   // Changed from:
   model: 'grok-2-1212'
   // To:
   model: 'grok-beta'
   ```

3. **✅ Updated Perplexity Model** (`server/services/perplexity.ts`)
   ```typescript
   // Changed from:
   model: 'llama-3.1-sonar-large-128k-online'
   // To:
   model: 'sonar-pro'  // Using recommended model
   ```

### Testing Required:
- [ ] Test market gap discovery with new Perplexity sonar-pro model
- [ ] Verify Gemini 2.5 Pro output quality and response times
- [ ] Validate Grok beta business plan generation
- [ ] Check API response formats haven't changed
- [ ] Monitor costs with new models (should be similar or better)
- [ ] Test fallback mechanisms still work correctly
- [ ] Verify JSON parsing still works with new model outputs

---

## Why These Models Were Originally Chosen

### Perplexity (llama-3.1-sonar-large-128k-online)
- **Real-time web search** - Critical for current market data
- **Large context window** (128k tokens)
- **Online mode** - Access to latest information
- This was a good choice at the time, but it's now deprecated

### Gemini Flash
- **Fast and cheap** - Good for fallback
- **But:** Too lightweight for complex market analysis
- Should have been Pro from the start for this use case

### Grok 2
- **Good reasoning** - Suitable for business plans
- **But:** Now outdated, newer models available

---

## Final Recommendations Summary

1. **Perplexity:** Switch to `sonar-pro` (maintains real-time web search advantage)
2. **Gemini:** Upgrade to `gemini-2.5-pro-latest` (much better for complex analysis)
3. **Grok:** Update to `grok-beta` (latest stable, monitor for grok-4-fast-search)
4. **OpenAI:** Keep as-is (not currently used)

**Total Estimated Implementation Time:** 30-60 minutes
**Risk Level:** Low (all changes are model name updates with similar APIs)
**Testing Time:** 2-3 hours to validate all flows
