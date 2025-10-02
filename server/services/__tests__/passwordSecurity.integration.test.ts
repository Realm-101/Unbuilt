import { describe, it, expect, beforeEach } from 'vitest';
import { passwordSecurityService } from '../passwordSecurity';
import { accountLockoutService } from '../accountLockout';

describe('Password Security Integration', () => {
  describe('Password Strength Validation', () => {
    it('should validate strong passwords correctly', () => {
      const strongPassword = 'MyStr0ng!P@ssw0rd2024';
      const result = passwordSecurityService.validatePasswordStrength(strongPassword);
      
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(80);
      expect(result.requirements.minLength).toBe(true);
      expect(result.requirements.hasLowercase).toBe(true);
      expect(result.requirements.hasUppercase).toBe(true);
      expect(result.requirements.hasNumber).toBe(true);
      expect(result.requirements.hasSpecialChar).toBe(true);
      expect(result.requirements.notCommon).toBe(true);
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        'password',
        '123456',
        'Password',
        'Password123',
        'short',
        'ALLUPPERCASE123!',
        'alllowercase123!',
        'NoNumbers!',
        'NoSpecialChars123'
      ];

      weakPasswords.forEach(password => {
        const result = passwordSecurityService.validatePasswordStrength(password);
        expect(result.isValid).toBe(false);
        expect(result.feedback.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Password Hashing', () => {
    it('should hash and verify passwords correctly', async () => {
      const password = 'TestP@ssw0rd123!';
      
      // Hash the password
      const hash = await passwordSecurityService.hashPassword(password);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      
      // Verify the password
      const isValid = await passwordSecurityService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
      
      // Verify wrong password fails
      const isInvalid = await passwordSecurityService.verifyPassword('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });

    it('should reject weak passwords before hashing', async () => {
      const weakPassword = 'weak';
      
      await expect(passwordSecurityService.hashPassword(weakPassword))
        .rejects.toThrow(/Password does not meet security requirements/);
    });
  });

  describe('Password Generation', () => {
    it('should generate secure passwords', () => {
      const password = passwordSecurityService.generateSecurePassword(16);
      
      expect(password).toBeDefined();
      expect(password.length).toBe(16);
      
      // Verify the generated password meets strength requirements
      const result = passwordSecurityService.validatePasswordStrength(password);
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(80);
    });

    it('should generate different passwords each time', () => {
      const password1 = passwordSecurityService.generateSecurePassword(12);
      const password2 = passwordSecurityService.generateSecurePassword(12);
      
      expect(password1).not.toBe(password2);
    });
  });

  describe('Account Lockout Configuration', () => {
    it('should use default configuration', () => {
      const config = accountLockoutService.getConfig();
      
      expect(config.maxFailedAttempts).toBe(5);
      expect(config.lockoutDurationMinutes).toBe(15);
      expect(config.progressiveLockout).toBe(true);
      expect(config.resetAttemptsAfterMinutes).toBe(60);
    });

    it('should allow configuration updates', () => {
      const originalConfig = accountLockoutService.getConfig();
      
      accountLockoutService.updateConfig({
        maxFailedAttempts: 3,
        lockoutDurationMinutes: 30
      });
      
      const updatedConfig = accountLockoutService.getConfig();
      expect(updatedConfig.maxFailedAttempts).toBe(3);
      expect(updatedConfig.lockoutDurationMinutes).toBe(30);
      expect(updatedConfig.progressiveLockout).toBe(true); // Should keep original
      
      // Reset to original
      accountLockoutService.updateConfig(originalConfig);
    });
  });

  describe('Password Expiration', () => {
    it('should detect expired passwords', () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      const isExpired = passwordSecurityService.isPasswordExpired(oldDate);
      expect(isExpired).toBe(true);
    });

    it('should not flag recent passwords as expired', () => {
      const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const isExpired = passwordSecurityService.isPasswordExpired(recentDate);
      expect(isExpired).toBe(false);
    });
  });
});