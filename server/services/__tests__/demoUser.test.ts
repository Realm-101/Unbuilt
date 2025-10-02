import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DemoUserService } from '../demoUser';
import { authService } from '../../auth';

// Mock the auth service
vi.mock('../../auth', () => ({
  authService: {
    getUserByEmail: vi.fn(),
    createUser: vi.fn()
  }
}));

// Mock the logger
vi.mock('../../config/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('DemoUserService', () => {
  let demoUserService: DemoUserService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    demoUserService = DemoUserService.getInstance();
    // Reset the internal state
    (demoUserService as any).demoUserCreated = false;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createDemoUserIfNeeded', () => {
    it('should skip creation in production environment', async () => {
      process.env.NODE_ENV = 'production';
      process.env.DEMO_USER_EMAIL = 'demo@example.com';
      process.env.DEMO_USER_PASSWORD = 'secure123';

      await demoUserService.createDemoUserIfNeeded();

      expect(authService.getUserByEmail).not.toHaveBeenCalled();
      expect(authService.createUser).not.toHaveBeenCalled();
    });

    it('should skip creation if environment variables are not set', async () => {
      delete process.env.DEMO_USER_EMAIL;
      delete process.env.DEMO_USER_PASSWORD;

      await demoUserService.createDemoUserIfNeeded();

      expect(authService.getUserByEmail).not.toHaveBeenCalled();
      expect(authService.createUser).not.toHaveBeenCalled();
    });

    it('should skip creation if only email is set', async () => {
      process.env.DEMO_USER_EMAIL = 'demo@example.com';
      delete process.env.DEMO_USER_PASSWORD;

      await demoUserService.createDemoUserIfNeeded();

      expect(authService.getUserByEmail).not.toHaveBeenCalled();
      expect(authService.createUser).not.toHaveBeenCalled();
    });

    it('should skip creation if credentials are invalid', async () => {
      process.env.DEMO_USER_EMAIL = 'invalid-email';
      process.env.DEMO_USER_PASSWORD = 'weak';

      await demoUserService.createDemoUserIfNeeded();

      expect(authService.getUserByEmail).not.toHaveBeenCalled();
      expect(authService.createUser).not.toHaveBeenCalled();
    });

    it('should skip creation if user already exists', async () => {
      process.env.DEMO_USER_EMAIL = 'demo@example.com';
      process.env.DEMO_USER_PASSWORD = 'secure123';

      vi.mocked(authService.getUserByEmail).mockResolvedValue({
        id: 1,
        email: 'demo@example.com',
        name: 'Demo User',
        password: 'hashed',
        provider: 'local',
        plan: 'free',
        isActive: true,
        searchCount: 0,
        lastResetDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      await demoUserService.createDemoUserIfNeeded();

      expect(authService.getUserByEmail).toHaveBeenCalledWith('demo@example.com');
      expect(authService.createUser).not.toHaveBeenCalled();
    });

    it('should create demo user with valid credentials', async () => {
      process.env.DEMO_USER_EMAIL = 'demo@example.com';
      process.env.DEMO_USER_PASSWORD = 'secure123';

      vi.mocked(authService.getUserByEmail).mockResolvedValue(undefined);
      vi.mocked(authService.createUser).mockResolvedValue({
        id: 1,
        email: 'demo@example.com',
        name: 'Demo User',
        password: 'hashed',
        provider: 'local',
        plan: 'free',
        isActive: true,
        searchCount: 0,
        lastResetDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      await demoUserService.createDemoUserIfNeeded();

      expect(authService.getUserByEmail).toHaveBeenCalledWith('demo@example.com');
      expect(authService.createUser).toHaveBeenCalledWith({
        email: 'demo@example.com',
        password: 'secure123',
        name: 'Demo User',
        provider: 'local',
        plan: 'free',
        isActive: true
      });
    });

    it('should handle creation errors gracefully', async () => {
      process.env.DEMO_USER_EMAIL = 'demo@example.com';
      process.env.DEMO_USER_PASSWORD = 'secure123';

      vi.mocked(authService.getUserByEmail).mockResolvedValue(undefined);
      vi.mocked(authService.createUser).mockRejectedValue(new Error('Database error'));

      await expect(demoUserService.createDemoUserIfNeeded()).resolves.not.toThrow();
    });

    it('should only create demo user once', async () => {
      process.env.DEMO_USER_EMAIL = 'demo@example.com';
      process.env.DEMO_USER_PASSWORD = 'secure123';

      vi.mocked(authService.getUserByEmail).mockResolvedValue(undefined);
      vi.mocked(authService.createUser).mockResolvedValue({
        id: 1,
        email: 'demo@example.com',
        name: 'Demo User',
        password: 'hashed',
        provider: 'local',
        plan: 'free',
        isActive: true,
        searchCount: 0,
        lastResetDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      await demoUserService.createDemoUserIfNeeded();
      await demoUserService.createDemoUserIfNeeded();

      expect(authService.createUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('getDemoCredentials', () => {
    it('should return demo credentials from environment', () => {
      process.env.DEMO_USER_EMAIL = 'demo@example.com';
      process.env.DEMO_USER_PASSWORD = 'secure123';

      const credentials = demoUserService.getDemoCredentials();

      expect(credentials).toEqual({
        email: 'demo@example.com',
        password: 'secure123'
      });
    });

    it('should return undefined for missing credentials', () => {
      delete process.env.DEMO_USER_EMAIL;
      delete process.env.DEMO_USER_PASSWORD;

      const credentials = demoUserService.getDemoCredentials();

      expect(credentials).toEqual({
        email: undefined,
        password: undefined
      });
    });
  });

  describe('isDemoUser', () => {
    it('should return true for demo user email', () => {
      process.env.DEMO_USER_EMAIL = 'demo@example.com';

      const result = demoUserService.isDemoUser('demo@example.com');

      expect(result).toBe(true);
    });

    it('should return false for non-demo user email', () => {
      process.env.DEMO_USER_EMAIL = 'demo@example.com';

      const result = demoUserService.isDemoUser('user@example.com');

      expect(result).toBe(false);
    });

    it('should return false when demo email is not configured', () => {
      delete process.env.DEMO_USER_EMAIL;

      const result = demoUserService.isDemoUser('demo@example.com');

      expect(result).toBe(false);
    });
  });

  describe('credential validation', () => {
    it('should validate email format', () => {
      const isValid = (demoUserService as any).isValidDemoCredentials('demo@example.com', 'secure123');
      expect(isValid).toBe(true);

      const isInvalid = (demoUserService as any).isValidDemoCredentials('invalid-email', 'secure123');
      expect(isInvalid).toBe(false);
    });

    it('should validate password strength', () => {
      const isValid = (demoUserService as any).isValidDemoCredentials('demo@example.com', 'secure123');
      expect(isValid).toBe(true);

      const isTooShort = (demoUserService as any).isValidDemoCredentials('demo@example.com', 'short');
      expect(isTooShort).toBe(false);

      const noNumber = (demoUserService as any).isValidDemoCredentials('demo@example.com', 'onlyletters');
      expect(noNumber).toBe(false);

      const noLetter = (demoUserService as any).isValidDemoCredentials('demo@example.com', '12345678');
      expect(noLetter).toBe(false);
    });
  });
});