#!/usr/bin/env node

/**
 * Project Cleanup Script
 * 
 * This script cleans up temporary files, organizes documentation,
 * and ensures the project structure is clean and consistent.
 */

const fs = require('fs');
const path = require('path');

class ProjectCleanup {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.cleaned = [];
    this.errors = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '✅';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async cleanup() {
    this.log('🧹 Starting project cleanup...');

    try {
      // Clean temporary files
      await this.cleanTemporaryFiles();
      
      // Organize documentation
      await this.organizeDocumentation();
      
      // Validate project structure
      await this.validateProjectStructure();
      
      // Generate summary
      this.generateSummary();

    } catch (error) {
      this.log(`Cleanup failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  async cleanTemporaryFiles() {
    this.log('🗑️  Cleaning temporary files...');

    const commonTempFiles = [
      '.DS_Store',
      'Thumbs.db',
      'npm-debug.log',
      'yarn-debug.log',
      'yarn-error.log'
    ];

    for (const file of commonTempFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          this.cleaned.push(file);
          this.log(`Removed temporary file: ${file}`);
        } catch (error) {
          this.errors.push(`Failed to remove ${file}: ${error.message}`);
        }
      }
    }
  }

  async organizeDocumentation() {
    this.log('📚 Organizing documentation...');

    const docsDir = path.join(this.projectRoot, 'docs');
    
    // Ensure docs directory exists
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
      this.log('Created docs directory');
    }

    // Check for required documentation files
    const requiredDocs = [
      'README.md',
      'SECURITY.md',
      'API.md'
    ];

    for (const doc of requiredDocs) {
      const docPath = path.join(docsDir, doc);
      if (!fs.existsSync(docPath)) {
        this.log(`Missing required documentation: ${doc}`, 'warn');
      } else {
        this.log(`Documentation verified: ${doc}`);
      }
    }
  }

  async validateProjectStructure() {
    this.log('🏗️  Validating project structure...');

    const requiredDirectories = [
      'client',
      'server',
      'shared',
      'docs',
      'deployment'
    ];

    const requiredFiles = [
      'README.md',
      'package.json',
      'CHANGELOG.md',
      'PROJECT_STRUCTURE.md'
    ];

    // Check directories
    for (const dir of requiredDirectories) {
      const dirPath = path.join(this.projectRoot, dir);
      if (!fs.existsSync(dirPath)) {
        this.log(`Missing required directory: ${dir}`, 'error');
        this.errors.push(`Missing directory: ${dir}`);
      } else {
        this.log(`Directory verified: ${dir}`);
      }
    }

    // Check files
    for (const file of requiredFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (!fs.existsSync(filePath)) {
        this.log(`Missing required file: ${file}`, 'error');
        this.errors.push(`Missing file: ${file}`);
      } else {
        this.log(`File verified: ${file}`);
      }
    }

    // Check security-specific structure
    await this.validateSecurityStructure();
  }

  async validateSecurityStructure() {
    this.log('🔒 Validating security structure...');

    const securityDirectories = [
      'server/middleware',
      'server/services',
      'server/scripts',
      'server/config'
    ];

    const securityFiles = [
      'server/middleware/securityHeaders.ts',
      'server/middleware/httpsEnforcement.ts',
      'server/services/passwordSecurity.ts',
      'server/services/sessionManager.ts',
      'server/config/securityConfig.ts',
      'server/scripts/securityChecklist.ts',
      'deployment/README.md'
    ];

    // Check security directories
    for (const dir of securityDirectories) {
      const dirPath = path.join(this.projectRoot, dir);
      if (!fs.existsSync(dirPath)) {
        this.log(`Missing security directory: ${dir}`, 'error');
        this.errors.push(`Missing security directory: ${dir}`);
      } else {
        this.log(`Security directory verified: ${dir}`);
      }
    }

    // Check security files
    for (const file of securityFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (!fs.existsSync(filePath)) {
        this.log(`Missing security file: ${file}`, 'error');
        this.errors.push(`Missing security file: ${file}`);
      } else {
        this.log(`Security file verified: ${file}`);
      }
    }
  }

  generateSummary() {
    this.log('\n📋 Cleanup Summary');
    this.log('==================');
    
    if (this.cleaned.length > 0) {
      this.log(`✅ Cleaned ${this.cleaned.length} temporary files:`);
      this.cleaned.forEach(file => this.log(`   - ${file}`));
    } else {
      this.log('✅ No temporary files found to clean');
    }

    if (this.errors.length > 0) {
      this.log(`\n❌ ${this.errors.length} issues found:`, 'error');
      this.errors.forEach(error => this.log(`   - ${error}`, 'error'));
      this.log('\n⚠️  Please address these issues before deployment', 'warn');
    } else {
      this.log('\n✅ Project structure validation passed');
      this.log('🎉 Project is clean and ready for deployment!');
    }

    // Generate cleanup report
    this.generateCleanupReport();
  }

  generateCleanupReport() {
    const report = {
      timestamp: new Date().toISOString(),
      cleaned: this.cleaned,
      errors: this.errors,
      summary: {
        filesRemoved: this.cleaned.length,
        errorsFound: this.errors.length,
        status: this.errors.length === 0 ? 'success' : 'issues_found'
      }
    };

    const reportPath = path.join(this.projectRoot, 'cleanup-report.json');
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      this.log(`📄 Cleanup report saved to: cleanup-report.json`);
    } catch (error) {
      this.log(`Failed to save cleanup report: ${error.message}`, 'error');
    }
  }
}

// CLI execution
if (require.main === module) {
  const cleanup = new ProjectCleanup();
  
  // Handle command line arguments
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Project Cleanup Script

Usage: node cleanup.cjs [options]

Options:
  --help, -h     Show this help message

This script:
- Removes temporary files and build artifacts
- Validates project structure and required files
- Checks security implementation completeness
- Generates a cleanup report

Examples:
  node cleanup.cjs                   # Run full cleanup
`);
    process.exit(0);
  }

  cleanup.cleanup().catch(error => {
    console.error('Cleanup script failed:', error);
    process.exit(1);
  });
}

module.exports = ProjectCleanup;