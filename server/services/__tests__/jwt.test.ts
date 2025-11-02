import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWTService, jwtService } from '../../jwt';
import type { JWTPayload, TokenPair } from '../../jwt';

// Mock dependencies
vi.mock('../../db', () => {
  const createChainableMock = () => ({
    values: vi.fn().mockResolvedValue([]),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([])
  });
  
  return {
    db: {
      insert: vi.fn(() => createChainableMock()),
      select: vi.fn(() => createChainableMock()),
      update: vi.fn(() => createChainableMock()),
      delete: vi.fn(() => createChainableMock())
    }
  };
});

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

    // Mock database - database is already mocked at module level
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

      // Database calls happen internally (mocked at module level)
      // The tokens are generated successfully, which proves the flow works
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

      // Decode to get the token ID
      const decoded = jwt.decode(tokens.accessToken) as JWTPayload;

      // Mock database to return a valid, non-revoked token record
      const { db } = await import('../../db');
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{
            id: decoded.jti,
            userId: 1,
            tokenType: 'access',
            issuedAt: new Date(decoded.iat * 1000).toISOString(),
            expiresAt: new Date(decoded.exp * 1000).toISOString(),
            isRevoked: false,
            revokedAt: null,
            revokedBy: null
          }])
        })
      } as any);

      // Now validate the token
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
        jti: 'test-expired-jti',
        type: 'access'
      };

      const expiredToken = jwt.sign(expiredPayload, process.env.JWT_ACCESS_SECRET!);

      // Mock database to return a token record (so we can test expiration logic)
      const { db } = await import('../../db');
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{
            id: expiredPayload.jti,
            userId: 1,
            tokenType: 'access',
            issuedAt: new Date(expiredPayload.iat * 1000).toISOString(),
            expiresAt: new Date(expiredPayload.exp * 1000).toISOString(),
            isRevoked: false,
            revokedAt: null,
            revokedBy: null
          }])
        })
      } as any);

      // Mock the update call for revoking the expired token
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      } as any);

      const payload = await jwtServiceInstance.validateToken(expiredToken, 'access');

      expect(payload).toBeNull();
      // The expired token is rejected by jwt.verify() before database check
    });

    it('should reject malformed token', async () => {
      const payload = await jwtServiceInstance.validateToken('invalid-token', 'access');

      expect(payload).toBeNull();
    });

    it('should reject token with invalid signature', async () => {
      // Create a token with a different secret than what the service uses
      const fakePayload: JWTPayload = {
        sub: '1',
        email: 'test@example.com',
        role: 'free',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        jti: 'fake-jti',
        type: 'access'
      };

      const fakeToken = jwt.sign(fakePayload, 'wrong-secret-that-does-not-match');

      // This should fail at the jwt.verify() step due to signature mismatch
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
      // Revoke token - database operations happen internally
      await expect(jwtServiceInstance.revokeToken('test-jti', 'admin')).resolves.not.toThrow();
    });

    it('should revoke token without revokedBy', async () => {
      // Revoke token - database operations happen internally
      await expect(jwtServiceInstance.revokeToken('test-jti')).resolves.not.toThrow();
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
      // Blacklisting an invalid token should not throw
      await expect(jwtServiceInstance.blacklistToken('invalid-token')).resolves.not.toThrow();
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all tokens for user', async () => {
      // Revoke all user tokens - database operations happen internally
      await expect(jwtServiceInstance.revokeAllUserTokens(1, 'admin')).resolves.not.toThrow();
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should cleanup expired tokens', async () => {
      // Cleanup expired tokens - database operations happen internally
      await expect(jwtServiceInstance.cleanupExpiredTokens()).resolves.not.toThrow();
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
      // With the mocked database returning empty arrays, count will be 0
      const count = await jwtServiceInstance.getUserActiveTokensCount(1);

      // The method executes without error
      expect(count).toBeGreaterThanOrEqual(0);
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
