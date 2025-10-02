# Rate Limiting and Abuse Prevention

This document describes the comprehensive rate limiting and abuse prevention system implemented to protect the application from brute force attacks, API abuse, and other malicious activities.

## Overview

The rate limiting system provides:

- **IP-based rate limiting** to prevent brute force attacks
- **Progressive delays** for repeated violations
- **CAPTCHA integration** for suspicious activity patterns
- **Comprehensive security logging** for monitoring and analysis
- **Flexible configuration** for different endpoint types
- **Suspicious activity detection** and automatic flagging

## Architecture

### Core Components

1. **Rate Limiting Middleware** (`server/middleware/rateLimiting.ts`)
   - Main rate limiting logic
   - IP detection and tracking
   - Progressive delay implementation
   - CAPTCHA requirement triggering

2. **CAPTCHA Service** (`server/services/captchaService.ts`)
   - Mathematical and word-based challenges
   - Challenge generation and verification
   - Automatic cleanup of expired challenges

3. **CAPTCHA Routes** (`server/routes/captcha.ts`)
   - REST API for CAPTCHA operations
   - Challenge creation and verification endpoints
   - Administrative statistics

## Rate Limiting Features

### 1. Basic Rate Limiting

```typescript
import { createRateLimit } from './middleware/rateLimiting';

const rateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 100,          // 100 requests per window
  keyGenerator: (req) => req.ip // Custom key generation
});

app.use('/api', rateLimit);
```

### 2. Progressive Delays

When enabled, the system applies increasing delays for repeated violations:

- **1-3 failures**: No delay
- **4-5 failures**: 1 second delay
- **6-10 failures**: 5 seconds delay
- **11-15 failures**: 15 seconds delay
- **16-20 failures**: 1 minute delay
- **20+ failures**: 5 minutes delay

```typescript
const progressiveRateLimit = createRateLimit({
  windowMs: 60000,
  maxAttempts: 5,
  progressiveDelay: true
});
```

### 3. CAPTCHA Integration

CAPTCHA challenges are automatically triggered after a configurable number of violations:

```typescript
const captchaRateLimit = createRateLimit({
  windowMs: 60000,
  maxAttempts: 5,
  captchaThreshold: 3 // Require CAPTCHA after 3 violations
});
```

### 4. Suspicious Activity Detection

The system automatically flags IPs as suspicious based on:

- More than 50 requests in 1 hour
- More than 10 consecutive failures
- More than 20 requests in 5 minutes (rapid-fire)

## Predefined Rate Limiters

### Authentication Endpoints

```typescript
import { authRateLimit, loginRateLimit, registerRateLimit } from './middleware/rateLimiting';

// General auth endpoints: 5 requests per 15 minutes
app.use('/auth', authRateLimit);

// Login endpoint: 5 attempts per 15 minutes with email tracking
app.post('/auth/login', loginRateLimit, ...);

// Registration: 3 attempts per hour
app.post('/auth/register', registerRateLimit, ...);
```

### API Endpoints

```typescript
import { apiRateLimit, searchRateLimit, aiRateLimit } from './middleware/rateLimiting';

// General API: 100 requests per 15 minutes
app.use('/api', apiRateLimit);

// Search endpoints: 20 requests per minute
app.use('/api/search', searchRateLimit);

// AI endpoints: 10 requests per minute
app.use('/api/ai', aiRateLimit);
```

## CAPTCHA System

### Challenge Types

1. **Mathematical Challenges**
   - Addition: "What is 15 + 23?"
   - Subtraction: "What is 45 - 12?"
   - Multiplication: "What is 7 × 9?"

2. **Word-based Challenges**
   - Letter counting: "How many letters are in 'SECURITY'?"
   - Vowel counting: "How many vowels are in 'AUTHENTICATION'?"
   - Alphabet position: "What position is 'P' in the alphabet?"

### API Endpoints

#### Create Challenge
```http
POST /api/captcha/challenge
```

Response:
```json
{
  "success": true,
  "data": {
    "challengeId": "uuid",
    "question": "What is 15 + 23?",
    "expiresIn": 300
  }
}
```

#### Verify Response
```http
POST /api/captcha/verify
Content-Type: application/json

{
  "challengeId": "uuid",
  "answer": 38
}
```

Response:
```json
{
  "success": true,
  "data": {
    "isValid": true
  }
}
```

#### Get Challenge Info
```http
GET /api/captcha/challenge/:challengeId
```

#### Get Statistics (Admin Only)
```http
GET /api/captcha/stats
```

## IP Detection

The system supports multiple IP detection methods:

1. **X-Forwarded-For** header (proxy/load balancer)
2. **X-Real-IP** header (nginx)
3. **CF-Connecting-IP** header (Cloudflare)
4. **req.ip** (Express default)

```typescript
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  const cfConnectingIP = req.headers['cf-connecting-ip'];
  
  // Returns the first available IP
}
```

## Security Logging

All rate limiting events are logged for security monitoring:

### Event Types

- `RATE_LIMIT_EXCEEDED`: Basic rate limit violation
- `RATE_LIMIT_PROGRESSIVE_DELAY`: Progressive delay applied
- `RATE_LIMIT_CAPTCHA_TRIGGERED`: CAPTCHA requirement activated
- `RATE_LIMIT_CAPTCHA_REQUIRED`: CAPTCHA verification required
- `RATE_LIMIT_BLOCKED_ACCESS`: IP temporarily blocked
- `SUSPICIOUS_ACTIVITY_DETECTED`: IP flagged as suspicious
- `LOGIN_BRUTE_FORCE_DETECTED`: Brute force attack on login

### Log Format

