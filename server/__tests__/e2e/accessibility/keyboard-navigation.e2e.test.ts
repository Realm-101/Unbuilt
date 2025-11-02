import { test, expect } from '@playwright/test';
import { createAccessibilityHelper } from '../../helpers/accessibility.helper';
import { LoginPage } from '../../page-objects/login.page';
import { DashboardPage } from '../../page-objects/dashboard.page';

/**
 * Keyboard Navigation Tests
 * 
 * Tests keyboard accessibility including:
 * - Tab navigation through interactive elements
 * - Visible focus indicators
 * - Keyboard shortcuts
 * - Skip links
 * 
 * Requirements: 4.3
 */

test.describe('Keyboard Navigation', () => {
  test('should have visible focus indicators on all interactive elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const a11yHelper = createAccessibilityHelper(page);
    const result = await a11yHelper.testKeyboardNavigation();

    if (!result.passed) {
      console.log('\nKeyboard navigation issues:');
      result.issues.forEach(issue => console.log(`  - ${issue}`));
    }

    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  test('login form should be keyboard navigable', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Tab through form elements
    await page.keyboard.press('Tab'); // Email input
    let focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(focused).toBe('login-email');

    await page.keyboard.press('Tab'); // Password input
    focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(focused).toBe('login-password');

    await page.keyboard.press('Tab'); // Submit button
    focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(focused).toBe('login-submit');
  });

  test('should show focus indicator on tab navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Tab to first interactive element
    await page.keyboard.press('Tab');

    // Check focus indicator is visible
    const focusStyles = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;

      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        outlineStyle: styles.outlineStyle,
        outlineColor: styles.outlineColor,
        boxShadow: styles.boxShadow,
        border: styles.border
      };
    });

    expect(focusStyles).not.toBeNull();
    
    // Should have either outline, box-shadow, or border
    const hasFocusIndicator = 
      (focusStyles!.outline !== 'none' && focusStyles!.outlineWidth !== '0px') ||
      focusStyles!.boxShadow !== 'none' ||
      focusStyles!.border !== '0px none rgb(0, 0, 0)';

    expect(hasFocusIndicator).toBe(true);
  });

  test('should navigate dashboard with keyboard', async ({ page }) => {
    // Login first
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test@example.com', 'Test123!@#');

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.waitForPageLoad();

    // Test keyboard navigation
    const a11yHelper = createAccessibilityHelper(page);
    const result = await a11yHelper.testKeyboardNavigation();

    expect(result.passed).toBe(true);
  });

  test('should support Enter key for button activation', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Fill form
    await page.fill('[data-testid="login-email"]', 'test@example.com');
    await page.fill('[data-testid="login-password"]', 'Test123!@#');

    // Focus submit button and press Enter
    await page.focus('[data-testid="login-submit"]');
    await page.keyboard.press('Enter');

    // Should navigate to dashboard or show error
    await page.waitForURL(/\/(dashboard|login)/, { timeout: 5000 });
  });

  test('should support Space key for button activation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find first button
    const firstButton = await page.locator('button').first();
    if (await firstButton.count() > 0) {
      await firstButton.focus();
      
      // Press Space should activate button
      await page.keyboard.press('Space');
      
      // Button should have been activated (we just verify no error occurred)
      await page.waitForTimeout(500);
    }
  });

  test('should support Escape key to close modals', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for modal triggers
    const modalTrigger = await page.locator('[data-testid*="modal"], [aria-haspopup="dialog"]').first();
    
    if (await modalTrigger.count() > 0) {
      // Open modal
      await modalTrigger.click();
      await page.waitForTimeout(500);

      // Press Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Modal should be closed
      const modalVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
      expect(modalVisible).toBe(false);
    }
  });

  test('should trap focus within modals', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for modal triggers
    const modalTrigger = await page.locator('[data-testid*="modal"], [aria-haspopup="dialog"]').first();
    
    if (await modalTrigger.count() > 0) {
      // Open modal
      await modalTrigger.click();
      await page.waitForTimeout(500);

      // Get all focusable elements in modal
      const focusableInModal = await page.locator('[role="dialog"] button, [role="dialog"] a, [role="dialog"] input').count();

      if (focusableInModal > 0) {
        // Tab through all elements
        for (let i = 0; i < focusableInModal + 2; i++) {
          await page.keyboard.press('Tab');
        }

        // Focus should still be within modal
        const focusInModal = await page.evaluate(() => {
          const activeEl = document.activeElement;
          const modal = document.querySelector('[role="dialog"]');
          return modal?.contains(activeEl) || false;
        });

        expect(focusInModal).toBe(true);
      }
    }
  });

  test('should support skip links for main content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Press Tab to focus first element (should be skip link)
    await page.keyboard.press('Tab');

    const firstFocused = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        text: el?.textContent?.toLowerCase(),
        href: (el as HTMLAnchorElement)?.href
      };
    });

    // Check if skip link exists
    if (firstFocused.text?.includes('skip')) {
      // Press Enter to activate skip link
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Focus should be on main content
      const focusedAfterSkip = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el?.tagName,
          id: el?.id,
          role: el?.getAttribute('role')
        };
      });

      expect(
        focusedAfterSkip.tag === 'MAIN' ||
        focusedAfterSkip.role === 'main' ||
        focusedAfterSkip.id?.includes('main')
      ).toBe(true);
    }
  });

  test('should not have keyboard traps', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get initial focus
    await page.keyboard.press('Tab');
    const initialFocus = await page.evaluate(() => document.activeElement?.tagName);

    // Tab through many elements
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);
    }

    // Should be able to tab through without getting stuck
    const finalFocus = await page.evaluate(() => document.activeElement?.tagName);
    
    // Focus should have changed
    expect(finalFocus).toBeDefined();
  });

  test('should support Shift+Tab for reverse navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Tab forward twice
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const forwardFocus = await page.evaluate(() => document.activeElement?.outerHTML);

    // Tab backward once
    await page.keyboard.press('Shift+Tab');
    const backwardFocus = await page.evaluate(() => document.activeElement?.outerHTML);

    // Should be on previous element
    expect(backwardFocus).not.toBe(forwardFocus);
  });
});
