import { Page } from '@playwright/test';
import { injectAxe, checkA11y, getViolations, configureAxe } from 'axe-playwright';

/**
 * Accessibility Helper Utilities
 * 
 * Provides utilities for WCAG 2.1 AA compliance testing using axe-core.
 * Includes violation reporting, categorization, and remediation guidance.
 */

export interface AccessibilityViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  help: string;
  helpUrl: string;
  nodes: ViolationNode[];
  tags: string[];
}

export interface ViolationNode {
  html: string;
  target: string[];
  failureSummary: string;
  impact: string;
}

export interface AccessibilityReport {
  url: string;
  timestamp: Date;
  violations: AccessibilityViolation[];
  violationCount: number;
  criticalCount: number;
  seriousCount: number;
  moderateCount: number;
  minorCount: number;
  passed: boolean;
}

/**
 * WCAG 2.1 AA rule configuration
 * Focuses on Level A and AA compliance
 */
export const WCAG_21_AA_CONFIG = {
  runOnly: {
    type: 'tag' as const,
    values: [
      'wcag2a',      // WCAG 2.0 Level A
      'wcag2aa',     // WCAG 2.0 Level AA
      'wcag21a',     // WCAG 2.1 Level A
      'wcag21aa',    // WCAG 2.1 Level AA
    ]
  },
  rules: {
    // Color contrast rules
    'color-contrast': { enabled: true },
    'color-contrast-enhanced': { enabled: false }, // AAA only
    
    // Keyboard navigation
    'focus-order-semantics': { enabled: true },
    'tabindex': { enabled: true },
    
    // ARIA
    'aria-allowed-attr': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    
    // Forms
    'label': { enabled: true },
    'label-title-only': { enabled: true },
    
    // Landmarks
    'landmark-one-main': { enabled: true },
    'region': { enabled: true },
    
    // Images
    'image-alt': { enabled: true },
    
    // Headings
    'heading-order': { enabled: true },
  }
};

/**
 * Accessibility Helper Class
 * Wraps axe-core functionality with additional utilities
 */
export class AccessibilityHelper {
  constructor(private page: Page) {}

  /**
   * Initialize axe-core on the page
   */
  async initialize(): Promise<void> {
    await injectAxe(this.page);
    await configureAxe(this.page, WCAG_21_AA_CONFIG);
  }

  /**
   * Run accessibility scan and return violations
   */
  async scan(context?: string | string[]): Promise<AccessibilityViolation[]> {
    await this.initialize();
    
    const violations = await getViolations(this.page, context, {
      ...WCAG_21_AA_CONFIG,
      detailedReport: true,
      detailedReportOptions: { html: true }
    });

    return violations.map(v => ({
      id: v.id,
      impact: v.impact as 'critical' | 'serious' | 'moderate' | 'minor',
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      tags: v.tags,
      nodes: v.nodes.map(n => ({
        html: n.html,
        target: n.target,
        failureSummary: n.failureSummary || '',
        impact: n.impact || v.impact
      }))
    }));
  }

  /**
   * Check accessibility and throw if violations found
   */
  async check(context?: string | string[]): Promise<void> {
    await this.initialize();
    await checkA11y(this.page, context, {
      ...WCAG_21_AA_CONFIG,
      detailedReport: true,
      detailedReportOptions: { html: true }
    });
  }

  /**
   * Generate comprehensive accessibility report
   */
  async generateReport(): Promise<AccessibilityReport> {
    const violations = await this.scan();
    
    const categorized = this.categorizeViolations(violations);
    
    return {
      url: this.page.url(),
      timestamp: new Date(),
      violations,
      violationCount: violations.length,
      criticalCount: categorized.critical.length,
      seriousCount: categorized.serious.length,
      moderateCount: categorized.moderate.length,
      minorCount: categorized.minor.length,
      passed: violations.length === 0
    };
  }

  /**
   * Categorize violations by severity
   */
  categorizeViolations(violations: AccessibilityViolation[]): {
    critical: AccessibilityViolation[];
    serious: AccessibilityViolation[];
    moderate: AccessibilityViolation[];
    minor: AccessibilityViolation[];
  } {
    return {
      critical: violations.filter(v => v.impact === 'critical'),
      serious: violations.filter(v => v.impact === 'serious'),
      moderate: violations.filter(v => v.impact === 'moderate'),
      minor: violations.filter(v => v.impact === 'minor')
    };
  }

