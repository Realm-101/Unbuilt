import { Router } from 'express';
import { 
  createCaptchaChallenge, 
  verifyCaptchaResponse, 
  getCaptchaChallenge,
  getCaptchaStats 
} from '../services/captchaService';
import { 
  AppError, 
  asyncHandler, 
  sendSuccess 
} from '../middleware/errorHandler';
import { sanitizeInput } from '../middleware/inputSanitization';
import { createRateLimit } from '../middleware/rateLimiting';
import { requireRole } from '../middleware/jwtAuth';
import { z } from 'zod';

const router = Router();

// Rate limiting for CAPTCHA endpoints
const captchaRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxAttempts: 10, // Allow multiple CAPTCHA requests
  keyGenerator: (req) => `captcha:${req.ip}`
});

// Validation schemas
const verifyCaptchaSchema = z.object({
  challengeId: z.string().uuid('Invalid challenge ID format'),
  answer: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'string' ? parseInt(val, 10) : val
  )
});

/**
 * POST /api/captcha/challenge
 * Create a new CAPTCHA challenge
 */
router.post('/challenge', captchaRateLimit, sanitizeInput, asyncHandler(async (req, res) => {
  const challenge = createCaptchaChallenge();
  
  sendSuccess(res, {
    challengeId: challenge.challengeId,
    question: challenge.question,
    expiresIn: challenge.expiresIn
  }, 'CAPTCHA challenge created');
}));

/**
 * POST /api/captcha/verify
 * Verify a CAPTCHA response
 */
router.post('/verify', captchaRateLimit, sanitizeInput, asyncHandler(async (req, res) => {
  const validation = verifyCaptchaSchema.safeParse(req.body);
  
  if (!validation.success) {
    throw AppError.createValidationError(
      'Invalid CAPTCHA verification data',
      'CAPTCHA_VALIDATION_ERROR',
      validation.error.errors
    );
  }
  
  const { challengeId, answer } = validation.data;
  
  const verification = verifyCaptchaResponse(challengeId, answer);
  
  if (!verification.isValid) {
    // Don't throw an error, just return the verification result
    return sendSuccess(res, {
      isValid: false,
      error: verification.error,
      remainingAttempts: verification.remainingAttempts
    }, 'CAPTCHA verification failed');
  }
  
  sendSuccess(res, {
    isValid: true,
    message: 'CAPTCHA verified successfully'
  }, 'CAPTCHA verification successful');
}));

/**
 * GET /api/captcha/challenge/:challengeId
 * Get CAPTCHA challenge information
 */
router.get('/challenge/:challengeId', captchaRateLimit, sanitizeInput, asyncHandler(async (req, res) => {
  const { challengeId } = req.params;
  
  if (!challengeId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(challengeId)) {
    throw AppError.createValidationError('Invalid challenge ID format', 'INVALID_CHALLENGE_ID');
  }
  
  const challenge = getCaptchaChallenge(challengeId);
  
  if (!challenge) {
    throw AppError.createNotFoundError('CAPTCHA challenge not found or expired', 'CAPTCHA_NOT_FOUND');
  }
  
  sendSuccess(res, {
    question: challenge.question,
    expiresAt: new Date(challenge.expiresAt).toISOString(),
    timeRemaining: Math.max(0, Math.ceil((challenge.expiresAt - Date.now()) / 1000))
  });
}));

/**
 * GET /api/captcha/stats
 * Get CAPTCHA statistics (admin only)
 */
router.get('/stats', requireRole(['admin', 'enterprise']), asyncHandler(async (req, res) => {
  const stats = getCaptchaStats();
  
  sendSuccess(res, {
    statistics: stats,
    timestamp: new Date().toISOString()
  });
}));

export default router;