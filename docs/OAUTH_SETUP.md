# OAuth Setup Guide

## Google OAuth Setup

1. **Go to Google Cloud Console**: Visit [console.cloud.google.com](https://console.cloud.google.com)

2. **Create a new project** or select existing project

3. **Enable Google+ API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it

4. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Name: "Unbuilt App"
   - Authorized redirect URIs: `http://localhost:5000/api/auth/google/callback` (for development)
   - For production: `https://your-domain.com/api/auth/google/callback`

5. **Add Environment Variables**:
   ```bash
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

## GitHub OAuth Setup

1. **Go to GitHub Settings**: Visit [github.com/settings/developers](https://github.com/settings/developers)

2. **Create OAuth App**:
   - Click "New OAuth App"
   - Application name: "Unbuilt"
   - Homepage URL: `http://localhost:5000` (for development)
   - Authorization callback URL: `http://localhost:5000/api/auth/github/callback`

3. **Get Client ID and Secret**:
   - Copy the Client ID
   - Generate a new client secret

4. **Add Environment Variables**:
   ```bash
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   ```

## Environment Variables

Add these to your `.env` file or environment:

```bash
# Session secret for secure sessions
SESSION_SECRET=your-very-long-random-string-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth  
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## Testing OAuth

1. Start your development server: `npm run dev`
2. Visit `http://localhost:5000/auth/login`
3. Click "Continue with Google" or "Continue with GitHub"
4. Complete the OAuth flow
5. You should be redirected back to your app as a logged-in user

## Production Setup

For production deployment:

1. Update callback URLs in Google/GitHub app settings to use your production domain
2. Ensure `NODE_ENV=production` is set
3. Use secure session secrets
4. Enable HTTPS (required for OAuth in production)

## Troubleshooting

- **"Redirect URI mismatch"**: Check that your callback URLs match exactly in the OAuth provider settings
- **"Application not found"**: Verify your client ID is correct
- **"Invalid client secret"**: Regenerate the client secret and update your environment variables
- **HTTPS required**: Most OAuth providers require HTTPS in production

The OAuth integration will gracefully degrade if credentials are not provided - users can still use email/password authentication.