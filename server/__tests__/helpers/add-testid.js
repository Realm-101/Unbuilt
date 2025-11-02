#!/usr/bin/env node

/**
 * Helper script to add data-testid attributes to React components
 * 
 * Usage:
 *   node server/__tests__/helpers/add-testid.js <file-or-directory>
 *   node server/__tests__/helpers/add-testid.js --dry-run <file-or-directory>
 * 
 * Examples:
 *   node server/__tests__/helpers/add-testid.js client/src/pages/auth/login.tsx
 *   node server/__tests__/helpers/add-testid.js client/src/components/dashboard/
 *   node server/__tests__/helpers/add-testid.js --dry-run client/src/pages/auth/
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const TARGET = process.argv[process.argv.length - 1];

// Element patterns to add data-testid to
const ELEMENT_PATTERNS = {
  // Form elements
  input: /(<input\s+[^>]*?)(\s*\/?>)/g,
  button: /(<button\s+[^>]*?)(\s*>)/g,
  select: /(<select\s+[^>]*?)(\s*>)/g,
  textarea: /(<textarea\s+[^>]*?)(\s*>)/g,
  
  // Interactive elements
  a: /(<a\s+[^>]*?)(\s*>)/g,
  
  // Container elements (for key content)
  form: /(<form\s+[^>]*?)(\s*>)/g,
  div: /(<div\s+[^>]*?className="(?:error|success|message|modal|card)"[^>]*?)(\s*>)/g,
};

// Component name extraction patterns
const COMPONENT_NAME_PATTERN = /(?:export\s+(?:default\s+)?function\s+(\w+)|export\s+const\s+(\w+)\s*=)/;

/**
 * Convert component name to kebab-case
 */
function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Extract component name from file content
 */
function extractComponentName(content, filename) {
  const match = content.match(COMPONENT_NAME_PATTERN);
  if (match) {
    return match[1] || match[2];
  }
  
  // Fallback to filename
  const basename = path.basename(filename, path.extname(filename));
  return basename.charAt(0).toUpperCase() + basename.slice(1);
}

/**
 * Generate data-testid based on element type and context
 */
