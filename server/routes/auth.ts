import { Router } from 'express';
import { authService } from '../auth';
import { jwtService } from '../jwt';
import { jwtAuth, authRateLimit } from '../middleware/jwtAuth';
import { sanitizeInput, validateAuthInput } from '../middleware/inputSanitization';
import { validateUserData, validateSensitiveOperation } from '../middleware/queryValidation';
import { loginSchema, registerSchema } from '@shared/schema';
import { z } from 'zod';

const router = Router();

// Rate limiting for auth endpoints
const loginRateLimit = authRateLimit(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
const registerRateLimit = authRateLimit(3, 60 * 60 * 1000); // 3 attempts per hour

// Helper function to extract device info safely
function extractDeviceInfo(req: any) {
  return {
    userAgent: req.headers['user-agent'],
    platform: typeof req.headers['sec-ch-ua-platform'] === 'string' 
      ? req.headers['sec-ch-ua-platform'] 
      : undefined,
    browser: typeof req.headers['sec-ch-ua'] === 'string' 
      ? req.headers['sec-ch-ua'] 
      : undefined
  };
}

/**
 * POST /api/auth/login
 * Authenticate user and return JWT tokens
 */
router.post('/login', sanitizeInput, validateAuthInput, loginRateLimit, validateSensitiveOperation(5, 15 * 60 * 1000), async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Validate user credentials
    const user = await authService.validateUser(email, password);
    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        error: 'Account inactive',
        message: 'Your account has been deactivated',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Extract device info
    const deviceInfo = extractDeviceInfo(req);

    // Generate JWT tokens
    const tokens = await jwtService.generateTokens(
      user,
      deviceInfo,
      req.ip || req.connection.remoteAddress
    );

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          avatar: user.avatar
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid input data',
        details: error.errors,
        code: 'VALIDATION_ERROR'
      });
    }

    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/auth/register
 * Register new user and return JWT tokens
 */
router.post('/register', sanitizeInput, validateAuthInput, registerRateLimit, validateSensitiveOperation(3, 60 * 60 * 1000), async (req, res) => {
  try {
    const userData = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await authService.getUserByEmail(userData.email);
    if (existingUser) {
      return res.status(409).json({
        error: 'Registration failed',
        message: 'User already exists',
        code: 'USER_EXISTS'
      });
    }

    // Create new user
    const user = await authService.createUser({
      email: userData.email,
      password: userData.password,
      name: userData.name,
      provider: 'local'
    });

    // Extract device info
    const deviceInfo = extractDeviceInfo(req);

    // Generate JWT tokens
    const tokens = await jwtService.generateTokens(
      user,
      deviceInfo,
      req.ip || req.connection.remoteAddress
    );

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          avatar: user.avatar
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid input data',
        details: error.errors,
        code: 'VALIDATION_ERROR'
      });
    }

    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', sanitizeInput, validateSensitiveOperation(10, 15 * 60 * 1000), async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh failed',
        message: 'No refresh token provided',
        code: 'NO_REFRESH_TOKEN'
      });
    }

    const tokens = await jwtService.refreshToken(refreshToken);
    if (!tokens) {
      // Clear invalid refresh token cookie
      res.clearCookie('refreshToken');
      return res.status(401).json({
        error: 'Refresh failed',
        message: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Set new refresh token as httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Refresh failed',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user and revoke tokens
 */
router.post('/logout', jwtAuth, async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    // Revoke current access token
    if (req.user?.jti) {
      await jwtService.revokeToken(req.user.jti, req.user.id.toString());
    }

    // Revoke refresh token if provided
    if (refreshToken) {
      await jwtService.blacklistToken(refreshToken);
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/auth/logout-all
 * Logout from all devices by revoking all user tokens
 */
router.post('/logout-all', jwtAuth, async (req, res) => {
  try {
    await jwtService.revokeAllUserTokens(req.user!.id, req.user!.id.toString());

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logged out from all devices successfully'
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', jwtAuth, validateUserData, async (req, res) => {
  try {
    const user = await authService.getUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
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
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/auth/user
 * Compatibility endpoint for client - redirects to /me
 */
router.get('/user', jwtAuth, validateUserData, async (req, res) => {
  try {
    const user = await authService.getUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found',
        code: 'USER_NOT_FOUND'
      });
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
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/auth/sessions
 * Get user's active sessions
 */
router.get('/sessions', jwtAuth, async (req, res) => {
  try {
    const activeTokensCount = await jwtService.getUserActiveTokensCount(req.user!.id);

    res.json({
      success: true,
      data: {
        activeSessions: activeTokensCount
      }
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      error: 'Failed to get sessions',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;