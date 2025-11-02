# Action Plan Migration Scripts

This directory contains scripts for migrating existing search data to the new Action Plan Customization system.

## Scripts Overview

### 1. `migrate-action-plans.ts`
**Purpose:** Migrate existing search data to interactive action plans

**Usage:**
```bash
npm run migrate:action-plans
```

**What it does:**
- Finds all searches with action plan data
- Creates action plan records
- Extracts and creates phases
- Extracts and creates tasks
- Migrates existing progress data
- Creates initial progress snapshots

**Features:**
- Idempotent (can run multiple times)
- Batch processing (100 searches per batch)
- Progress tracking
- Error handling
- Detailed statistics

### 2. `rollback-action-plans.ts`
**Purpose:** Rollback migration and remove all action plan data

**Usage:**
```bash
CONFIRM_ROLLBACK=yes npm run rollback:action-plans
```

**What it does:**
- Deletes all action plan data
- Preserves original search data
- Resets database sequences
- Verifies rollback success

**Safety:**
- Requires explicit confirmation
- Shows pre-rollback counts
- Ordered deletion (respects foreign keys)
- Verification checks

### 3. `validate-action-plans.ts`
**Purpose:** Validate migration completed successfully

**Usage:**
```bash
npm run validate:action-plans
```

**What it checks:**
- Search-plan mapping
- Phase counts
- Task ordering
- Duplicate orders
- Orphaned records
- Progress consistency
- Task dependencies
- Data completeness

**Output:**
- Detailed check results
- Validation report
- Exit code (0 = success, 1 = failure)

### 4. `seed-templates.ts`
**Purpose:** Seed default plan templates

**Usage:**
```bash
npm run seed:templates
```

**What it creates:**
- Software Startup (default)
- Physical Product
- Service Business
- Content Platform
- Marketplace

## Migration Workflow

### Standard Migration
```bash
# 1. Apply schema
npm run db:push

# 2. Seed templates
npm run seed:templates

# 3. Run migration
npm run migrate:action-plans

# 4. Validate
npm run validate:action-plans

# 5. Test
npm run test:integration -- action-plan
```

### Rollback
```bash
# Option 1: Use rollback script
CONFIRM_ROLLBACK=yes npm run rollback:action-plans

# Option 2: Restore from backup
psql -U postgres -d unbuilt < backup.sql
```

## Documentation

- **Full Guide:** `/docs/ACTION_PLAN_MIGRATION_GUIDE.md`
- **Quick Reference:** `/docs/ACTION_PLAN_MIGRATION_QUICK_REFERENCE.md`
- **Summary:** `/docs/ACTION_PLAN_MIGRATION_SUMMARY.md`

## Best Practices

### Before Migration
1. ✅ Backup database
2. ✅ Test in staging
3. ✅ Schedule maintenance window
4. ✅ Review scripts

### During Migration
1. ✅ Monitor progress
2. ✅ Watch for errors
3. ✅ Keep rollback ready
4. ✅ Don't interrupt

### After Migration
1. ✅ Run validation
2. ✅ Test application
3. ✅ Monitor logs
4. ✅ Check user feedback

## Troubleshooting

### Migration Fails
```bash
# Check database connection
psql -d unbuilt -c "SELECT 1;"

# Verify schema
npm run db:push -- --dry-run

# Check logs
tail -f logs/application.log | grep ERROR

# Retry with verbose logging
DEBUG=* npm run migrate:action-plans
```

### Validation Fails
```bash
# Check specific issues
npm run validate:action-plans

# Fix orphaned records
psql -d unbuilt -c "
  SELECT COUNT(*) FROM plan_phases 
  WHERE plan_id NOT IN (SELECT id FROM action_plans);
"

# Analyze tables
psql -d unbuilt -c "ANALYZE action_plans; ANALYZE plan_phases; ANALYZE plan_tasks;"
```

### Performance Issues
```bash
# Check table sizes
psql -d unbuilt -c "
  SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE tablename LIKE '%plan%'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# Vacuum tables
psql -d unbuilt -c "VACUUM ANALYZE action_plans; VACUUM ANALYZE plan_phases; VACUUM ANALYZE plan_tasks;"
```

## Support

For issues or questions:
1. Check documentation
2. Review script comments
3. Check GitHub issues
4. Contact support

---

**Last Updated:** November 1, 2025
