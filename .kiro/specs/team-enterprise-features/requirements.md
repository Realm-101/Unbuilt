# Requirements Document - Team & Enterprise Features

## Introduction

This feature expands Unbuilt's monetization and value proposition by introducing team collaboration and enterprise-grade capabilities. While Unbuilt currently serves individual users with a freemium model, many innovation activities happen in team contexts—incubators, corporate innovation labs, consulting firms, and startup teams. By adding team collaboration features and enterprise-grade options, Unbuilt can capture higher-value customers, increase revenue per account, and provide more value through shared workflows and organizational features .


## Glossary

- **Team_Account**: A multi-user Unbuilt subscription that allows collaboration among team members
- **Workspace**: A shared environment where team members can access and collaborate on gap analyses
- **Team_Member**: A user who has been invited to and accepted membership in a Team_Account
- **Role**: A set of permissions defining what actions a Team_Member can perform (Owner, Admin, Member, Viewer)
- **Shared_Analysis**: A gap analysis that multiple Team_Members can view, comment on, and collaborate around
- **Enterprise_Plan**: A high-tier subscription with advanced features, dedicated support, and custom pricing
- **Self_Hosted_Instance**: An on-premise or VPC-hosted deployment of Unbuilt for organizations requiring data sovereignty
- **Organization_Settings**: Configuration options available to Team_Account administrators
- **Collaboration_Activity**: Actions taken by Team_Members on Shared_Analyses (comments, edits, exports)
- **Usage_Analytics**: Metrics and reports showing team activity, search volume, and feature adoption

## Requirements

### Requirement 1: Team Account Creation

**User Story:** As an organization leader, I want to create a team account, so that my team can collaborate on innovation opportunities.

#### Acceptance Criteria

1. WHEN a user upgrades to a team plan, THE Team_Account SHALL be created with the user as the Owner
2. WHEN a Team_Account is created, THE Team_Account SHALL include a Workspace with a unique name
3. WHEN setting up the team, THE Team_Account SHALL allow the Owner to configure Organization_Settings including team name, logo, and default permissions
4. WHEN a Team_Account is active, THE Team_Account SHALL display team branding on all shared analyses
5. WHEN viewing billing, THE Team_Account SHALL show seat-based pricing with the current number of Team_Members
6. WHEN the team grows, THE Team_Account SHALL allow adding seats with prorated billing
7. WHEN a Team_Account is created, THE Team_Account SHALL provide onboarding guidance for inviting team members

### Requirement 2: Team Member Management

**User Story:** As a team owner, I want to invite and manage team members, so that I can control who has access to our workspace.

#### Acceptance Criteria

1. WHEN inviting team members, THE Team_Account SHALL allow the Owner to send email invitations with a custom message
2. WHEN an invitation is sent, THE Team_Account SHALL generate a secure invitation link valid for 7 days
3. WHEN a user accepts an invitation, THE Team_Account SHALL add them as a Team_Member with the assigned Role
4. WHEN managing members, THE Team_Account SHALL display a list of all Team_Members with their roles and last activity
5. WHEN removing a member, THE Team_Account SHALL revoke their access immediately and notify them via email
6. WHEN a member leaves, THE Team_Account SHALL transfer ownership of their analyses to the team Owner
7. WHEN viewing team members, THE Team_Account SHALL show pending invitations with the ability to resend or cancel

### Requirement 3: Role-Based Access Control

**User Story:** As a team administrator, I want to assign different permission levels, so that team members have appropriate access to features.

#### Acceptance Criteria

1. WHEN assigning roles, THE Team_Account SHALL support Owner, Admin, Member, and Viewer roles
2. WHEN a user has the Owner role, THE Team_Account SHALL grant full access including billing, member management, and all analyses
3. WHEN a user has the Admin role, THE Team_Account SHALL grant member management and analysis management but not billing access
4. WHEN a user has the Member role, THE Team_Account SHALL grant ability to create analyses, comment, and export
5. WHEN a user has the Viewer role, THE Team_Account SHALL grant read-only access to Shared_Analyses
6. WHEN a Team_Member attempts an unauthorized action, THE Team_Account SHALL deny access and display an appropriate message
7. WHEN roles are changed, THE Team_Account SHALL apply new permissions immediately and log the change

### Requirement 4: Shared Analyses and Collaboration

**User Story:** As a team member, I want to share my gap analyses with teammates, so that we can discuss and refine opportunities together.

#### Acceptance Criteria

