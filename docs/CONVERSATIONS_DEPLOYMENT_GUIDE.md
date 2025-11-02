# Interactive AI Conversations - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Interactive AI Conversations feature to production using a phased rollout approach with feature flags.

## Prerequisites

Before deploying, ensure:

- [ ] All tests passing (unit, integration, E2E)
- [ ] Code review completed
- [ ] Security review completed
- [ ] Performance testing completed
- [ ] Documentation updated
- [ ] Monitoring and alerting configured
- [ ] Rollback plan prepared

## Deployment Strategy

We use a phased rollout approach to minimize risk and gather feedback:

1. **Phase 1**: Beta (10% of Pro users) - 1 week
2. **Phase 2**: Expanded Beta (50% of Pro users) - 1 week
3. **Phase 3**: General Availability (All users) - Ongoing

## Phase 1: Beta Release (10% of Pro Users)

### Objectives

- Validate core functionality in production
- Gather initial user feedback
- Monitor performance and costs
- Identify and fix critical issues

### Pre-Deployment Checklist

- [ ] Database migrations tested and ready
- [ ] Environment variables configured
- [ ] AI service API keys configured
- [ ] Monitoring dashboards created
- [ ] Alert rules configured
- [ ] Support team briefed
- [ ] Beta user list prepared

### Deployment Steps

#### 1. Database Migration

```bash
# Run conversation migration
npm run db:migrate

# Verify migration
npm run db:verify
```

**Migration includes:**
- conversations table
- conversation_messages table
- suggested_questions table
- conversation_analytics table

#### 2. Environment Configuration

Add to `.env.production`:

```bash
# AI Service
GEMINI_API_KEY=your_production_api_key
GEMINI_MODEL=gemini-2.5-pro
GEMINI_TEMPERATURE=0.7
GEMINI_MAX_TOKENS=8000

# Feature Flags
CONVERSATIONS_ENABLED=true
CONVERSATIONS_ROLLOUT_PERCENTAGE=10
CONVERSATIONS_ENABLED_TIERS=pro,enterprise
CONVERSATIONS_BETA_OPT_IN=true

# Rate Limiting
CONV_FREE_LIMIT_PER_ANALYSIS=5
CONV_FREE_LIMIT_PER_DAY=20
CONV_PRO_LIMIT_PER_ANALYSIS=unlimited

# Performance
CONV_MAX_CONTEXT_TOKENS=8000
CONV_CACHE_TTL=3600
CONV_MAX_CONCURRENT=100
CONV_STREAMING_ENABLED=true

# Moderation
CONV_CONTENT_FILTER_ENABLED=true
CONV_PROMPT_INJECTION_DETECTION=true
CONV_AUTO_MODERATION=true

# Monitoring
CONV_METRICS_ENABLED=true
CONV_LOGGING_LEVEL=info
```

#### 3. Deploy Application

```bash
# Build production bundle
npm run build

# Deploy to production
npm run deploy:production

# Verify deployment
curl https://unbuilt.one/api/health
```

#### 4. Enable Feature Flag

```bash
# Via API
curl -X PATCH https://unbuilt.one/api/admin/feature-flags/conversations_enabled \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "rolloutPercentage": 10,
    "enabledTiers": ["pro", "enterprise"],
    "betaOptIn": true
  }'
```

**Or via Admin Dashboard:**
1. Navigate to https://unbuilt.one/admin/feature-flags
2. Find "conversations_enabled"
3. Set rollout percentage to 10%
4. Enable for Pro and Enterprise tiers
5. Enable beta opt-in
6. Save changes

#### 5. Verify Deployment

**Test Conversation Flow:**
```bash
# Create test conversation
curl -X POST https://unbuilt.one/api/conversations/test_analysis_id/messages \
  -H "Authorization: Bearer $TEST_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Test message"}'

# Verify response
# Should receive AI response with suggested questions
```

**Check Monitoring:**
- [ ] Metrics appearing in dashboard
- [ ] Logs flowing correctly
- [ ] Alerts configured and working
- [ ] No errors in error tracking

#### 6. Monitor Beta Period (1 Week)

**Daily Monitoring:**
- Error rate (<2%)
- Response times (<5s avg)
- API costs (within budget)
- User feedback
- Support tickets

