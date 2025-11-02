import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Visual Regression Testing Helper
 * 
 * Provides utilities for screenshot capture, baseline management,
 * diff generation, and threshold configuration for visual regression testing.
 */

export interface ViewportConfig {
  name: string;
  width: number;
  height: number;
}

export interface ScreenshotOptions {
  fullPage?: boolean;
  maxDiffPixels?: number;
  threshold?: number;
  mask?: string[];
  animations?: 'disabled' | 'allow';
}

export interface VisualTestResult {
  passed: boolean;
  diffPixels?: number;
  diffPercentage?: number;
  screenshotPath?: string;
  baselinePath?: string;
  diffPath?: string;
}

/**
 * Standard viewport configurations for responsive testing
 */
export const VIEWPORTS: Record<string, ViewportConfig> = {
  mobile: {
    name: 'mobile',
    width: 375,
    height: 667
  },
  tablet: {
    name: 'tablet',
    width: 768,
    height: 1024
  },
  desktop: {
    name: 'desktop',
    width: 1440,
    height: 900
  }
};

/**
 * Default screenshot options
 */
export const DEFAULT_SCREENSHOT_OPTIONS: ScreenshotOptions = {
  fullPage: true,
  maxDiffPixels: 100,
  threshold: 0.2,
  animations: 'disabled'
};

export class VisualRegressionHelper {
  private baselineDir: string;
  private screenshotDir: string;
  private diffDir: string;

  constructor(
    private page: Page,
    testName: string = 'default'
  ) {
    const reportsDir = path.join(process.cwd(), 'server/__tests__/reports');
    this.baselineDir = path.join(reportsDir, 'visual-baselines', testName);
    this.screenshotDir = path.join(reportsDir, 'visual-screenshots', testName);
    this.diffDir = path.join(reportsDir, 'visual-diffs', testName);

    // Ensure directories exist
    this.ensureDirectories();
  }

