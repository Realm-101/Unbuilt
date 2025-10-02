import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { authService } from '../../auth';
import { jwtService } from '../../jwt';
import { sessionManager } from '../../services/sessionManager';
import { passwordSecurityService } from '../../services/passwordSecurity';
import { accountLockoutService } from '../../services/accountLockout';

// Mock dependencies
vi.mock('../../db', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('../../services/passwordSecurity');
vi.mock('../../services/passwordHistory');
vi.mock('../../services/accountLockout');

describe('Authentication Integration Tests', () => {
  let app: express.Application;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up test environment
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-long-enough-for-security';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-long-enough-for-security';
    process.env.NODE_ENV = 'test';

    // Create Express app for testing
    app = express();
    app.use(express.json());

    // Mock database
    mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([])
        })
      }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([])
      })
    };

    const { db } = require('../../db');
    Object.assign(db, mockDb);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Authentication Flow', () => {
    it('should handle complete registration -> login -> access -> logout flow', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: 'Test User'
      };

      // Mock password security validation
      vi.mocked(passwordSecurityService.validatePasswordStrength).mockReturnValue({
        isValid: true,
        score: 85,
        feedback: []
      });

      vi.mocked(passwordSecurityService.hashPassword).mockResolvedValue('hashed-password');

      // Mock user creation
      const mockUser = {
        id: 1,
        email: userData.email,
        name: userData.name,
        password: 'hashed-password',
        passwordStrengthScore: 85,
        lastPasswordChange: new Date().toISOString(),
        isActive: true,
        plan: 'free'
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockUser])
        })
      });

      // Step 1: Register user
      const user = await authService.createUser(userData);
      expect(user.email).toBe(userData.email);
      expect(passwordSecurityService.hashPassword).toHaveBeenCalledWith(userData.password);

      // Step 2: Login attempt
      vi.mocked(passwordSecurityService.verifyPassword).mockResolvedValue(true);
      vi.mocked(accountLockoutService.isAccountLocked).mockResolvedValue(false);
      vi.mocked(accountLockoutService.recordSuccessfulLogin).mockResolvedValue();

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser])
        })
      });

      const authenticatedUser = await authService.validateUser(
        userData.email,
        userData.password,
        '192.168.1.1'
      );

      expect(authenticatedUser).toBeTruthy();
      expect(authenticatedUser?.email).toBe(userData.email);
      expect(accountLockoutService.recordSuccessfulLogin).toHaveBeenCalledWith(1);

      // Step 3: Generate JWT tokens
      const tokens = await jwtService.generateTokens(mockUser);
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');

      // Step 4: Validate access token
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{
            id: 'test-jti',
            userId: 1,
            tokenType: 'access',
            isRevoked: false
          }])
        })
      });

      const payload = await jwtService.validateToken(tokens.accessToken, 'access');
      expect(payload).toBeTruthy();
      expect(payload?.sub).toBe('1');

      // Step 5: Logout (revoke tokens)
      await jwtService.revokeAllUserTokens(1, 'user_logout');
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should handle failed login attempts and account lockout', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'WrongPassword'
      };

      const mockUser = {
        id: 1,
        email: userData.email,
        password: 'hashed-password',
        isActive: true
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser])
        })
      });

      vi.mocked(accountLockoutService.isAccountLocked).mockResolvedValue(false);
      vi.mocked(passwordSecurityService.verifyPassword).mockResolvedValue(false);
      vi.mocked(accountLockoutService.recordFailedAttempt).mockResolvedValue();

      // First failed attempt
      const result1 = await authService.validateUser(
        userData.email,
        userData.password,
        '192.168.1.1'
      );

      expect(result1).toBeNull();
      expect(accountLockoutService.recordFailedAttempt).toHaveBeenCalledWith(
        1,
        userData.email,
        '192.168.1.1'
      );

      // Simulate account locked after multiple attempts
      vi.mocked(accountLockoutService.isAccountLocked).mockResolvedValue(true);

      const result2 = await authService.validateUser(
        userData.email,
        userData.password,
        '192.168.1.1'
      );

      expect(result2).toBeNull();
      // Should not call recordFailedAttempt when account is locked
      expect(accountLockoutService.recordFailedAttempt).toHaveBeenCalledTimes(1);
    });

    it('should handle token refresh flow', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        plan: 'pro'
      };

      // Generate initial tokens
      const initialTokens = await jwtService.generateTokens(mockUser);

      // Mock refresh token validation
      const refreshPayload = {
        sub: '1',
        email: 'test@example.com',
        role: 'pro',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        jti: 'refresh-jti',
        type: 'refresh' as const
      };

      const validateTokenSpy = vi.spyOn(jwtService, 'validateToken')
        .mockResolvedValueOnce(refreshPayload);

      const revokeTokenSpy = vi.spyOn(jwtService, 'revokeToken')
        .mockResolvedValue();

      // Refresh tokens
      const newTokens = await jwtService.refreshToken(initialTokens.refreshToken);

      expect(newTokens).toBeTruthy();
      expect(newTokens).toHaveProperty('accessToken');
      expect(newTokens).toHaveProperty('refreshToken');
      expect(validateTokenSpy).toHaveBeenCalledWith(initialTokens.refreshToken, 'refresh');
      expect(revokeTokenSpy).toHaveBeenCalledWith('refresh-jti');
    });

    it('should handle password change flow with security validation', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'old-hashed-password',
        isActive: true
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser])
        })
      });

      // Mock password history service
      const { passwordHistoryService } = await import('../../services/passwordHistory');
      vi.mocked(passwordHistoryService.getRecentPasswordHashes).mockResolvedValue([]);
      vi.mocked(passwordHistoryService.addPasswordToHistory).mockResolvedValue();

      // Mock password security validation
      vi.mocked(passwordSecurityService.validatePasswordChange).mockResolvedValue({
        isValid: true,
        errors: []
      });

      vi.mocked(passwordSecurityService.validatePasswordStrength).mockReturnValue({
        isValid: true,
        score: 90,
        feedback: []
      });

      vi.mocked(passwordSecurityService.hashPassword).mockResolvedValue('new-hashed-password');

      const result = await authService.changePassword(
        1,
        'OldPassword123!',
        'NewSecurePassword456!'
      );

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(passwordSecurityService.validatePasswordChange).toHaveBeenCalled();
      expect(passwordHistoryService.addPasswordToHistory).toHaveBeenCalled();
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should handle session management integration', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        plan: 'free'
      };

      const deviceInfo = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        platform: 'Windows',
        browser: 'Chrome',
        deviceType: 'desktop' as const
      };

      // Mock session creation
      const createSessionSpy = vi.spyOn(sessionManager, 'createSession')
        .mockResolvedValue({
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          sessionId: 'session-id'
        });

      const session = await sessionManager.createSession(
        mockUser.id,
        deviceInfo,
        '192.168.1.1'
      );

      expect(session).toHaveProperty('accessToken');
      expect(session).toHaveProperty('refreshToken');
      expect(session).toHaveProperty('sessionId');
      expect(createSessionSpy).toHaveBeenCalledWith(
        mockUser.id,
        deviceInfo,
        '192.168.1.1'
      );
    });
  });

  describe('Security Event Handling', () => {
    it('should handle password change security event', async () => {
      const securityEvent = {
        type: 'PASSWORD_CHANGE' as const,
        userId: 1,
        details: { currentSessionId: 'current-session' },
        timestamp: new Date()
      };

      const handleSecurityEventSpy = vi.spyOn(sessionManager, 'handleSecurityEvent')
        .mockResolvedValue();

      await sessionManager.handleSecurityEvent(securityEvent);

      expect(handleSecurityEventSpy).toHaveBeenCalledWith(securityEvent);
    });

    it('should handle account locked security event', async () => {
      const securityEvent = {
        type: 'ACCOUNT_LOCKED' as const,
        userId: 1,
        details: { reason: 'Too many failed attempts' },
        timestamp: new Date()
      };

      const invalidateAllUserSessionsSpy = vi.spyOn(sessionManager, 'invalidateAllUserSessions')
        .mockResolvedValue(3);

      await sessionManager.handleSecurityEvent(securityEvent);

      expect(invalidateAllUserSessionsSpy).toHaveBeenCalledWith(
        1,
        'account_locked'
      );
    });
  });

  describe('Error Scenarios', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Database connection failed'))
        })
      });

      await expect(authService.getUserByEmail('test@example.com'))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle JWT service errors', async () => {
      const user = { id: 1, email: 'test@example.com' };

      // Mock database error during token storage
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error('Token storage failed'))
      });

      await expect(jwtService.generateTokens(user))
        .rejects.toThrow('Token storage failed');
    });

    it('should handle password hashing errors', async () => {
      vi.mocked(passwordSecurityService.hashPassword)
        .mockRejectedValue(new Error('Hashing failed'));

      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      vi.mocked(passwordSecurityService.validatePasswordStrength).mockReturnValue({
        isValid: true,
        score: 80,
        feedback: []
      });

      await expect(authService.createUser(userData))
        .rejects.toThrow('Hashing failed');
    });
  });

  describe('Concurrent Access Scenarios', () => {
    it('should handle concurrent login attempts', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed-password',
        isActive: true
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser])
        })
      });

      vi.mocked(accountLockoutService.isAccountLocked).mockResolvedValue(false);
      vi.mocked(passwordSecurityService.verifyPassword).mockResolvedValue(true);
      vi.mocked(accountLockoutService.recordSuccessfulLogin).mockResolvedValue();

      // Simulate concurrent login attempts
      const loginPromises = Array.from({ length: 5 }, () =>
        authService.validateUser('test@example.com', 'password123', '192.168.1.1')
      );

      const results = await Promise.all(loginPromises);

      // All should succeed
      results.forEach(result => {
        expect(result).toBeTruthy();
        expect(result?.email).toBe('test@example.com');
      });
    });

    it('should handle concurrent token generation', async () => {
      const user = { id: 1, email: 'test@example.com', plan: 'free' };

      // Generate multiple tokens concurrently
      const tokenPromises = Array.from({ length: 10 }, () =>
        jwtService.generateTokens(user)
      );

      const tokenResults = await Promise.all(tokenPromises);

      // All should succeed and have unique JTIs
      const jtis = new Set();
      tokenResults.forEach(tokens => {
        expect(tokens).toHaveProperty('accessToken');
        expect(tokens).toHaveProperty('refreshToken');
        
        const payload = require('jsonwebtoken').decode(tokens.accessToken);
        jtis.add(payload.jti);
      });

      expect(jtis.size).toBe(10); // All JTIs should be unique
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle token validation efficiently', async () => {
      const user = { id: 1, email: 'test@example.com' };
      const tokens = await jwtService.generateTokens(user);

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{
            id: 'test-jti',
            userId: 1,
            tokenType: 'access',
            isRevoked: false
          }])
        })
      });

      const startTime = Date.now();
      
      // Validate token multiple times
      const validationPromises = Array.from({ length: 100 }, () =>
        jwtService.validateToken(tokens.accessToken, 'access')
      );

      const results = await Promise.all(validationPromises);
      const endTime = Date.now();

      // All validations should succeed
      results.forEach(result => {
        expect(result).toBeTruthy();
      });

      // Should complete within reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
    });
  });
});