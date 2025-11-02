import { Page } from '@playwright/test';
import { playAudit } from 'playwright-lighthouse';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Performance Helper Utilities
 * 
 * Provides utilities for measuring Core Web Vitals, Lighthouse scores,
 * and performance metrics. Includes trend tracking and reporting.
 */

export interface CoreWebVitals {
  lcp: number;  // Largest Contentful Paint (ms)
  fid: number;  // First Input Delay (ms)
  cls: number;  // Cumulative Layout Shift (score)
  fcp: number;  // First Contentful Paint (ms)
  ttfb: number; // Time to First Byte (ms)
  tti: number;  // Time to Interactive (ms)
}

export interface PerformanceMetrics {
  url: string;
  timestamp: Date;
  coreWebVitals: CoreWebVitals;
  navigationTiming: NavigationTiming;
  resourceTiming: ResourceMetrics;
  customMetrics?: Record<string, number>;
}

export interface NavigationTiming {
  domContentLoaded: number;
  loadComplete: number;
  domInteractive: number;
  responseTime: number;
  fetchStart: number;
  requestStart: number;
  responseStart: number;
  responseEnd: number;
  domComplete: number;
  loadEventStart: number;
  loadEventEnd: number;
}

export interface ResourceMetrics {
  totalResources: number;
  totalSize: number;
  totalDuration: number;
  resourcesByType: Record<string, ResourceTypeMetrics>;
}

export interface ResourceTypeMetrics {
  count: number;
  size: number;
  duration: number;
}

export interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  pwa?: number;
}

export interface LighthouseMetrics {
  scores: LighthouseScores;
  metrics: {
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    totalBlockingTime: number;
    cumulativeLayoutShift: number;
    speedIndex: number;
    timeToInteractive: number;
  };
  opportunities: LighthouseOpportunity[];
  diagnostics: LighthouseDiagnostic[];
}

export interface LighthouseOpportunity {
  id: string;
  title: string;
  description: string;
  score: number;
  numericValue: number;
  displayValue: string;
}

export interface LighthouseDiagnostic {
  id: string;
  title: string;
  description: string;
  score: number;
  displayValue: string;
}

export interface PerformanceReport {
  url: string;
  timestamp: Date;
  metrics: PerformanceMetrics;
  lighthouse?: LighthouseMetrics;
  passed: boolean;
  failures: string[];
  warnings: string[];
}

export interface PerformanceTrend {
  metric: string;
  values: TrendDataPoint[];
  average: number;
  min: number;
  max: number;
  trend: 'improving' | 'stable' | 'degrading';
}

export interface TrendDataPoint {
  timestamp: Date;
  value: number;
}

/**
 * Performance thresholds based on requirements
 */
export const PERFORMANCE_THRESHOLDS = {
  // Core Web Vitals (Good thresholds)
  lcp: 2500,      // < 2.5s
  fid: 100,       // < 100ms
  cls: 0.1,       // < 0.1
  fcp: 1800,      // < 1.8s
  ttfb: 800,      // < 800ms
  tti: 3800,      // < 3.8s
  
  // Page load times
  pageLoad: 3000, // < 3s
  
  // API response times
  apiAuth: 500,   // < 500ms for auth endpoints
  apiGeneral: 1000, // < 1s for general endpoints
  
  // Search completion
  searchMin: 120000,  // 2 minutes minimum
  searchMax: 180000,  // 3 minutes maximum
  
  // Lighthouse scores (minimum acceptable)
  lighthousePerformance: 90,
  lighthouseAccessibility: 90,
  lighthouseBestPractices: 90,
  lighthouseSEO: 90
};

/**
 * Performance Helper Class
 */
export class PerformanceHelper {
  private trendDataPath: string;

  constructor(private page: Page) {
    this.trendDataPath = path.join(process.cwd(), 'server/__tests__/reports/performance-trends.json');
  }