```json
{
  "userId": null,
  "eventType": "RATE_LIMIT_EXCEEDED",
  "resource": "/auth/login",
  "success": false,
  "metadata": {
    "ip": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "attempts": 6,
    "maxAttempts": 5,
    "timeWindow": "15 minutes"
  },
  "severity": "warning",
  "timestamp": "2025-01-21T17:30:00.000Z"
}
```

## Configuration

### Environment Variables

```bash
# Rate limiting configuration
RATE_LIMIT_WINDOW_MS=900000          # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100          # Max requests per window
RATE_LIMIT_PROGRESSIVE_DELAY=true    # Enable progressive delays
RATE_LIMIT_CAPTCHA_THRESHOLD=3       # CAPTCHA after N violations

# CAPTCHA configuration
CAPTCHA_EXPIRATION_TIME=300000       # 5 minutes
CAPTCHA_MAX_ATTEMPTS=3               # Max verification attempts
```

### Custom Configuration

```typescript
const customRateLimit = createRateLimit({
  windowMs: 60000,                    // Time window
  maxAttempts: 10,                    // Max requests
  progressiveDelay: true,             // Enable progressive delays
  captchaThreshold: 5,                // CAPTCHA threshold
  skipSuccessfulRequests: false,      // Count successful requests
  skipFailedRequests: false,          // Count failed requests
  keyGenerator: (req) => {            // Custom key generation
    return `${req.ip}:${req.user?.id || 'anonymous'}`;
  },
  onLimitReached: (req, info) => {    // Custom callback
    console.log(`Rate limit exceeded for ${req.ip}`);
  }
});
```

## Response Headers

The system sets standard rate limiting headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 847
X-RateLimit-Window: 900
```

## Error Responses

### Rate Limit Exceeded

```json
{
  "success": false,
  "message": "Rate limit exceeded. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "data": {
    "retryAfter": 847,
    "captchaRequired": false,
    "progressiveDelay": true
  }
}
```

### CAPTCHA Required

```json
{
  "success": false,
  "message": "CAPTCHA verification required",
  "code": "CAPTCHA_REQUIRED",
  "data": {
    "captchaRequired": true
  }
}
```

### IP Blocked

```json
{
  "success": false,
  "message": "IP temporarily blocked. Try again in 60 seconds.",
  "code": "RATE_LIMIT_IP_BLOCKED",
  "data": {
    "retryAfter": 60
  }
}
```

## Management Functions

### Utility Functions

```typescript
import {
  clearRateLimit,
  getRateLimitStatus,
  clearAllRateLimits,
  getSuspiciousIPs,
  clearSuspiciousIP,
  cleanupExpiredRecords
} from './middleware/rateLimiting';

// Clear specific rate limit
clearRateLimit('rate_limit:192.168.1.100');

// Get rate limit status
const status = getRateLimitStatus('rate_limit:192.168.1.100');

// Clear all rate limits (testing)
clearAllRateLimits();

// Get suspicious IPs
const suspiciousIPs = getSuspiciousIPs();

// Clear suspicious IP flag
clearSuspiciousIP('192.168.1.100');

// Manual cleanup
const cleaned = cleanupExpiredRecords();
```

## Testing

### Unit Tests

```bash
npm test -- server/middleware/__tests__/rateLimiting.test.ts
npm test -- server/services/__tests__/captchaService.test.ts
```

### Integration Tests

```bash
npm test -- server/middleware/__tests__/rateLimiting.integration.test.ts
npm test -- server/routes/__tests__/captcha.integration.test.ts
```

### Test Coverage

- Rate limiting middleware functionality
- Progressive delay implementation
- CAPTCHA challenge generation and verification
- IP detection and tracking
- Security event logging
- Error handling and edge cases

## Production Considerations

### Redis Integration

For production deployments, replace the in-memory store with Redis:

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Store rate limit data in Redis
const rateLimitStore = {
  async get(key: string) {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },
  
  async set(key: string, value: any, ttl: number) {
    await redis.setex(key, Math.ceil(ttl / 1000), JSON.stringify(value));
  }
};
```

### Load Balancer Configuration

When using load balancers, ensure proper IP forwarding:

```nginx
# Nginx configuration
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

### Monitoring and Alerting

Set up monitoring for:

- Rate limit violation rates
- Suspicious IP activity
- CAPTCHA challenge success rates
- Progressive delay triggers
- System performance impact

## Security Best Practices

1. **Regular Review**: Monitor rate limiting logs regularly
2. **Threshold Tuning**: Adjust limits based on legitimate usage patterns
3. **IP Whitelisting**: Consider whitelisting trusted IPs
4. **Geographic Blocking**: Block requests from high-risk countries
5. **User Agent Analysis**: Monitor for suspicious user agents
6. **Correlation Analysis**: Correlate rate limiting with other security events

## Troubleshooting

### Common Issues

1. **False Positives**: Legitimate users being rate limited
   - Solution: Adjust thresholds or implement user-based rate limiting

2. **Performance Impact**: Rate limiting causing latency
   - Solution: Optimize key generation and use Redis for storage

3. **CAPTCHA Bypass**: Automated systems solving CAPTCHAs
   - Solution: Implement more complex challenges or use external services

4. **IP Spoofing**: Attackers rotating IP addresses
   - Solution: Implement additional fingerprinting techniques

### Debug Mode

Enable debug logging:

```typescript
const debugRateLimit = createRateLimit({
  windowMs: 60000,
  maxAttempts: 10,
  onLimitReached: (req, info) => {
    console.log('Rate limit debug:', {
      ip: req.ip,
      key: req.route?.path,
      attempts: info.totalHits,
      remaining: info.remainingPoints
    });
  }
});
```

This comprehensive rate limiting system provides robust protection against abuse while maintaining a good user experience for legitimate users.