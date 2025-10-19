import { Router } from 'express';
import { db } from '../db';
import { users, passwordHistory } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';

const router = Router();

// In-memory token store (in production, use Redis or database table)
const resetTokens = new Map<string, { userId: number; expires: Date }>();

// Request password reset
const requestResetSchema = z.object({
  email: z.string().email(),
});

router.post('/request', async (req, res) => {
  try {
    const validation = requestResetSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address',
      });
    }

    const { email } = validation.data;

    // Find user
    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.email, email));

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with that email, a reset link has been sent.',
      });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    // Store token
    resetTokens.set(token, { userId: user.id, expires });

    // TODO: Send email with reset link
    // For now, log the token (in production, send via email service)
    console.log(`Password reset token for ${email}: ${token}`);
    console.log(`Reset link: ${process.env.CLIENT_URL || 'http://localhost:5000'}/reset-password?token=${token}`);

    res.json({
      success: true,
      message: 'If an account exists with that email, a reset link has been sent.',
      // Remove this in production - only for development
      ...(process.env.NODE_ENV === 'development' && { token }),
    });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    res.status(500).json({ success: false, error: 'Failed to process request' });
  }
});

// Verify reset token
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const tokenData = resetTokens.get(token);
    if (!tokenData || tokenData.expires < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token',
      });
    }

    res.json({ success: true, valid: true });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ success: false, error: 'Failed to verify token' });
  }
});

// Reset password with token
const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

router.post('/reset', async (req, res) => {
  try {
    const validation = resetPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
        details: validation.error.errors,
      });
    }

    const { token, password } = validation.data;

    // Verify token
    const tokenData = resetTokens.get(token);
    if (!tokenData || tokenData.expires < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token',
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get current password for history
    const [currentUser] = await db
      .select({ password: users.password })
      .from(users)
      .where(eq(users.id, tokenData.userId));

    // Update password
    await db
      .update(users)
      .set({
        password: hashedPassword,
        lastPasswordChange: new Date().toISOString(),
        forcePasswordChange: false,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, tokenData.userId));

    // Save to password history
    if (currentUser?.password) {
      await db.insert(passwordHistory).values({
        userId: tokenData.userId,
        passwordHash: currentUser.password,
        createdAt: new Date().toISOString(),
        replacedAt: new Date().toISOString(),
      });
    }

    // Delete used token
    resetTokens.delete(token);

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
});

// Change password (authenticated)
const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

router.post('/change', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const validation = changePasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
        details: validation.error.errors,
      });
    }

    const { currentPassword, newPassword } = validation.data;

    // Get current user
    const [user] = await db
      .select({ id: users.id, password: users.password })
      .from(users)
      .where(eq(users.id, userId));

    if (!user || !user.password) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect',
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db
      .update(users)
      .set({
        password: hashedPassword,
        lastPasswordChange: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId));

    // Save to password history
    await db.insert(passwordHistory).values({
      userId,
      passwordHash: user.password,
      createdAt: new Date().toISOString(),
      replacedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
});

export default router;
