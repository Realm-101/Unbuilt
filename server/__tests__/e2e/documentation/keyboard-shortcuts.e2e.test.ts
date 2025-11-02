/**
 * Keyboard Shortcuts Validation E2E Tests
 * 
 * Tests all keyboard shortcuts documented in USER_GUIDE.md to ensure
 * they function correctly and match the documentation.
 * 
 * Requirements: 14.1
 * 
 * Documented Shortcuts:
 * Global:
 * - Ctrl/Cmd + K - Global search
 * - Ctrl/Cmd + N - New gap analysis
 * - Ctrl/Cmd + / - Show shortcuts
 * - Esc - Close dialogs/modals
 * 
 * Navigation:
 * - Ctrl/Cmd + 1 - Dashboard
 * - Ctrl/Cmd + 2 - Resources
 * - Ctrl/Cmd + 3 - Projects
 * - Ctrl/Cmd + 4 - Settings
 * 
 * Search Results:
 * - E - Expand all sections
 * - C - Collapse all sections
 * - F - Toggle favorite
 * - S - Share result
 * 
 * Conversations:
 * - Ctrl/Cmd + Enter - Send message
 * - ↑ - Edit last message
 * - Ctrl/Cmd + Shift + C - Clear conversation
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/login.page';
import { DashboardPage } from '../../page-objects/dashboard.page';
import { SearchPage } from '../../page-objects/search.page';
import { SearchResultsPage } from '../../page-objects/search-results.page';
import { ConversationPage } from '../../page-objects/conversation.page';
import { UserFactory } from '../../fixtures/user.factory';

// Helper to get the correct modifier key based on platform
const getModifierKey = (page: any) => {
  const platform = process.platform;
  return platform === 'darwin' ? 'Meta' : 'Control';
};

test.describe('Keyboard Shortcuts Validation', () => {
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

  test.describe('Global Shortcuts', () => {
    test('Ctrl/Cmd + K should open global search', async ({ page }) => {
      const modifier = getModifierKey(page);
      
      // Press Ctrl/Cmd + K
      await page.keyboard.press(`${modifier}+KeyK`);
      
      // Verify global search is visible
      const searchDialog = page.locator('[data-testid="global-search"]');
      await expect(searchDialog).toBeVisible({ timeout: 5000 });
    });

    test('Ctrl/Cmd + N should open new gap analysis', async ({ page }) => {
      const modifier = getModifierKey(page);
      
      // Press Ctrl/Cmd + N
      await page.keyboard.press(`${modifier}+KeyN`);
      
      // Verify we're on the new search page or dialog opened
      await expect(page).toHaveURL(/\/search\/new|\/dashboard/, { timeout: 5000 });
      
      // Check if search input is visible
      const searchInput = page.locator('[data-testid="search-input"]');
      await expect(searchInput).toBeVisible({ timeout: 5000 });
    });

    test('Ctrl/Cmd + / should show shortcuts dialog', async ({ page }) => {
      const modifier = getModifierKey(page);
      
      // Press Ctrl/Cmd + /
      await page.keyboard.press(`${modifier}+Slash`);
      
      // Verify shortcuts dialog is visible
      const shortcutsDialog = page.locator('[data-testid="shortcuts-dialog"], [role="dialog"]:has-text("Keyboard Shortcuts")');
      await expect(shortcutsDialog).toBeVisible({ timeout: 5000 });
    });

    test('Esc should close dialogs/modals', async ({ page }) => {
      const modifier = getModifierKey(page);
      
      // Open a dialog first (using Ctrl/Cmd + K)
      await page.keyboard.press(`${modifier}+KeyK`);
      
      // Verify dialog is open
      const searchDialog = page.locator('[data-testid="global-search"]');
      await expect(searchDialog).toBeVisible({ timeout: 5000 });
      
      // Press Esc
      await page.keyboard.press('Escape');
      
      // Verify dialog is closed
      await expect(searchDialog).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Navigation Shortcuts', () => {
    test('Ctrl/Cmd + 1 should navigate to Dashboard', async ({ page }) => {
      const modifier = getModifierKey(page);
      
      // Navigate away from dashboard first
      await page.goto('/resources');
      await page.waitForLoadState('networkidle');
      
      // Press Ctrl/Cmd + 1
      await page.keyboard.press(`${modifier}+Digit1`);
      
      // Verify we're on dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
    });

    test('Ctrl/Cmd + 2 should navigate to Resources', async ({ page }) => {
      const modifier = getModifierKey(page);
      
      // Press Ctrl/Cmd + 2
      await page.keyboard.press(`${modifier}+Digit2`);
      
      // Verify we're on resources page
      await expect(page).toHaveURL(/\/resources/, { timeout: 5000 });
    });

    test('Ctrl/Cmd + 3 should navigate to Projects', async ({ page }) => {
      const modifier = getModifierKey(page);
      
      // Press Ctrl/Cmd + 3
      await page.keyboard.press(`${modifier}+Digit3`);
      
      // Verify we're on projects page
      await expect(page).toHaveURL(/\/projects/, { timeout: 5000 });
    });

    test('Ctrl/Cmd + 4 should navigate to Settings', async ({ page }) => {
      const modifier = getModifierKey(page);
      
      // Press Ctrl/Cmd + 4
      await page.keyboard.press(`${modifier}+Digit4`);
      
      // Verify we're on settings page
      await expect(page).toHaveURL(/\/settings/, { timeout: 5000 });
    });
  });

  test.describe('Search Results Shortcuts', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to a search result page
      // For now, we'll navigate to a mock search result or create one
      await page.goto('/search/1');
      await page.waitForLoadState('networkidle');
    });

    test('E should expand all sections', async ({ page }) => {
      // Press E
      await page.keyboard.press('KeyE');
      
      // Verify all collapsible sections are expanded
      const collapsedSections = page.locator('[data-testid*="section"][aria-expanded="false"]');
      const count = await collapsedSections.count();
      
      // All sections should be expanded (count should be 0)
      expect(count).toBe(0);
    });

    test('C should collapse all sections', async ({ page }) => {
      // First expand all
      await page.keyboard.press('KeyE');
      await page.waitForTimeout(500);
      
      // Then press C to collapse
      await page.keyboard.press('KeyC');
      
      // Verify all collapsible sections are collapsed
      const expandedSections = page.locator('[data-testid*="section"][aria-expanded="true"]');
      const count = await expandedSections.count();
      
      // All sections should be collapsed (count should be 0)
      expect(count).toBe(0);
    });

    test('F should toggle favorite', async ({ page }) => {
      // Get initial favorite state
      const favoriteButton = page.locator('[data-testid="favorite-button"]');
      const initialState = await favoriteButton.getAttribute('aria-pressed');
      
      // Press F
      await page.keyboard.press('KeyF');
      await page.waitForTimeout(500);
      
      // Verify favorite state changed
      const newState = await favoriteButton.getAttribute('aria-pressed');
      expect(newState).not.toBe(initialState);
    });

    test('S should open share dialog', async ({ page }) => {
      // Press S
      await page.keyboard.press('KeyS');
      
      // Verify share dialog is visible
      const shareDialog = page.locator('[data-testid="share-dialog"], [role="dialog"]:has-text("Share")');
      await expect(shareDialog).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Conversation Shortcuts', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to a conversation page
      await page.goto('/conversation/1');
      await page.waitForLoadState('networkidle');
    });

    test('Ctrl/Cmd + Enter should send message', async ({ page }) => {
      const modifier = getModifierKey(page);
      
      // Type a message
      const messageInput = page.locator('[data-testid="message-input"]');
      await messageInput.fill('Test message');
      
      // Press Ctrl/Cmd + Enter
      await page.keyboard.press(`${modifier}+Enter`);
      
      // Verify message was sent (input should be cleared)
      await expect(messageInput).toHaveValue('');
      
      // Verify message appears in conversation
      const lastMessage = page.locator('[data-testid="message"]').last();
      await expect(lastMessage).toContainText('Test message');
    });

    test('↑ should edit last message', async ({ page }) => {
      // Send a message first
      const messageInput = page.locator('[data-testid="message-input"]');
      await messageInput.fill('Original message');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      
      // Press ↑
      await page.keyboard.press('ArrowUp');
      
      // Verify input is populated with last message for editing
      await expect(messageInput).toHaveValue('Original message');
    });

    test('Ctrl/Cmd + Shift + C should clear conversation', async ({ page }) => {
      const modifier = getModifierKey(page);
      
      // Get initial message count
      const messages = page.locator('[data-testid="message"]');
      const initialCount = await messages.count();
      
      // Press Ctrl/Cmd + Shift + C
      await page.keyboard.press(`${modifier}+Shift+KeyC`);
      
      // Confirm clear action if dialog appears
      const confirmButton = page.locator('[data-testid="confirm-clear"], button:has-text("Clear")');
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
      }
      
      await page.waitForTimeout(500);
      
      // Verify conversation is cleared
      const newCount = await messages.count();
      expect(newCount).toBeLessThan(initialCount);
    });
  });

  test.describe('Shortcut Conflicts', () => {
    test('should not have conflicting shortcuts', async ({ page }) => {
      // This test verifies that shortcuts don't conflict with browser defaults
      // or with each other
      
      const modifier = getModifierKey(page);
      
      // Test that our shortcuts don't trigger browser actions
      // For example, Ctrl+N shouldn't open a new browser window
      await page.keyboard.press(`${modifier}+KeyN`);
      
      // Verify we're still on the same page (not a new window)
      const pages = page.context().pages();
      expect(pages.length).toBe(1);
      
      // Verify our action happened (search dialog opened)
      const searchInput = page.locator('[data-testid="search-input"]');
      await expect(searchInput).toBeVisible({ timeout: 5000 });
    });

    test('should handle rapid shortcut presses', async ({ page }) => {
      const modifier = getModifierKey(page);
      
      // Rapidly press multiple shortcuts
      await page.keyboard.press(`${modifier}+KeyK`);
      await page.keyboard.press('Escape');
      await page.keyboard.press(`${modifier}+Digit1`);
      await page.keyboard.press(`${modifier}+Digit2`);
      
      // Verify we end up on the expected page (Resources from Ctrl+2)
      await expect(page).toHaveURL(/\/resources/, { timeout: 5000 });
    });

    test('should work with focus in different elements', async ({ page }) => {
      const modifier = getModifierKey(page);
      
      // Focus on a text input
      const searchBar = page.locator('[data-testid="dashboard-search"]').first();
      if (await searchBar.isVisible({ timeout: 2000 })) {
        await searchBar.click();
      }
      
      // Try navigation shortcut while focused on input
      await page.keyboard.press(`${modifier}+Digit2`);
      
      // Verify navigation still works
      await expect(page).toHaveURL(/\/resources/, { timeout: 5000 });
    });
  });

  test.describe('Accessibility', () => {
    test('shortcuts should be discoverable', async ({ page }) => {
      const modifier = getModifierKey(page);
      
      // Open shortcuts dialog
      await page.keyboard.press(`${modifier}+Slash`);
      
      // Verify all documented shortcuts are listed
      const shortcutsDialog = page.locator('[data-testid="shortcuts-dialog"], [role="dialog"]:has-text("Keyboard Shortcuts")');
      await expect(shortcutsDialog).toBeVisible();
      
      // Check for key shortcut categories
      await expect(shortcutsDialog).toContainText('Global');
      await expect(shortcutsDialog).toContainText('Navigation');
    });

    test('shortcuts should work with screen readers', async ({ page }) => {
      // Verify shortcuts have proper ARIA labels
      const modifier = getModifierKey(page);
      
      await page.keyboard.press(`${modifier}+Slash`);
      
      const shortcutsDialog = page.locator('[role="dialog"]');
      await expect(shortcutsDialog).toHaveAttribute('aria-label');
    });
  });
})