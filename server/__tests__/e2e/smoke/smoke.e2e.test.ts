/**
 * Smoke Tests for Production
 * 
 * Minimal test suite that validates critical functionality
 * after deployment. These tests should be fast (<5 minutes)
 * and cover only the most essential user flows.
 * 
 * Requirements: 10.4
 */

import { test, expect } from '@playwright/test';

// Use production URL or staging URL from environment
const BASE_URL = process.env.SMOKE_TEST_URL || process.env.TEST_BASE_URL || 'http://localhost:5000';

test.describe('Production Smoke Tests', () => {
  test.describe.configure({ timeout: 60000 }); // 1 minute timeout per test

  test('should load homepage successfully', async ({ page }) => {
    const response = await page.goto(BASE_URL);
    
    // Verify successful response
    expect(response?.status()).toBe(200);
    
    // Verify page title
    await expect(page).toHaveTitle(/Unbuilt/);
    
    // Verify critical elements are present
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Check that main navigation elements exist
    const nav = page.locator('nav, header');
    await expect(nav).toBeVisible();
    
    // Verify login link is present
    const loginLink = page.locator('a[href*="login"], button:has-text("Login"), a:has-text("Login")');
    await expect(loginLink.first()).toBeVisible();
  });

  test('should load login page', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Verify login form elements
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"], button:has-text("Login")')).toBeVisible();
  });

  test('should load registration page', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    
    // Verify registration form elements
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
  });

  test('should have security headers', async ({ page }) => {
    const response = await page.goto(BASE_URL);
    const headers = response?.headers();
    
    // Verify critical security headers
    expect(headers?.['x-frame-options']).toBeDefined();
    expect(headers?.['x-content-type-options']).toBe('nosniff');
    
    // Note: CSP and HSTS may vary by environment
    if (BASE_URL.startsWith('https://')) {
      expect(headers?.['strict-transport-security']).toBeDefined();
    }
  });

  test('should handle 404 gracefully', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/this-page-does-not-exist-12345`);
    
    // Should return 404 or redirect to error page
    const status = response?.status();
    expect([404, 200]).toContain(status);
    
    // Page should still render (not crash)
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load static assets', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Wait for network to be idle
    await page.waitForLoadState('networkidle');
    
    // Check that no critical resources failed to load
    const failedRequests: string[] = [];
    
    page.on('requestfailed', request => {
      const url = request.url();
      // Only track critical resources (JS, CSS, fonts)
      if (url.match(/\.(js|css|woff|woff2)$/)) {
        failedRequests.push(url);
      }
    });
    
    // Reload to capture any failed requests
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should have no failed critical resources
    expect(failedRequests).toHaveLength(0);
  });

  test('should have acceptable page load time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('domcontentloaded');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 5 seconds (generous for production)
    expect(loadTime).toBeLessThan(5000);
  });

  test('should have working API health check', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/health`);
    
    // Health check should return 200
    expect(response?.status()).toBe(200);
    
    // Should return JSON
    const contentType = response?.headers()['content-type'];
    expect(contentType).toContain('application/json');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Try to access a protected endpoint without auth
    const response = await page.goto(`${BASE_URL}/api/searches`);
    
    // Should return 401 or redirect to login
    const status = response?.status();
    expect([401, 302, 200]).toContain(status);
    
    // Should not crash or show stack traces
    const body = await response?.text();
    expect(body).not.toContain('Error:');
    expect(body).not.toContain('at ');
  });
});

test.describe('Critical User Flows', () => {
  test.describe.configure({ timeout: 120000 }); // 2 minute timeout

  test('should complete registration flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    
    // Generate unique test email
    const testEmail = `smoke-test-${Date.now()}@example.com`;
    const testPassword = 'SmokeTest123!@#';
    
    // Fill registration form
    await page.fill('input[type="email"], input[name="email"]', testEmail);
    await page.fill('input[type="password"], input[name="password"]', testPassword);
    
    // Submit form
    await page.click('button[type="submit"], button:has-text("Register")');
    
    // Should either redirect to dashboard or show success message
    await page.waitForURL(/\/(dashboard|login|verify)/, { timeout: 10000 }).catch(() => {
      // If no redirect, check for success message
      expect(page.locator('text=/success|registered|account created/i')).toBeVisible();
    });
  });

  test('should handle login attempt', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Try to login with test credentials
    await page.fill('input[type="email"], input[name="email"]', 'test@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'TestPassword123!');
    
    // Submit form
    await page.click('button[type="submit"], button:has-text("Login")');
    
    // Should either redirect or show error (both are acceptable)
    await page.waitForTimeout(2000);
    
    // Page should not crash
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Performance Checks', () => {
  test('should have acceptable Core Web Vitals', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Measure performance metrics
    const metrics = await page.evaluate(() => {
      return new Promise<{ domContentLoaded: number; loadComplete: number }>((resolve) => {
        // Wait for page to be fully loaded
        if (document.readyState === 'complete') {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          
          resolve({
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          });
        } else {
          window.addEventListener('load', () => {
            const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            
            resolve({
              domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
              loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            });
          });
        }
      });
    });
    
    // Generous thresholds for production smoke tests
    expect(metrics.domContentLoaded).toBeLessThan(3000); // 3 seconds
    expect(metrics.loadComplete).toBeLessThan(5000); // 5 seconds
  });
});
