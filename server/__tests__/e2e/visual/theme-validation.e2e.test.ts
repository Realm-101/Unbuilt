import { test, expect } from '@playwright/test';
import { createVisualHelper, VIEWPORTS, VIEWPORT_PRESETS } from '../../helpers/visual-regression.helper';

/**
 * Visual Regression Tests - Theme Validation
 * 
 * Tests Neon Flame theme colors, contrast ratios, and visual consistency.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

test.describe('Theme Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have Neon Flame theme colors', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'theme-colors');
    
    // Get theme colors
    const colors = await visualHelper.getThemeColors();
    
    // Verify all flame colors are present
    expect(colors.flamePurple).toBeTruthy();
    expect(colors.flameRed).toBeTruthy();
    expect(colors.flameOrange).toBeTruthy();
    expect(colors.flameWhite).toBeTruthy();
    
    // Verify colors are not default/empty
    expect(colors.flamePurple).not.toBe('');
    expect(colors.flameRed).not.toBe('');
    expect(colors.flameOrange).not.toBe('');
    expect(colors.flameWhite).not.toBe('');
  });

  test('should verify theme colors using helper', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'theme-verification');
    
    const hasThemeColors = await visualHelper.verifyThemeColors();
    expect(hasThemeColors).toBe(true);
  });

  test('should have proper color contrast for text', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'color-contrast');
    
    // Get theme colors
    const colors = await visualHelper.getThemeColors();
    
    // Test contrast between foreground and background
    // Note: This is a simplified test - actual contrast should be tested with axe
    const contrastRatio = await visualHelper.getContrastRatio(
      colors.foreground || '#ffffff',
      colors.background || '#000000'
    );
    
    // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
    expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
  });

  test('should match theme visual baseline - desktop', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'theme-baseline');
    
    await visualHelper.setViewport(VIEWPORTS.desktop);
    await visualHelper.preparePage();
    
    await visualHelper.capture('homepage-theme-desktop', {
      fullPage: false, // Just capture above the fold
      maxDiffPixels: 100,
      threshold: 0.2
    });
  });

  test('should match theme visual baseline - mobile', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'theme-baseline');
    
    await visualHelper.setViewport(VIEWPORTS.mobile);
    await visualHelper.preparePage();
    
    await visualHelper.capture('homepage-theme-mobile', {
      fullPage: false,
      maxDiffPixels: 100,
      threshold: 0.2
    });
  });

  test('should have consistent theme across pages', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'theme-consistency');
    
    const pages = ['/', '/login', '/register'];
    const themeColors: Record<string, any>[] = [];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      const colors = await visualHelper.getThemeColors();
      themeColors.push(colors);
    }
    
    // Verify all pages have the same theme colors
    const firstPageColors = themeColors[0];
    for (let i = 1; i < themeColors.length; i++) {
      expect(themeColors[i].flamePurple).toBe(firstPageColors.flamePurple);
      expect(themeColors[i].flameRed).toBe(firstPageColors.flameRed);
      expect(themeColors[i].flameOrange).toBe(firstPageColors.flameOrange);
      expect(themeColors[i].flameWhite).toBe(firstPageColors.flameWhite);
    }
  });

  test('should display flame gradient effects', async ({ page }) => {
    // Check for gradient elements
    const gradientElements = await page.locator('[class*="gradient"]').count();
    expect(gradientElements).toBeGreaterThan(0);
  });

  test('should have dark theme by default', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'dark-theme');
    
    const isDark = await visualHelper.isDarkMode();
    expect(isDark).toBe(true);
  });
});
