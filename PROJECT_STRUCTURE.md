# Project Structure

This document provides a comprehensive overview of the Unbuilt project structure, highlighting the security-hardened architecture and organization.

## 📁 Root Directory Structure

```
unbuilt/
├── 📁 client/                    # React frontend application
├── 📁 server/                    # Express.js backend with security middleware
├── 📁 shared/                    # Shared types and schemas
├── 📁 docs/                      # Comprehensive documentation
├── 📁 deployment/                # Production deployment configuration
├── 📁 .kiro/                     # Development specifications and tasks
├── 📄 README.md                  # Main project documentation
├── 📄 CHANGELOG.md               # Version history and security improvements
├── 📄 SECURITY_FIXES.md          # Security implementation summary
├── 📄 PERFORMANCE_OPTIMIZATIONS.md # Performance tuning guide
├── 📄 package.json               # Dependencies and scripts
└── 📄 .env.example               # Environment configuration template
```

## 🎨 Frontend Structure (`client/`)

```
client/
├── 📁 src/
│   ├── 📁 components/            # Reusable UI components
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── forms/                # Form components with validation
│   │   ├── layout/               # Layout and navigation components
│   │   └── security/             # Security-related UI components
│   ├── 📁 pages/                 # Route components and page layouts
│   │   ├── auth/                 # Authentication pages
│   │   ├── dashboard/            # User dashboard and analytics
│   │   ├── search/               # Gap analysis and search pages
│   │   └── admin/                # Admin panel and security monitoring
│   ├── 📁 hooks/                 # Custom React hooks
│   │   ├── useAuth.ts            # Authentication state management
│   │   ├── useSession.ts         # Session management
│   │   └── useSecurity.ts        # Security event handling
│   ├── 📁 lib/                   # Utilities and configurations
│   │   ├── api.ts                # API client with security headers
│   │   ├── auth.ts               # Authentication utilities
│   │   ├── validation.ts         # Client-side validation
│   │   └── utils.ts              # General utilities
│   ├── 📁 styles/                # CSS and styling
│   └── 📄 main.tsx               # Application entry point
├── 📄 index.html                 # HTML template with security meta tags
├── 📄 vite.config.ts             # Vite configuration
└── 📄 tailwind.config.js         # Tailwind CSS configuration
```

## 🔒 Backend Structure (`server/`)

