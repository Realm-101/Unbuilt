# Action Plan Customization Migration Guide

## Overview

This guide provides comprehensive instructions for migrating existing search data to the new Action Plan Customization system. The migration transforms static action plan data stored in `searches` table into interactive, customizable action plans with full task management capabilities.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Migration Overview](#migration-overview)
3. [Pre-Migration Checklist](#pre-migration-checklist)
4. [Migration Steps](#migration-steps)
5. [Rollback Procedures](#rollback-procedures)
6. [Post-Migration Validation](#post-migration-validation)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

## Prerequisites

### System Requirements

- Node.js 20+
- PostgreSQL 14+ (Neon Database)
- Database backup capability
- Access to production/staging environment

### Required Permissions

- Database admin access
- Ability to run migrations
- Access to application logs
- Ability to create database backups

### Dependencies

Ensure all previous migrations are applied:
```bash
npm run db:push
```

Verify the following tables exist:
- `searches`
- `search_results`
- `users`

## Migration Overview

### What Gets Migrated

The migration process converts:

**From:** Static action plan data in searches
- Action plan JSON stored in search results
- Basic progress tracking in `action_plan_progress` table

**To:** Interactive action plan system
- `action_plans` - Main plan records
- `plan_phases` - Organized phases
- `plan_tasks` - Individual tasks with status tracking
- `task_dependencies` - Task relationships
- `plan_templates` - Reusable templates
- `task_history` - Audit trail
- `progress_snapshots` - Historical analytics

### Data Transformation

```
Search Result (actionPlan JSON)
    ↓
Action Plan (with metadata)
    ↓
Plan Phases (4 phases)
    ↓
Plan Tasks (individual steps)
    ↓
Progress Tracking (snapshots)
```

### Migration Strategy

- **Non-destructive**: Original search data is preserved
- **Idempotent**: Can be run multiple times safely
- **Incremental**: Processes searches in batches
- **Reversible**: Full rollback capability

## Pre-Migration Checklist

### 1. Backup Database

**Critical:** Always backup before migration!

```bash
# For Neon Database
# Use Neon Console to create a branch or backup

# For local PostgreSQL
pg_dump -U postgres -d unbuilt > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Verify Database State

```bash
# Check current schema version
npm run db:push -- --dry-run

# Verify search count
psql -d unbuilt -c "SELECT COUNT(*) FROM searches;"

# Check for action plan data
psql -d unbuilt -c "SELECT COUNT(*) FROM search_results WHERE action_plan IS NOT NULL;"
```

### 3. Test in Staging

**Never run migration directly in production!**

1. Create staging environment
2. Restore production backup to staging
3. Run migration in staging
4. Validate results
5. Test application functionality
6. Only then proceed to production

### 4. Schedule Maintenance Window

- Notify users of maintenance
- Plan for 30-60 minutes downtime
- Have rollback plan ready
- Monitor system during migration

## Migration Steps

### Step 1: Apply Database Schema

The schema migration creates all necessary tables and indexes.

```bash
# Run the migration SQL
npm run db:push
```

This creates:
- `action_plans` table
- `plan_phases` table
- `plan_tasks` table
- `task_dependencies` table
- `plan_templates` table
- `task_history` table
- `progress_snapshots` table

**Verification:**
```sql
-- Check tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%plan%';
```

### Step 2: Seed Plan Templates

Templates provide pre-configured structures for different project types.

```bash
# Seed default templates
npm run seed:templates
```

This creates 5 default templates:
- Software Startup
- Physical Product
- Service Business
- Content Platform
- Marketplace

**Verification:**
```sql
-- Check templates were created
SELECT id, name, category, is_default 
FROM plan_templates 
ORDER BY name;
```

Expected output: 5 templates with "Software Startup" as default.

### Step 3: Run Data Migration

The migration script transforms existing search data into action plans.

```bash
# Run migration script
npm run migrate:action-plans
```

**What it does:**
1. Finds all searches with action plan data
2. Creates action plan records
3. Extracts phases from action plan JSON
4. Creates phase records
5. Extracts tasks from each phase
6. Creates task records with proper ordering
7. Migrates existing progress data
8. Creates initial progress snapshots
9. Logs all operations

**Progress indicators:**
```
🚀 Starting Action Plan migration...
📊 Found 1,234 searches with action plans
✓ Migrated search 1/1234 (User: john@example.com)
✓ Migrated search 2/1234 (User: jane@example.com)
...
✅ Migration completed successfully!
📈 Statistics:
   - Searches processed: 1,234
   - Plans created: 1,234
   - Phases created: 4,936
   - Tasks created: 24,680
   - Errors: 0
```

### Step 4: Validate Migration

Run validation checks to ensure data integrity.

```bash
# Run validation script
npm run validate:action-plans
```

**Validation checks:**
- All searches with action plans have corresponding plan records
- Phase count matches expected (typically 4 per plan)
- Task ordering is sequential within phases
- Progress data is consistent
- No orphaned records
- Foreign key integrity

**Expected output:**
```
✓ All searches have corresponding plans
✓ Phase counts are correct
✓ Task ordering is valid
✓ Progress data is consistent
✓ No orphaned records found
✓ Foreign key integrity verified
```

### Step 5: Create Initial Progress Snapshots

Generate baseline analytics for all migrated plans.

```bash
# Create progress snapshots
npm run create:progress-snapshots
```

This creates initial progress snapshots for analytics and tracking.

### Step 6: Test Application

Verify the application works correctly with migrated data.

**Manual testing checklist:**
- [ ] View existing action plans
- [ ] Check task status display
- [ ] Verify progress calculations
- [ ] Test task editing
- [ ] Test task reordering
- [ ] Verify phase accordion functionality
- [ ] Check progress dashboard
- [ ] Test export functionality

**Automated testing:**
```bash
# Run integration tests
npm run test:integration -- action-plan

# Run E2E tests
npm run test:e2e -- action-plan
```

## Rollback Procedures

### When to Rollback

Rollback if you encounter:
- Data integrity issues
- Application errors
- Performance problems
- Unexpected behavior
- Failed validation checks

### Rollback Steps

#### Option 1: Restore from Backup (Recommended)

```bash
# Stop application
pm2 stop all

# Restore database from backup
psql -U postgres -d unbuilt < backup_YYYYMMDD_HHMMSS.sql

# Restart application
pm2 start all
```

#### Option 2: Run Rollback Script

```bash
# Run rollback migration
npm run rollback:action-plans
```

**What it does:**
1. Deletes all action plan data
2. Preserves original search data
3. Removes progress snapshots
4. Cleans up orphaned records
5. Resets sequences

**Verification:**
```sql
-- Verify rollback
SELECT COUNT(*) FROM action_plans; -- Should be 0
SELECT COUNT(*) FROM plan_phases; -- Should be 0
SELECT COUNT(*) FROM plan_tasks; -- Should be 0
SELECT COUNT(*) FROM searches; -- Should be unchanged
```

#### Option 3: Drop Tables (Nuclear Option)

**Warning:** Only use if rollback script fails!

```sql
-- Drop all action plan tables
DROP TABLE IF EXISTS progress_snapshots CASCADE;
DROP TABLE IF EXISTS task_history CASCADE;
DROP TABLE IF EXISTS task_dependencies CASCADE;
DROP TABLE IF EXISTS plan_tasks CASCADE;
DROP TABLE IF EXISTS plan_phases CASCADE;
DROP TABLE IF EXISTS action_plans CASCADE;
DROP TABLE IF EXISTS plan_templates CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS plan_status CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS task_history_action CASCADE;
```

### Post-Rollback Steps

1. Verify application functionality
2. Check logs for errors
3. Notify users of status
4. Investigate root cause
5. Fix issues before retry
6. Document lessons learned

## Post-Migration Validation

### Database Validation

```sql
-- Check record counts
SELECT 
  (SELECT COUNT(*) FROM action_plans) as plans,
  (SELECT COUNT(*) FROM plan_phases) as phases,
  (SELECT COUNT(*) FROM plan_tasks) as tasks,
  (SELECT COUNT(*) FROM progress_snapshots) as snapshots;

-- Check for orphaned records
SELECT COUNT(*) FROM plan_phases 
WHERE plan_id NOT IN (SELECT id FROM action_plans);

SELECT COUNT(*) FROM plan_tasks 
WHERE phase_id NOT IN (SELECT id FROM plan_phases);

-- Verify progress calculations
SELECT 
  ap.id,
  ap.title,
  COUNT(pt.id) as total_tasks,
  COUNT(pt.id) FILTER (WHERE pt.status = 'completed') as completed_tasks,
  ROUND(
    COUNT(pt.id) FILTER (WHERE pt.status = 'completed')::numeric / 
    NULLIF(COUNT(pt.id), 0) * 100
  ) as completion_percentage
FROM action_plans ap
LEFT JOIN plan_tasks pt ON pt.plan_id = ap.id
GROUP BY ap.id, ap.title
LIMIT 10;
```

### Application Validation

```bash
# Check API endpoints
curl http://localhost:5000/api/plans/1
curl http://localhost:5000/api/plans/1/tasks

# Check logs for errors
tail -f logs/application.log | grep ERROR

# Monitor performance
npm run test:performance -- action-plan
```

### User Acceptance Testing

1. Select 5-10 test users
2. Have them verify their action plans
3. Test key workflows
4. Collect feedback
5. Address any issues

## Troubleshooting

### Common Issues

#### Issue: Migration Script Fails

**Symptoms:**
- Script exits with error
- Partial data migration
- Database connection errors

**Solutions:**
```bash
# Check database connection
psql -d unbuilt -c "SELECT 1;"

# Verify schema is up to date
npm run db:push -- --dry-run

# Check for locks
SELECT * FROM pg_locks WHERE NOT granted;

# Retry with verbose logging
DEBUG=* npm run migrate:action-plans
```

#### Issue: Missing Action Plan Data

**Symptoms:**
- Some searches don't have plans
- Empty phases or tasks

**Solutions:**
```sql
-- Find searches without plans
SELECT s.id, s.query, s.user_id
FROM searches s
LEFT JOIN action_plans ap ON ap.search_id = s.id
WHERE ap.id IS NULL
AND s.id IN (
  SELECT DISTINCT search_id 
  FROM search_results 
  WHERE action_plan IS NOT NULL
);

-- Check action plan JSON structure
SELECT id, query, 
  jsonb_pretty(
    (SELECT action_plan FROM search_results WHERE search_id = searches.id LIMIT 1)
  )
FROM searches
WHERE id = <problem_search_id>;
```

#### Issue: Incorrect Task Ordering

**Symptoms:**
- Tasks appear in wrong order
- Duplicate order values

**Solutions:**
```sql
-- Find duplicate orders
SELECT phase_id, "order", COUNT(*)
FROM plan_tasks
GROUP BY phase_id, "order"
HAVING COUNT(*) > 1;

-- Fix ordering
WITH ordered_tasks AS (
  SELECT id, phase_id,
    ROW_NUMBER() OVER (PARTITION BY phase_id ORDER BY id) as new_order
  FROM plan_tasks
  WHERE phase_id = <problem_phase_id>
)
UPDATE plan_tasks pt
SET "order" = ot.new_order
FROM ordered_tasks ot
WHERE pt.id = ot.id;
```

#### Issue: Performance Degradation

**Symptoms:**
- Slow query performance
- High database load
- Timeout errors

**Solutions:**
```sql
-- Analyze tables
ANALYZE action_plans;
ANALYZE plan_phases;
ANALYZE plan_tasks;

-- Check missing indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE tablename LIKE '%plan%'
ORDER BY tablename, indexname;

-- Vacuum tables
VACUUM ANALYZE action_plans;
VACUUM ANALYZE plan_phases;
VACUUM ANALYZE plan_tasks;
```

### Getting Help

If you encounter issues not covered here:

1. Check application logs: `logs/application.log`
2. Check database logs
3. Review migration script output
4. Search GitHub issues
5. Contact support with:
   - Error messages
   - Migration logs
   - Database state
   - Steps to reproduce

## FAQ

### Q: How long does migration take?

**A:** Depends on data volume:
- 1,000 searches: ~5 minutes
- 10,000 searches: ~30 minutes
- 100,000 searches: ~3 hours

### Q: Can I run migration during business hours?

**A:** Not recommended. Schedule during low-traffic period or maintenance window.

### Q: What if migration fails halfway?

**A:** The migration is designed to be idempotent. You can safely re-run it. Already migrated searches will be skipped.

### Q: Will users lose their data?

**A:** No. Original search data is preserved. Migration creates new records without modifying existing data.

### Q: Can I migrate specific searches only?

**A:** Yes. Modify the migration script to filter by user ID, date range, or other criteria.

### Q: How do I verify migration success?

**A:** Run the validation script and check the statistics. All counts should match expected values.

### Q: What happens to existing progress data?

**A:** Existing progress from `action_plan_progress` table is migrated to the new system and preserved.

### Q: Can I customize the migration?

**A:** Yes. The migration script is designed to be extensible. You can modify it to handle custom data structures.

### Q: What if I need to migrate again?

**A:** Run the rollback script first, then re-run the migration. Or use the idempotent flag to skip already migrated records.

### Q: How do I monitor migration progress?

**A:** The migration script outputs progress indicators. You can also query the database to check record counts in real-time.

## Best Practices

### Before Migration

1. ✅ Always backup database
2. ✅ Test in staging first
3. ✅ Schedule maintenance window
4. ✅ Notify users in advance
5. ✅ Have rollback plan ready
6. ✅ Review migration script
7. ✅ Check disk space
8. ✅ Monitor system resources

### During Migration

1. ✅ Monitor progress logs
2. ✅ Watch for errors
3. ✅ Check database performance
4. ✅ Keep rollback plan accessible
5. ✅ Don't interrupt process
6. ✅ Document any issues
7. ✅ Take notes for post-mortem

### After Migration

1. ✅ Run validation checks
2. ✅ Test application thoroughly
3. ✅ Monitor error logs
4. ✅ Check user feedback
5. ✅ Document lessons learned
6. ✅ Update runbooks
7. ✅ Archive migration logs
8. ✅ Celebrate success! 🎉

## Support

For migration support:
- **Documentation:** `/docs/ACTION_PLAN_MIGRATION_GUIDE.md`
- **Migration Script:** `/server/scripts/migrate-action-plans.ts`
- **Rollback Script:** `/server/scripts/rollback-action-plans.ts`
- **Validation Script:** `/server/scripts/validate-action-plans.ts`
- **GitHub Issues:** Report bugs and issues
- **Email Support:** support@unbuilt.one

---

**Document Version:** 1.0  
**Last Updated:** November 1, 2025  
**Status:** Production Ready
