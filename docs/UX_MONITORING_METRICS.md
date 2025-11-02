# UX Features Monitoring & Metrics

This document defines the monitoring strategy and key metrics for tracking the success of UX and Information Architecture improvements.

## Overview

Monitoring the UX features involves tracking three main categories:
1. **Technical Metrics**: Performance, errors, availability
2. **Product Metrics**: Feature adoption, user engagement
3. **Business Metrics**: Retention, conversion, satisfaction

## Technical Metrics

### Application Performance

#### Page Load Times

**Target**: <2 seconds for 95th percentile

**Measurement**:
```javascript
// Track with Performance API
window.addEventListener('load', () => {
  const perfData = performance.getEntriesByType('navigation')[0];
  analytics.track('page_load', {
    loadTime: perfData.loadEventEnd - perfData.fetchStart,
    domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
    page: window.location.pathname,
  });
});
```

**Monitoring**:
- Dashboard widget showing 50th, 95th, 99th percentiles
- Alert if 95th percentile >3s
- Track by page (dashboard, analysis, onboarding)

#### API Response Times

**Target**: <200ms for 95th percentile

**Endpoints to Monitor**:
- `GET /api/user/preferences` - <100ms
- `POST /api/projects` - <150ms
- `POST /api/progress/:id/steps/:stepId/complete` - <100ms
- `POST /api/share/:analysisId` - <200ms
- `GET /api/help/articles` - <150ms
- `GET /api/search/global` - <300ms

**Monitoring**:
```javascript
// Express middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.histogram('api.response_time', duration, {
      method: req.method,
      route: req.route?.path,
      status: res.statusCode,
    });
  });
  next();
});
```

#### Database Query Performance

**Target**: <50ms for 95th percentile

**Queries to Monitor**:
- User preferences lookup
- Project list retrieval
- Progress tracking updates
- Share link generation
- Help article search

**Monitoring**:
```sql
-- Enable slow query log
ALTER DATABASE unbuilt SET log_min_duration_statement = 100;

-- Monitor query performance
SELECT 
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 50
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### Error Tracking

#### Error Rates

**Target**: <0.5% error rate

**Error Categories**:
- **Client Errors (4xx)**: User input issues
- **Server Errors (5xx)**: Application bugs
- **Network Errors**: Connection issues
- **JavaScript Errors**: Frontend bugs

**Monitoring**:
```javascript
// Frontend error tracking
window.addEventListener('error', (event) => {
  errorTracking.captureException(event.error, {
    context: {
      page: window.location.pathname,
      user: currentUser?.id,
      timestamp: new Date().toISOString(),
    },
  });
});

// API error tracking
app.use((err, req, res, next) => {
  errorTracking.captureException(err, {
    context: {
      method: req.method,
      path: req.path,
      user: req.user?.id,
      body: req.body,
    },
  });
  res.status(500).json({ error: 'Internal server error' });
});
```

#### Critical Errors

**Immediate Alert**:
- Database connection failures
- Authentication system failures
- Payment processing errors
- Data corruption detected

**Alert Configuration**:
```javascript
const criticalAlerts = {
  databaseDown: {
    condition: 'database_connection_failed',
    notify: ['engineering@unbuilt.one', 'oncall@unbuilt.one'],
    severity: 'critical',
  },
  highErrorRate: {
    condition: 'error_rate > 5%',
    notify: ['engineering@unbuilt.one'],
    severity: 'critical',
  },
  authFailure: {
    condition: 'auth_system_down',
    notify: ['engineering@unbuilt.one', 'oncall@unbuilt.one'],
    severity: 'critical',
  },
};
```

### Availability

#### Uptime

**Target**: 99.9% uptime (43 minutes downtime per month)

**Monitoring**:
- External monitoring service (Pingdom, UptimeRobot)
- Health check endpoint: `GET /health`
- Check every 1 minute
- Alert if down for >2 minutes

**Health Check Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-27T12:00:00Z",
  "version": "2.2.0",
  "uptime": 86400,
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "ai": "healthy"
  }
}
```

## Product Metrics

### Onboarding Metrics

#### Onboarding Completion Rate

**Target**: 80%+ completion rate