1. WHEN creating an analysis, THE Team_Account SHALL allow the creator to mark it as shared with the team
2. WHEN an analysis is shared, THE Team_Account SHALL make it visible to all Team_Members in the Workspace
3. WHEN viewing a Shared_Analysis, THE Team_Account SHALL display who created it and when
4. WHEN Team_Members view a Shared_Analysis, THE Team_Account SHALL allow them to add comments and reactions
5. WHEN a comment is added, THE Team_Account SHALL notify relevant Team_Members (creator and previous commenters)
6. WHEN multiple members edit simultaneously, THE Team_Account SHALL handle concurrent access gracefully
7. WHEN an analysis is unshared, THE Team_Account SHALL make it private to the creator only

### Requirement 5: Team Dashboard and Analytics

**User Story:** As a team leader, I want to see team activity and usage metrics, so that I can understand how the team is using Unbuilt.

#### Acceptance Criteria

1. WHEN accessing the team dashboard, THE Team_Account SHALL display Usage_Analytics including total searches, active members, and shared analyses
2. WHEN viewing analytics, THE Team_Account SHALL show trends over time (weekly/monthly search volume, member activity)
3. WHEN analyzing collaboration, THE Team_Account SHALL display most active members and most discussed analyses
4. WHEN reviewing content, THE Team_Account SHALL show top industries or topics being researched
5. WHEN exporting analytics, THE Team_Account SHALL allow downloading reports as CSV or PDF
6. WHEN viewing individual member activity, THE Team_Account SHALL respect privacy by showing aggregate data only (unless admin)
7. WHEN the dashboard loads, THE Team_Account SHALL display key metrics within 2 seconds

### Requirement 6: Enterprise Plan Features

**User Story:** As an enterprise customer, I want advanced features and support, so that Unbuilt meets our organization's requirements.

#### Acceptance Criteria

1. WHEN subscribing to an Enterprise_Plan, THE Team_Account SHALL include unlimited searches and team members
2. WHEN using enterprise features, THE Team_Account SHALL provide dedicated customer success manager contact
3. WHEN enterprise support is needed, THE Team_Account SHALL offer priority support with <4 hour response time
4. WHEN configuring enterprise settings, THE Team_Account SHALL allow custom branding (logo, colors, domain)
5. WHEN enterprise security is required, THE Team_Account SHALL support SSO (Single Sign-On) via SAML or OAuth
6. WHEN compliance is needed, THE Team_Account SHALL provide SOC 2 compliance documentation and audit logs
7. WHEN requesting features, THE Team_Account SHALL include quarterly business reviews and roadmap input

### Requirement 7: Self-Hosted Deployment Option

**User Story:** As an enterprise with strict data sovereignty requirements, I want to deploy Unbuilt on our infrastructure, so that sensitive idea data never leaves our control.

#### Acceptance Criteria

1. WHEN purchasing a Self_Hosted_Instance, THE Team_Account SHALL provide Docker containers and deployment documentation
2. WHEN deploying on-premise, THE Self_Hosted_Instance SHALL support deployment on AWS, Azure, GCP, or private data centers
3. WHEN configuring the instance, THE Self_Hosted_Instance SHALL allow connecting to the organization's existing PostgreSQL database
4. WHEN using self-hosted, THE Self_Hosted_Instance SHALL include all features available in the cloud version
5. WHEN updates are released, THE Self_Hosted_Instance SHALL provide migration scripts and upgrade documentation
6. WHEN support is needed, THE Self_Hosted_Instance SHALL include dedicated technical support for deployment and maintenance
7. WHEN monitoring the instance, THE Self_Hosted_Instance SHALL provide health check endpoints and logging integration

### Requirement 8: Advanced Collaboration Features

**User Story:** As a team working on complex innovation projects, I want advanced collaboration tools, so that we can work more effectively together.

#### Acceptance Criteria

