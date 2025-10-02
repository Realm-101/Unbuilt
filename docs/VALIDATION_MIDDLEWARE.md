# Comprehensive Input Validation Middleware

## Overview

The validation middleware provides comprehensive input validation, sanitization, and rate limiting for all API endpoints using Zod schemas and security best practices.

## Features

### 1. Input Validation
- **Zod Schema Validation**: Type-safe validation using Zod schemas
- **Endpoint-Specific Validation**: Custom validation for different API endpoints
- **Detailed Error Messages**: Clear validation error responses with field-level details

### 2. Input Sanitization
- **XSS Prevention**: Removes HTML/script tags using DOMPurify
- **Control Character Removal**: Strips null bytes and control characters
- **Whitespace Normalization**: Trims and normalizes whitespace
- **Recursive Sanitization**: Handles nested objects and arrays

### 3. Injection Attack Prevention
- **SQL Injection Detection**: Identifies common SQL injection patterns
- **NoSQL Injection Detection**: Detects MongoDB and other NoSQL injection attempts
- **Pattern Matching**: Uses regex patterns to identify malicious input
- **Logging**: Security events are logged for monitoring

### 4. Rate Limiting
- **Configurable Limits**: Different rate limits for different endpoint types
- **IP-Based Tracking**: Tracks requests per IP address
- **Sliding Window**: Time-based rate limiting with automatic reset
- **Graceful Degradation**: Returns 429 status with retry-after headers

## Usage

### Basic Setup

```typescript
import { 
  validateApiInput,
  generalRateLimit,
  authRateLimit,
  searchRateLimit 
} from './middleware/validation';

// Apply global validation to all API routes
app.use('/api', generalRateLimit, validateApiInput);

// Apply specific rate limits to auth routes
app.use('/api/auth', authRateLimit);

// Apply search-specific rate limits
app.use('/api/search', searchRateLimit);
```

### Endpoint-Specific Validation

```typescript
import { 
  validateLogin,
  validateSearch,
  validateIdea,
  validateIdParam 
} from './middleware/validation';

// Login endpoint with validation
app.post('/api/auth/login', validateLogin, (req, res) => {
  // req.body is now validated and sanitized
});

// Search endpoint with validation
app.post('/api/search', validateSearch, (req, res) => {
  // req.body contains validated search query and filters
});

// ID parameter validation
app.get('/api/ideas/:id', validateIdParam, (req, res) => {
  // req.params.id is validated as a positive integer
});
```

## Validation Schemas

### Authentication
- **Login**: Email and password validation
- **Register**: Email, password, confirm password, and name validation

### Search
- **Query**: 1-2000 character search query
- **Filters**: Optional filters with validation for categories, scores, sorting

### Ideas
- **Title**: 5-200 characters
- **Description**: 20-2000 characters
- **Category**: Enum validation for predefined categories
- **Financial Data**: Numeric validation for investment and revenue fields

### Common
- **ID Parameters**: Positive integer validation
- **Pagination**: Limit (1-100) and offset (≥0) validation

## Rate Limiting Configuration

### Default Limits
- **General API**: 100 requests per 15 minutes
- **Authentication**: 5 requests per 15 minutes
- **Search**: 20 requests per minute
- **AI Endpoints**: 10 requests per minute

### Custom Rate Limits

```typescript
import { createRateLimit } from './middleware/validation';

// Custom rate limit: 50 requests per 5 minutes
const customLimit = createRateLimit(50, 5 * 60 * 1000);
app.use('/api/custom', customLimit);
```

## Security Features

### Input Sanitization
- Removes HTML tags and scripts
- Strips control characters and null bytes
- Normalizes Unicode characters
- Handles nested objects and arrays

### Injection Prevention
- SQL injection pattern detection
- NoSQL injection pattern detection
- Command injection prevention
- Path traversal prevention

### Error Handling
- Detailed validation errors for development
- Generic error messages for production
- Security event logging
- Rate limit headers in responses

## Testing

### Unit Tests
```bash
npm test validation
```

### Integration Tests
```bash
npm test validation.integration
```

### Security Tests
- SQL injection attempts
- XSS payload testing
- Rate limit enforcement
- Input sanitization verification

## Configuration

### Environment Variables
```env
RATE_LIMIT_WINDOW=900000  # 15 minutes in milliseconds
RATE_LIMIT_MAX=100        # Maximum requests per window
```

### Middleware Options
```typescript
// Custom validation middleware
const customValidator = createValidator(customSchema, 'body');

// Custom rate limiter
const customRateLimit = createRateLimit(maxRequests, windowMs);
```

## Error Responses

### Validation Errors
```json
{
  "error": "Validation failed",
  "message": "Invalid input data",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "invalid_string"
    }
  ]
}
```

### Rate Limit Errors
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 300
}
```

### Security Errors
```json
{
  "error": "Invalid input detected",
  "message": "Request contains potentially malicious content",
  "code": "MALICIOUS_INPUT_DETECTED"
}
```

## Best Practices

1. **Always validate input**: Use appropriate schemas for all endpoints
2. **Apply rate limiting**: Protect against abuse and enumeration attacks
3. **Sanitize output**: Ensure data is safe before sending to clients
4. **Log security events**: Monitor for attack patterns
5. **Use HTTPS**: Encrypt data in transit
6. **Regular updates**: Keep validation patterns up to date

## Monitoring

### Security Events
- Failed validation attempts
- Rate limit violations
- Injection attack attempts
- Suspicious input patterns

### Metrics
- Request validation success/failure rates
- Rate limit hit rates
- Response times for validation
- Security event frequencies

## Troubleshooting

### Common Issues
1. **Validation too strict**: Adjust schema constraints
2. **Rate limits too low**: Increase limits for legitimate usage
3. **False positives**: Refine injection detection patterns
4. **Performance impact**: Optimize validation logic

### Debug Mode
```typescript
// Enable detailed logging
process.env.VALIDATION_DEBUG = 'true';
```

This middleware provides comprehensive protection against common web application vulnerabilities while maintaining good performance and user experience.