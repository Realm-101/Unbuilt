import { envValidator } from '../config/envValidator';
import { securityConfig } from '../config/securityConfig';
import { CredentialDetector } from '../utils/credentialDetection';
import fs from 'fs/promises';
import path from 'path';

export interface SecurityCheckResult {
  category: string;
  check: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  recommendation?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityChecklistReport {
  timestamp: string;
  environment: string;
  overallStatus: 'pass' | 'fail' | 'warning';
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  results: SecurityCheckResult[];
  recommendations: string[];
}

export class SecurityChecklist {
  private results: SecurityCheckResult[] = [];
  private environment: string;

  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
  }

  async runAllChecks(): Promise<SecurityChecklistReport> {
    this.results = [];

    // Run all security checks
    await this.checkEnvironmentConfiguration();
    await this.checkAuthenticationSecurity();
    await this.checkDatabaseSecurity();
    await this.checkSessionSecurity();
    await this.checkInputValidation();
    await this.checkErrorHandling();
    await this.checkLoggingAndMonitoring();
    await this.checkDeploymentSecurity();
    await this.checkCredentialSecurity();
    await this.checkDependencySecurity();

    return this.generateReport();
  }

  private async checkEnvironmentConfiguration(): Promise<void> {
    const category = 'Environment Configuration';

    try {
      // Check environment validation
      const requiredValidation = envValidator.validateRequired();
      const optionalValidation = envValidator.validateOptional();

      if (requiredValidation.isValid) {
        this.addResult(category, 'Environment Variables', 'pass', 
          'All required environment variables are properly configured', 'low');
      } else {
        this.addResult(category, 'Environment Variables', 'fail',
          `Missing required environment variables: ${requiredValidation.errors.map(e => e.field).join(', ')}`,
          'critical', 'Configure all required environment variables before deployment');
      }

      // Check security configuration
      const securityConfigValidation = securityConfig.validateConfiguration();
      if (securityConfigValidation.isValid) {
        this.addResult(category, 'Security Configuration', 'pass',
          'Security configuration is valid', 'low');
      } else {
        this.addResult(category, 'Security Configuration', 'fail',
          `Security configuration errors: ${securityConfigValidation.errors.join(', ')}`,
          'high', 'Fix security configuration issues');
      }

      // Check NODE_ENV
      if (this.environment === 'production') {
        this.addResult(category, 'Production Environment', 'pass',
          'NODE_ENV is set to production', 'low');
      } else if (!process.env.NODE_ENV) {
        this.addResult(category, 'Environment Setting', 'warning',
          'NODE_ENV is not set', 'medium', 'Set NODE_ENV to production for production deployments');
      }

    } catch (error) {
      this.addResult(category, 'Environment Check', 'fail',
        `Environment configuration check failed: ${error}`, 'high');
    }
  }

  private async checkAuthenticationSecurity(): Promise<void> {
    const category = 'Authentication Security';

    try {
      // Check JWT configuration
      const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
      const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

      if (jwtAccessSecret && jwtAccessSecret.length >= 32) {
        this.addResult(category, 'JWT Access Secret', 'pass',
          'JWT access secret is properly configured', 'low');
      } else {
        this.addResult(category, 'JWT Access Secret', 'fail',
          'JWT access secret is missing or too short', 'critical',
          'Set JWT_ACCESS_SECRET to a secure value with at least 32 characters');
      }

      if (jwtRefreshSecret && jwtRefreshSecret.length >= 32) {
        this.addResult(category, 'JWT Refresh Secret', 'pass',
          'JWT refresh secret is properly configured', 'low');
      } else {
        this.addResult(category, 'JWT Refresh Secret', 'fail',
          'JWT refresh secret is missing or too short', 'critical',
          'Set JWT_REFRESH_SECRET to a secure value with at least 32 characters');
      }

      // Check if secrets are different
      if (jwtAccessSecret && jwtRefreshSecret && jwtAccessSecret === jwtRefreshSecret) {
        this.addResult(category, 'JWT Secret Uniqueness', 'fail',
          'JWT access and refresh secrets are identical', 'high',
          'Use different secrets for access and refresh tokens');
      }

      // Check password security implementation
      await this.checkPasswordSecurity(category);

    } catch (error) {
      this.addResult(category, 'Authentication Check', 'fail',
        `Authentication security check failed: ${error}`, 'high');
    }
  }

