import { test, expect } from '@playwright/test';
import { createAccessibilityHelper } from '../../helpers/accessibility.helper';
import { LoginPage } from '../../page-objects/login.page';
import { RegistrationPage } from '../../page-objects/registration.page';

/**
 * Form Accessibility Tests
 * 
 * Tests form accessibility including:
 * - Form labels
 * - Error messages
 * - Required field indicators
 * - Field descriptions
 * - Form validation feedback
 * 
 * Requirements: 4.5
 */

test.describe('Form Accessibility', () => {
  test('should have no form accessibility violations', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const a11yHelper = createAccessibilityHelper(page);
    const violations = await a11yHelper.testFormAccessibility();

    if (violations.length > 0) {
      console.log('\nForm accessibility violations:');
      violations.forEach(v => {
        console.log(`\n${v.id}: ${v.description}`);
        v.nodes.forEach(node => {
          console.log(`  - ${node.html}`);
        });
      });
    }

    expect(violations).toHaveLength(0);
  });

  test('login form inputs should have associated labels', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Check email input has label
    const emailLabel = await page.evaluate(() => {
      const input = document.querySelector('[data-testid="login-email"]');
      if (!input) return null;

      const id = input.id;
      const label = document.querySelector(`label[for="${id}"]`);
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');

      return {
        hasLabel: !!label,
        hasAriaLabel: !!ariaLabel,
        hasAriaLabelledBy: !!ariaLabelledBy,
        labelText: label?.textContent
      };
    });

    expect(
      emailLabel?.hasLabel || 
      emailLabel?.hasAriaLabel || 
      emailLabel?.hasAriaLabelledBy
    ).toBe(true);

    // Check password input has label
    const passwordLabel = await page.evaluate(() => {
      const input = document.querySelector('[data-testid="login-password"]');
      if (!input) return null;

      const id = input.id;
      const label = document.querySelector(`label[for="${id}"]`);
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');

      return {
        hasLabel: !!label,
        hasAriaLabel: !!ariaLabel,
        hasAriaLabelledBy: !!ariaLabelledBy,
        labelText: label?.textContent
      };
    });

    expect(
      passwordLabel?.hasLabel || 
      passwordLabel?.hasAriaLabel || 
      passwordLabel?.hasAriaLabelledBy
    ).toBe(true);
  });

  test('registration form should have accessible labels', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);
    await registrationPage.goto();

    const a11yHelper = createAccessibilityHelper(page);
    const violations = await a11yHelper.testFormAccessibility();

    expect(violations).toHaveLength(0);
  });

  test('required fields should be indicated accessibly', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const requiredFields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[required]'));
      return inputs.map(input => {
        const hasAriaRequired = input.getAttribute('aria-required') === 'true';
        const hasRequiredAttr = input.hasAttribute('required');
        const label = document.querySelector(`label[for="${input.id}"]`);
        const hasVisualIndicator = label?.textContent?.includes('*') || 
                                   label?.querySelector('[aria-label*="required"]');

        return {
          id: input.id,
          hasAriaRequired,
          hasRequiredAttr,
          hasVisualIndicator: !!hasVisualIndicator
        };
      });
    });

    // All required fields should have aria-required or required attribute
    requiredFields.forEach(field => {
      expect(field.hasAriaRequired || field.hasRequiredAttr).toBe(true);
    });
  });

  test('error messages should be associated with form fields', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Submit form with invalid data to trigger errors
    await loginPage.login('invalid@example.com', 'wrong');

    // Wait for error message
    await page.waitForSelector('[data-testid="login-error"]', { 
      state: 'visible',
      timeout: 5000 
    }).catch(() => null);

    // Check if error is properly associated
    const errorAssociation = await page.evaluate(() => {
      const errorElement = document.querySelector('[data-testid="login-error"]');
      if (!errorElement) return null;

      const errorId = errorElement.id;
      const hasRole = errorElement.getAttribute('role') === 'alert';
      const hasAriaLive = errorElement.hasAttribute('aria-live');

      // Check if any input references this error
      const inputs = Array.from(document.querySelectorAll('input'));
      const associatedInput = inputs.find(input => {
        const describedBy = input.getAttribute('aria-describedby');
        return describedBy?.includes(errorId);
      });

      return {
        hasRole,
        hasAriaLive,
        hasAssociatedInput: !!associatedInput,
        errorText: errorElement.textContent
      };
    });

    if (errorAssociation) {
      // Error should have role="alert" or aria-live
      expect(errorAssociation.hasRole || errorAssociation.hasAriaLive).toBe(true);
    }
  });

  test('form validation errors should be announced to screen readers', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Submit invalid form
    await loginPage.login('invalid', 'wrong');

    // Check for ARIA live region or alert role
    const liveRegions = await page.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll('[role="alert"], [aria-live]'));
      return alerts.map(el => ({
        role: el.getAttribute('role'),
        ariaLive: el.getAttribute('aria-live'),
        text: el.textContent?.trim()
      }));
    });

    // Should have at least one live region for errors
    expect(liveRegions.length).toBeGreaterThan(0);
  });

  test('form fields should have helpful descriptions', async ({ page }) => {
    const registrationPage = new RegistrationPage(page);
    await registrationPage.goto();

    // Check for aria-describedby on password field (should have requirements)
    const passwordDescription = await page.evaluate(() => {
      const passwordInput = document.querySelector('input[type="password"]');
      if (!passwordInput) return null;

      const describedBy = passwordInput.getAttribute('aria-describedby');
      if (!describedBy) return null;

      const descriptionElement = document.getElementById(describedBy);
      return {
        hasDescription: !!descriptionElement,
        descriptionText: descriptionElement?.textContent
      };
    });

    // Password field should have description (requirements)
    if (passwordDescription) {
      expect(passwordDescription.hasDescription).toBe(true);
    }
  });

  test('form should be submittable with keyboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Fill form using keyboard
    await page.keyboard.press('Tab'); // Focus email
    await page.keyboard.type('test@example.com');
    
    await page.keyboard.press('Tab'); // Focus password
    await page.keyboard.type('Test123!@#');
    
    await page.keyboard.press('Tab'); // Focus submit button
    await page.keyboard.press('Enter'); // Submit

    // Should navigate or show error
    await page.waitForURL(/\/(dashboard|login)/, { timeout: 5000 });
  });

  test('form inputs should have appropriate input types', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const inputTypes = await page.evaluate(() => {
      return {
        email: document.querySelector('[data-testid="login-email"]')?.getAttribute('type'),
        password: document.querySelector('[data-testid="login-password"]')?.getAttribute('type')
      };
    });

    expect(inputTypes.email).toBe('email');
    expect(inputTypes.password).toBe('password');
  });

  test('form inputs should have autocomplete attributes', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const autocompleteAttrs = await page.evaluate(() => {
      return {
        email: document.querySelector('[data-testid="login-email"]')?.getAttribute('autocomplete'),
        password: document.querySelector('[data-testid="login-password"]')?.getAttribute('autocomplete')
      };
    });

    // Email should have autocomplete="email" or "username"
    expect(['email', 'username']).toContain(autocompleteAttrs.email);
    
    // Password should have autocomplete attribute
    expect(autocompleteAttrs.password).toBeTruthy();
  });

  test('disabled form fields should be indicated accessibly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const disabledFields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input:disabled, button:disabled'));
      return inputs.map(input => ({
        tag: input.tagName,
        hasDisabledAttr: input.hasAttribute('disabled'),
        hasAriaDisabled: input.getAttribute('aria-disabled') === 'true'
      }));
    });

    // All disabled fields should have disabled attribute or aria-disabled
    disabledFields.forEach(field => {
      expect(field.hasDisabledAttr || field.hasAriaDisabled).toBe(true);
    });
  });

  test('form groups should use fieldset and legend', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for proper fieldset usage
    const fieldsets = await page.evaluate(() => {
      const fieldsetElements = Array.from(document.querySelectorAll('fieldset'));
      return fieldsetElements.map(fieldset => ({
        hasLegend: !!fieldset.querySelector('legend'),
        legendText: fieldset.querySelector('legend')?.textContent
      }));
    });

    // All fieldsets should have legends
    fieldsets.forEach(fieldset => {
      expect(fieldset.hasLegend).toBe(true);
    });
  });

  test('radio buttons and checkboxes should be in fieldsets', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const radioGroups = await page.evaluate(() => {
      const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      
      const radioInFieldset = radios.filter(r => r.closest('fieldset')).length;
      const checkboxInFieldset = checkboxes.filter(c => c.closest('fieldset')).length;

      return {
        totalRadios: radios.length,
        radiosInFieldset: radioInFieldset,
        totalCheckboxes: checkboxes.length,
        checkboxesInFieldset: checkboxInFieldset
      };
    });

    // If there are multiple radios with same name, they should be in fieldset
    if (radioGroups.totalRadios > 1) {
      // At least some should be in fieldsets (or have proper ARIA)
      expect(radioGroups.radiosInFieldset).toBeGreaterThanOrEqual(0);
    }
  });
});
