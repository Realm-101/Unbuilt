#!/usr/bin/env node

/**
 * Production Deployment Script
 * 
 * This script automates the secure deployment process including:
 * - Environment validation
 * - Security checklist verification
 * - Database migrations
 * - Build process
 * - Health checks
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DeploymentManager {
  constructor() {
    this.environment = process.env.NODE_ENV || 'production';
    this.verbose = process.argv.includes('--verbose');
    this.skipChecks = process.argv.includes('--skip-checks');
    this.dryRun = process.argv.includes('--dry-run');
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async execute(command, description) {
    this.log(`${description}...`);
    
    if (this.dryRun) {
      this.log(`DRY RUN: Would execute: ${command}`, 'warn');
      return;
    }

    try {
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: this.verbose ? 'inherit' : 'pipe'
      });
      
      if (this.verbose && output) {
        console.log(output);
      }
      
      this.log(`${description} completed successfully`);
    } catch (error) {
      this.log(`${description} failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async validateEnvironment() {
    this.log('🌍 Validating environment configuration...');

    // Check required environment variables
    const requiredVars = [
      'NODE_ENV',
      'DATABASE_URL',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'COOKIE_SECRET'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate secret lengths
    const secrets = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'COOKIE_SECRET'];
    secrets.forEach(secret => {
      if (process.env[secret] && process.env[secret].length < 32) {
        throw new Error(`${secret} must be at least 32 characters long`);
      }
    });

    // Check for production-specific requirements
    if (this.environment === 'production') {
      if (process.env.CORS_ORIGIN === '*') {
        throw new Error('CORS_ORIGIN cannot be wildcard (*) in production');
      }

      if (process.env.DEMO_USER_EMAIL || process.env.DEMO_USER_PASSWORD) {
        throw new Error('Demo user credentials should not be set in production');
      }
    }

    this.log('Environment validation passed');
  }

  async runSecurityChecklist() {
    if (this.skipChecks) {
      this.log('Skipping security checklist (--skip-checks flag)', 'warn');
      return;
    }

    await this.execute(
      'npm run security:checklist',
      'Running comprehensive security checklist'
    );
  }

  async runDeploymentValidation() {
    if (this.skipChecks) {
      this.log('Skipping deployment validation (--skip-checks flag)', 'warn');
      return;
    }

    await this.execute(
      'npm run deployment:validate',
      'Running deployment validation'
    );
  }

  async runDatabaseMigrations() {
    await this.execute(
      'npm run migrate:security',
      'Running database security migrations'
    );

    await this.execute(
      'npm run validate:security',
      'Validating database schema'
    );
  }

  async buildApplication() {
    await this.execute(
      'npm run build',
      'Building application for production'
    );
  }

  async runTests() {
    if (this.skipChecks) {
      this.log('Skipping tests (--skip-checks flag)', 'warn');
      return;
    }

    await this.execute(
      'npm test -- --run',
      'Running test suite'
    );
  }

  async startApplication() {
    if (this.dryRun) {
      this.log('DRY RUN: Would start application', 'warn');
      return;
    }

    this.log('🚀 Starting production application...');
    
    // Start the application in the background
    const { spawn } = require('child_process');
    const app = spawn('npm', ['start'], {
      detached: true,
      stdio: 'ignore'
    });

    app.unref();
    
    // Wait a moment for startup
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    this.log('Application started');
  }

  async performHealthCheck() {
    this.log('🏥 Performing health check...');

    const maxRetries = 10;
    const retryDelay = 2000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        if (this.dryRun) {
          this.log('DRY RUN: Would perform health check', 'warn');
          return;
        }

        const response = await fetch('http://localhost:5000/health');
        
        if (response.ok) {
          const data = await response.json();
          this.log(`Health check passed: ${data.status}`);
          return;
        }
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error(`Health check failed after ${maxRetries} attempts: ${error.message}`);
        }
        
        this.log(`Health check attempt ${i + 1} failed, retrying in ${retryDelay}ms...`, 'warn');
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  async deploy() {
    try {
      this.log('🚀 Starting production deployment process...');
      this.log(`Environment: ${this.environment}`);
      this.log(`Dry run: ${this.dryRun}`);
      this.log(`Skip checks: ${this.skipChecks}`);

      // Step 1: Validate environment
      await this.validateEnvironment();

      // Step 2: Run security checklist
      await this.runSecurityChecklist();

      // Step 3: Run deployment validation
      await this.runDeploymentValidation();

      // Step 4: Run tests
      await this.runTests();

      // Step 5: Run database migrations
      await this.runDatabaseMigrations();

      // Step 6: Build application
      await this.buildApplication();

      // Step 7: Start application
      await this.startApplication();

      // Step 8: Perform health check
      await this.performHealthCheck();

      this.log('🎉 Deployment completed successfully!');
      
      // Print post-deployment information
      this.printPostDeploymentInfo();

    } catch (error) {
      this.log(`Deployment failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  printPostDeploymentInfo() {
    console.log('\n📋 Post-Deployment Checklist:');
    console.log('================================');
    console.log('1. ✅ Verify HTTPS is working: curl -I https://your-domain.com');
    console.log('2. ✅ Check security headers are present');
    console.log('3. ✅ Test authentication flows');
    console.log('4. ✅ Verify rate limiting is active');
    console.log('5. ✅ Monitor security logs for the first 24 hours');
    console.log('6. ✅ Validate CORS configuration with frontend');
    console.log('7. ✅ Test WebSocket connections if applicable');
    console.log('\n🔍 Monitoring URLs:');
    console.log('- Health: http://localhost:5000/health');
    console.log('- Security Dashboard: http://localhost:5000/api/security/dashboard');
    console.log('\n📊 Log Monitoring:');
    console.log('- Security events: grep "SECURITY_EVENT" logs/');
    console.log('- Application logs: tail -f logs/app.log');
  }
}

// CLI execution
if (require.main === module) {
  const deployment = new DeploymentManager();
  
  // Handle command line arguments
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Production Deployment Script

Usage: node deploy.js [options]

Options:
  --dry-run      Show what would be executed without running commands
  --skip-checks  Skip security checklist and validation (not recommended)
  --verbose      Show detailed output from all commands
  --help, -h     Show this help message

Examples:
  node deploy.js                    # Full deployment
  node deploy.js --dry-run          # Preview deployment steps
  node deploy.js --skip-checks      # Deploy without security validation
  node deploy.js --verbose          # Detailed output
`);
    process.exit(0);
  }

  deployment.deploy().catch(error => {
    console.error('Deployment script failed:', error);
    process.exit(1);
  });
}