```
server/
├── 📁 middleware/                # Security and application middleware
│   ├── 📄 authorization.ts       # Role-based access control
│   ├── 📄 errorHandler.ts        # Secure error handling
│   ├── 📄 httpsEnforcement.ts    # HTTPS enforcement and secure cookies
│   ├── 📄 inputValidation.ts     # Input validation and sanitization
│   ├── 📄 rateLimiting.ts        # Rate limiting and DDoS protection
│   ├── 📄 resourceOwnership.ts   # Resource ownership validation
│   ├── 📄 securityHeaders.ts     # Security headers and CSRF protection
│   ├── 📄 securityMonitoring.ts  # Real-time security monitoring
│   └── 📄 sessionManagement.ts   # Session security management
├── 📁 services/                  # Business logic and security services
│   ├── 📄 authorizationService.ts # Authorization and permission management
│   ├── 📄 accountLockout.ts      # Account lockout protection
│   ├── 📄 captchaService.ts      # CAPTCHA integration and verification
│   ├── 📄 jwt.ts                 # JWT token management with rotation
│   ├── 📄 passwordHistory.ts     # Password history tracking
│   ├── 📄 passwordSecurity.ts    # Password hashing and validation
│   ├── 📄 scheduledTasks.ts      # Background security maintenance
│   ├── 📄 securityEventHandler.ts # Security event processing
│   ├── 📄 securityLogger.ts      # Security event logging
│   ├── 📄 sessionManager.ts      # Session lifecycle management
│   └── 📄 tokenCleanup.ts        # JWT token cleanup service
├── 📁 routes/                    # API route handlers
│   ├── 📄 auth.ts                # Authentication endpoints
│   ├── 📄 admin.ts               # Admin-only endpoints
│   ├── 📄 captcha.ts             # CAPTCHA verification endpoints
│   ├── 📄 security.ts            # Security management endpoints
│   ├── 📄 securityDashboard.ts   # Security monitoring dashboard
│   ├── 📄 securityMonitoring.ts  # Security event endpoints
│   └── 📄 sessions.ts            # Session management endpoints
├── 📁 config/                    # Configuration and environment
│   ├── 📄 envValidator.ts        # Environment validation and security
│   └── 📄 securityConfig.ts      # Security configuration management
├── 📁 scripts/                   # Database migrations and security tools
│   ├── 📄 detectCredentials.ts   # Credential detection and scanning
│   ├── 📄 deploymentValidation.ts # Deployment readiness validation
│   ├── 📄 runSecurityMigration.ts # Security database migrations
│   ├── 📄 securityChecklist.ts   # Comprehensive security validation
│   ├── 📄 testMigrationSyntax.ts # Migration syntax validation
│   ├── 📄 validateSecuritySchema.ts # Database schema validation
│   ├── 📄 migrate-comprehensive-security.sql # Main security migration
│   ├── 📄 migrate-password-security.sql # Password security migration
│   ├── 📄 migrate-security-logging.sql # Security logging migration
│   ├── 📄 migrate-session-security.sql # Session security migration
│   ├── 📄 MIGRATION_SUMMARY.md   # Migration documentation
│   └── 📄 README.md              # Scripts documentation
├── 📁 utils/                     # Utility functions and helpers
│   └── 📄 credentialDetection.ts # Credential security validation
├── 📁 __tests__/                 # Comprehensive security testing
│   ├── 📄 auth.integration.test.ts # Authentication flow testing
│   ├── 📄 comprehensive-security.test.ts # Full security suite
│   ├── 📄 errorHandling.security.test.ts # Error handling security
│   ├── 📄 inputValidation.test.ts # Input validation testing
│   ├── 📄 jwt.test.ts            # JWT security testing
│   ├── 📄 passwordSecurity.integration.test.ts # Password security
│   ├── 📄 rateLimiting.test.ts   # Rate limiting testing
│   ├── 📄 securityMonitoring.integration.test.ts # Monitoring tests
│   ├── 📄 sessionSecurity.test.ts # Session security testing
│   └── 📄 sessionManager.test.ts # Session management testing
├── 📄 auth.ts                    # Authentication configuration
├── 📄 db.ts                      # Database connection and configuration
├── 📄 index.ts                   # Main server entry point with security
├── 📄 routes.ts                  # Route registration and middleware
├── 📄 storage.ts                 # Data storage and retrieval
├── 📄 vite.ts                    # Vite development server integration
└── 📄 websocket.ts               # WebSocket server for real-time features
```

## 🔗 Shared Resources (`shared/`)

```
shared/
├── 📄 auth-schema.ts             # Authentication and authorization schemas
└── 📄 schema.ts                  # Database schema definitions with security
```

## 📚 Documentation (`docs/`)

```
docs/
├── 📄 README.md                  # Documentation index and overview
├── 📄 API.md                     # Complete API reference with security
├── 📄 SECURITY.md                # Comprehensive security documentation
├── 📄 AUTHORIZATION.md           # Role-based access control guide
├── 📄 ENVIRONMENT_VALIDATION.md  # Environment configuration guide
├── 📄 PASSWORD_SECURITY.md       # Password policies and implementation
├── 📄 RATE_LIMITING.md           # Rate limiting and DDoS protection
├── 📄 SECURITY_MONITORING.md     # Real-time monitoring and alerting
├── 📄 SESSION_MANAGEMENT.md      # Session security and management
└── 📄 VALIDATION_MIDDLEWARE.md   # Input validation and sanitization
```

## 🚀 Deployment Configuration (`deployment/`)

```
deployment/
├── 📄 README.md                  # Comprehensive deployment guide
├── 📄 DEPLOYMENT_SUMMARY.md      # Security deployment implementation
├── 📄 production.env.example     # Production environment template
├── 📄 docker-compose.production.yml # Docker production configuration
├── 📄 Dockerfile.production      # Multi-stage production Docker build
├── 📄 nginx.conf                 # Nginx reverse proxy with security
├── 📄 deploy.js                  # Node.js deployment automation
├── 📄 deploy.bat                 # Windows deployment script
└── 📄 deploy                     # Unix/Linux deployment script
```

