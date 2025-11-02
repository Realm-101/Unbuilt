import { test, expect } from '@playwright/test';
import { createAccessibilityHelper } from '../../helpers/accessibility.helper';
import { LoginPage } from '../../page-objects/login.page';
import { DashboardPage } from '../../page-objects/dashboard.page';
import { SearchPage } from '../../page-objects/search.page';
import { ResourceLibraryPage } from '../../page-objects/resource-library.page';

/**
 * WCAG 2.1 AA Compliance Tests
 * 
 * Tests all pages for WCAG 2.1 Level AA compliance using axe-core.
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

test.describe('WCAG 2.1 AA Compliance', () => {
  test('homepage should have no accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const a11yHelper = createAccessibilityHelper(page);
    const report = await a11yHelper.generateReport();

    if (!report.passed) {
      console.log(a11yHelper.formatViolationsForConsole(report.violations));
    }

    expect(report.violations).toHaveLength(0);
  });

  test('login page should have no accessibility violations', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const a11yHelper = createAccessibilityHelper(page);
    const report = await a11yHelper.generateReport();

    if (!report.passed) {
      console.log(a11yHelper.formatViolationsForConsole(report.violations));
    }

    expect(report.violations).toHaveLength(0);
  });

  test('registration page should have no accessibility violations', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    const a11yHelper = createAccessibilityHelper(page);
    const report = await a11yHelper.generateReport();

    if (!report.passed) {
      console.log(a11yHelper.formatViolationsForConsole(report.violations));
    }

    expect(report.violations).toHaveLength(0);
  });

  test('dashboard should have no accessibility violations', async ({ page }) => {
    // Login first
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test@example.com', 'Test123!@#');

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.waitForPageLoad();

    const a11yHelper = createAccessibilityHelper(page);
    const report = await a11yHelper.generateReport();

    if (!report.passed) {
      console.log(a11yHelper.formatViolationsForConsole(report.violations));
    }

    expect(report.violations).toHaveLength(0);
  });

  test('search page should have no accessibility violations', async ({ page }) => {
    // Login first
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test@example.com', 'Test123!@#');

    const searchPage = new SearchPage(page);
    await searchPage.goto();

    const a11yHelper = createAccessibilityHelper(page);
    const report = await a11yHelper.generateReport();

    if (!report.passed) {
      console.log(a11yHelper.formatViolationsForConsole(report.violations));
    }

    expect(report.violations).toHaveLength(0);
  });

  test('resource library should have no accessibility violations', async ({ page }) => {
    // Login first
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test@example.com', 'Test123!@#');

    const resourcePage = new ResourceLibraryPage(page);
    await resourcePage.goto();

    const a11yHelper = createAccessibilityHelper(page);
    const report = await a11yHelper.generateReport();

    if (!report.passed) {
      console.log(a11yHelper.formatViolationsForConsole(report.violations));
    }

    expect(report.violations).toHaveLength(0);
  });

  test('should categorize violations by severity', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const a11yHelper = createAccessibilityHelper(page);
    const violations = await a11yHelper.scan();
    const categorized = a11yHelper.categorizeViolations(violations);

    // Verify categorization structure
    expect(categorized).toHaveProperty('critical');
    expect(categorized).toHaveProperty('serious');
    expect(categorized).toHaveProperty('moderate');
    expect(categorized).toHaveProperty('minor');

    // All violations should be categorized
    const totalCategorized = 
      categorized.critical.length +
      categorized.serious.length +
      categorized.moderate.length +
      categorized.minor.length;

    expect(totalCategorized).toBe(violations.length);
  });

  test('should provide remediation guidance for violations', async ({ page }) => {
    await page.goto('/');

    const a11yHelper = createAccessibilityHelper(page);
    
    // Test known violation IDs
    const knownViolations = [
      'color-contrast',
      'label',
      'aria-allowed-attr',
      'landmark-one-main',
      'heading-order',
      'image-alt',
      'tabindex'
    ];

    knownViolations.forEach(violationId => {
      const guidance = a11yHelper.getRemediationGuidance(violationId);
      
      expect(guidance).toHaveProperty('title');
      expect(guidance).toHaveProperty('description');
      expect(guidance).toHaveProperty('steps');
      expect(guidance).toHaveProperty('resources');
      expect(guidance.steps.length).toBeGreaterThan(0);
    });
  });
});
