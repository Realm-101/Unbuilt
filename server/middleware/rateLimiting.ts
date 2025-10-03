import type { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { securityLogger } from '../services/securityLogger';

/**
 * Rate limiting and abuse prevention middleware
 * Implements IP-based rate limiting, progressive delays, and CAPTCHA integration
 */

interface RateLimitConfig {
  windowMs: number;
  maxAttempts: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request, rateLimitInfo: RateLimitInfo) => void;
  progressiveDelay?: boolean;
  captchaThreshold?: number;
}

interface RateLimitInfo {
  totalHits: number;
  totalHitsInWindow: number;
  remainingPoints: number;
  msBeforeNext: number;
  isFirstInWindow: boolean;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
  firstAttempt: number;
  consecutiveFailures: number;
  lastFailureTime: number;
  isBlocked: boolean;
  blockUntil?: number;
  captchaRequired?: boolean;
}

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, RateLimitRecord>();
const suspiciousIPs = new Set<string>();

/**
 * Get client IP address with proxy support
 * 
 * Extracts the real client IP address from various headers set by proxies and CDNs.
 * The order of precedence is important for security:
 * 
 * 1. X-Forwarded-For: Standard proxy header (take first IP in chain)
 * 2. X-Real-IP: Alternative proxy header (single IP)
 * 3. CF-Connecting-IP: Cloudflare-specific header (most trustworthy if using CF)
 * 4. Direct connection: Fall back to socket address
 * 
 * Note: In production, validate that proxy headers are only accepted from trusted sources
 * to prevent IP spoofing attacks.
 */
function getClientIP(req: Request): string {
  // X-Forwarded-For contains comma-separated list of IPs (client, proxy1, proxy2, ...)
  // We take the first IP which is the original client
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  
  // X-Real-IP is set by some proxies to indicate the original client IP
  const realIP = req.headers['x-real-ip'];
  if (typeof realIP === 'string') {
    return realIP;
  }
  
  // CF-Connecting-IP is set by Cloudflare and is highly reliable
  const cfConnectingIP = req.headers['cf-connecting-ip'];
  if (typeof cfConnectingIP === 'string') {
    return cfConnectingIP;
  }
  
  // Fall back to direct connection IP if no proxy headers present
  return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
}

/**
 * Generate rate limit key
 */
function generateKey(req: Request, prefix: string = 'rate_limit'): string {
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const endpoint = req.route?.path || req.path;
  
  // Create a more specific key for authentication endpoints
  if (prefix === 'auth') {
    return `${prefix}:${ip}:${endpoint}`;
  }
  
  return `${prefix}:${ip}`;
}

/**
 * Calculate progressive delay based on consecutive failures
 * 
 * Implements exponential backoff to slow down potential attackers while minimizing
 * impact on legitimate users who may have made a few mistakes.
 * 
 * The delay tiers are designed to:
 * - Allow 3 quick retries for typos (no delay)
 * - Add minimal delay for 4-5 failures (1s) 
 * - Escalate to moderate delays for 6-10 failures (5s)
 * - Apply significant delays for 11-15 failures (15s)
 * - Block for 1 minute at 16-20 failures
 * - Block for 5 minutes beyond 20 failures (likely automated attack)
 */
function calculateProgressiveDelay(consecutiveFailures: number): number {
  // First 3 failures: no delay (allow for typos)
  if (consecutiveFailures <= 3) return 0;
  
  // 4-5 failures: minimal delay to slow down but not frustrate users
  if (consecutiveFailures <= 5) return 1000; // 1 second
  
  // 6-10 failures: moderate delay, likely not a legitimate user
  if (consecutiveFailures <= 10) return 5000; // 5 seconds
  
  // 11-15 failures: significant delay, suspicious activity
  if (consecutiveFailures <= 15) return 15000; // 15 seconds
  
  // 16-20 failures: long delay, very likely an attack
  if (consecutiveFailures <= 20) return 60000; // 1 minute
  
  // 20+ failures: maximum delay for severe abuse/automated attacks
  return 300000; // 5 minutes
}

/**
 * Check if IP should be flagged as suspicious
 * 
 * Uses multiple heuristics to detect potential attacks or abuse:
 * 1. Volume-based detection: Too many requests in a time window
 * 2. Failure-based detection: Repeated authentication failures
 * 3. Velocity-based detection: Rapid-fire requests indicating automation
 * 
 * These thresholds are tuned to catch automated attacks while minimizing
 * false positives from legitimate high-volume users.
 */
function checkSuspiciousActivity(record: RateLimitRecord, ip: string): boolean {
  const now = Date.now();
  const timeWindow = 60 * 60 * 1000; // 1 hour
  
  // Heuristic 1: Volume-based detection
  // More than 50 requests in the last hour suggests automated behavior
  // Normal users rarely exceed 30-40 requests/hour even with active usage
  if (record.count > 50 && (now - record.firstAttempt) < timeWindow) {
    return true;
  }
  
  // Heuristic 2: Failure-based detection
  // More than 10 consecutive failures indicates brute force attempt
  // Legitimate users typically succeed within 3-5 attempts
  if (record.consecutiveFailures > 10) {
    return true;
  }
  
  // Heuristic 3: Velocity-based detection (rapid-fire)
  // More than 20 requests in 5 minutes suggests bot/script activity
  // Human users have natural delays between actions (typing, reading, etc.)
  const rapidFireWindow = 5 * 60 * 1000; // 5 minutes
  if (record.count > 20 && (now - record.firstAttempt) < rapidFireWindow) {
    return true;
  }
  
  return false;
}

