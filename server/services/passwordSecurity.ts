import bcrypt from 'bcrypt';
import { z } from 'zod';

// Password strength validation schema
export const passwordStrengthSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')
    .refine(
      (password) => !isCommonPassword(password),
      'Password is too common. Please choose a more secure password.'
    )
});

// List of common passwords to reject
const COMMON_PASSWORDS = new Set([
  'password', 'password123', '123456', '123456789', 'qwerty', 'abc123',
  'password1', 'admin', 'letmein', 'welcome', 'monkey', '1234567890',
  'dragon', 'master', 'hello', 'freedom', 'whatever', 'qazwsx',
  'trustno1', 'jordan', 'hunter', 'buster', 'soccer', 'harley',
  'batman', 'andrew', 'tigger', 'sunshine', 'iloveyou', '2000',
  'charlie', 'robert', 'thomas', 'hockey', 'ranger', 'daniel',
  'starwars', 'klaster', '112233', 'george', 'asshole', 'computer',
  'michelle', 'jessica', 'pepper', '1111', 'zxcvbn', '555555',
  '11111111', '131313', 'freedom', '777777', 'pass', 'fuck',
  'maggie', '159753', 'aaaaaa', 'ginger', 'princess', 'joshua',
  'cheese', 'amanda', 'summer', 'love', 'ashley', '6969',
  'nicole', 'chelsea', 'biteme', 'matthew', 'access', 'yankees',
  '987654321', 'dallas', 'austin', 'thunder', 'taylor', 'matrix'
]);

function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password.toLowerCase());
}

export interface PasswordStrengthResult {
  isValid: boolean;
  score: number; // 0-100
  feedback: string[];
  requirements: {
    minLength: boolean;
    hasLowercase: boolean;
    hasUppercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
    notCommon: boolean;
  };
}

export class PasswordSecurityService {
  private static readonly SALT_ROUNDS = 12; // Increased from 10 for better security
  private static readonly MAX_PASSWORD_AGE_DAYS = 90; // Password expiration
  
  /**
   * Hash a password using bcrypt with secure salt rounds
   */
  async hashPassword(password: string): Promise<string> {
    // Validate password strength before hashing
    const strengthResult = this.validatePasswordStrength(password);
    if (!strengthResult.isValid) {
      throw new Error(`Password does not meet security requirements: ${strengthResult.feedback.join(', ')}`);
    }
    
    return bcrypt.hash(password, PasswordSecurityService.SALT_ROUNDS);
  }

  /**
   * Verify a password against its hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Validate password strength and return detailed feedback
   */
  validatePasswordStrength(password: string): PasswordStrengthResult {
    const requirements = {
      minLength: password.length >= 8,
      hasLowercase: /[a-z]/.test(password),
      hasUppercase: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[^a-zA-Z0-9]/.test(password),
      notCommon: !isCommonPassword(password)
    };

    const feedback: string[] = [];
    let score = 0;

    // Check each requirement and provide feedback
    if (!requirements.minLength) {
      feedback.push('Password must be at least 8 characters long');
    } else {
      score += 15;
    }

    if (!requirements.hasLowercase) {
      feedback.push('Password must contain at least one lowercase letter');
    } else {
      score += 15;
    }

    if (!requirements.hasUppercase) {
      feedback.push('Password must contain at least one uppercase letter');
    } else {
      score += 15;
    }

    if (!requirements.hasNumber) {
      feedback.push('Password must contain at least one number');
    } else {
      score += 15;
    }

    if (!requirements.hasSpecialChar) {
      feedback.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
    } else {
      score += 15;
    }

    if (!requirements.notCommon) {
      feedback.push('Password is too common. Please choose a more secure password');
    } else {
      score += 10;
    }

    // Bonus points for length
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 5;

    // Bonus points for character diversity
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= password.length * 0.7) score += 5;

    const isValid = Object.values(requirements).every(req => req);

    return {
      isValid,
      score: Math.min(score, 100),
      feedback,
      requirements
    };
  }

  /**
   * Generate a secure random password
   */
  generateSecurePassword(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    
    let password = '';
    
    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Check if password needs to be changed based on age
   */
  isPasswordExpired(lastPasswordChange: Date): boolean {
    const now = new Date();
    const daysSinceChange = Math.floor((now.getTime() - lastPasswordChange.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceChange > PasswordSecurityService.MAX_PASSWORD_AGE_DAYS;
  }

  /**
   * Validate password change request
   */
  async validatePasswordChange(
    currentPassword: string,
    newPassword: string,
    currentPasswordHash: string,
    previousPasswords: string[] = []
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Verify current password
    const isCurrentPasswordValid = await this.verifyPassword(currentPassword, currentPasswordHash);
    if (!isCurrentPasswordValid) {
      errors.push('Current password is incorrect');
    }

    // Check if new password is the same as current
    const isSameAsCurrent = await this.verifyPassword(newPassword, currentPasswordHash);
    if (isSameAsCurrent) {
      errors.push('New password must be different from current password');
    }

    // Check against previous passwords (prevent reuse)
    for (const prevHash of previousPasswords) {
      const isSameAsPrevious = await this.verifyPassword(newPassword, prevHash);
      if (isSameAsPrevious) {
        errors.push('New password cannot be the same as any of your previous passwords');
        break;
      }
    }

    // Validate new password strength
    const strengthResult = this.validatePasswordStrength(newPassword);
    if (!strengthResult.isValid) {
      errors.push(...strengthResult.feedback);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const passwordSecurityService = new PasswordSecurityService();