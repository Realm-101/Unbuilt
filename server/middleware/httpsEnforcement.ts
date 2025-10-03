import { Request, Response, NextFunction } from 'express';
import { securityConfig } from '../config/securityConfig';
import { securityLogger } from '../services/securityLogger';

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
        try {
          await securityLogger.logSecurityEvent(
            'SECURITY_VIOLATION',
            'https_enforcement_error',
            false,
            {
              userId: (req as any).user?.id,
              ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
              userAgent: req.get?.('User-Agent') || 'unknown',
            },
            error instanceof Error ? error.message : 'Unknown error'
          );
        } catch (logError) {
          // Ignore logging errors
        }
        
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
      try {
        // Override res.cookie to apply security settings
        const originalCookie = res.cookie.bind(res);

        res.cookie = (name: string, value: any, options: any = {}) => {
          try {
            const secureOptions = this.getSecureCookieOptions(options);
            return originalCookie(name, value, secureOptions);
          } catch (error) {
            console.error('Error applying secure cookie options:', error);
            // Fallback to original cookie if secure options fail
            return originalCookie(name, value, options);
          }
        };

        next();
      } catch (error) {
        console.error('Error setting up secure cookie middleware:', error);
        // Continue processing even if cookie middleware setup fails
        next();
      }
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
      try {
        // Add security properties to session
        if ((req as any).session) {
          await this.enhanceSessionSecurity(req, res);
        }

        next();
      } catch (error) {
        console.error('Error enhancing session security:', error);
        await securityLogger.logSecurityEvent(
          'SECURITY_VIOLATION',
          'session_security_error',
          false,
          {
            userId: (req as any).user?.id,
            ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
          },
          error instanceof Error ? error.message : 'Unknown error'
        ).catch(logError => {
          console.error('Failed to log session security error:', logError);
        });
        
        // Continue processing even if session security enhancement fails
        next();
      }
    };
  }

  private async enhanceSessionSecurity(req: Request, res: Response): Promise<void> {
    try {
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
          ipAddress: req.ip || req.socket.remoteAddress,
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
    } catch (error) {
      console.error('Error in enhanceSessionSecurity:', error);
      throw error; // Re-throw to be caught by middleware
    }
  }

  private generateCSRFToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }

  private isSecureConnection(req: Request): boolean {
    return req.secure || req.get('X-Forwarded-Proto') === 'https';
  }

  /**
   * Detect potential session hijacking attempts
   * 
   * Session hijacking occurs when an attacker steals a user's session token and
   * uses it from a different location/device. We detect this by monitoring:
   * 
   * 1. IP Address Changes: If the same session is used from different IPs, it may
   *    indicate the session token was stolen. However, legitimate IP changes can
   *    occur (mobile networks, VPNs, etc.), so we log but don't block.
   * 
   * 2. User-Agent Changes: If the browser/device changes mid-session, it's highly
   *    suspicious since users don't typically switch devices without logging in again.
   * 
   * Note: We log these events for security monitoring but don't automatically
   * terminate sessions to avoid false positives. Security teams can review logs
   * and take action if needed.
   */
  private async detectSessionHijacking(req: Request, session: any): Promise<void> {
    try {
      const currentIP = req.ip || req.socket.remoteAddress;
      const currentUserAgent = req.get('User-Agent');
      
      const storedIP = session.security.ipAddress;
      const storedUserAgent = session.security.userAgent;

      // Check for IP address changes
      // Legitimate reasons: Mobile network handoff, VPN connection, proxy changes
      // Suspicious reasons: Session token stolen and used from different location
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
      // This is more suspicious than IP changes since users rarely switch
      // browsers/devices mid-session without logging in again
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
    } catch (error) {
      console.error('Error detecting session hijacking:', error);
      // Don't throw - log and continue to avoid disrupting user experience
    }
  }

  /**
   * Regenerate session ID periodically for security
   * 
   * Session fixation attacks occur when an attacker sets a user's session ID to
   * a known value, then waits for the user to authenticate. To mitigate this:
   * 
   * 1. We regenerate the session ID every 30 minutes
   * 2. This limits the window of opportunity for session fixation attacks
   * 3. Even if an attacker knows an old session ID, it becomes invalid after regeneration
   * 
   * The 30-minute interval balances security with performance:
   * - Short enough to limit attack windows
   * - Long enough to avoid excessive database operations
   * - Aligns with typical user session activity patterns
   * 
   * Note: Session regeneration preserves session data but changes the session ID,
   * so the user remains logged in but with a new, unpredictable session identifier.
   */
  private regenerateSessionIfNeeded(req: Request, session: any): void {
    try {
      const now = new Date();
      
      // Determine when the session was last regenerated
      // Fall back to creation time if never regenerated
      const lastRegeneration = session.security.lastRegeneration 
        ? new Date(session.security.lastRegeneration) 
        : new Date(session.security.createdAt);

      // Regenerate session every 30 minutes
      const regenerationInterval = 30 * 60 * 1000; // 30 minutes in milliseconds
      
      // Check if enough time has passed since last regeneration
      if (now.getTime() - lastRegeneration.getTime() > regenerationInterval) {
        // Regenerate the session ID (preserves session data, changes ID)
        (req as any).session.regenerate((err: any) => {
          if (err) {
            console.error('Error regenerating session:', err);
            return;
          }
          
          // Update the last regeneration timestamp
          session.security.lastRegeneration = now.toISOString();
          
          // Log session regeneration for security audit trail (fire and forget)
          securityLogger.logSecurityEvent(
            'SESSION_CREATED',
            'session_regenerated',
            true,
            {
              userId: session.userId,
              ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
              userAgent: req.get('User-Agent') || 'unknown',
              metadata: {
                reason: 'periodic_regeneration',
                sessionId: session.id
              }
            }
          ).catch(logError => {
            console.error('Failed to log session regeneration:', logError);
          });
        });
      }
    } catch (error) {
      console.error('Error in regenerateSessionIfNeeded:', error);
      // Don't throw - log and continue to avoid disrupting user experience
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