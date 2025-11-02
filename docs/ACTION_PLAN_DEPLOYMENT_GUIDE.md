# Action Plan Customization - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Action Plan Customization feature to production using a phased rollout approach with feature flags.

## Prerequisites

### Environment Setup

1. **Database Migration**: Ensure feature flag tables are created
2. **Environment Variables**: No additional variables required
3. **Dependencies**: All dependencies installed via `npm install`

### Pre-Deployment Checklist

- [ ] All tests passing (unit, integration, E2E)
- [ ] Performance tests completed
- [ ] Security review completed
- [ ] Database migration tested on staging
- [ ] Monitoring and alerting configured
- [ ] Rollback plan documented

## Deployment Phases

### Phase 0: Database Migration

Run the feature flag migration:

```bash
# Apply migration
npm run db:push

# Or manually run migration
psql $DATABASE_URL < migrations/0012_feature_flags.sql
```

Verify migration:

```bash
# Check tables exist
psql $DATABASE_URL -c "\dt feature_flags"
psql $DATABASE_URL -c "\dt user_feature_flags"
```

### Phase 1: Initialize Feature Flag (Day 0)

Initialize the feature flag in disabled state:

```bash
npm run deploy:feature-flag init
```

This creates the feature flag with:
- Status: Disabled
- Rollout: 0%
- Allowed Tiers: None
- Beta Users: None

Verify initialization:

```bash
npm run deploy:feature-flag status
```

### Phase 2: Internal Testing (Days 1-3)

Enable for internal testers only:

```bash
# Add internal tester user IDs
npm run deploy:feature-flag add-user 1
npm run deploy:feature-flag add-user 2
npm run deploy:feature-flag add-user 3

# Enable feature for beta users only
npm run deploy:feature-flag deploy "internal"
```

**Testing Checklist:**
- [ ] Create action plan from search results
- [ ] Add/edit/delete tasks
- [ ] Mark tasks as complete
- [ ] Reorder tasks with drag-and-drop
- [ ] Test progress tracking
- [ ] Test task dependencies
- [ ] Export to CSV/Markdown
- [ ] Test on mobile devices
- [ ] Verify WebSocket real-time updates
- [ ] Test undo/redo functionality

**Monitoring:**
- Error rates < 0.1%
- API response times < 500ms
- Task update latency < 200ms
- No data loss incidents

### Phase 3: Beta Testing - 10% Rollout (Days 4-10)

Deploy to 10% of Pro and Enterprise users:

```bash
npm run deploy:feature-flag deploy "beta"
```

This configuration:
- Enabled: Yes
- Rollout: 10%
- Allowed Tiers: Pro, Enterprise
- Duration: 1 week

**Monitoring Metrics:**

```bash
# Check feature flag status
npm run deploy:feature-flag status

# Monitor API metrics
curl https://unbuilt.one/api/performance/metrics \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Check error logs
npm run logs:errors -- --feature action_plan_customization
```

**Success Criteria:**
- Error rate < 0.5%
- User engagement > 60% (users who create plans)
- Task completion rate > 40%
- No critical bugs reported
- Performance within SLA (< 1s plan load, < 200ms task update)

**If Issues Occur:**

```bash
# Reduce rollout to 5%
curl -X PATCH https://unbuilt.one/api/feature-flags/action_plan_customization/rollout \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"percentage": 5}'

# Or rollback completely
npm run deploy:feature-flag rollback
```

### Phase 4: Expanded Beta - 50% Rollout (Days 11-17)

If Phase 3 is successful, expand to 50%:

```bash
npm run deploy:feature-flag deploy "expanded"
```

This configuration:
- Enabled: Yes
- Rollout: 50%
- Allowed Tiers: Pro, Enterprise
- Duration: 1 week

**Monitoring:**
- Continue monitoring all metrics from Phase 3
- Watch for performance degradation with increased load
- Monitor database query performance
- Check WebSocket connection stability

**Load Testing:**

```bash
# Run performance tests with 50% load
npm run test:performance -- --load 50
```

### Phase 5: General Availability - 100% Rollout (Day 18+)

Deploy to all users:

```bash
npm run deploy:feature-flag deploy "general"
```

This configuration:
- Enabled: Yes
- Rollout: 100%
- Allowed Tiers: All
- Duration: Ongoing

**Post-GA Monitoring:**
- Monitor for 48 hours with increased alerting
- Track adoption metrics
- Collect user feedback
- Monitor support tickets

## Monitoring and Metrics

### Key Metrics to Track

**Performance Metrics:**
```sql
-- Plan load time
SELECT 
  AVG(response_time_ms) as avg_load_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_load_time
FROM analytics_events
WHERE event_type = 'plan_loaded'
  AND timestamp > NOW() - INTERVAL '1 hour';

-- Task update latency
SELECT 
  AVG(response_time_ms) as avg_update_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_update_time
FROM analytics_events
WHERE event_type = 'task_updated'
  AND timestamp > NOW() - INTERVAL '1 hour';
```

**Engagement Metrics:**
```sql
-- Feature adoption rate
SELECT 
  COUNT(DISTINCT user_id) as users_with_plans,
  COUNT(*) as total_plans,
  AVG(total_tasks) as avg_tasks_per_plan
FROM action_plans
WHERE created_at > NOW() - INTERVAL '7 days';

-- Task completion rate
SELECT 
  COUNT(CASE WHEN status = 'completed' THEN 1 END)::float / COUNT(*) * 100 as completion_rate
FROM plan_tasks
WHERE created_at > NOW() - INTERVAL '7 days';
```

