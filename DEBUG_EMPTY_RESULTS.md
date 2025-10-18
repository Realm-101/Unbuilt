# Debugging Empty Search Results

## What I Added

I've added extensive logging throughout the search pipeline to help us identify where the issue is:

### 1. Search Endpoint (`server/routes.ts`)
- Logs when search starts
- Logs cache hits/misses
- Logs number of gaps returned from `analyzeGaps`
- Logs filter application
- Logs database record creation

### 2. Perplexity Service (`server/services/perplexity.ts`)
- Logs API key status
- Logs API calls and responses
- Logs parsing attempts
- Logs fallback data usage

### 3. Gemini Service (`server/services/gemini.ts`)
- Logs cache checks
- Logs Perplexity results
- Logs fallback to Gemini
- Logs demo data returns

## How to Debug

### Step 1: Watch Server Console
1. Open your terminal where the server is running
2. Perform a search in the browser
3. Watch for log messages with these emojis:
   - 🔍 = Search/API calls starting
   - ✅ = Success
   - ❌ = Errors
   - ⚠️ = Warnings
   - 📦 = Fallback data
   - 💾 = Caching
   - 📝 = Data processing

### Step 2: Expected Log Flow

**Normal flow with Perplexity:**
```
🔍 Starting search for query: "your query" by user X
⏳ Cache miss, calling analyzeGaps for: your query
🔍 Using Perplexity AI for market gap discovery: your query
🔍 discoverMarketGaps called with query: "your query"
🔑 PERPLEXITY_API_KEY configured: true
📡 Calling Perplexity API...
✅ Perplexity API responded
📝 Perplexity content length: XXXX characters
🧹 Cleaned content (first 200 chars): [...]
✅ Parsed X gaps from Perplexity response
✅ Returning X cleaned gaps from Perplexity
✅ Perplexity returned X results
💾 Cached X Perplexity results
✅ Returning X results from Perplexity
✅ analyzeGaps returned X gaps
📝 Creating search record with X gaps
✅ Created X search results for search ID Y
```

**If Perplexity fails:**
```
❌ Perplexity API error: [error details]
Response status: XXX
Response data: [error data]
📦 Returning X fallback gaps after API error
```

**If no API keys:**
```
⚠️ Perplexity API key not configured - using fallback data
📦 Returning X fallback gaps
```

### Step 3: Common Issues to Look For

1. **API Key Not Loaded**
   - Look for: `🔑 PERPLEXITY_API_KEY configured: false`
   - Fix: Check `.env` file and restart server

2. **API Error**
   - Look for: `❌ Perplexity API error`
   - Check the error message and status code
   - Common issues:
     - 401: Invalid API key
     - 429: Rate limit exceeded
     - 500: API service error

3. **Parsing Error**
   - Look for: `❌ Error parsing Perplexity response`
   - The API returned invalid JSON
   - Should fall back to demo data

4. **Empty Response**
   - Look for: `✅ analyzeGaps returned 0 gaps`
   - This means the API returned an empty array
   - Check if filters are too restrictive

5. **Database Issue**
   - Look for: `✅ Created 0 search results`
   - Gaps were found but not saved to database
   - Check database connection

### Step 4: Share the Logs

Once you perform a search, copy the relevant log output from your server console and share it. Look for the section starting with:
```
🔍 Starting search for query: "..."
```

And ending with:
```
✅ Created X search results for search ID Y
```

This will tell us exactly where the problem is!

## Quick Test

Try searching for something simple like "AI tools" and watch the logs. The logs will show us:
1. Is the API being called?
2. Is it returning data?
3. Is the data being parsed correctly?
4. Is it being saved to the database?
5. Is it being returned to the client?
