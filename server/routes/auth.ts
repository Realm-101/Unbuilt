import { Router, Request, Response } from 'express';
import { authService } from '../auth';
import { jwtService } from '../jwt';
import { jwtAuth } from '../middleware/jwtAuth';
import { sanitizeInput, validateAuthInput } from '../middleware/inputSanitization';
import { validateUserData, validateSensitiveOperation } from '../middleware/queryValidation';
import { validateLogin, validateRegister, validateChangePassword, validatePasswordStrength } from '../middleware/validation';
import { 
  authRateLimit, 
  loginRateLimit, 
  registerRateLimit, 
  passwordResetRateLimit,
  apiRateLimit 
} from '../middleware/rateLimiting';
import { sessionManager, SessionManager } from '../services/sessionManager';
import { securityEventHandler } from '../services/securityEventHandler';
import { loginSchema, registerSchema } from '@shared/schema';
import { 
  AppError, 
  asyncHandler, 
  sendSuccess
} from '../middleware/errorHandler';
import { trackSignupEvent } from '../middleware/trackingMiddleware';
import { requireAuth } from 'server/middleware/auth';

const router = Router();

// Helper function to get secure cookie options
function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };
}

// Helper function to get client IP address
function getClientIp(req: any): string {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         'unknown';
}

/**
 * POST /api/auth/login
 * Authenticate user and return JWT tokens
 */
router.post('/login', loginRateLimit, validateLogin, sanitizeInput, validateAuthInput, validateSensitiveOperation(5, 15 * 60 * 1000), asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);
  const ipAddress = getClientIp(req);

  // Check if account is locked before attempting validation
  const existingUser = await authService.getUserByEmail(email);
  if (existingUser) {
    const isLocked = await securityEventHandler.isAccountLocked(existingUser.id);
    if (isLocked) {
      throw AppError.createAuthenticationError('Account is temporarily locked', 'AUTH_ACCOUNT_LOCKED');
    }
  }

  // Validate user credentials
  const user = await authService.validateUser(email, password, ipAddress);
  if (!user) {
    // Handle failed login attempt
    await securityEventHandler.handleFailedLoginAttempt(
      email, 
      ipAddress, 
      req.headers['user-agent']
    );
    throw AppError.createAuthenticationError('Invalid credentials', 'AUTH_INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw AppError.createAuthenticationError('Account inactive', 'AUTH_ACCOUNT_INACTIVE');
  }

  // Handle successful login (reset failed attempts)
  await securityEventHandler.handleSuccessfulLogin(user.id, {
    ipAddress,
    userAgent: req.headers['user-agent'],
    userEmail: user.email
  });

  // Parse device info and get IP
  const deviceInfo = SessionManager.parseDeviceInfo(req.headers['user-agent']);

  // Create session with enhanced tracking
  const sessionResult = await sessionManager.createSession(
    user.id,
    deviceInfo,
    ipAddress
  );

  // Set cookies for authentication
  const cookieOptions = getCookieOptions();
  res.cookie('sessionId', sessionResult.sessionId, cookieOptions);
  res.cookie('refreshToken', sessionResult.refreshToken, cookieOptions);

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('[Login] Setting cookies:', {
      sessionId: sessionResult.sessionId,
      cookieOptions,
      userId: user.id
    });
  }

  sendSuccess(res, {
    accessToken: sessionResult.accessToken,
    expiresIn: 15 * 60, // 15 minutes
    sessionId: sessionResult.sessionId,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      avatar: user.avatar
    }
  }, 'Login successful');
}));

/**
 * POST /api/auth/register
 * Register new user and return JWT tokens
 */
router.post('/register', registerRateLimit, validateRegister, sanitizeInput, validateAuthInput, validateSensitiveOperation(3, 60 * 60 * 1000), asyncHandler(async (req: Request, res: Response) => {
  const userData = registerSchema.parse(req.body);

  // Check if user already exists
  const existingUser = await authService.getUserByEmail(userData.email);
  if (existingUser) {
    throw AppError.createConflictError('User already exists', 'AUTH_USER_EXISTS');
  }

  // Create new user
  const user = await authService.createUser({
    email: userData.email,
    password: userData.password,
    name: userData.name,
    provider: 'local'
  });

  // Track signup event
  await trackSignupEvent(user.id, 'local');

  // Parse device info and get IP
  const deviceInfo = SessionManager.parseDeviceInfo(req.headers['user-agent']);
  const registerIpAddress = getClientIp(req);

  // Create session with enhanced tracking
  const sessionResult = await sessionManager.createSession(
    user.id,
    deviceInfo,
    registerIpAddress
  );

  // Set cookies for authentication
  const cookieOptions = getCookieOptions();
  res.cookie('sessionId', sessionResult.sessionId, cookieOptions);
  res.cookie('refreshToken', sessionResult.refreshToken, cookieOptions);

  sendSuccess(res, {
    accessToken: sessionResult.accessToken,
    expiresIn: 15 * 60, // 15 minutes
    sessionId: sessionResult.sessionId,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      avatar: user.avatar
    }
  }, 'Registration successful', 201);
}));

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', authRateLimit, sanitizeInput, validateSensitiveOperation(10, 15 * 60 * 1000), asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    throw AppError.createAuthenticationError('No refresh token provided', 'AUTH_NO_REFRESH_TOKEN');
  }

  const tokens = await jwtService.refreshToken(refreshToken);
  if (!tokens) {
    // Clear invalid refresh token cookie
    res.clearCookie('refreshToken');
    throw AppError.createAuthenticationError('Invalid or expired refresh token', 'AUTH_INVALID_REFRESH_TOKEN');
  }

  // Set new refresh token as httpOnly cookie
  const cookieOptions = getCookieOptions();
  res.cookie('refreshToken', tokens.refreshToken, cookieOptions);

  sendSuccess(res, {
    accessToken: tokens.accessToken,
    expiresIn: tokens.expiresIn
  }, 'Token refreshed successfully');
}));

