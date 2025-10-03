/**
 * User Type Definitions
 * 
 * This module contains type definitions for user profiles and
 * user-related data used throughout the frontend application.
 */

/**
 * User Profile Interface
 * 
 * Represents a user's profile information displayed in the UI.
 * This is a frontend-specific type that contains only the data
 * needed for display purposes (no sensitive information).
 * 
 * @property {number} id - Unique user identifier
 * @property {string} email - User's email address
 * @property {string} [firstName] - Optional: User's first name
 * @property {string} [lastName] - Optional: User's last name
 * @property {'free' | 'pro' | 'enterprise'} plan - User's subscription plan
 * @property {string} [avatar] - Optional: URL to user's avatar image
 * 
 * @example
 * ```typescript
 * const profile: UserProfile = {
 *   id: 123,
 *   email: 'john.doe@example.com',
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   plan: 'pro',
 *   avatar: 'https://example.com/avatars/123.jpg'
 * };
 * ```
 */
export interface UserProfile {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  plan: 'free' | 'pro' | 'enterprise';
  avatar?: string;
}
