import { test, expect } from '@playwright/test';
import { createVisualHelper, VIEWPORTS } from '../../helpers/visual-regression.helper';

/**
 * Visual Regression Tests - Dark Mode
 * 
 * Tests dark mode implementation and visual consistency.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

test.describe('Dark Mode Implementation', () => {
  test('should have dark mode enabled by default', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'dark-mode-default');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const isDark = await visualHelper.isDarkMode();
    expect(isDark).toBe(true);
  });

  test('should have dark background colors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const backgroundColor = await page.evaluate(() => {
      const body = document.body;
      const styles = window.getComputedStyle(body);
      return styles.backgroundColor;
    });
    
    // Parse RGB values
    const rgbMatch = backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch.map(Number);
      const brightness = (r + g + b) / 3;
      
      // Dark mode should have low brightness (< 50)
      expect(brightness).toBeLessThan(50);
    }
  });

  test('should match dark mode baseline - homepage', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'dark-mode-homepage');
    
    await page.goto('/');
    await visualHelper.preparePage();
    
    // Ensure dark mode is active
    const isDark = await visualHelper.isDarkMode();
    expect(isDark).toBe(true);
    
    await visualHelper.capture('homepage-dark-mode', {
      fullPage: true,
      maxDiffPixels: 150,
      threshold: 0.2
    });
  });

  test('should match dark mode baseline - dashboard', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'dark-mode-dashboard');
    
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="login-email"]', 'test@example.com');
    await page.fill('[data-testid="login-password"]', 'Test123!@#');
    await page.click('[data-testid="login-submit"]');
    await page.waitForURL('/dashboard');
    
    await visualHelper.preparePage();
    
    await visualHelper.capture('dashboard-dark-mode', {
      fullPage: true,
      maxDiffPixels: 150,
      threshold: 0.2,
      mask: visualHelper.getMaskSelectors()
    });
  });

  test('should match dark mode baseline - login page', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'dark-mode-login');
    
    await page.goto('/login');
    await visualHelper.preparePage();
    
    await visualHelper.capture('login-dark-mode', {
      fullPage: false,
      maxDiffPixels: 100,
      threshold: 0.2
    });
  });

  test('should match dark mode baseline - search page', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'dark-mode-search');
    
    await page.goto('/search/new');
    await visualHelper.preparePage();
    
    await visualHelper.capture('search-dark-mode', {
      fullPage: true,
      maxDiffPixels: 150,
      threshold: 0.2
    });
  });

  test('should have proper contrast in dark mode', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'dark-mode-contrast');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Get theme colors
    const colors = await visualHelper.getThemeColors();
    
    // Test contrast between text and background
    const contrastRatio = await visualHelper.getContrastRatio(
      colors.foreground || '#ffffff',
      colors.background || '#000000'
    );
    
    // Should meet WCAG AA standard (4.5:1 for normal text)
    expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
  });

  test('should display flame colors prominently in dark mode', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'dark-mode-flames');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verify flame colors are present
    const hasThemeColors = await visualHelper.verifyThemeColors();
    expect(hasThemeColors).toBe(true);
    
    // Check for gradient elements (flame effects)
    const gradientElements = await page.locator('[class*="gradient"]').count();
    expect(gradientElements).toBeGreaterThan(0);
  });

  test('should have consistent dark mode across pages', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'dark-mode-consistency');
    
    const pages = ['/', '/login', '/register', '/search/new'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      const isDark = await visualHelper.isDarkMode();
      expect(isDark).toBe(true);
      
      // Verify dark background
      const backgroundColor = await page.evaluate(() => {
        const body = document.body;
        const styles = window.getComputedStyle(body);
        return styles.backgroundColor;
      });
      
      const rgbMatch = backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgbMatch) {
        const [, r, g, b] = rgbMatch.map(Number);
        const brightness = (r + g + b) / 3;
        expect(brightness).toBeLessThan(50);
      }
    }
  });

  test('should render text legibly in dark mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that text elements have sufficient contrast
    const textElements = await page.locator('p, h1, h2, h3, h4, h5, h6, span, a').all();
    
    // Sample a few text elements
    const sampleSize = Math.min(5, textElements.length);
    for (let i = 0; i < sampleSize; i++) {
      const element = textElements[i];
      
      const isVisible = await element.isVisible();
      if (isVisible) {
        const color = await element.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return styles.color;
        });
        
        // Text should not be pure black in dark mode
        expect(color).not.toBe('rgb(0, 0, 0)');
      }
    }
  });

  test('should have dark mode compatible images and icons', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'dark-mode-images');
    
    await page.goto('/');
    await visualHelper.preparePage();
    
    // Check that images are loaded
    await visualHelper.waitForImages();
    
    // Capture to verify visual appearance
    await visualHelper.capture('homepage-images-dark-mode', {
      fullPage: false,
      maxDiffPixels: 100,
      threshold: 0.2
    });
  });

  test('should maintain dark mode on navigation', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'dark-mode-navigation');
    
    await page.goto('/');
    const isDarkInitial = await visualHelper.isDarkMode();
    expect(isDarkInitial).toBe(true);
    
    // Navigate to another page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const isDarkAfterNav = await visualHelper.isDarkMode();
    expect(isDarkAfterNav).toBe(true);
  });

  test('should have dark mode compatible forms', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'dark-mode-forms');
    
    await page.goto('/login');
    await visualHelper.preparePage();
    
    // Check form input styling
    const emailInput = page.locator('[data-testid="login-email"]');
    const inputBg = await emailInput.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return styles.backgroundColor;
    });
    
    // Input should have dark background
    const rgbMatch = inputBg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch.map(Number);
      const brightness = (r + g + b) / 3;
      expect(brightness).toBeLessThan(100);
    }
  });

  test('should have dark mode compatible buttons', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const submitButton = page.locator('[data-testid="login-submit"]');
    
    // Button should be visible
    await expect(submitButton).toBeVisible();
    
    // Button should have appropriate styling
    const buttonBg = await submitButton.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return styles.backgroundColor;
    });
    
    // Button should have color (not transparent)
    expect(buttonBg).not.toBe('rgba(0, 0, 0, 0)');
    expect(buttonBg).not.toBe('transparent');
  });
});

test.describe('Dark Mode - Responsive', () => {
  test('should maintain dark mode at mobile viewport', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'dark-mode-mobile');
    
    await visualHelper.setViewport(VIEWPORTS.mobile);
    await page.goto('/');
    await visualHelper.preparePage();
    
    const isDark = await visualHelper.isDarkMode();
    expect(isDark).toBe(true);
    
    await visualHelper.capture('homepage-dark-mode-mobile', {
      fullPage: true,
      maxDiffPixels: 150,
      threshold: 0.2
    });
  });

  test('should maintain dark mode at tablet viewport', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'dark-mode-tablet');
    
    await visualHelper.setViewport(VIEWPORTS.tablet);
    await page.goto('/');
    await visualHelper.preparePage();
    
    const isDark = await visualHelper.isDarkMode();
    expect(isDark).toBe(true);
    
    await visualHelper.capture('homepage-dark-mode-tablet', {
      fullPage: true,
      maxDiffPixels: 150,
      threshold: 0.2
    });
  });

  test('should maintain dark mode at desktop viewport', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'dark-mode-desktop');
    
    await visualHelper.setViewport(VIEWPORTS.desktop);
    await page.goto('/');
    await visualHelper.preparePage();
    
    const isDark = await visualHelper.isDarkMode();
    expect(isDark).toBe(true);
    
    await visualHelper.capture('homepage-dark-mode-desktop', {
      fullPage: true,
      maxDiffPixels: 150,
      threshold: 0.2
    });
  });
});
