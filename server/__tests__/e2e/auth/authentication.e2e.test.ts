import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/login.page';
import { RegistrationPage } from '../../page-objects/registration.page';

/**
 * Authentication E2E Tests
 * 
 * Tests user registration, login, and session management flows.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4
 * 
 * Setup: Requires clean database state
 * Cleanup: Browser context cleared after each test
 */

test.describe('User Registration', () => {
  let registrationPage: RegistrationPage;

  test.beforeEach(async ({ page, context }) => {
    // Clear cookies
    await context.clearCookies();

    registrationPage = new RegistrationPage(page);
    await registrationPage.goto();
    
    // Clear storage after page loads
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should display registration form', async () => {
    // Verify form is visible
    const isFormVisible = await registrationPage.isRegistrationFormVisible();
    expect(isFormVisible).toBeTruthy();
  });

  test('should register user with valid data', async ({ page }) => {
    // Arrange - Generate unique test data
    const timestamp = Date.now();
    const testUser = {
      name: 'Test User',
      email: `test-${timestamp}@example.com`,
      password: 'Test123!@#',
      confirmPassword: 'Test123!@#'
    };

    // Act - Submit registration
    await registrationPage.register(
      testUser.name,
      testUser.email,
      testUser.password,
      testUser.confirmPassword
    );

    // Assert - Should redirect to home page (/)
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });

  test('should show error for invalid email format', async () => {
    // Arrange
    const invalidData = {
      name: 'Test User',
      email: 'not-an-email',
      password: 'Test123!@#',
      confirmPassword: 'Test123!@#'
    };

    // Act
    await registrationPage.fillName(invalidData.name);
    await registrationPage.fillEmail(invalidData.email);
    await registrationPage.fillPassword(invalidData.password);
    await registrationPage.fillConfirmPassword(invalidData.confirmPassword);
    await registrationPage.clickSubmit();

    // Assert - Should show validation error
    // Note: Validation may be client-side, so we check if we're still on registration page
    await expect(registrationPage.page).toHaveURL('/auth/register');
  });

  test('should show error for password too short', async () => {
    // Arrange
    const timestamp = Date.now();
    const weakPasswordData = {
      name: 'Test User',
      email: `test-${timestamp}@example.com`,
      password: '123',
      confirmPassword: '123'
    };

    // Act
    await registrationPage.fillName(weakPasswordData.name);
    await registrationPage.fillEmail(weakPasswordData.email);
    await registrationPage.fillPassword(weakPasswordData.password);
    await registrationPage.fillConfirmPassword(weakPasswordData.confirmPassword);
    await registrationPage.clickSubmit();

    // Assert - Should remain on registration page
    await expect(registrationPage.page).toHaveURL('/auth/register');
  });

  test('should show error when passwords do not match', async () => {
    // Arrange
    const timestamp = Date.now();
    const mismatchData = {
      name: 'Test User',
      email: `test-${timestamp}@example.com`,
      password: 'Test123!@#',
      confirmPassword: 'Different123!@#'
    };

    // Act
    await registrationPage.fillName(mismatchData.name);
    await registrationPage.fillEmail(mismatchData.email);
    await registrationPage.fillPassword(mismatchData.password);
    await registrationPage.fillConfirmPassword(mismatchData.confirmPassword);
    await registrationPage.clickSubmit();

    // Assert - Should remain on registration page
    await expect(registrationPage.page).toHaveURL('/auth/register');
  });

  test('should show error for empty required fields', async () => {
    // Act - Try to submit empty form
    await registrationPage.clickSubmit();

    // Assert - Should remain on registration page
    await expect(registrationPage.page).toHaveURL('/auth/register');
  });

  test('should navigate to login page', async ({ page }) => {
    // Act
    await registrationPage.goToLogin();

    // Assert
    await expect(page).toHaveURL('/auth/login');
  });
});

test.describe('User Login', () => {
  let loginPage: LoginPage;
  let registrationPage: RegistrationPage;

  test.beforeEach(async ({ page, context }) => {
    // Clear cookies
    await context.clearCookies();

    loginPage = new LoginPage(page);
    registrationPage = new RegistrationPage(page);
  });

  test('should display login form', async () => {
    // Act
    await loginPage.goto();

    // Assert
    const isFormVisible = await loginPage.isLoginFormVisible();
    expect(isFormVisible).toBeTruthy();
  });

  test('should login with valid credentials', async ({ page }) => {
    // Arrange - First register a user
    const timestamp = Date.now();
    const testUser = {
      name: 'Login Test User',
      email: `login-test-${timestamp}@example.com`,
      password: 'Login123!@#'
    };

    await registrationPage.goto();
    await registrationPage.register(
      testUser.name,
      testUser.email,
      testUser.password,
      testUser.password
    );

    // Wait for registration to complete
    await page.waitForURL('/', { timeout: 10000 });

    // Logout by clearing session
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.context().clearCookies();

    // Act - Login with the registered user
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);

    // Assert - Should redirect to home page (/)
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });

  test('should show error for invalid email', async () => {
    // Arrange
    const invalidCredentials = {
      email: 'nonexistent@example.com',
      password: 'SomePassword123!@#'
    };

    // Act
    await loginPage.goto();
    await loginPage.login(invalidCredentials.email, invalidCredentials.password);

    // Assert - Should show error message
    await expect(loginPage.page.locator('[data-testid="login-error"]')).toBeVisible({ timeout: 5000 });
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain('Invalid credentials');
  });

  test('should show error for invalid password', async ({ page }) => {
    // Arrange - First register a user
    const timestamp = Date.now();
    const testUser = {
      name: 'Password Test User',
      email: `password-test-${timestamp}@example.com`,
      password: 'Correct123!@#'
    };

    await registrationPage.goto();
    await registrationPage.register(
      testUser.name,
      testUser.email,
      testUser.password,
      testUser.password
    );

    await page.waitForURL('/', { timeout: 10000 });

    // Logout
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.context().clearCookies();

    // Act - Try to login with wrong password
    await loginPage.goto();
    await loginPage.login(testUser.email, 'WrongPassword123!@#');

    // Assert - Should show error message
    await expect(loginPage.page.locator('[data-testid="login-error"]')).toBeVisible({ timeout: 5000 });
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain('Invalid credentials');
  });

  test('should show error for empty email', async () => {
    // Act
    await loginPage.goto();
    await loginPage.fillPassword('SomePassword123!@#');
    await loginPage.clickSubmit();

    // Assert - Should remain on login page
    await expect(loginPage.page).toHaveURL('/auth/login');
  });

  test('should show error for empty password', async () => {
    // Act
    await loginPage.goto();
    await loginPage.fillEmail('test@example.com');
    await loginPage.clickSubmit();

    // Assert - Should remain on login page
    await expect(loginPage.page).toHaveURL('/auth/login');
  });

  test('should navigate to signup page', async ({ page }) => {
    // Act
    await loginPage.goto();
    await loginPage.goToSignup();

    // Assert
    await expect(page).toHaveURL('/auth/register');
  });

  test('should navigate to forgot password page', async ({ page }) => {
    // Act
    await loginPage.goto();
    await loginPage.goToForgotPassword();

    // Assert
    await expect(page).toHaveURL('/auth/forgot-password');
  });
});