  private async checkPasswordSecurity(category: string): Promise<void> {
    try {
      // Check if password security service exists
      const passwordSecurityPath = path.join(process.cwd(), 'server/services/passwordSecurity.ts');
      const exists = await fs.access(passwordSecurityPath).then(() => true).catch(() => false);

      if (exists) {
        this.addResult(category, 'Password Security Service', 'pass',
          'Password security service is implemented', 'low');
      } else {
        this.addResult(category, 'Password Security Service', 'fail',
          'Password security service is missing', 'high',
          'Implement password hashing and validation service');
      }

      // Check account lockout implementation
      const lockoutPath = path.join(process.cwd(), 'server/services/accountLockout.ts');
      const lockoutExists = await fs.access(lockoutPath).then(() => true).catch(() => false);

      if (lockoutExists) {
        this.addResult(category, 'Account Lockout', 'pass',
          'Account lockout mechanism is implemented', 'low');
      } else {
        this.addResult(category, 'Account Lockout', 'warning',
          'Account lockout mechanism may be missing', 'medium',
          'Implement account lockout to prevent brute force attacks');
      }

    } catch (error) {
      this.addResult(category, 'Password Security Check', 'fail',
        `Password security check failed: ${error}`, 'medium');
    }
  }

  private async checkDatabaseSecurity(): Promise<void> {
    const category = 'Database Security';

    try {
      // Check database URL configuration
      const databaseUrl = process.env.DATABASE_URL;
      if (databaseUrl) {
        try {
          const url = new URL(databaseUrl);
          if (['postgres:', 'postgresql:'].includes(url.protocol)) {
            this.addResult(category, 'Database Connection', 'pass',
              'Database connection string is properly configured', 'low');
          } else {
            this.addResult(category, 'Database Connection', 'fail',
              'Database connection string uses unsupported protocol', 'high',
              'Use PostgreSQL for production deployments');
          }
        } catch {
          this.addResult(category, 'Database Connection', 'fail',
            'Database connection string is malformed', 'high',
            'Fix DATABASE_URL format');
        }
      } else {
        this.addResult(category, 'Database Connection', 'fail',
          'Database connection string is missing', 'critical',
          'Set DATABASE_URL environment variable');
      }

      // Check for Drizzle ORM usage
      const dbPath = path.join(process.cwd(), 'server/db.ts');
      const dbExists = await fs.access(dbPath).then(() => true).catch(() => false);

      if (dbExists) {
        const dbContent = await fs.readFile(dbPath, 'utf-8');
        if (dbContent.includes('drizzle')) {
          this.addResult(category, 'ORM Usage', 'pass',
            'Using Drizzle ORM for database operations', 'low');
        } else {
          this.addResult(category, 'ORM Usage', 'warning',
            'Database operations may not use ORM', 'medium',
            'Use Drizzle ORM to prevent SQL injection');
        }
      }

    } catch (error) {
      this.addResult(category, 'Database Security Check', 'fail',
        `Database security check failed: ${error}`, 'medium');
    }
  }

  private async checkSessionSecurity(): Promise<void> {
    const category = 'Session Security';

    try {
      // Check cookie secret
      const cookieSecret = process.env.COOKIE_SECRET;
      if (cookieSecret && cookieSecret.length >= 32) {
        this.addResult(category, 'Cookie Secret', 'pass',
          'Cookie secret is properly configured', 'low');
      } else {
        this.addResult(category, 'Cookie Secret', 'fail',
          'Cookie secret is missing or too short', 'high',
          'Set COOKIE_SECRET to a secure value with at least 32 characters');
      }

      // Check session management implementation
      const sessionPath = path.join(process.cwd(), 'server/services/sessionManager.ts');
      const sessionExists = await fs.access(sessionPath).then(() => true).catch(() => false);

      if (sessionExists) {
        this.addResult(category, 'Session Management', 'pass',
          'Session management service is implemented', 'low');
      } else {
        this.addResult(category, 'Session Management', 'warning',
          'Session management service may be missing', 'medium',
          'Implement proper session management');
      }

      // Check secure cookie configuration
      const config = securityConfig.getConfig();
      if (config.security.cookies.secure && this.environment === 'production') {
        this.addResult(category, 'Secure Cookies', 'pass',
          'Secure cookies are enabled for production', 'low');
      } else if (this.environment === 'production') {
        this.addResult(category, 'Secure Cookies', 'fail',
          'Secure cookies are not enabled in production', 'high',
          'Enable secure cookies for production deployment');
      }

    } catch (error) {
      this.addResult(category, 'Session Security Check', 'fail',
        `Session security check failed: ${error}`, 'medium');
    }
  }

