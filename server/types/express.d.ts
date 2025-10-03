/**
 * Express Type Augmentation
 * 
 * Extends Express Request type to include custom properties
 * that are added by various middleware.
 */

import type { User as DbUser } from '@shared/schema';
import type { DeviceInfo } from '../services/sessionManager';

/**
 * Authenticated user type that extends database User with JWT claims
 * Separates database schema from runtime authentication state
 */
export interface AuthenticatedUser extends Omit<DbUser, 'password'> {
  jti: string;  // JWT token ID from token claims
}

declare global {
  namespace Express {
    interface Request {
      /**
       * Authenticated user with JWT token ID
       * Added by JWT authentication middleware
       */
      user?: AuthenticatedUser;
      
      /**
       * JWT token string
       * Added by JWT authentication middleware
       */
      token?: string;
      
      /**
       * JWT token ID (jti claim)
       * Added by JWT authentication middleware
       */
      jti?: string;
      
      /**
       * User role for authorization
       * Added by authorization middleware
       */
      userRole?: string;
      
      /**
       * User permissions array
       * Added by authorization middleware
       */
      userPermissions?: string[];
      
      /**
       * Resource information for ownership checks
       * Added by resource ownership middleware
       */
      resource?: any;
      
      /**
       * Resource owner ID
       * Added by resource ownership middleware
       */
      resourceOwner?: number;
      
      /**
       * Request ID for tracking
       * Added by security monitoring middleware
       */
      requestId?: string;
      
      /**
       * Security context for the request
       * Added by security monitoring middleware
       */
      securityContext?: {
        userId?: number;
        userEmail?: string;
        ipAddress?: string;
        userAgent?: string;
        sessionId?: string;
        requestId?: string;
      };
      
      /**
       * Session information
       * Added by session management middleware
       */
      sessionInfo?: {
        id: string;
        userId: number;
        deviceInfo: DeviceInfo;  // Changed from string to DeviceInfo object
        ipAddress: string;
        issuedAt: Date;
        expiresAt: Date;
        lastActivity: Date;
        isActive: boolean;
      };
    }
  }
}

export {};
