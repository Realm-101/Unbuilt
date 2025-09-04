import { Request, Response } from 'express';
import { authService } from '../auth';
import { 
  loginSchema, 
  registerSchema, 
  forgotPasswordSchema,
  resetPasswordSchema,
  type LoginData, 
  type RegisterData,
  type ForgotPasswordData,
  type ResetPasswordData
} from '@shared/schema';
import crypto from 'crypto';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { sendPasswordResetEmail } from '../services/email';

export async function register(req: Request, res: Response) {
  try {
    const data: RegisterData = registerSchema.parse(req.body);
    
    // For local registration, password is required
    if (!data.password) {
      return res.status(400).json({ error: 'Password is required for registration' });
    }
    
    // Check if user already exists
    const existingUser = await authService.getUserByEmail(data.email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Create new user
    const user = await authService.createUser({
      email: data.email,
      password: data.password,
      name: data.name,
    });
    
    // Create session
    const sessionId = await authService.createSession(user.id);
    
    // Set session cookie
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
    
    // Return user data (without sensitive fields)
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, success: true });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: 'Registration failed' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const data: LoginData = loginSchema.parse(req.body);
    
    // Validate user credentials
    const user = await authService.validateUser(data.email, data.password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create session
    const sessionId = await authService.createSession(user.id);
    
    // Set session cookie
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
    
    // Return user data (without sensitive fields)
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, success: true });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ error: 'Login failed' });
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const sessionId = req.cookies.sessionId;
    
    if (sessionId) {
      await authService.deleteSession(sessionId);
    }
    
    res.clearCookie('sessionId');
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
}

export async function getProfile(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const user = req.user as any;
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
}

export async function updateProfile(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { name, preferences } = req.body;
    const user = req.user as any;
    
    // Update user profile
    const updatedUser = await authService.updateUserProfile(user.id, {
      name,
      preferences,
    });
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const data: ForgotPasswordData = forgotPasswordSchema.parse(req.body);
    
    // Check if user exists
    const user = await authService.getUserByEmail(data.email);
    if (!user) {
      // Don't reveal that user doesn't exist for security
      return res.json({ success: true, message: 'Password reset email sent if account exists' });
    }
    
    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour
    
    // Store reset token in database
    await db.execute(sql`INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (${user.id}, ${resetToken}, ${expiresAt})`);
    
    // Send password reset email
    const emailSent = await sendPasswordResetEmail(user.email, resetToken);
    
    if (!emailSent) {
      console.error(`Failed to send password reset email to ${user.email}`);
      // Still return success to avoid revealing user existence
    } else {
      console.log(`Password reset email sent successfully to ${user.email}`);
    }
    
    res.json({ success: true, message: 'Password reset email sent if account exists' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(400).json({ error: 'Failed to process password reset request' });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const data: ResetPasswordData = resetPasswordSchema.parse(req.body);
    
    // Find valid reset token
    const tokenResult = await db.execute(sql`
      SELECT prt.*, u.id as user_id 
      FROM password_reset_tokens prt
      JOIN users u ON prt.user_id = u.id
      WHERE prt.token = ${data.token}
        AND prt.expires_at > NOW() 
        AND prt.used = false
      LIMIT 1`);
    
    if (!tokenResult.rows || tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    const tokenRecord = tokenResult.rows[0];
    
    // Hash new password
    const hashedPassword = await authService.hashPassword(data.password);
    
    // Update user password
    await db.execute(sql`UPDATE users 
      SET password = ${hashedPassword}, updated_at = NOW()
      WHERE id = ${tokenRecord.user_id}`);
    
    // Mark token as used
    await db.execute(sql`UPDATE password_reset_tokens 
      SET used = true 
      WHERE token = ${data.token}`);
    
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(400).json({ error: 'Failed to reset password' });
  }
}