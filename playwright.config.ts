import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Testing Configuration
 * 
 * This configuration supports:
 * - Multi-browser testing (Chromium, Firefox, WebKit)
 * - Mobile device emulation
 * - Parallel test execution
 * - Multiple report formats (HTML, JUnit, JSON)
 * - Automatic screenshot/video capture on failure
 * - Trace generation for debugging
 */

export default defineConfig({
  // Test directory
  testDir: './server/__tests__/e2e',
  
  // Maximum time one test can run
  timeout: 30000,
  
  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  
  // Reporter configuration
  reporter: [
    ['./server/__tests__/reporters/custom.reporter.ts', {
      outputDir: 'server/__tests__/reports/custom'
    }],
    ['html', { 
      outputFolder: 'server/__tests__/reports/html',
      open: 'never'
    }],
    ['junit', { 
      outputFile: 'server/__tests__/reports/junit/results.xml' 
    }],
    ['json', { 
      outputFile: 'server/__tests__/reports/json/results.json' 
    }],
    ['list']
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:5000',
    
    // Collect trace on first retry
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Action timeout
    actionTimeout: 10000,
    
    // Navigation timeout
    navigationTimeout: 30000,
    
    // Ignore HTTPS errors in development
    ignoreHTTPSErrors: true,
  },
  
  // Browser projects
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 }
      }
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1440, height: 900 }
      }
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1440, height: 900 }
      }
    },
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5']
      }
    },
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12']
      }
    },
    {
      name: 'tablet',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 768 }
      }
    }
  ],
  
  // Web server configuration
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'ignore',
    stderr: 'pipe'
  },
  
  // Output directory for test artifacts
  outputDir: 'server/__tests__/reports/test-results',
});