/**
 * Log security event for rate limiting
 */
async function logRateLimitEvent(
  req: Request, 
  eventType: string, 
  record: RateLimitRecord,
  additionalInfo?: any
): Promise<void> {
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  await securityLogger.logSecurityEvent(
    'RATE_LIMIT_EXCEEDED',
    eventType,
    false,
    {
      userId: req.user?.id,
      ipAddress: ip,
      userAgent,
      resource: req.path,
      metadata: {
        endpoint: req.path,
        method: req.method,
        attempts: record.count,
        consecutiveFailures: record.consecutiveFailures,
        timeWindow: new Date(record.firstAttempt).toISOString(),
        ...additionalInfo
      }
    }
  );
}

/**
 * Main rate limiting middleware factory
 */
export function createRateLimit(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = config.keyGenerator ? config.keyGenerator(req) : generateKey(req);
      const now = Date.now();
      const ip = getClientIP(req);
      
      // Get or create rate limit record
      let record = rateLimitStore.get(key);
      
      if (!record || now > record.resetTime) {
        // Reset or create new record
        record = {
          count: 0,
          resetTime: now + config.windowMs,
          firstAttempt: now,
          consecutiveFailures: 0,
          lastFailureTime: 0,
          isBlocked: false
        };
        rateLimitStore.set(key, record);
      }
      
      // Check if IP is currently blocked
      if (record.isBlocked && record.blockUntil && now < record.blockUntil) {
        const remainingTime = Math.ceil((record.blockUntil - now) / 1000);
        
        await logRateLimitEvent(req, 'RATE_LIMIT_BLOCKED_ACCESS', record, {
          blockRemainingSeconds: remainingTime
        });
        
        const error = AppError.createRateLimitError(
          `IP temporarily blocked. Try again in ${remainingTime} seconds.`,
          'RATE_LIMIT_IP_BLOCKED',
          { retryAfter: remainingTime }
        );
        return next(error);
      }
      
      // Check if CAPTCHA is required
      if (record.captchaRequired && config.captchaThreshold) {
        const captchaToken = req.headers['x-captcha-token'] || req.body.captchaToken;
        
        if (!captchaToken) {
          await logRateLimitEvent(req, 'RATE_LIMIT_CAPTCHA_REQUIRED', record);
          
          const error = AppError.createValidationError(
            'CAPTCHA verification required',
            'CAPTCHA_REQUIRED',
            { captchaRequired: true }
          );
          return next(error);
        }
        
        // In a real implementation, verify CAPTCHA token here
        // For now, we'll assume any token is valid and reset the requirement
        record.captchaRequired = false;
        record.consecutiveFailures = 0;
      }
      
      // Increment request count
      record.count++;
      
      // Check if limit is exceeded
      if (record.count > config.maxAttempts) {
        record.consecutiveFailures++;
        record.lastFailureTime = now;
        
        // Check for suspicious activity
        const isSuspicious = checkSuspiciousActivity(record, ip);
        if (isSuspicious && !suspiciousIPs.has(ip)) {
          suspiciousIPs.add(ip);
          
          await logRateLimitEvent(req, 'SUSPICIOUS_ACTIVITY_DETECTED', record, {
            flaggedAsSuspicious: true,
            reason: 'Excessive rate limit violations'
          });
        }
        
        // Apply progressive delay if enabled
        if (config.progressiveDelay) {
          const delay = calculateProgressiveDelay(record.consecutiveFailures);
          
          if (delay > 0) {
            record.isBlocked = true;
            record.blockUntil = now + delay;
            
            await logRateLimitEvent(req, 'RATE_LIMIT_PROGRESSIVE_DELAY', record, {
              delayMs: delay,
              consecutiveFailures: record.consecutiveFailures
            });
          }
        }
        
        // Require CAPTCHA for repeated violations
        if (config.captchaThreshold && record.consecutiveFailures >= config.captchaThreshold) {
          record.captchaRequired = true;
          
          await logRateLimitEvent(req, 'RATE_LIMIT_CAPTCHA_TRIGGERED', record, {
            captchaThreshold: config.captchaThreshold
          });
        }
        
        // Call custom handler if provided
        if (config.onLimitReached) {
          const rateLimitInfo: RateLimitInfo = {
            totalHits: record.count,
            totalHitsInWindow: record.count,
            remainingPoints: 0,
            msBeforeNext: record.resetTime - now,
            isFirstInWindow: false
          };
          config.onLimitReached(req, rateLimitInfo);
        }
        
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);
        
        await logRateLimitEvent(req, 'RATE_LIMIT_EXCEEDED', record, {
          retryAfter,
          maxAttempts: config.maxAttempts
        });
        
        const error = AppError.createRateLimitError(
          'Rate limit exceeded. Please try again later.',
          'RATE_LIMIT_EXCEEDED',
          { 
            retryAfter,
            captchaRequired: record.captchaRequired,
            progressiveDelay: config.progressiveDelay
          }
        );
        return next(error);
      }
      
      // Add rate limit headers
      const remaining = Math.max(0, config.maxAttempts - record.count);
      const resetTime = Math.ceil((record.resetTime - now) / 1000);
      
      res.set({
        'X-RateLimit-Limit': config.maxAttempts.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime.toString(),
        'X-RateLimit-Window': Math.ceil(config.windowMs / 1000).toString()
      });
      
      // Reset consecutive failures on successful request (if configured)
      if (!config.skipSuccessfulRequests) {
        // We'll reset this after the request completes successfully
        res.on('finish', () => {
          if (res.statusCode < 400) {
            const currentRecord = rateLimitStore.get(key);
            if (currentRecord) {
              currentRecord.consecutiveFailures = 0;
              currentRecord.captchaRequired = false;
            }
          }
        });
      }
      
      next();
    } catch (error) {
      console.error('Rate limiting middleware error:', error);
      next(AppError.createSystemError('Rate limiting system error', 'RATE_LIMIT_SYSTEM_ERROR'));
    }
  };
}

