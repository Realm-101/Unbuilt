import { SecurityChecklist } from './securityChecklist';
import { envValidator } from '../config/envValidator';
import { securityConfig } from '../config/securityConfig';
import fs from 'fs/promises';
import path from 'path';

export interface DeploymentValidationResult {
  timestamp: string;
  environment: string;
  isDeploymentReady: boolean;
  criticalIssues: string[];
  warnings: string[];
  recommendations: string[];
  preDeploymentSteps: string[];
  postDeploymentSteps: string[];
}

export class DeploymentValidator {
  private environment: string;
  private criticalIssues: string[] = [];
  private warnings: string[] = [];
  private recommendations: string[] = [];

  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
  }

  async validateDeployment(): Promise<DeploymentValidationResult> {
    console.log('🚀 Running deployment validation...\n');

    // Reset arrays
    this.criticalIssues = [];
    this.warnings = [];
    this.recommendations = [];

    // Run comprehensive security checklist
    await this.runSecurityChecklist();

    // Validate environment-specific requirements
    await this.validateEnvironmentRequirements();

    // Check deployment prerequisites
    await this.checkDeploymentPrerequisites();

    // Validate database readiness
    await this.validateDatabaseReadiness();

    // Check service dependencies
    await this.checkServiceDependencies();

    // Validate security configuration
    await this.validateSecurityConfiguration();

    return this.generateValidationResult();
  }

  private async runSecurityChecklist(): Promise<void> {
    console.log('📋 Running security checklist...');
    
    try {
      const checklist = new SecurityChecklist();
      const report = await checklist.runAllChecks();

      // Extract critical issues from security checklist
      const criticalResults = report.results.filter(r => 
        r.status === 'fail' && r.severity === 'critical'
      );

      const highSeverityResults = report.results.filter(r => 
        r.status === 'fail' && r.severity === 'high'
      );

      const warningResults = report.results.filter(r => 
        r.status === 'warning'
      );

      // Add to our validation results
      criticalResults.forEach(result => {
        this.criticalIssues.push(`${result.category}: ${result.message}`);
        if (result.recommendation) {
          this.recommendations.push(result.recommendation);
        }
      });

      highSeverityResults.forEach(result => {
        this.criticalIssues.push(`${result.category}: ${result.message}`);
        if (result.recommendation) {
          this.recommendations.push(result.recommendation);
        }
      });

      warningResults.forEach(result => {
        this.warnings.push(`${result.category}: ${result.message}`);
        if (result.recommendation) {
          this.recommendations.push(result.recommendation);
        }
      });

      console.log(`✅ Security checklist completed: ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.warnings} warnings\n`);

    } catch (error) {
      this.criticalIssues.push(`Security checklist failed: ${error}`);
    }
  }

  private async validateEnvironmentRequirements(): Promise<void> {
    console.log('🌍 Validating environment requirements...');

    try {
      // Check NODE_ENV
      if (!process.env.NODE_ENV) {
        this.criticalIssues.push('NODE_ENV environment variable is not set');
        this.recommendations.push('Set NODE_ENV to "production" for production deployments');
      }

      // Production-specific checks
      if (this.environment === 'production') {
        await this.validateProductionRequirements();
      }

      // Development-specific checks
      if (this.environment === 'development') {
        await this.validateDevelopmentSetup();
      }

      console.log('✅ Environment requirements validated\n');

    } catch (error) {
      this.criticalIssues.push(`Environment validation failed: ${error}`);
    }
  }

  private async validateProductionRequirements(): Promise<void> {
    const requiredEnvVars = [
      'DATABASE_URL',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'COOKIE_SECRET',
      'CORS_ORIGIN'
    ];

    requiredEnvVars.forEach(envVar => {
      if (!process.env[envVar]) {
        this.criticalIssues.push(`Required environment variable ${envVar} is not set for production`);
      }
    });

    // Check secret lengths
    const secrets = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'COOKIE_SECRET'];
    secrets.forEach(secret => {
      const value = process.env[secret];
      if (value && value.length < 32) {
        this.criticalIssues.push(`${secret} must be at least 32 characters long`);
      }
    });

    // Check CORS configuration
    const corsOrigin = process.env.CORS_ORIGIN;
    if (corsOrigin === '*') {
      this.criticalIssues.push('CORS_ORIGIN cannot be wildcard (*) in production');
    }

    // Check for demo credentials
    if (process.env.DEMO_USER_EMAIL || process.env.DEMO_USER_PASSWORD) {
      this.criticalIssues.push('Demo user credentials should not be set in production');
    }
  }

  private async validateDevelopmentSetup(): Promise<void> {
    // Check if development dependencies are available
    const devDependencies = ['tsx', 'vitest', '@types/node'];
    
    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf-8');
      const packageJson = JSON.parse(packageContent);

      devDependencies.forEach(dep => {
        if (!packageJson.devDependencies?.[dep]) {
          this.warnings.push(`Development dependency ${dep} is not installed`);
        }
      });
    } catch (error) {
      this.warnings.push('Could not validate development dependencies');
    }
  }

  private async checkDeploymentPrerequisites(): Promise<void> {
    console.log('📦 Checking deployment prerequisites...');

    try {
      // Check if build artifacts exist for production
      if (this.environment === 'production') {
        const distPath = path.join(process.cwd(), 'dist');
        const distExists = await fs.access(distPath).then(() => true).catch(() => false);

        if (!distExists) {
          this.criticalIssues.push('Build artifacts (dist directory) not found');
          this.recommendations.push('Run "npm run build" before production deployment');
        }
      }

      // Check critical files exist
      const criticalFiles = [
        'server/index.ts',
        'server/db.ts',
        'server/routes.ts',
        'package.json'
      ];

      for (const file of criticalFiles) {
        const filePath = path.join(process.cwd(), file);
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        
        if (!exists) {
          this.criticalIssues.push(`Critical file missing: ${file}`);
        }
      }

      console.log('✅ Deployment prerequisites checked\n');

    } catch (error) {
      this.criticalIssues.push(`Deployment prerequisites check failed: ${error}`);
    }
  }

  private async validateDatabaseReadiness(): Promise<void> {
    console.log('🗄️  Validating database readiness...');

    try {
      // Check database connection configuration
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        this.criticalIssues.push('DATABASE_URL is not configured');
        return;
      }

      // Validate database URL format
      try {
        const url = new URL(databaseUrl);
        if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
          this.criticalIssues.push('DATABASE_URL must be a PostgreSQL connection string');
        }
      } catch {
        this.criticalIssues.push('DATABASE_URL format is invalid');
      }

      // Check if migration scripts exist
      const migrationPaths = [
        'server/scripts/migrate-comprehensive-security.sql',
        'server/scripts/runSecurityMigration.ts'
      ];

      let migrationFilesExist = 0;
      for (const migrationPath of migrationPaths) {
        const fullPath = path.join(process.cwd(), migrationPath);
        const exists = await fs.access(fullPath).then(() => true).catch(() => false);
        if (exists) migrationFilesExist++;
      }

      if (migrationFilesExist === 0) {
        this.warnings.push('No database migration scripts found');
        this.recommendations.push('Ensure database schema is up to date');
      }

      console.log('✅ Database readiness validated\n');

    } catch (error) {
      this.criticalIssues.push(`Database validation failed: ${error}`);
    }
  }

  private async checkServiceDependencies(): Promise<void> {
    console.log('🔗 Checking service dependencies...');

    try {
      // Check optional service configurations
      const optionalServices = [
        { key: 'GEMINI_API_KEY', name: 'Gemini AI' },
        { key: 'SENDGRID_API_KEY', name: 'SendGrid Email' },
        { key: 'STRIPE_SECRET_KEY', name: 'Stripe Payments' }
      ];

      optionalServices.forEach(service => {
        if (!process.env[service.key]) {
          this.warnings.push(`${service.name} service not configured (${service.key})`);
        }
      });

      // Check OAuth configurations
      const oauthProviders = [
        { id: 'GOOGLE_CLIENT_ID', secret: 'GOOGLE_CLIENT_SECRET', name: 'Google OAuth' },
        { id: 'GITHUB_CLIENT_ID', secret: 'GITHUB_CLIENT_SECRET', name: 'GitHub OAuth' }
      ];

      oauthProviders.forEach(provider => {
        const hasId = !!process.env[provider.id];
        const hasSecret = !!process.env[provider.secret];
        
        if (hasId && !hasSecret) {
          this.warnings.push(`${provider.name} client ID set but secret missing`);
        } else if (!hasId && hasSecret) {
          this.warnings.push(`${provider.name} client secret set but ID missing`);
        }
      });

      console.log('✅ Service dependencies checked\n');

    } catch (error) {
      this.warnings.push(`Service dependency check failed: ${error}`);
    }
  }

  private async validateSecurityConfiguration(): Promise<void> {
    console.log('🔒 Validating security configuration...');

    try {
      const config = securityConfig.getConfig();
      const validation = securityConfig.validateConfiguration();

      if (!validation.isValid) {
        validation.errors.forEach(error => {
          this.criticalIssues.push(`Security configuration error: ${error}`);
        });
      }

      validation.warnings.forEach(warning => {
        this.warnings.push(`Security configuration warning: ${warning}`);
      });

      // Check security middleware files
      const securityMiddleware = [
        'server/middleware/securityHeaders.ts',
        'server/middleware/httpsEnforcement.ts',
        'server/middleware/inputValidation.ts',
        'server/middleware/errorHandler.ts'
      ];

      for (const middleware of securityMiddleware) {
        const fullPath = path.join(process.cwd(), middleware);
        const exists = await fs.access(fullPath).then(() => true).catch(() => false);
        
        if (!exists) {
          this.criticalIssues.push(`Security middleware missing: ${middleware}`);
        }
      }

      console.log('✅ Security configuration validated\n');

    } catch (error) {
      this.criticalIssues.push(`Security configuration validation failed: ${error}`);
    }
  }

  private generateValidationResult(): DeploymentValidationResult {
    const isDeploymentReady = this.criticalIssues.length === 0;

    const preDeploymentSteps = [
      'Run security checklist: npm run security:checklist',
      'Validate environment variables are set',
      'Run database migrations: npm run migrate:security',
      'Build application: npm run build',
      'Run tests: npm test'
    ];

    const postDeploymentSteps = [
      'Verify application health: curl https://your-domain/health',
      'Check security headers: curl -I https://your-domain',
      'Monitor security logs for the first 24 hours',
      'Verify SSL certificate is properly configured',
      'Test authentication flows',
      'Validate CORS configuration with frontend'
    ];

    return {
      timestamp: new Date().toISOString(),
      environment: this.environment,
      isDeploymentReady,
      criticalIssues: this.criticalIssues,
      warnings: this.warnings,
      recommendations: [...new Set(this.recommendations)], // Remove duplicates
      preDeploymentSteps,
      postDeploymentSteps
    };
  }
}