  private async checkInputValidation(): Promise<void> {
    const category = 'Input Validation';

    try {
      // Check input validation middleware
      const validationPath = path.join(process.cwd(), 'server/middleware/inputValidation.ts');
      const validationExists = await fs.access(validationPath).then(() => true).catch(() => false);

      if (validationExists) {
        this.addResult(category, 'Input Validation Middleware', 'pass',
          'Input validation middleware is implemented', 'low');
      } else {
        this.addResult(category, 'Input Validation Middleware', 'fail',
          'Input validation middleware is missing', 'high',
          'Implement input validation middleware using Zod schemas');
      }

      // Check rate limiting
      const rateLimitPath = path.join(process.cwd(), 'server/middleware/rateLimiting.ts');
      const rateLimitExists = await fs.access(rateLimitPath).then(() => true).catch(() => false);

      if (rateLimitExists) {
        this.addResult(category, 'Rate Limiting', 'pass',
          'Rate limiting middleware is implemented', 'low');
      } else {
        this.addResult(category, 'Rate Limiting', 'warning',
          'Rate limiting middleware may be missing', 'medium',
          'Implement rate limiting to prevent abuse');
      }

    } catch (error) {
      this.addResult(category, 'Input Validation Check', 'fail',
        `Input validation check failed: ${error}`, 'medium');
    }
  }

  private async checkErrorHandling(): Promise<void> {
    const category = 'Error Handling';

    try {
      // Check error handling middleware
      const errorPath = path.join(process.cwd(), 'server/middleware/errorHandler.ts');
      const errorExists = await fs.access(errorPath).then(() => true).catch(() => false);

      if (errorExists) {
        this.addResult(category, 'Error Handling Middleware', 'pass',
          'Error handling middleware is implemented', 'low');
      } else {
        this.addResult(category, 'Error Handling Middleware', 'fail',
          'Error handling middleware is missing', 'high',
          'Implement secure error handling middleware');
      }

    } catch (error) {
      this.addResult(category, 'Error Handling Check', 'fail',
        `Error handling check failed: ${error}`, 'medium');
    }
  }

  private async checkLoggingAndMonitoring(): Promise<void> {
    const category = 'Logging and Monitoring';

    try {
      // Check security logging
      const loggerPath = path.join(process.cwd(), 'server/services/securityLogger.ts');
      const loggerExists = await fs.access(loggerPath).then(() => true).catch(() => false);

      if (loggerExists) {
        this.addResult(category, 'Security Logging', 'pass',
          'Security logging service is implemented', 'low');
      } else {
        this.addResult(category, 'Security Logging', 'fail',
          'Security logging service is missing', 'high',
          'Implement security event logging');
      }

      // Check monitoring middleware
      const monitoringPath = path.join(process.cwd(), 'server/middleware/securityMonitoring.ts');
      const monitoringExists = await fs.access(monitoringPath).then(() => true).catch(() => false);

      if (monitoringExists) {
        this.addResult(category, 'Security Monitoring', 'pass',
          'Security monitoring middleware is implemented', 'low');
      } else {
        this.addResult(category, 'Security Monitoring', 'warning',
          'Security monitoring middleware may be missing', 'medium',
          'Implement security monitoring and alerting');
      }

    } catch (error) {
      this.addResult(category, 'Logging and Monitoring Check', 'fail',
        `Logging and monitoring check failed: ${error}`, 'medium');
    }
  }

  private async checkDeploymentSecurity(): Promise<void> {
    const category = 'Deployment Security';

    try {
      // Check HTTPS enforcement
      const config = securityConfig.getConfig();
      if (config.security.https.enforce && this.environment === 'production') {
        this.addResult(category, 'HTTPS Enforcement', 'pass',
          'HTTPS enforcement is enabled for production', 'low');
      } else if (this.environment === 'production') {
        this.addResult(category, 'HTTPS Enforcement', 'fail',
          'HTTPS enforcement is not enabled in production', 'critical',
          'Enable HTTPS enforcement for production deployment');
      }

      // Check security headers
      const headersPath = path.join(process.cwd(), 'server/middleware/securityHeaders.ts');
      const headersExists = await fs.access(headersPath).then(() => true).catch(() => false);

      if (headersExists) {
        this.addResult(category, 'Security Headers', 'pass',
          'Security headers middleware is implemented', 'low');
      } else {
        this.addResult(category, 'Security Headers', 'fail',
          'Security headers middleware is missing', 'high',
          'Implement security headers middleware');
      }

      // Check CORS configuration
      const corsOrigin = process.env.CORS_ORIGIN;
      if (corsOrigin && corsOrigin !== '*') {
        this.addResult(category, 'CORS Configuration', 'pass',
          'CORS is properly configured', 'low');
      } else if (this.environment === 'production') {
        this.addResult(category, 'CORS Configuration', 'fail',
          'CORS allows all origins in production', 'high',
          'Configure specific CORS origins for production');
      }

    } catch (error) {
      this.addResult(category, 'Deployment Security Check', 'fail',
        `Deployment security check failed: ${error}`, 'medium');
    }
  }

