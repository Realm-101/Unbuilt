# Production Smoke Tests

## Overview

Smoke tests are a minimal test suite designed to validate critical functionality after deployment. These tests run automatically after each production deployment and can be triggered manually or on a schedule.

## Purpose

Smoke tests serve as a quick sanity check to ensure:
- The application is accessible
- Critical pages load successfully
- Security headers are present
- API endpoints respond correctly
- No major regressions were introduced

## Test Coverage

### Critical Checks
- ✅ Homepage loads successfully
- ✅ Navigation works
- ✅ Login page is accessible
- ✅ Registration page is accessible
- ✅ Security headers are present
- ✅ 404 pages handled gracefully
- ✅ Static assets load correctly
- ✅ Page load time is acceptable
- ✅ API health check responds
- ✅ API errors handled gracefully

### User Flows
- ✅ Registration flow completes
- ✅ Login attempt works

### Performance
- ✅ Core Web Vitals are acceptable

## Running Smoke Tests

### Locally

```bash
# Against local development server
npm run dev
npm run test:e2e -- server/__tests__/e2e/smoke

# Against staging
SMOKE_TEST_URL=https://staging.unbuilt.one npm run test:e2e -- server/__tests__/e2e/smoke

# Against production (use with caution)
SMOKE_TEST_URL=https://unbuilt.one npm run test:e2e -- server/__tests__/e2e/smoke
```

### In CI/CD

Smoke tests run automatically:
- After successful production deployment
- Every 6 hours (scheduled)
- Manually via GitHub Actions workflow dispatch

### Manual Trigger

1. Go to GitHub Actions
2. Select "Production Smoke Tests" workflow
3. Click "Run workflow"
4. Select environment (production/staging)
5. Optionally provide custom URL
6. Click "Run workflow"

## Test Execution Time

Smoke tests are designed to be fast:
- **Target**: < 5 minutes
- **Timeout**: 10 minutes
- **Individual test timeout**: 1-2 minutes

## Failure Handling

When smoke tests fail:

1. **Automatic Actions**
   - GitHub issue is created with "urgent" label
   - Slack notification sent (if configured)
   - Test artifacts uploaded (screenshots, logs)

2. **Manual Response**
   - Review test results and screenshots
   - Check application logs
   - Verify deployment was successful
   - Consider rollback if critical

## Configuration

### Environment Variables

- `SMOKE_TEST_URL`: URL to test (required)
- `CI`: Set to 'true' in CI environment

### Secrets (GitHub Actions)

- `PRODUCTION_URL`: Production application URL
- `STAGING_URL`: Staging application URL
- `SLACK_WEBHOOK_URL`: Slack webhook for notifications (optional)

## Test Philosophy

### What to Include
- ✅ Critical user-facing functionality
- ✅ Essential API endpoints
- ✅ Security checks
- ✅ Performance baselines

### What to Exclude
- ❌ Detailed feature testing (use full E2E suite)
- ❌ Edge cases
- ❌ Complex user flows
- ❌ Database operations (unless critical)

## Monitoring

### Success Metrics
- Pass rate: > 95%
- Execution time: < 5 minutes
- False positive rate: < 5%

### Alerting
- Immediate: Smoke test failures
- Daily: Summary of scheduled runs
- Weekly: Trend analysis

## Maintenance

### Adding New Tests

Only add tests for:
- New critical functionality
- Previously missed critical paths
- Recurring production issues

Keep the suite minimal and fast.

### Removing Tests

Remove tests that:
- Are consistently flaky
- Test non-critical functionality
- Duplicate other tests
- Take too long to execute

### Updating Tests

Update tests when:
- UI changes affect selectors
- API endpoints change
- Security requirements change
- Performance thresholds change

## Troubleshooting

### Tests fail locally but pass in CI

- Check environment variables
- Verify correct URL is being tested
- Ensure local server is running
- Check for local configuration differences

### Tests are flaky

- Increase timeouts
- Add explicit waits
- Improve selectors
- Check for race conditions

### Tests take too long

- Remove non-critical tests
- Optimize test setup
- Run tests in parallel (if possible)
- Reduce explicit waits

### False positives

- Review test assertions
- Check for timing issues
- Verify test data
- Consider environment differences

## Best Practices

1. **Keep it minimal**: Only test critical paths
2. **Keep it fast**: Target < 5 minutes total
3. **Keep it stable**: Avoid flaky tests
4. **Keep it simple**: Easy to understand and maintain
5. **Keep it relevant**: Update as application evolves

## Related Documentation

- [E2E Testing Guide](../README.md)
- [GitHub Actions Workflows](../../../../.github/workflows/)
- [Deployment Guide](../../../../docs/DEPLOYMENT_CHECKLIST.md)

## Support

For issues with smoke tests:
1. Check this README
2. Review test logs and screenshots
3. Check GitHub Actions workflow logs
4. Contact DevOps team
