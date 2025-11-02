import { Page, Locator } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

/**
 * BasePage - Base class for all Page Objects
 * 
 * Provides common functionality for navigation, element interactions,
 * accessibility testing, screenshots, and performance measurement.
 * 
 * All Page Objects should extend this class.
 */
export abstract class BasePage {
  constructor(protected page: Page) {}

  // ==================== Navigation ====================

  /**
   * Navigate to a specific path
   * @param path - Path to navigate to (relative to base URL)
   */
  async goto(path: string = ''): Promise<void> {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for DOM content to be loaded
   */
  async waitForDOMContentLoaded(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Reload the current page
   */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitForPageLoad();
  }

  /**
   * Navigate back in browser history
   */
  async goBack(): Promise<void> {
    await this.page.goBack();
    await this.waitForPageLoad();
  }

  /**
   * Navigate forward in browser history
   */
  async goForward(): Promise<void> {
    await this.page.goForward();
    await this.waitForPageLoad();
  }

  // ==================== Element Interactions ====================

  /**
   * Click an element
   * @param selector - Element selector
   */
  protected async click(selector: string): Promise<void> {
    await this.page.click(selector);
  }

  /**
   * Double-click an element
   * @param selector - Element selector
   */
  protected async doubleClick(selector: string): Promise<void> {
    await this.page.dblclick(selector);
  }

  /**
   * Fill an input field
   * @param selector - Input selector
   * @param value - Value to fill
   */
  protected async fill(selector: string, value: string): Promise<void> {
    await this.page.fill(selector, value);
  }

  /**
   * Type text into an input (character by character)
   * @param selector - Input selector
   * @param text - Text to type
   */
  protected async type(selector: string, text: string): Promise<void> {
    await this.page.type(selector, text);
  }

  /**
   * Get text content of an element
   * @param selector - Element selector
   * @returns Text content or empty string
   */
  protected async getText(selector: string): Promise<string> {
    return await this.page.textContent(selector) || '';
  }

  /**
   * Get inner text of an element
   * @param selector - Element selector
   * @returns Inner text or empty string
   */
  protected async getInnerText(selector: string): Promise<string> {
    return await this.page.innerText(selector) || '';
  }

  /**
   * Get attribute value of an element
   * @param selector - Element selector
   * @param attribute - Attribute name
   * @returns Attribute value or null
   */
  protected async getAttribute(selector: string, attribute: string): Promise<string | null> {
    return await this.page.getAttribute(selector, attribute);
  }

  /**
   * Get a Playwright locator for an element
   * @param selector - Element selector
   * @returns Playwright Locator
   */
  protected locator(selector: string): Locator {
    return this.page.locator(selector);
  }

  /**
   * Check if an element is visible
   * @param selector - Element selector
   * @returns True if visible, false otherwise
   */
  protected async isVisible(selector: string): Promise<boolean> {
    return await this.locator(selector).isVisible();
  }

  /**
   * Check if an element is enabled
   * @param selector - Element selector
   * @returns True if enabled, false otherwise
   */
  protected async isEnabled(selector: string): Promise<boolean> {
    return await this.locator(selector).isEnabled();
  }

  /**
   * Check if an element is checked (for checkboxes/radio buttons)
   * @param selector - Element selector
   * @returns True if checked, false otherwise
   */
  protected async isChecked(selector: string): Promise<boolean> {
    return await this.locator(selector).isChecked();
  }

  /**
   * Wait for an element to be visible
   * @param selector - Element selector
   * @param timeout - Timeout in milliseconds (optional)
   */
  protected async waitForSelector(selector: string, timeout?: number): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /**
   * Wait for an element to be hidden
   * @param selector - Element selector
   * @param timeout - Timeout in milliseconds (optional)
   */
  protected async waitForSelectorHidden(selector: string, timeout?: number): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'hidden', timeout });
  }

  /**
   * Hover over an element
   * @param selector - Element selector
   */
  protected async hover(selector: string): Promise<void> {
    await this.page.hover(selector);
  }

  /**
   * Select an option from a dropdown
   * @param selector - Select element selector
   * @param value - Option value to select
   */
  protected async selectOption(selector: string, value: string): Promise<void> {
    await this.page.selectOption(selector, value);
  }

  /**
   * Press a keyboard key
   * @param key - Key to press (e.g., 'Enter', 'Escape', 'Tab')
   */
  protected async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /**
   * Get count of elements matching selector
   * @param selector - Element selector
   * @returns Number of matching elements
   */
  protected async getCount(selector: string): Promise<number> {
    return await this.locator(selector).count();
  }

  // ==================== Accessibility Testing ====================

  /**
   * Run accessibility checks on the current page
   * Uses axe-core to check for WCAG 2.1 AA compliance
   * @throws Error if accessibility violations are found
   */
  async checkAccessibility(): Promise<void> {
    await injectAxe(this.page);
    await checkA11y(this.page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true }
    });
  }

  /**
   * Get accessibility violations without throwing
   * @returns Array of accessibility violations
   */
  async getAccessibilityViolations(): Promise<any[]> {
    await injectAxe(this.page);
    return await getViolations(this.page, undefined, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
      }
    });
  }

  /**
   * Check accessibility for a specific element
   * @param selector - Element selector to check
   */
  async checkAccessibilityForElement(selector: string): Promise<void> {
    await injectAxe(this.page);
    await checkA11y(this.page, selector, {
      detailedReport: true,
      detailedReportOptions: { html: true }
    });
  }

  /**
   * Check color contrast ratios
   * @returns Array of color contrast violations
   */
  async checkColorContrast(): Promise<any[]> {
    await injectAxe(this.page);
    return await getViolations(this.page, undefined, {
      runOnly: {
        type: 'rule',
        values: ['color-contrast']
      }
    });
  }

  // ==================== Screenshot Capture ====================

  /**
   * Take a screenshot of the current page
   * @param name - Screenshot filename (without extension)
   * @param fullPage - Whether to capture full page (default: true)
   */
  async takeScreenshot(name: string, fullPage: boolean = true): Promise<void> {
    await this.page.screenshot({
      path: `server/__tests__/reports/screenshots/${name}.png`,
      fullPage
    });
  }

  /**
   * Take a screenshot of a specific element
   * @param selector - Element selector
   * @param name - Screenshot filename (without extension)
   */
  async takeElementScreenshot(selector: string, name: string): Promise<void> {
    const element = this.locator(selector);
    await element.screenshot({
      path: `server/__tests__/reports/screenshots/${name}.png`
    });
  }

  /**
   * Take a screenshot and return as buffer
   * @param fullPage - Whether to capture full page (default: true)
   * @returns Screenshot buffer
   */
  async takeScreenshotBuffer(fullPage: boolean = true): Promise<Buffer> {
    return await this.page.screenshot({ fullPage });
  }

  // ==================== Performance Measurement ====================

  /**
   * Measure page performance metrics
   * @returns Performance metrics object
   */
  async measurePerformance(): Promise<PerformanceMetrics> {
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        domInteractive: navigation.domInteractive,
        responseTime: navigation.responseEnd - navigation.requestStart,
        ttfb: navigation.responseStart - navigation.requestStart
      };
    });
    
    return metrics;
  }

  /**
   * Measure Core Web Vitals
   * @returns Core Web Vitals metrics
   */
  async measureCoreWebVitals(): Promise<CoreWebVitals> {
    return await this.page.evaluate(() => {
      return new Promise((resolve) => {
        const metrics: any = {
          lcp: 0,
          fid: 0,
          cls: 0
        };

        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          metrics.lcp = lastEntry.startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            metrics.fid = entry.processingStart - entry.startTime;
          });
        }).observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          metrics.cls = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });

        // Wait a bit for metrics to be collected
        setTimeout(() => resolve(metrics), 2000);
      });
    });
  }

  /**
   * Get page load time in milliseconds
   * @returns Page load time
   */
  async getPageLoadTime(): Promise<number> {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return navigation.loadEventEnd - navigation.fetchStart;
    });
  }

  /**
   * Get Time to First Byte (TTFB)
   * @returns TTFB in milliseconds
   */
  async getTTFB(): Promise<number> {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return navigation.responseStart - navigation.requestStart;
    });
  }

  // ==================== Utility Methods ====================

  /**
   * Get current page URL
   * @returns Current URL
   */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Get page title
   * @returns Page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Wait for a specific amount of time
   * @param ms - Milliseconds to wait
   */
  protected async wait(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  /**
   * Execute JavaScript in the page context
   * @param script - JavaScript code to execute
   * @returns Result of the script execution
   */
  protected async evaluate<T>(script: () => T | Promise<T>): Promise<T> {
    return await this.page.evaluate(script);
  }

  /**
   * Scroll to an element
   * @param selector - Element selector
   */
  protected async scrollToElement(selector: string): Promise<void> {
    await this.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Scroll to top of page
   */
  async scrollToTop(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, 0));
  }

  /**
   * Scroll to bottom of page
   */
  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }
}

// ==================== Type Definitions ====================

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  firstContentfulPaint: number;
  domInteractive: number;
  responseTime: number;
  ttfb: number;
}

/**
 * Core Web Vitals interface
 */
export interface CoreWebVitals {
  lcp: number;  // Largest Contentful Paint
  fid: number;  // First Input Delay
  cls: number;  // Cumulative Layout Shift
}
