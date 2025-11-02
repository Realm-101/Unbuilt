import { test, expect } from '@playwright/test';

/**
 * Example E2E Test
 * 
 * This is a simple example test to verify Playwright setup is working correctly.
 * It can be deleted once real tests are implemented.
 */

test.describe('Playwright Setup Verification', () => {
  test('should load the homepage', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Verify page title or heading exists
    await expect(page).toHaveTitle(/Unbuilt/i);
  });
  
  test('should have proper viewport size', async ({ page }) => {
    const viewport = page.viewportSize();
    
    expect(viewport).toBeDefined();
    expect(viewport?.width).toBeGreaterThan(0);
    expect(viewport?.height).toBeGreaterThan(0);
  });
  
  test('should capture screenshot on failure', async ({ page }) => {
    // This test intentionally passes to demonstrate screenshot capture
    await page.goto('/');
    await expect(page).toHaveURL(/localhost|unbuilt/);
  });
});
