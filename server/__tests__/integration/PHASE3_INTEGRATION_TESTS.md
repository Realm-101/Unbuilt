# Phase 3 Integration Tests

## Overview

Comprehensive integration tests for Phase 3 features covering:
- Stripe payment flow
- User onboarding
- Search and export workflows
- Analytics tracking
- Search history and favorites
- Error handling
- Mobile API responsiveness

## Running Tests

### Run All Phase 3 Integration Tests
```bash
npm test -- phase3-features.integration.test.ts
```

### Run Specific Test Suites
```bash
# Stripe payment tests only
npm test -- phase3-features.integration.test.ts -t "Stripe Payment Flow"

# Onboarding tests only
npm test -- phase3-features.integration.test.ts -t "Onboarding Flow"

# Search and export tests
npm test -- phase3-features.integration.test.ts -t "Search and Export"

# Analytics tests
npm test -- phase3-features.integration.test.ts -t "Analytics Tracking"

# Search history tests
npm test -- phase3-features.integration.test.ts -t "Search History"
```

### Run with Coverage
```bash
npm test -- phase3-features.integration.test.ts --coverage
```

## Test Coverage

### Stripe Payment Flow (5 tests)
- ✅ Create checkout session for Pro plan
- ✅ Handle webhook for successful payment
- ✅ Create billing portal session
- ✅ Enforce plan limits
- ✅ Update subscription status

### Onboarding Flow (3 tests)
- ✅ Mark onboarding as incomplete for new users
- ✅ Update onboarding status
- ✅ Track onboarding progress

### Search and Export Workflows (6 tests)
- ✅ Perform search with enhanced AI analysis
- ✅ Export as PDF
- ✅ Export as Excel
- ✅ Export as PowerPoint
- ✅ Cache search results
- ✅ Verify categorized gaps with confidence scores

### Analytics Tracking (3 tests)
- ✅ Track search events
- ✅ Track export events
- ✅ Retrieve analytics dashboard data

### Search History and Favorites (5 tests)
- ✅ Retrieve search history
- ✅ Mark search as favorite
- ✅ Retrieve only favorites
- ✅ Delete search from history
- ✅ Re-run saved search

### Error Handling (3 tests)
- ✅ Return user-friendly error messages
- ✅ Handle network errors gracefully
- ✅ Validate export format

### Mobile API Responsiveness (2 tests)
- ✅ Return paginated results for mobile
- ✅ Optimize response size for mobile

## Test Requirements

### Environment Variables
```env
# Stripe Test Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...

# Database
DATABASE_URL=postgresql://...

# Redis (for caching tests)
REDIS_URL=redis://localhost:6379

# Gemini API (mocked in tests)
GEMINI_API_KEY=test_key
```

### Dependencies
- Vitest
- Supertest
- Stripe SDK (mocked)
- Database with test schema

## Mocking Strategy

### Stripe API
All Stripe API calls are mocked to avoid:
- Real payment processing in tests
- API rate limits
- Network dependencies

### Gemini AI
AI analysis is mocked to:
- Ensure consistent test results
- Avoid API costs
- Speed up test execution

### Database
Tests use a test database with:
- Isolated test data
- Automatic cleanup after each test
- Transaction rollback support

## Success Criteria

All tests must pass with:
- ✅ 100% test success rate
- ✅ No flaky tests
- ✅ Execution time < 30 seconds
- ✅ No real API calls
- ✅ Proper cleanup after tests

## Troubleshooting

### Tests Failing Due to Database
```bash
# Reset test database
npm run db:reset:test

# Run migrations
npm run db:migrate:test
```

### Stripe Mock Issues
Ensure Stripe is mocked before app initialization:
```typescript
vi.mock('stripe', () => { /* mock implementation */ });
```

### Cache Issues
Clear Redis cache before tests:
```bash
redis-cli FLUSHDB
```

## Next Steps

After integration tests pass:
1. Run performance tests (Task 11.2)
2. Conduct security review (Task 11.3)
3. Update documentation (Task 11.4)
4. Prepare deployment (Task 11.5)

## Related Files

- `phase3-features.integration.test.ts` - Main test file
- `server/routes/stripe.ts` - Stripe integration
- `server/services/subscriptionManager.ts` - Subscription logic
- `server/services/analytics.ts` - Analytics tracking
- `server/routes/searchHistory.ts` - Search history API

---

**Last Updated:** October 4, 2025
**Test Count:** 27 integration tests
**Status:** Ready for execution
