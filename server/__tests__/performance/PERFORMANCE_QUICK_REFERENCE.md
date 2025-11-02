# Action Plan Performance Testing - Quick Reference

## Quick Start

### Run All Performance Tests
```bash
npm test -- action-plan-performance.test.ts --run
```

### Run Specific Test Suite
```bash
# Load testing
npm test -- action-plan-performance.test.ts -t "Load Test" --run

# Concurrent updates
npm test -- action-plan-performance.test.ts -t "Concurrent Task Updates" --run

# Progress calculation
npm test -- action-plan-performance.test.ts -t "Progress Calculation" --run

# Export generation
npm test -- action-plan-performance.test.ts -t "Export Generation" --run
```

## Performance Thresholds (Quick Reference)

| Test | Threshold | Pass Criteria |
|------|-----------|---------------|
| Plan Load (100+ tasks) | 1s | ✅ < 1000ms |
| Task Retrieval | 1s | ✅ < 1000ms |
| Pagination | 500ms | ✅ < 500ms |
| Progress Calc | 200ms | ✅ < 200ms |
| 10 Concurrent Updates | 2s | ✅ < 2000ms |
| 20 Concurrent Updates | 3s | ✅ < 3000ms |
| CSV Export | 3s | ✅ < 3000ms |
| JSON Export | 2s | ✅ < 2000ms |
| Markdown Export | 2s | ✅ < 2000ms |

## Test Output Interpretation

### ✅ Passing Test
```
✅ Plan load time: 847ms (threshold: 1000ms)
```
- Operation completed in 847ms
- Threshold is 1000ms
- Test PASSED (847 < 1000)

### ❌ Failing Test
```
❌ Plan load time: 1234ms (threshold: 1000ms)
```
- Operation completed in 1234ms
- Threshold is 1000ms
- Test FAILED (1234 > 1000)

## Common Issues & Solutions

### Issue: Tests Skipped
```
⚠️ Test database is not available - database tests will be skipped
```
**Solution:**
```bash
npm run test:db:setup
```

### Issue: Timeout Errors
```
Error: Test timeout of 5000ms exceeded
```
**Solution:**
- Check database connectivity
- Increase timeout in test file
- Optimize slow queries

### Issue: Memory Errors
```
JavaScript heap out of memory
```
**Solution:**
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm test -- action-plan-performance.test.ts --run
```

## Performance Optimization Checklist

When tests fail, check these in order:

1. **Database Indexes**
   - [ ] Indexes on `planId`, `phaseId`, `status`
   - [ ] Composite indexes for common queries
   - [ ] Foreign key indexes

2. **Query Optimization**
   - [ ] Use pagination for large result sets
   - [ ] Avoid N+1 queries
   - [ ] Use proper JOINs instead of multiple queries

3. **Caching**
   - [ ] Cache frequently accessed data
   - [ ] Implement query result caching
   - [ ] Use Redis for distributed caching

4. **Connection Pooling**
   - [ ] Configure proper pool size
   - [ ] Monitor connection usage
   - [ ] Implement connection timeout

5. **Code Optimization**
   - [ ] Use async/await properly
   - [ ] Avoid blocking operations
   - [ ] Implement streaming for large data

## Monitoring Commands

### Check Test Database
```bash
npm run test:db:check
```

### View Performance Trends
```bash
cat server/__tests__/reports/performance-trends.json | jq
```

### Generate Performance Report
```bash
npm test -- action-plan-performance.test.ts --run --reporter=json > performance-report.json
```

## CI/CD Integration

### Add to GitHub Actions
```yaml
- name: Run Performance Tests
  run: npm test -- action-plan-performance.test.ts --run
  
- name: Check Performance Thresholds
  run: |
    if grep -q "FAILED" test-results.txt; then
      echo "Performance tests failed!"
      exit 1
    fi
```

## Performance Metrics Dashboard

Track these metrics over time:

1. **Response Times**
   - Average, p50, p95, p99
   - Trend over last 30 days

2. **Throughput**
   - Requests per second
   - Concurrent operations handled

3. **Resource Usage**
   - Memory consumption
   - CPU utilization
   - Database connections

4. **Error Rates**
   - Failed operations
   - Timeout errors
   - Database errors

## Quick Troubleshooting

### Slow Plan Loading
1. Check database indexes
2. Verify pagination is working
3. Review query execution plan
4. Check network latency

### Slow Progress Calculation
1. Optimize calculation algorithm
2. Add caching for progress data
3. Use database aggregation
4. Reduce unnecessary queries

### Slow Export Generation
1. Implement streaming exports
2. Optimize serialization
3. Add export caching
4. Use background jobs for large exports

### Concurrent Update Issues
1. Check for database locks
2. Implement optimistic locking
3. Use proper transaction isolation
4. Review connection pool settings

## Performance Testing Best Practices

1. **Run tests regularly**
   - Before each release
   - After major changes
   - Weekly for trends

2. **Monitor trends**
   - Track performance over time
   - Identify degradation early
   - Set up alerts

3. **Optimize proactively**
   - Don't wait for failures
   - Review slow queries
   - Profile code regularly

4. **Document changes**
   - Record optimizations
   - Track improvements
   - Share learnings

## Contact & Support

For performance issues or questions:
- Review full documentation: `ACTION_PLAN_PERFORMANCE_SUMMARY.md`
- Check test implementation: `action-plan-performance.test.ts`
- Review optimization guide: `PERFORMANCE_TESTING.md`

---

**Quick Reference Version:** 1.0
**Last Updated:** November 1, 2025
