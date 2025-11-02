import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * LoginPage - Handles login page interactions
 * 
 * Provides methods for user authentication including:
 * - Email and password input
 * - Form submission
 * - Error message retrieval
 * - Navigation to signup
 * 
 * Example:
 * ```
 * const loginPage = new LoginPage(page);
 * await loginPage.goto();
 * await loginPage.login('user@example.com', 'password123');
 * ```
 */
export class LoginPage extends BasePage {
  // Selectors using data-testid
  private readonly emailInput = '[data-testid="login-email"]';
  private readonly passwordInput = '[data-testid="login-password"]';
  private readonly submitButton = '[data-testid="login-submit"]';
  private readonly errorMessage = '[data-testid="login-error"]';
  private readonly signupLink = '[data-testid="login-signup-link"]';
  private readonly forgotPasswordLink = '[data-testid="login-forgot-password-link"]';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to the login page
   */
  async goto(): Promise<void> {
    await super.goto('/auth/login');
  }

  /**
   * Perform login with email and password
   * @param email - User's email address
   * @param password - User's password
   */
  async login(email: string, password: string): Promise<void> {
    await this.fill(this.emailInput, email);
    await this.fill(this.passwordInput, password);
    await this.click(this.submitButton);
  }

  /**
   * Fill email input field
   * @param email - Email address to enter
   */
  async fillEmail(email: string): Promise<void> {
    await this.fill(this.emailInput, email);
  }

  /**
   * Fill password input field
   * @param password - Password to enter
   */
  async fillPassword(password: string): Promise<void> {
    await this.fill(this.passwordInput, password);
  }

  /**
   * Click the submit button
   */
  async clickSubmit(): Promise<void> {
    await this.click(this.submitButton);
  }

  /**
   * Get the error message text
   * @returns The error message displayed on the page
   */
  async getErrorMessage(): Promise<string> {
    return await this.getText(this.errorMessage);
  }

  /**
   * Check if error message is visible
   * @returns True if error message is visible, false otherwise
   */
  async isErrorVisible(): Promise<boolean> {
    return await this.locator(this.errorMessage).isVisible();
  }

  /**
   * Navigate to the signup page
   */
  async goToSignup(): Promise<void> {
    await this.click(this.signupLink);
    await this.page.waitForURL('/auth/register');
  }

  /**
   * Navigate to the forgot password page
   */
  async goToForgotPassword(): Promise<void> {
    await this.click(this.forgotPasswordLink);
    await this.page.waitForURL('/auth/forgot-password');
  }

  /**
   * Check if the login form is visible
   * @returns True if login form is visible, false otherwise
   */
  async isLoginFormVisible(): Promise<boolean> {
    const emailVisible = await this.locator(this.emailInput).isVisible();
    const passwordVisible = await this.locator(this.passwordInput).isVisible();
    const submitVisible = await this.locator(this.submitButton).isVisible();
    return emailVisible && passwordVisible && submitVisible;
  }

  /**
   * Wait for navigation to dashboard after successful login
   */
  async waitForSuccessfulLogin(): Promise<void> {
    await this.page.waitForURL('/dashboard', { timeout: 10000 });
  }

  /**
   * Check if submit button is disabled
   * @returns True if submit button is disabled, false otherwise
   */
  async isSubmitDisabled(): Promise<boolean> {
    return await this.locator(this.submitButton).isDisabled();
  }
}