  /**
   * Measure Core Web Vitals
   */
  async measureCoreWebVitals(): Promise<CoreWebVitals> {
    return await this.page.evaluate(() => {
      return new Promise<any>((resolve) => {
        const metrics: any = {
          lcp: 0,
          fid: 0,
          cls: 0,
          fcp: 0,
          ttfb: 0,
          tti: 0
        };

        // Get navigation timing for TTFB
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          metrics.ttfb = navigation.responseStart - navigation.requestStart;
        }

        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          metrics.lcp = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            metrics.fid = entry.processingStart - entry.startTime;
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          metrics.cls = clsValue;
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        // First Contentful Paint
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          metrics.fcp = fcpEntry.startTime;
        }

        // Time to Interactive (approximation using domInteractive)
        if (navigation) {
          metrics.tti = navigation.domInteractive;
        }

        // Wait for metrics to be collected
        setTimeout(() => {
          lcpObserver.disconnect();
          fidObserver.disconnect();
          clsObserver.disconnect();
          resolve(metrics);
        }, 3000);
      });
    });
  }

  /**
   * Measure navigation timing metrics
   */
  async measureNavigationTiming(): Promise<NavigationTiming> {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        domInteractive: navigation.domInteractive,
        responseTime: navigation.responseEnd - navigation.requestStart,
        fetchStart: navigation.fetchStart,
        requestStart: navigation.requestStart,
        responseStart: navigation.responseStart,
        responseEnd: navigation.responseEnd,
        domComplete: navigation.domComplete,
        loadEventStart: navigation.loadEventStart,
        loadEventEnd: navigation.loadEventEnd
      };
    });
  }

  /**
   * Measure resource loading metrics
   */
  async measureResourceTiming(): Promise<ResourceMetrics> {
    return await this.page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      const resourcesByType: Record<string, any> = {};
      let totalSize = 0;
      let totalDuration = 0;

      resources.forEach(resource => {
        const type = resource.initiatorType || 'other';
        const size = resource.transferSize || 0;
        const duration = resource.duration;

        if (!resourcesByType[type]) {
          resourcesByType[type] = {
            count: 0,
            size: 0,
            duration: 0
          };
        }

        resourcesByType[type].count++;
        resourcesByType[type].size += size;
        resourcesByType[type].duration += duration;

        totalSize += size;
        totalDuration += duration;
      });

      return {
        totalResources: resources.length,
        totalSize,
        totalDuration,
        resourcesByType
      };
    });
  }

  /**
   * Collect comprehensive performance metrics
   */
  async collectMetrics(): Promise<PerformanceMetrics> {
    const coreWebVitals = await this.measureCoreWebVitals();
    const navigationTiming = await this.measureNavigationTiming();
    const resourceTiming = await this.measureResourceTiming();

    return {
      url: this.page.url(),
      timestamp: new Date(),
      coreWebVitals,
      navigationTiming,
      resourceTiming
    };
  }

  /**
   * Run Lighthouse audit
   */
  async runLighthouseAudit(options?: any): Promise<LighthouseMetrics> {
    const defaultOptions = {
      port: new URL(this.page.context().browser()!.wsEndpoint()).port,
      thresholds: {
        performance: PERFORMANCE_THRESHOLDS.lighthousePerformance,
        accessibility: PERFORMANCE_THRESHOLDS.lighthouseAccessibility,
        'best-practices': PERFORMANCE_THRESHOLDS.lighthouseBestPractices,
        seo: PERFORMANCE_THRESHOLDS.lighthouseSEO
      },
      opts: {
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo']
      }
    };

    const auditOptions = { ...defaultOptions, ...options };
    
    try {
      const result = await playAudit({
        page: this.page,
        port: auditOptions.port,
        thresholds: auditOptions.thresholds,
        opts: auditOptions.opts
      });

      const lhr = result.lhr;

      return {
        scores: {
          performance: lhr.categories.performance.score * 100,
          accessibility: lhr.categories.accessibility.score * 100,
          bestPractices: lhr.categories['best-practices'].score * 100,
          seo: lhr.categories.seo.score * 100
        },
        metrics: {
          firstContentfulPaint: lhr.audits['first-contentful-paint'].numericValue,
          largestContentfulPaint: lhr.audits['largest-contentful-paint'].numericValue,
          totalBlockingTime: lhr.audits['total-blocking-time'].numericValue,
          cumulativeLayoutShift: lhr.audits['cumulative-layout-shift'].numericValue,
          speedIndex: lhr.audits['speed-index'].numericValue,
          timeToInteractive: lhr.audits['interactive'].numericValue
        },
        opportunities: this.extractOpportunities(lhr),
        diagnostics: this.extractDiagnostics(lhr)
      };
    } catch (error) {
      console.warn('Lighthouse audit failed:', error);
      // Return default values if Lighthouse fails
      return {
        scores: {
          performance: 0,
          accessibility: 0,
          bestPractices: 0,
          seo: 0
        },
        metrics: {
          firstContentfulPaint: 0,
          largestContentfulPaint: 0,
          totalBlockingTime: 0,
          cumulativeLayoutShift: 0,
          speedIndex: 0,
          timeToInteractive: 0
        },
        opportunities: [],
        diagnostics: []
      };
    }
  }

  /**
   * Extract optimization opportunities from Lighthouse report
   */
  private extractOpportunities(lhr: any): LighthouseOpportunity[] {
    const opportunities: LighthouseOpportunity[] = [];
    
    Object.keys(lhr.audits).forEach(auditId => {
      const audit = lhr.audits[auditId];
      if (audit.details?.type === 'opportunity' && audit.score !== null && audit.score < 1) {
        opportunities.push({
          id: auditId,
          title: audit.title,
          description: audit.description,
          score: audit.score,
          numericValue: audit.numericValue || 0,
          displayValue: audit.displayValue || ''
        });
      }
    });

    return opportunities.sort((a, b) => a.score - b.score);
  }

  /**
   * Extract diagnostics from Lighthouse report
   */
  private extractDiagnostics(lhr: any): LighthouseDiagnostic[] {
    const diagnostics: LighthouseDiagnostic[] = [];
    
    Object.keys(lhr.audits).forEach(auditId => {
      const audit = lhr.audits[auditId];
      if (audit.details?.type === 'diagnostic' && audit.score !== null && audit.score < 1) {
        diagnostics.push({
          id: auditId,
          title: audit.title,
          description: audit.description,
          score: audit.score,
          displayValue: audit.displayValue || ''
        });
      }
    });

    return diagnostics;
  }

  /**
   * Generate comprehensive performance report
   */
  async generateReport(includeLighthouse: boolean = false): Promise<PerformanceReport> {
    const metrics = await this.collectMetrics();
    const failures: string[] = [];
    const warnings: string[] = [];

    // Check Core Web Vitals
    if (metrics.coreWebVitals.lcp > PERFORMANCE_THRESHOLDS.lcp) {
      failures.push(`LCP (${metrics.coreWebVitals.lcp.toFixed(0)}ms) exceeds threshold (${PERFORMANCE_THRESHOLDS.lcp}ms)`);
    }
    if (metrics.coreWebVitals.fid > PERFORMANCE_THRESHOLDS.fid) {
      failures.push(`FID (${metrics.coreWebVitals.fid.toFixed(0)}ms) exceeds threshold (${PERFORMANCE_THRESHOLDS.fid}ms)`);
    }
    if (metrics.coreWebVitals.cls > PERFORMANCE_THRESHOLDS.cls) {
      failures.push(`CLS (${metrics.coreWebVitals.cls.toFixed(3)}) exceeds threshold (${PERFORMANCE_THRESHOLDS.cls})`);
    }
    if (metrics.coreWebVitals.fcp > PERFORMANCE_THRESHOLDS.fcp) {
      warnings.push(`FCP (${metrics.coreWebVitals.fcp.toFixed(0)}ms) exceeds threshold (${PERFORMANCE_THRESHOLDS.fcp}ms)`);
    }
    if (metrics.coreWebVitals.ttfb > PERFORMANCE_THRESHOLDS.ttfb) {
      warnings.push(`TTFB (${metrics.coreWebVitals.ttfb.toFixed(0)}ms) exceeds threshold (${PERFORMANCE_THRESHOLDS.ttfb}ms)`);
    }

    // Check page load time
    const pageLoadTime = metrics.navigationTiming.loadEventEnd - metrics.navigationTiming.fetchStart;
    if (pageLoadTime > PERFORMANCE_THRESHOLDS.pageLoad) {
      failures.push(`Page load time (${pageLoadTime.toFixed(0)}ms) exceeds threshold (${PERFORMANCE_THRESHOLDS.pageLoad}ms)`);
    }

    let lighthouse: LighthouseMetrics | undefined;
    if (includeLighthouse) {
      lighthouse = await this.runLighthouseAudit();
      
      // Check Lighthouse scores
      if (lighthouse.scores.performance < PERFORMANCE_THRESHOLDS.lighthousePerformance) {
        warnings.push(`Lighthouse Performance score (${lighthouse.scores.performance}) below threshold (${PERFORMANCE_THRESHOLDS.lighthousePerformance})`);
      }
    }

    return {
      url: metrics.url,
      timestamp: metrics.timestamp,
      metrics,
      lighthouse,
      passed: failures.length === 0,
      failures,
      warnings
    };
  }

  /**
   * Validate Core Web Vitals against thresholds
   */
  validateCoreWebVitals(vitals: CoreWebVitals): {
    passed: boolean;
    failures: string[];
  } {
    const failures: string[] = [];

    if (vitals.lcp > PERFORMANCE_THRESHOLDS.lcp) {
      failures.push(`LCP: ${vitals.lcp.toFixed(0)}ms > ${PERFORMANCE_THRESHOLDS.lcp}ms`);
    }
    if (vitals.fid > PERFORMANCE_THRESHOLDS.fid) {
      failures.push(`FID: ${vitals.fid.toFixed(0)}ms > ${PERFORMANCE_THRESHOLDS.fid}ms`);
    }
    if (vitals.cls > PERFORMANCE_THRESHOLDS.cls) {
      failures.push(`CLS: ${vitals.cls.toFixed(3)} > ${PERFORMANCE_THRESHOLDS.cls}`);
    }

    return {
      passed: failures.length === 0,
      failures
    };
  }

  /**
   * Measure API response time
   */
  async measureAPIResponseTime(apiCall: () => Promise<any>): Promise<number> {
    const startTime = Date.now();
    await apiCall();
    const endTime = Date.now();
    return endTime - startTime;
  }

  /**
   * Save performance metrics to trend data
   */
  async saveTrendData(metrics: PerformanceMetrics): Promise<void> {
    let trendData: any[] = [];

    // Load existing trend data
    if (fs.existsSync(this.trendDataPath)) {
      const fileContent = fs.readFileSync(this.trendDataPath, 'utf-8');
      trendData = JSON.parse(fileContent);
    }

    // Add new data point
    trendData.push({
      url: metrics.url,
      timestamp: metrics.timestamp,
      lcp: metrics.coreWebVitals.lcp,
      fid: metrics.coreWebVitals.fid,
      cls: metrics.coreWebVitals.cls,
      fcp: metrics.coreWebVitals.fcp,
      ttfb: metrics.coreWebVitals.ttfb,
      pageLoad: metrics.navigationTiming.loadEventEnd - metrics.navigationTiming.fetchStart
    });

    // Keep only last 100 data points per URL
    const urlData = trendData.filter(d => d.url === metrics.url);
    if (urlData.length > 100) {
      trendData = trendData.filter(d => d.url !== metrics.url).concat(urlData.slice(-100));
    }

    // Ensure directory exists
    const dir = path.dirname(this.trendDataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Save trend data
    fs.writeFileSync(this.trendDataPath, JSON.stringify(trendData, null, 2));
  }

  /**
   * Get performance trends for a specific metric
   */
  getTrend(url: string, metric: keyof CoreWebVitals | 'pageLoad'): PerformanceTrend | null {
    if (!fs.existsSync(this.trendDataPath)) {
      return null;
    }

    const fileContent = fs.readFileSync(this.trendDataPath, 'utf-8');
    const trendData = JSON.parse(fileContent);
    
    const urlData = trendData.filter((d: any) => d.url === url);
    if (urlData.length === 0) {
      return null;
    }

    const values: TrendDataPoint[] = urlData.map((d: any) => ({
      timestamp: new Date(d.timestamp),
      value: d[metric]
    }));

    const numericValues = values.map(v => v.value);
    const average = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);

    // Calculate trend (simple linear regression)
    const trend = this.calculateTrend(numericValues);

    return {
      metric,
      values,
      average,
      min,
      max,
      trend
    };
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(values: number[]): 'improving' | 'stable' | 'degrading' {
    if (values.length < 2) return 'stable';

    // Simple linear regression
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
    const sumX2 = values.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // For performance metrics, negative slope is improving (lower is better)
    if (slope < -0.1) return 'improving';
    if (slope > 0.1) return 'degrading';
    return 'stable';
  }

  /**
   * Format performance report for console output
   */
  formatReportForConsole(report: PerformanceReport): string {
    let output = `\n📊 Performance Report for ${report.url}\n`;
    output += `Timestamp: ${report.timestamp.toISOString()}\n\n`;

    output += `Core Web Vitals:\n`;
    output += `  LCP: ${report.metrics.coreWebVitals.lcp.toFixed(0)}ms (threshold: ${PERFORMANCE_THRESHOLDS.lcp}ms)\n`;
    output += `  FID: ${report.metrics.coreWebVitals.fid.toFixed(0)}ms (threshold: ${PERFORMANCE_THRESHOLDS.fid}ms)\n`;
    output += `  CLS: ${report.metrics.coreWebVitals.cls.toFixed(3)} (threshold: ${PERFORMANCE_THRESHOLDS.cls})\n`;
    output += `  FCP: ${report.metrics.coreWebVitals.fcp.toFixed(0)}ms (threshold: ${PERFORMANCE_THRESHOLDS.fcp}ms)\n`;
    output += `  TTFB: ${report.metrics.coreWebVitals.ttfb.toFixed(0)}ms (threshold: ${PERFORMANCE_THRESHOLDS.ttfb}ms)\n\n`;

    const pageLoadTime = report.metrics.navigationTiming.loadEventEnd - report.metrics.navigationTiming.fetchStart;
    output += `Page Load Time: ${pageLoadTime.toFixed(0)}ms (threshold: ${PERFORMANCE_THRESHOLDS.pageLoad}ms)\n\n`;

    if (report.lighthouse) {
      output += `Lighthouse Scores:\n`;
      output += `  Performance: ${report.lighthouse.scores.performance}\n`;
      output += `  Accessibility: ${report.lighthouse.scores.accessibility}\n`;
      output += `  Best Practices: ${report.lighthouse.scores.bestPractices}\n`;
      output += `  SEO: ${report.lighthouse.scores.seo}\n\n`;
    }

    if (report.failures.length > 0) {
      output += `❌ Failures:\n`;
      report.failures.forEach(failure => {
        output += `  - ${failure}\n`;
      });
      output += '\n';
    }

    if (report.warnings.length > 0) {
      output += `⚠️  Warnings:\n`;
      report.warnings.forEach(warning => {
        output += `  - ${warning}\n`;
      });
      output += '\n';
    }

    if (report.passed) {
      output += `✅ All performance checks passed!\n`;
    }

    return output;
  }
}

/**
 * Convenience function to create PerformanceHelper instance
 */
export function createPerformanceHelper(page: Page): PerformanceHelper {
  return new PerformanceHelper(page);
}

/**
 * Quick performance check for a page
 */
export async function quickPerformanceCheck(page: Page): Promise<PerformanceReport> {
  const helper = new PerformanceHelper(page);
  return await helper.generateReport(false);
}

/**
 * Comprehensive performance check with Lighthouse
 */
export async function comprehensivePerformanceCheck(page: Page): Promise<PerformanceReport> {
  const helper = new PerformanceHelper(page);
  return await helper.generateReport(true);
}
