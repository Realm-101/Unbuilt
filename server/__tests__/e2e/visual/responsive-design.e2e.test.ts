import { test, expect } from '@playwright/test';
import { createVisualHelper, VIEWPORTS, VIEWPORT_PRESETS } from '../../helpers/visual-regression.helper';

/**
 * Visual Regression Tests - Responsive Design
 * 
 * Tests responsive layouts at mobile (375px), tablet (768px), and desktop (1440px).
 * Captures visual baselines for key pages across all viewports.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

test.describe('Responsive Design - Homepage', () => {
  test('should match homepage baseline at all viewports', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'homepage');
    
    await page.goto('/');
    await visualHelper.preparePage();
    
    await visualHelper.captureAtViewports('homepage', VIEWPORT_PRESETS.all, {
      fullPage: true,
      maxDiffPixels: 150,
      threshold: 0.2
    });
  });

  test('should have no horizontal scrolling on mobile', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'homepage-mobile');
    
    await visualHelper.setViewport(VIEWPORTS.mobile);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    expect(hasHorizontalScroll).toBe(false);
  });

  test('should have no horizontal scrolling on tablet', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'homepage-tablet');
    
    await visualHelper.setViewport(VIEWPORTS.tablet);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    expect(hasHorizontalScroll).toBe(false);
  });

  test('should adapt layout for mobile viewport', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'homepage-mobile-layout');
    
    await visualHelper.setViewport(VIEWPORTS.mobile);
    await page.goto('/');
    await visualHelper.preparePage();
    
    // Capture mobile layout
    await visualHelper.capture('homepage-mobile-layout', {
      fullPage: true,
      maxDiffPixels: 100,
      threshold: 0.2
    });
  });

  test('should adapt layout for tablet viewport', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'homepage-tablet-layout');
    
    await visualHelper.setViewport(VIEWPORTS.tablet);
    await page.goto('/');
    await visualHelper.preparePage();
    
    // Capture tablet layout
    await visualHelper.capture('homepage-tablet-layout', {
      fullPage: true,
      maxDiffPixels: 100,
      threshold: 0.2
    });
  });

  test('should adapt layout for desktop viewport', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'homepage-desktop-layout');
    
    await visualHelper.setViewport(VIEWPORTS.desktop);
    await page.goto('/');
    await visualHelper.preparePage();
    
    // Capture desktop layout
    await visualHelper.capture('homepage-desktop-layout', {
      fullPage: true,
      maxDiffPixels: 100,
      threshold: 0.2
    });
  });
});

test.describe('Responsive Design - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="login-email"]', 'test@example.com');
    await page.fill('[data-testid="login-password"]', 'Test123!@#');
    await page.click('[data-testid="login-submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should match dashboard baseline at all viewports', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'dashboard');
    
    await visualHelper.preparePage();
    
    await visualHelper.captureAtViewports('dashboard', VIEWPORT_PRESETS.all, {
      fullPage: true,
      maxDiffPixels: 150,
      threshold: 0.2,
      mask: visualHelper.getMaskSelectors()
    });
  });

  test('should have responsive navigation on mobile', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'dashboard-mobile-nav');
    
    await visualHelper.setViewport(VIEWPORTS.mobile);
    await visualHelper.preparePage();
    
    // Check for mobile menu button
    const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
    await expect(mobileMenuButton).toBeVisible();
  });

  test('should display full navigation on desktop', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'dashboard-desktop-nav');
    
    await visualHelper.setViewport(VIEWPORTS.desktop);
    await visualHelper.preparePage();
    
    // Desktop navigation should be visible
    const desktopNav = page.locator('nav');
    await expect(desktopNav).toBeVisible();
  });
});

test.describe('Responsive Design - Search Page', () => {
  test('should match search page baseline at all viewports', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'search');
    
    await page.goto('/search/new');
    await visualHelper.preparePage();
    
    await visualHelper.captureAtViewports('search-page', VIEWPORT_PRESETS.all, {
      fullPage: true,
      maxDiffPixels: 150,
      threshold: 0.2
    });
  });

  test('should have responsive search input on mobile', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'search-mobile');
    
    await visualHelper.setViewport(VIEWPORTS.mobile);
    await page.goto('/search/new');
    await visualHelper.preparePage();
    
    const searchInput = page.locator('[data-testid="search-input"]');
    await expect(searchInput).toBeVisible();
    
    // Verify input takes full width on mobile
    const inputWidth = await searchInput.evaluate(el => el.clientWidth);
    const viewportWidth = VIEWPORTS.mobile.width;
    
    // Input should be close to full width (accounting for padding)
    expect(inputWidth).toBeGreaterThan(viewportWidth * 0.8);
  });
});

test.describe('Responsive Design - Resource Library', () => {
  test('should match resource library baseline at all viewports', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'resources');
    
    await page.goto('/resources');
    await visualHelper.preparePage();
    
    await visualHelper.captureAtViewports('resource-library', VIEWPORT_PRESETS.all, {
      fullPage: true,
      maxDiffPixels: 150,
      threshold: 0.2
    });
  });

  test('should display resource cards in grid on desktop', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'resources-desktop-grid');
    
    await visualHelper.setViewport(VIEWPORTS.desktop);
    await page.goto('/resources');
    await visualHelper.preparePage();
    
    // Check for grid layout
    const resourceGrid = page.locator('[data-testid="resource-grid"]');
    if (await resourceGrid.count() > 0) {
      await expect(resourceGrid).toBeVisible();
    }
  });

  test('should stack resource cards on mobile', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'resources-mobile-stack');
    
    await visualHelper.setViewport(VIEWPORTS.mobile);
    await page.goto('/resources');
    await visualHelper.preparePage();
    
    // Capture mobile layout
    await visualHelper.capture('resource-library-mobile', {
      fullPage: true,
      maxDiffPixels: 100,
      threshold: 0.2
    });
  });
});

test.describe('Responsive Design - Authentication Pages', () => {
  test('should match login page baseline at all viewports', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'login');
    
    await page.goto('/login');
    await visualHelper.preparePage();
    
    await visualHelper.captureAtViewports('login-page', VIEWPORT_PRESETS.all, {
      fullPage: false, // Just capture the form
      maxDiffPixels: 100,
      threshold: 0.2
    });
  });

  test('should match register page baseline at all viewports', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'register');
    
    await page.goto('/register');
    await visualHelper.preparePage();
    
    await visualHelper.captureAtViewports('register-page', VIEWPORT_PRESETS.all, {
      fullPage: false,
      maxDiffPixels: 100,
      threshold: 0.2
    });
  });

  test('should center auth forms on all viewports', async ({ page }) => {
    const viewports = Object.values(VIEWPORTS);
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      // Check if form is centered
      const form = page.locator('form').first();
      const formBox = await form.boundingBox();
      
      if (formBox) {
        const centerX = formBox.x + formBox.width / 2;
        const viewportCenterX = viewport.width / 2;
        
        // Form should be roughly centered (within 20% tolerance)
        const tolerance = viewport.width * 0.2;
        expect(Math.abs(centerX - viewportCenterX)).toBeLessThan(tolerance);
      }
    }
  });
});

test.describe('Responsive Design - Layout Consistency', () => {
  test('should maintain aspect ratios across viewports', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'aspect-ratios');
    
    await page.goto('/');
    
    const viewports = Object.values(VIEWPORTS);
    const aspectRatios: number[] = [];
    
    for (const viewport of viewports) {
      await visualHelper.setViewport(viewport);
      
      // Get logo aspect ratio
      const logo = page.locator('[data-testid="logo"]').first();
      if (await logo.count() > 0) {
        const box = await logo.boundingBox();
        if (box) {
          aspectRatios.push(box.width / box.height);
        }
      }
    }
    
    // All aspect ratios should be similar (within 10% tolerance)
    if (aspectRatios.length > 1) {
      const firstRatio = aspectRatios[0];
      for (let i = 1; i < aspectRatios.length; i++) {
        const diff = Math.abs(aspectRatios[i] - firstRatio) / firstRatio;
        expect(diff).toBeLessThan(0.1);
      }
    }
  });

  test('should have consistent spacing across viewports', async ({ page }) => {
    const visualHelper = createVisualHelper(page, 'spacing');
    
    await page.goto('/');
    
    // Check that spacing scales appropriately
    // This is a basic test - actual spacing should be verified visually
    const viewports = Object.values(VIEWPORTS);
    
    for (const viewport of viewports) {
      await visualHelper.setViewport(viewport);
      
      // Verify no elements are cut off
      const hasOverflow = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        for (const el of Array.from(elements)) {
          const rect = el.getBoundingClientRect();
          if (rect.right > window.innerWidth || rect.bottom > window.innerHeight) {
            return true;
          }
        }
        return false;
      });
      
      expect(hasOverflow).toBe(false);
    }
  });
});
