import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandlerMiddleware, AppError, asyncHandler, sendSuccess } from '../errorHandler';

// Mock console methods
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Error Handler Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    mockConsoleError.mockClear();
  });

  it('should handle AppError correctly in routes', async () => {
    app.get('/test-auth-error', asyncHandler(async (req, res) => {
      throw AppError.createAuthenticationError('Invalid token', 'AUTH_INVALID_TOKEN');
    }));

    app.use(errorHandlerMiddleware);

    const response = await request(app)
      .get('/test-auth-error')
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Authentication failed',
      message: 'Authentication required',
      code: 'AUTH_INVALID_TOKEN',
      statusCode: 401
    });

    expect(response.body.requestId).toMatch(/^[a-f0-9]{16}$/);
    expect(response.body.timestamp).toBeDefined();
  });

  it('should handle validation errors correctly', async () => {
    app.post('/test-validation', asyncHandler(async (req, res) => {
      throw AppError.createValidationError('Email is required', 'VAL_EMAIL_REQUIRED', {
        field: 'email'
      });
    }));

    app.use(errorHandlerMiddleware);

    const response = await request(app)
      .post('/test-validation')
      .send({ name: 'test' })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Invalid input data',
      message: 'Email is required',
      code: 'VAL_EMAIL_REQUIRED',
      statusCode: 400
    });
  });

  it('should handle system errors and sanitize sensitive information', async () => {
    app.get('/test-system-error', asyncHandler(async (req, res) => {
      throw new Error('Database connection failed with password: secret123');
    }));

    app.use(errorHandlerMiddleware);

    const response = await request(app)
      .get('/test-system-error')
      .expect(500);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Internal server error',
      message: 'Internal server error',
      code: 'SYS_UNKNOWN',
      statusCode: 500
    });

    // Should not expose sensitive information
    expect(response.body.message).not.toContain('password');
    expect(response.body.message).not.toContain('secret123');
  });

  it('should handle success responses correctly', async () => {
    app.get('/test-success', asyncHandler(async (req, res) => {
      sendSuccess(res, { id: 1, name: 'Test' }, 'Operation successful');
    }));

    const response = await request(app)
      .get('/test-success')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Operation successful',
      data: { id: 1, name: 'Test' }
    });

    expect(response.body.timestamp).toBeDefined();
  });

  it('should handle rate limit errors correctly', async () => {
    app.get('/test-rate-limit', asyncHandler(async (req, res) => {
      const error = AppError.createRateLimitError('Too many requests', 'RATE_EXCEEDED');
      error.details = { retryAfter: 60 };
      throw error;
    }));

    app.use(errorHandlerMiddleware);

    const response = await request(app)
      .get('/test-rate-limit')
      .expect(429);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Too many requests',
      code: 'RATE_EXCEEDED',
      statusCode: 429
    });
  });

  it('should handle authorization errors correctly', async () => {
    app.get('/test-authz-error', asyncHandler(async (req, res) => {
      throw AppError.createAuthorizationError('Insufficient permissions', 'AUTHZ_INSUFFICIENT');
    }));

    app.use(errorHandlerMiddleware);

    const response = await request(app)
      .get('/test-authz-error')
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Access denied',
      message: 'Insufficient permissions',
      code: 'AUTHZ_INSUFFICIENT',
      statusCode: 403
    });
  });

  it('should handle not found errors correctly', async () => {
    app.get('/test-not-found', asyncHandler(async (req, res) => {
      throw AppError.createNotFoundError('User not found', 'USER_NOT_FOUND');
    }));

    app.use(errorHandlerMiddleware);

    const response = await request(app)
      .get('/test-not-found')
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Resource not found',
      message: 'User not found',
      code: 'USER_NOT_FOUND',
      statusCode: 404
    });
  });

  it('should log security events for authentication failures', async () => {
    app.get('/test-security-logging', asyncHandler(async (req, res) => {
      throw AppError.createAuthenticationError('Invalid credentials', 'AUTH_INVALID_CREDS');
    }));

    app.use(errorHandlerMiddleware);

    await request(app)
      .get('/test-security-logging')
      .expect(401);

    // Verify security event was logged
    expect(mockConsoleError).toHaveBeenCalledWith(
      'SECURITY_EVENT:',
      expect.stringContaining('AUTH_FAILURE')
    );
  });
});