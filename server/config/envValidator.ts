import crypto from 'crypto';
import { CredentialDetector } from '../utils/credentialDetection';

export interface ValidationResult {
  isValid: boolean;
  errors: ConfigError[];
  warnings: ConfigWarning[];
}

export interface ConfigError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ConfigWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface SecureConfig {
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
  };
  database: {
    url: string;
    maxConnections?: number;
  };
  services: {
    geminiApiKey?: string;
    sendgridApiKey?: string;
    stripeSecretKey?: string;
    stripePublishableKey?: string;
    xaiApiKey?: string;
    perplexityApiKey?: string;
    googleClientId?: string;
    googleClientSecret?: string;
    githubClientId?: string;
    githubClientSecret?: string;
  };
  security: {
    corsOrigin: string;
    cookieSecret: string;
    rateLimitWindow: number;
    rateLimitMax: number;
  };
}

export class EnvironmentValidator {
  private errors: ConfigError[] = [];
  private warnings: ConfigWarning[] = [];

  validateRequired(): ValidationResult {
    this.errors = [];
    this.warnings = [];

    // JWT Configuration
    this.validateJWTSecrets();
    
    // Database Configuration
    this.validateDatabaseConfig();
    
    // Security Configuration
    this.validateSecurityConfig();
    
    // Credential Detection
    this.validateCredentialSecurity();

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  validateOptional(): ValidationResult {
    // Validate optional services
    this.validateOptionalServices();

    return {
      isValid: true, // Optional configs don't fail validation
      errors: [],
      warnings: this.warnings
    };
  }

  getSecureConfig(): SecureConfig {
    return {
      jwt: {
        accessSecret: this.getOrGenerateSecret('JWT_ACCESS_SECRET'),
        refreshSecret: this.getOrGenerateSecret('JWT_REFRESH_SECRET'),
        accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
        refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d'
      },
      database: {
        url: process.env.DATABASE_URL || 'postgresql://localhost:5432/unbuilt_dev',
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10')
      },
      services: {
        geminiApiKey: process.env.GEMINI_API_KEY,
        sendgridApiKey: process.env.SENDGRID_API_KEY,
        stripeSecretKey: process.env.STRIPE_SECRET_KEY,
        stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        xaiApiKey: process.env.XAI_API_KEY,
        perplexityApiKey: process.env.PERPLEXITY_API_KEY,
        googleClientId: process.env.GOOGLE_CLIENT_ID,
        googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
        githubClientId: process.env.GITHUB_CLIENT_ID,
        githubClientSecret: process.env.GITHUB_CLIENT_SECRET
      },
      security: {
        corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5000',
        cookieSecret: this.getOrGenerateSecret('COOKIE_SECRET'),
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100')
      }
    };
  }

  maskSensitiveValues(config: any): any {
    const masked = JSON.parse(JSON.stringify(config));
    
    const sensitiveKeys = [
      'secret', 'key', 'password', 'token', 'url', 'connection'
    ];

    const maskValue = (obj: any, path: string = ''): any => {
      if (typeof obj === 'string') {
        const lowerPath = path.toLowerCase();
        if (sensitiveKeys.some(key => lowerPath.includes(key))) {
          return obj.length > 8 ? `${obj.substring(0, 4)}****${obj.substring(obj.length - 4)}` : '****';
        }
        return obj;
      }
      
      if (typeof obj === 'object' && obj !== null) {
        const result: any = Array.isArray(obj) ? [] : {};
        for (const [key, value] of Object.entries(obj)) {
          const newPath = path ? `${path}.${key}` : key;
          result[key] = maskValue(value, newPath);
        }
        return result;
      }
      
      return obj;
    };

    return maskValue(masked);
  }

  private validateJWTSecrets(): void {
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!accessSecret) {
      if (process.env.NODE_ENV === 'production') {
        this.errors.push({
          field: 'JWT_ACCESS_SECRET',
          message: 'JWT_ACCESS_SECRET is required in production',
          severity: 'error'
        });
      } else {
        this.warnings.push({
          field: 'JWT_ACCESS_SECRET',
          message: 'JWT_ACCESS_SECRET not set, using generated secret for development',
          suggestion: 'Set JWT_ACCESS_SECRET environment variable for consistent tokens'
        });
      }
    } else if (accessSecret.length < 32) {
      this.errors.push({
        field: 'JWT_ACCESS_SECRET',
        message: 'JWT_ACCESS_SECRET must be at least 32 characters long',
        severity: 'error'
      });
    }

    if (!refreshSecret) {
      if (process.env.NODE_ENV === 'production') {
        this.errors.push({
          field: 'JWT_REFRESH_SECRET',
          message: 'JWT_REFRESH_SECRET is required in production',
          severity: 'error'
        });
      } else {
        this.warnings.push({
          field: 'JWT_REFRESH_SECRET',
          message: 'JWT_REFRESH_SECRET not set, using generated secret for development',
          suggestion: 'Set JWT_REFRESH_SECRET environment variable for consistent tokens'
        });
      }
    } else if (refreshSecret.length < 32) {
      this.errors.push({
        field: 'JWT_REFRESH_SECRET',
        message: 'JWT_REFRESH_SECRET must be at least 32 characters long',
        severity: 'error'
      });
    }

    if (accessSecret && refreshSecret && accessSecret === refreshSecret) {
      this.errors.push({
        field: 'JWT_SECRETS',
        message: 'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different',
        severity: 'error'
      });
    }
  }

