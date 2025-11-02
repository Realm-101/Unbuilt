# Design Document - Fix Remaining Test Failures

## Overview

This design outlines the approach to fix the 16 failing tests across 5 test files. The strategy focuses on understanding the root cause of each failure, fixing the underlying code issue, and verifying the fix doesn't break other tests.

## Architecture

### Problem Analysis Workflow

```
┌─────────────────────────────────────────────────────────┐
│              1. Identify Failure                         │
│  (Read test, understand expectation)                    │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│           2. Analyze Root Cause                          │
│  (Debug code, trace execution)                          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│              3. Design Fix                               │
│  (Plan code changes)                                    │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│            4. Implement Fix                              │
│  (Modify source code)                                   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│             5. Verify Fix                                │
│  (Run tests, check for regressions)                     │
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Authentication Middleware (2 failures)

**File:** `server/middleware/__tests__/auth.test.ts`

**Failure 1: No session cookie**
```typescript
// Current behavior: Throws error "Cannot read properties of undefined (reading 'cookie')"
// Expected behavior: Returns 401 with error message

// Root cause: Mock request object missing cookie property
// Fix: Update mock request creation to include cookie property
```

**Failure 2: Invalid session**
```typescript
// Current behavior: Returns debug information in response
// Expected behavior: Returns clean error without debug info

// Root cause: Error handler includes debug information
// Fix: Remove debug information from error responses in production
```

**Solution:**
```typescript
// server/__tests__/mocks/express.ts
export function createMockRequest(overrides?: Partial<Request>): Request {
  return {
    cookies: {},  // Add cookies property
    headers: {},
    body: {},
    query: {},
    params: {},
    ...overrides
  } as Request;
}

// server/middleware/auth.ts
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Ensure cookies object exists
  if (!req.cookies) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Don't include debug info in production
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
    // Remove: , debug: { ... }
  }
}
```

### 2. Error Handler Integration (1 failure)

**File:** `server/middleware/__tests__/errorHandler.integration.test.ts`

**Failure: System error status code**
```typescript
// Current behavior: Returns 503 "Service Unavailable"
// Expected behavior: Returns 500 "Internal Server Error"

// Root cause: Error handler using wrong status code for system errors
// Fix: Update error handler to use 500 for system errors
```

**Solution:**
```typescript
// server/middleware/errorHandler.ts
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // System errors should be 500, not 503
  if (err.name === 'SystemError') {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'A system error occurred'
    });
  }
}
```

### 3. Input Validator Service (3 failures)

**File:** `server/__tests__/unit/services/inputValidator.test.ts`

**Failure 1: HTML tag removal**
```typescript
// Current behavior: HTML tags not completely removed
// Expected behavior: All HTML tags removed

// Root cause: Regex pattern not matching all HTML tags
// Fix: Improve HTML sanitization regex
```

**Failure 2: Whitespace normalization**
```typescript
// Current behavior: Newlines not preserved
// Expected behavior: Newlines preserved, other whitespace normalized

// Root cause: Regex replacing all whitespace including newlines
// Fix: Update regex to preserve newlines
```

**Failure 3: Event handler detection**
```typescript
// Current behavior: Event handlers not flagged as high risk
// Expected behavior: Event handlers flagged as high risk

// Root cause: Risk assessment logic not checking for event handlers
// Fix: Add event handler detection to risk assessment
```

**Solution:**
```typescript
// server/services/inputValidator.ts

export function removeHTMLTags(input: string): string {
  // Improved regex to match all HTML tags
  return input.replace(/<[^>]*>/g, '');
}

export function normalizeWhitespace(input: string): string {
  // Preserve newlines, normalize other whitespace
  return input
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .join('\n');
}

export function assessRisk(input: string): 'low' | 'medium' | 'high' {
  // Check for event handlers
  const eventHandlerPattern = /on\w+\s*=/i;
  if (eventHandlerPattern.test(input)) {
    return 'high';
  }
  
  // Other risk checks...
  return 'low';
}
```

### 4. Query Deduplication Service (6 failures)

**File:** `server/__tests__/unit/services/queryDeduplication.test.ts`

**Root Cause Analysis:**
- Similarity algorithm not meeting threshold (0.74 < 0.8)
- History search not finding similar queries
- Checking more than 10 messages
- Cost savings tracking incorrect
- Hit rate calculation incorrect

**Solution Approach:**
1. **Improve similarity algorithm** - Adjust weights or use better algorithm
2. **Fix history search** - Ensure similar queries are found
3. **Limit message check** - Only check last 10 messages
4. **Fix statistics** - Correct cost savings and hit rate calculations

**Similarity Algorithm Options:**
```typescript
// Option 1: Adjust threshold (easier)
const SIMILARITY_THRESHOLD = 0.75; // Lower from 0.8

// Option 2: Improve algorithm (better)
export function calculateSimilarity(query1: string, query2: string): number {
  // Use Levenshtein distance with better normalization
  const normalized1 = normalizeQuery(query1);
  const normalized2 = normalizeQuery(query2);
  
  // Calculate similarity with improved algorithm
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);
  const similarity = 1 - (distance / maxLength);
  
  // Apply boost for semantic similarity
  const semanticBoost = calculateSemanticSimilarity(query1, query2);
  
  return Math.min(1, similarity * 0.7 + semanticBoost * 0.3);
}

