/**
 * Test Debugging Helper
 * 
 * Provides utilities for debugging Playwright tests including:
 * - Playwright Inspector integration
 * - Trace file generation
 * - Selector suggestion tool
 * - Performance profiling
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */

import { Page, Locator, BrowserContext } from '@playwright/test';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export interface DebugOptions {
  enableTracing?: boolean;
  enableScreenshots?: boolean;
  enableConsoleLogging?: boolean;
  enableNetworkLogging?: boolean;
  enablePerformanceProfiling?: boolean;
}

export interface PerformanceProfile {
  testName: string;
  timestamp: Date;
  steps: PerformanceStep[];
  totalDuration: number;
  slowestStep: PerformanceStep;
}

export interface PerformanceStep {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
}

export interface SelectorSuggestion {
  selector: string;
  type: 'data-testid' | 'role' | 'text' | 'css' | 'xpath';
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export class DebugHelper {
  private page: Page;
  private context: BrowserContext;
  private options: DebugOptions;
  private performanceSteps: PerformanceStep[] = [];
  private currentStepStart: number = 0;

  constructor(page: Page, context: BrowserContext, options: DebugOptions = {}) {
    this.page = page;
    this.context = context;
    this.options = {
      enableTracing: options.enableTracing ?? true,
      enableScreenshots: options.enableScreenshots ?? true,
      enableConsoleLogging: options.enableConsoleLogging ?? true,
      enableNetworkLogging: options.enableNetworkLogging ?? true,
      enablePerformanceProfiling: options.enablePerformanceProfiling ?? true,
    };
  }

  /**
   * Start Playwright Inspector for step-by-step debugging
   * Usage: Set PWDEBUG=1 environment variable or call this method
   */
  async startInspector(): Promise<void> {
    console.log('🔍 Starting Playwright Inspector...');
    console.log('Use the Inspector UI to step through your test');
    console.log('Set breakpoints by adding: await page.pause()');
    
    // Pause execution to allow inspector to attach
    await this.page.pause();
  }

  /**
   * Start tracing for detailed debugging
   */
  async startTracing(name: string): Promise<void> {
    if (!this.options.enableTracing) return;

    await this.context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true,
    });