## 🔧 Development Configuration (`.kiro/`)

```
.kiro/
├── 📁 specs/                     # Feature specifications and tasks
│   └── 📁 security-hardening/    # Security implementation specification
│       ├── 📄 requirements.md    # Security requirements
│       ├── 📄 design.md          # Security architecture design
│       └── 📄 tasks.md           # Implementation tasks and progress
└── 📁 settings/                  # Development environment settings
```

## 🔒 Security Architecture Layers

### 1. Network Security Layer
- **HTTPS Enforcement** - Automatic redirects and HSTS headers
- **Reverse Proxy** - Nginx with SSL termination and security headers
- **Rate Limiting** - Network-level DDoS protection
- **SSL/TLS** - Modern cipher suites and certificate management

### 2. Application Security Layer
- **Authentication** - JWT with refresh token rotation
- **Authorization** - Role-based access control (RBAC)
- **Input Validation** - Comprehensive Zod schema validation
- **Session Management** - Secure session handling with hijacking detection

### 3. Data Security Layer
- **Database Security** - Parameterized queries and connection encryption
- **Password Security** - Bcrypt hashing with history tracking
- **Audit Logging** - Comprehensive security event logging
- **Data Encryption** - Sensitive data encryption at rest

### 4. Monitoring Security Layer
- **Real-time Monitoring** - Security event detection and alerting
- **Threat Detection** - Automated threat analysis and response
- **Compliance Monitoring** - Security standard compliance validation
- **Incident Response** - Automated and manual response procedures

## 📊 Database Schema Organization

### Core Application Tables
- `users` - User accounts with security metadata
- `searches` - Gap analysis searches with ownership validation
- `subscriptions` - User subscription and billing information

### Security Audit Tables
- `security_events` - Comprehensive security event logging
- `password_history` - Password change history tracking
- `session_security` - Session security metadata and monitoring
- `account_lockouts` - Account lockout tracking and management
- `rate_limit_violations` - Rate limiting violation logs

### System Tables
- `tokens` - JWT token management and blacklisting
- `captcha_challenges` - CAPTCHA verification tracking
- `security_settings` - System-wide security configuration

## 🛠️ Development Workflow

### Security-First Development
1. **Security Requirements** - Define security requirements for each feature
2. **Threat Modeling** - Identify potential security threats and mitigations
3. **Secure Implementation** - Implement features with security controls
4. **Security Testing** - Comprehensive security testing and validation
5. **Security Review** - Code review with security focus
6. **Deployment Validation** - Security checklist and deployment validation

### Testing Strategy
- **Unit Tests** - Individual component security testing
- **Integration Tests** - End-to-end security flow testing
- **Security Tests** - Dedicated security vulnerability testing
- **Performance Tests** - Security middleware performance validation
- **Compliance Tests** - Security standard compliance validation

## 📋 Security Compliance

### Standards Implemented
- **OWASP Top 10** - Protection against common web vulnerabilities
- **NIST Cybersecurity Framework** - Comprehensive security controls
- **ISO 27001** - Information security management standards
- **SOC 2 Type II** - Security and availability controls

### Privacy Compliance
- **GDPR** - European data protection regulation
- **CCPA** - California consumer privacy act
- **Data Minimization** - Collect only necessary data
- **Right to Deletion** - User data deletion capabilities

## 🔄 Continuous Security

### Automated Security Processes
- **Security Scanning** - Automated credential and vulnerability detection
- **Dependency Updates** - Regular security dependency updates
- **Security Testing** - Continuous security test execution
- **Compliance Monitoring** - Ongoing compliance validation

### Manual Security Processes
- **Security Reviews** - Regular code and architecture reviews
- **Penetration Testing** - Periodic security assessments
- **Incident Response** - Security incident handling procedures
- **Security Training** - Team security awareness and training

---

**Last Updated:** October 2024  
**Architecture Version:** 2.0  
**Security Level:** Enterprise-Grade