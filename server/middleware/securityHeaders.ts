import { Request, Response, NextFunction } from 'express';
import { securityConfig } from '../config/securityConfig';
import { securityLogger } from '../services/securityLogger';

export interface SecurityHeadersOptions {
  enableCSP?: boolean;
  enableHSTS?: boolean;
  enableFrameOptions?: boolean;
  enableContentTypeOptions?: boolean;
  enableReferrerPolicy?: boolean;
  enablePermissionsPolicy?: boolean;
  customHeaders?: Record<string, string>;
}

export class SecurityHeadersMiddleware {
  private config = securityConfig.getConfig();
  private headers = securityConfig.getSecurityHeaders();

  constructor(private options: SecurityHeadersOptions = {}) {
    // Default all security headers to enabled
    this.options = {
      enableCSP: true,
      enableHSTS: true,
      enableFrameOptions: true,
      enableContentTypeOptions: true,
      enableReferrerPolicy: true,
      enablePermissionsPolicy: true,
      ...options
    };
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        this.setSecurityHeaders(res);
        this.setCustomHeaders(res);
        
        // Log security header application
        securityLogger.logSecurityEvent(
          'API_ACCESS',
          'security_headers_applied',
          true,
          {
            userId: (req as any).user?.id,
            ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
            metadata: {
              path: req.path,
              method: req.method,
              headers: this.getAppliedHeaders()
            }
          }
        );

        next();
      } catch (error) {
        securityLogger.logSecurityEvent(
          'SECURITY_VIOLATION',
          'security_headers_error',
          false,
          {
            userId: (req as any).user?.id,
            ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
            metadata: {
              path: req.path,
              method: req.method
            }
          },
          error instanceof Error ? error.message : 'Unknown error'
        );
        
        // Continue even if header setting fails
        next();
      }
    };
  }

  private setSecurityHeaders(res: Response): void {
    // Content Security Policy
    if (this.options.enableCSP) {
      res.setHeader('Content-Security-Policy', this.headers.contentSecurityPolicy);
    }

    // Strict Transport Security (HSTS)
    if (this.options.enableHSTS && this.config.security.https.enforce) {
      res.setHeader('Strict-Transport-Security', this.headers.strictTransportSecurity);
    }

    // X-Frame-Options (Clickjacking protection)
    if (this.options.enableFrameOptions) {
      res.setHeader('X-Frame-Options', this.headers.xFrameOptions);
    }

    // X-Content-Type-Options (MIME type sniffing protection)
    if (this.options.enableContentTypeOptions) {
      res.setHeader('X-Content-Type-Options', this.headers.xContentTypeOptions);
    }

    // Referrer Policy
    if (this.options.enableReferrerPolicy) {
      res.setHeader('Referrer-Policy', this.headers.referrerPolicy);
    }

    // Permissions Policy
    if (this.options.enablePermissionsPolicy) {
      res.setHeader('Permissions-Policy', this.headers.permissionsPolicy);
    }

    // Additional security headers
    res.setHeader('X-XSS-Protection', '1; mode=block'); // Legacy XSS protection
    res.setHeader('X-DNS-Prefetch-Control', 'off'); // Disable DNS prefetching
    res.setHeader('X-Download-Options', 'noopen'); // IE download security
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none'); // Adobe Flash/PDF security
    
    // Remove server information
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
  }

  private setCustomHeaders(res: Response): void {
    if (this.options.customHeaders) {
      Object.entries(this.options.customHeaders).forEach(([name, value]) => {
        res.setHeader(name, value);
      });
    }
  }

  private getAppliedHeaders(): string[] {
    const appliedHeaders: string[] = [];
    
    if (this.options.enableCSP) appliedHeaders.push('Content-Security-Policy');
    if (this.options.enableHSTS) appliedHeaders.push('Strict-Transport-Security');
    if (this.options.enableFrameOptions) appliedHeaders.push('X-Frame-Options');
    if (this.options.enableContentTypeOptions) appliedHeaders.push('X-Content-Type-Options');
    if (this.options.enableReferrerPolicy) appliedHeaders.push('Referrer-Policy');
    if (this.options.enablePermissionsPolicy) appliedHeaders.push('Permissions-Policy');
    
    appliedHeaders.push('X-XSS-Protection', 'X-DNS-Prefetch-Control', 'X-Download-Options', 'X-Permitted-Cross-Domain-Policies');
    
    return appliedHeaders;
  }
}

// CSRF Protection Middleware
export class CSRFProtectionMiddleware {
  private config = securityConfig.getConfig();

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip CSRF protection for safe methods
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }

      // Skip CSRF protection for API endpoints with valid JWT
      if (req.path.startsWith('/api/') && req.headers.authorization) {
        return next();
      }

      try {
        const token = this.extractCSRFToken(req);
        const sessionToken = this.getSessionCSRFToken(req);

        if (!token || !sessionToken || token !== sessionToken) {
          securityLogger.logSecurityEvent(
            'SECURITY_VIOLATION',
            'csrf_protection_triggered',
            false,
            {
              userId: (req as any).user?.id,
              ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
              userAgent: req.get('User-Agent') || 'unknown',
              metadata: {
                path: req.path,
                method: req.method,
                hasToken: !!token,
                hasSessionToken: !!sessionToken,
                tokensMatch: token === sessionToken
              }
            }
          );

          return res.status(403).json({
            error: 'CSRF token validation failed',
            code: 'CSRF_TOKEN_INVALID',
            timestamp: new Date().toISOString()
          });
        }

        next();
      } catch (error) {
        securityLogger.logSecurityEvent(
          'SECURITY_VIOLATION',
          'csrf_protection_error',
          false,
          {
            userId: (req as any).user?.id,
            ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
            metadata: {
              path: req.path,
              method: req.method
            }
          },
          error instanceof Error ? error.message : 'Unknown error'
        );

        return res.status(500).json({
          error: 'CSRF protection error',
          code: 'CSRF_PROTECTION_ERROR',
          timestamp: new Date().toISOString()
        });
      }
    };
  }

  private extractCSRFToken(req: Request): string | null {
    // Check header first
    const headerToken = req.get('X-CSRF-Token');
    if (headerToken) return headerToken;

    // Check body
    const bodyToken = req.body?._csrf;
    if (bodyToken) return bodyToken;

    // Check query parameter
    const queryToken = req.query._csrf as string;
    if (queryToken) return queryToken;

    return null;
  }

  private getSessionCSRFToken(req: Request): string | null {
    // Get CSRF token from session
    return (req as any).session?.csrfToken || null;
  }
}

// Factory functions for easy middleware creation
export const createSecurityHeadersMiddleware = (options?: SecurityHeadersOptions) => {
  const middleware = new SecurityHeadersMiddleware(options);
  return middleware.middleware();
};

export const createCSRFProtectionMiddleware = () => {
  const middleware = new CSRFProtectionMiddleware();
  return middleware.middleware();
};

// Default middleware instances
export const securityHeadersMiddleware = createSecurityHeadersMiddleware();
export const csrfProtectionMiddleware = createCSRFProtectionMiddleware();