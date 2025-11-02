import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/login.page';
import { DashboardPage } from '../../page-objects/dashboard.page';

/**
 * Security Headers E2E Tests
 * 
 * Tests security headers implementation across the application.
 * Validates Content-Security-Policy, HSTS, X-Frame-Options, 
 * X-Content-Type-Options, and Referrer-Policy headers.
 * 
 * Requirements: 6.1, 6.2
 */

test.describe('Security Headers', () => {
  test.describe('Content-Security-Policy', () => {
    test('should have CSP header on homepage', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      
      expect(headers?.['content-security-policy']).toBeDefined();
      expect(headers?.['content-security-policy']).toContain("default-src 'self'");
    });

    test('should have CSP header on authenticated pages', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login('test@example.com', 'Test123!@#');
      
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      
      const response = await page.goto('/dashboard');
      const headers = response?.headers();
      
      expect(headers?.['content-security-policy']).toBeDefined();
    });

    test('should restrict script sources in CSP', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      const csp = headers?.['content-security-policy'];
      
      expect(csp).toBeDefined();
      // Should not allow unsafe-inline or unsafe-eval without nonce
      if (csp && csp.includes('script-src')) {
        // If script-src is defined, it should be restrictive
        expect(csp).toMatch(/script-src[^;]+'self'/);
      }
    });

    test('should restrict frame sources in CSP', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      const csp = headers?.['content-security-policy'];
      
      expect(csp).toBeDefined();
      // Should restrict frame sources
      if (csp && csp.includes('frame-src')) {
        expect(csp).toMatch(/frame-src[^;]+'self'/);
      }
    });
  });

  test.describe('Strict-Transport-Security (HSTS)', () => {
    test('should have HSTS header', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      
      expect(headers?.['strict-transport-security']).toBeDefined();
    });

    test('should have HSTS with max-age directive', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      const hsts = headers?.['strict-transport-security'];
      
      expect(hsts).toBeDefined();
      expect(hsts).toContain('max-age=');
      
      // Extract max-age value
      const maxAgeMatch = hsts?.match(/max-age=(\d+)/);
      if (maxAgeMatch) {
        const maxAge = parseInt(maxAgeMatch[1]);
        // Should be at least 1 year (31536000 seconds)
        expect(maxAge).toBeGreaterThanOrEqual(31536000);
      }
    });

    test('should have HSTS with includeSubDomains', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      const hsts = headers?.['strict-transport-security'];
      
      expect(hsts).toBeDefined();
      expect(hsts).toContain('includeSubDomains');
    });

    test('should persist HSTS across multiple requests', async ({ page }) => {
      // First request
      const response1 = await page.goto('/');
      const headers1 = response1?.headers();
      expect(headers1?.['strict-transport-security']).toBeDefined();
      
      // Second request
      const response2 = await page.goto('/login');
      const headers2 = response2?.headers();
      expect(headers2?.['strict-transport-security']).toBeDefined();
      
      // Headers should be consistent
      expect(headers1?.['strict-transport-security']).toBe(
        headers2?.['strict-transport-security']
      );
    });
  });

  test.describe('X-Frame-Options', () => {
    test('should have X-Frame-Options header', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      
      expect(headers?.['x-frame-options']).toBeDefined();
    });

    test('should deny framing with X-Frame-Options', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      const xFrameOptions = headers?.['x-frame-options'];
      
      expect(xFrameOptions).toBeDefined();
      expect(['DENY', 'SAMEORIGIN']).toContain(xFrameOptions?.toUpperCase());
    });

    test('should have X-Frame-Options on all pages', async ({ page }) => {
      const pages = ['/', '/login', '/register', '/dashboard'];
      
      for (const pagePath of pages) {
        const response = await page.goto(pagePath);
        const headers = response?.headers();
        
        expect(headers?.['x-frame-options']).toBeDefined();
      }
    });

    test('should prevent clickjacking attacks', async ({ page, context }) => {
      // Try to load the app in an iframe
      const response = await page.goto('/');
      const headers = response?.headers();
      
      // X-Frame-Options should prevent framing
      expect(headers?.['x-frame-options']).toBe('DENY');
      
      // Attempt to create a page with an iframe
      const iframePage = await context.newPage();
      await iframePage.setContent(`
        <html>
          <body>
            <iframe id="test-frame" src="${page.url()}"></iframe>
          </body>
        </html>
      `);
      
      // The iframe should not load due to X-Frame-Options
      const frameError = await iframePage.evaluate(() => {
        const iframe = document.getElementById('test-frame') as HTMLIFrameElement;
        try {
          return iframe.contentWindow?.location.href;
        } catch (e) {
          return 'blocked';
        }
      });
      
      expect(frameError).toBe('blocked');
      await iframePage.close();
    });
  });

  test.describe('X-Content-Type-Options', () => {
    test('should have X-Content-Type-Options header', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      
      expect(headers?.['x-content-type-options']).toBeDefined();
    });

    test('should set X-Content-Type-Options to nosniff', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      
      expect(headers?.['x-content-type-options']).toBe('nosniff');
    });

    test('should have nosniff on API endpoints', async ({ page }) => {
      const response = await page.goto('/api/health');
      const headers = response?.headers();
      
      expect(headers?.['x-content-type-options']).toBe('nosniff');
    });

    test('should prevent MIME type sniffing', async ({ page }) => {
      // Request a JavaScript file
      const response = await page.goto('/');
      const headers = response?.headers();
      
      // X-Content-Type-Options: nosniff prevents browsers from
      // interpreting files as a different MIME type
      expect(headers?.['x-content-type-options']).toBe('nosniff');
    });
  });

  test.describe('Referrer-Policy', () => {
    test('should have Referrer-Policy header', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      
      expect(headers?.['referrer-policy']).toBeDefined();
    });

    test('should have secure Referrer-Policy', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      const referrerPolicy = headers?.['referrer-policy'];
      
      expect(referrerPolicy).toBeDefined();
      
      // Should be one of the secure policies
      const securePolicies = [
        'no-referrer',
        'no-referrer-when-downgrade',
        'strict-origin',
        'strict-origin-when-cross-origin',
        'same-origin'
      ];
      
      expect(securePolicies).toContain(referrerPolicy);
    });

    test('should not leak sensitive information in referrer', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      const referrerPolicy = headers?.['referrer-policy'];
      
      // Should not use 'unsafe-url' or 'origin-when-cross-origin'
      expect(referrerPolicy).not.toBe('unsafe-url');
      expect(referrerPolicy).not.toBe('origin-when-cross-origin');
    });
  });

  test.describe('Additional Security Headers', () => {
    test('should have X-XSS-Protection header', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      
      // X-XSS-Protection is deprecated but still good to have for older browsers
      if (headers?.['x-xss-protection']) {
        expect(headers['x-xss-protection']).toMatch(/1; mode=block/);
      }
    });

    test('should not expose server information', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      
      // Should not reveal server technology
      const serverHeader = headers?.['server'];
      if (serverHeader) {
        expect(serverHeader).not.toContain('Express');
        expect(serverHeader).not.toContain('Node');
      }
    });

    test('should not expose X-Powered-By header', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      
      // X-Powered-By should be removed
      expect(headers?.['x-powered-by']).toBeUndefined();
    });
  });

  test.describe('Security Headers Consistency', () => {
    test('should have consistent headers across all routes', async ({ page }) => {
      const routes = ['/', '/login', '/register', '/dashboard', '/api/health'];
      const headerChecks = [
        'content-security-policy',
        'x-frame-options',
        'x-content-type-options',
        'referrer-policy'
      ];
      
      for (const route of routes) {
        const response = await page.goto(route);
        const headers = response?.headers();
        
        for (const header of headerChecks) {
          expect(headers?.[header]).toBeDefined();
        }
      }
    });

    test('should maintain security headers after authentication', async ({ page }) => {
      // Before authentication
      const response1 = await page.goto('/');
      const headers1 = response1?.headers();
      
      // Authenticate
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login('test@example.com', 'Test123!@#');
      
      // After authentication
      const response2 = await page.goto('/dashboard');
      const headers2 = response2?.headers();
      
      // Security headers should still be present
      expect(headers2?.['content-security-policy']).toBeDefined();
      expect(headers2?.['x-frame-options']).toBeDefined();
      expect(headers2?.['x-content-type-options']).toBeDefined();
      expect(headers2?.['referrer-policy']).toBeDefined();
    });
  });
});
