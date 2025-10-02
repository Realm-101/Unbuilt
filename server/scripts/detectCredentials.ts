#!/usr/bin/env node

/**
 * Credential Detection CLI Tool
 * 
 * This script scans the codebase for potential hardcoded credentials
 * and security vulnerabilities. It can be run manually or as part of
 * CI/CD pipelines to prevent credential leaks.
 * 
 * Usage:
 *   npx tsx server/scripts/detectCredentials.ts [options]
 * 
 * Options:
 *   --path <path>     Scan specific file or directory (default: current directory)
 *   --exclude <glob>  Exclude files matching glob pattern
 *   --fail-on-high    Exit with error code if high severity issues found
 *   --json            Output results in JSON format
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { CredentialDetector } from '../utils/credentialDetection';

interface ScanOptions {
  scanPath: string;
  exclude: string[];
  failOnHigh: boolean;
  jsonOutput: boolean;
}

class CredentialScannerCLI {
  private options: ScanOptions;

  constructor(options: ScanOptions) {
    this.options = options;
  }

  async scan(): Promise<void> {
    console.log(`🔍 Scanning for hardcoded credentials in: ${this.options.scanPath}`);
    
    const files = await this.getFilesToScan();
    const results = await this.scanFiles(files);
    
    if (this.options.jsonOutput) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      this.printResults(results);
    }

    // Exit with error code if high severity issues found and failOnHigh is set
    if (this.options.failOnHigh && results.some(r => r.violations.some(v => v.severity === 'high'))) {
      process.exit(1);
    }
  }

  private async getFilesToScan(): Promise<string[]> {
    const patterns = [
      '**/*.ts',
      '**/*.js',
      '**/*.json',
      '**/*.md',
      '**/*.env*',
      '**/*.yml',
      '**/*.yaml'
    ];

    const excludePatterns = [
      'node_modules/**',
      'dist/**',
      '.git/**',
      '**/*.test.ts',
      '**/*.test.js',
      'coverage/**',
      ...this.options.exclude
    ];

    const files: string[] = [];
    
    for (const pattern of patterns) {
      const matchedFiles = await glob(pattern, {
        cwd: this.options.scanPath,
        ignore: excludePatterns,
        absolute: true
      });
      files.push(...matchedFiles);
    }

    return [...new Set(files)]; // Remove duplicates
  }

  private async scanFiles(files: string[]): Promise<Array<{ file: string; result: any }>> {
    const results = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const result = CredentialDetector.scanContent(content, path.relative(this.options.scanPath, file));
        
        if (result.hasViolations) {
          results.push({ file: path.relative(this.options.scanPath, file), result });
        }
      } catch (error) {
        console.warn(`⚠️  Could not scan file ${file}: ${error}`);
      }
    }

    return results;
  }

  private printResults(results: Array<{ file: string; result: any }>): void {
    if (results.length === 0) {
      console.log('✅ No credential violations found!');
      return;
    }

    console.log(`\n❌ Found potential credential violations in ${results.length} files:\n`);

    results.forEach(({ file, result }) => {
      console.log(`📄 ${file}`);
      console.log(`   ${result.summary}\n`);

      result.violations.forEach((violation: any) => {
        const severityIcon = violation.severity === 'high' ? '🔴' : 
                           violation.severity === 'medium' ? '🟡' : '🟢';
        
        console.log(`   ${severityIcon} Line ${violation.line}: ${violation.severity.toUpperCase()}`);
        console.log(`      ${violation.content.substring(0, 100)}${violation.content.length > 100 ? '...' : ''}`);
        console.log(`      Pattern: ${violation.pattern}\n`);
      });
    });

    // Summary
    const totalViolations = results.reduce((sum, r) => sum + r.result.violations.length, 0);
    const highSeverity = results.reduce((sum, r) => sum + r.result.violations.filter((v: any) => v.severity === 'high').length, 0);
    const mediumSeverity = results.reduce((sum, r) => sum + r.result.violations.filter((v: any) => v.severity === 'medium').length, 0);
    const lowSeverity = results.reduce((sum, r) => sum + r.result.violations.filter((v: any) => v.severity === 'low').length, 0);

    console.log('📊 Summary:');
    console.log(`   Total violations: ${totalViolations}`);
    console.log(`   🔴 High severity: ${highSeverity}`);
    console.log(`   🟡 Medium severity: ${mediumSeverity}`);
    console.log(`   🟢 Low severity: ${lowSeverity}`);

    if (highSeverity > 0) {
      console.log('\n⚠️  High severity violations should be addressed immediately!');
    }
  }
}

// Parse command line arguments
function parseArgs(): ScanOptions {
  const args = process.argv.slice(2);
  const options: ScanOptions = {
    scanPath: process.cwd(),
    exclude: [],
    failOnHigh: false,
    jsonOutput: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--path':
        options.scanPath = args[++i];
        break;
      case '--exclude':
        options.exclude.push(args[++i]);
        break;
      case '--fail-on-high':
        options.failOnHigh = true;
        break;
      case '--json':
        options.jsonOutput = true;
        break;
      case '--help':
        console.log(`
Credential Detection CLI Tool

Usage: npx tsx server/scripts/detectCredentials.ts [options]

Options:
  --path <path>     Scan specific file or directory (default: current directory)
  --exclude <glob>  Exclude files matching glob pattern
  --fail-on-high    Exit with error code if high severity issues found
  --json            Output results in JSON format
  --help            Show this help message

Examples:
  npx tsx server/scripts/detectCredentials.ts
  npx tsx server/scripts/detectCredentials.ts --path ./server --fail-on-high
  npx tsx server/scripts/detectCredentials.ts --exclude "**/*.test.ts" --json
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

// Main execution
async function main() {
  try {
    const options = parseArgs();
    const scanner = new CredentialScannerCLI(options);
    await scanner.scan();
  } catch (error) {
    console.error('❌ Error running credential scanner:', error);
    process.exit(1);
  }
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { CredentialScannerCLI };