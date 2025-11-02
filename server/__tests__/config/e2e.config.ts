/**
 * E2E Test Configuration
 * 
 * Centralized configuration for E2E tests including:
 * - Test environment settings
 * - Timeout values
 * - Retry policies
 * - Performance thresholds
 * - Accessibility standards
 */

export const E2E_CONFIG = {
  // Base URLs
  baseURL: process.env.TEST_BASE_URL || 'http://localhost:5000',
  apiURL: process.env.TEST_API_URL || 'http://localhost:5000/api',
  
  // Timeouts (in milliseconds)
  timeouts: {
    default: 30000,
    navigation: 30000,
    action: 10000,
    searchCompletion: 180000, // 3 minutes for gap analysis
    apiResponse: 5000,
  },
  
  // Retry configuration
  retries: {
    default: process.env.CI ? 2 : 0,
    flaky: 3,
  },
  
  // Performance thresholds
  performance: {
    pageLoad: 3000, // 3 seconds
    apiResponse: 500, // 500ms for auth endpoints
    searchCompletion: 180000, // 2-3 minutes
    coreWebVitals: {
      lcp: 2500, // Largest Contentful Paint < 2.5s
      fid: 100,  // First Input Delay < 100ms
      cls: 0.1,  // Cumulative Layout Shift < 0.1
    },
  },
  
  // Accessibility configuration
  accessibility: {
    standard: 'WCAG2AA',
    rules: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    colorContrast: {
      normal: 4.5,  // 4.5:1 for normal text
      large: 3.0,   // 3:1 for large text
    },
  },
  
  // Visual regression thresholds
  visual: {
    maxDiffPixels: 100,
    threshold: 0.2, // 20% difference threshold
  },
  
  // Test data
  testData: {
    users: {
      admin: {
        email: process.env.TEST_ADMIN_EMAIL || 'admin@test.unbuilt.local',
        password: process.env.TEST_ADMIN_PASSWORD || 'TestAdmin123!@#',
      },
      user: {
        email: process.env.TEST_USER_EMAIL || 'user@test.unbuilt.local',
        password: process.env.TEST_USER_PASSWORD || 'TestUser123!@#',
      },
    },
  },
  
  // Browser configuration
  browsers: {
    chromium: {
      viewport: { width: 1440, height: 900 },
    },
    firefox: {
      viewport: { width: 1440, height: 900 },
    },
    webkit: {
      viewport: { width: 1440, height: 900 },
    },
    mobile: {
      iphone: { width: 375, height: 667 },
      android: { width: 360, height: 640 },
      tablet: { width: 768, height: 1024 },
    },
  },
  
  // Rate limiting
  rateLimits: {
    login: 5,           // 5 failed attempts
    api: 100,           // 100 requests per window
    search: 5,          // 5 searches per month (free tier)
  },
  
  // Feature flags
  features: {
    freeTier: {
      searchesPerMonth: 5,
      projectsLimit: 3,
      conversationMessages: 10,
    },
    proTier: {
      searchesPerMonth: -1, // Unlimited
      projectsLimit: -1,    // Unlimited
      conversationMessages: -1, // Unlimited
    },
  },
  
  // Security testing
  security: {
    headers: [
      'content-security-policy',
      'strict-transport-security',
      'x-frame-options',
      'x-content-type-options',
      'referrer-policy',
    ],
    testPayloads: {
      sql: ["' OR '1'='1", "1; DROP TABLE users--"],
      xss: ['<script>alert("XSS")</script>', '<img src=x onerror=alert(1)>'],
    },
  },
} as const;

export type E2EConfig = typeof E2E_CONFIG;
