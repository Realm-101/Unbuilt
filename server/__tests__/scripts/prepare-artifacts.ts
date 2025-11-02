#!/usr/bin/env node
/**
 * Prepare test artifacts for CI/CD upload
 * 
 * This script organizes test artifacts into a structured format
 * for easy consumption in CI/CD pipelines.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ArtifactManifest {
  timestamp: string;
  testRun: {
    browser?: string;
    platform: string;
    nodeVersion: string;
    ciEnvironment: boolean;
  };
  artifacts: {
    reports: string[];
    screenshots: string[];
    videos: string[];
    traces: string[];
  };
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
}

const REPORTS_DIR = path.join(__dirname, '../../reports');
const ARTIFACTS_DIR = path.join(REPORTS_DIR, 'artifacts');

/**
 * Ensure directory exists
 */
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Get all files in directory recursively
 */
function getFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) {
    return fileList;
  }

  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Parse test results from JSON report
 */
function parseTestResults(): ArtifactManifest['summary'] {
  const jsonReportPath = path.join(REPORTS_DIR, 'json/results.json');
  
  if (!fs.existsSync(jsonReportPath)) {
    return {
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0
    };
  }

  try {
    const report = JSON.parse(fs.readFileSync(jsonReportPath, 'utf-8'));
    
    return {
      totalTests: report.stats?.tests || 0,
      passed: report.stats?.passes || 0,
      failed: report.stats?.failures || 0,
      skipped: report.stats?.skipped || 0,
      duration: report.stats?.duration || 0
    };
  } catch (error) {
    console.error('Error parsing test results:', error);
    return {
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0
    };
  }
}

/**
 * Create artifact manifest
 */
function createManifest(): ArtifactManifest {
  const reportsDir = path.join(REPORTS_DIR, 'html');
  const screenshotsDir = path.join(REPORTS_DIR, 'screenshots');
  const videosDir = path.join(REPORTS_DIR, 'videos');
  const tracesDir = path.join(REPORTS_DIR, 'traces');

  const manifest: ArtifactManifest = {
    timestamp: new Date().toISOString(),
    testRun: {
      browser: process.env.BROWSER,
      platform: process.platform,
      nodeVersion: process.version,
      ciEnvironment: process.env.CI === 'true'
    },
    artifacts: {
      reports: getFiles(reportsDir).map(f => path.relative(REPORTS_DIR, f)),
      screenshots: getFiles(screenshotsDir).map(f => path.relative(REPORTS_DIR, f)),
      videos: getFiles(videosDir).map(f => path.relative(REPORTS_DIR, f)),
      traces: getFiles(tracesDir).map(f => path.relative(REPORTS_DIR, f))
    },
    summary: parseTestResults()
  };

  return manifest;
}

/**
 * Copy artifacts to organized structure
 */
function organizeArtifacts(): void {
  ensureDir(ARTIFACTS_DIR);

  // Create manifest
  const manifest = createManifest();
  
  // Write manifest
  const manifestPath = path.join(ARTIFACTS_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log('✅ Artifacts prepared successfully');
  console.log(`📦 Manifest: ${manifestPath}`);
  console.log(`📊 Test Summary:`);
  console.log(`   Total: ${manifest.summary.totalTests}`);
  console.log(`   Passed: ${manifest.summary.passed}`);
  console.log(`   Failed: ${manifest.summary.failed}`);
  console.log(`   Skipped: ${manifest.summary.skipped}`);
  console.log(`   Duration: ${(manifest.summary.duration / 1000).toFixed(2)}s`);
  
  if (manifest.artifacts.screenshots.length > 0) {
    console.log(`📸 Screenshots: ${manifest.artifacts.screenshots.length}`);
  }
  
  if (manifest.artifacts.videos.length > 0) {
    console.log(`🎥 Videos: ${manifest.artifacts.videos.length}`);
  }
  
  if (manifest.artifacts.traces.length > 0) {
    console.log(`🔍 Traces: ${manifest.artifacts.traces.length}`);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  organizeArtifacts();
}

export { organizeArtifacts, createManifest };