/**
 * POST /api/auth/logout
 * Logout user and revoke current session
 */
router.post('/logout', jwtAuth, asyncHandler(async (req: Request, res: Response) => {
  const sessionId = (req.user as any)!.jti;

  // Invalidate current session (this will revoke both access and refresh tokens)
  await sessionManager.invalidateSession(sessionId, `user_${req.user!.id}`);

  // Clear refresh token cookie
  res.clearCookie('refreshToken');

  sendSuccess(res, null, 'Logout successful');
}));

/**
 * POST /api/auth/logout-all
 * Logout from all devices by invalidating all user sessions
 */
router.post('/logout-all', jwtAuth, asyncHandler(async (req: Request, res: Response) => {
  const invalidatedCount = await sessionManager.invalidateAllUserSessions(
    req.user!.id, 
    `user_${req.user!.id}_logout_all`
  );

  // Clear refresh token cookie
  res.clearCookie('refreshToken');

  sendSuccess(res, {
    message: 'Logged out from all devices successfully',
    invalidatedSessions: invalidatedCount
  });
}));

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', apiRateLimit, jwtAuth, validateUserData, asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getUserById(req.user!.id);
  if (!user) {
    throw AppError.createNotFoundError('User account not found', 'USER_NOT_FOUND');
  }

  sendSuccess(res, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      avatar: user.avatar,
      searchCount: user.searchCount,
      lastResetDate: user.lastResetDate,
      createdAt: user.createdAt,
      preferences: user.preferences
    }
  });
}));

/**
 * GET /api/auth/user
 * Compatibility endpoint for client - uses session-based auth
 */
router.get('/user', apiRateLimit, requireAuth, validateUserData, asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getUserById(req.user!.id);
  if (!user) {
    throw AppError.createNotFoundError('User account not found', 'USER_NOT_FOUND');
  }

  // Return user data in the format expected by the client
  res.json({
    id: user.id,
    email: user.email,
    firstName: user.name?.split(' ')[0] || '',
    lastName: user.name?.split(' ').slice(1).join(' ') || '',
    profileImageUrl: user.avatar,
    plan: user.plan,
    searchCount: user.searchCount,
    lastResetDate: user.lastResetDate,
    createdAt: user.createdAt,
    preferences: user.preferences
  });
}));

/**
 * GET /api/auth/sessions
 * Get user's active sessions with detailed information
 */
router.get('/sessions', apiRateLimit, jwtAuth, asyncHandler(async (req: Request, res: Response) => {
  const sessions = await sessionManager.getUserSessions(req.user!.id);
  const currentSessionId = (req.user as any)!.jti;
  
  // Add current session indicator
  const sessionsWithCurrent = sessions.map(session => ({
    ...session,
    isCurrent: session.id === currentSessionId
  }));

  sendSuccess(res, {
    sessions: sessionsWithCurrent,
    totalSessions: sessions.length,
    activeSessions: sessions.filter(s => s.isActive).length
  });
}));

/**
 * POST /api/auth/change-password
 * Change user password with security validation
 */
router.post('/change-password', passwordResetRateLimit, jwtAuth, validateChangePassword, sanitizeInput, validateSensitiveOperation(3, 60 * 60 * 1000), asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  // Change password
  const result = await authService.changePassword(req.user!.id, currentPassword, newPassword);
  
  if (!result.success) {
    throw AppError.createValidationError(result.errors.join(', '), 'PASSWORD_CHANGE_FAILED');
  }

  // Log security event
  const { securityLogger } = await import('../services/securityLogger');
  await securityLogger.logSecurityEvent(
    'PASSWORD_CHANGE',
    'password_change',
    true,
    {
      userId: req.user!.id,
      userEmail: req.user!.email,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']
    }
  );

  sendSuccess(res, null, 'Password changed successfully');
}));

/**
 * GET /api/auth/password-status
 * Get password security status for current user
 */
router.get('/password-status', apiRateLimit, jwtAuth, asyncHandler(async (req: Request, res: Response) => {
  const status = await authService.getPasswordSecurityStatus(req.user!.id);
  
  sendSuccess(res, {
    passwordStatus: status,
    requiresChange: await authService.shouldForcePasswordChange(req.user!.id)
  });
}));

/**
 * POST /api/auth/validate-password-strength
 * Validate password strength without changing it
 */
router.post('/validate-password-strength', authRateLimit, validatePasswordStrength, sanitizeInput, asyncHandler(async (req: Request, res: Response) => {
  const { password } = req.body;

  const { passwordSecurityService } = await import('../services/passwordSecurity');
  const strengthResult = passwordSecurityService.validatePasswordStrength(password);

  sendSuccess(res, {
    isValid: strengthResult.isValid,
    score: strengthResult.score,
    feedback: strengthResult.feedback,
    requirements: strengthResult.requirements
  });
}));

// Mark onboarding as complete for user
router.post('/onboarding-complete', jwtAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  
  // For now, just return success since we're using localStorage
  // In the future, we can add an onboardingCompleted field to the users table
  sendSuccess(res, { 
    success: true,
    message: 'Onboarding completed successfully'
  });
}));

export default router;