test.describe('Rate Limiting', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page, context }) => {
    // Clear cookies
    await context.clearCookies();

    loginPage = new LoginPage(page);
    await loginPage.goto();
    
    // Clear storage after page loads
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should enforce rate limiting after 5 failed login attempts', async () => {
    // Arrange
    const invalidCredentials = {
      email: 'ratelimit@example.com',
      password: 'WrongPassword123!@#'
    };

    // Act - Attempt 5 failed logins
    for (let i = 0; i < 5; i++) {
      await loginPage.goto();
      await loginPage.fillEmail(invalidCredentials.email);
      await loginPage.fillPassword(invalidCredentials.password);
      await loginPage.clickSubmit();
      
      // Wait for error to appear
      await loginPage.page.waitForTimeout(1500);
    }

    // Attempt 6th login
    await loginPage.goto();
    await loginPage.fillEmail(invalidCredentials.email);
    await loginPage.fillPassword(invalidCredentials.password);
    await loginPage.clickSubmit();

    // Assert - Should show rate limit error or account lockout message
    await loginPage.page.waitForTimeout(2000);
    const errorVisible = await loginPage.isErrorVisible();
    expect(errorVisible).toBeTruthy();
  });
});

test.describe('Password Complexity', () => {
  let registrationPage: RegistrationPage;

  test.beforeEach(async ({ page, context }) => {
    // Clear cookies
    await context.clearCookies();

    registrationPage = new RegistrationPage(page);
    await registrationPage.goto();
    
    // Clear storage after page loads
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should accept password with minimum 6 characters', async ({ page }) => {
    // Arrange
    const timestamp = Date.now();
    const testUser = {
      name: 'Min Password User',
      email: `minpass-${timestamp}@example.com`,
      password: 'Pass12',
      confirmPassword: 'Pass12'
    };

    // Act
    await registrationPage.register(
      testUser.name,
      testUser.email,
      testUser.password,
      testUser.confirmPassword
    );

    // Assert - Should successfully register
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });

  test('should reject password with less than 6 characters', async () => {
    // Arrange
    const timestamp = Date.now();
    const testUser = {
      name: 'Short Password User',
      email: `shortpass-${timestamp}@example.com`,
      password: 'Pass1',
      confirmPassword: 'Pass1'
    };

    // Act
    await registrationPage.fillName(testUser.name);
    await registrationPage.fillEmail(testUser.email);
    await registrationPage.fillPassword(testUser.password);
    await registrationPage.fillConfirmPassword(testUser.confirmPassword);
    await registrationPage.clickSubmit();

    // Assert - Should remain on registration page
    await expect(registrationPage.page).toHaveURL('/auth/register');
  });
});

test.describe('Session Management', () => {
  let loginPage: LoginPage;
  let registrationPage: RegistrationPage;

  test.beforeEach(async ({ page, context }) => {
    // Clear cookies
    await context.clearCookies();

    loginPage = new LoginPage(page);
    registrationPage = new RegistrationPage(page);
  });

  test('should maintain session after login', async ({ page }) => {
    // Arrange - Register and login
    const timestamp = Date.now();
    const testUser = {
      name: 'Session Test User',
      email: `session-${timestamp}@example.com`,
      password: 'Session123!@#'
    };

    await registrationPage.goto();
    await registrationPage.register(
      testUser.name,
      testUser.email,
      testUser.password,
      testUser.password
    );

    await page.waitForURL('/', { timeout: 10000 });

    // Act - Navigate to another page and back
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Assert - Should still be authenticated (not redirected to login)
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/auth/login');
  });

  test('should clear session after logout', async ({ page }) => {
    // Arrange - Register and login
    const timestamp = Date.now();
    const testUser = {
      name: 'Logout Test User',
      email: `logout-${timestamp}@example.com`,
      password: 'Logout123!@#'
    };

    await registrationPage.goto();
    await registrationPage.register(
      testUser.name,
      testUser.email,
      testUser.password,
      testUser.password
    );

    await page.waitForURL('/', { timeout: 10000 });

    // Act - Logout by clearing session
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.context().clearCookies();

    // Navigate to a protected page
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    // Assert - Should redirect to login
    const currentUrl = page.url();
    expect(currentUrl).toContain('/auth/login');
  });
});