**Measurement**:
```javascript
// Track onboarding steps
analytics.track('onboarding_started', {
  userId: user.id,
  timestamp: new Date().toISOString(),
});

analytics.track('onboarding_role_selected', {
  userId: user.id,
  role: selectedRole,
});

analytics.track('onboarding_completed', {
  userId: user.id,
  duration: completionTime,
  skipped: false,
});
```

**Funnel Analysis**:
```
Registration → Role Selection → Tour Start → Tour Complete
    100%            95%             85%          80%
```

**Metrics to Track**:
- Completion rate by role
- Time to complete
- Skip rate
- Drop-off points

#### Tour Engagement

**Target**: 70%+ users complete tour

**Measurement**:
```javascript
analytics.track('tour_started', {
  userId: user.id,
  step: 1,
});

analytics.track('tour_step_completed', {
  userId: user.id,
  step: stepNumber,
  totalSteps: totalSteps,
});

analytics.track('tour_completed', {
  userId: user.id,
  duration: completionTime,
});

analytics.track('tour_dismissed', {
  userId: user.id,
  step: currentStep,
  reason: 'user_dismissed',
});
```

**Metrics to Track**:
- Completion rate
- Average steps completed
- Dismiss rate by step
- Resume rate

### Dashboard Metrics

#### Project Usage

**Target**: 60%+ users create at least one project

**Measurement**:
```javascript
analytics.track('project_created', {
  userId: user.id,
  projectId: project.id,
  analysisCount: 0,
});

analytics.track('analysis_added_to_project', {
  userId: user.id,
  projectId: project.id,
  analysisId: analysis.id,
});
```

**Metrics to Track**:
- % users with projects
- Average projects per user
- Average analyses per project
- Project organization patterns

#### Favorites Usage

**Target**: 50%+ users favorite at least one analysis

**Measurement**:
```javascript
analytics.track('analysis_favorited', {
  userId: user.id,
  analysisId: analysis.id,
});

analytics.track('analysis_unfavorited', {
  userId: user.id,
  analysisId: analysis.id,
});
```

**Metrics to Track**:
- % users using favorites
- Average favorites per user
- Favorite/unfavorite ratio

### Progress Tracking Metrics

#### Progress Tracking Adoption

**Target**: 50%+ users track progress

**Measurement**:
```javascript
analytics.track('step_completed', {
  userId: user.id,
  analysisId: analysis.id,
  stepId: step.id,
  phaseId: phase.id,
  overallCompletion: completionPercentage,
});

analytics.track('phase_completed', {
  userId: user.id,
  analysisId: analysis.id,
  phaseId: phase.id,
  duration: phaseDuration,
});
```

**Metrics to Track**:
- % users tracking progress
- Average completion rate
- Time to complete phases
- Undo rate (accidental checks)

#### Engagement with Action Plans

**Target**: 40%+ users complete at least one phase

**Metrics to Track**:
- % users with any progress
- % users completing Phase 1
- % users completing all phases
- Average time per phase
- Abandonment rate by phase

### Sharing Metrics

#### Share Link Creation

**Target**: 30%+ users create at least one share link

**Measurement**:
```javascript
analytics.track('share_link_created', {
  userId: user.id,
  analysisId: analysis.id,
  linkId: shareLink.id,
  expiresAt: shareLink.expiresAt,
});

analytics.track('share_link_accessed', {
  linkId: shareLink.id,
  viewerIp: req.ip,
  viewerLocation: geoLocation,
});

analytics.track('share_link_revoked', {
  userId: user.id,
  linkId: shareLink.id,
  viewCount: shareLink.viewCount,
});
```

**Metrics to Track**:
- % users creating share links
- Average share links per user
- Average views per link
- Revocation rate
- Time to first view

### Help System Metrics

#### Help System Usage

**Target**: 70%+ users access help system

**Measurement**:
```javascript
analytics.track('help_panel_opened', {
  userId: user.id,
  context: currentPage,
  trigger: 'button_click', // or 'keyboard_shortcut'
});

analytics.track('help_article_viewed', {
  userId: user.id,
  articleId: article.id,
  context: currentPage,
});

analytics.track('help_search_performed', {
  userId: user.id,
  query: searchQuery,
  resultsCount: results.length,
});

analytics.track('help_feedback_submitted', {
  userId: user.id,
  articleId: article.id,
  helpful: true,
  comment: feedbackComment,
});
```

