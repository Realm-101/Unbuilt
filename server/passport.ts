import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { authService } from './auth';

// Configure Google OAuth
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use('google', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  },
  async (accessToken: any, refreshToken: any, profile: any, done: any) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new Error('No email found in Google profile'), false);
      }

      // Check if user already exists
      let user = await authService.getUserByEmail(email);
      
      if (user) {
        // Update existing user with Google info if not already set
        if (user.provider === 'local') {
          user = await authService.updateUserProfile(user.id, {
            provider: 'google',
            providerId: profile.id,
            avatar: profile.photos?.[0]?.value || user.avatar,
            name: user.name || profile.displayName,
          });
        }
      } else {
        // Create new user
        user = await authService.createOAuthUser({
          email,
          name: profile.displayName,
          avatar: profile.photos?.[0]?.value,
          provider: 'google',
          providerId: profile.id,
        });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// Configure GitHub OAuth
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use('github', new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "/api/auth/github/callback"
  },
  async (accessToken: any, refreshToken: any, profile: any, done: any) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new Error('No email found in GitHub profile'), false);
      }

      // Check if user already exists
      let user = await authService.getUserByEmail(email);
      
      if (user) {
        // Update existing user with GitHub info if not already set
        if (user.provider === 'local') {
          user = await authService.updateUserProfile(user.id, {
            provider: 'github',
            providerId: profile.id,
            avatar: profile.photos?.[0]?.value || user.avatar,
            name: user.name || profile.displayName || profile.username,
          });
        }
      } else {
        // Create new user
        user = await authService.createOAuthUser({
          email,
          name: profile.displayName || profile.username,
          avatar: profile.photos?.[0]?.value,
          provider: 'github',
          providerId: profile.id,
        });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// Serialize/deserialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await authService.getUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;