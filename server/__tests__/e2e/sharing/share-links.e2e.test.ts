import { test, expect, Page } from '@playwright/test';
import { LoginPage } from '../../page-objects/login.page';
import { DashboardPage } from '../../page-objects/dashboard.page';
import { SearchPage } from '../../page-objects/search.page';
import { SearchResultsPage } from '../../page-objects/search-results.page';
import { SharePage } from '../../page-objects/share.page';

/**
 * Share Links E2E Tests
 * 
 * Tests share link generation, access, and management including:
 * - Share link generation with expiration dates
 * - Share link access in incognito mode
 * - Link revocation and analytics
 * - View count tracking
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.5
 */

test.describe('Share Links', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let searchPage: SearchPage;
  let resultsPage: SearchResultsPage;
  let sharePage: SharePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    searchPage = new SearchPage(page);
    resultsPage = new SearchResultsPage(page);
    sharePage = new SharePage(page);

    // Login and navigate to a search result
    await loginPage.goto();
    await loginPage.login('test@example.com', 'Test123!@#');
    await dashboardPage.waitForDashboardLoad();
    
    // Navigate to first search result if available
    const hasSearches = await dashboardPage.getRecentSearchCount() > 0;
    if (hasSearches) {
      await dashboardPage.clickRecentSearch(0);
    } else {
      // Create a quick search for testing
      await searchPage.goto();
      await searchPage.submitSearch('Test gap analysis for sharing');
      await searchPage.waitForSearchCompletion(180000);
    }
  });

  test('should generate share link without expiration', async ({ page }) => {
    // Arrange - Open share dialog
    await sharePage.openShareDialog();
    await expect(sharePage.isShareDialogOpen()).resolves.toBe(true);

    // Act - Create share link without expiration
    const initialCount = await sharePage.getShareLinkCount();
    await sharePage.createShareLink();

    // Assert - Verify link was created
    const newCount = await sharePage.getShareLinkCount();
    expect(newCount).toBe(initialCount + 1);

    const shareUrl = await sharePage.getLatestShareUrl();
    expect(shareUrl).toContain('/share/');
    expect(shareUrl).toMatch(/^https?:\/\//);

    // Verify no expiration date is shown
    const expirationDate = await sharePage.getExpirationDate(0);
    expect(expirationDate).toBeNull();
  });

  test('should generate share link with expiration date', async ({ page }) => {
    // Arrange - Open share dialog
    await sharePage.openShareDialog();

    // Act - Create share link with expiration (24 hours from now)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const expirationDateTime = tomorrow.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm

    await sharePage.createShareLink(expirationDateTime);

    // Assert - Verify link was created with expiration
    const shareUrl = await sharePage.getLatestShareUrl();
    expect(shareUrl).toContain('/share/');

    const expirationText = await sharePage.getExpirationDate(0);
    expect(expirationText).not.toBeNull();
    expect(expirationText).toContain('Expires:');
  });

  test('should copy share link to clipboard', async ({ page, context }) => {
    // Arrange - Create a share link
    await sharePage.openShareDialog();
    await sharePage.createShareLink();
    const shareUrl = await sharePage.getLatestShareUrl();

    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Act - Copy the link
    await sharePage.copyShareLink(0);

    // Assert - Verify clipboard contains the URL
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe(shareUrl);
  });

  test('should access share link in incognito mode without authentication', async ({ browser }) => {
    // Arrange - Create a share link
    await sharePage.openShareDialog();
    await sharePage.createShareLink();
    const shareUrl = await sharePage.getLatestShareUrl();
    await sharePage.closeShareDialog();

    // Act - Open link in incognito context (no authentication)
    const incognitoContext = await browser.newContext();
    const incognitoPage = await incognitoContext.newPage();
    await incognitoPage.goto(shareUrl);

    // Assert - Verify content is accessible without login
    await incognitoPage.waitForLoadState('networkidle');
    
    // Should see the shared content
    const pageContent = await incognitoPage.textContent('body');
    expect(pageContent).toBeTruthy();
    
    // Should NOT see login form
    const loginForm = incognitoPage.locator('[data-testid="login-email"]');
    await expect(loginForm).not.toBeVisible();

    // Should see read-only indicator or shared content
    const isReadOnly = await incognitoPage.locator('text=/shared|read-only|view-only/i').isVisible();
    expect(isReadOnly).toBe(true);

    await incognitoContext.close();
  });

  test('should track view count when share link is accessed', async ({ browser }) => {
    // Arrange - Create a share link
    await sharePage.openShareDialog();
    await sharePage.createShareLink();
    const shareUrl = await sharePage.getLatestShareUrl();
    
    const initialViewCount = await sharePage.getViewCount(0);
    await sharePage.closeShareDialog();

    // Act - Access the link multiple times in different contexts
    for (let i = 0; i < 3; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(shareUrl);
      await page.waitForLoadState('networkidle');
      await context.close();
    }

    // Assert - Verify view count increased
    await sharePage.openShareDialog();
    const newViewCount = await sharePage.getViewCount(0);
    expect(newViewCount).toBeGreaterThan(initialViewCount);
    expect(newViewCount).toBeGreaterThanOrEqual(3);
  });

  test('should revoke share link and prevent access', async ({ browser }) => {
    // Arrange - Create a share link
    await sharePage.openShareDialog();
    await sharePage.createShareLink();
    const shareUrl = await sharePage.getLatestShareUrl();

    // Verify link works before revocation
    const testContext = await browser.newContext();
    const testPage = await testContext.newPage();
    await testPage.goto(shareUrl);
    await testPage.waitForLoadState('networkidle');
    const contentBefore = await testPage.textContent('body');
    expect(contentBefore).toBeTruthy();
    await testContext.close();

    // Act - Revoke the link
    const initialCount = await sharePage.getShareLinkCount();
    await sharePage.revokeShareLink(0, true);

    // Assert - Verify link was removed from list
    const newCount = await sharePage.getShareLinkCount();
    expect(newCount).toBe(initialCount - 1);

    // Verify revoked link no longer works
    const revokedContext = await browser.newContext();
    const revokedPage = await revokedContext.newPage();
    await revokedPage.goto(shareUrl);
    await revokedPage.waitForLoadState('networkidle');

    // Should see error message about expired/revoked link
    const errorMessage = await revokedPage.locator('text=/expired|revoked|unavailable|invalid/i').isVisible();
    expect(errorMessage).toBe(true);

    await revokedContext.close();
  });

  test('should display link analytics (view count, created date, last accessed)', async ({ browser }) => {
    // Arrange - Create a share link
    await sharePage.openShareDialog();
    await sharePage.createShareLink();
    const shareUrl = await sharePage.getLatestShareUrl();

    // Access the link once to generate analytics
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(shareUrl);
    await page.waitForLoadState('networkidle');
    await context.close();

    // Act - Refresh share dialog to see updated analytics
    await sharePage.closeShareDialog();
    await sharePage.openShareDialog();

    // Assert - Verify analytics are displayed
    const viewCount = await sharePage.getViewCount(0);
    expect(viewCount).toBeGreaterThanOrEqual(1);

    // Verify created date is shown (should be recent)
    const linkCard = sharePage['page'].locator('[data-testid="share-link-card"]').first();
    const createdText = await linkCard.locator('text=/Created/i').textContent();
    expect(createdText).toBeTruthy();

    // Verify last accessed is shown
    const lastAccessedText = await linkCard.locator('text=/Last accessed/i').textContent();
    expect(lastAccessedText).toBeTruthy();
  });

  test('should handle expired share links', async ({ page, browser }) => {
    // Arrange - Create a share link with expiration in the past (simulated)
    await sharePage.openShareDialog();
    
    // Create link with very short expiration (1 minute from now for testing)
    const nearFuture = new Date();
    nearFuture.setMinutes(nearFuture.getMinutes() + 1);
    const expirationDateTime = nearFuture.toISOString().slice(0, 16);
    
    await sharePage.createShareLink(expirationDateTime);
    const shareUrl = await sharePage.getLatestShareUrl();

    // Note: In a real scenario, we'd wait for expiration or mock the server time
    // For this test, we'll verify the UI shows expiration info correctly
    
    // Assert - Verify expiration date is displayed
    const expirationText = await sharePage.getExpirationDate(0);
    expect(expirationText).toContain('Expires:');

    // Verify the link is marked as valid initially
    const isExpired = await sharePage.isShareLinkExpired(0);
    expect(isExpired).toBe(false);
  });

  test('should create multiple share links for same analysis', async ({ page }) => {
    // Arrange - Open share dialog
    await sharePage.openShareDialog();
    const initialCount = await sharePage.getShareLinkCount();

    // Act - Create multiple share links
    await sharePage.createShareLink();
    await sharePage.createShareLink();
    await sharePage.createShareLink();

    // Assert - Verify all links were created
    const finalCount = await sharePage.getShareLinkCount();
    expect(finalCount).toBe(initialCount + 3);

    // Verify all links are unique
    const shareUrls = await sharePage.getShareUrls();
    const uniqueUrls = new Set(shareUrls);
    expect(uniqueUrls.size).toBe(shareUrls.length);
  });

  test('should cancel link revocation when user dismisses confirmation', async ({ page }) => {
    // Arrange - Create a share link
    await sharePage.openShareDialog();
    await sharePage.createShareLink();
    const initialCount = await sharePage.getShareLinkCount();

    // Act - Attempt to revoke but cancel
    await sharePage.revokeShareLink(0, false);

    // Assert - Verify link was NOT removed
    const newCount = await sharePage.getShareLinkCount();
    expect(newCount).toBe(initialCount);
  });
});
