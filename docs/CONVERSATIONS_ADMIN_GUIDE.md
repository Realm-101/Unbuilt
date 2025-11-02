# Interactive AI Conversations - Admin Guide

## Overview

This guide provides administrators with information on managing, monitoring, and troubleshooting the Interactive AI Conversations feature. It covers content moderation, cost monitoring, performance optimization, and feature flag management.

## Table of Contents

1. [Content Moderation](#content-moderation)
2. [Cost Monitoring](#cost-monitoring)
3. [Performance Monitoring](#performance-monitoring)
4. [Feature Flags](#feature-flags)
5. [Troubleshooting](#troubleshooting)
6. [Security & Compliance](#security--compliance)
7. [Analytics & Reporting](#analytics--reporting)

## Content Moderation

### Overview

The conversation system includes automated content filtering and moderation to ensure quality and safety. Admins can review flagged content and take appropriate action.

### Automated Filtering

**Input Validation:**
- Profanity detection and blocking
- Prompt injection detection
- Malicious pattern recognition
- PII (Personally Identifiable Information) detection
- Character limit enforcement

**Response Validation:**
- Safety checks on AI responses
- Disclaimer verification (financial, legal topics)
- Misinformation detection
- Inappropriate content flagging

### Reviewing Flagged Content

**Access Flagged Content:**
```bash
# Via API
GET /api/conversations/moderation/flagged
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "flaggedMessages": [
    {
      "id": "msg_123",
      "conversationId": "conv_456",
      "userId": "user_789",
      "content": "[REDACTED]",
      "flagReason": "inappropriate_content",
      "severity": "high",
      "timestamp": "2025-01-15T12:30:00.000Z",
      "status": "pending_review"
    }
  ]
}
```

### Moderation Actions

**Available Actions:**
1. **Approve**: Mark as false positive, no action needed
2. **Remove**: Delete the message from conversation
3. **Warn User**: Send warning to user
4. **Suspend User**: Temporarily suspend conversation access
5. **Ban User**: Permanently ban from conversations

**Taking Action:**
```bash
POST /api/conversations/moderation/flagged/:messageId/action
Authorization: Bearer <admin_token>

{
  "action": "warn_user",
  "reason": "Inappropriate language",
  "notifyUser": true
}
```

### Moderation Dashboard

Access the moderation dashboard at:
```
https://unbuilt.one/admin/conversations/moderation
```

**Features:**
- Real-time flagged content feed
- Severity-based filtering
- Bulk action capabilities
- User history view
- Pattern analysis

### Best Practices

1. **Review High Severity First**: Prioritize high-severity flags
2. **Check Context**: Review full conversation before taking action
3. **Document Decisions**: Add notes explaining moderation decisions
4. **Monitor Patterns**: Look for repeat offenders or systemic issues
5. **Update Filters**: Adjust filters based on false positives/negatives

## Cost Monitoring

### Overview

Monitor and control AI API costs associated with conversations. Track usage patterns, identify cost spikes, and optimize spending.

### Cost Tracking Dashboard

Access the cost dashboard at:
```
https://unbuilt.one/admin/conversations/costs
```

**Metrics Displayed:**
- Total API costs (daily, weekly, monthly)
- Cost per conversation
- Cost per user
- Token usage trends
- Cost breakdown by tier

### API Cost Queries

**Get Cost Summary:**
```bash
GET /api/conversations/costs/summary?period=month
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "period": "month",
  "totalCost": 1250.50,
  "totalTokens": 25000000,
  "totalConversations": 15000,
  "avgCostPerConversation": 0.083,
  "costByTier": {
    "free": 125.00,
    "pro": 875.50,
    "enterprise": 250.00
  },
  "topUsers": [
    {
      "userId": "user_123",
      "cost": 45.50,
      "conversations": 120
    }
  ]
}
```

### Cost Alerts

**Configure Alerts:**
```bash
POST /api/conversations/costs/alerts
Authorization: Bearer <admin_token>

{
  "type": "daily_threshold",
  "threshold": 100.00,
  "notifyEmail": "admin@unbuilt.one"
}
```

**Alert Types:**
- Daily cost threshold exceeded
- Hourly cost spike (>50% increase)
- User cost anomaly (unusual usage)
- Token usage spike

### Cost Optimization Strategies

**1. Context Window Optimization**
- Monitor average context size
- Adjust summarization thresholds
- Optimize analysis data inclusion

**2. Caching**
- Review cache hit rates
- Identify frequently asked questions
- Implement query deduplication

**3. Rate Limiting**
- Adjust tier limits based on usage patterns
- Implement soft limits before hard limits
- Provide upgrade prompts

**4. Model Selection**
- Use appropriate model for task complexity
- Consider cheaper models for simple queries
- Implement fallback models

### Cost Reports

**Generate Monthly Report:**
```bash
GET /api/conversations/costs/report?month=2025-01
Authorization: Bearer <admin_token>
```

**Report Includes:**
- Total costs and trends
- Cost per user tier
- Most expensive conversations
- Optimization recommendations
- Projected costs for next month

## Performance Monitoring

### Overview

Monitor conversation system performance to ensure fast response times, high availability, and good user experience.

### Performance Dashboard

Access at:
```
https://unbuilt.one/admin/conversations/performance
```

**Key Metrics:**
- Average response time
- 95th percentile response time
- Error rate
- API availability
- Cache hit rate
- Concurrent conversations

### Performance Metrics API

**Get Performance Summary:**
```bash
GET /api/conversations/metrics/performance?period=24h
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "period": "24h",
  "responseTime": {
    "avg": 3.2,
    "p50": 2.8,
    "p95": 5.4,
    "p99": 8.1
  },
  "errorRate": 0.018,
  "availability": 99.95,
  "throughput": {
    "messagesPerSecond": 12.5,
    "peakMessagesPerSecond": 45
  },
  "caching": {
    "hitRate": 0.72,
    "missRate": 0.28
  }
}
```

### Performance Alerts

**Configure Alerts:**
```bash
POST /api/conversations/performance/alerts
Authorization: Bearer <admin_token>

{
  "metric": "response_time_p95",
  "threshold": 10.0,
  "duration": 300,
  "notifyEmail": "ops@unbuilt.one"
}
```

**Alert Conditions:**
- Response time >10s (95th percentile) for 5 minutes
- Error rate >5% for 5 minutes
- Availability <99% for 10 minutes
- Cache hit rate <60% for 30 minutes

### Performance Optimization

**1. Response Time Optimization**
- Enable streaming for Pro/Enterprise users
- Optimize context window size
- Implement aggressive caching
- Use CDN for static assets

**2. Error Rate Reduction**
- Implement retry logic with exponential backoff
- Add circuit breakers for AI service
- Improve input validation
- Handle edge cases gracefully

**3. Scalability**
- Monitor concurrent conversation limits
- Implement queue system for high load
- Scale AI service instances
- Optimize database queries

### Monitoring Tools

**Recommended Tools:**
- **Application Monitoring**: New Relic, Datadog, or Application Insights
- **Log Aggregation**: ELK Stack, Splunk, or CloudWatch Logs
- **Alerting**: PagerDuty, Opsgenie, or custom webhooks
- **Tracing**: Jaeger, Zipkin, or OpenTelemetry

## Feature Flags

### Overview

Feature flags allow gradual rollout and A/B testing of conversation features. Control which users have access to specific functionality.

### Available Feature Flags

**Core Features:**
- `conversations_enabled`: Enable/disable conversations globally
- `streaming_enabled`: Enable response streaming
- `variants_enabled`: Enable analysis variants
- `suggested_questions_enabled`: Enable suggested questions
- `export_enabled`: Enable conversation export

**Experimental Features:**
- `voice_input_enabled`: Voice input support
- `advanced_analytics_enabled`: Advanced conversation analytics
- `team_conversations_enabled`: Team collaboration features

### Managing Feature Flags

**Via Admin Dashboard:**
```
https://unbuilt.one/admin/feature-flags
```

**Via API:**
```bash
# Get all feature flags
GET /api/admin/feature-flags
Authorization: Bearer <admin_token>

# Update feature flag
PATCH /api/admin/feature-flags/conversations_enabled
Authorization: Bearer <admin_token>

{
  "enabled": true,
  "rolloutPercentage": 50,
  "enabledTiers": ["pro", "enterprise"],
  "enabledUsers": ["user_123", "user_456"]
}
```

### Gradual Rollout Strategy

**Phase 1: Beta (10% of Pro users)**
```json
{
  "enabled": true,
  "rolloutPercentage": 10,
  "enabledTiers": ["pro"],
  "betaOptIn": true
}
```

**Phase 2: Expanded Beta (50% of Pro users)**
```json
{
  "enabled": true,
  "rolloutPercentage": 50,
  "enabledTiers": ["pro"]
}
```

**Phase 3: General Availability**
```json
{
  "enabled": true,
  "rolloutPercentage": 100,
  "enabledTiers": ["free", "pro", "enterprise"]
}
```

### A/B Testing

**Set Up A/B Test:**
```bash
POST /api/admin/ab-tests
Authorization: Bearer <admin_token>

{
  "name": "streaming_vs_non_streaming",
  "variants": [
    {
      "name": "control",
      "percentage": 50,
      "flags": {
        "streaming_enabled": false
      }
    },
    {
      "name": "treatment",
      "percentage": 50,
      "flags": {
        "streaming_enabled": true
      }
    }
  ],
  "metrics": ["response_satisfaction", "engagement_rate"],
  "duration": 14
}
```

### Feature Flag Best Practices

1. **Start Small**: Begin with small rollout percentages
2. **Monitor Closely**: Watch metrics during rollout
3. **Have Rollback Plan**: Be ready to disable quickly
4. **Document Changes**: Keep changelog of flag changes
5. **Clean Up**: Remove flags after full rollout

## Troubleshooting

### Common Issues

#### High Error Rate

**Symptoms:**
- Error rate >5%
- User complaints about failed messages
- Increased support tickets

**Diagnosis:**
```bash
# Check error logs
GET /api/conversations/logs?level=error&period=1h
Authorization: Bearer <admin_token>

# Check AI service status
GET /api/conversations/health/ai-service
Authorization: Bearer <admin_token>
```

**Solutions:**
1. Check AI service availability
2. Review recent code deployments
3. Check rate limiting configuration
4. Verify database connectivity
5. Review error patterns for common causes

#### Slow Response Times

**Symptoms:**
- Response time >10s (95th percentile)
- User complaints about slowness
- Timeout errors

**Diagnosis:**
```bash
# Check performance metrics
GET /api/conversations/metrics/performance
Authorization: Bearer <admin_token>

# Check slow queries
GET /api/conversations/metrics/slow-queries
Authorization: Bearer <admin_token>
```

**Solutions:**
1. Optimize context window size
2. Increase cache TTL
3. Scale AI service instances
4. Optimize database queries
5. Enable response streaming

#### Cost Spikes

**Symptoms:**
- Sudden increase in API costs
- Budget alerts triggered
- Unusual token usage

**Diagnosis:**
```bash
# Check cost breakdown
GET /api/conversations/costs/breakdown?period=24h
Authorization: Bearer <admin_token>

# Identify high-usage users
GET /api/conversations/costs/top-users?period=24h
Authorization: Bearer <admin_token>
```

**Solutions:**
1. Identify and investigate high-usage users
2. Check for abuse or bot activity
3. Adjust rate limits
4. Optimize context window
5. Implement stricter caching

#### Content Moderation Issues

**Symptoms:**
- Inappropriate content getting through
- Too many false positives
- User complaints about censorship

**Diagnosis:**
```bash
# Review flagged content
GET /api/conversations/moderation/flagged?period=7d
Authorization: Bearer <admin_token>

# Check filter effectiveness
GET /api/conversations/moderation/metrics
Authorization: Bearer <admin_token>
```

**Solutions:**
1. Adjust filter sensitivity
2. Update filter patterns
3. Review false positives
4. Train moderation team
5. Implement user appeals process

### Debug Mode

**Enable Debug Logging:**
```bash
PATCH /api/admin/settings
Authorization: Bearer <admin_token>

{
  "conversations_debug_mode": true,
  "log_level": "debug"
}
```

**Debug Information Includes:**
- Full context window content
- Token usage breakdown
- AI service response times
- Cache hit/miss details
- Error stack traces

**Important**: Disable debug mode in production after troubleshooting to avoid performance impact.

### Support Escalation

**When to Escalate:**
- Critical system outage (>5 minutes)
- Data loss or corruption
- Security incident
- Widespread user impact

**Escalation Contacts:**
- **Engineering**: engineering@unbuilt.one
- **Security**: security@unbuilt.one
- **On-Call**: Use PagerDuty or configured alerting system

## Security & Compliance

### Security Monitoring

**Monitor Security Events:**
```bash
GET /api/conversations/security/events?period=24h
Authorization: Bearer <admin_token>
```

**Event Types:**
- Prompt injection attempts
- Suspicious usage patterns
- Rate limit violations
- Unauthorized access attempts
- Data exfiltration attempts

### Data Privacy

**User Data Handling:**
- All conversations encrypted at rest
- PII automatically redacted in logs
- User data deletion on request
- GDPR/CCPA compliance

**Data Retention:**
- Conversations: Indefinite (user-controlled)
- Logs: 90 days
- Analytics: Aggregated, anonymized
- Flagged content: 1 year

### Compliance Auditing

**Generate Compliance Report:**
```bash
GET /api/conversations/compliance/report?month=2025-01
Authorization: Bearer <admin_token>
```

**Report Includes:**
- Data access logs
- Moderation actions taken
- User data deletion requests
- Security incidents
- Policy violations

### Security Best Practices

1. **Regular Audits**: Review security logs weekly
2. **Access Control**: Limit admin access to need-to-know
3. **Encryption**: Ensure all data encrypted in transit and at rest
4. **Monitoring**: Set up alerts for suspicious activity
5. **Training**: Train staff on security protocols

## Analytics & Reporting

### Engagement Analytics

**Key Metrics:**
- Conversation adoption rate
- Average questions per conversation
- User satisfaction ratings
- Return rate
- Feature usage

**Access Analytics:**
```bash
GET /api/conversations/analytics/engagement?period=month
Authorization: Bearer <admin_token>
```

### Business Impact

**Metrics to Track:**
- Conversion rate impact
- Retention rate impact
- Upgrade rate from Free to Pro
- Customer lifetime value impact
- Support ticket reduction

### Custom Reports

**Create Custom Report:**
```bash
POST /api/conversations/reports/custom
Authorization: Bearer <admin_token>

{
  "name": "Monthly Executive Summary",
  "metrics": [
    "total_conversations",
    "adoption_rate",
    "avg_satisfaction",
    "cost_per_conversation",
    "conversion_impact"
  ],
  "period": "month",
  "recipients": ["exec@unbuilt.one"],
  "schedule": "monthly"
}
```

### Exporting Data

**Export Analytics Data:**
```bash
GET /api/conversations/analytics/export?format=csv&period=month
Authorization: Bearer <admin_token>
```

**Available Formats:**
- CSV: For spreadsheet analysis
- JSON: For programmatic processing
- PDF: For executive reports

## Appendix

### Configuration Reference

**Environment Variables:**
```bash
# AI Service
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-2.5-pro
GEMINI_TEMPERATURE=0.7

# Rate Limiting
CONV_FREE_LIMIT_PER_ANALYSIS=5
CONV_FREE_LIMIT_PER_DAY=20
CONV_PRO_LIMIT_PER_ANALYSIS=unlimited

# Performance
CONV_MAX_CONTEXT_TOKENS=8000
CONV_CACHE_TTL=3600
CONV_MAX_CONCURRENT=100

# Moderation
CONV_CONTENT_FILTER_ENABLED=true
CONV_PROMPT_INJECTION_DETECTION=true
CONV_AUTO_MODERATION=true

# Feature Flags
CONV_STREAMING_ENABLED=true
CONV_VARIANTS_ENABLED=true
CONV_EXPORT_ENABLED=true
```

### API Endpoints Reference

See [CONVERSATIONS_API.md](./CONVERSATIONS_API.md) for complete API documentation.

### Monitoring Checklist

**Daily:**
- [ ] Check error rate (<2%)
- [ ] Review flagged content
- [ ] Monitor API costs
- [ ] Check response times

**Weekly:**
- [ ] Review performance trends
- [ ] Analyze user feedback
- [ ] Check cache effectiveness
- [ ] Review security logs

**Monthly:**
- [ ] Generate cost report
- [ ] Review engagement metrics
- [ ] Analyze business impact
- [ ] Update documentation

### Contact Information

**Support:**
- Email: support@unbuilt.one
- Slack: #conversations-support
- On-Call: PagerDuty

**Engineering:**
- Email: engineering@unbuilt.one
- Slack: #conversations-eng

**Security:**
- Email: security@unbuilt.one
- Emergency: security-emergency@unbuilt.one

---

**Last Updated:** October 28, 2025  
**Version:** 1.0  
**Status:** Production Ready
