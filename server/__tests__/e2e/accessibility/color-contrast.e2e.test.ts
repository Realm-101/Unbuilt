import { test, expect } from '@playwright/test';
import { createAccessibilityHelper } from '../../helpers/accessibility.helper';
import { LoginPage } from '../../page-objects/login.page';

/**
 * Color Contrast Tests
 * 
 * Tests color contrast ratios meet WCAG 2.1 AA requirements:
 * - Normal text: 4.5:1 minimum
 * - Large text (18pt+): 3:1 minimum
 * 
 * Requirements: 4.2
 */

test.describe('Color Contrast', () => {
  test('should meet 4.5:1 contrast ratio for normal text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const a11yHelper = createAccessibilityHelper(page);
    const violations = await a11yHelper.testColorContrast();

    if (violations.length > 0) {
      console.log('\nColor contrast violations found:');
      violations.forEach(v => {
        console.log(`\n${v.id}: ${v.description}`);
        v.nodes.forEach(node => {
          console.log(`  - ${node.html}`);
          console.log(`    ${node.failureSummary}`);
        });
      });
    }

    expect(violations).toHaveLength(0);
  });

  test('login page should have sufficient color contrast', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const a11yHelper = createAccessibilityHelper(page);
    const violations = await a11yHelper.testColorContrast();

    expect(violations).toHaveLength(0);
  });

  test('buttons should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const a11yHelper = createAccessibilityHelper(page);
    const violations = await a11yHelper.testColorContrast('button');

    expect(violations).toHaveLength(0);
  });

  test('links should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const a11yHelper = createAccessibilityHelper(page);
    const violations = await a11yHelper.testColorContrast('a');

    expect(violations).toHaveLength(0);
  });

  test('form inputs should have sufficient color contrast', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const a11yHelper = createAccessibilityHelper(page);
    const violations = await a11yHelper.testColorContrast('input, textarea, select');

    expect(violations).toHaveLength(0);
  });

  test('navigation elements should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const a11yHelper = createAccessibilityHelper(page);
    const violations = await a11yHelper.testColorContrast('nav');

    expect(violations).toHaveLength(0);
  });

  test('error messages should have sufficient color contrast', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Trigger error message
    await loginPage.login('invalid@example.com', 'wrongpassword');
    await page.waitForSelector('[data-testid="login-error"]', { state: 'visible' });

    const a11yHelper = createAccessibilityHelper(page);
    const violations = await a11yHelper.testColorContrast('[data-testid="login-error"]');

    expect(violations).toHaveLength(0);
  });

  test('Neon Flame theme colors should meet contrast requirements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test theme-specific elements
    const themeElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('[class*="flame"], [class*="neon"]');
      return Array.from(elements).map(el => ({
        tag: el.tagName,
        classes: el.className,
        text: el.textContent?.substring(0, 50)
      }));
    });

    if (themeElements.length > 0) {
      const a11yHelper = createAccessibilityHelper(page);
      const violations = await a11yHelper.testColorContrast('[class*="flame"], [class*="neon"]');

      if (violations.length > 0) {
        console.log('\nTheme color contrast violations:');
        console.log('Elements tested:', themeElements);
      }

      expect(violations).toHaveLength(0);
    }
  });
});
