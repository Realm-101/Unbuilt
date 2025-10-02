import { authService } from '../auth';
import { logger } from '../config/logger';

export class DemoUserService {
  private static instance: DemoUserService;
  private demoUserCreated = false;

  static getInstance(): DemoUserService {
    if (!DemoUserService.instance) {
      DemoUserService.instance = new DemoUserService();
    }
    return DemoUserService.instance;
  }

  /**
   * Creates a demo user for development/testing purposes
   * Only creates if environment variables are set and user doesn't exist
   * Prevents demo user creation in production environment
   */
  async createDemoUserIfNeeded(): Promise<void> {
    if (this.demoUserCreated) return;

    // Prevent demo user creation in production
    if (process.env.NODE_ENV === 'production') {
      logger.warn('Demo user creation attempted in production environment - skipping for security');
      this.demoUserCreated = true;
      return;
    }

    const demoEmail = process.env.DEMO_USER_EMAIL;
    const demoPassword = process.env.DEMO_USER_PASSWORD;

    // Only create demo user if both environment variables are set
    if (!demoEmail || !demoPassword) {
      logger.info('Demo user environment variables not set, skipping demo user creation');
      this.demoUserCreated = true;
      return;
    }

    // Validate demo credentials format
    if (!this.isValidDemoCredentials(demoEmail, demoPassword)) {
      logger.warn('Invalid demo user credentials format, skipping demo user creation');
      this.demoUserCreated = true;
      return;
    }

    try {
      // Check if demo user already exists
      const existingUser = await authService.getUserByEmail(demoEmail);
      if (existingUser) {
        logger.info(`Demo user already exists: ${demoEmail}`);
        this.demoUserCreated = true;
        return;
      }

      // Create demo user
      const demoUser = await authService.createUser({
        email: demoEmail,
        password: demoPassword,
        name: 'Demo User',
        provider: 'local',
        plan: 'free',
        isActive: true
      });

      logger.info(`Demo user created successfully: ${demoUser.email}`);
      this.demoUserCreated = true;
    } catch (error) {
      logger.error('Failed to create demo user:', error);
      this.demoUserCreated = true; // Mark as attempted to avoid retries
    }
  }

  /**
   * Validates demo credentials format for security
   */
  private isValidDemoCredentials(email: string, password: string): boolean {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return false;
    }

    // Password validation - minimum 8 characters, at least one letter and one number
    if (password.length < 8) {
      return false;
    }

    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    return hasLetter && hasNumber;
  }

  /**
   * Gets demo user credentials from environment
   */
  getDemoCredentials(): { email?: string; password?: string } {
    return {
      email: process.env.DEMO_USER_EMAIL,
      password: process.env.DEMO_USER_PASSWORD
    };
  }

  /**
   * Checks if given email is the demo user
   */
  isDemoUser(email: string): boolean {
    const demoEmail = process.env.DEMO_USER_EMAIL;
    return demoEmail ? email === demoEmail : false;
  }
}

export const demoUserService = DemoUserService.getInstance();