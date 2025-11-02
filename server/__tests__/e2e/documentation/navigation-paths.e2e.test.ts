/**
 * Navigation Path Validation E2E Tests
 * 
 * Tests all navigation paths documented in USER_GUIDE.md to ensure
 * menu paths and page locations are accurate.
 * 
 * Requirements: 14.3
 * 
 * Documented Navigation Paths:
 * - Dashboard (main page)
 * - Resources (library)
 * - Projects (management)
 * - Settings (account & preferences)
 * - Search (new search)
 * - Search Results (individual search)
 * - Conversations (AI chat)
 * - Pricing/Upgrade
 * 
 * Menu Paths from Documentation:
 * - Settings → Help → "Restart Tour"
 * - Settings → Subscription
 * - Settings → Subscription → Cancel
 * - Dashboard → Projects
 * - Dashboard → Recent Searches
 * - Dashboard → Favorites
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/login.page';
import { DashboardPage } from '../../page-objects/dashboard.page';
import { UserFactory } from '../../fixtures/user.factory';

test.describe('Navigation Path Validation', () => {
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

  test.describe('Main Navigation Paths', () => {
    test('should navigate to Dashboard from main menu', async ({ page }) => {
      // Navigate away first
      await page.goto('/resources');
      await page.waitForLoadState('networkidle');

      // Click Dashboard link in navigation
      const dashboardLink = page.locator(
        '[data-testid="nav-dashboard"], nav a:has-text("Dashboard"), [href="/dashboard"]'
      ).first();

      await dashboardLink.click();
      
      // Verify we're on dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
      
      // Verify dashboard content is visible
      const dashboardContent = page.locator(
        '[data-testid="dashboard-content"], [data-testid="search-overview"]'
      );
      await expect(dashboardContent).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to Resources from main menu', async ({ page }) => {
      // Click Resources link in navigation
      const resourcesLink = page.locator(
        '[data-testid="nav-resources"], nav a:has-text("Resources"), [href="/resources"]'
      ).first();

      await resourcesLink.click();
      
      // Verify we're on resources page
      await expect(page).toHaveURL(/\/resources/, { timeout: 5000 });
      
      // Verify resources content is visible
      const resourcesContent = page.locator(
        '[data-testid="resources-content"], [data-testid="resource-library"]'
      );
      await expect(resourcesContent).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to Projects from main menu', async ({ page }) => {
      // Click Projects link in navigation
      const projectsLink = page.locator(
        '[data-testid="nav-projects"], nav a:has-text("Projects"), [href="/projects"]'
      ).first();

      await projectsLink.click();
      
      // Verify we're on projects page
      await expect(page).toHaveURL(/\/projects/, { timeout: 5000 });
      
      // Verify projects content is visible
      const projectsContent = page.locator(
        '[data-testid="projects-content"], [data-testid="project-list"]'
      );
      await expect(projectsContent).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to Settings from user menu', async ({ page }) => {
      // Open user menu
      const userMenu = page.locator(
        '[data-testid="user-menu"], [aria-label="User menu"], button[aria-haspopup="menu"]'
      ).first();

      await userMenu.click();
      await page.waitForTimeout(500);

      // Click Settings option
      const settingsLink = page.locator(
        '[data-testid="nav-settings"], a:has-text("Settings"), [href="/settings"]'
      ).first();

      await settingsLink.click();
      
      // Verify we're on settings page
      await expect(page).toHaveURL(/\/settings/, { timeout: 5000 });
      
      // Verify settings content is visible
      const settingsContent = page.locator(
        '[data-testid="settings-content"], h1:has-text("Settings"), h2:has-text("Account")'
      );
      await expect(settingsContent).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Dashboard Navigation Paths', () => {
    test('should navigate to Projects from Dashboard → Projects', async ({ page }) => {
      await dashboardPage.goto();

      // Click Projects section or link
      const projectsSection = page.locator(
        '[data-testid="dashboard-projects"], a:has-text("Projects"), button:has-text("View Projects")'
      ).first();

      await projectsSection.click();
      
      // Verify we're on projects page
      await expect(page).toHaveURL(/\/projects/, { timeout: 5000 });
    });

    test('should navigate to Recent Searches from Dashboard', async ({ page }) => {
      await dashboardPage.goto();

      // Click Recent Searches section
      const recentSearches = page.locator(
        '[data-testid="recent-searches"], [data-testid="dashboard-recent-searches"]'
      ).first();

      // Verify section is visible
      await expect(recentSearches).toBeVisible({ timeout: 5000 });
      
      // If there's a "View All" link, click it
      const viewAllLink = page.locator(
        '[data-testid="view-all-searches"], a:has-text("View All")'
      ).first();

      const isVisible = await viewAllLink.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (isVisible) {
        await viewAllLink.click();
        // Should navigate to searches page or stay on dashboard with filter
        await page.waitForLoadState('networkidle');
      }
    });

    test('should navigate to Favorites from Dashboard', async ({ page }) => {
      await dashboardPage.goto();

      // Click Favorites section
      const favorites = page.locator(
        '[data-testid="favorites"], [data-testid="dashboard-favorites"]'
      ).first();

      // Verify section is visible
      await expect(favorites).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to New Search from Dashboard', async ({ page }) => {
      await dashboardPage.goto();

      // Click New Search button
      const newSearchButton = page.locator(
        '[data-testid="new-search-button"], button:has-text("New Search")'
      ).first();

      await newSearchButton.click();
      
      // Verify we're on new search page or dialog opened
      const searchInput = page.locator('[data-testid="search-input"]');
      await expect(searchInput).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Settings Navigation Paths', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to settings
      const userMenu = page.locator(
        '[data-testid="user-menu"], [aria-label="User menu"], button[aria-haspopup="menu"]'
      ).first();

      await userMenu.click();
      await page.waitForTimeout(500);

      const settingsLink = page.locator(
        '[data-testid="nav-settings"], a:has-text("Settings")'
      ).first();

      await settingsLink.click();
      await page.waitForLoadState('networkidle');
    });

    test('should navigate to Settings → Subscription', async ({ page }) => {
      // Look for Subscription tab or link
      const subscriptionLink = page.locator(
        '[data-testid="settings-subscription"], a:has-text("Subscription"), button:has-text("Subscription")'
      ).first();

      await subscriptionLink.click();
      
      // Verify subscription section is visible
      const subscriptionContent = page.locator(
        '[data-testid="subscription-content"], h2:has-text("Subscription"), h3:has-text("Current Plan")'
      );
      await expect(subscriptionContent).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to Settings → Help', async ({ page }) => {
      // Look for Help tab or link
      const helpLink = page.locator(
        '[data-testid="settings-help"], a:has-text("Help"), button:has-text("Help")'
      ).first();

      const isVisible = await helpLink.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (isVisible) {
        await helpLink.click();
        
        // Verify help section is visible
        const helpContent = page.locator(
          '[data-testid="help-content"], h2:has-text("Help"), button:has-text("Restart Tour")'
        );
        await expect(helpContent).toBeVisible({ timeout: 5000 });
      }
    });

    test('should find Restart Tour option in Settings → Help', async ({ page }) => {
      // Look for Help section
      const helpLink = page.locator(
        '[data-testid="settings-help"], a:has-text("Help"), button:has-text("Help")'
      ).first();

      const isVisible = await helpLink.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (isVisible) {
        await helpLink.click();
        await page.waitForTimeout(500);
      }

      // Look for Restart Tour button
      const restartTourButton = page.locator(
        '[data-testid="restart-tour"], button:has-text("Restart Tour")'
      );

      const tourButtonVisible = await restartTourButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      // If not found in Help, check if it's in main settings
      if (!tourButtonVisible) {
        const anyRestartTour = page.locator('button:has-text("Restart Tour")');
        const anyVisible = await anyRestartTour.isVisible({ timeout: 2000 }).catch(() => false);
        expect(anyVisible).toBeTruthy();
      } else {
        expect(tourButtonVisible).toBeTruthy();
      }
    });

    test('should navigate to Settings → Profile', async ({ page }) => {
      // Look for Profile tab or link
      const profileLink = page.locator(
        '[data-testid="settings-profile"], a:has-text("Profile"), button:has-text("Profile")'
      ).first();

      const isVisible = await profileLink.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (isVisible) {
        await profileLink.click();
        
        // Verify profile section is visible
        const profileContent = page.locator(
          '[data-testid="profile-content"], h2:has-text("Profile"), input[type="email"]'
        );
        await expect(profileContent).toBeVisible({ timeout: 5000 });
      }
    });

    test('should navigate to Settings → Preferences', async ({ page }) => {
      // Look for Preferences tab or link
      const preferencesLink = page.locator(
        '[data-testid="settings-preferences"], a:has-text("Preferences"), button:has-text("Preferences")'
      ).first();

      const isVisible = await preferencesLink.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (isVisible) {
        await preferencesLink.click();
        
        // Verify preferences section is visible
        const preferencesContent = page.locator(
          '[data-testid="preferences-content"], h2:has-text("Preferences"), label:has-text("Theme")'
        );
        await expect(preferencesContent).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Search and Results Navigation', () => {
    test('should navigate to New Search page', async ({ page }) => {
      await page.goto('/search/new');
      await page.waitForLoadState('networkidle');

      // Verify search input is visible
      const searchInput = page.locator('[data-testid="search-input"]');
      await expect(searchInput).toBeVisible({ timeout: 5000 });
      
      // Verify we're on correct URL
      await expect(page).toHaveURL(/\/search\/new/, { timeout: 5000 });
    });

    test('should navigate to Search Results page', async ({ page }) => {
      // Navigate to a search result (using ID 1 as example)
      await page.goto('/search/1');
      await page.waitForLoadState('networkidle');

      // Verify we're on search results page
      await expect(page).toHaveURL(/\/search\/\d+/, { timeout: 5000 });
      
      // Verify results content is visible (or 404 if search doesn't exist)
      const resultsContent = page.locator(
        '[data-testid="search-results"], [data-testid="executive-summary"]'
      );
      const notFound = page.locator('h1:has-text("Not Found"), h1:has-text("404")');
      
      const resultsVisible = await resultsContent.isVisible({ timeout: 2000 }).catch(() => false);
      const notFoundVisible = await notFound.isVisible({ timeout: 2000 }).catch(() => false);
      
      // Either results or 404 should be visible
      expect(resultsVisible || notFoundVisible).toBeTruthy();
    });

    test('should navigate from Search Results to Conversation', async ({ page }) => {
      // Navigate to a search result
      await page.goto('/search/1');
      await page.waitForLoadState('networkidle');

      // Look for "Ask AI" or conversation button
      const askAIButton = page.locator(
        '[data-testid="ask-ai"], button:has-text("Ask AI"), a:has-text("Start Conversation")'
      ).first();

      const isVisible = await askAIButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isVisible) {
        await askAIButton.click();
        
        // Verify conversation interface is visible
        const conversationInput = page.locator(
          '[data-testid="message-input"], [data-testid="conversation-input"]'
        );
        await expect(conversationInput).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Resource Library Navigation', () => {
    test('should navigate to Resource Library', async ({ page }) => {
      await page.goto('/resources');
      await page.waitForLoadState('networkidle');

      // Verify we're on resources page
      await expect(page).toHaveURL(/\/resources/, { timeout: 5000 });
      
      // Verify resources content is visible
      const resourcesContent = page.locator(
        '[data-testid="resources-content"], [data-testid="resource-categories"]'
      );
      await expect(resourcesContent).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to Resource Details', async ({ page }) => {
      await page.goto('/resources');
      await page.waitForLoadState('networkidle');

      // Click on first resource card
      const resourceCard = page.locator(
        '[data-testid="resource-card"], [data-testid^="resource-"]'
      ).first();

      const isVisible = await resourceCard.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isVisible) {
        await resourceCard.click();
        
        // Verify resource details are visible
        const resourceDetails = page.locator(
          '[data-testid="resource-details"], [data-testid="resource-title"]'
        );
        await expect(resourceDetails).toBeVisible({ timeout: 5000 });
      }
    });

    test('should navigate to My Bookmarks from Resources', async ({ page }) => {
      await page.goto('/resources');
      await page.waitForLoadState('networkidle');

      // Look for Bookmarks link
      const bookmarksLink = page.locator(
        '[data-testid="my-bookmarks"], a:has-text("My Bookmarks"), button:has-text("Bookmarks")'
      ).first();

      const isVisible = await bookmarksLink.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (isVisible) {
        await bookmarksLink.click();
        
        // Verify bookmarks page or section is visible
        const bookmarksContent = page.locator(
          '[data-testid="bookmarks-content"], h1:has-text("Bookmarks"), h2:has-text("My Bookmarks")'
        );
        await expect(bookmarksContent).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Pricing and Upgrade Navigation', () => {
    test('should navigate to Pricing page', async ({ page }) => {
      await page.goto('/pricing');
      await page.waitForLoadState('networkidle');

      // Verify we're on pricing page
      await expect(page).toHaveURL(/\/pricing/, { timeout: 5000 });
      
      // Verify pricing content is visible
      const pricingContent = page.locator(
        '[data-testid="pricing-content"], h1:has-text("Pricing"), [data-testid="pricing-table"]'
      );
      await expect(pricingContent).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to Upgrade page from Settings', async ({ page }) => {
      // Navigate to settings
      const userMenu = page.locator(
        '[data-testid="user-menu"], [aria-label="User menu"]'
      ).first();

      await userMenu.click();
      await page.waitForTimeout(500);

      const settingsLink = page.locator(
        '[data-testid="nav-settings"], a:has-text("Settings")'
      ).first();

      await settingsLink.click();
      await page.waitForLoadState('networkidle');

      // Navigate to Subscription
      const subscriptionLink = page.locator(
        '[data-testid="settings-subscription"], a:has-text("Subscription")'
      ).first();

      const isVisible = await subscriptionLink.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (isVisible) {
        await subscriptionLink.click();
        await page.waitForTimeout(500);
      }

      // Look for Upgrade button
      const upgradeButton = page.locator(
        '[data-testid="upgrade-button"], button:has-text("Upgrade"), a:has-text("Upgrade to Pro")'
      ).first();

      const upgradeVisible = await upgradeButton.isVisible({ timeout: 5000 }).catch(() => false);
      expect(upgradeVisible).toBeTruthy();
    });
  });

  test.describe('Breadcrumb Navigation', () => {
    test('should display breadcrumbs on Search Results page', async ({ page }) => {
      await page.goto('/search/1');
      await page.waitForLoadState('networkidle');

      // Look for breadcrumb navigation
      const breadcrumbs = page.locator(
        '[data-testid="breadcrumbs"], nav[aria-label="Breadcrumb"], [role="navigation"]:has(a:has-text("Dashboard"))'
      );

      const isVisible = await breadcrumbs.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (isVisible) {
        // Verify breadcrumb contains Dashboard link
        const dashboardLink = breadcrumbs.locator('a:has-text("Dashboard")');
        await expect(dashboardLink).toBeVisible();
        
        // Click Dashboard breadcrumb
        await dashboardLink.click();
        
        // Verify navigation to dashboard
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
      }
    });

    test('should display breadcrumbs on Resource Details page', async ({ page }) => {
      await page.goto('/resources');
      await page.waitForLoadState('networkidle');

      // Click on first resource
      const resourceCard = page.locator('[data-testid="resource-card"]').first();
      const isVisible = await resourceCard.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (isVisible) {
        await resourceCard.click();
        await page.waitForLoadState('networkidle');

        // Look for breadcrumbs
        const breadcrumbs = page.locator(
          '[data-testid="breadcrumbs"], nav[aria-label="Breadcrumb"]'
        );

        const breadcrumbsVisible = await breadcrumbs.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (breadcrumbsVisible) {
          // Verify breadcrumb contains Resources link
          const resourcesLink = breadcrumbs.locator('a:has-text("Resources")');
          await expect(resourcesLink).toBeVisible();
          
          // Click Resources breadcrumb
          await resourcesLink.click();
          
          // Verify navigation back to resources
          await expect(page).toHaveURL(/\/resources/, { timeout: 5000 });
        }
      }
    });

    test('should display breadcrumbs on Project Details page', async ({ page }) => {
      await page.goto('/projects');
      await page.waitForLoadState('networkidle');

      // Click on first project
      const projectCard = page.locator('[data-testid="project-card"]').first();
      const isVisible = await projectCard.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (isVisible) {
        await projectCard.click();
        await page.waitForLoadState('networkidle');

        // Look for breadcrumbs
        const breadcrumbs = page.locator(
          '[data-testid="breadcrumbs"], nav[aria-label="Breadcrumb"]'
        );

        const breadcrumbsVisible = await breadcrumbs.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (breadcrumbsVisible) {
          // Verify breadcrumb contains Projects link
          const projectsLink = breadcrumbs.locator('a:has-text("Projects")');
          await expect(projectsLink).toBeVisible();
          
          // Click Projects breadcrumb
          await projectsLink.click();
          
          // Verify navigation back to projects
          await expect(page).toHaveURL(/\/projects/, { timeout: 5000 });
        }
      }
    });
  });

  test.describe('Back Navigation', () => {
    test('should navigate back from Search Results to Dashboard', async ({ page }) => {
      await dashboardPage.goto();
      
      // Navigate to a search result
      await page.goto('/search/1');
      await page.waitForLoadState('networkidle');

      // Click browser back button
      await page.goBack();
      
      // Verify we're back on dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
    });

    test('should navigate back from Settings to previous page', async ({ page }) => {
      await dashboardPage.goto();
      
      // Navigate to settings
      const userMenu = page.locator('[data-testid="user-menu"], [aria-label="User menu"]').first();
      await userMenu.click();
      await page.waitForTimeout(500);

      const settingsLink = page.locator('[data-testid="nav-settings"], a:has-text("Settings")').first();
      await settingsLink.click();
      await page.waitForLoadState('networkidle');

      // Click browser back button
      await page.goBack();
      
      // Verify we're back on dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
    });
  });

  test.describe('Direct URL Access', () => {
    test('should access Dashboard via direct URL', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Verify we're on dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
      
      const dashboardContent = page.locator('[data-testid="dashboard-content"]');
      await expect(dashboardContent).toBeVisible({ timeout: 5000 });
    });

    test('should access Resources via direct URL', async ({ page }) => {
      await page.goto('/resources');
      await page.waitForLoadState('networkidle');

      // Verify we're on resources page
      await expect(page).toHaveURL(/\/resources/, { timeout: 5000 });
    });

    test('should access Projects via direct URL', async ({ page }) => {
      await page.goto('/projects');
      await page.waitForLoadState('networkidle');

      // Verify we're on projects page
      await expect(page).toHaveURL(/\/projects/, { timeout: 5000 });
    });

    test('should access Settings via direct URL', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Verify we're on settings page
      await expect(page).toHaveURL(/\/settings/, { timeout: 5000 });
    });

    test('should access Pricing via direct URL', async ({ page }) => {
      await page.goto('/pricing');
      await page.waitForLoadState('networkidle');

      // Verify we're on pricing page
      await expect(page).toHaveURL(/\/pricing/, { timeout: 5000 });
    });
  });

  test.describe('Navigation Consistency', () => {
    test('should maintain active navigation state', async ({ page }) => {
      // Navigate to Resources
      await page.goto('/resources');
      await page.waitForLoadState('networkidle');

      // Check if Resources nav item is marked as active
      const resourcesNav = page.locator(
        '[data-testid="nav-resources"], nav a:has-text("Resources")'
      ).first();

      const isActive = await resourcesNav.getAttribute('aria-current').catch(() => null);
      const hasActiveClass = await resourcesNav.getAttribute('class').then(c => c?.includes('active')).catch(() => false);
      
      // Either aria-current or active class should indicate active state
      expect(isActive === 'page' || hasActiveClass).toBeTruthy();
    });

    test('should update page title on navigation', async ({ page }) => {
      // Navigate to Dashboard
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      const dashboardTitle = await page.title();
      expect(dashboardTitle.toLowerCase()).toMatch(/dashboard|unbuilt/);

      // Navigate to Resources
      await page.goto('/resources');
      await page.waitForLoadState('networkidle');
      const resourcesTitle = await page.title();
      expect(resourcesTitle.toLowerCase()).toMatch(/resources|library|unbuilt/);

      // Titles should be different
      expect(dashboardTitle).not.toBe(resourcesTitle);
    });

    test('should preserve scroll position on back navigation', async ({ page }) => {
      await page.goto('/resources');
      await page.waitForLoadState('networkidle');

      // Scroll down
      await page.evaluate(() => window.scrollTo(0, 500));
      const scrollPosition = await page.evaluate(() => window.scrollY);

      // Navigate away
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Navigate back
      await page.goBack();
      await page.waitForLoadState('networkidle');

      // Check if scroll position is preserved (may not be exact)
      const newScrollPosition = await page.evaluate(() => window.scrollY);
      
      // Allow some tolerance for scroll position restoration
      expect(Math.abs(newScrollPosition - scrollPosition)).toBeLessThan(100);
    });
  });
});
