/**
 * User Test Fixtures
 * 
 * Provides sample user data for testing
 */

export const testUsers = {
  /**
   * Valid free tier user
   */
  freeUser: {
    id: 1,
    email: 'free@example.com',
    password: 'FreeUser123!@#',
    passwordHash: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', // hashed "FreeUser123!@#"
    plan: 'free' as const,
    firstName: 'Free',
    lastName: 'User',
    avatar: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  
  /**
   * Valid pro tier user
   */
  proUser: {
    id: 2,
    email: 'pro@example.com',
    password: 'ProUser123!@#',
    passwordHash: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    plan: 'pro' as const,
    firstName: 'Pro',
    lastName: 'User',
    avatar: 'https://example.com/avatar.jpg',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  
  /**
   * Valid enterprise tier user
   */
  enterpriseUser: {
    id: 3,
    email: 'enterprise@example.com',
    password: 'EnterpriseUser123!@#',
    passwordHash: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    plan: 'enterprise' as const,
    firstName: 'Enterprise',
    lastName: 'User',
    avatar: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  
  /**
   * Admin user
   */
  adminUser: {
    id: 4,
    email: 'admin@example.com',
    password: 'AdminUser123!@#',
    passwordHash: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    plan: 'enterprise' as const,
    role: 'admin' as const,
    firstName: 'Admin',
    lastName: 'User',
    avatar: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  
  /**
   * User with invalid email
   */
  invalidEmail: {
    email: 'not-an-email',
    password: 'ValidPassword123!@#',
  },
  
  /**
   * User with weak password
   */
  weakPassword: {
    email: 'test@example.com',
    password: '123',
  },
  
  /**
   * User with missing fields
   */
  incomplete: {
    email: 'incomplete@example.com',
    // password missing
  },
};

/**
 * Generate a random test user
 */
export function generateTestUser(overrides = {}) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  
  return {
    id: Math.floor(Math.random() * 10000),
    email: `test-${timestamp}-${random}@example.com`,
    password: `Test${random}123!@#`,
    passwordHash: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    plan: 'free' as const,
    firstName: 'Test',
    lastName: 'User',
    avatar: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * User registration payloads
 */
export const registrationPayloads = {
  valid: {
    email: 'newuser@example.com',
    password: 'NewUser123!@#',
    firstName: 'New',
    lastName: 'User',
  },
  
  minimal: {
    email: 'minimal@example.com',
    password: 'Minimal123!@#',
  },
  
  invalidEmail: {
    email: 'not-an-email',
    password: 'ValidPassword123!@#',
  },
  
  weakPassword: {
    email: 'test@example.com',
    password: 'weak',
  },
  
  missingEmail: {
    password: 'ValidPassword123!@#',
  },
  
  missingPassword: {
    email: 'test@example.com',
  },
};

/**
 * User login payloads
 */
export const loginPayloads = {
  valid: {
    email: 'free@example.com',
    password: 'FreeUser123!@#',
  },
  
  invalidEmail: {
    email: 'nonexistent@example.com',
    password: 'SomePassword123!@#',
  },
  
  invalidPassword: {
    email: 'free@example.com',
    password: 'WrongPassword123!@#',
  },
  
  missingEmail: {
    password: 'SomePassword123!@#',
  },
  
  missingPassword: {
    email: 'free@example.com',
  },
};
