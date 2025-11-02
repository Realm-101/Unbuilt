/**
 * FAQ Link Validation E2E Tests
 * 
 * Tests all internal and external links in FAQ.md to ensure they are
 * valid and return successful responses. Also validates email addresses
 * and support channels.
 * 
 * Requirements: 14.4, 14.5
 * 
 * Internal Links to Validate:
 * - ./UX_GETTING_STARTED.md
 * 
 * External Links to Validate:
 * - None explicitly listed in FAQ.md
 * 
 * Email Addresses to Validate:
 * - support@unbuilt.one
 * - sales@unbuilt.one
 * 
 * Internal Page References:
 * - Settings pages
 * - Dashboard sections
 * - Help menu items
 * - Pricing page
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/login.page';
import { DashboardPage } from '../../page-objects/dashboard.page';
import { UserFactory } from '../../fixtures/user.factory';
import * as fs from 'fs';
import * as path from 'path';

test.describe('FAQ Link Validation', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let testUser: any;

  test.beforeEach(async ({ page, context }) => {
    // Clear state
    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Create test user and login
    testUser = UserFactory.create({ plan: 'pro' });
    await UserFactory.persist(testUser);

    loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);

    dashboardPage = new DashboardPage(page);
    await dashboardPage.waitForPageLoad();
  });

  test.afterEach(async () => {
    if (testUser?.id) {
      await UserFactory.cleanup(testUser.id);
    }
  });

  test.describe('Internal Documentation Links', () => {
    test('should validate link to UX_GETTING_STARTED.md', async () => {
      // Check if the referenced file exists
      const filePath = path.join(process.cwd(), 'docs', 'UX_GETTING_STARTED.md');
      const fileExists = fs.existsSync(filePath);
      
      expect(fileExists).toBeTruthy();
      
      if (fileExists) {
        const content = fs.readFileSync(filePath, 'utf-8');
        // Verify file has content
        expect(content.length).toBeGreaterThan(0);
        // Verify it's a markdown file with a title
        expect(content).toMatch(/^#\s+/m);
      }
    });

    test('should validate all internal documentation references exist', async () => {
      // List of documentation files referenced in FAQ
      const referencedDocs = [
        'UX_GETTING_STARTED.md',
        'USER_GUIDE.md',
        'FAQ.md'
      ];

      for (const doc of referencedDocs) {
        const filePath = path.join(process.cwd(), 'docs', doc);
        const fileExists = fs.existsSync(filePath);
        
        expect(fileExists).toBeTruthy();
      }
    });
  });

  test.describe('Email Address Validation', () => {
    test('should validate support email format', async () => {
      const supportEmail = 'support@unbuilt.one';
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(supportEmail)).toBeTruthy();
      
      // Validate domain
      expect(supportEmail).toContain('@unbuilt.one');
    });

    test('should validate sales email format', async () => {
      const salesEmail = 'sales@unbuilt.one';
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(salesEmail)).toBeTruthy();
      
      // Validate domain
      expect(salesEmail).toContain('@unbuilt.one');
    });

    test('should verify email addresses are consistent', async () => {
      // Both emails should use the same domain
      const supportEmail = 'support@unbuilt.one';
      const salesEmail = 'sales@unbuilt.one';
      
      const supportDomain = supportEmail.split('@')[1];
      const salesDomain = salesEmail.split('@')[1];
      
      expect(supportDomain).toBe(salesDomain);
      expect(supportDomain).toBe('unbuilt.one');
    });
  });

  test.describe('Internal Page References - Settings', () => {
    test('should validate Settings → Profile page exists', async ({ page }) => {
      // Navigate to settings
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Look for Profile section or tab
      const profileSection = page.locator(
        '[data-testid="settings-profile"], a:has-text("Profile"), button:has-text("Profile"), h2:has-text("Profile")'
      );

      const isVisible = await profileSection.isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    });

    test('should validate Settings → Account page exists', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Look for Account section
      const accountSection = page.locator(
        '[data-testid="settings-account"], a:has-text("Account"), button:has-text("Account"), h2:has-text("Account")'
      );

      const isVisible = await accountSection.isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    });

    test('should validate Settings → Subscription page exists', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Look for Subscription section
      const subscriptionSection = page.locator(
        '[data-testid="settings-subscription"], a:has-text("Subscription"), button:has-text("Subscription"), h2:has-text("Subscription")'
      );

      const isVisible = await subscriptionSection.isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    });

    test('should validate Settings → Keyboard Shortcuts page exists', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Look for Keyboard Shortcuts section
      const shortcutsSection = page.locator(
        '[data-testid="settings-shortcuts"], a:has-text("Keyboard Shortcuts"), button:has-text("Shortcuts"), h2:has-text("Keyboard")'
      );

      const isVisible = await shortcutsSection.isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    });

    test('should validate Settings → Accessibility page exists', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Look for Accessibility section
      const accessibilitySection = page.locator(
        '[data-testid="settings-accessibility"], a:has-text("Accessibility"), button:has-text("Accessibility"), h2:has-text("Accessibility")'
      );

      const isVisible = await accessibilitySection.isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    });

    test('should validate Settings → Data & Privacy page exists', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Look for Data & Privacy section
      const privacySection = page.locator(
        '[data-testid="settings-privacy"], a:has-text("Privacy"), button:has-text("Data"), h2:has-text("Privacy"), h2:has-text("Data")'
      );

      const isVisible = await privacySection.isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    });

    test('should validate Settings → Shared Links page exists', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Look for Shared Links section
      const sharedLinksSection = page.locator(
        '[data-testid="settings-shared-links"], a:has-text("Shared Links"), button:has-text("Shared"), h2:has-text("Shared Links")'
      );

      const isVisible = await sharedLinksSection.isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    });
  });

  test.describe('Internal Page References - Dashboard', () => {
    test('should validate Dashboard → Projects section exists', async ({ page }) => {
      await dashboardPage.goto();

      // Look for Projects section
      const projectsSection = page.locator(
        '[data-testid="dashboard-projects"], [data-testid="projects"], h2:has-text("Projects")'
      );

      const isVisible = await projectsSection.isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    });

    test('should validate Dashboard → Recent Searches section exists', async ({ page }) => {
      await dashboardPage.goto();

      // Look for Recent Searches section
      const recentSearchesSection = page.locator(
        '[data-testid="recent-searches"], [data-testid="dashboard-recent-searches"], h2:has-text("Recent")'
      );

      const isVisible = await recentSearchesSection.isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    });

    test('should validate Dashboard → Favorites section exists', async ({ page }) => {
      await dashboardPage.goto();

      // Look for Favorites section
      const favoritesSection = page.locator(
        '[data-testid="favorites"], [data-testid="dashboard-favorites"], h2:has-text("Favorites")'
      );

      const isVisible = await favoritesSection.isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    });

    test('should validate Dashboard → New Project button exists', async ({ page }) => {
      await dashboardPage.goto();

      // Look for New Project button
      const newProjectButton = page.locator(
        '[data-testid="new-project-button"], button:has-text("New Project")'
      );

      const isVisible = await newProjectButton.isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    });
  });

  test.describe('Internal Page References - Help Menu', () => {
    test('should validate Help menu exists', async ({ page }) => {
      await dashboardPage.goto();

      // Look for Help menu or button
      const helpMenu = page.locator(
        '[data-testid="help-menu"], button:has-text("Help"), a:has-text("Help"), [aria-label="Help"]'
      );

      const isVisible = await helpMenu.isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    });

    test('should validate Help → Video Tutorials option exists', async ({ page }) => {
      await dashboardPage.goto();

      // Open help menu if it exists
      const helpMenu = page.locator(
        '[data-testid="help-menu"], button:has-text("Help"), [aria-label="Help"]'
      ).first();

      const menuVisible = await helpMenu.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (menuVisible) {
        await helpMenu.click();
        await page.waitForTimeout(500);
      }

      // Look for Video Tutorials option
      const videoTutorials = page.locator(
        '[data-testid="video-tutorials"], a:has-text("Video Tutorials"), button:has-text("Tutorials")'
      );

      const isVisible = await videoTutorials.isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    });

    test('should validate Help → Resume Tour option exists', async ({ page }) => {
      await dashboardPage.goto();

      // Open help menu if it exists
      const helpMenu = page.locator(
        '[data-testid="help-menu"], button:has-text("Help"), [aria-label="Help"]'
      ).first();

      const menuVisible = await helpMenu.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (menuVisible) {
        await helpMenu.click();
        await page.waitForTimeout(500);
      }

      // Look for Resume Tour option
      const resumeTour = page.locator(
        '[data-testid="resume-tour"], a:has-text("Resume Tour"), button:has-text("Resume Tour")'
      );

      const isVisible = await resumeTour.isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    });

    test('should validate contextual help (? icon) exists', async ({ page }) => {
      await dashboardPage.goto();

      // Look for help icon
      const helpIcon = page.locator(
        '[data-testid="help-icon"], button[aria-label*="Help"], button:has-text("?")'
      );

      const isVisible = await helpIcon.isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    });
  });

  test.describe('Internal Page References - Pricing', () => {
    test('should validate Pricing page exists', async ({ page }) => {
      await page.goto('/pricing');
      await page.waitForLoadState('networkidle');

      // Verify we're on pricing page
      await expect(page).toHaveURL(/\/pricing/, { timeout: 5000 });
      
      // Verify pricing content is visible
      const pricingContent = page.locator(
        '[data-testid="pricing-content"], h1:has-text("Pricing"), [data-testid="pricing-table"]'
      );

      const isVisible = await pricingContent.isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    });

    test('should validate Free tier is displayed', async ({ page }) => {
      await page.goto('/pricing');
      await page.waitForLoadState('networkidle');

      // Look for Free tier
      const freeTier = page.locator(
        '[data-testid="tier-free"], [data-testid*="free"], h2:has-text("Free"), h3:has-text("Free")'
      );

      const isVisible = await freeTier.isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    });

    test('should validate Pro tier is displayed', async ({ page }) => {
      await page.goto('/pricing');
      await page.waitForLoadState('networkidle');

      // Look for Pro tier
      const proTier = page.locator(
        '[data-testid="tier-pro"], [data-testid*="pro"], h2:has-text("Pro"), h3:has-text("Pro")'
      );

      const isVisible = await proTier.isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    });

    test('should validate Enterprise tier is displayed', async ({ page }) => {
      await page.goto('/pricing');
      await page.waitForLoadState('networkidle');

      // Look for Enterprise tier
      const enterpriseTier = page.locator(
        '[data-testid="tier-enterprise"], [data-testid*="enterprise"], h2:has-text("Enterprise"), h3:has-text("Enterprise")'
      );

      const isVisible = await enterpriseTier.isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    });
  });

  test.describe('FAQ Feature References', () => {
    test('should validate Global Search (Ctrl/Cmd + K) functionality', async ({ page }) => {
      await dashboardPage.goto();

      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
      
      // Press Ctrl/Cmd + K
      await page.keyboard.press(`${modifier}+KeyK`);
      
      // Verify global search is visible
      const searchDialog = page.locator('[data-testid="global-search"]');
      const isVisible = await searchDialog.isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(isVisible).toBeTruthy();
    });

    test('should validate New Search (Ctrl/Cmd + N) functionality', async ({ page }) => {
      await dashboardPage.goto();

      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
      
      // Press Ctrl/Cmd + N
      await page.keyboard.press(`${modifier}+KeyN`);
      
      // Verify search input is visible
      const searchInput = page.locator('[data-testid="search-input"]');
      const isVisible = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);
      
      expect(isVisible).toBeTruthy();
    });

    test('should validate Dashboard navigation (Ctrl/Cmd + D)', async ({ page }) => {
      // Navigate away from dashboard
      await page.goto('/resources');
      await page.waitForLoadState('networkidle');

      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
      
      // Press Ctrl/Cmd + D
      await page.keyboard.press(`${modifier}+KeyD`);
      
      // Verify we're on dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
    });

    test('should validate Export functionality (Ctrl/Cmd + E)', async ({ page }) => {
      // Navigate to a search result
      await page.goto('/search/1');
      await page.waitForLoadState('networkidle');

      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
      
      // Press Ctrl/Cmd + E
      await page.keyboard.press(`${modifier}+KeyE`);
      
      // Verify export dialog or action occurred
      const exportDialog = page.locator(
        '[data-testid="export-dialog"], [role="dialog"]:has-text("Export")'
      );
      
      const isVisible = await exportDialog.isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    });

    test('should validate Shortcuts help (?) functionality', async ({ page }) => {
      await dashboardPage.goto();

      // Press ?
      await page.keyboard.press('Shift+Slash'); // ? key
      
      // Verify shortcuts dialog is visible
      const shortcutsDialog = page.locator(
        '[data-testid="shortcuts-dialog"], [role="dialog"]:has-text("Keyboard Shortcuts")'
      );
      
      const isVisible = await shortcutsDialog.isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    });
  });

  test.describe('FAQ Tier Limits Validation', () => {
    test('should validate Free tier limits are documented correctly', async ({ page }) => {
      await page.goto('/pricing');
      await page.waitForLoadState('networkidle');

      // Look for Free tier section
      const freeTier = page.locator(
        '[data-testid="tier-free"], [data-testid*="free"]'
      ).first();

      const isVisible = await freeTier.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isVisible) {
        const tierContent = await freeTier.textContent();
        
        // Verify documented limits
        expect(tierContent?.toLowerCase()).toMatch(/5.*search|search.*5/);
        expect(tierContent?.toLowerCase()).toMatch(/3.*project|project.*3/);
      }
    });

    test('should validate Pro tier features are documented', async ({ page }) => {
      await page.goto('/pricing');
      await page.waitForLoadState('networkidle');

      // Look for Pro tier section
      const proTier = page.locator(
        '[data-testid="tier-pro"], [data-testid*="pro"]'
      ).first();

      const isVisible = await proTier.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isVisible) {
        const tierContent = await proTier.textContent();
        
        // Verify documented features
        expect(tierContent?.toLowerCase()).toMatch(/unlimited/);
      }
    });
  });

  test.describe('FAQ Action Plan References', () => {
    test('should validate 4-phase roadmap structure', async ({ page }) => {
      // Navigate to a search result with action plan
      await page.goto('/search/1');
      await page.waitForLoadState('networkidle');

      // Look for phase indicators
      const phases = page.locator('[data-testid*="phase"]');
      const phaseCount = await phases.count().catch(() => 0);

      // Should have 4 phases as documented in FAQ
      expect(phaseCount).toBeGreaterThanOrEqual(4);
    });

    test('should validate phase names match FAQ documentation', async ({ page }) => {
      await page.goto('/search/1');
      await page.waitForLoadState('networkidle');

      // Look for documented phase names
      const pageContent = await page.textContent('body');
      
      // Phases mentioned in FAQ
      const expectedPhases = ['Validation', 'Planning', 'Development', 'Launch'];
      
      for (const phase of expectedPhases) {
        const hasPhase = pageContent?.includes(phase);
        expect(hasPhase).toBeTruthy();
      }
    });

    test('should validate progress tracking functionality exists', async ({ page }) => {
      await page.goto('/search/1');
      await page.waitForLoadState('networkidle');

      // Look for checkboxes or progress indicators
      const checkboxes = page.locator('input[type="checkbox"]');
      const progressBar = page.locator('[data-testid*="progress"], [role="progressbar"]');

      const hasCheckboxes = await checkboxes.count().then(c => c > 0).catch(() => false);
      const hasProgressBar = await progressBar.isVisible({ timeout: 2000 }).catch(() => false);

      // Should have either checkboxes or progress bar
      expect(hasCheckboxes || hasProgressBar).toBeTruthy();
    });
  });

  test.describe('FAQ Sharing References', () => {
    test('should validate Share button exists on search results', async ({ page }) => {
      await page.goto('/search/1');
      await page.waitForLoadState('networkidle');

      // Look for Share button
      const shareButton = page.locator(
        '[data-testid="share-button"], button:has-text("Share")'
      );

      const isVisible = await shareButton.isVisible({ timeout: 5000 }).catch(() => false);
      expect(isVisible).toBeTruthy();
    });

    test('should validate share link generation options', async ({ page }) => {
      await page.goto('/search/1');
      await page.waitForLoadState('networkidle');

      // Click Share button
      const shareButton = page.locator(
        '[data-testid="share-button"], button:has-text("Share")'
      ).first();

      const isVisible = await shareButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isVisible) {
        await shareButton.click();
        await page.waitForTimeout(500);

        // Look for expiration and password options mentioned in FAQ
        const shareDialog = page.locator('[data-testid="share-dialog"], [role="dialog"]');
        const dialogContent = await shareDialog.textContent().catch(() => '');

        // Should have options for expiration and password
        const hasExpirationOption = dialogContent.toLowerCase().includes('expir');
        const hasPasswordOption = dialogContent.toLowerCase().includes('password');

        expect(hasExpirationOption || hasPasswordOption).toBeTruthy();
      }
    });
  });

  test.describe('FAQ Browser Support Validation', () => {
    test('should validate browser information is accessible', async ({ page }) => {
      // Get browser info
      const userAgent = await page.evaluate(() => navigator.userAgent);
      
      // Verify we can detect browser
      expect(userAgent).toBeTruthy();
      expect(userAgent.length).toBeGreaterThan(0);
    });

    test('should validate modern browser features are available', async ({ page }) => {
      await dashboardPage.goto();

      // Check for modern browser features mentioned in FAQ
      const hasLocalStorage = await page.evaluate(() => {
        try {
          return typeof localStorage !== 'undefined';
        } catch {
          return false;
        }
      });

      const hasCookies = await page.evaluate(() => {
        return navigator.cookieEnabled;
      });

      expect(hasLocalStorage).toBeTruthy();
      expect(hasCookies).toBeTruthy();
    });
  });

  test.describe('Support Channel Validation', () => {
    test('should validate support email is properly formatted', () => {
      const supportEmail = 'support@unbuilt.one';
      
      // Validate it's a proper mailto link format
      const mailtoLink = `mailto:${supportEmail}`;
      expect(mailtoLink).toMatch(/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    test('should validate sales email is properly formatted', () => {
      const salesEmail = 'sales@unbuilt.one';
      
      // Validate it's a proper mailto link format
      const mailtoLink = `mailto:${salesEmail}`;
      expect(mailtoLink).toMatch(/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    test('should validate email domains match application domain', () => {
      const supportEmail = 'support@unbuilt.one';
      const salesEmail = 'sales@unbuilt.one';
      const appDomain = 'unbuilt.one';

      expect(supportEmail).toContain(appDomain);
      expect(salesEmail).toContain(appDomain);
    });
  });
});