  private validateDatabaseConfig(): void {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      if (process.env.NODE_ENV === 'production') {
        this.errors.push({
          field: 'DATABASE_URL',
          message: 'DATABASE_URL is required in production',
          severity: 'error'
        });
      } else {
        this.warnings.push({
          field: 'DATABASE_URL',
          message: 'DATABASE_URL not set, using default development database',
          suggestion: 'Set DATABASE_URL for your specific database configuration'
        });
      }
    } else {
      // Basic URL validation
      try {
        const url = new URL(databaseUrl);
        if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
          this.errors.push({
            field: 'DATABASE_URL',
            message: 'DATABASE_URL must be a valid PostgreSQL connection string',
            severity: 'error'
          });
        }
      } catch (error) {
        this.errors.push({
          field: 'DATABASE_URL',
          message: 'DATABASE_URL is not a valid URL',
          severity: 'error'
        });
      }
    }
  }

  private validateSecurityConfig(): void {
    const nodeEnv = process.env.NODE_ENV;
    
    if (!nodeEnv) {
      this.warnings.push({
        field: 'NODE_ENV',
        message: 'NODE_ENV not set, defaulting to development',
        suggestion: 'Set NODE_ENV to "production" for production deployments'
      });
    }

    if (nodeEnv === 'production') {
      const corsOrigin = process.env.CORS_ORIGIN;
      if (!corsOrigin) {
        this.warnings.push({
          field: 'CORS_ORIGIN',
          message: 'CORS_ORIGIN not set in production',
          suggestion: 'Set CORS_ORIGIN to your frontend domain for security'
        });
      }
    }
  }

  private validateOptionalServices(): void {
    const services = [
      { key: 'GEMINI_API_KEY', name: 'Gemini AI' },
      { key: 'SENDGRID_API_KEY', name: 'SendGrid Email' },
      { key: 'STRIPE_SECRET_KEY', name: 'Stripe Payments' },
      { key: 'XAI_API_KEY', name: 'xAI' },
      { key: 'PERPLEXITY_API_KEY', name: 'Perplexity AI' }
    ];

    services.forEach(service => {
      const value = process.env[service.key];
      if (!value) {
        this.warnings.push({
          field: service.key,
          message: `${service.name} service not configured`,
          suggestion: `Set ${service.key} to enable ${service.name} features`
        });
      }
    });

    // Validate Stripe keys are paired
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    const stripePublishable = process.env.STRIPE_PUBLISHABLE_KEY;
    
    if ((stripeSecret && !stripePublishable) || (!stripeSecret && stripePublishable)) {
      this.warnings.push({
        field: 'STRIPE_KEYS',
        message: 'Stripe keys should be configured together',
        suggestion: 'Set both STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY for payment processing'
      });
    }

    // Validate OAuth provider keys are paired
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    if ((googleClientId && !googleClientSecret) || (!googleClientId && googleClientSecret)) {
      this.warnings.push({
        field: 'GOOGLE_OAUTH_KEYS',
        message: 'Google OAuth keys should be configured together',
        suggestion: 'Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET for Google authentication'
      });
    }

    const githubClientId = process.env.GITHUB_CLIENT_ID;
    const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
    
    if ((githubClientId && !githubClientSecret) || (!githubClientId && githubClientSecret)) {
      this.warnings.push({
        field: 'GITHUB_OAUTH_KEYS',
        message: 'GitHub OAuth keys should be configured together',
        suggestion: 'Set both GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET for GitHub authentication'
      });
    }
  }

  private validateCredentialSecurity(): void {
    // Run credential detection on environment variables
    const envValidation = CredentialDetector.validateEnvironmentVariables();
    
    // Convert credential detection issues to validation errors/warnings
    envValidation.issues.forEach(issue => {
      if (issue.severity === 'high') {
        this.errors.push({
          field: issue.variable,
          message: issue.issue,
          severity: 'error'
        });
      } else {
        this.warnings.push({
          field: issue.variable,
          message: issue.issue,
          suggestion: 'Review security configuration'
        });
      }
    });

    // Add warnings
    envValidation.warnings.forEach(warning => {
      this.warnings.push({
        field: 'SECURITY',
        message: warning,
        suggestion: 'Consider strengthening security configuration'
      });
    });

    // Validate demo user configuration
    this.validateDemoUserConfig();
  }

  private validateDemoUserConfig(): void {
    const demoEmail = process.env.DEMO_USER_EMAIL;
    const demoPassword = process.env.DEMO_USER_PASSWORD;
    const nodeEnv = process.env.NODE_ENV;

    // Check if demo credentials are set in production
    if (nodeEnv === 'production' && (demoEmail || demoPassword)) {
      this.errors.push({
        field: 'DEMO_USER_CREDENTIALS',
        message: 'Demo user credentials should not be set in production environment',
        severity: 'error'
      });
    }

    // Validate demo credentials format in development
    if (nodeEnv !== 'production' && demoEmail && demoPassword) {
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(demoEmail)) {
        this.warnings.push({
          field: 'DEMO_USER_EMAIL',
          message: 'Demo user email format is invalid',
          suggestion: 'Use a valid email format for demo user'
        });
      }

      // Password strength validation
      if (demoPassword.length < 8) {
        this.warnings.push({
          field: 'DEMO_USER_PASSWORD',
          message: 'Demo user password is weak (less than 8 characters)',
          suggestion: 'Use a stronger password for demo user'
        });
      }
    }
  }

  private getOrGenerateSecret(envVar: string): string {
    const secret = process.env[envVar];
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`${envVar} environment variable is required in production`);
      }
      // Generate a temporary secret for development
      return crypto.randomBytes(64).toString('hex');
    }
    return secret;
  }
}

export const envValidator = new EnvironmentValidator();