**Metrics to Track**:
- % users accessing help
- Most viewed articles
- Search success rate
- Helpful rating by article
- Video view completion rate

### Keyboard Shortcuts Metrics

#### Keyboard Shortcuts Usage

**Target**: 20%+ active users use shortcuts

**Measurement**:
```javascript
analytics.track('keyboard_shortcut_used', {
  userId: user.id,
  shortcut: shortcutKey,
  action: actionName,
  context: currentPage,
});

analytics.track('keyboard_shortcuts_customized', {
  userId: user.id,
  customizations: customShortcuts,
});
```

**Metrics to Track**:
- % users using shortcuts
- Most used shortcuts
- Customization rate
- Shortcuts reference views

### Accessibility Metrics

#### Accessibility Features Usage

**Target**: 5%+ users enable accessibility features

**Measurement**:
```javascript
analytics.track('accessibility_feature_enabled', {
  userId: user.id,
  feature: 'high_contrast', // or 'reduced_motion', 'screen_reader'
});

analytics.track('keyboard_navigation_used', {
  userId: user.id,
  page: currentPage,
  duration: sessionDuration,
});
```

**Metrics to Track**:
- % users with accessibility features enabled
- Feature usage by type
- Keyboard-only navigation sessions
- Screen reader usage

## Business Metrics

### User Retention

#### Retention Rates

**Target**: 10% improvement in 30-day retention

**Measurement**:
```javascript
// Cohort analysis
const cohortRetention = {
  day1: 85%,  // Users returning day 1
  day7: 60%,  // Users returning day 7
  day30: 40%, // Users returning day 30
  day90: 25%, // Users returning day 90
};
```

**Metrics to Track**:
- Daily Active Users (DAU)
- Weekly Active Users (WAU)
- Monthly Active Users (MAU)
- DAU/MAU ratio (stickiness)
- Cohort retention curves

### User Engagement

#### Engagement Score

**Target**: 20% increase in engagement

**Calculation**:
```javascript
const engagementScore = (
  searchesPerWeek * 2 +
  projectsCreated * 3 +
  progressTracked * 2 +
  shareLinksCreated * 1 +
  helpArticlesViewed * 0.5
) / 5;
```

**Metrics to Track**:
- Average session duration
- Sessions per user per week
- Features used per session
- Time to value (first search)

### Conversion Metrics

#### Free to Pro Conversion

**Target**: 5% improvement in conversion rate

**Measurement**:
```javascript
analytics.track('upgrade_prompt_shown', {
  userId: user.id,
  context: 'search_limit_reached',
  currentPlan: 'free',
});

analytics.track('upgrade_clicked', {
  userId: user.id,
  source: 'tier_indicator',
});

analytics.track('upgrade_completed', {
  userId: user.id,
  plan: 'pro',
  billingCycle: 'monthly',
});
```

**Funnel Analysis**:
```
Prompt Shown → Clicked → Checkout → Completed
    100%          30%        80%        90%
```

**Metrics to Track**:
- Conversion rate by trigger
- Time to conversion
- Abandoned checkouts
- Upgrade reasons

### User Satisfaction

#### Net Promoter Score (NPS)

**Target**: NPS >40

**Measurement**:
```javascript
// Survey after 30 days of usage
analytics.track('nps_survey_shown', {
  userId: user.id,
  daysActive: 30,
});

analytics.track('nps_survey_completed', {
  userId: user.id,
  score: npsScore, // 0-10
  feedback: userFeedback,
});
```

**Calculation**:
```
NPS = % Promoters (9-10) - % Detractors (0-6)
```

**Metrics to Track**:
- Overall NPS
- NPS by user segment
- NPS trend over time
- Feedback themes

#### Feature Satisfaction

**Target**: >4.0/5.0 average rating

**Measurement**:
```javascript
analytics.track('feature_rated', {
  userId: user.id,
  feature: 'progress_tracking',
  rating: 5, // 1-5 stars
  feedback: userFeedback,
});
```