**Error Metrics:**
```sql
-- Error rate
SELECT 
  COUNT(CASE WHEN severity = 'error' THEN 1 END)::float / COUNT(*) * 100 as error_rate
FROM security_audit_logs
WHERE action LIKE '%action_plan%'
  AND timestamp > NOW() - INTERVAL '1 hour';
```

### Alerting Thresholds

Configure alerts for:
- Error rate > 1%
- API response time > 1s (p95)
- Task update latency > 500ms (p95)
- Database query time > 2s
- WebSocket disconnection rate > 5%

## Rollback Procedures

### Immediate Rollback (Critical Issues)

```bash
# Disable feature immediately
npm run deploy:feature-flag rollback

# Or via API
curl -X PATCH https://unbuilt.one/api/feature-flags/action_plan_customization \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

### Partial Rollback (Non-Critical Issues)

```bash
# Reduce rollout percentage
curl -X PATCH https://unbuilt.one/api/feature-flags/action_plan_customization/rollout \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"percentage": 10}'
```

### Database Rollback (If Needed)

```bash
# Rollback migration (CAUTION: Data loss)
psql $DATABASE_URL < migrations/0012_feature_flags_rollback.sql
```

**Note:** Database rollback will remove all action plans and tasks. Only use if absolutely necessary.

## Troubleshooting

### Issue: Feature not appearing for users

**Check:**
1. Feature flag status: `npm run deploy:feature-flag status`
2. User tier eligibility
3. Rollout percentage
4. Cache: `curl -X POST https://unbuilt.one/api/feature-flags/cache/clear`

### Issue: High error rates

**Actions:**
1. Check error logs: `npm run logs:errors`
2. Reduce rollout percentage
3. Investigate specific error patterns
4. Consider rollback if critical

### Issue: Performance degradation

**Actions:**
1. Check database query performance
2. Monitor WebSocket connections
3. Review cache hit rates
4. Scale infrastructure if needed

### Issue: Data inconsistency

**Actions:**
1. Check task history for audit trail
2. Verify WebSocket message delivery
3. Review optimistic update rollbacks
4. Check database transaction logs

## Post-Deployment Tasks

### Week 1
- [ ] Monitor all metrics daily
- [ ] Review user feedback
- [ ] Address critical bugs
- [ ] Optimize performance bottlenecks

### Week 2
- [ ] Analyze adoption metrics
- [ ] Collect user testimonials
- [ ] Plan feature enhancements
- [ ] Update documentation

### Month 1
- [ ] Review success metrics vs. goals
- [ ] Plan next feature iteration
- [ ] Conduct user surveys
- [ ] Optimize based on usage patterns

## Success Criteria

### Technical Success
- ✅ Error rate < 0.5%
- ✅ Plan load time < 1s (p95)
- ✅ Task update latency < 200ms (p95)
- ✅ 99.9% uptime
- ✅ Zero data loss incidents

### Business Success
- ✅ 60%+ of users create action plans
- ✅ 40%+ task completion rate within 30 days
- ✅ 3x increase in user return rate
- ✅ 70%+ feature adoption among active users
- ✅ 2.5x increase in Pro conversion rate

### User Success
- ✅ User satisfaction > 4.3/5
- ✅ < 5% support ticket rate
- ✅ Positive user feedback
- ✅ Feature usage in user testimonials

## Support and Escalation

### Support Channels
- **Slack**: #action-plan-support
- **Email**: support@unbuilt.one
- **On-call**: PagerDuty rotation

### Escalation Path
1. **Level 1**: Support team (response time: 1 hour)
2. **Level 2**: Engineering team (response time: 30 minutes)
3. **Level 3**: CTO/Lead Engineer (response time: 15 minutes)

### Emergency Contacts
- **Engineering Lead**: [Contact Info]
- **DevOps Lead**: [Contact Info]
- **CTO**: [Contact Info]

## Appendix

### Feature Flag API Reference

```bash
# Get all feature flags
GET /api/feature-flags

# Get specific feature flag
GET /api/feature-flags/:name

# Create/update feature flag
POST /api/feature-flags
{
  "name": "action_plan_customization",
  "description": "...",
  "enabled": true,
  "rolloutPercentage": 50,
  "allowedTiers": ["pro", "enterprise"],
  "allowedUserIds": [1, 2, 3]
}

# Update rollout percentage
PATCH /api/feature-flags/:name/rollout
{
  "percentage": 75
}

# Add beta user
POST /api/feature-flags/:name/users
{
  "userId": 123
}

# Remove beta user
DELETE /api/feature-flags/:name/users/:userId

# Check if feature is enabled for current user
GET /api/feature-flags/check/:name

# Get all features enabled for current user
GET /api/feature-flags/user/features

# Clear feature flag cache
POST /api/feature-flags/cache/clear
```

### Database Schema

```sql
-- Feature flags table
CREATE TABLE feature_flags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false NOT NULL,
  rollout_percentage INTEGER DEFAULT 0 NOT NULL,
  allowed_tiers JSONB DEFAULT '[]'::jsonb NOT NULL,
  allowed_user_ids JSONB DEFAULT '[]'::jsonb NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- User feature flags table
CREATE TABLE user_feature_flags (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  feature_flag_id INTEGER NOT NULL REFERENCES feature_flags(id),
  enabled BOOLEAN DEFAULT true NOT NULL,
  enabled_at TIMESTAMP DEFAULT NOW() NOT NULL,
  disabled_at TIMESTAMP,
  UNIQUE(user_id, feature_flag_id)
);
```

---

**Document Version:** 1.0  
**Last Updated:** November 1, 2025  
**Status:** Ready for Deployment