function generateTestId(element, componentName, existingAttrs) {
  const kebabName = toKebabCase(componentName);
  
  // Extract element type
  const elementType = element.match(/<(\w+)/)?.[1] || 'element';
  
  // Check for existing identifiers
  const typeMatch = existingAttrs.match(/type=["'](\w+)["']/);
  const nameMatch = existingAttrs.match(/name=["'](\w+)["']/);
  const idMatch = existingAttrs.match(/id=["'](\w+)["']/);
  const classMatch = existingAttrs.match(/className=["']([^"']+)["']/);
  
  // Generate testid based on available information
  let testId = kebabName;
  
  if (typeMatch) {
    testId += `-${typeMatch[1]}`;
  } else if (nameMatch) {
    testId += `-${toKebabCase(nameMatch[1])}`;
  } else if (idMatch) {
    testId += `-${toKebabCase(idMatch[1])}`;
  } else if (classMatch) {
    const classes = classMatch[1].split(/\s+/);
    const relevantClass = classes.find(c => 
      c.includes('button') || 
      c.includes('input') || 
      c.includes('error') ||
      c.includes('success') ||
      c.includes('message')
    );
    if (relevantClass) {
      testId += `-${toKebabCase(relevantClass)}`;
    } else {
      testId += `-${elementType}`;
    }
  } else {
    testId += `-${elementType}`;
  }
  
  return testId;
}

/**
 * Check if element already has data-testid
 */
function hasTestId(elementStr) {
  return /data-testid=/.test(elementStr);
}

/**
 * Add data-testid to an element
 */
function addTestId(elementStr, componentName) {
  if (hasTestId(elementStr)) {
    return elementStr;
  }
  
  const testId = generateTestId(elementStr, componentName, elementStr);
  
  // Find the position to insert data-testid
  // Insert before the closing > or />
  const insertPos = elementStr.search(/\s*\/?>/);
  if (insertPos === -1) return elementStr;
  
  const before = elementStr.substring(0, insertPos);
  const after = elementStr.substring(insertPos);
  
  return `${before}\n        data-testid="${testId}"${after}`;
}

/**
 * Process a single file
 */
function processFile(filePath) {
  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Processing: ${filePath}`);
  
  // Read file content
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`  ❌ Error reading file: ${error.message}`);
    return;
  }
  
  // Extract component name
  const componentName = extractComponentName(content, filePath);
  console.log(`  Component: ${componentName}`);
  
  // Track changes
  let modified = false;
  let addedCount = 0;
  let skippedCount = 0;
  
  // Process each element type
  let newContent = content;
  
  for (const [elementType, pattern] of Object.entries(ELEMENT_PATTERNS)) {
    newContent = newContent.replace(pattern, (match, opening, closing) => {
      if (hasTestId(match)) {
        skippedCount++;
        return match;
      }
      
      modified = true;
      addedCount++;
      
      const testId = generateTestId(opening, componentName, opening);
      return `${opening}\n        data-testid="${testId}"${closing}`;
    });
  }
  
  // Report results
  if (addedCount > 0) {
    console.log(`  ✅ Added ${addedCount} data-testid attribute(s)`);
  }
  if (skippedCount > 0) {
    console.log(`  ⏭️  Skipped ${skippedCount} element(s) (already has data-testid)`);
  }
  if (!modified) {
    console.log(`  ℹ️  No changes needed`);
    return;
  }
  
  // Write changes
  if (!DRY_RUN) {
    try {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`  💾 File updated`);
    } catch (error) {
      console.error(`  ❌ Error writing file: ${error.message}`);
    }
  } else {
    console.log(`  👁️  Changes preview (not applied):`);
    // Show a diff-like preview
    const lines = newContent.split('\n');
    const originalLines = content.split('\n');
    lines.forEach((line, i) => {
      if (line !== originalLines[i] && line.includes('data-testid')) {
        console.log(`     + ${line.trim()}`);
      }
    });
  }
}

/**
 * Process a directory recursively
 */
function processDirectory(dirPath) {
  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Processing directory: ${dirPath}`);
  
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (error) {
    console.error(`❌ Error reading directory: ${error.message}`);
    return;
  }
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules and hidden directories
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }
      processDirectory(fullPath);
    } else if (entry.isFile()) {
      // Process .tsx and .jsx files
      if (/\.(tsx|jsx)$/.test(entry.name)) {
        processFile(fullPath);
      }
    }
  }
}

/**
 * Main execution
 */
function main() {
  console.log('='.repeat(60));
  console.log('Data-TestID Helper Script');
  console.log('='.repeat(60));
  
  if (!TARGET || TARGET === '--dry-run') {
    console.error('\n❌ Error: No target file or directory specified\n');
    console.log('Usage:');
    console.log('  node server/__tests__/helpers/add-testid.js <file-or-directory>');
    console.log('  node server/__tests__/helpers/add-testid.js --dry-run <file-or-directory>');
    console.log('\nExamples:');
    console.log('  node server/__tests__/helpers/add-testid.js client/src/pages/auth/login.tsx');
    console.log('  node server/__tests__/helpers/add-testid.js client/src/components/dashboard/');
    console.log('  node server/__tests__/helpers/add-testid.js --dry-run client/src/pages/auth/');
    process.exit(1);
  }
  
  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN MODE - No files will be modified\n');
  }
  
  // Check if target exists
  if (!fs.existsSync(TARGET)) {
    console.error(`\n❌ Error: Target not found: ${TARGET}\n`);
    process.exit(1);
  }
  
  // Process target
  const stats = fs.statSync(TARGET);
  if (stats.isDirectory()) {
    processDirectory(TARGET);
  } else if (stats.isFile()) {
    processFile(TARGET);
  } else {
    console.error(`\n❌ Error: Target is neither a file nor a directory: ${TARGET}\n`);
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ Done!');
  console.log('='.repeat(60) + '\n');
  
  if (DRY_RUN) {
    console.log('💡 Tip: Remove --dry-run flag to apply changes\n');
  }
}

// Run the script
main();
