import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * RegistrationPage - Handles user registration page interactions
 * 
 * Provides methods for user registration including:
 * - Name, email, password, and confirm password input
 * - Form submission
 * - Error message retrieval
 * - Navigation to login
 * 
 * Example:
 * ```
 * const registrationPage = new RegistrationPage(page);
 * await registrationPage.goto();
 * await registrationPage.register('John Doe', 'user@example.com', 'Pass123!', 'Pass123!');
 * ```
 */
export class RegistrationPage extends BasePage {
  // Selectors using data-testid
  private readonly nameInput = '[data-testid="register-name"]';
  private readonly emailInput = '[data-testid="register-email"]';
  private readonly passwordInput = '[data-testid="register-password"]';
  private readonly confirmPasswordInput = '[data-testid="register-confirm-password"]';
  private readonly submitButton = '[data-testid="register-submit"]';
  private readonly errorMessage = '[data-testid="register-error"]';
  private readonly loginLink = '[data-testid="register-login-link"]';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to the registration page
   */
  async goto(): Promise<void> {
    await super.goto('/auth/register');
  }

  /**
   * Perform registration with all required fields
   * @param name - User's full name
   * @param email - User's email address
   * @param password - User's password
   * @param confirmPassword - Password confirmation
   */
  async register(
    name: string,
    email: string,
    password: string,
    confirmPassword: string
  ): Promise<void> {
    await this.fill(this.nameInput, name);
    await this.fill(this.emailInput, email);
    await this.fill(this.passwordInput, password);
    await this.fill(this.confirmPasswordInput, confirmPassword);
    await this.click(this.submitButton);
  }

  /**
   * Fill name input field
   * @param name - Name to enter
   */
  async fillName(name: string): Promise<void> {
    await this.fill(this.nameInput, name);
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
   * Fill confirm password input field
   * @param confirmPassword - Confirm password to enter
   */
  async fillConfirmPassword(confirmPassword: string): Promise<void> {
    await this.fill(this.confirmPasswordInput, confirmPassword);
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
   * Get validation error for a specific field
   * @param fieldName - Name of the field (name, email, password, confirmPassword)
   * @returns The validation error message for the field
   */
  async getFieldError(fieldName: 'name' | 'email' | 'password' | 'confirmPassword'): Promise<string> {
    const fieldSelector = {
      name: this.nameInput,
      email: this.emailInput,
      password: this.passwordInput,
      confirmPassword: this.confirmPasswordInput
    }[fieldName];

    // Find the parent FormItem and then the FormMessage
    const formItem = this.page.locator(fieldSelector).locator('xpath=ancestor::*[contains(@class, "space-y")]');
    const errorElement = formItem.locator('[role="alert"]');
    
    if (await errorElement.isVisible()) {
      return await errorElement.textContent() || '';
    }
    return '';
  }

  /**
   * Navigate to the login page
   */
  async goToLogin(): Promise<void> {
    await this.click(this.loginLink);
    await this.page.waitForURL('/auth/login');
  }

  /**
   * Check if the registration form is visible
   * @returns True if registration form is visible, false otherwise
   */
  async isRegistrationFormVisible(): Promise<boolean> {
    const nameVisible = await this.locator(this.nameInput).isVisible();
    const emailVisible = await this.locator(this.emailInput).isVisible();
    const passwordVisible = await this.locator(this.passwordInput).isVisible();
    const confirmPasswordVisible = await this.locator(this.confirmPasswordInput).isVisible();
    const submitVisible = await this.locator(this.submitButton).isVisible();
    
    return nameVisible && emailVisible && passwordVisible && confirmPasswordVisible && submitVisible;
  }

  /**
   * Wait for navigation to dashboard after successful registration
   */
  async waitForSuccessfulRegistration(): Promise<void> {
    await this.page.waitForURL('/dashboard', { timeout: 10000 });
  }

  /**
   * Check if submit button is disabled
   * @returns True if submit button is disabled, false otherwise
   */
  async isSubmitDisabled(): Promise<boolean> {
    return await this.locator(this.submitButton).isDisabled();
  }

  /**
   * Clear all form fields
   */
  async clearForm(): Promise<void> {
    await this.locator(this.nameInput).clear();
    await this.locator(this.emailInput).clear();
    await this.locator(this.passwordInput).clear();
    await this.locator(this.confirmPasswordInput).clear();
  }
}
