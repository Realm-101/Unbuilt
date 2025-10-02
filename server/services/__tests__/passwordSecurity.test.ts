import { describe, it, expect, beforeEach } from 'vitest';
import { passwordSecurityService, PasswordSecurityService } from '../passwordSecurity';

describe('PasswordSecurityService', () => {
  let service: PasswordSecurityService;

  beforeEach(() => {
    service = new PasswordSecurityService();
  });

  describe('validatePasswordStrength', () => {
    it('should reject passwords that are too short', () => {
      const result = service.validatePasswordStrength('short');
      expect(result.isValid).toBe(false);
      expect(result.feedback).toContain('Password must be at least 8 characters long');
    });

    it('should reject passwords without lowercase letters', () => {
      const result = service.validatePasswordStrength('PASSWORD123!');
      expect(result.isValid).toBe(false);
      expect(result.feedback).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject passwords without uppercase letters', () => {
      const result = service.validatePasswordStrength('password123!');
      expect(result.isValid).toBe(false);
      expect(result.feedback).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject passwords without numbers', () => {
      const result = service.validatePasswordStrength('Password!');
      expect(result.isValid).toBe(false);
      expect(result.feedback).toContain('Password must contain at least one number');
    });

    it('should reject passwords without special characters', () => {
      const result = service.validatePasswordStrength('Password123');
      expect(result.isValid).toBe(false);
      expect(result.feedback).toContain('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
    });

    it('should reject common passwords', () => {
      const result = service.validatePasswordStrength('Password123!');
      // This might pass other requirements but should be rejected if it's in the common list
      // Let's test with a definitely common one
      const commonResult = service.validatePasswordStrength('password');
      expect(commonResult.isValid).toBe(false);
    });

    it('should accept strong passwords', () => {
      const result = service.validatePasswordStrength('MyStr0ng!P@ssw0rd');
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(80);
      expect(result.feedback).toHaveLength(0);
    });

    it('should give higher scores to longer passwords', () => {
      const shortPassword = service.validatePasswordStrength('MyStr0ng!');
      const longPassword = service.validatePasswordStrength('MyVeryL0ng!P@ssw0rd123');
      
      expect(longPassword.score).toBeGreaterThan(shortPassword.score);
    });

    it('should validate all requirements correctly', () => {
      const result = service.validatePasswordStrength('MyStr0ng!P@ssw0rd');
      
      expect(result.requirements.minLength).toBe(true);
      expect(result.requirements.hasLowercase).toBe(true);
      expect(result.requirements.hasUppercase).toBe(true);
      expect(result.requirements.hasNumber).toBe(true);
      expect(result.requirements.hasSpecialChar).toBe(true);
      expect(result.requirements.notCommon).toBe(true);
    });
  });

  describe('hashPassword', () => {
    it('should hash a valid password', async () => {
      const password = 'MyStr0ng!P@ssw0rd';
      const hash = await service.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 characters
    });

    it('should reject weak passwords before hashing', async () => {
      const weakPassword = 'weak';
      
      await expect(service.hashPassword(weakPassword)).rejects.toThrow();
    });

    it('should produce different hashes for the same password', async () => {
      const password = 'MyStr0ng!P@ssw0rd';
      const hash1 = await service.hashPassword(password);
      const hash2 = await service.hashPassword(password);
      
      expect(hash1).not.toBe(hash2); // Due to salt
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct passwords', async () => {
      const password = 'MyStr0ng!P@ssw0rd';
      const hash = await service.hashPassword(password);
      
      const isValid = await service.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect passwords', async () => {
      const password = 'MyStr0ng!P@ssw0rd';
      const wrongPassword = 'WrongP@ssw0rd123';
      const hash = await service.hashPassword(password);
      
      const isValid = await service.verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it('should handle invalid hashes gracefully', async () => {
      const password = 'MyStr0ng!P@ssw0rd';
      const invalidHash = 'invalid-hash';
      
      const isValid = await service.verifyPassword(password, invalidHash);
      expect(isValid).toBe(false);
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate passwords of specified length', () => {
      const password = service.generateSecurePassword(16);
      expect(password.length).toBe(16);
    });

    it('should generate passwords that meet strength requirements', () => {
      const password = service.generateSecurePassword(12);
      const result = service.validatePasswordStrength(password);
      
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(80);
    });

    it('should generate different passwords each time', () => {
      const password1 = service.generateSecurePassword(16);
      const password2 = service.generateSecurePassword(16);
      
      expect(password1).not.toBe(password2);
    });

    it('should include all required character types', () => {
      const password = service.generateSecurePassword(16);
      
      expect(/[a-z]/.test(password)).toBe(true); // lowercase
      expect(/[A-Z]/.test(password)).toBe(true); // uppercase
      expect(/[0-9]/.test(password)).toBe(true); // numbers
      expect(/[^a-zA-Z0-9]/.test(password)).toBe(true); // special chars
    });
  });

  describe('isPasswordExpired', () => {
    it('should return false for recent passwords', () => {
      const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const isExpired = service.isPasswordExpired(recentDate);
      
      expect(isExpired).toBe(false);
    });

    it('should return true for old passwords', () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      const isExpired = service.isPasswordExpired(oldDate);
      
      expect(isExpired).toBe(true);
    });

    it('should handle edge case at exactly 90 days', () => {
      const exactDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // exactly 90 days ago
      const isExpired = service.isPasswordExpired(exactDate);
      
      expect(isExpired).toBe(false); // Should not be expired yet
    });
  });

  describe('validatePasswordChange', () => {
    let currentPasswordHash: string;
    const currentPassword = 'CurrentP@ssw0rd123';
    const previousHashes: string[] = [];

    beforeEach(async () => {
      // Generate a real hash for testing
      currentPasswordHash = await service.hashPassword(currentPassword);
    });

    it('should reject incorrect current password', async () => {
      const result = await service.validatePasswordChange(
        'WrongCurrentPassword',
        'NewStr0ng!P@ssw0rd',
        currentPasswordHash,
        previousHashes
      );
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Current password is incorrect');
    });

    it('should reject weak new passwords', async () => {
      const result = await service.validatePasswordChange(
        currentPassword,
        'weak',
        currentPasswordHash,
        previousHashes
      );
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject new password same as current', async () => {
      const result = await service.validatePasswordChange(
        currentPassword,
        currentPassword,
        currentPasswordHash,
        previousHashes
      );
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('New password must be different from current password');
    });

    it('should accept valid password change', async () => {
      const result = await service.validatePasswordChange(
        currentPassword,
        'NewStr0ng!P@ssw0rd456',
        currentPasswordHash,
        []
      );
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});