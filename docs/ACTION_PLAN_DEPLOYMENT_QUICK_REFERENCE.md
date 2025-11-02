# Action Plan Deployment - Quick Reference

## Quick Commands

### Initialize Feature Flag
```bash
npm run deploy:feature-flag init
```

### Check Status
```bash
npm run deploy:feature-flag status
```

### Deploy Stages
```bash
# Internal testing (0%, beta users only)
npm run deploy:feature-flag deploy internal

# Beta testing (10%, Pro/Enterprise)
npm run deploy:feature-flag deploy beta

# Expanded beta (50%, Pro/Enterprise)
npm run deploy:feature-flag deploy expanded

# General availability (100%, all users)
npm run deploy:feature-flag deploy general
```

### Manage Beta Users
```bash
# Add beta user
npm run deploy:feature-flag add-user 123

# Remove beta user
npm run deploy:feature-flag remove-user 123
```

### Rollback
```bash
# Disable feature completely
npm run deploy:feature-flag rollback
```

## API Quick Reference

### Admin Endpoints (Require Admin Auth)

```bash
# Get all feature flags
curl https://unbuilt.one/api/feature-flags \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Update rollout percentage
curl -X PATCH https://unbuilt.one/api/feature-flags/action_plan_customization/rollout \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"percentage": 50}'

# Add beta user
curl -X POST https://unbuilt.one/api/feature-flags/action_plan_customization/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": 123}'

# Clear cache
curl -X POST https://unbuilt.one/api/feature-flags/cache/clear \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### User Endpoints (Require User Auth)

```bash
# Check if feature is enabled for current user
curl https://unbuilt.one/api/feature-flags/check/action_plan_customization \
  -H "Authorization: Bearer $USER_TOKEN"

# Get all enabled features for current user
curl https://unbuilt.one/api/feature-flags/user/features \
  -H "Authorization: Bearer $USER_TOKEN"
```

## Monitoring Queries

### Performance Metrics
```sql
-- Plan load time (last hour)
SELECT 
  AVG(response_time_ms) as avg_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_ms
FROM analytics_events
WHERE event_type = 'plan_loaded'
  AND timestamp > NOW() - INTERVAL '1 hour';

-- Task update latency (last hour)
SELECT 
  AVG(response_time_ms) as avg_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_ms
FROM analytics_events
WHERE event_type = 'task_updated'
  AND timestamp > NOW() - INTERVAL '1 hour';
```

### Engagement Metrics
```sql
-- Feature adoption (last 7 days)
SELECT 
  COUNT(DISTINCT user_id) as users_with_plans,
  COUNT(*) as total_plans,
  AVG(total_tasks) as avg_tasks_per_plan
FROM action_plans
WHERE created_at > NOW() - INTERVAL '7 days';

-- Task completion rate (last 7 days)
SELECT 
  COUNT(CASE WHEN status = 'completed' THEN 1 END)::float / COUNT(*) * 100 as completion_rate
FROM plan_tasks
WHERE created_at > NOW() - INTERVAL '7 days';
```

### Error Metrics
```sql
-- Error rate (last hour)
SELECT 
  COUNT(CASE WHEN severity = 'error' THEN 1 END)::float / COUNT(*) * 100 as error_rate
FROM security_audit_logs
WHERE action LIKE '%action_plan%'
  AND timestamp > NOW() - INTERVAL '1 hour';
```

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Performance tests completed
- [ ] Security review completed
- [ ] Database migration tested
- [ ] Monitoring configured

### Phase 1: Internal Testing (Days 1-3)
- [ ] Initialize feature flag
- [ ] Add internal testers
- [ ] Test all functionality
- [ ] Monitor for errors
- [ ] Fix critical bugs

### Phase 2: Beta Testing (Days 4-10)
- [ ] Deploy to 10% of Pro/Enterprise users
- [ ] Monitor metrics daily
- [ ] Collect user feedback
- [ ] Address issues
- [ ] Verify success criteria

### Phase 3: Expanded Beta (Days 11-17)
- [ ] Deploy to 50% of Pro/Enterprise users
- [ ] Continue monitoring
- [ ] Load testing
- [ ] Performance optimization
- [ ] Verify stability

### Phase 4: General Availability (Day 18+)
- [ ] Deploy to 100% of all users
- [ ] Monitor for 48 hours
- [ ] Track adoption metrics
- [ ] Collect feedback
- [ ] Plan next iteration

## Success Criteria

### Technical
- ✅ Error rate < 0.5%
- ✅ Plan load < 1s (p95)
- ✅ Task update < 200ms (p95)
- ✅ 99.9% uptime
- ✅ Zero data loss

### Business
- ✅ 60%+ plan creation rate
- ✅ 40%+ task completion rate
- ✅ 3x return rate increase
- ✅ 70%+ feature adoption
- ✅ 2.5x Pro conversion increase

### User
- ✅ Satisfaction > 4.3/5
- ✅ < 5% support tickets
- ✅ Positive feedback
- ✅ Feature in testimonials

## Rollback Scenarios

### Immediate Rollback (Critical)
```bash
npm run deploy:feature-flag rollback
```
**When:** Error rate > 5%, data loss, security issue

### Partial Rollback (Non-Critical)
```bash
curl -X PATCH https://unbuilt.one/api/feature-flags/action_plan_customization/rollout \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"percentage": 10}'
```
**When:** Error rate 1-5%, performance issues, user complaints

## Alert Thresholds

- 🔴 **Critical**: Error rate > 1%, API response > 2s
- 🟡 **Warning**: Error rate > 0.5%, API response > 1s
- 🟢 **Normal**: Error rate < 0.5%, API response < 1s

## Support Contacts

- **Engineering**: #action-plan-support
- **DevOps**: #devops-alerts
- **On-call**: PagerDuty

---

**Quick Tip:** Keep this guide open during deployment for fast reference!
