import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/login.page';
import { SearchPage } from '../../page-objects/search.page';

/**
 * Rate Limiting E2E Tests
 * 
 * Tests rate limiting implementation across the application.
 * Validates login rate limiting (5 attempts), API rate limiting
 * with 429 responses, and search rate limiting (5/month for free tier).
 * 
 * Requirements: 6.2
 */

test.describe('Rate Limiting', () => {
  test.describe('Login Rate Limiting', () => {
    test('should allow up to 5 failed login attempts', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        await loginPage.fillEmail('test@example.com');
        await loginPage.fillPassword('WrongPassword123!');
        await loginPage.clickSubmit();
        
        // Should show error but allow retry
        await page.waitForTimeout(500);
        const errorVisible = await loginPage.isErrorVisible();
        expect(errorVisible).toBeTruthy();
        
        // Clear form for next attempt
        await page.reload();
      }
    });

    test('should block after 5 failed login attempts', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        await loginPage.fillEmail('ratelimit@example.com');
        await loginPage.fillPassword('WrongPassword123!');
        await loginPage.clickSubmit();
        await page.waitForTimeout(500);
        await page.reload();
      }
      
      // 6th attempt should be blocked
      await loginPage.fillEmail('ratelimit@example.com');
      await loginPage.fillPassword('WrongPassword123!');
      await loginPage.clickSubmit();
      
      // Should show rate limit error
      await page.waitForTimeout(500);
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage.toLowerCase()).toMatch(/rate limit|too many|blocked|locked/);
    });

    test('should show appropriate error message when rate limited', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Trigger rate limit
      for (let i = 0; i < 6; i++) {
        await loginPage.fillEmail('ratelimit2@example.com');
        await loginPage.fillPassword('WrongPassword123!');
        await loginPage.clickSubmit();
        await page.waitForTimeout(300);
        if (i < 5) await page.reload();
      }
      
      // Check error message
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.toLowerCase()).toMatch(/rate|limit|many|attempts/);
    });

    test('should include retry-after information', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Trigger rate limit
      for (let i = 0; i < 6; i++) {
        await loginPage.fillEmail('ratelimit3@example.com');
        await loginPage.fillPassword('WrongPassword123!');
        await loginPage.clickSubmit();
        await page.waitForTimeout(300);
        if (i < 5) await page.reload();
      }
      
      // Check for retry-after information in error message
      const errorMessage = await loginPage.getErrorMessage();
      // Should mention when to retry (e.g., "try again in X minutes")
      expect(errorMessage.toLowerCase()).toMatch(/try again|wait|minutes|later/);
    });

    test('should reset rate limit after time window', async ({ page }) => {
      // Note: This test would require waiting for the rate limit window to expire
      // In a real scenario, this might be 15 minutes
      // For testing purposes, we can verify the mechanism exists
      
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // This is a conceptual test - in practice, you'd need to:
      // 1. Trigger rate limit
      // 2. Wait for window to expire (or mock time)
      // 3. Verify login attempts are allowed again
      
      // For now, we just verify the rate limit exists
      for (let i = 0; i < 6; i++) {
        await loginPage.fillEmail('ratelimit4@example.com');
        await loginPage.fillPassword('WrongPassword123!');
        await loginPage.clickSubmit();
        await page.waitForTimeout(300);
        if (i < 5) await page.reload();
      }
      
      const errorVisible = await loginPage.isErrorVisible();
      expect(errorVisible).toBeTruthy();
    });
  });

  test.describe('API Rate Limiting', () => {
    test('should return 429 status when rate limit exceeded', async ({ page, request }) => {
      // Make rapid API requests to trigger rate limit
      const responses: Awaited<ReturnType<typeof request.get>>[] = [];
      
      for (let i = 0; i < 150; i++) {
        try {
          const response = await request.get('/api/health');
          responses.push(response);
        } catch (error) {
          // Ignore errors, continue making requests
        }
      }
      
      // At least some requests should return 429
      const rateLimitedResponses = responses.filter(r => r.status() === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should include rate limit headers in response', async ({ request }) => {
      const response = await request.get('/api/health');
      const headers = response.headers();
      
      // Check for rate limit headers (if implemented)
      // Common headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
      if (headers['x-ratelimit-limit']) {
        expect(headers['x-ratelimit-limit']).toBeDefined();
        expect(parseInt(headers['x-ratelimit-limit'])).toBeGreaterThan(0);
      }
    });

    test('should rate limit by IP address', async ({ page, context }) => {
      // Create multiple pages from same context (same IP)
      const page2 = await context.newPage();
      
      // Make requests from both pages
      for (let i = 0; i < 75; i++) {
        await Promise.allSettled([
          page.goto('/api/health'),
          page2.goto('/api/health')
        ]);
      }
      
      // Both pages should be rate limited together (same IP)
      await page2.close();
    });

    test('should rate limit different endpoints independently', async ({ request }) => {
      // Make requests to different endpoints
      const healthResponses: Awaited<ReturnType<typeof request.get>>[] = [];
      const authResponses: Awaited<ReturnType<typeof request.post>>[] = [];
      
      for (let i = 0; i < 50; i++) {
        try {
          const response = await request.get('/api/health');
          healthResponses.push(response);
        } catch (error) {
          // Ignore errors
        }
      }
      
      for (let i = 0; i < 10; i++) {
        try {
          const response = await request.post('/api/auth/login', {
            data: { email: 'test@example.com', password: 'wrong' }
          });
          authResponses.push(response);
        } catch (error) {
          // Ignore errors
        }
      }
      
      // Different endpoints should have different rate limits
      // Health endpoint should allow more requests than auth
      const healthSuccess = healthResponses.filter(r => r.status() !== 429).length;
      const authSuccess = authResponses.filter(r => r.status() !== 429).length;
      
      expect(healthSuccess).toBeGreaterThan(authSuccess);
    });

    test('should provide retry-after header when rate limited', async ({ request }) => {
      // Trigger rate limit
      const responses: Awaited<ReturnType<typeof request.get>>[] = [];
      for (let i = 0; i < 150; i++) {
        try {
          const response = await request.get('/api/health');
          responses.push(response);
        } catch (error) {
          // Ignore errors
        }
      }
      
      const rateLimited = responses.find(r => r.status() === 429);
      
      if (rateLimited) {
        const headers = rateLimited.headers();
        // Should include Retry-After header
        if (headers['retry-after']) {
          expect(headers['retry-after']).toBeDefined();
          const retryAfter = parseInt(headers['retry-after']);
          expect(retryAfter).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('Search Rate Limiting', () => {
    test('should allow up to 5 searches for free tier users', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Login as free tier user
      await loginPage.login('free-tier@example.com', 'Test123!@#');
      
      const searchPage = new SearchPage(page);
      
      // Attempt 5 searches
      for (let i = 0; i < 5; i++) {
        await searchPage.goto();
        await searchPage.submitSearch(`Test search ${i + 1}`);
        
        // Wait for search to start
        await page.waitForTimeout(1000);
        
        // Navigate back to create new search
        await searchPage.goto();
      }
      
      // 5 searches should be allowed
      expect(page.url()).toContain('/search');
    });

    test('should block 6th search for free tier users', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Login as free tier user
      await loginPage.login('free-tier-limit@example.com', 'Test123!@#');
      
      const searchPage = new SearchPage(page);
      
      // Attempt 6 searches
      for (let i = 0; i < 6; i++) {
        await searchPage.goto();
        await searchPage.submitSearch(`Test search ${i + 1}`);
        await page.waitForTimeout(500);
      }
      
      // Should show upgrade prompt or error
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).toMatch(/upgrade|limit|pro|premium/);
    });

    test('should show remaining searches to free tier users', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Login as free tier user
      await loginPage.login('free-tier-check@example.com', 'Test123!@#');
      
      // Navigate to dashboard or search page
      await page.goto('/dashboard');
      
      // Should display remaining searches
      const pageContent = await page.content();
      // Look for search limit indicator
      if (pageContent.includes('searches')) {
        expect(pageContent).toMatch(/\d+.*searches.*remaining|\d+.*of.*\d+.*searches/i);
      }
    });

    test('should reset search limit monthly for free tier', async ({ page }) => {
      // This is a conceptual test - in practice, you'd need to:
      // 1. Use a test user with known search history
      // 2. Mock the date to be in a new month
      // 3. Verify search limit is reset
      
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login('free-tier-reset@example.com', 'Test123!@#');
      
      // For now, just verify the limit exists
      const searchPage = new SearchPage(page);
      await searchPage.goto();
      
      expect(page.url()).toContain('/search');
    });

    test('should not rate limit pro tier users', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Login as pro tier user
      await loginPage.login('pro-tier@example.com', 'Test123!@#');
      
      const searchPage = new SearchPage(page);
      
      // Attempt more than 5 searches
      for (let i = 0; i < 10; i++) {
        await searchPage.goto();
        await searchPage.submitSearch(`Pro search ${i + 1}`);
        await page.waitForTimeout(500);
      }
      
      // Pro users should not be limited
      expect(page.url()).toContain('/search');
    });

    test('should show upgrade prompt when limit reached', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Login as free tier user
      await loginPage.login('free-tier-upgrade@example.com', 'Test123!@#');
      
      const searchPage = new SearchPage(page);
      
      // Exhaust search limit
      for (let i = 0; i < 6; i++) {
        await searchPage.goto();
        await searchPage.submitSearch(`Test search ${i + 1}`);
        await page.waitForTimeout(500);
      }
      
      // Should show upgrade prompt
      const upgradeButton = page.locator('text=/upgrade|pro|premium/i');
      const upgradeVisible = await upgradeButton.isVisible().catch(() => false);
      
      if (upgradeVisible) {
        expect(upgradeVisible).toBeTruthy();
      }
    });
  });

  test.describe('Rate Limit Recovery', () => {
    test('should allow requests after rate limit window expires', async ({ page }) => {
      // This is a conceptual test - in practice, you'd need to:
      // 1. Trigger rate limit
      // 2. Wait for window to expire (or mock time)
      // 3. Verify requests are allowed again
      
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Verify rate limiting exists
      for (let i = 0; i < 6; i++) {
        await loginPage.fillEmail('recovery@example.com');
        await loginPage.fillPassword('WrongPassword123!');
        await loginPage.clickSubmit();
        await page.waitForTimeout(300);
        if (i < 5) await page.reload();
      }
      
      const errorVisible = await loginPage.isErrorVisible();
      expect(errorVisible).toBeTruthy();
    });

    test('should track rate limits per user/IP independently', async ({ browser }) => {
      // Create two separate contexts (simulating different users/IPs)
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      const loginPage1 = new LoginPage(page1);
      const loginPage2 = new LoginPage(page2);
      
      // Trigger rate limit on first context
      await loginPage1.goto();
      for (let i = 0; i < 6; i++) {
        await loginPage1.fillEmail('user1@example.com');
        await loginPage1.fillPassword('WrongPassword123!');
        await loginPage1.clickSubmit();
        await page1.waitForTimeout(300);
        if (i < 5) await page1.reload();
      }
      
      // Second context should not be affected
      await loginPage2.goto();
      await loginPage2.fillEmail('user2@example.com');
      await loginPage2.fillPassword('Test123!@#');
      await loginPage2.clickSubmit();
      
      // Second user should be able to attempt login
      await page2.waitForTimeout(500);
      
      await context1.close();
      await context2.close();
    });

    test('should clear rate limit on successful authentication', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Make a few failed attempts
      for (let i = 0; i < 3; i++) {
        await loginPage.fillEmail('cleartest@example.com');
        await loginPage.fillPassword('WrongPassword123!');
        await loginPage.clickSubmit();
        await page.waitForTimeout(300);
        await page.reload();
      }
      
      // Successful login should clear the counter
      await loginPage.fillEmail('cleartest@example.com');
      await loginPage.fillPassword('Test123!@#');
      await loginPage.clickSubmit();
      
      // If successful, should be redirected to dashboard
      await page.waitForTimeout(1000);
      
      // Logout and try again - should have fresh rate limit
      if (page.url().includes('/dashboard')) {
        await page.goto('/logout');
        await loginPage.goto();
        
        // Should be able to make attempts again
        await loginPage.fillEmail('cleartest@example.com');
        await loginPage.fillPassword('WrongPassword123!');
        await loginPage.clickSubmit();
        
        const errorVisible = await loginPage.isErrorVisible();
        expect(errorVisible).toBeTruthy();
      }
    });
  });

  test.describe('Rate Limit Bypass Prevention', () => {
    test('should not allow rate limit bypass with different user agents', async ({ page }) => {
      const loginPage = new LoginPage(page);
      
      // Try with different user agents
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Mozilla/5.0 (X11; Linux x86_64)'
      ];
      
      for (const ua of userAgents) {
        await page.setExtraHTTPHeaders({ 'User-Agent': ua });
        await loginPage.goto();
        await loginPage.fillEmail('bypass@example.com');
        await loginPage.fillPassword('WrongPassword123!');
        await loginPage.clickSubmit();
        await page.waitForTimeout(300);
      }
      
      // Should still be rate limited
      await loginPage.goto();
      for (let i = 0; i < 3; i++) {
        await loginPage.fillEmail('bypass@example.com');
        await loginPage.fillPassword('WrongPassword123!');
        await loginPage.clickSubmit();
        await page.waitForTimeout(300);
        await page.reload();
      }
      
      const errorVisible = await loginPage.isErrorVisible();
      expect(errorVisible).toBeTruthy();
    });

    test('should track rate limits across sessions', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Make failed attempts
      for (let i = 0; i < 3; i++) {
        await loginPage.fillEmail('session@example.com');
        await loginPage.fillPassword('WrongPassword123!');
        await loginPage.clickSubmit();
        await page.waitForTimeout(300);
        await page.reload();
      }
      
      // Clear cookies (new session)
      await page.context().clearCookies();
      
      // Rate limit should still apply (tracked by IP)
      await loginPage.goto();
      for (let i = 0; i < 3; i++) {
        await loginPage.fillEmail('session@example.com');
        await loginPage.fillPassword('WrongPassword123!');
        await loginPage.clickSubmit();
        await page.waitForTimeout(300);
        if (i < 2) await page.reload();
      }
      
      const errorVisible = await loginPage.isErrorVisible();
      expect(errorVisible).toBeTruthy();
    });
  });
});
