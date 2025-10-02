import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from './db';
import { eq, and, lt } from 'drizzle-orm';
import { jwtTokens } from '@shared/schema';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JWTPayload {
  sub: string; // user ID
  email: string;
  role: string;
  iat: number;
  exp: number;
  jti: string; // JWT ID for revocation
  type: 'access' | 'refresh';
}

export interface DeviceInfo {
  userAgent?: string;
  platform?: string;
  browser?: string;
}

export class JWTService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry = '15m';
  private readonly refreshTokenExpiry = '7d';

  constructor() {
    // Generate RSA key pairs for production use
    this.accessTokenSecret = this.getOrGenerateSecret('JWT_ACCESS_SECRET');
    this.refreshTokenSecret = this.getOrGenerateSecret('JWT_REFRESH_SECRET');
  }

  private getOrGenerateSecret(envVar: string): string {
    const secret = process.env[envVar];
    if (!secret) {
      // In production, this should fail. For development, generate a temporary secret
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`${envVar} environment variable is required in production`);
      }
      console.warn(`${envVar} not found, generating temporary secret for development`);
      return crypto.randomBytes(64).toString('hex');
    }
    
    if (secret.length < 32) {
      throw new Error(`${envVar} must be at least 32 characters long`);
    }
    
    return secret;
  }

  async generateTokens(
    user: { id: number; email: string; plan?: string },
    deviceInfo?: DeviceInfo,
    ipAddress?: string
  ): Promise<TokenPair> {
    const now = Math.floor(Date.now() / 1000);
    const accessTokenId = this.generateTokenId();
    const refreshTokenId = this.generateTokenId();

    // Calculate expiration times
    const accessTokenExp = now + (15 * 60); // 15 minutes
    const refreshTokenExp = now + (7 * 24 * 60 * 60); // 7 days

    // Create access token payload
    const accessPayload: JWTPayload = {
      sub: user.id.toString(),
      email: user.email,
      role: user.plan || 'free',
      iat: now,
      exp: accessTokenExp,
      jti: accessTokenId,
      type: 'access'
    };

    // Create refresh token payload
    const refreshPayload: JWTPayload = {
      sub: user.id.toString(),
      email: user.email,
      role: user.plan || 'free',
      iat: now,
      exp: refreshTokenExp,
      jti: refreshTokenId,
      type: 'refresh'
    };

    // Sign tokens
    const accessToken = jwt.sign(accessPayload, this.accessTokenSecret, {
      algorithm: 'HS256' // Using HMAC for now, can upgrade to RS256 later
    });

    const refreshToken = jwt.sign(refreshPayload, this.refreshTokenSecret, {
      algorithm: 'HS256'
    });

    // Store token metadata in database
    await Promise.all([
      db.insert(jwtTokens).values({
        id: accessTokenId,
        userId: user.id,
        tokenType: 'access',
        issuedAt: new Date(now * 1000).toISOString(),
        expiresAt: new Date(accessTokenExp * 1000).toISOString(),
        deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
        ipAddress: ipAddress || null,
      }),
      db.insert(jwtTokens).values({
        id: refreshTokenId,
        userId: user.id,
        tokenType: 'refresh',
        issuedAt: new Date(now * 1000).toISOString(),
        expiresAt: new Date(refreshTokenExp * 1000).toISOString(),
        deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
        ipAddress: ipAddress || null,
      })
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60 // 15 minutes in seconds
    };
  }

  async validateToken(token: string, tokenType: 'access' | 'refresh' = 'access'): Promise<JWTPayload | null> {
    try {
      const secret = tokenType === 'access' ? this.accessTokenSecret : this.refreshTokenSecret;
      const decoded = jwt.verify(token, secret) as JWTPayload;

      // Verify token type matches
      if (decoded.type !== tokenType) {
        return null;
      }

      // Check if token is blacklisted
      const [tokenRecord] = await db
        .select()
        .from(jwtTokens)
        .where(
          and(
            eq(jwtTokens.id, decoded.jti),
            eq(jwtTokens.isRevoked, false)
          )
        );

      if (!tokenRecord) {
        // Token not found or revoked
        return null;
      }

      // Check if token has expired (additional check)
      if (decoded.exp < Math.floor(Date.now() / 1000)) {
        await this.revokeToken(decoded.jti);
        return null;
      }

      return decoded;
    } catch (error) {
      // Token is invalid, expired, or malformed
      return null;
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenPair | null> {
    const payload = await this.validateToken(refreshToken, 'refresh');
    if (!payload) {
      return null;
    }

    // Revoke the old refresh token
    await this.revokeToken(payload.jti);

    // Generate new token pair
    const user = {
      id: parseInt(payload.sub),
      email: payload.email,
      plan: payload.role
    };

    return this.generateTokens(user);
  }

  async revokeToken(tokenId: string, revokedBy?: string): Promise<void> {
    await db
      .update(jwtTokens)
      .set({
        isRevoked: true,
        revokedAt: new Date().toISOString(),
        revokedBy: revokedBy || null
      })
      .where(eq(jwtTokens.id, tokenId));
  }

  async blacklistToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      if (decoded && decoded.jti) {
        await this.revokeToken(decoded.jti);
      }
    } catch (error) {
      // Token is malformed, but we'll still try to blacklist by adding to a separate blacklist
      console.warn('Failed to decode token for blacklisting:', error);
    }
  }

  async revokeAllUserTokens(userId: number, revokedBy?: string): Promise<void> {
    await db
      .update(jwtTokens)
      .set({
        isRevoked: true,
        revokedAt: new Date().toISOString(),
        revokedBy: revokedBy || null
      })
      .where(
        and(
          eq(jwtTokens.userId, userId),
          eq(jwtTokens.isRevoked, false)
        )
      );
  }

  async cleanupExpiredTokens(): Promise<void> {
    const now = new Date().toISOString();
    await db
      .update(jwtTokens)
      .set({
        isRevoked: true,
        revokedAt: now
      })
      .where(
        and(
          lt(jwtTokens.expiresAt, now),
          eq(jwtTokens.isRevoked, false)
        )
      );
  }

  private generateTokenId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  // Utility method to extract token from Authorization header
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  // Get user active sessions count
  async getUserActiveTokensCount(userId: number): Promise<number> {
    const [result] = await db
      .select({ count: jwtTokens.id })
      .from(jwtTokens)
      .where(
        and(
          eq(jwtTokens.userId, userId),
          eq(jwtTokens.isRevoked, false),
          eq(jwtTokens.tokenType, 'refresh') // Count refresh tokens as sessions
        )
      );
    
    return result ? parseInt(result.count as string) : 0;
  }
}

export const jwtService = new JWTService();