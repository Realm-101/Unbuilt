# Action Plan Migration - Testing Guide

## Overview

This guide provides comprehensive testing procedures for the Action Plan migration to ensure data integrity and system functionality.

## Testing Phases

### Phase 1: Pre-Migration Testing

#### 1.1 Schema Validation
```bash
# Verify schema is up to date
npm run db:push -- --dry-run

# Check for pending migrations
psql -d unbuilt -c "
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name LIKE '%plan%';
"
```

**Expected:** All action plan tables should exist.

#### 1.2 Data Baseline
```bash
# Count searches with action plans
psql -d unbuilt -c "
  SELECT COUNT(DISTINCT s.id) 
  FROM searches s
  JOIN search_results sr ON sr.search_id = s.id
  WHERE sr.action_plan IS NOT NULL;
"

# Count existing progress records
psql -d unbuilt -c "SELECT COUNT(*) FROM action_plan_progress;"
```

**Record these numbers for comparison after migration.**

#### 1.3 Template Verification
```bash
# Verify templates are seeded
npm run seed:templates

# Check template count
psql -d unbuilt -c "SELECT COUNT(*), is_default FROM plan_templates GROUP BY is_default;"
```

**Expected:** 5 templates, 1 default.

### Phase 2: Migration Testing

#### 2.1 Staging Environment Test

**Setup:**
```bash
# Create staging database
createdb unbuilt_staging

# Restore production backup
pg_restore -d unbuilt_staging production_backup.dump

# Run migration
DATABASE_URL=postgresql://localhost/unbuilt_staging npm run migrate:action-plans
```

**Validation:**
```bash
# Run validation script
DATABASE_URL=postgresql://localhost/unbuilt_staging npm run validate:action-plans
```

**Expected:** All validation checks pass.

#### 2.2 Small Dataset Test

**Test with 10 searches:**
```sql
-- Create test subset
CREATE TABLE test_searches AS 
SELECT * FROM searches LIMIT 10;

-- Run migration on subset
-- (Modify migration script to use test_searches table)
```

**Verify:**
- All 10 searches migrated
- Phases created correctly
- Tasks created with proper ordering
- Progress data migrated

#### 2.3 Large Dataset Test

**Test with 1000+ searches:**
```bash
# Run full migration in staging
npm run migrate:action-plans

# Monitor performance
time npm run migrate:action-plans
```

**Check:**
- Migration completes within expected time
- No memory issues
- No database locks
- All searches processed

### Phase 3: Post-Migration Testing

#### 3.1 Data Integrity Tests

**Test 1: Record Counts**
```sql
-- Verify record counts match expectations
SELECT 
  (SELECT COUNT(*) FROM action_plans) as plans,
  (SELECT COUNT(*) FROM plan_phases) as phases,
  (SELECT COUNT(*) FROM plan_tasks) as tasks,
  (SELECT COUNT(*) FROM progress_snapshots) as snapshots;
```

**Expected:**
- Plans = Number of searches with action plans
- Phases = Plans × 4 (typically)
- Tasks = Phases × 5-10 (varies)
- Snapshots = Plans

**Test 2: Foreign Key Integrity**
```sql
-- Check for orphaned records
SELECT 'Orphaned Phases' as check_name, COUNT(*) as count
FROM plan_phases 
WHERE plan_id NOT IN (SELECT id FROM action_plans)
UNION ALL
SELECT 'Orphaned Tasks', COUNT(*)
FROM plan_tasks 
WHERE phase_id NOT IN (SELECT id FROM plan_phases)
UNION ALL
SELECT 'Orphaned Dependencies', COUNT(*)
FROM task_dependencies 
WHERE task_id NOT IN (SELECT id FROM plan_tasks);
```

**Expected:** All counts = 0

**Test 3: Data Completeness**
```sql
-- Check for missing required fields
SELECT 
  COUNT(*) FILTER (WHERE title IS NULL OR title = '') as missing_titles,
  COUNT(*) FILTER (WHERE status IS NULL) as missing_status,
  COUNT(*) FILTER (WHERE "order" IS NULL) as missing_order
FROM plan_tasks;
```