/**
 * Predefined rate limiters for different endpoint types
 */

// Authentication endpoints - strict rate limiting
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 5,
  progressiveDelay: true,
  captchaThreshold: 3,
  keyGenerator: (req) => generateKey(req, 'auth'),
  onLimitReached: async (req, info) => {
    const ip = getClientIP(req);
    await securityLogger.logSecurityEvent(
      'RATE_LIMIT_EXCEEDED',
      'auth_rate_limit_exceeded',
      false,
      {
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
        resource: req.path,
        metadata: {
          endpoint: req.path,
          attempts: info.totalHits
        }
      }
    );
  }
});

// Login specific rate limiting with brute force protection
export const loginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 5,
  progressiveDelay: true,
  captchaThreshold: 3,
  keyGenerator: (req) => {
    const ip = getClientIP(req);
    const email = req.body?.email || 'unknown';
    return `login:${ip}:${email}`;
  },
  onLimitReached: async (req, info) => {
    const ip = getClientIP(req);
    const email = req.body?.email || 'unknown';
    
    await securityLogger.logSecurityEvent(
      'SUSPICIOUS_LOGIN',
      'login_brute_force_detected',
      false,
      {
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          email,
          attempts: info.totalHits,
          timeWindow: '15 minutes'
        }
      }
    );
  }
});

// Registration rate limiting
export const registerRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxAttempts: process.env.NODE_ENV === 'development' ? 100 : 3, // More lenient in dev
  progressiveDelay: true,
  captchaThreshold: 2,
  keyGenerator: (req) => generateKey(req, 'register')
});

// Password reset rate limiting
export const passwordResetRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxAttempts: 3,
  progressiveDelay: true,
  keyGenerator: (req) => {
    const ip = getClientIP(req);
    const email = req.body?.email || 'unknown';
    return `password_reset:${ip}:${email}`;
  }
});

// API endpoints rate limiting
export const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 100,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const ip = getClientIP(req);
    const userId = req.user?.id || 'anonymous';
    return `api:${ip}:${userId}`;
  }
});

// Search endpoints rate limiting
export const searchRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxAttempts: 20,
  keyGenerator: (req) => {
    const ip = getClientIP(req);
    const userId = req.user?.id || 'anonymous';
    return `search:${ip}:${userId}`;
  }
});

// AI/LLM endpoints rate limiting
export const aiRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxAttempts: 10,
  progressiveDelay: true,
  keyGenerator: (req) => {
    const ip = getClientIP(req);
    const userId = req.user?.id || 'anonymous';
    return `ai:${ip}:${userId}`;
  }
});

/**
 * Utility functions for rate limit management
 */

// Clear rate limit for a specific key (useful for testing or admin override)
export function clearRateLimit(key: string): boolean {
  return rateLimitStore.delete(key);
}

// Get rate limit status for a key
export function getRateLimitStatus(key: string): RateLimitRecord | null {
  return rateLimitStore.get(key) || null;
}

// Clear all rate limits (useful for testing)
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
  suspiciousIPs.clear();
}

// Get suspicious IPs
export function getSuspiciousIPs(): string[] {
  return Array.from(suspiciousIPs);
}

// Remove IP from suspicious list
export function clearSuspiciousIP(ip: string): boolean {
  return suspiciousIPs.delete(ip);
}

// Cleanup expired records (should be called periodically)
export function cleanupExpiredRecords(): number {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime && !record.isBlocked) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }
  
  return cleaned;
}

// Schedule periodic cleanup
setInterval(() => {
  const cleaned = cleanupExpiredRecords();
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired rate limit records`);
  }
}, 5 * 60 * 1000); // Every 5 minutes