function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .trim();
}
```

**History Search Fix:**
```typescript
export function findSimilarQuery(query: string, history: Query[]): Query | null {
  // Only check last 10 user messages
  const recentHistory = history.slice(-10);
  
  for (const historicalQuery of recentHistory) {
    const similarity = calculateSimilarity(query, historicalQuery.text);
    if (similarity >= SIMILARITY_THRESHOLD) {
      return historicalQuery;
    }
  }
  
  return null;
}
```

**Statistics Fix:**
```typescript
export class QueryDeduplicationService {
  private costSavings = 0;
  private totalQueries = 0;
  private deduplicatedQueries = 0;
  
  trackCostSavings(saved: boolean) {
    this.totalQueries++;
    if (saved) {
      this.deduplicatedQueries++;
      this.costSavings++;
    }
  }
  
  getHitRate(): number {
    if (this.totalQueries === 0) return 0;
    return this.deduplicatedQueries / this.totalQueries;
  }
  
  getCostSavings(): number {
    return this.costSavings;
  }
}
```

### 5. Question Generator Service (4 failures)

**File:** `server/__tests__/unit/services/questionGenerator.test.ts`

**Root Cause Analysis:**
- Generating 4 questions instead of 5
- Risk assessment questions not boosted for low feasibility
- Duplicate removal not working
- Existing question filtering not working

**Solution:**
```typescript
// server/services/questionGenerator.ts

export function generateInitialQuestions(context: Context): Question[] {
  const questions: Question[] = [];
  
  // Generate exactly 5 questions
  questions.push(generateMarketQuestion(context));
  questions.push(generateCompetitionQuestion(context));
  questions.push(generateFeasibilityQuestion(context));
  questions.push(generateRiskQuestion(context));
  questions.push(generateOpportunityQuestion(context));
  
  return questions;
}

export function boostRiskQuestions(questions: Question[], feasibility: number): Question[] {
  // If feasibility is low, boost risk assessment questions
  if (feasibility < 0.5) {
    return questions.map(q => {
      if (q.category === 'risk') {
        return { ...q, priority: q.priority + 2 };
      }
      return q;
    });
  }
  return questions;
}

export function removeDuplicates(questions: Question[]): Question[] {
  const seen = new Set<string>();
  return questions.filter(q => {
    const key = q.text.toLowerCase().trim();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function filterExisting(questions: Question[], existing: Question[]): Question[] {
  const existingTexts = new Set(existing.map(q => q.text.toLowerCase().trim()));
  return questions.filter(q => {
    return !existingTexts.has(q.text.toLowerCase().trim());
  });
}
```

## Testing Strategy

### Fix Order (Priority)

1. **Authentication Middleware** (2 tests) - Critical for security
2. **Error Handler** (1 test) - Critical for error handling
3. **Input Validator** (3 tests) - Critical for security
4. **Query Deduplication** (6 tests) - Important for performance
5. **Question Generator** (4 tests) - Important for UX

### Verification Process

For each fix:
1. Run the specific test file
2. Verify the failing test now passes
3. Run the full test suite
4. Verify no regressions
5. Document the fix

### Regression Prevention

```typescript
// Before making changes
npm test -- --run > before.txt

// After making changes
npm test -- --run > after.txt

// Compare results
diff before.txt after.txt
```

## Performance Considerations

### Algorithm Optimization

**Query Deduplication:**
- Cache similarity calculations
- Use early termination for low similarity
- Limit history search to last 10 messages

**Question Generation:**
- Pre-generate question templates
- Cache category-specific questions
- Use efficient deduplication algorithm

## Documentation Updates

### Files to Create/Update

1. **ALGORITHM_CHANGES.md** (new)
   - Document similarity algorithm changes
   - Explain threshold adjustments
   - Provide examples

2. **FIX_PATTERNS.md** (update)
   - Add patterns for fixing failing tests
   - Document common issues and solutions

3. **TROUBLESHOOTING.md** (update)
   - Add troubleshooting for common test failures
   - Provide debugging tips

## Success Metrics

### Quantitative Metrics

- Test pass rate: >= 95% (up from 76.9%)
- Failing tests: 0 critical failures
- Test speed: < 5 minutes
- Flaky test rate: < 1%

### Qualitative Metrics

- Code quality improved
- Bugs fixed
- Algorithms optimized
- Documentation complete

## Risks and Mitigations

### Risk: Algorithm changes affect production
**Impact:** High
**Probability:** Medium
**Mitigation:** Test with real data, review changes carefully, add monitoring

### Risk: Fixes break other tests
**Impact:** Medium
**Probability:** Low
**Mitigation:** Run full test suite after each fix, verify no regressions

### Risk: Root cause is architectural
**Impact:** High
**Probability:** Low
**Mitigation:** Document findings, escalate if needed, plan refactoring

## Next Steps

After design approval:
1. Create detailed task list
2. Begin fixing authentication middleware
3. Proceed through fixes in priority order
4. Verify and document results
5. Update TEST_STATUS_REPORT.md