**Expected:** All counts = 0

**Test 4: Progress Consistency**
```sql
-- Verify progress calculations
SELECT 
  ap.id,
  ap.title,
  ps.total_tasks as snapshot_total,
  COUNT(pt.id) as actual_total,
  ps.completed_tasks as snapshot_completed,
  COUNT(pt.id) FILTER (WHERE pt.status = 'completed') as actual_completed
FROM action_plans ap
JOIN progress_snapshots ps ON ps.plan_id = ap.id
LEFT JOIN plan_tasks pt ON pt.plan_id = ap.id
WHERE ps.id IN (SELECT MAX(id) FROM progress_snapshots GROUP BY plan_id)
GROUP BY ap.id, ap.title, ps.total_tasks, ps.completed_tasks
HAVING 
  ps.total_tasks != COUNT(pt.id) OR
  ps.completed_tasks != COUNT(pt.id) FILTER (WHERE pt.status = 'completed')
LIMIT 10;
```

**Expected:** No rows returned

#### 3.2 Application Tests

**Test 1: View Action Plans**
```bash
# Start application
npm run dev

# Test API endpoints
curl http://localhost:5000/api/plans/1
curl http://localhost:5000/api/plans/1/tasks
```

**Expected:** Valid JSON responses with plan data.

**Test 2: Task Operations**
```bash
# Update task status
curl -X PATCH http://localhost:5000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'

# Verify update
curl http://localhost:5000/api/tasks/1
```

**Expected:** Task status updated successfully.

**Test 3: Progress Tracking**
```bash
# Get progress metrics
curl http://localhost:5000/api/plans/1/progress
```

**Expected:** Accurate progress calculations.

#### 3.3 Integration Tests

```bash
# Run integration test suite
npm run test:integration -- action-plan

# Expected output:
# ✓ should create action plan
# ✓ should get action plan by ID
# ✓ should update task status
# ✓ should calculate progress correctly
# ✓ should handle task dependencies
```

#### 3.4 E2E Tests

```bash
# Run E2E test suite
npm run test:e2e -- action-plan

# Expected output:
# ✓ should display action plan
# ✓ should mark task as complete
# ✓ should reorder tasks
# ✓ should show progress dashboard
# ✓ should export plan
```

#### 3.5 Performance Tests

**Test 1: Query Performance**
```sql
-- Measure query times
EXPLAIN ANALYZE
SELECT ap.*, 
  COUNT(pt.id) as total_tasks,
  COUNT(pt.id) FILTER (WHERE pt.status = 'completed') as completed_tasks
FROM action_plans ap
LEFT JOIN plan_tasks pt ON pt.plan_id = ap.id
WHERE ap.user_id = 1
GROUP BY ap.id;
```

**Expected:** Query time < 100ms

**Test 2: Load Testing**
```bash
# Run load tests
npm run test:load

# Test concurrent requests
ab -n 1000 -c 10 http://localhost:5000/api/plans/1
```

**Expected:** 
- Response time < 500ms (95th percentile)
- No errors
- No database locks

**Test 3: Large Plan Performance**
```bash
# Test with 100+ task plan
npm run test:performance -- action-plan
```

**Expected:** Acceptable performance with large datasets.

### Phase 4: Rollback Testing

#### 4.1 Test Rollback Script

```bash
# Run rollback in test environment
CONFIRM_ROLLBACK=yes DATABASE_URL=postgresql://localhost/unbuilt_test npm run rollback:action-plans
```

**Verify:**
- All action plan data removed
- Original search data intact
- Sequences reset
- No errors

#### 4.2 Test Backup Restore

```bash
# Restore from backup
psql -d unbuilt_test < backup_before_migration.sql

# Verify data restored
psql -d unbuilt_test -c "SELECT COUNT(*) FROM searches;"
```

**Expected:** Original data restored completely.

### Phase 5: User Acceptance Testing

#### 5.1 Test User Workflows

