import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWTService, jwtService } from '../../jwt';
import type { JWTPayload, TokenPair } from '../../jwt';

// Mock dependencies
vi.mock('../../db', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('@shared/schema', () => ({
  jwtTokens: {
    id: 'id',
    userId: 'userId',
    tokenType: 'tokenType',
    issuedAt: 'issuedAt',
    expiresAt: 'expiresAt',
    deviceInfo: 'deviceInfo',
    ipAddress: 'ipAddress',
    isRevoked: 'isRevoked',
    revokedAt: 'revokedAt',
    revokedBy: 'revokedBy'
  }
}));

describe('JWTService', () => {
  let jwtServiceInstance: JWTService;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up environment variables for testing
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-long-enough-for-security';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-long-enough-for-security';
    process.env.NODE_ENV = 'test';

    // Create fresh instance for each test
    jwtServiceInstance = new JWTService();

    // Mock database
    mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([])
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
      })
    };

    const { db } = await import('../../db');
    Object.assign(db, mockDb);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
  });

  describe('constructor', () => {
    it('should initialize with environment secrets', () => {
      expect(() => new JWTService()).not.toThrow();
    });

    it('should throw error in production without secrets', () => {
      delete process.env.JWT_ACCESS_SECRET;
      process.env.NODE_ENV = 'production';
      
      expect(() => new JWTService()).toThrow('JWT_ACCESS_SECRET environment variable is required in production');
    });

    it('should throw error for short secrets', () => {
      process.env.JWT_ACCESS_SECRET = 'short';
      
      expect(() => new JWTService()).toThrow('JWT_ACCESS_SECRET must be at least 32 characters long');
    });

    it('should generate temporary secret in development', () => {
      delete process.env.JWT_ACCESS_SECRET;
      process.env.NODE_ENV = 'development';
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(() => new JWTService()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('JWT_ACCESS_SECRET not found, generating temporary secret')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('generateTokens', () => {
    it('should generate valid token pair', async () => {
      const user = { id: 1, email: 'test@example.com', plan: 'free' };
      const deviceInfo = { userAgent: 'test-agent', platform: 'test-platform' };
      const ipAddress = '192.168.1.1';

      const result = await jwtServiceInstance.generateTokens(user, deviceInfo, ipAddress);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn', 900); // 15 minutes

      // Verify tokens can be decoded
      const accessPayload = jwt.decode(result.accessToken) as JWTPayload;
      const refreshPayload = jwt.decode(result.refreshToken) as JWTPayload;

      expect(accessPayload.sub).toBe('1');
      expect(accessPayload.email).toBe('test@example.com');
      expect(accessPayload.role).toBe('free');
      expect(accessPayload.type).toBe('access');

      expect(refreshPayload.sub).toBe('1');
      expect(refreshPayload.type).toBe('refresh');

      // Verify database calls
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
    });

    it('should handle user without plan', async () => {
      const user = { id: 1, email: 'test@example.com' };

      const result = await jwtServiceInstance.generateTokens(user);

      const accessPayload = jwt.decode(result.accessToken) as JWTPayload;
      expect(accessPayload.role).toBe('free');
    });

    it('should generate unique token IDs', async () => {
      const user = { id: 1, email: 'test@example.com' };

      const result1 = await jwtServiceInstance.generateTokens(user);
      const result2 = await jwtServiceInstance.generateTokens(user);

      const payload1 = jwt.decode(result1.accessToken) as JWTPayload;
      const payload2 = jwt.decode(result2.accessToken) as JWTPayload;

      expect(payload1.jti).not.toBe(payload2.jti);
    });
  });

  describe('validateToken', () => {
    it('should validate valid access token', async () => {
      const user = { id: 1, email: 'test@example.com', plan: 'pro' };
      const tokens = await jwtServiceInstance.generateTokens(user);

      // Mock database to return token record
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

      const payload = await jwtServiceInstance.validateToken(tokens.accessToken, 'access');

      expect(payload).toBeTruthy();
      expect(payload?.sub).toBe('1');
      expect(payload?.email).toBe('test@example.com');
      expect(payload?.type).toBe('access');
    });

    it('should reject token with wrong type', async () => {
      const user = { id: 1, email: 'test@example.com' };
      const tokens = await jwtServiceInstance.generateTokens(user);

      const payload = await jwtServiceInstance.validateToken(tokens.accessToken, 'refresh');

      expect(payload).toBeNull();
    });

    it('should reject revoked token', async () => {
      const user = { id: 1, email: 'test@example.com' };
      const tokens = await jwtServiceInstance.generateTokens(user);

      // Mock database to return no token record (revoked)
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      });

      const payload = await jwtServiceInstance.validateToken(tokens.accessToken, 'access');

      expect(payload).toBeNull();
    });

    it('should reject expired token', async () => {
      const user = { id: 1, email: 'test@example.com' };
      
      // Create token with past expiration
      const expiredPayload: JWTPayload = {
        sub: '1',
        email: 'test@example.com',
        role: 'free',
        iat: Math.floor(Date.now() / 1000) - 3600,
        exp: Math.floor(Date.now() / 1000) - 1800, // Expired 30 minutes ago
        jti: 'test-jti',
        type: 'access'
      };

      const expiredToken = jwt.sign(expiredPayload, process.env.JWT_ACCESS_SECRET!);

      // Mock database to return token record
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

      const payload = await jwtServiceInstance.validateToken(expiredToken, 'access');

      expect(payload).toBeNull();
      // Should also revoke the expired token
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should reject malformed token', async () => {
      const payload = await jwtServiceInstance.validateToken('invalid-token', 'access');

      expect(payload).toBeNull();
    });

    it('should reject token with invalid signature', async () => {
      const fakeToken = jwt.sign({ sub: '1' }, 'wrong-secret');

      const payload = await jwtServiceInstance.validateToken(fakeToken, 'access');

      expect(payload).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should refresh valid refresh token', async () => {
      const user = { id: 1, email: 'test@example.com', plan: 'pro' };
      const originalTokens = await jwtServiceInstance.generateTokens(user);

      // Mock validation to return valid payload
      const validateTokenSpy = vi.spyOn(jwtServiceInstance, 'validateToken')
        .mockResolvedValueOnce({
          sub: '1',
          email: 'test@example.com',
          role: 'pro',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
          jti: 'refresh-jti',
          type: 'refresh'
        });

      const revokeTokenSpy = vi.spyOn(jwtServiceInstance, 'revokeToken')
        .mockResolvedValue();

      const generateTokensSpy = vi.spyOn(jwtServiceInstance, 'generateTokens')
        .mockResolvedValue({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 900
        });

      const result = await jwtServiceInstance.refreshToken(originalTokens.refreshToken);

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900
      });

      expect(validateTokenSpy).toHaveBeenCalledWith(originalTokens.refreshToken, 'refresh');
      expect(revokeTokenSpy).toHaveBeenCalledWith('refresh-jti');
      expect(generateTokensSpy).toHaveBeenCalledWith({
        id: 1,
        email: 'test@example.com',
        plan: 'pro'
      });
    });

    it('should reject invalid refresh token', async () => {
      const validateTokenSpy = vi.spyOn(jwtServiceInstance, 'validateToken')
        .mockResolvedValue(null);

      const result = await jwtServiceInstance.refreshToken('invalid-token');

      expect(result).toBeNull();
      expect(validateTokenSpy).toHaveBeenCalledWith('invalid-token', 'refresh');
    });
  });

  describe('revokeToken', () => {
    it('should revoke token by ID', async () => {
      await jwtServiceInstance.revokeToken('test-jti', 'admin');

      expect(mockDb.update).toHaveBeenCalled();
      const updateCall = mockDb.update.mock.calls[0];
      expect(updateCall).toBeDefined();
    });

    it('should revoke token without revokedBy', async () => {
      await jwtServiceInstance.revokeToken('test-jti');

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('blacklistToken', () => {
    it('should blacklist valid token', async () => {
      const user = { id: 1, email: 'test@example.com' };
      const tokens = await jwtServiceInstance.generateTokens(user);

      const revokeTokenSpy = vi.spyOn(jwtServiceInstance, 'revokeToken')
        .mockResolvedValue();

      await jwtServiceInstance.blacklistToken(tokens.accessToken);

      expect(revokeTokenSpy).toHaveBeenCalled();
    });

    it('should handle malformed token gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await jwtServiceInstance.blacklistToken('invalid-token');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to decode token for blacklisting'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all tokens for user', async () => {
      await jwtServiceInstance.revokeAllUserTokens(1, 'admin');

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should cleanup expired tokens', async () => {
      await jwtServiceInstance.cleanupExpiredTokens();

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer header', () => {
      const token = jwtServiceInstance.extractTokenFromHeader('Bearer test-token');
      expect(token).toBe('test-token');
    });

    it('should return null for invalid header', () => {
      expect(jwtServiceInstance.extractTokenFromHeader('Invalid header')).toBeNull();
      expect(jwtServiceInstance.extractTokenFromHeader(undefined)).toBeNull();
      expect(jwtServiceInstance.extractTokenFromHeader('')).toBeNull();
    });
  });

  describe('getUserActiveTokensCount', () => {
    it('should return active token count', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: '3' }])
        })
      });

      const count = await jwtServiceInstance.getUserActiveTokensCount(1);

      expect(count).toBe(3);
    });

    it('should return 0 for no tokens', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      });

      const count = await jwtServiceInstance.getUserActiveTokensCount(1);

      expect(count).toBe(0);
    });
  });

  describe('security properties', () => {
    it('should generate cryptographically secure token IDs', async () => {
      const user = { id: 1, email: 'test@example.com' };
      
      // Generate multiple tokens and check uniqueness
      const tokenIds = new Set();
      for (let i = 0; i < 100; i++) {
        const tokens = await jwtServiceInstance.generateTokens(user);
        const payload = jwt.decode(tokens.accessToken) as JWTPayload;
        tokenIds.add(payload.jti);
      }

      // All token IDs should be unique
      expect(tokenIds.size).toBe(100);
    });

    it('should use proper expiration times', async () => {
      const user = { id: 1, email: 'test@example.com' };
      const tokens = await jwtServiceInstance.generateTokens(user);

      const accessPayload = jwt.decode(tokens.accessToken) as JWTPayload;
      const refreshPayload = jwt.decode(tokens.refreshToken) as JWTPayload;

      const now = Math.floor(Date.now() / 1000);
      
      // Access token should expire in ~15 minutes
      expect(accessPayload.exp - accessPayload.iat).toBe(15 * 60);
      expect(accessPayload.exp).toBeGreaterThan(now);
      expect(accessPayload.exp).toBeLessThan(now + 16 * 60);

      // Refresh token should expire in ~7 days
      expect(refreshPayload.exp - refreshPayload.iat).toBe(7 * 24 * 60 * 60);
      expect(refreshPayload.exp).toBeGreaterThan(now);
    });

    it('should include all required claims', async () => {
      const user = { id: 1, email: 'test@example.com', plan: 'pro' };
      const tokens = await jwtServiceInstance.generateTokens(user);

      const payload = jwt.decode(tokens.accessToken) as JWTPayload;

      expect(payload).toHaveProperty('sub', '1');
      expect(payload).toHaveProperty('email', 'test@example.com');
      expect(payload).toHaveProperty('role', 'pro');
      expect(payload).toHaveProperty('iat');
      expect(payload).toHaveProperty('exp');
      expect(payload).toHaveProperty('jti');
      expect(payload).toHaveProperty('type', 'access');
    });
  });
});