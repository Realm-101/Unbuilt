/**
 * Test Environment Configuration
 * 
 * Defines different test environments (local, CI, staging, production)
 * and their specific configurations.
 */

export type TestEnvironment = 'local' | 'ci' | 'staging' | 'production';

export interface EnvironmentConfig {
  name: TestEnvironment;
  baseURL: string;
  apiURL: string;
  headless: boolean;
  slowMo: number;
  video: boolean;
  screenshot: boolean;
  trace: boolean;
}

export const ENVIRONMENTS: Record<TestEnvironment, EnvironmentConfig> = {
  local: {
    name: 'local',
    baseURL: 'http://localhost:5000',
    apiURL: 'http://localhost:5000/api',
    headless: false,
    slowMo: 0,
    video: false,
    screenshot: true,
    trace: true,
  },
  
  ci: {
    name: 'ci',
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:5000',
    apiURL: process.env.TEST_API_URL || 'http://localhost:5000/api',
    headless: true,
    slowMo: 0,
    video: true,
    screenshot: true,
    trace: true,
  },
  
  staging: {
    name: 'staging',
    baseURL: process.env.STAGING_URL || 'https://staging.unbuilt.one',
    apiURL: process.env.STAGING_API_URL || 'https://staging.unbuilt.one/api',
    headless: true,
    slowMo: 0,
    video: true,
    screenshot: true,
    trace: true,
  },
  
  production: {
    name: 'production',
    baseURL: 'https://unbuilt.one',
    apiURL: 'https://unbuilt.one/api',
    headless: true,
    slowMo: 0,
    video: true,
    screenshot: true,
    trace: true,
  },
};

/**
 * Get the current test environment
 */
export function getTestEnvironment(): EnvironmentConfig {
  const env = (process.env.TEST_ENV || 'local') as TestEnvironment;
  return ENVIRONMENTS[env] || ENVIRONMENTS.local;
}

/**
 * Check if running in CI environment
 */
export function isCI(): boolean {
  return !!process.env.CI || process.env.TEST_ENV === 'ci';
}

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  return process.env.TEST_ENV === 'production';
}
