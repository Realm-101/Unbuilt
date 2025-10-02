import { Router } from 'express';
import { authService } from '../auth';
import { jwtService } from '../jwt';
import { jwtAuth, authRateLimit } from '../middleware/jwtAuth';
import { sanitizeInput, validateAuthInput } from '../middleware/inputSanitization';
import { validateUserData, validateSensitiveOperation } from '../middleware/queryValidation';
import { validateLogin, validateRegister, authRateLimit as newAuthRateLimit } from '../middleware/validation';
import { sessionManager, SessionManager } from '../services/sessionManager';
import { securityEventHandler } from '../services/securityEventHandler';
import { loginSchema, registerSchema } from '@shared/schema';
import { 
  AppError, 
  asyncHandler, 
  sendSuccess
} from '../middleware/errorHandler';

const router = Router();

// Rate limiting for auth endpoints
const loginRateLimit = authRateLimit(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
const registerRateLimit = authRateLimit(3, 60 * 60 * 1000); // 3 attempts per hour

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
router.post('/login', newAuthRateLimit, validateLogin, sanitizeInput, validateAuthInput, loginRateLimit, validateSensitiveOperation(5, 15 * 60 * 1000), asyncHandler(async (req, res) => {
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
  const user = await authService.validateUser(email, password);
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
  await securityEventHandler.handleSuccessfulLogin(user.id);

  // Parse device info and get IP
  const deviceInfo = SessionManager.parseDeviceInfo(req.headers['user-agent']);

  // Create session with enhanced tracking
  const sessionResult = await sessionManager.createSession(
    user.id,
    deviceInfo,
    ipAddress
  );

  // Set refresh token as httpOnly cookie
  res.cookie('refreshToken', sessionResult.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

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
router.post('/register', newAuthRateLimit, validateRegister, sanitizeInput, validateAuthInput, registerRateLimit, validateSensitiveOperation(3, 60 * 60 * 1000), asyncHandler(async (req, res) => {
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

  // Parse device info and get IP
  const deviceInfo = SessionManager.parseDeviceInfo(req.headers['user-agent']);
  const registerIpAddress = getClientIp(req);

  // Create session with enhanced tracking
  const sessionResult = await sessionManager.createSession(
    user.id,
    deviceInfo,
    registerIpAddress
  );

  // Set refresh token as httpOnly cookie
  res.cookie('refreshToken', sessionResult.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

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
router.post('/refresh', sanitizeInput, validateSensitiveOperation(10, 15 * 60 * 1000), asyncHandler(async (req, res) => {
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
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  sendSuccess(res, {
    accessToken: tokens.accessToken,
    expiresIn: tokens.expiresIn
  }, 'Token refreshed successfully');
}));

/**
 * POST /api/auth/logout
 * Logout user and revoke current session
 */
router.post('/logout', jwtAuth, asyncHandler(async (req, res) => {
  const sessionId = req.user!.jti;

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
router.post('/logout-all', jwtAuth, asyncHandler(async (req, res) => {
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
router.get('/me', jwtAuth, validateUserData, asyncHandler(async (req, res) => {
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
 * Compatibility endpoint for client - redirects to /me
 */
router.get('/user', jwtAuth, validateUserData, asyncHandler(async (req, res) => {
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
router.get('/sessions', jwtAuth, asyncHandler(async (req, res) => {
  const sessions = await sessionManager.getUserSessions(req.user!.id);
  const currentSessionId = req.user!.jti;
  
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

export default router;