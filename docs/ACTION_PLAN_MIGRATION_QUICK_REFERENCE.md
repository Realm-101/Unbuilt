# Action Plan Migration - Quick Reference

## Quick Start

### Prerequisites
```bash
# 1. Backup database
# Use Neon Console or pg_dump

# 2. Verify environment
npm run check
npm run db:push -- --dry-run
```

### Migration Commands

```bash
# 1. Apply schema (if not already done)
npm run db:push

# 2. Seed templates
npm run seed:templates

# 3. Run migration
npm run migrate:action-plans

# 4. Validate migration
npm run validate:action-plans

# 5. Test application
npm run test:integration -- action-plan
npm run test:e2e -- action-plan
```

### Rollback Commands

```bash
# Rollback migration (requires confirmation)
CONFIRM_ROLLBACK=yes npm run rollback:action-plans

# Or restore from backup
psql -U postgres -d unbuilt < backup_YYYYMMDD_HHMMSS.sql
```

## Migration Checklist

### Pre-Migration
- [ ] Backup database
- [ ] Test in staging environment
- [ ] Schedule maintenance window
- [ ] Notify users
- [ ] Review migration scripts
- [ ] Check disk space

### During Migration
- [ ] Run schema migration
- [ ] Seed templates
- [ ] Run data migration
- [ ] Monitor progress
- [ ] Watch for errors

### Post-Migration
- [ ] Run validation script
- [ ] Test application
- [ ] Check error logs
- [ ] Verify user data
- [ ] Monitor performance
- [ ] Document issues

## Common Commands

### Check Migration Status
```bash
# Count migrated records
psql -d unbuilt -c "SELECT COUNT(*) FROM action_plans;"
psql -d unbuilt -c "SELECT COUNT(*) FROM plan_phases;"
psql -d unbuilt -c "SELECT COUNT(*) FROM plan_tasks;"

# Check for errors
tail -f logs/application.log | grep ERROR
```

### Verify Data Integrity
```bash
# Run validation
npm run validate:action-plans

# Check specific plan
psql -d unbuilt -c "SELECT * FROM action_plans WHERE id = 1;"

# Check progress
psql -d unbuilt -c "
  SELECT 
    ap.id,
    ap.title,
    COUNT(pt.id) as total_tasks,
    COUNT(pt.id) FILTER (WHERE pt.status = 'completed') as completed
  FROM action_plans ap
  LEFT JOIN plan_tasks pt ON pt.plan_id = ap.id
  GROUP BY ap.id, ap.title
  LIMIT 10;
"
```

### Troubleshooting
```bash
# Check for orphaned records
psql -d unbuilt -c "
  SELECT COUNT(*) FROM plan_phases 
  WHERE plan_id NOT IN (SELECT id FROM action_plans);
"

# Fix task ordering
psql -d unbuilt -c "
  WITH ordered_tasks AS (
    SELECT id, phase_id,
      ROW_NUMBER() OVER (PARTITION BY phase_id ORDER BY id) as new_order
    FROM plan_tasks
    WHERE phase_id = <phase_id>
  )
  UPDATE plan_tasks pt
  SET \"order\" = ot.new_order
  FROM ordered_tasks ot
  WHERE pt.id = ot.id;
"

# Analyze tables
psql -d unbuilt -c "ANALYZE action_plans; ANALYZE plan_phases; ANALYZE plan_tasks;"
```

## Expected Results

### Migration Output
```
🚀 Starting Action Plan migration...
📋 Loading default template...
✓ Using template: Software Startup

🔍 Finding searches with action plans...
📊 Found 1,234 total searches

📦 Processing batch 1/13...
  Progress: 10/1234 (1%)
  Progress: 20/1234 (2%)
  ...

============================================================
✅ Migration completed successfully!

📈 Statistics:
   - Searches processed: 1,234
   - Plans created: 1,234
   - Phases created: 4,936
   - Tasks created: 24,680
   - Progress records migrated: 456
   - Progress snapshots created: 1,234
   - Searches skipped: 0
   - Errors: 0
============================================================
```

### Validation Output
```
🔍 Action Plan Migration Validation

Running comprehensive validation checks...

✓ Search-Plan Mapping: All searches have corresponding plans
✓ Phase Counts: All plans have reasonable phase counts (1-6)
✓ Task Ordering: All tasks have sequential ordering within phases
✓ Duplicate Orders: No duplicate task orders found
✓ Orphaned Phases: No orphaned phases found
✓ Orphaned Tasks: No orphaned tasks found
✓ Progress Consistency: Progress data is consistent with task data
✓ Task Dependencies: No self-referencing dependencies found
✓ Invalid Dependencies: All dependencies point to valid tasks
✓ Data Completeness: Migration data is present

============================================================
📋 VALIDATION REPORT
============================================================

Total checks: 10
Passed: 10 ✓
Failed: 0 ✗
Success rate: 100.0%

✅ ALL VALIDATION CHECKS PASSED

Migration appears to be successful!

============================================================
```

## Timing Estimates

| Data Volume | Estimated Time |
|-------------|----------------|
| 1,000 searches | ~5 minutes |
| 10,000 searches | ~30 minutes |
| 100,000 searches | ~3 hours |

## Support

- **Full Guide:** `/docs/ACTION_PLAN_MIGRATION_GUIDE.md`
- **Migration Script:** `/server/scripts/migrate-action-plans.ts`
- **Rollback Script:** `/server/scripts/rollback-action-plans.ts`
- **Validation Script:** `/server/scripts/validate-action-plans.ts`

## Emergency Contacts

If migration fails:
1. Stop the migration process
2. Check logs for errors
3. Run validation script
4. Consider rollback if issues are severe
5. Contact support with error details

---

**Last Updated:** November 1, 2025