  /**
   * Ensure all required directories exist
   */
  private ensureDirectories(): void {
    [this.baselineDir, this.screenshotDir, this.diffDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Capture screenshot at multiple viewports
   */
  async captureAtViewports(
    name: string,
    viewports: ViewportConfig[] = Object.values(VIEWPORTS),
    options: ScreenshotOptions = {}
  ): Promise<void> {
    const mergedOptions = { ...DEFAULT_SCREENSHOT_OPTIONS, ...options };

    for (const viewport of viewports) {
      await this.page.setViewportSize({
        width: viewport.width,
        height: viewport.height
      });

      // Wait for any layout shifts to complete
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(500);

      const screenshotName = `${name}-${viewport.name}.png`;
      
      await expect(this.page).toHaveScreenshot(screenshotName, {
        fullPage: mergedOptions.fullPage,
        maxDiffPixels: mergedOptions.maxDiffPixels,
        threshold: mergedOptions.threshold,
        animations: mergedOptions.animations,
        mask: mergedOptions.mask ? mergedOptions.mask.map(s => this.page.locator(s)) : []
      });
    }
  }

  /**
   * Capture screenshot with custom options
   */
  async capture(
    name: string,
    options: ScreenshotOptions = {}
  ): Promise<void> {
    const mergedOptions = { ...DEFAULT_SCREENSHOT_OPTIONS, ...options };

    await expect(this.page).toHaveScreenshot(`${name}.png`, {
      fullPage: mergedOptions.fullPage,
      maxDiffPixels: mergedOptions.maxDiffPixels,
      threshold: mergedOptions.threshold,
      animations: mergedOptions.animations,
      mask: mergedOptions.mask ? mergedOptions.mask.map(s => this.page.locator(s)) : []
    });
  }

  /**
   * Set viewport to specific configuration
   */
  async setViewport(viewport: ViewportConfig): Promise<void> {
    await this.page.setViewportSize({
      width: viewport.width,
      height: viewport.height
    });
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(300);
  }

  /**
   * Disable animations for consistent screenshots
   */
  async disableAnimations(): Promise<void> {
    await this.page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
  }

  /**
   * Wait for fonts to load
   */
  async waitForFonts(): Promise<void> {
    await this.page.evaluate(() => {
      return document.fonts.ready;
    });
  }

  /**
   * Wait for images to load
   */
  async waitForImages(): Promise<void> {
    await this.page.evaluate(() => {
      return Promise.all(
        Array.from(document.images)
          .filter(img => !img.complete)
          .map(img => new Promise(resolve => {
            img.onload = img.onerror = resolve;
          }))
      );
    });
  }

  /**
   * Prepare page for screenshot (disable animations, wait for fonts/images)
   */
  async preparePage(): Promise<void> {
    await this.disableAnimations();
    await this.waitForFonts();
    await this.waitForImages();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Mask dynamic content (timestamps, user-specific data)
   */
  getMaskSelectors(): string[] {
    return [
      '[data-testid="timestamp"]',
      '[data-testid="user-avatar"]',
      '[data-testid="dynamic-content"]',
      '.timestamp',
      '.user-specific'
    ];
  }

  /**
   * Get theme colors from page
   */
  async getThemeColors(): Promise<Record<string, string>> {
    return await this.page.evaluate(() => {
      const root = document.documentElement;
      const styles = getComputedStyle(root);
      
      return {
        flamePurple: styles.getPropertyValue('--flame-purple').trim(),
        flameRed: styles.getPropertyValue('--flame-red').trim(),
        flameOrange: styles.getPropertyValue('--flame-orange').trim(),
        flameWhite: styles.getPropertyValue('--flame-white').trim(),
        background: styles.getPropertyValue('--background').trim(),
        foreground: styles.getPropertyValue('--foreground').trim()
      };
    });
  }

  /**
   * Verify theme colors are present
   */
  async verifyThemeColors(): Promise<boolean> {
    const colors = await this.getThemeColors();
    
    return !!(
      colors.flamePurple &&
      colors.flameRed &&
      colors.flameOrange &&
      colors.flameWhite
    );
  }

  /**
   * Get color contrast ratio between two colors
   */
  async getContrastRatio(foreground: string, background: string): Promise<number> {
    return await this.page.evaluate(({ fg, bg }) => {
      // Convert hex to RGB
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : null;
      };

      // Calculate relative luminance
      const getLuminance = (rgb: { r: number; g: number; b: number }) => {
        const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
          val = val / 255;
          return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };

      const fgRgb = hexToRgb(fg);
      const bgRgb = hexToRgb(bg);

      if (!fgRgb || !bgRgb) return 0;

      const fgLum = getLuminance(fgRgb);
      const bgLum = getLuminance(bgRgb);

      const lighter = Math.max(fgLum, bgLum);
      const darker = Math.min(fgLum, bgLum);

      return (lighter + 0.05) / (darker + 0.05);
    }, { fg: foreground, bg: background });
  }

  /**
   * Check if page is in dark mode
   */
  async isDarkMode(): Promise<boolean> {
    return await this.page.evaluate(() => {
      return document.documentElement.classList.contains('dark') ||
             document.documentElement.getAttribute('data-theme') === 'dark';
    });
  }

  /**
   * Toggle dark mode
   */
  async toggleDarkMode(): Promise<void> {
    await this.page.evaluate(() => {
      document.documentElement.classList.toggle('dark');
    });
    await this.page.waitForTimeout(300);
  }

  /**
   * Generate visual test report
   */
  generateReport(results: VisualTestResult[]): string {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;

    let report = `# Visual Regression Test Report\n\n`;
    report += `**Total Tests:** ${total}\n`;
    report += `**Passed:** ${passed}\n`;
    report += `**Failed:** ${failed}\n`;
    report += `**Pass Rate:** ${((passed / total) * 100).toFixed(2)}%\n\n`;

    if (failed > 0) {
      report += `## Failed Tests\n\n`;
      results.filter(r => !r.passed).forEach(result => {
        report += `- **Screenshot:** ${result.screenshotPath}\n`;
        report += `  - Diff Pixels: ${result.diffPixels}\n`;
        report += `  - Diff Percentage: ${result.diffPercentage?.toFixed(2)}%\n`;
        report += `  - Diff Image: ${result.diffPath}\n\n`;
      });
    }

    return report;
  }

  /**
   * Save baseline screenshot
   */
  async saveBaseline(name: string): Promise<void> {
    const screenshotPath = path.join(this.baselineDir, `${name}.png`);
    await this.page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
  }

  /**
   * Update all baselines for a test
   */
  async updateBaselines(
    names: string[],
    viewports: ViewportConfig[] = Object.values(VIEWPORTS)
  ): Promise<void> {
    for (const name of names) {
      for (const viewport of viewports) {
        await this.setViewport(viewport);
        await this.preparePage();
        await this.saveBaseline(`${name}-${viewport.name}`);
      }
    }
  }

  /**
   * Clear all baselines
   */
  clearBaselines(): void {
    if (fs.existsSync(this.baselineDir)) {
      fs.rmSync(this.baselineDir, { recursive: true, force: true });
      fs.mkdirSync(this.baselineDir, { recursive: true });
    }
  }

  /**
   * Clear all diffs
   */
  clearDiffs(): void {
    if (fs.existsSync(this.diffDir)) {
      fs.rmSync(this.diffDir, { recursive: true, force: true });
      fs.mkdirSync(this.diffDir, { recursive: true });
    }
  }
}

/**
 * Create visual regression helper instance
 */
export function createVisualHelper(page: Page, testName?: string): VisualRegressionHelper {
  return new VisualRegressionHelper(page, testName);
}

/**
 * Viewport presets for common testing scenarios
 */
export const VIEWPORT_PRESETS = {
  mobile: [VIEWPORTS.mobile],
  tablet: [VIEWPORTS.tablet],
  desktop: [VIEWPORTS.desktop],
  all: Object.values(VIEWPORTS),
  mobileAndDesktop: [VIEWPORTS.mobile, VIEWPORTS.desktop]
};