**Key Metrics to Track:**
```bash
# Get beta metrics
curl https://unbuilt.one/api/conversations/metrics?period=24h \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Success Criteria:**
- Error rate <2%
- Average response time <5s
- User satisfaction >4.0/5
- No critical bugs
- API costs within projections

### Rollback Plan

If critical issues arise:

```bash
# Disable feature flag immediately
curl -X PATCH https://unbuilt.one/api/admin/feature-flags/conversations_enabled \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# Or via admin dashboard
# Set conversations_enabled to false
```

**Rollback triggers:**
- Error rate >5% for >10 minutes
- Critical security vulnerability
- Data loss or corruption
- API costs >200% of projections
- Widespread user complaints

## Phase 2: Expanded Beta (50% of Pro Users)

### Objectives

- Scale to larger user base
- Validate performance at scale
- Gather more diverse feedback
- Fine-tune based on Phase 1 learnings

### Pre-Phase 2 Checklist

- [ ] Phase 1 success criteria met
- [ ] Critical bugs from Phase 1 fixed
- [ ] Performance optimizations applied
- [ ] Cost projections validated
- [ ] Support team ready for increased volume

### Deployment Steps

#### 1. Review Phase 1 Results

**Analyze Metrics:**
```bash
# Get Phase 1 summary
curl https://unbuilt.one/api/conversations/analytics/phase-summary?phase=1 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Review:**
- User feedback and satisfaction
- Performance metrics
- Cost analysis
- Bug reports and resolutions
- Feature requests

#### 2. Apply Optimizations

Based on Phase 1 learnings:

**Performance Optimizations:**
- Adjust context window size if needed
- Optimize caching strategy
- Fine-tune rate limits
- Improve error handling

**Cost Optimizations:**
- Implement query deduplication
- Optimize context summarization
- Adjust cache TTL
- Review model parameters

#### 3. Increase Rollout Percentage

```bash
# Update feature flag to 50%
curl -X PATCH https://unbuilt.one/api/admin/feature-flags/conversations_enabled \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "rolloutPercentage": 50,
    "enabledTiers": ["pro", "enterprise"],
    "betaOptIn": false
  }'
```

**Note:** Beta opt-in disabled - automatic rollout to 50% of Pro users

#### 4. Monitor Expanded Beta (1 Week)

**Daily Monitoring:**
- Same metrics as Phase 1
- Watch for scaling issues
- Monitor cost trends
- Track user adoption

**Success Criteria:**
- Error rate <2%
- Average response time <5s
- User satisfaction >4.2/5
- No critical bugs
- API costs within 110% of projections
- Adoption rate >40%

### Rollback Plan

Same as Phase 1, but can also:

```bash
# Reduce rollout percentage instead of full disable
curl -X PATCH https://unbuilt.one/api/admin/feature-flags/conversations_enabled \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rolloutPercentage": 10}'
```

## Phase 3: General Availability (All Users)

### Objectives

- Make feature available to all users
- Maximize adoption and engagement
- Continue monitoring and optimization
- Gather feedback for future improvements

### Pre-GA Checklist

- [ ] Phase 2 success criteria met
- [ ] All critical and high-priority bugs fixed
- [ ] Performance validated at scale
- [ ] Cost model validated
- [ ] Marketing materials prepared
- [ ] Support documentation complete
- [ ] Training completed for support team

### Deployment Steps

#### 1. Final Review

**Comprehensive Review:**
- All metrics from Phase 1 and 2
- User feedback analysis
- Cost analysis and projections
- Performance at scale
- Security audit results

#### 2. Enable for All Tiers

```bash
# Update feature flag for GA
curl -X PATCH https://unbuilt.one/api/admin/feature-flags/conversations_enabled \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "rolloutPercentage": 100,
    "enabledTiers": ["free", "pro", "enterprise"]
  }'
```

#### 3. Launch Communications

**Internal:**
- Announce to team
- Update internal documentation
- Brief support team
- Update sales materials

**External:**
- Blog post announcement
- Email to users
- Social media posts
- Update product documentation
- In-app announcement

#### 4. Monitor GA Launch

**First Week:**
- Monitor metrics hourly
- Watch for spikes in usage
- Track support tickets
- Gather user feedback
- Monitor costs closely

**Ongoing:**
- Weekly metric reviews
- Monthly cost analysis
- Quarterly feature reviews
- Continuous optimization

### Success Metrics (30 Days Post-GA)

**Engagement:**
- Conversation adoption rate >40%
- Average questions per conversation >3
- Return rate >75%

**Quality:**
- User satisfaction >4.2/5
- Error rate <2%
- Average response time <5s

**Business:**
- Conversion impact: 2x increase
- Retention impact: 30% improvement
- Support ticket reduction: 20%

## Monitoring & Alerting

### Critical Alerts

Configure alerts for:

**Performance:**
- Response time >10s (95th percentile) for 5 minutes
- Error rate >5% for 5 minutes
- API availability <99% for 10 minutes

**Cost:**
- Hourly cost >150% of baseline
- Daily cost >$500
- User cost anomaly detected

**Security:**
- Prompt injection attempts >10/hour
- Suspicious usage pattern detected
- Unauthorized access attempts

**Quality:**
- User satisfaction <3.5/5 for 24 hours
- Inappropriate content rate >1%
- Moderation queue >50 items

### Monitoring Dashboards

**Create Dashboards:**

1. **Operations Dashboard**
   - Real-time metrics
   - Error rates
   - Response times
   - API availability

