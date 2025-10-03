import { envValidator } from './envValidator';

export interface SecurityHeaders {
  contentSecurityPolicy: string;
  strictTransportSecurity: string;
  xFrameOptions: string;
  xContentTypeOptions: string;
  referrerPolicy: string;
  permissionsPolicy: string;
}

export interface DeploymentConfig {
  environment: 'development' | 'production' | 'staging';
  security: {
    headers: SecurityHeaders;
    cookies: {
      secure: boolean;
      httpOnly: boolean;
      sameSite: 'strict' | 'lax' | 'none';
      maxAge: number;
    };
    cors: {
      origin: string | string[];
      credentials: boolean;
      methods: string[];
      allowedHeaders: string[];
    };
    https: {
      enforce: boolean;
      trustProxy: boolean;
    };
  };
  monitoring: {
    enableSecurityLogging: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
}

export class SecurityConfigManager {
  private config: DeploymentConfig;

  constructor() {
    this.config = this.generateSecurityConfig();
  }

  getConfig(): DeploymentConfig {
    return this.config;
  }

  getSecurityHeaders(): SecurityHeaders {
    return this.config.security.headers;
  }

  private generateSecurityConfig(): DeploymentConfig {
    const environment = (process.env.NODE_ENV as any) || 'development';
    const isProduction = environment === 'production';
    const secureConfig = envValidator.getSecureConfig();

    return {
      environment,
      security: {
        headers: this.generateSecurityHeaders(isProduction),
        cookies: {
          secure: isProduction, // Only secure cookies in production
          httpOnly: true,
          sameSite: isProduction ? 'strict' : 'lax',
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        },
        cors: {
          origin: this.parseCorsOrigin(secureConfig.security.corsOrigin),
          credentials: true,
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
          allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            'Accept',
            'Origin',
            'X-CSRF-Token'
          ]
        },
        https: {
          enforce: isProduction,
          trustProxy: true // For reverse proxies like nginx
        }
      },
      monitoring: {
        enableSecurityLogging: true,
        logLevel: isProduction ? 'warn' : 'info'
      }
    };
  }

  private generateSecurityHeaders(isProduction: boolean): SecurityHeaders {
    const baseUrl = process.env.CORS_ORIGIN || 'http://localhost:5000';
    const domain = isProduction ? new URL(baseUrl).hostname : 'localhost';

    return {
      contentSecurityPolicy: this.generateCSP(isProduction, baseUrl),
      strictTransportSecurity: isProduction 
        ? 'max-age=31536000; includeSubDomains; preload'
        : 'max-age=0', // Disable HSTS in development
      xFrameOptions: 'DENY',
      xContentTypeOptions: 'nosniff',
      referrerPolicy: 'strict-origin-when-cross-origin',
      permissionsPolicy: [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
        'accelerometer=()'
      ].join(', ')
    };
  }

  private generateCSP(isProduction: boolean, baseUrl: string): string {
    const policies = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://replit.com", // Allow Stripe and Replit
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' ws: wss: https://api.stripe.com", // Allow Stripe API
      "frame-src https://js.stripe.com", // Allow Stripe iframes
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ];

    if (!isProduction) {
      // Allow development tools in development
      policies[1] = "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://replit.com http://localhost:* ws://localhost:*";
      policies[5] = "connect-src 'self' ws://localhost:* wss://localhost:* http://localhost:* https://api.stripe.com";
    }

    return policies.join('; ');
  }

  private parseCorsOrigin(corsOrigin: string): string | string[] {
    if (corsOrigin.includes(',')) {
      return corsOrigin.split(',').map(origin => origin.trim());
    }
    return corsOrigin;
  }

  validateConfiguration(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate environment
    if (!['development', 'production', 'staging'].includes(this.config.environment)) {
      errors.push(`Invalid environment: ${this.config.environment}`);
    }

    // Validate CORS configuration
    const corsOrigin = this.config.security.cors.origin;
    if (typeof corsOrigin === 'string' && corsOrigin === '*' && this.config.environment === 'production') {
      errors.push('CORS origin cannot be wildcard (*) in production');
    }

    // Validate HTTPS enforcement
    if (this.config.environment === 'production' && !this.config.security.https.enforce) {
      warnings.push('HTTPS enforcement is disabled in production');
    }

    // Validate cookie security
    if (this.config.environment === 'production' && !this.config.security.cookies.secure) {
      errors.push('Secure cookies must be enabled in production');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export const securityConfig = new SecurityConfigManager();