  /**
   * Get remediation guidance for a violation
   */
  getRemediationGuidance(violationId: string): RemediationGuidance {
    return REMEDIATION_GUIDANCE[violationId] || {
      title: 'Unknown Violation',
      description: 'No guidance available for this violation.',
      steps: ['Consult the violation help URL for more information.'],
      resources: []
    };
  }

  /**
   * Format violations for console output
   */
  formatViolationsForConsole(violations: AccessibilityViolation[]): string {
    if (violations.length === 0) {
      return '✅ No accessibility violations found!';
    }

    const categorized = this.categorizeViolations(violations);
    
    let output = `\n❌ Found ${violations.length} accessibility violation(s):\n\n`;
    
    if (categorized.critical.length > 0) {
      output += `🔴 CRITICAL (${categorized.critical.length}):\n`;
      categorized.critical.forEach(v => {
        output += `  - ${v.id}: ${v.description}\n`;
        output += `    Help: ${v.helpUrl}\n`;
      });
      output += '\n';
    }
    
    if (categorized.serious.length > 0) {
      output += `🟠 SERIOUS (${categorized.serious.length}):\n`;
      categorized.serious.forEach(v => {
        output += `  - ${v.id}: ${v.description}\n`;
      });
      output += '\n';
    }
    
    if (categorized.moderate.length > 0) {
      output += `🟡 MODERATE (${categorized.moderate.length}):\n`;
      categorized.moderate.forEach(v => {
        output += `  - ${v.id}: ${v.description}\n`;
      });
      output += '\n';
    }
    
    if (categorized.minor.length > 0) {
      output += `🔵 MINOR (${categorized.minor.length}):\n`;
      categorized.minor.forEach(v => {
        output += `  - ${v.id}: ${v.description}\n`;
      });
    }
    
    return output;
  }

  /**
   * Test color contrast for specific elements
   */
  async testColorContrast(selector?: string): Promise<AccessibilityViolation[]> {
    await this.initialize();
    
    const violations = await getViolations(this.page, selector, {
      runOnly: {
        type: 'rule',
        values: ['color-contrast']
      }
    });

    return violations.map(v => ({
      id: v.id,
      impact: v.impact as 'critical' | 'serious' | 'moderate' | 'minor',
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      tags: v.tags,
      nodes: v.nodes.map(n => ({
        html: n.html,
        target: n.target,
        failureSummary: n.failureSummary || '',
        impact: n.impact || v.impact
      }))
    }));
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation(): Promise<{
    passed: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    // Get all interactive elements
    const interactiveElements = await this.page.locator(
      'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ).all();

    for (let i = 0; i < interactiveElements.length; i++) {
      await this.page.keyboard.press('Tab');
      
      // Check if focus is visible
      const focusVisible = await this.page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return false;
        
        const styles = window.getComputedStyle(el);
        const hasOutline = styles.outline !== 'none' && styles.outlineWidth !== '0px';
        const hasBoxShadow = styles.boxShadow !== 'none';
        const hasBorder = styles.borderWidth !== '0px';
        
        return hasOutline || hasBoxShadow || hasBorder;
      });

      if (!focusVisible) {
        const elementInfo = await this.page.evaluate(() => {
          const el = document.activeElement;
          return {
            tag: el?.tagName,
            id: el?.id,
            class: el?.className
          };
        });
        issues.push(`Element ${elementInfo.tag}${elementInfo.id ? '#' + elementInfo.id : ''} has no visible focus indicator`);
      }
    }

    return {
      passed: issues.length === 0,
      issues
    };
  }

  /**
   * Test ARIA labels and landmarks
   */
  async testARIA(): Promise<AccessibilityViolation[]> {
    await this.initialize();
    
    const violations = await getViolations(this.page, undefined, {
      runOnly: {
        type: 'rule',
        values: [
          'aria-allowed-attr',
          'aria-required-attr',
          'aria-valid-attr',
          'aria-valid-attr-value',
          'landmark-one-main',
          'region'
        ]
      }
    });

    return violations.map(v => ({
      id: v.id,
      impact: v.impact as 'critical' | 'serious' | 'moderate' | 'minor',
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      tags: v.tags,
      nodes: v.nodes.map(n => ({
        html: n.html,
        target: n.target,
        failureSummary: n.failureSummary || '',
        impact: n.impact || v.impact
      }))
    }));
  }