2. **Cost Dashboard**
   - Hourly/daily costs
   - Cost per conversation
   - Token usage trends
   - Budget tracking

3. **Engagement Dashboard**
   - Adoption rate
   - Active conversations
   - User satisfaction
   - Feature usage

4. **Quality Dashboard**
   - Moderation queue
   - Flagged content
   - User reports
   - AI response quality

## Rollback Procedures

### Immediate Rollback (Critical Issues)

```bash
# 1. Disable feature flag
curl -X PATCH https://unbuilt.one/api/admin/feature-flags/conversations_enabled \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# 2. Verify feature disabled
curl https://unbuilt.one/api/conversations/health \
  -H "Authorization: Bearer $TEST_USER_TOKEN"
# Should return: {"enabled": false}

# 3. Notify stakeholders
# Send notification to team and users

# 4. Investigate issue
# Review logs, metrics, and error reports

# 5. Fix and redeploy
# Apply fix and follow deployment process again
```

### Partial Rollback (Non-Critical Issues)

```bash
# Reduce rollout percentage
curl -X PATCH https://unbuilt.one/api/admin/feature-flags/conversations_enabled \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rolloutPercentage": 25}'

# Or disable for specific tiers
curl -X PATCH https://unbuilt.one/api/admin/feature-flags/conversations_enabled \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabledTiers": ["enterprise"]}'
```

## Post-Deployment

### Week 1 Tasks

- [ ] Daily metric reviews
- [ ] Monitor support tickets
- [ ] Gather user feedback
- [ ] Address critical bugs
- [ ] Optimize based on data

### Week 2-4 Tasks

- [ ] Weekly metric reviews
- [ ] Cost analysis and optimization
- [ ] Performance tuning
- [ ] Feature refinements
- [ ] Documentation updates

### Month 2+ Tasks

- [ ] Monthly metric reviews
- [ ] Quarterly business review
- [ ] Feature roadmap planning
- [ ] Continuous optimization
- [ ] User research and feedback

## Troubleshooting

### Common Deployment Issues

**Issue: Database migration fails**
```bash
# Check migration status
npm run db:status

# Rollback migration
npm run db:rollback

# Fix migration script and retry
npm run db:migrate
```

**Issue: Feature flag not taking effect**
```bash
# Clear cache
curl -X POST https://unbuilt.one/api/admin/cache/clear \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Restart application
npm run restart:production
```

**Issue: High error rate after deployment**
```bash
# Check error logs
curl https://unbuilt.one/api/conversations/logs?level=error \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Check AI service status
curl https://unbuilt.one/api/conversations/health/ai-service \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# If critical, rollback immediately
```

**Issue: Unexpected cost spike**
```bash
# Check cost breakdown
curl https://unbuilt.one/api/conversations/costs/breakdown \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Identify high-usage users
curl https://unbuilt.one/api/conversations/costs/top-users \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Adjust rate limits if needed
```

## Support & Escalation

### Support Contacts

**Engineering:**
- Email: engineering@unbuilt.one
- Slack: #conversations-eng
- On-Call: PagerDuty

**Operations:**
- Email: ops@unbuilt.one
- Slack: #ops
- On-Call: PagerDuty

**Security:**
- Email: security@unbuilt.one
- Emergency: security-emergency@unbuilt.one

### Escalation Criteria

**Immediate Escalation:**
- System outage >5 minutes
- Data loss or corruption
- Security breach
- Error rate >10%

**Urgent Escalation:**
- Error rate >5% for >10 minutes
- Response time >15s for >10 minutes
- Cost spike >200% of baseline
- Widespread user complaints

**Standard Escalation:**
- Error rate >2% for >1 hour
- Performance degradation
- Cost spike >150% of baseline
- Multiple user complaints

## Appendix

### Environment Variables Reference

See [CONVERSATIONS_ADMIN_GUIDE.md](./CONVERSATIONS_ADMIN_GUIDE.md#configuration-reference) for complete reference.

### API Endpoints Reference

See [CONVERSATIONS_API.md](./CONVERSATIONS_API.md) for complete API documentation.

### Deployment Checklist

**Pre-Deployment:**
- [ ] All tests passing
- [ ] Code review completed
- [ ] Security review completed
- [ ] Performance testing completed
- [ ] Documentation updated
- [ ] Monitoring configured
- [ ] Rollback plan prepared

**Deployment:**
- [ ] Database migration completed
- [ ] Environment variables configured
- [ ] Application deployed
- [ ] Feature flag enabled
- [ ] Deployment verified
- [ ] Monitoring active

**Post-Deployment:**
- [ ] Metrics reviewed
- [ ] User feedback gathered
- [ ] Support tickets monitored
- [ ] Costs tracked
- [ ] Documentation updated

---

**Last Updated:** October 28, 2025  
**Version:** 1.0  
**Status:** Production Ready
