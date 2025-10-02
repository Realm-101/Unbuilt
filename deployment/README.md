# Production Deployment Guide

This guide covers the secure deployment of the application to production environments.

## 🔒 Security-First Deployment

This deployment configuration implements comprehensive security measures including:

- **HTTPS enforcement** with HSTS headers
- **Security headers** (CSP, X-Frame-Options, etc.)
- **Rate limiting** and DDoS protection
- **Secure cookie configuration**
- **Input validation** and sanitization
- **JWT-based authentication** with token rotation
- **Database security** with parameterized queries
- **Comprehensive logging** and monitoring

## 📋 Pre-Deployment Checklist

Before deploying to production, run the automated security checklist:

```bash
npm run security:checklist
```

This will validate:
- Environment configuration
- Security settings
- Authentication setup
- Database security
- Input validation
- Error handling
- Logging and monitoring

## 🚀 Deployment Validation

Run the deployment validation script to ensure readiness:

```bash
npm run deployment:validate
```

This comprehensive check validates:
- All security requirements
- Environment variables
- Database readiness
- Service dependencies
- Build artifacts
- Configuration security

## 🌍 Environment Configuration

### 1. Copy Environment Template

```bash
cp deployment/production.env.example .env
```

### 2. Configure Required Variables

**Critical Security Variables:**
```bash
# Generate secure secrets (minimum 32 characters each)
JWT_ACCESS_SECRET=your_secure_jwt_access_secret_here
JWT_REFRESH_SECRET=your_different_jwt_refresh_secret_here
COOKIE_SECRET=your_secure_cookie_secret_here

# Database
DATABASE_URL=postgresql://username:password@host:port/database

# CORS (set to your frontend domain)
CORS_ORIGIN=https://your-frontend-domain.com
```

**Generate Secure Secrets:**
```bash
# Generate 64-character random strings
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Optional Service Configuration

Configure optional services as needed:
```bash
GEMINI_API_KEY=your_gemini_api_key
SENDGRID_API_KEY=your_sendgrid_api_key
STRIPE_SECRET_KEY=sk_live_your_stripe_key
```

## 🐳 Docker Deployment

### 1. Build and Deploy with Docker Compose

```bash
# Copy environment file
cp deployment/production.env.example .env
# Edit .env with your actual values

# Deploy with Docker Compose
docker-compose -f deployment/docker-compose.production.yml up -d
```

### 2. SSL Certificate Setup

Place your SSL certificates in the `deployment/ssl/` directory:
```
deployment/ssl/
├── cert.pem
└── key.pem
```

Or use Let's Encrypt with Certbot:
```bash
# Install Certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem deployment/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem deployment/ssl/key.pem
```

## 🗄️ Database Setup

### 1. Run Security Migrations

```bash
npm run migrate:security
```

### 2. Validate Database Schema

```bash
npm run validate:security
```

## 🔧 Manual Deployment

### 1. Build Application

```bash
npm run deployment:build
```

### 2. Start Production Server

```bash
npm run deployment:production
```

## 📊 Health Monitoring

### Health Check Endpoint

The application provides a health check endpoint:
```
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Security Monitoring

Access the security dashboard (requires admin authentication):
```
GET /api/security/dashboard
```

## 🔍 Post-Deployment Verification

### 1. Verify HTTPS and Security Headers

```bash
curl -I https://your-domain.com
```

Expected headers:
- `Strict-Transport-Security`
- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`

### 2. Test Authentication

```bash
# Test login endpoint
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword"}'
```

### 3. Verify Rate Limiting

```bash
# Test rate limiting (should return 429 after limits)
for i in {1..20}; do
  curl -s -o /dev/null -w "%{http_code}\n" https://your-domain.com/api/auth/login
done
```

## 🚨 Security Incident Response

### 1. Monitor Security Logs

```bash
# View security events
docker-compose -f deployment/docker-compose.production.yml logs app | grep "SECURITY_EVENT"
```

### 2. Emergency Procedures

**Suspected Breach:**
1. Immediately rotate all JWT secrets
2. Invalidate all active sessions
3. Review security logs
4. Update environment variables
5. Restart application

**Rotate Secrets:**
```bash
# Generate new secrets
NEW_JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
NEW_COOKIE_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Update environment and restart
```

## 📈 Performance Optimization

### 1. Database Connection Pooling

Configure database connections:
```bash
DB_MAX_CONNECTIONS=20
```

### 2. Rate Limiting Configuration

Adjust rate limits based on traffic:
```bash
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=100        # requests per window
```

### 3. Request Size Limits

Configure request size limits:
```bash
MAX_REQUEST_SIZE=10mb
REQUEST_TIMEOUT=30000
```

## 🔄 Updates and Maintenance

### 1. Security Updates

Run regular security maintenance:
```bash
npm run security:maintenance
```

### 2. Dependency Updates

```bash
# Check for security vulnerabilities
npm audit

# Update dependencies
npm update

# Re-run security checklist
npm run security:checklist
```

### 3. Log Rotation

Configure log rotation to prevent disk space issues:
```bash
# Add to crontab
0 0 * * * docker-compose -f /path/to/docker-compose.production.yml exec app npm run logs:rotate
```

## 🆘 Troubleshooting

### Common Issues

**1. HTTPS Redirect Loop**
- Check `TRUST_PROXY=true` in environment
- Verify reverse proxy configuration

**2. CORS Errors**
- Ensure `CORS_ORIGIN` matches your frontend domain exactly
- Check for trailing slashes

**3. JWT Token Issues**
- Verify JWT secrets are set and at least 32 characters
- Check token expiration settings

**4. Database Connection Errors**
- Validate `DATABASE_URL` format
- Ensure database is accessible from application container

### Debug Mode

Enable debug logging temporarily:
```bash
LOG_LEVEL=debug
```

**⚠️ Remember to disable debug logging in production after troubleshooting**

## 📞 Support

For security-related issues:
- Email: security@your-domain.com
- Create an issue in the repository
- Check the security monitoring dashboard

## 📚 Additional Resources

- [Security Best Practices](../docs/SECURITY.md)
- [Environment Configuration](../docs/ENVIRONMENT_VALIDATION.md)
- [Rate Limiting Guide](../docs/RATE_LIMITING.md)
- [Session Management](../docs/SESSION_MANAGEMENT.md)