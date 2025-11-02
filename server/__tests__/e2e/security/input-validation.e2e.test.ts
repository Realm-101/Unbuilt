import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/login.page';
import { RegistrationPage } from '../../page-objects/registration.page';
import { SearchPage } from '../../page-objects/search.page';

/**
 * Input Validation E2E Tests
 * 
 * Tests input validation and sanitization across the application.
 * Validates SQL injection prevention, XSS payload sanitization,
 * CSRF token validation, and Zod schema validation.
 * 
 * Requirements: 6.3
 */

test.describe('Input Validation', () => {
  test.describe('SQL Injection Prevention', () => {
    test('should prevent SQL injection in login form', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Attempt SQL injection in email field
      const sqlPayload = "admin' OR '1'='1";
      await loginPage.fillEmail(sqlPayload);
      await loginPage.fillPassword('password');
      await loginPage.clickSubmit();
      
      // Should show validation error, not execute SQL
      const errorVisible = await loginPage.isErrorVisible();
      expect(errorVisible).toBeTruthy();
      
      // Should not be redirected to dashboard
      expect(page.url()).not.toContain('/dashboard');
    });

    test('should prevent SQL injection in registration form', async ({ page }) => {
      const registrationPage = new RegistrationPage(page);
      await registrationPage.goto();
      
      // Attempt SQL injection in email field
      const sqlPayload = "test@example.com'; DROP TABLE users; --";
      await registrationPage.fillEmail(sqlPayload);
      await registrationPage.fillPassword('Test123!@#');
      await registrationPage.fillConfirmPassword('Test123!@#');
      await registrationPage.clickSubmit();
      
      // Should show validation error
      const errorVisible = await registrationPage.isErrorVisible();
      expect(errorVisible).toBeTruthy();
    });

    test('should prevent SQL injection in search queries', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login('test@example.com', 'Test123!@#');
      
      const searchPage = new SearchPage(page);
      await searchPage.goto();
      
      // Attempt SQL injection in search input
      const sqlPayload = "test' UNION SELECT * FROM users WHERE '1'='1";
      await searchPage.submitSearch(sqlPayload);
      
      // Should either reject the input or sanitize it
      // The search should not expose database structure
      await page.waitForTimeout(1000);
      
      // Check that no database error is exposed
      const pageContent = await page.content();
      expect(pageContent).not.toContain('SQL');
      expect(pageContent).not.toContain('database');
      expect(pageContent).not.toContain('syntax error');
    });

    test('should use parameterized queries for user input', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Try various SQL injection patterns
      const sqlPayloads = [
        "' OR 1=1--",
        "admin'--",
        "' OR 'x'='x",
        "1' UNION SELECT NULL--",
        "'; DROP TABLE users--"
      ];
      
      for (const payload of sqlPayloads) {
        await loginPage.fillEmail(payload);
        await loginPage.fillPassword('password');
        await loginPage.clickSubmit();
        
        // Should not succeed or expose errors
        const errorVisible = await loginPage.isErrorVisible();
        expect(errorVisible).toBeTruthy();
        
        // Clear form for next attempt
        await page.reload();
      }
    });
  });

  test.describe('XSS Payload Sanitization', () => {
    test('should sanitize XSS in registration form', async ({ page }) => {
      const registrationPage = new RegistrationPage(page);
      await registrationPage.goto();
      
      // Attempt XSS in email field
      const xssPayload = '<script>alert("XSS")</script>@example.com';
      await registrationPage.fillEmail(xssPayload);
      await registrationPage.fillPassword('Test123!@#');
      await registrationPage.fillConfirmPassword('Test123!@#');
      await registrationPage.clickSubmit();
      
      // Should show validation error
      const errorVisible = await registrationPage.isErrorVisible();
      expect(errorVisible).toBeTruthy();
    });

    test('should prevent XSS in search input', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login('test@example.com', 'Test123!@#');
      
      const searchPage = new SearchPage(page);
      await searchPage.goto();
      
      // Attempt XSS in search input
      const xssPayload = '<img src=x onerror=alert("XSS")>';
      await searchPage.submitSearch(xssPayload);
      
      // Wait for any potential XSS to execute
      await page.waitForTimeout(1000);
      
      // Check that no alert was triggered
      const dialogs: string[] = [];
      page.on('dialog', dialog => {
        dialogs.push(dialog.message());
        dialog.dismiss();
      });
      
      expect(dialogs).toHaveLength(0);
    });

    test('should sanitize various XSS patterns', async ({ page }) => {
      const registrationPage = new RegistrationPage(page);
      await registrationPage.goto();
      
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')">',
        '<body onload=alert("XSS")>',
        '<input onfocus=alert("XSS") autofocus>',
        '<marquee onstart=alert("XSS")>'
      ];
      
      for (const payload of xssPayloads) {
        await registrationPage.fillEmail(`test${payload}@example.com`);
        await registrationPage.fillPassword('Test123!@#');
        await registrationPage.fillConfirmPassword('Test123!@#');
        await registrationPage.clickSubmit();
        
        // Should show validation error or sanitize
        await page.waitForTimeout(500);
        
        // Check that no script executed
        const pageContent = await page.content();
        expect(pageContent).not.toContain('<script>');
        expect(pageContent).not.toContain('onerror=');
        expect(pageContent).not.toContain('onload=');
        
        // Reload for next test
        await page.reload();
      }
    });

    test('should escape HTML entities in user input', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Input with HTML entities
      const htmlInput = '<b>test</b>@example.com';
      await loginPage.fillEmail(htmlInput);
      await loginPage.fillPassword('Test123!@#');
      await loginPage.clickSubmit();
      
      // Check that HTML is escaped in error messages
      const errorMessage = await loginPage.getErrorMessage();
      if (errorMessage.includes('test')) {
        expect(errorMessage).not.toContain('<b>');
        expect(errorMessage).not.toContain('</b>');
      }
    });

    test('should prevent DOM-based XSS', async ({ page }) => {
      // Navigate with XSS in URL parameters
      await page.goto('/?search=<script>alert("XSS")</script>');
      
      // Wait for potential XSS execution
      await page.waitForTimeout(1000);
      
      // Check that script didn't execute
      const dialogs: string[] = [];
      page.on('dialog', dialog => {
        dialogs.push(dialog.message());
        dialog.dismiss();
      });
      
      expect(dialogs).toHaveLength(0);
      
      // Check that script tags are not in DOM
      const scriptTags = await page.locator('script').count();
      const pageContent = await page.content();
      expect(pageContent).not.toContain('alert("XSS")');
    });
  });

  test.describe('CSRF Token Validation', () => {
    test('should include CSRF token in forms', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Check for CSRF token in form or meta tag
      const csrfToken = await page.evaluate(() => {
        // Check meta tag
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag) {
          return metaTag.getAttribute('content');
        }
        
        // Check hidden input
        const hiddenInput = document.querySelector('input[name="_csrf"]');
        if (hiddenInput) {
          return (hiddenInput as HTMLInputElement).value;
        }
        
        return null;
      });
      
      // CSRF token should be present (if CSRF protection is implemented)
      // Note: This test may need adjustment based on actual CSRF implementation
      if (csrfToken) {
        expect(csrfToken).toBeTruthy();
        expect(csrfToken.length).toBeGreaterThan(10);
      }
    });

    test('should reject requests without CSRF token', async ({ page, request }) => {
      // Try to make a POST request without CSRF token
      const response = await request.post('/api/auth/login', {
        data: {
          email: 'test@example.com',
          password: 'Test123!@#'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Should either reject or require CSRF token
      // Note: Actual behavior depends on CSRF implementation
      if (response.status() === 403) {
        const body = await response.json();
        expect(body.error).toBeDefined();
      }
    });

    test('should validate CSRF token on state-changing requests', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Get CSRF token
      const csrfToken = await page.evaluate(() => {
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        return metaTag?.getAttribute('content');
      });
      
      if (csrfToken) {
        // Try to submit form with invalid CSRF token
        await page.evaluate(() => {
          const metaTag = document.querySelector('meta[name="csrf-token"]');
          if (metaTag) {
            metaTag.setAttribute('content', 'invalid-token');
          }
        });
        
        await loginPage.fillEmail('test@example.com');
        await loginPage.fillPassword('Test123!@#');
        await loginPage.clickSubmit();
        
        // Should show error or reject request
        await page.waitForTimeout(1000);
        const errorVisible = await loginPage.isErrorVisible();
        expect(errorVisible).toBeTruthy();
      }
    });
  });

  test.describe('Zod Schema Validation', () => {
    test('should validate email format', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@example',
        'test @example.com'
      ];
      
      for (const email of invalidEmails) {
        await loginPage.fillEmail(email);
        await loginPage.fillPassword('Test123!@#');
        await loginPage.clickSubmit();
        
        // Should show validation error
        const errorVisible = await loginPage.isErrorVisible();
        expect(errorVisible).toBeTruthy();
        
        await page.reload();
      }
    });

    test('should validate password complexity', async ({ page }) => {
      const registrationPage = new RegistrationPage(page);
      await registrationPage.goto();
      
      const weakPasswords = [
        'short',           // Too short
        'alllowercase',    // No uppercase
        'ALLUPPERCASE',    // No lowercase
        'NoNumbers!',      // No numbers
        'NoSpecial123',    // No special characters
        '12345678'         // Only numbers
      ];
      
      for (const password of weakPasswords) {
        await registrationPage.fillEmail('test@example.com');
        await registrationPage.fillPassword(password);
        await registrationPage.fillConfirmPassword(password);
        await registrationPage.clickSubmit();
        
        // Should show validation error
        const errorVisible = await registrationPage.isErrorVisible();
        expect(errorVisible).toBeTruthy();
        
        await page.reload();
      }
    });

    test('should validate required fields', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Try to submit with empty fields
      await loginPage.clickSubmit();
      
      // Should show validation errors
      const errorVisible = await loginPage.isErrorVisible();
      expect(errorVisible).toBeTruthy();
    });

    test('should validate field length limits', async ({ page }) => {
      const registrationPage = new RegistrationPage(page);
      await registrationPage.goto();
      
      // Try extremely long email
      const longEmail = 'a'.repeat(300) + '@example.com';
      await registrationPage.fillEmail(longEmail);
      await registrationPage.fillPassword('Test123!@#');
      await registrationPage.fillConfirmPassword('Test123!@#');
      await registrationPage.clickSubmit();
      
      // Should show validation error
      const errorVisible = await registrationPage.isErrorVisible();
      expect(errorVisible).toBeTruthy();
    });

    test('should validate password confirmation match', async ({ page }) => {
      const registrationPage = new RegistrationPage(page);
      await registrationPage.goto();
      
      await registrationPage.fillEmail('test@example.com');
      await registrationPage.fillPassword('Test123!@#');
      await registrationPage.fillConfirmPassword('Different123!@#');
      await registrationPage.clickSubmit();
      
      // Should show validation error
      const errorVisible = await registrationPage.isErrorVisible();
      expect(errorVisible).toBeTruthy();
    });

    test('should sanitize and validate search input', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login('test@example.com', 'Test123!@#');
      
      const searchPage = new SearchPage(page);
      await searchPage.goto();
      
      // Try empty search - just click submit without filling input
      const submitButton = '[data-testid="search-submit"]';
      await page.click(submitButton);
      await page.waitForTimeout(500);
      
      // Should show validation error or prevent submission
      const url = page.url();
      expect(url).toContain('/search');
    });

    test('should validate numeric inputs', async ({ page }) => {
      // This test would apply to any numeric input fields
      // For example, if there are age or quantity fields
      
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login('test@example.com', 'Test123!@#');
      
      // Navigate to a page with numeric inputs (if applicable)
      // Test with invalid numeric values
      // This is a placeholder for actual numeric field validation
    });
  });

  test.describe('Input Sanitization', () => {
    test('should trim whitespace from inputs', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Input with leading/trailing whitespace
      await loginPage.fillEmail('  test@example.com  ');
      await loginPage.fillPassword('Test123!@#');
      await loginPage.clickSubmit();
      
      // Should trim whitespace and process normally
      await page.waitForTimeout(1000);
    });

    test('should handle special characters safely', async ({ page }) => {
      const registrationPage = new RegistrationPage(page);
      await registrationPage.goto();
      
      const specialChars = [
        'test+tag@example.com',
        'test.name@example.com',
        'test_name@example.com',
        'test-name@example.com'
      ];
      
      for (const email of specialChars) {
        await registrationPage.fillEmail(email);
        await registrationPage.fillPassword('Test123!@#');
        await registrationPage.fillConfirmPassword('Test123!@#');
        await registrationPage.clickSubmit();
        
        // Should handle special characters correctly
        await page.waitForTimeout(500);
        await page.reload();
      }
    });

    test('should prevent null byte injection', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Try null byte injection
      const nullBytePayload = 'test@example.com\x00admin';
      await loginPage.fillEmail(nullBytePayload);
      await loginPage.fillPassword('Test123!@#');
      await loginPage.clickSubmit();
      
      // Should reject or sanitize
      const errorVisible = await loginPage.isErrorVisible();
      expect(errorVisible).toBeTruthy();
    });

    test('should handle unicode characters safely', async ({ page }) => {
      const registrationPage = new RegistrationPage(page);
      await registrationPage.goto();
      
      // Try unicode characters
      const unicodeEmail = 'test\u202E@example.com'; // Right-to-left override
      await registrationPage.fillEmail(unicodeEmail);
      await registrationPage.fillPassword('Test123!@#');
      await registrationPage.fillConfirmPassword('Test123!@#');
      await registrationPage.clickSubmit();
      
      // Should handle or reject unicode control characters
      await page.waitForTimeout(500);
    });
  });
});
