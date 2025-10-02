import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnvironmentValidator } from './envValidator';

describe('EnvironmentValidator', () => {
  let validator: EnvironmentValidator;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    validator = new EnvironmentValidator();
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateRequired', () => {
    it('should pass validation with all required environment variables set', () => {
      process.env.JWT_ACCESS_SECRET = 'a'.repeat(32);
      process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
      process.env.NODE_ENV = 'development';

      const result = validator.validateRequired();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when JWT secrets are missing in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_ACCESS_SECRET;
      delete process.env.JWT_REFRESH_SECRET;
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test'; // Set valid DB URL

      const result = validator.validateRequired();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.some(e => e.field === 'JWT_ACCESS_SECRET')).toBe(true);
      expect(result.errors.some(e => e.field === 'JWT_REFRESH_SECRET')).toBe(true);
    });

    it('should warn when JWT secrets are missing in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.JWT_ACCESS_SECRET;
      delete process.env.JWT_REFRESH_SECRET;
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test'; // Set valid DB URL

      const result = validator.validateRequired();

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings.some(w => w.field === 'JWT_ACCESS_SECRET')).toBe(true);
      expect(result.warnings.some(w => w.field === 'JWT_REFRESH_SECRET')).toBe(true);
    });

    it('should fail validation when JWT secrets are too short', () => {
      process.env.JWT_ACCESS_SECRET = 'short';
      process.env.JWT_REFRESH_SECRET = 'alsoshort';

      const result = validator.validateRequired();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].message).toContain('at least 32 characters');
      expect(result.errors[1].message).toContain('at least 32 characters');
    });

    it('should fail validation when JWT secrets are identical', () => {
      const sameSecret = 'a'.repeat(32);
      process.env.JWT_ACCESS_SECRET = sameSecret;
      process.env.JWT_REFRESH_SECRET = sameSecret;

      const result = validator.validateRequired();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('JWT_SECRETS');
      expect(result.errors[0].message).toContain('must be different');
    });

    it('should fail validation with invalid database URL', () => {
      process.env.DATABASE_URL = 'invalid-url';

      const result = validator.validateRequired();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'DATABASE_URL')).toBe(true);
    });

    it('should fail validation with non-PostgreSQL database URL', () => {
      process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/test';

      const result = validator.validateRequired();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'DATABASE_URL' && e.message.includes('PostgreSQL'))).toBe(true);
    });
  });

  describe('validateOptional', () => {
    it('should warn about missing optional services', () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.SENDGRID_API_KEY;
      delete process.env.STRIPE_SECRET_KEY;
      delete process.env.XAI_API_KEY;
      delete process.env.PERPLEXITY_API_KEY;

      const result = validator.validateOptional();

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(5);
      expect(result.warnings.some(w => w.field === 'GEMINI_API_KEY')).toBe(true);
      expect(result.warnings.some(w => w.field === 'SENDGRID_API_KEY')).toBe(true);
      expect(result.warnings.some(w => w.field === 'STRIPE_SECRET_KEY')).toBe(true);
      expect(result.warnings.some(w => w.field === 'XAI_API_KEY')).toBe(true);
      expect(result.warnings.some(w => w.field === 'PERPLEXITY_API_KEY')).toBe(true);
    });

    it('should warn when Stripe keys are not paired', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      delete process.env.STRIPE_PUBLISHABLE_KEY;

      const result = validator.validateOptional();

      expect(result.warnings.some(w => w.field === 'STRIPE_KEYS')).toBe(true);
    });

    it('should warn when OAuth provider keys are not paired', () => {
      process.env.GOOGLE_CLIENT_ID = 'google_client_id';
      delete process.env.GOOGLE_CLIENT_SECRET;
      process.env.GITHUB_CLIENT_ID = 'github_client_id';
      delete process.env.GITHUB_CLIENT_SECRET;

      const result = validator.validateOptional();

      expect(result.warnings.some(w => w.field === 'GOOGLE_OAUTH_KEYS')).toBe(true);
      expect(result.warnings.some(w => w.field === 'GITHUB_OAUTH_KEYS')).toBe(true);
    });
  });

  describe('getSecureConfig', () => {
    it('should generate secure config with environment variables', () => {
      process.env.JWT_ACCESS_SECRET = 'a'.repeat(32);
      process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
      process.env.CORS_ORIGIN = 'https://example.com';

      const config = validator.getSecureConfig();

      expect(config.jwt.accessSecret).toBe(process.env.JWT_ACCESS_SECRET);
      expect(config.jwt.refreshSecret).toBe(process.env.JWT_REFRESH_SECRET);
      expect(config.database.url).toBe(process.env.DATABASE_URL);
      expect(config.security.corsOrigin).toBe(process.env.CORS_ORIGIN);
    });

    it('should use defaults when environment variables are missing', () => {
      delete process.env.JWT_ACCESS_EXPIRY;
      delete process.env.JWT_REFRESH_EXPIRY;
      delete process.env.CORS_ORIGIN;

      const config = validator.getSecureConfig();

      expect(config.jwt.accessTokenExpiry).toBe('15m');
      expect(config.jwt.refreshTokenExpiry).toBe('7d');
      expect(config.security.corsOrigin).toBe('http://localhost:5000');
    });
  });

  describe('maskSensitiveValues', () => {
    it('should mask sensitive configuration values', () => {
      const config = {
        jwt: {
          accessSecret: 'very-long-secret-key-that-should-be-masked',
          refreshSecret: 'another-long-secret-key-for-refresh'
        },
        database: {
          url: 'postgresql://user:password@localhost:5432/db'
        },
        services: {
          apiKey: 'sensitive-api-key-value'
        }
      };

      const masked = validator.maskSensitiveValues(config);

      expect(masked.jwt.accessSecret).toMatch(/^very\*\*\*\*sked$/);
      expect(masked.jwt.refreshSecret).toMatch(/^anot\*\*\*\*resh$/);
      expect(masked.database.url).toMatch(/^post\*\*\*\*/);
      expect(masked.services.apiKey).toMatch(/^sens\*\*\*\*alue$/);
    });

    it('should mask short sensitive values completely', () => {
      const config = {
        secret: 'short'
      };

      const masked = validator.maskSensitiveValues(config);

      expect(masked.secret).toBe('****');
    });
  });
});