**Workflow 1: View Existing Plan**
1. Login as test user
2. Navigate to search results
3. View action plan
4. Verify all phases and tasks display correctly

**Workflow 2: Update Task Status**
1. Open action plan
2. Mark task as complete
3. Verify progress updates
4. Check progress dashboard

**Workflow 3: Customize Plan**
1. Add new task
2. Edit existing task
3. Reorder tasks
4. Delete task
5. Verify changes persist

**Workflow 4: Export Plan**
1. Open action plan
2. Export to CSV
3. Export to Markdown
4. Verify export content

#### 5.2 Test Edge Cases

**Edge Case 1: Empty Action Plan**
- Search with no action plan data
- Verify graceful handling

**Edge Case 2: Incomplete Data**
- Search with partial action plan
- Verify migration handles missing fields

**Edge Case 3: Large Plan**
- Search with 50+ tasks
- Verify performance acceptable

**Edge Case 4: Special Characters**
- Tasks with special characters
- Verify proper encoding/escaping

### Phase 6: Monitoring and Validation

#### 6.1 Application Logs

```bash
# Monitor application logs
tail -f logs/application.log | grep -E "(ERROR|WARN|action.plan)"

# Check for errors
grep ERROR logs/application.log | grep action.plan
```

**Expected:** No errors related to action plans.

#### 6.2 Database Monitoring

```sql
-- Monitor query performance
SELECT 
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%action_plan%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Expected:** Acceptable query performance.

#### 6.3 User Feedback

- Monitor support tickets
- Check user feedback
- Review error reports
- Track feature usage

## Test Checklist

### Pre-Migration
- [ ] Schema validated
- [ ] Baseline data recorded
- [ ] Templates seeded
- [ ] Backup created
- [ ] Staging environment ready

### Migration
- [ ] Small dataset test passed
- [ ] Large dataset test passed
- [ ] Performance acceptable
- [ ] No errors encountered

### Post-Migration
- [ ] Validation script passed
- [ ] Data integrity verified
- [ ] Application tests passed
- [ ] Integration tests passed
- [ ] E2E tests passed
- [ ] Performance tests passed

### Rollback
- [ ] Rollback script tested
- [ ] Backup restore tested
- [ ] Data recovery verified

### User Acceptance
- [ ] User workflows tested
- [ ] Edge cases handled
- [ ] Feedback collected
- [ ] Issues documented

## Success Criteria

### Technical
- ✅ All validation checks pass
- ✅ No data loss
- ✅ Performance acceptable
- ✅ All tests pass

### Functional
- ✅ All features work correctly
- ✅ User workflows functional
- ✅ Edge cases handled
- ✅ Export functionality works

### Operational
- ✅ Migration completes on time
- ✅ Rollback procedures work
- ✅ Monitoring in place
- ✅ Documentation complete

## Reporting

### Test Report Template

```markdown
# Migration Test Report

**Date:** YYYY-MM-DD
**Environment:** Staging/Production
**Tester:** Name

## Summary
- Total Tests: X
- Passed: Y
- Failed: Z
- Success Rate: %

## Test Results

### Pre-Migration Tests
- [ ] Schema validation: PASS/FAIL
- [ ] Data baseline: PASS/FAIL
- [ ] Template verification: PASS/FAIL

### Migration Tests
- [ ] Small dataset: PASS/FAIL
- [ ] Large dataset: PASS/FAIL
- [ ] Performance: PASS/FAIL

### Post-Migration Tests
- [ ] Data integrity: PASS/FAIL
- [ ] Application tests: PASS/FAIL
- [ ] Integration tests: PASS/FAIL
- [ ] E2E tests: PASS/FAIL
- [ ] Performance tests: PASS/FAIL

### Rollback Tests
- [ ] Rollback script: PASS/FAIL
- [ ] Backup restore: PASS/FAIL

## Issues Found
1. Issue description
2. Issue description

## Recommendations
1. Recommendation
2. Recommendation

## Sign-off
- [ ] Ready for production
- [ ] Needs additional testing
- [ ] Requires fixes
```

---

**Last Updated:** November 1, 2025
