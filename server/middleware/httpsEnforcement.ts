import { Request, Response, NextFunction } from 'express';
import { securityConfig } from '../config/securityConfig';
import { securityLogger } from '../services/securityLogger';
import { any } from 'zod';

export interface HTTPSEnforcementOptions {
  trustProxy?: boolean;
  includeSubDomains?: boolean;
  preload?: boolean;
  maxAge?: number;
  excludePaths?: string[];
}

export class HTTPSEnforcementMiddleware {
  private config = securityConfig.getConfig();

  constructor(private options: HTTPSEnforcementOptions = {}) {
    this.options = {
      trustProxy: true,
      includeSubDomains: true,
      preload: false,
      maxAge: 31536000, // 1 year
      excludePaths: ['/health', '/api/health'],
      ...options
    };
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Skip HTTPS enforcement in development
      if (this.config.environment === 'development') {
        return next();
      }

      // Skip for excluded paths
      if (this.options.excludePaths?.includes(req.path)) {
        return next();
      }

      try {
        const isSecure = this.isSecureConnection(req);

        if (!isSecure && this.config.security.https.enforce) {
          await this.logHTTPSRedirect(req);
          return this.redirectToHTTPS(req, res);
        }

        // Set HSTS header for secure connections
        if (isSecure) {
          this.setHSTSHeader(res);
        }

        next();
      } catch (error) {
        await securityLogger.logSecurityEvent(
          'SECURITY_VIOLATION',
          'https_enforcement_error',
          false,
          {
            userId: (req as any).user?.id,
            ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
          },
          error instanceof Error ? error.message : 'Unknown error'
        );
        console.error('HTTPS enforcement error:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          path: req.path,
          method: req.method,
          protocol: req.protocol,
          secure: req.secure
        });

        // Continue processing even if HTTPS enforcement fails
        next();
      }
    };
  }

  private isSecureConnection(req: Request): boolean {
    // Check if connection is secure
    if (req.secure) return true;

    // Check X-Forwarded-Proto header (for reverse proxies)
    if (this.options.trustProxy) {
      const forwardedProto = req.get('X-Forwarded-Proto');
      if (forwardedProto === 'https') return true;
    }

    // Check X-Forwarded-SSL header
    const forwardedSSL = req.get('X-Forwarded-SSL');
    if (forwardedSSL === 'on') return true;

    return false;
  }

  private redirectToHTTPS(req: Request, res: Response): void {
    const host = req.get('Host');
    const url = `https://${host}${req.originalUrl}`;

    res.status(301).redirect(url);
  }

  private setHSTSHeader(res: Response): void {
    const directives = [`max-age=${this.options.maxAge}`];

    if (this.options.includeSubDomains) {
      directives.push('includeSubDomains');
    }

    if (this.options.preload) {
      directives.push('preload');
    }

    res.setHeader('Strict-Transport-Security', directives.join('; '));
  }

  private async logHTTPSRedirect(req: Request): Promise<void> {
    await securityLogger.logSecurityEvent(
      'API_ACCESS',
      'https_redirect',
      true,
      {
        userId: (req as any).user?.id,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        metadata: {
          path: req.path,
          method: req.method,
          protocol: req.protocol,
          host: req.get('Host'),
          originalUrl: req.originalUrl
        }
      }
    );
  }
}

// Secure Cookie Configuration Middleware
export class SecureCookieMiddleware {
  private config = securityConfig.getConfig();

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Override res.cookie to apply security settings
      const originalCookie = res.cookie.bind(res);

      res.cookie = (name: string, value: any, options: any = {}) => {
        const secureOptions = this.getSecureCookieOptions(options);
        return originalCookie(name, value, secureOptions);
      };