  /**
   * Test form accessibility
   */
  async testFormAccessibility(): Promise<AccessibilityViolation[]> {
    await this.initialize();
    
    const violations = await getViolations(this.page, undefined, {
      runOnly: {
        type: 'rule',
        values: [
          'label',
          'label-title-only',
          'form-field-multiple-labels',
          'duplicate-id-aria',
          'aria-input-field-name'
        ]
      }
    });

    return violations.map(v => ({
      id: v.id,
      impact: v.impact as 'critical' | 'serious' | 'moderate' | 'minor',
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      tags: v.tags,
      nodes: v.nodes.map(n => ({
        html: n.html,
        target: n.target,
        failureSummary: n.failureSummary || '',
        impact: n.impact || v.impact
      }))
    }));
  }
}

/**
 * Remediation guidance for common violations
 */
interface RemediationGuidance {
  title: string;
  description: string;
  steps: string[];
  resources: string[];
}

const REMEDIATION_GUIDANCE: Record<string, RemediationGuidance> = {
  'color-contrast': {
    title: 'Color Contrast',
    description: 'Text must have sufficient contrast against its background (4.5:1 for normal text, 3:1 for large text).',
    steps: [
      'Use a color contrast checker tool to verify ratios',
      'Adjust text color or background color to meet minimum ratios',
      'Consider using darker text on light backgrounds or lighter text on dark backgrounds',
      'Test with different color blindness simulations'
    ],
    resources: [
      'https://webaim.org/resources/contrastchecker/',
      'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html'
    ]
  },
  'label': {
    title: 'Form Labels',
    description: 'Form inputs must have associated labels.',
    steps: [
      'Add a <label> element with a "for" attribute matching the input\'s "id"',
      'Or wrap the input in a <label> element',
      'Or use aria-label or aria-labelledby attributes',
      'Ensure label text is descriptive and clear'
    ],
    resources: [
      'https://www.w3.org/WAI/tutorials/forms/labels/',
      'https://webaim.org/techniques/forms/controls'
    ]
  },
  'aria-allowed-attr': {
    title: 'ARIA Attributes',
    description: 'Elements must only use ARIA attributes that are allowed for their role.',
    steps: [
      'Check the ARIA specification for allowed attributes',
      'Remove invalid ARIA attributes',
      'Use semantic HTML elements when possible instead of ARIA',
      'Validate ARIA usage with automated tools'
    ],
    resources: [
      'https://www.w3.org/TR/wai-aria-1.2/',
      'https://www.w3.org/WAI/ARIA/apg/'
    ]
  },
  'landmark-one-main': {
    title: 'Main Landmark',
    description: 'Page must have exactly one main landmark.',
    steps: [
      'Add a <main> element or role="main" to the primary content area',
      'Ensure only one main landmark exists per page',
      'Remove duplicate main landmarks',
      'Use other landmarks (nav, aside, footer) for other sections'
    ],
    resources: [
      'https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/',
      'https://webaim.org/techniques/semanticstructure/'
    ]
  },
  'heading-order': {
    title: 'Heading Order',
    description: 'Headings must be in a logical order (h1, h2, h3, etc.).',
    steps: [
      'Start with h1 for the main page title',
      'Use h2 for major sections',
      'Use h3 for subsections within h2',
      'Don\'t skip heading levels',
      'Use CSS for visual styling, not heading levels'
    ],
    resources: [
      'https://www.w3.org/WAI/tutorials/page-structure/headings/',
      'https://webaim.org/techniques/semanticstructure/'
    ]
  },
  'image-alt': {
    title: 'Image Alt Text',
    description: 'Images must have alternative text.',
    steps: [
      'Add alt attribute to all <img> elements',
      'Describe the content and function of the image',
      'Use empty alt="" for decorative images',
      'Keep alt text concise (under 150 characters)',
      'Don\'t include "image of" or "picture of"'
    ],
    resources: [
      'https://www.w3.org/WAI/tutorials/images/',
      'https://webaim.org/techniques/alttext/'
    ]
  },
  'tabindex': {
    title: 'Tab Index',
    description: 'Avoid positive tabindex values; use 0 or -1.',
    steps: [
      'Remove positive tabindex values (tabindex="1", tabindex="2", etc.)',
      'Use tabindex="0" to add elements to natural tab order',
      'Use tabindex="-1" to remove elements from tab order',
      'Rely on natural DOM order for keyboard navigation'
    ],
    resources: [
      'https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html',
      'https://webaim.org/techniques/keyboard/tabindex'
    ]
  }
};

/**
 * Convenience function to create AccessibilityHelper instance
 */
export function createAccessibilityHelper(page: Page): AccessibilityHelper {
  return new AccessibilityHelper(page);
}

/**
 * Quick accessibility check for a page
 */
export async function quickAccessibilityCheck(page: Page): Promise<AccessibilityReport> {
  const helper = new AccessibilityHelper(page);
  return await helper.generateReport();
}
