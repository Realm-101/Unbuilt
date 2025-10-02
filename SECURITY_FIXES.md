# Security Fixes Implementation Plan

## 1. Replace Demo Authentication System

### Current Issue
The `simpleAuth.ts` system bypasses all security and uses hardcoded demo users.

### Solution
```typescript
// server/auth/jwtAuth.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET;

export async function generateToken(userId: string): Promise<string> {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export async function verifyToken(token: string): Promise<{ userId: string } | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch {
    return null;
  }
}

export const authenticateToken: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const decoded = await verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  (req as any).userId = decoded.userId;
  next();
};
```

## 2. Fix SQL Injection Vulnerabilities

### Replace Raw SQL with Drizzle ORM
```typescript
// Instead of:
await db.execute(sql`INSERT INTO password_reset_tokens (user_id, token, expires_at)
  VALUES (${user.id}, ${resetToken}, ${expiresAt})`);

// Use:
await db.insert(passwordResetTokens).values({
  userId: user.id,
  token: resetToken,
  expiresAt: expiresAt
});
```

## 3. Environment Variable Validation

### Add Startup Validation
```typescript
// server/config/validation.ts
export function validateEnvironment() {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```