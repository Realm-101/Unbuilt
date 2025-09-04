import { Request, Response } from 'express';
import passport from 'passport';
import '../passport'; // Import to register strategies
import { authService } from '../auth';

export function googleAuth() {
  return passport.authenticate('google', {
    scope: ['profile', 'email']
  });
}

export function googleCallback() {
  return passport.authenticate('google', { failureRedirect: '/auth/login' });
}

export async function googleCallbackSuccess(req: Request, res: Response) {
  try {
    const user = req.user as any;
    if (!user) {
      return res.redirect('/auth/login?error=oauth_failed');
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

    // Redirect to home page
    res.redirect('/');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('/auth/login?error=oauth_failed');
  }
}

export function githubAuth() {
  return passport.authenticate('github', {
    scope: ['user:email']
  });
}

export function githubCallback() {
  return passport.authenticate('github', { failureRedirect: '/auth/login' });
}

export async function githubCallbackSuccess(req: Request, res: Response) {
  try {
    const user = req.user as any;
    if (!user) {
      return res.redirect('/auth/login?error=oauth_failed');
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

    // Redirect to home page
    res.redirect('/');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('/auth/login?error=oauth_failed');
  }
}