1. WHEN discussing analyses, THE Team_Account SHALL support threaded comments for organized conversations
2. WHEN mentioning teammates, THE Team_Account SHALL support @mentions that trigger notifications
3. WHEN tracking decisions, THE Team_Account SHALL allow marking comments as "Decision" or "Action Item"
4. WHEN organizing work, THE Team_Account SHALL allow creating collections or folders for grouping related analyses
5. WHEN following analyses, THE Team_Account SHALL allow members to subscribe to updates on specific analyses
6. WHEN reviewing history, THE Team_Account SHALL show a complete audit trail of who viewed, edited, or exported each analysis
7. WHEN collaborating in real-time, THE Team_Account SHALL show presence indicators (who's currently viewing)

### Requirement 9: Team Templates and Standards

**User Story:** As a team leader, I want to create standard templates and guidelines, so that our team follows consistent processes.

#### Acceptance Criteria

1. WHEN creating templates, THE Team_Account SHALL allow admins to define custom action plan templates for the team
2. WHEN a template is created, THE Team_Account SHALL make it available to all Team_Members when generating analyses
3. WHEN setting standards, THE Team_Account SHALL allow defining required fields or sections for shared analyses
4. WHEN a member creates an analysis, THE Team_Account SHALL suggest using team templates
5. WHEN reviewing analyses, THE Team_Account SHALL allow admins to mark analyses as "Team Approved" or "Needs Review"
6. WHEN exporting, THE Team_Account SHALL apply team branding and formatting standards automatically
7. WHEN templates are updated, THE Team_Account SHALL notify team members and offer to update existing analyses

### Requirement 10: Billing and Subscription Management

**User Story:** As a team owner, I want flexible billing options, so that I can manage costs as the team grows.

#### Acceptance Criteria

1. WHEN viewing billing, THE Team_Account SHALL display current plan, seat count, and monthly/annual cost
2. WHEN adding seats, THE Team_Account SHALL calculate prorated charges and update billing immediately
3. WHEN removing seats, THE Team_Account SHALL apply credits to the next billing cycle
4. WHEN choosing payment, THE Team_Account SHALL support credit card, ACH transfer, and invoice payment (Enterprise)
5. WHEN invoicing is needed, THE Team_Account SHALL generate monthly invoices with detailed usage breakdown
6. WHEN budgeting, THE Team_Account SHALL allow setting usage alerts (e.g., "Notify when >80% of search quota used")
7. WHEN downgrading, THE Team_Account SHALL preserve data but restrict access according to the new plan limits

## Non-Functional Requirements

### Performance
- Team dashboard loading: <2 seconds
- Member invitation: <5 seconds
- Real-time collaboration updates: <1 second latency
- Analytics report generation: <10 seconds

### Scalability
- Support teams of 5-500+ members
- Handle 100+ concurrent team members
- Store unlimited shared analyses per team
- Support 1,000+ enterprise customers

### Security
- Enforce role-based access control at API level
- Encrypt all team data at rest and in transit
- Audit log all team actions for compliance
- Support SSO with SAML 2.0 and OAuth 2.0
- Implement data isolation between teams

### Reliability
- 99.9% uptime SLA for Enterprise plans
- Automated backups every 6 hours
- Disaster recovery with <4 hour RTO
- Zero data loss guarantee

## Out of Scope

The following are explicitly NOT included in this feature:

- Video conferencing integration
- Built-in project management (beyond action plans)
- Time tracking or resource allocation
- Financial modeling or budget management
- Custom AI model training per team
- White-label reseller program (separate feature)
- Multi-workspace support per team (single workspace per team)

## Dependencies

### External Services
- Email service for invitations and notifications
- Payment processor supporting seat-based billing (Stripe)
- SSO providers (Okta, Azure AD, Google Workspace)
- Analytics service for usage tracking

### Internal Dependencies
- Existing user authentication system
- Gap analysis and action plan features
- Subscription and billing system
- Notification system
- Database with multi-tenancy support

### Technical Requirements
- Role-based access control middleware
- Team data isolation in database
- Real-time collaboration infrastructure (WebSockets)
- Audit logging system
- SSO integration library

## Success Metrics

### User Engagement
- Team plan adoption: >15% of Pro users upgrade to team plans
- Team size: Average 8 members per team
- Collaboration rate: >60% of team analyses have comments
- Shared analysis rate: >70% of team analyses are shared

### Quality
- Invitation acceptance rate: >80%
- Team member satisfaction: >4.5/5
- Collaboration feature usage: >50% of teams use comments weekly
- Enterprise customer retention: >95% annual retention

### Business
- Revenue per team account: 5x individual Pro subscription
- Enterprise deal size: Average $50k+ annual contract value
- Team plan MRR growth: 40% quarter-over-quarter
- Enterprise pipeline: 20+ qualified leads per quarter

## Timeline

**Estimated Duration:** 6-8 weeks

### Week 1-2: Core Team Infrastructure
- Team account data model
- Member invitation system
- Role-based access control
- Team dashboard UI

### Week 3-4: Collaboration Features
- Shared analyses
- Comments and mentions
- Activity feeds
- Real-time presence

### Week 5-6: Enterprise Features
- SSO integration
- Advanced analytics
- Custom branding
- Audit logging

### Week 7-8: Self-Hosted & Polish
- Self-hosted deployment package
- Enterprise onboarding flow
- Documentation and training materials
- Testing and deployment

---

**Document Version:** 1.0  
**Last Updated:** October 21, 2025  
**Status:** Ready for Review
