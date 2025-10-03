import { logger } from '../config/logger';

/**
 * Utility for detecting hardcoded credentials in code and configuration
 */
export class CredentialDetector {
  private static readonly CREDENTIAL_PATTERNS = [
    // Common hardcoded passwords
    /password\s*[:=]\s*["'](?!.*\$\{|.*process\.env)[^"']{3,}["']/gi,
    
    // Common hardcoded API keys and secrets
    /(?:api[_-]?key|secret|access[_-]?token)\s*[:=]\s*["'](?!.*\$\{|.*process\.env)[^"']{6,}["']/gi,
    
    // Database connection strings with embedded credentials
    /["'][^"']*:\/\/[^:]+:[^@]+@[^"']+["']/gi,
    
    // JWT secrets
    /jwt[_-]?secret\s*[:=]\s*["'](?!.*\$\{|.*process\.env)[^"']{10,}["']/gi,
    
    // Common test credentials that shouldn't be in production
    /(?:test@example\.com|demo123|password123|admin@|root@)/gi,
    
    // Hardcoded email/password combinations
    /email\s*[:=]\s*["'][^"']+@[^"']+["']\s*,?\s*password\s*[:=]\s*["'][^"']{3,}["']/gi,
  ];

  private static readonly SENSITIVE_KEYWORDS = [
    'password', 'secret', 'key', 'token', 'credential', 'auth',
    'api_key', 'access_token', 'private_key', 'client_secret'
  ];

  /**
   * Scans text content for potential hardcoded credentials
   */
  static scanContent(content: string, filename?: string): CredentialDetectionResult {
    const violations: CredentialViolation[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      this.CREDENTIAL_PATTERNS.forEach((pattern, patternIndex) => {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach(match => {
            violations.push({
              line: index + 1,
              content: line.trim(),
              match: match,
              pattern: pattern.source,
              severity: this.getSeverity(match),
              filename
            });
          });
        }
      });
    });

    return {
      hasViolations: violations.length > 0,
      violations,
      summary: this.generateSummary(violations)
    };
  }

  /**
   * Validates environment variables for security
   */
  static validateEnvironmentVariables(): EnvValidationResult {
    const issues: EnvSecurityIssue[] = [];
    const warnings: string[] = [];

    // Check for missing critical security variables
    const criticalVars = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'COOKIE_SECRET'];
    criticalVars.forEach(varName => {
      const value = process.env[varName];
      if (!value) {
        issues.push({
          variable: varName,
          issue: 'Missing required security variable',
          severity: 'high'
        });
      } else if (value.length < 32) {
        issues.push({
          variable: varName,
          issue: 'Security variable too short (minimum 32 characters)',
          severity: 'medium'
        });
      }
    });

    // Check for demo credentials in production
    if (process.env.NODE_ENV === 'production') {
      if (process.env.DEMO_USER_EMAIL || process.env.DEMO_USER_PASSWORD) {
        issues.push({
          variable: 'DEMO_USER_*',
          issue: 'Demo user credentials should not be set in production',
          severity: 'high'
        });
      }
    }

    // Check for weak demo passwords in development
    if (process.env.NODE_ENV !== 'production') {
      const demoPassword = process.env.DEMO_USER_PASSWORD;
      if (demoPassword && demoPassword.length < 8) {
        warnings.push('Demo user password is weak (less than 8 characters)');
      }
    }

    return {
      isSecure: issues.filter(i => i.severity === 'high').length === 0,
      issues,
      warnings
    };
  }

  /**
   * Logs credential detection results
   */
  static logDetectionResults(result: CredentialDetectionResult): void {
    if (result.hasViolations) {
      logger.warn('Credential detection found potential security issues:', {
        violationCount: result.violations.length,
        summary: result.summary
      });

      result.violations.forEach(violation => {
        logger.warn(`Potential credential detected in ${violation.filename ?? 'content'}:${violation.line}`, {
          severity: violation.severity,
          pattern: violation.pattern
        });
      });
    }
  }

  private static getSeverity(match: string): 'low' | 'medium' | 'high' {
    const lowerMatch = match.toLowerCase();
    
    // High severity for actual credentials and database URLs
    if (lowerMatch.includes('secret') || lowerMatch.includes('key') || lowerMatch.includes('token') || 
        lowerMatch.includes('://') && lowerMatch.includes('@')) {
      return 'high';
    }
    
    // Medium severity for passwords
    if (lowerMatch.includes('password')) {
      return 'medium';
    }
    
    return 'low';
  }

  private static generateSummary(violations: CredentialViolation[]): string {
    const severityCounts = violations.reduce((acc, v) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const parts = [];
    if (severityCounts.high) parts.push(`${severityCounts.high} high severity`);
    if (severityCounts.medium) parts.push(`${severityCounts.medium} medium severity`);
    if (severityCounts.low) parts.push(`${severityCounts.low} low severity`);

    return `Found ${violations.length} potential credential violations: ${parts.join(', ')}`;
  }
}

export interface CredentialDetectionResult {
  hasViolations: boolean;
  violations: CredentialViolation[];
  summary: string;
}

export interface CredentialViolation {
  line: number;
  content: string;
  match: string;
  pattern: string;
  severity: 'low' | 'medium' | 'high';
  filename?: string;
}

export interface EnvValidationResult {
  isSecure: boolean;
  issues: EnvSecurityIssue[];
  warnings: string[];
}

export interface EnvSecurityIssue {
  variable: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
}