// CLI execution - Check if this file is being run directly
const isMainModule = process.argv[1] && process.argv[1].endsWith('deploymentValidation.ts');
if (isMainModule) {
  const validator = new DeploymentValidator();
  validator.validateDeployment().then(result => {
    console.log('\n🚀 Deployment Validation Report');
    console.log('=================================');
    console.log(`Environment: ${result.environment}`);
    console.log(`Timestamp: ${result.timestamp}`);
    console.log(`Deployment Ready: ${result.isDeploymentReady ? '✅ YES' : '❌ NO'}`);

    if (result.criticalIssues.length > 0) {
      console.log('\n🚨 Critical Issues (Must Fix Before Deployment):');
      console.log('================================================');
      result.criticalIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ❌ ${issue}`);
      });
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      console.log('=============');
      result.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ⚠️  ${warning}`);
      });
    }

    if (result.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      console.log('===================');
      result.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    console.log('\n📋 Pre-Deployment Steps:');
    console.log('========================');
    result.preDeploymentSteps.forEach((step, index) => {
      console.log(`${index + 1}. ${step}`);
    });

    console.log('\n📋 Post-Deployment Steps:');
    console.log('=========================');
    result.postDeploymentSteps.forEach((step, index) => {
      console.log(`${index + 1}. ${step}`);
    });

    // Exit with error code if deployment is not ready
    if (!result.isDeploymentReady) {
      console.log('\n❌ Deployment validation failed. Fix critical issues before deploying.');
      process.exit(1);
    } else {
      console.log('\n✅ Deployment validation passed. Ready to deploy!');
    }
  }).catch(error => {
    console.error('Deployment validation failed:', error);
    process.exit(1);
  });
}