    console.log(`📹 Tracing started for: ${name}`);
  }

  /**
   * Stop tracing and save trace file
   */
  async stopTracing(name: string): Promise<string> {
    if (!this.options.enableTracing) return '';

    const tracePath = join(
      process.cwd(),
      'server/__tests__/reports/traces',
      `${name}-${Date.now()}.zip`
    );

    await mkdir(join(process.cwd(), 'server/__tests__/reports/traces'), {
      recursive: true,
    });

    await this.context.tracing.stop({ path: tracePath });

    console.log(`💾 Trace saved to: ${tracePath}`);
    console.log(`📊 View trace: npx playwright show-trace ${tracePath}`);

    return tracePath;
  }

  /**
   * Suggest alternative selectors for an element
   */
  async suggestSelectors(element: string): Promise<SelectorSuggestion[]> {
    const suggestions: SelectorSuggestion[] = [];

    try {
      // Try to locate the element
      const locator = this.page.locator(element);
      const count = await locator.count();

      if (count === 0) {
        console.log(`❌ Element not found: ${element}`);
        
        // Suggest alternatives based on page content
        const alternatives = await this.findSimilarElements(element);
        return alternatives;
      }

      // Get element details
      const elementHandle = await locator.first().elementHandle();
      if (!elementHandle) return suggestions;

      const elementInfo = await elementHandle.evaluate((el) => {
        return {
          tagName: el.tagName.toLowerCase(),
          id: el.id,
          className: el.className,
          textContent: el.textContent?.trim().substring(0, 50),
          role: el.getAttribute('role'),
          ariaLabel: el.getAttribute('aria-label'),
          dataTestId: el.getAttribute('data-testid'),
          type: el.getAttribute('type'),
        };
      });

      // Suggest data-testid (highest priority)
      if (elementInfo.dataTestId) {
        suggestions.push({
          selector: `[data-testid="${elementInfo.dataTestId}"]`,
          type: 'data-testid',
          confidence: 'high',
          reason: 'Stable selector using data-testid attribute',
        });
      }

      // Suggest role-based selector
      if (elementInfo.role) {
        suggestions.push({
          selector: `role=${elementInfo.role}`,
          type: 'role',
          confidence: 'high',
          reason: 'Semantic selector using ARIA role',
        });
      }

      // Suggest text-based selector
      if (elementInfo.textContent) {
        suggestions.push({
          selector: `text=${elementInfo.textContent}`,
          type: 'text',
          confidence: 'medium',
          reason: 'Text-based selector (may break if text changes)',
        });
      }

      // Suggest aria-label selector
      if (elementInfo.ariaLabel) {
        suggestions.push({
          selector: `[aria-label="${elementInfo.ariaLabel}"]`,
          type: 'css',
          confidence: 'high',
          reason: 'Accessible selector using aria-label',
        });
      }

      // Suggest ID selector (lower priority)
      if (elementInfo.id) {
        suggestions.push({
          selector: `#${elementInfo.id}`,
          type: 'css',
          confidence: 'medium',
          reason: 'ID selector (may change with dynamic IDs)',
        });
      }

      // Suggest class selector (lowest priority)
      if (elementInfo.className) {
        const classes = elementInfo.className.split(' ').filter(Boolean);
        if (classes.length > 0) {
          suggestions.push({
            selector: `.${classes.join('.')}`,
            type: 'css',
            confidence: 'low',
            reason: 'Class selector (may break with styling changes)',
          });
        }
      }

      console.log(`✅ Found ${suggestions.length} selector suggestions for: ${element}`);
      suggestions.forEach((s, i) => {
        console.log(`  ${i + 1}. [${s.confidence}] ${s.selector} - ${s.reason}`);
      });

      return suggestions;
    } catch (error) {
      console.error(`❌ Error suggesting selectors: ${error}`);
      return suggestions;
    }
  }

  /**
   * Find similar elements when the original selector fails
   */
  private async findSimilarElements(selector: string): Promise<SelectorSuggestion[]> {
    const suggestions: SelectorSuggestion[] = [];

    // Extract potential search terms from selector
    const searchTerms = this.extractSearchTerms(selector);

    for (const term of searchTerms) {
      // Search by text content
      const textMatches = await this.page.locator(`text=${term}`).count();
      if (textMatches > 0) {
        suggestions.push({
          selector: `text=${term}`,
          type: 'text',
          confidence: 'medium',
          reason: `Found ${textMatches} element(s) with text containing "${term}"`,
        });
      }

      // Search by data-testid
      const testIdMatches = await this.page.locator(`[data-testid*="${term}"]`).count();
      if (testIdMatches > 0) {
        suggestions.push({
          selector: `[data-testid*="${term}"]`,
          type: 'data-testid',
          confidence: 'high',
          reason: `Found ${testIdMatches} element(s) with data-testid containing "${term}"`,
        });
      }
    }

    return suggestions;
  }

  /**
   * Extract search terms from a selector
   */
  private extractSearchTerms(selector: string): string[] {
    const terms: string[] = [];

    // Extract from data-testid
    const testIdMatch = selector.match(/data-testid[*^$]?=["']([^"']+)["']/);
    if (testIdMatch) {
      terms.push(testIdMatch[1]);
    }

    // Extract from text selector
    const textMatch = selector.match(/text=["']?([^"']+)["']?/);
    if (textMatch) {
      terms.push(textMatch[1]);
    }

    // Extract from ID
    const idMatch = selector.match(/#([a-zA-Z0-9_-]+)/);
    if (idMatch) {
      terms.push(idMatch[1]);
    }

    // Extract from class
    const classMatch = selector.match(/\.([a-zA-Z0-9_-]+)/);
    if (classMatch) {
      terms.push(classMatch[1]);
    }

    return terms;
  }

  /**
   * Start performance profiling for a test step
   */
  startStep(stepName: string): void {
    if (!this.options.enablePerformanceProfiling) return;

    this.currentStepStart = Date.now();
    console.log(`⏱️  Starting step: ${stepName}`);
  }

  /**
   * End performance profiling for a test step
   */
  endStep(stepName: string): void {
    if (!this.options.enablePerformanceProfiling) return;

    const endTime = Date.now();
    const duration = endTime - this.currentStepStart;

    const step: PerformanceStep = {
      name: stepName,
      startTime: this.currentStepStart,
      endTime,
      duration,
    };

    this.performanceSteps.push(step);

    const emoji = duration > 5000 ? '🐌' : duration > 2000 ? '⚠️' : '✅';
    console.log(`${emoji} Completed step: ${stepName} (${duration}ms)`);
  }

  /**
   * Generate performance profile report
   */
  async generatePerformanceProfile(testName: string): Promise<PerformanceProfile> {
    if (!this.options.enablePerformanceProfiling) {
      return {
        testName,
        timestamp: new Date(),
        steps: [],
        totalDuration: 0,
        slowestStep: { name: '', startTime: 0, endTime: 0, duration: 0 },
      };
    }

    const totalDuration = this.performanceSteps.reduce((sum, step) => sum + step.duration, 0);
    const slowestStep = this.performanceSteps.reduce(
      (slowest, step) => (step.duration > slowest.duration ? step : slowest),
      this.performanceSteps[0] || { name: '', startTime: 0, endTime: 0, duration: 0 }
    );

    const profile: PerformanceProfile = {
      testName,
      timestamp: new Date(),
      steps: this.performanceSteps,
      totalDuration,
      slowestStep,
    };

    // Save profile to file
    const profilePath = join(
      process.cwd(),
      'server/__tests__/reports/performance',
      `${testName}-${Date.now()}.json`
    );

    await mkdir(join(process.cwd(), 'server/__tests__/reports/performance'), {
      recursive: true,
    });

    await writeFile(profilePath, JSON.stringify(profile, null, 2));

    console.log('\n📊 Performance Profile:');
    console.log(`   Test: ${testName}`);
    console.log(`   Total Duration: ${totalDuration}ms`);
    console.log(`   Steps: ${this.performanceSteps.length}`);
    console.log(`   Slowest Step: ${slowestStep.name} (${slowestStep.duration}ms)`);
    console.log(`   Profile saved to: ${profilePath}\n`);

    // Reset for next test
    this.performanceSteps = [];

    return profile;
  }

  /**
   * Capture debug snapshot with screenshot and page state
   */
  async captureDebugSnapshot(name: string): Promise<void> {
    if (!this.options.enableScreenshots) return;

    const timestamp = Date.now();
    const snapshotDir = join(
      process.cwd(),
      'server/__tests__/reports/debug-snapshots',
      `${name}-${timestamp}`
    );

    await mkdir(snapshotDir, { recursive: true });

    // Capture screenshot
    const screenshotPath = join(snapshotDir, 'screenshot.png');
    await this.page.screenshot({ path: screenshotPath, fullPage: true });

    // Capture page HTML
    const htmlPath = join(snapshotDir, 'page.html');
    const html = await this.page.content();
    await writeFile(htmlPath, html);

    // Capture console logs
    if (this.options.enableConsoleLogging) {
      const consolePath = join(snapshotDir, 'console.log');
      const logs = await this.page.evaluate(() => {
        return (window as any).__consoleLogs || [];
      });
      await writeFile(consolePath, JSON.stringify(logs, null, 2));
    }

    // Capture network requests
    if (this.options.enableNetworkLogging) {
      const networkPath = join(snapshotDir, 'network.json');
      const requests = await this.page.evaluate(() => {
        return performance.getEntriesByType('resource').map((r: any) => ({
          name: r.name,
          duration: r.duration,
          size: r.transferSize,
          type: r.initiatorType,
        }));
      });
      await writeFile(networkPath, JSON.stringify(requests, null, 2));
    }

    console.log(`📸 Debug snapshot saved to: ${snapshotDir}`);
  }

  /**
   * Log element information for debugging
   */
  async logElementInfo(selector: string): Promise<void> {
    try {
      const locator = this.page.locator(selector);
      const count = await locator.count();

      console.log(`\n🔍 Element Info: ${selector}`);
      console.log(`   Count: ${count}`);

      if (count > 0) {
        const element = locator.first();
        const isVisible = await element.isVisible();
        const isEnabled = await element.isEnabled();
        const boundingBox = await element.boundingBox();

        console.log(`   Visible: ${isVisible}`);
        console.log(`   Enabled: ${isEnabled}`);
        console.log(`   Bounding Box:`, boundingBox);

        const attributes = await element.evaluate((el) => {
          const attrs: Record<string, string> = {};
          for (let i = 0; i < el.attributes.length; i++) {
            const attr = el.attributes[i];
            attrs[attr.name] = attr.value;
          }
          return attrs;
        });

        console.log(`   Attributes:`, attributes);
      }
    } catch (error) {
      console.error(`❌ Error logging element info: ${error}`);
    }
  }

  /**
   * Wait with debug logging
   */
  async waitWithLogging(
    locator: Locator,
    options?: { timeout?: number; state?: 'attached' | 'detached' | 'visible' | 'hidden' }
  ): Promise<void> {
    const timeout = options?.timeout || 30000;
    const state = options?.state || 'visible';

    console.log(`⏳ Waiting for element to be ${state} (timeout: ${timeout}ms)`);

    try {
      await locator.waitFor({ ...options, timeout });
      console.log(`✅ Element is now ${state}`);
    } catch (error) {
      console.error(`❌ Timeout waiting for element to be ${state}`);
      
      // Suggest alternative selectors
      const selector = locator.toString();
      await this.suggestSelectors(selector);
      
      throw error;
    }
  }
}

/**
 * Create a debug helper instance
 */
export function createDebugHelper(
  page: Page,
  context: BrowserContext,
  options?: DebugOptions
): DebugHelper {
  return new DebugHelper(page, context, options);
}

/**
 * Enable debug mode for a test
 * Set environment variable: DEBUG=true
 */
export function isDebugMode(): boolean {
  return process.env.DEBUG === 'true' || process.env.PWDEBUG === '1';
}

/**
 * Conditional debug logging
 */
export function debugLog(message: string, ...args: any[]): void {
  if (isDebugMode()) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
}
