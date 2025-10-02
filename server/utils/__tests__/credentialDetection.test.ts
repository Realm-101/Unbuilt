import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CredentialDetector } from '../credentialDetection';

describe('CredentialDetector', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('scanContent', () => {
    it('should detect hardcoded passwords', () => {
      const content = `
        const config = {
          password: "hardcoded123",
          apiKey: "secret_key_value"
        };
      `;

      const result = CredentialDetector.scanContent(content, 'test.ts');

      expect(result.hasViolations).toBe(true);
      expect(result.violations).toHaveLength(2);
      expect(result.violations[0].severity).toBe('medium');
      expect(result.violations[1].severity).toBe('high');
    });

    it('should not flag environment variable usage', () => {
      const content = `
        const config = {
          password: process.env.PASSWORD,
          apiKey: \${API_KEY}
        };
      `;

      const result = CredentialDetector.scanContent(content, 'test.ts');

      expect(result.hasViolations).toBe(false);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect test credentials', () => {
      const content = `
        const testUser = {
          email: "test@example.com",
          password: "demo123"
        };
      `;

      const result = CredentialDetector.scanContent(content, 'test.ts');

      expect(result.hasViolations).toBe(true);
      expect(result.violations.some(v => v.match.includes('test@example.com'))).toBe(true);
    });

    it('should detect database connection strings with credentials', () => {
      const content = `
        const dbUrl = "postgresql://user:password@localhost:5432/db";
      `;

      const result = CredentialDetector.scanContent(content, 'test.ts');

      expect(result.hasViolations).toBe(true);
      expect(result.violations[0].severity).toBe('high');
    });

    it('should provide line numbers and context', () => {
      const content = `line 1
line 2
const secret = "hardcoded_secret";
line 4`;

      const result = CredentialDetector.scanContent(content, 'test.ts');

      expect(result.violations[0].line).toBe(3);
      expect(result.violations[0].content).toBe('const secret = "hardcoded_secret";');
      expect(result.violations[0].filename).toBe('test.ts');
    });
  });

  describe('validateEnvironmentVariables', () => {
    it('should detect missing JWT secrets', () => {
      delete process.env.JWT_ACCESS_SECRET;
      delete process.env.JWT_REFRESH_SECRET;

      const result = CredentialDetector.validateEnvironmentVariables();

      expect(result.isSecure).toBe(false);
      expect(result.issues).toHaveLength(3); // JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, COOKIE_SECRET
      expect(result.issues.every(issue => issue.severity === 'high')).toBe(true);
    });

    it('should detect short JWT secrets', () => {
      process.env.JWT_ACCESS_SECRET = 'short';
      process.env.JWT_REFRESH_SECRET = 'also_short';
      process.env.COOKIE_SECRET = 'short_cookie';

      const result = CredentialDetector.validateEnvironmentVariables();

      expect(result.isSecure).toBe(true); // Medium severity doesn't fail security
      expect(result.issues).toHaveLength(3);
      expect(result.issues.every(issue => issue.severity === 'medium')).toBe(true);
    });

    it('should detect demo credentials in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.DEMO_USER_EMAIL = 'demo@example.com';
      process.env.DEMO_USER_PASSWORD = 'demo123';

      const result = CredentialDetector.validateEnvironmentVariables();

      expect(result.isSecure).toBe(false);
      expect(result.issues.some(issue => 
        issue.variable === 'DEMO_USER_*' && issue.severity === 'high'
      )).toBe(true);
    });

    it('should warn about weak demo passwords in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.DEMO_USER_PASSWORD = 'weak';

      const result = CredentialDetector.validateEnvironmentVariables();

      expect(result.warnings).toContain('Demo user password is weak (less than 8 characters)');
    });

    it('should pass with proper configuration', () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_ACCESS_SECRET = 'a'.repeat(32);
      process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
      process.env.COOKIE_SECRET = 'c'.repeat(32);
      delete process.env.DEMO_USER_EMAIL;
      delete process.env.DEMO_USER_PASSWORD;

      const result = CredentialDetector.validateEnvironmentVariables();

      expect(result.isSecure).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const result = CredentialDetector.scanContent('', 'empty.ts');

      expect(result.hasViolations).toBe(false);
      expect(result.violations).toHaveLength(0);
    });

    it('should handle content with no violations', () => {
      const content = `
        const config = {
          apiUrl: "https://api.example.com",
          timeout: 5000
        };
      `;

      const result = CredentialDetector.scanContent(content, 'clean.ts');

      expect(result.hasViolations).toBe(false);
      expect(result.violations).toHaveLength(0);
    });

    it('should generate proper summary', () => {
      const content = `
        const config = {
          password: "test123",
          apiKey: "secret_key",
          token: "access_token"
        };
      `;

      const result = CredentialDetector.scanContent(content, 'test.ts');

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.summary).toContain('potential credential violations');
      expect(result.summary).toContain('high severity');
      expect(result.summary).toContain('medium severity');
    });
  });
});