  private async checkCredentialSecurity(): Promise<void> {
    const category = 'Credential Security';

    try {
      // Run credential detection
      const credentialValidation = CredentialDetector.validateEnvironmentVariables();
      
      if (credentialValidation.issues.length === 0) {
        this.addResult(category, 'Credential Detection', 'pass',
          'No credential security issues detected', 'low');
      } else {
        const highSeverityIssues = credentialValidation.issues.filter(issue => issue.severity === 'high');
        if (highSeverityIssues.length > 0) {
          this.addResult(category, 'Credential Detection', 'fail',
            `High severity credential issues: ${highSeverityIssues.map(i => i.issue).join(', ')}`,
            'critical', 'Fix credential security issues before deployment');
        } else {
          this.addResult(category, 'Credential Detection', 'warning',
            `Credential warnings: ${credentialValidation.issues.map(i => i.issue).join(', ')}`,
            'medium', 'Review credential configuration');
        }
      }

      // Check for demo credentials in production
      if (this.environment === 'production') {
        const demoEmail = process.env.DEMO_USER_EMAIL;
        const demoPassword = process.env.DEMO_USER_PASSWORD;
        
        if (demoEmail || demoPassword) {
          this.addResult(category, 'Demo Credentials', 'fail',
            'Demo user credentials are set in production', 'high',
            'Remove demo user credentials from production environment');
        } else {
          this.addResult(category, 'Demo Credentials', 'pass',
            'No demo credentials in production', 'low');
        }
      }

    } catch (error) {
      this.addResult(category, 'Credential Security Check', 'fail',
        `Credential security check failed: ${error}`, 'medium');
    }
  }

  private async checkDependencySecurity(): Promise<void> {
    const category = 'Dependency Security';

    try {
      // Check package.json for security-related packages
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageExists = await fs.access(packagePath).then(() => true).catch(() => false);

      if (packageExists) {
        const packageContent = await fs.readFile(packagePath, 'utf-8');
        const packageJson = JSON.parse(packageContent);
        
        // Check for security-related dependencies
        const securityPackages = ['bcrypt', 'jsonwebtoken', 'zod', 'express-rate-limit'];
        const installedSecurityPackages = securityPackages.filter(pkg => 
          packageJson.dependencies?.[pkg] || packageJson.devDependencies?.[pkg]
        );

        if (installedSecurityPackages.length >= 3) {
          this.addResult(category, 'Security Dependencies', 'pass',
            `Security packages installed: ${installedSecurityPackages.join(', ')}`, 'low');
        } else {
          this.addResult(category, 'Security Dependencies', 'warning',
            'Some security packages may be missing', 'medium',
            'Install necessary security packages (bcrypt, jsonwebtoken, zod, etc.)');
        }
      }

    } catch (error) {
      this.addResult(category, 'Dependency Security Check', 'fail',
        `Dependency security check failed: ${error}`, 'low');
    }
  }

  private addResult(
    category: string,
    check: string,
    status: 'pass' | 'fail' | 'warning',
    message: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    recommendation?: string
  ): void {
    this.results.push({
      category,
      check,
      status,
      message,
      severity,
      recommendation
    });
  }

  private generateReport(): SecurityChecklistReport {
    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'pass').length,
      failed: this.results.filter(r => r.status === 'fail').length,
      warnings: this.results.filter(r => r.status === 'warning').length
    };

    const overallStatus = summary.failed > 0 ? 'fail' : 
                         summary.warnings > 0 ? 'warning' : 'pass';

    const recommendations = this.results
      .filter(r => r.recommendation)
      .map(r => r.recommendation!)
      .filter((rec, index, arr) => arr.indexOf(rec) === index); // Remove duplicates

    return {
      timestamp: new Date().toISOString(),
      environment: this.environment,
      overallStatus,
      summary,
      results: this.results,
      recommendations
    };
  }
}

// CLI execution - Check if this file is being run directly
const isMainModule = process.argv[1] && process.argv[1].endsWith('securityChecklist.ts');
if (isMainModule) {
  const checklist = new SecurityChecklist();
  checklist.runAllChecks().then(report => {
    console.log('\n🔒 Security Checklist Report');
    console.log('================================');
    console.log(`Environment: ${report.environment}`);
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Overall Status: ${report.overallStatus.toUpperCase()}`);
    console.log(`\nSummary: ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.warnings} warnings`);
    
    console.log('\n📋 Detailed Results:');
    console.log('====================');
    
    const categories = [...new Set(report.results.map(r => r.category))];
    categories.forEach(category => {
      console.log(`\n${category}:`);
      const categoryResults = report.results.filter(r => r.category === category);
      categoryResults.forEach(result => {
        const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
        console.log(`  ${icon} ${result.check}: ${result.message}`);
        if (result.recommendation) {
          console.log(`     💡 ${result.recommendation}`);
        }
      });
    });

    if (report.recommendations.length > 0) {
      console.log('\n🎯 Key Recommendations:');
      console.log('========================');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    // Exit with error code if there are failures
    if (report.overallStatus === 'fail') {
      process.exit(1);
    }
  }).catch(error => {
    console.error('Security checklist failed:', error);
    process.exit(1);
  });
}