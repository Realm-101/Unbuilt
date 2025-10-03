/**
 * User-related type definitions
 */

export interface UserProfile {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  plan: 'free' | 'pro' | 'enterprise';
  avatar?: string;
}