**Metrics to Track**:
- Rating by feature
- Rating distribution
- Feedback sentiment
- Improvement suggestions

### Support Metrics

#### Support Ticket Volume

**Target**: 15% reduction in support tickets

**Measurement**:
```javascript
// Track support tickets by category
const ticketCategories = {
  'how-to': 45%,        // How to use features
  'bug-report': 25%,    // Bug reports
  'feature-request': 15%, // Feature requests
  'account': 10%,       // Account issues
  'other': 5%,          // Other
};
```

**Metrics to Track**:
- Total ticket volume
- Tickets by category
- Resolution time
- Self-service rate (help system usage)

## Dashboards

### Operations Dashboard

**Purpose**: Monitor system health and performance

**Widgets**:
1. System Status (healthy/degraded/down)
2. Error Rate (last 24h)
3. Response Times (p50, p95, p99)
4. Active Users (current)
5. Database Performance
6. Recent Errors (last 10)

**Refresh**: Every 30 seconds

### Product Dashboard

**Purpose**: Track feature adoption and engagement

**Widgets**:
1. Onboarding Completion Rate
2. Feature Adoption Rates
3. User Engagement Score
4. Active Projects
5. Progress Tracking Usage
6. Share Links Created
7. Help System Usage

**Refresh**: Every 5 minutes

### Business Dashboard

**Purpose**: Monitor business impact

**Widgets**:
1. User Growth (DAU, WAU, MAU)
2. Retention Curves
3. Conversion Funnel
4. NPS Score
5. Revenue Impact
6. Support Ticket Volume

**Refresh**: Daily

## Alerts

### Critical Alerts (Immediate Response)

**Conditions**:
- Application down (>2 minutes)
- Error rate >5%
- Database connection failed
- Response time >2s (p95)
- Security breach detected

**Notification**:
- PagerDuty alert
- SMS to on-call engineer
- Slack #incidents channel
- Email to engineering@unbuilt.one

### Warning Alerts (Response within 1 hour)

**Conditions**:
- Error rate >1%
- Response time >1s (p95)
- High memory usage (>80%)
- High CPU usage (>80%)
- Slow queries detected (>100ms)

**Notification**:
- Slack #engineering channel
- Email to team lead

### Info Alerts (Response within 24 hours)

**Conditions**:
- Feature adoption below target
- User feedback negative
- Performance degradation (>20%)
- Unusual usage patterns

**Notification**:
- Slack #product channel
- Email to product manager

## Reporting

### Daily Report

**Recipients**: Engineering team

**Contents**:
- System health summary
- Error summary
- Performance metrics
- Deployment status

**Delivery**: 9 AM daily via email

### Weekly Report

**Recipients**: Product and engineering teams

**Contents**:
- Feature adoption metrics
- User engagement trends
- Top issues and resolutions
- Performance trends
- User feedback summary

**Delivery**: Monday 9 AM via email

### Monthly Report

**Recipients**: Leadership team

**Contents**:
- Business metrics summary
- User growth and retention
- Feature success metrics
- ROI analysis
- Strategic recommendations

**Delivery**: First Monday of month via email

## Tools

### Monitoring Tools

- **Application Monitoring**: New Relic / Datadog
- **Error Tracking**: Sentry
- **Analytics**: Google Analytics / Mixpanel
- **Uptime Monitoring**: Pingdom / UptimeRobot
- **Log Management**: Loggly / Papertrail
- **Database Monitoring**: pganalyze

### Visualization Tools

- **Dashboards**: Grafana / Datadog
- **Business Intelligence**: Metabase / Looker
- **User Analytics**: Amplitude / Heap

### Alert Tools

- **Incident Management**: PagerDuty
- **Communication**: Slack
- **Status Page**: Statuspage.io

## Review Schedule

### Daily
- Review critical metrics
- Check for anomalies
- Address urgent issues

### Weekly
- Review feature adoption
- Analyze user feedback
- Plan improvements

### Monthly
- Comprehensive metrics review
- ROI analysis
- Strategic planning

### Quarterly
- Deep dive analysis
- Trend identification
- Goal setting

---

**Last Updated**: January 27, 2025  
**Next Review**: February 27, 2025