      next();
    };
  }

  private getSecureCookieOptions(options: any = {}): any {
    const cookieConfig = this.config.security.cookies;
    const isProduction = this.config.environment === 'production';

    return {
      ...options,
      secure: options.secure !== undefined ? options.secure : cookieConfig.secure,
      httpOnly: options.httpOnly !== undefined ? options.httpOnly : cookieConfig.httpOnly,
      sameSite: options.sameSite !== undefined ? options.sameSite : cookieConfig.sameSite,
      maxAge: options.maxAge !== undefined ? options.maxAge : cookieConfig.maxAge,
      
      // Additional security options
      domain: options.domain || (isProduction ? this.getSecureDomain() : undefined),
      path: options.path || '/',
      
      // Prevent cookie from being accessed by client-side scripts
      ...(cookieConfig.httpOnly && { httpOnly: true })
    };
  }

  private getSecureDomain(): string | undefined {
    const corsOrigin = process.env.CORS_ORIGIN;
    if (corsOrigin && corsOrigin !== '*') {
      try {
        const url = new URL(corsOrigin);
        return url.hostname;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}

// Session Security Middleware
export class SessionSecurityMiddleware {
  private config = securityConfig.getConfig();

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Add security properties to session
      if ((req as any).session) {
        await this.enhanceSessionSecurity(req, res);
      }

      next();
    };
  }

  private async enhanceSessionSecurity(req: Request, res: Response): Promise<void> {
    const session = (req as any).session;

    // Generate CSRF token if not present
    if (!session.csrfToken) {
      session.csrfToken = this.generateCSRFToken();
    }

    // Track session security metadata
    if (!session.security) {
      session.security = {
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        isSecure: this.isSecureConnection(req)
      };
    } else {
      session.security.lastActivity = new Date().toISOString();
      
      // Detect session hijacking attempts
      await this.detectSessionHijacking(req, session);
    }

    // Regenerate session ID periodically
    this.regenerateSessionIfNeeded(req, session);
  }

  private generateCSRFToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }

  private isSecureConnection(req: Request): boolean {
    return req.secure || req.get('X-Forwarded-Proto') === 'https';
  }

  private async detectSessionHijacking(req: Request, session: any): Promise<void> {
    const currentIP = req.ip || req.connection.remoteAddress;
    const currentUserAgent = req.get('User-Agent');
    
    const storedIP = session.security.ipAddress;
    const storedUserAgent = session.security.userAgent;

    // Check for IP address changes (allow for reasonable network changes)
    if (storedIP && currentIP && storedIP !== currentIP) {
      await securityLogger.logSecurityEvent(
        'SUSPICIOUS_LOGIN',
        'session_ip_change',
        true,
        {
          userId: session.userId,
          ipAddress: currentIP,
          userAgent: currentUserAgent || 'unknown',
          metadata: {
            previousIP: storedIP,
            currentIP: currentIP,
            sessionId: session.id
          }
        }
      );
    }

    // Check for User-Agent changes
    if (storedUserAgent && currentUserAgent && storedUserAgent !== currentUserAgent) {
      await securityLogger.logSecurityEvent(
        'SUSPICIOUS_LOGIN',
        'session_user_agent_change',
        true,
        {
          userId: session.userId,
          ipAddress: currentIP || 'unknown',
          userAgent: currentUserAgent || 'unknown',
          metadata: {
            previousUserAgent: storedUserAgent,
            currentUserAgent: currentUserAgent,
            sessionId: session.id
          }
        }
      );
    }
  }

  private regenerateSessionIfNeeded(req: Request, session: any): void {
    const now = new Date();
    const lastRegeneration = session.security.lastRegeneration 
      ? new Date(session.security.lastRegeneration) 
      : new Date(session.security.createdAt);

    // Regenerate session every 30 minutes
    const regenerationInterval = 30 * 60 * 1000; // 30 minutes
    
    if (now.getTime() - lastRegeneration.getTime() > regenerationInterval) {
      (req as any).session.regenerate((err: any) => {
        if (!err) {
          session.security.lastRegeneration = now.toISOString();
          
          // Log session regeneration (fire and forget)
          securityLogger.logSecurityEvent(
            'SESSION_CREATED',
            'session_regenerated',
            true,
            {
              userId: session.userId,
              ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
              userAgent: req.get('User-Agent') || 'unknown',
              metadata: {
                reason: 'periodic_regeneration',
                sessionId: session.id
              }
            }
          ).catch(console.error);
        }
      });
    }
  }
}

// Factory functions
export const createHTTPSEnforcementMiddleware = (options?: HTTPSEnforcementOptions) => {
  const middleware = new HTTPSEnforcementMiddleware(options);
  return middleware.middleware();
};

export const createSecureCookieMiddleware = () => {
  const middleware = new SecureCookieMiddleware();
  return middleware.middleware();
};

export const createSessionSecurityMiddleware = () => {
  const middleware = new SessionSecurityMiddleware();
  return middleware.middleware();
};

// Default middleware instances
export const httpsEnforcementMiddleware = createHTTPSEnforcementMiddleware();
export const secureCookieMiddleware = createSecureCookieMiddleware();
export const sessionSecurityMiddleware = createSessionSecurityMiddleware();