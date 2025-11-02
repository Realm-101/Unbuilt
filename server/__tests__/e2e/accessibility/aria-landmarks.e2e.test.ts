import { test, expect } from '@playwright/test';
import { createAccessibilityHelper } from '../../helpers/accessibility.helper';
import { LoginPage } from '../../page-objects/login.page';
import { DashboardPage } from '../../page-objects/dashboard.page';

/**
 * ARIA Labels and Landmarks Tests
 * 
 * Tests ARIA attributes and landmark regions including:
 * - ARIA labels and descriptions
 * - Landmark regions (main, nav, aside, footer)
 * - ARIA roles and attributes
 * - Heading hierarchy
 * 
 * Requirements: 4.4
 */

test.describe('ARIA Labels and Landmarks', () => {
  test('should have valid ARIA attributes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const a11yHelper = createAccessibilityHelper(page);
    const violations = await a11yHelper.testARIA();

    if (violations.length > 0) {
      console.log('\nARIA violations found:');
      violations.forEach(v => {
        console.log(`\n${v.id}: ${v.description}`);
        v.nodes.forEach(node => {
          console.log(`  - ${node.html}`);
        });
      });
    }

    expect(violations).toHaveLength(0);
  });

  test('should have exactly one main landmark', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const mainLandmarks = await page.locator('main, [role="main"]').count();
    expect(mainLandmarks).toBe(1);
  });

  test('should have navigation landmark', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const navLandmarks = await page.locator('nav, [role="navigation"]').count();
    expect(navLandmarks).toBeGreaterThanOrEqual(1);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const headings = await page.evaluate(() => {
      const headingElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      return headingElements.map(h => ({
        level: parseInt(h.tagName.substring(1)),
        text: h.textContent?.substring(0, 50)
      }));
    });

    // Should have at least one h1
    const h1Count = headings.filter(h => h.level === 1).length;
    expect(h1Count).toBeGreaterThanOrEqual(1);

    // Check heading order (no skipped levels)
    for (let i = 1; i < headings.length; i++) {
      const currentLevel = headings[i].level;
      const previousLevel = headings[i - 1].level;
      
      // Can go down any number of levels, but can only go up one level at a time
      if (currentLevel > previousLevel) {
        expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
      }
    }
  });

  test('login page should have proper ARIA labels', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const a11yHelper = createAccessibilityHelper(page);
    const violations = await a11yHelper.testARIA();

    expect(violations).toHaveLength(0);
  });

  test('dashboard should have proper landmark regions', async ({ page }) => {
    // Login first
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test@example.com', 'Test123!@#');

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.waitForPageLoad();

    // Check for required landmarks
    const landmarks = await page.evaluate(() => {
      return {
        main: document.querySelectorAll('main, [role="main"]').length,
        nav: document.querySelectorAll('nav, [role="navigation"]').length,
        contentinfo: document.querySelectorAll('footer, [role="contentinfo"]').length
      };
    });

    expect(landmarks.main).toBe(1);
    expect(landmarks.nav).toBeGreaterThanOrEqual(1);
  });

  test('buttons should have accessible names', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const buttonsWithoutNames = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.filter(btn => {
        const hasText = btn.textContent?.trim().length > 0;
        const hasAriaLabel = btn.hasAttribute('aria-label');
        const hasAriaLabelledBy = btn.hasAttribute('aria-labelledby');
        const hasTitle = btn.hasAttribute('title');
        
        return !hasText && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle;
      }).map(btn => btn.outerHTML);
    });

    if (buttonsWithoutNames.length > 0) {
      console.log('\nButtons without accessible names:');
      buttonsWithoutNames.forEach(html => console.log(`  - ${html}`));
    }

    expect(buttonsWithoutNames).toHaveLength(0);
  });

  test('links should have accessible names', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const linksWithoutNames = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links.filter(link => {
        const hasText = link.textContent?.trim().length > 0;
        const hasAriaLabel = link.hasAttribute('aria-label');
        const hasAriaLabelledBy = link.hasAttribute('aria-labelledby');
        const hasTitle = link.hasAttribute('title');
        
        return !hasText && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle;
      }).map(link => link.outerHTML);
    });

    if (linksWithoutNames.length > 0) {
      console.log('\nLinks without accessible names:');
      linksWithoutNames.forEach(html => console.log(`  - ${html}`));
    }

    expect(linksWithoutNames).toHaveLength(0);
  });

  test('images should have alt text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const imagesWithoutAlt = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.filter(img => {
        const hasAlt = img.hasAttribute('alt');
        const hasAriaLabel = img.hasAttribute('aria-label');
        const hasAriaLabelledBy = img.hasAttribute('aria-labelledby');
        const isDecorative = img.getAttribute('role') === 'presentation' || 
                           img.getAttribute('role') === 'none';
        
        return !hasAlt && !hasAriaLabel && !hasAriaLabelledBy && !isDecorative;
      }).map(img => img.outerHTML);
    });

    if (imagesWithoutAlt.length > 0) {
      console.log('\nImages without alt text:');
      imagesWithoutAlt.forEach(html => console.log(`  - ${html}`));
    }

    expect(imagesWithoutAlt).toHaveLength(0);
  });

  test('should have proper ARIA live regions for dynamic content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for live regions on elements that update dynamically
    const liveRegions = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('[aria-live], [role="status"], [role="alert"]'));
      return elements.map(el => ({
        tag: el.tagName,
        role: el.getAttribute('role'),
        ariaLive: el.getAttribute('aria-live'),
        ariaAtomic: el.getAttribute('aria-atomic')
      }));
    });

    // If there are live regions, verify they're properly configured
    liveRegions.forEach(region => {
      if (region.ariaLive) {
        expect(['polite', 'assertive', 'off']).toContain(region.ariaLive);
      }
    });
  });

  test('should use semantic HTML elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const semanticElements = await page.evaluate(() => {
      return {
        header: document.querySelectorAll('header').length,
        nav: document.querySelectorAll('nav').length,
        main: document.querySelectorAll('main').length,
        article: document.querySelectorAll('article').length,
        section: document.querySelectorAll('section').length,
        aside: document.querySelectorAll('aside').length,
        footer: document.querySelectorAll('footer').length
      };
    });

    // Should use semantic HTML (at least main and nav)
    expect(semanticElements.main).toBeGreaterThanOrEqual(1);
    expect(semanticElements.nav).toBeGreaterThanOrEqual(1);
  });

  test('should have proper ARIA expanded states for collapsible elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const collapsibleElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('[aria-expanded]'));
      return elements.map(el => ({
        tag: el.tagName,
        expanded: el.getAttribute('aria-expanded'),
        controls: el.getAttribute('aria-controls')
      }));
    });

    // Verify aria-expanded values are valid
    collapsibleElements.forEach(el => {
      expect(['true', 'false']).toContain(el.expanded);
    });
  });

  test('should have proper ARIA current for navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if navigation uses aria-current
    const currentNavItems = await page.evaluate(() => {
      const navItems = Array.from(document.querySelectorAll('nav a[aria-current]'));
      return navItems.map(item => ({
        text: item.textContent?.trim(),
        ariaCurrent: item.getAttribute('aria-current')
      }));
    });

    // If aria-current is used, verify valid values
    currentNavItems.forEach(item => {
      expect(['page', 'step', 'location', 'date', 'time', 'true']).toContain(item.ariaCurrent);
    });
  });
});
