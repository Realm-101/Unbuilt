# Profile and Password Management Features

## Overview
Enhanced the account settings page with comprehensive profile management and password reset functionality.

## Features Implemented

### 1. Profile Management

#### Backend (`server/routes/profile.ts`)
- **GET `/api/profile/me`** - Fetch current user profile
- **PUT `/api/profile/me`** - Update user profile
- Profile fields supported:
  - Display name
  - First name
  - Last name
  - Profile image URL
  - Company (stored in preferences)
- Validation with Zod schemas
- Authentication required

#### Frontend (`client/src/pages/profile-edit.tsx`)
- Complete profile editing form
- Profile picture preview
- Fields:
  - Profile picture (URL input)
  - Display name
  - First name
  - Last name
  - Company
  - Email (read-only)
- Real-time validation
- Success/error notifications
- Responsive design

### 2. Password Management

#### Backend (`server/routes/password-reset.ts`)
- **POST `/api/password-reset/request`** - Request password reset
  - Generates secure reset token
  - Token expires in 1 hour
  - Prevents email enumeration
  - Logs token in development mode
  
- **GET `/api/password-reset/verify/:token`** - Verify reset token validity
  
- **POST `/api/password-reset/reset`** - Reset password with token
  - Validates token
  - Hashes new password with bcrypt
  - Updates password history
  - Invalidates used token
  
- **POST `/api/password-reset/change`** - Change password (authenticated)
  - Requires current password verification
  - Updates password
  - Saves to password history
  - Requires authentication

#### Frontend Pages

**Forgot Password (`client/src/pages/forgot-password.tsx`)**
- Email input form
- Sends reset link request
- Success confirmation screen
- Link to return to login

**Reset Password (`client/src/pages/reset-password.tsx`)**
- Token verification on load
- New password form with confirmation
- Password visibility toggle
- Password requirements display
- Success screen with auto-redirect
- Invalid token handling

**Change Password (`client/src/pages/change-password.tsx`)**
- Current password verification
- New password with confirmation
- Password visibility toggles
- Password requirements
- Requires authentication

### 3. Enhanced Account Page

Updated `client/src/pages/account.tsx` with:
- Profile picture display
- Edit Profile button
- Additional profile fields display (first name, last name, company)
- Security section with:
  - Change Password button
  - Last password change date
- Improved layout and organization

### 4. Routes Configuration

#### Backend Routes
Added to `server/routes.ts`:
```typescript
app.use('/api/profile', profileRouter);
app.use('/api/password-reset', passwordResetRouter);
```

#### Frontend Routes
Added to `client/src/App.tsx`:
- `/profile-edit` - Profile editing page
- `/change-password` - Password change page
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset with token

### 5. Login Page Enhancement

Updated `client/src/pages/auth/login.tsx`:
- Added "Forgot your password?" link
- Links to `/auth/forgot-password`

## Database Schema

Uses existing fields from `shared/schema.ts`:
- `users.firstName`
- `users.lastName`
- `users.profileImageUrl`
- `users.preferences` (for company field)
- `users.lastPasswordChange`
- `passwordHistory` table for password tracking

## Security Features

1. **Password Reset**
   - Secure token generation (32 bytes)
   - 1-hour token expiration
   - Token invalidation after use
   - Email enumeration prevention
   - In-memory token storage (production should use Redis/database)

2. **Password Change**
   - Current password verification required
   - Password history tracking
   - Bcrypt hashing (10 rounds)
   - Authentication required

3. **Profile Updates**
   - Authentication required
   - Input validation with Zod
   - Sanitized inputs

## User Experience

1. **Profile Management**
   - Easy-to-use form interface
   - Profile picture preview
   - Real-time validation
   - Success/error feedback

2. **Password Reset Flow**
   - Clear step-by-step process
   - Email confirmation
   - Token validation
   - Success confirmation
   - Auto-redirect to login

3. **Password Change**
   - Password visibility toggles
   - Requirements display
   - Current password verification
   - Success feedback

## Development Notes

### Token Storage
Currently using in-memory Map for reset tokens. For production:
- Use Redis for distributed systems
- Or add `password_reset_tokens` table to database
- Implement token cleanup job

### Email Service
Password reset emails are logged to console in development. For production:
- Integrate email service (SendGrid, AWS SES, etc.)
- Use email templates
- Add rate limiting

### Future Enhancements
1. Email verification for profile changes
2. Two-factor authentication
3. Password strength meter
4. Profile picture upload (not just URL)
5. Account deletion
6. Privacy settings
7. Notification preferences

## Testing

To test the features:

1. **Profile Edit**
   - Login to account
   - Navigate to `/account`
   - Click "Edit Profile"
   - Update fields and save

2. **Password Change**
   - Login to account
   - Navigate to `/account`
   - Click "Change Password"
   - Enter current and new password

3. **Password Reset**
   - Go to login page
   - Click "Forgot your password?"
   - Enter email
   - Check console for reset token (dev mode)
   - Visit reset link
   - Enter new password

## Files Created/Modified

### Created
- `server/routes/profile.ts`
- `server/routes/password-reset.ts`
- `client/src/pages/profile-edit.tsx`
- `client/src/pages/change-password.tsx`
- `client/src/pages/forgot-password.tsx`
- `client/src/pages/reset-password.tsx`

### Modified
- `server/routes.ts` - Added new route handlers
- `client/src/App.tsx` - Added new routes
- `client/src/pages/account.tsx` - Enhanced with profile display and security section
- `client/src/pages/auth/login.tsx` - Already had forgot password link

## API Endpoints

### Profile
- `GET /api/profile/me` - Get current user profile
- `PUT /api/profile/me` - Update profile

### Password Reset
- `POST /api/password-reset/request` - Request reset link
- `GET /api/password-reset/verify/:token` - Verify token
- `POST /api/password-reset/reset` - Reset with token
- `POST /api/password-reset/change` - Change password (authenticated)

All endpoints include proper error handling, validation, and security measures.
