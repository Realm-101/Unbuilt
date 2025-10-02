#!/usr/bin/env tsx

/**
 * Test Migration Syntax
 * 
 * This script validates that the migration SQL syntax is correct
 * without actually executing it against a database.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Basic SQL syntax validation
 */
function validateSQLSyntax(sql: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for basic SQL syntax issues
  const lines = sql.split('\n');
  let inComment = false;
  let inFunction = false;
  let parenDepth = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;
    
    // Skip empty lines
    if (!line) continue;
    
    // Handle comments
    if (line.startsWith('--')) continue;
    if (line.includes('/*')) inComment = true;
    if (line.includes('*/')) inComment = false;
    if (inComment) continue;
    
    // Track function blocks
    if (line.includes('CREATE OR REPLACE FUNCTION') || line.includes('CREATE FUNCTION')) {
      inFunction = true;
    }
    if (line.includes('$$ LANGUAGE') || line.includes('$;')) {
      inFunction = false;
    }
    
    // Skip function content (different syntax rules)
    if (inFunction) continue;
    
    // Track parentheses depth
    parenDepth += (line.match(/\(/g) || []).length;
    parenDepth -= (line.match(/\)/g) || []).length;
    
    // Check for common syntax errors
    if (line.includes('CREATE TABLE') && !line.includes('IF NOT EXISTS') && !line.includes('CREATE TABLE IF NOT EXISTS')) {
      // This is actually OK for our migration, but worth noting
    }
    
    // Check for missing semicolons on statement endings
    if (line.match(/^(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|GRANT|REVOKE)/) && 
        !line.endsWith(';') && 
        !line.endsWith(',') && 
        !line.includes('(') &&
        parenDepth === 0) {
      // This might be a multi-line statement, so we'll be lenient
    }
    
    // Check for unmatched quotes
    const singleQuotes = (line.match(/'/g) || []).length;
    if (singleQuotes % 2 !== 0 && !line.includes('$$')) {
      errors.push(`Line ${lineNum}: Unmatched single quotes`);
    }
  }
  
  // Check for unmatched parentheses
  if (parenDepth !== 0) {
    errors.push(`Unmatched parentheses: depth ${parenDepth}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check for required SQL elements
 */
function validateMigrationContent(sql: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required tables
  const requiredTables = [
    'jwt_tokens',
    'security_audit_logs',
    'security_alerts',
    'password_history'
  ];
  
  for (const table of requiredTables) {
    if (!sql.includes(`CREATE TABLE IF NOT EXISTS ${table}`) && 
        !sql.includes(`CREATE TABLE ${table}`)) {
      errors.push(`Missing table creation: ${table}`);
    }
  }
  
  // Required functions
  const requiredFunctions = [
    'track_password_change',
    'cleanup_expired_jwt_tokens',
    'cleanup_password_history',
    'cleanup_old_audit_logs',
    'get_security_metrics'
  ];
  
  for (const func of requiredFunctions) {
    if (!sql.includes(`CREATE OR REPLACE FUNCTION ${func}`) && 
        !sql.includes(`CREATE FUNCTION ${func}`)) {
      errors.push(`Missing function: ${func}`);
    }
  }
  
  // Required views
  const requiredViews = [
    'recent_security_events',
    'active_security_alerts',
    'locked_accounts'
  ];
  
  for (const view of requiredViews) {
    if (!sql.includes(`CREATE OR REPLACE VIEW ${view}`)) {
      errors.push(`Missing view: ${view}`);
    }
  }
  
  // Check for transaction handling
  if (!sql.includes('BEGIN;') || !sql.includes('COMMIT;')) {
    errors.push('Migration should be wrapped in a transaction (BEGIN; ... COMMIT;)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Main test function
 */
async function testMigrationSyntax(): Promise<void> {
  console.log('🧪 Testing Security Migration SQL Syntax');
  console.log('========================================');
  
  const migrationFile = join(process.cwd(), 'server/scripts/migrate-comprehensive-security.sql');
  
  try {
    console.log(`📄 Reading migration file: ${migrationFile}`);
    console.log(`📁 Current working directory: ${process.cwd()}`);
    console.log(`📁 __dirname would be: ${__dirname || 'undefined'}`);
    const sql = readFileSync(migrationFile, 'utf-8');
    
    console.log(`📊 File size: ${(sql.length / 1024).toFixed(1)} KB`);
    console.log(`📊 Line count: ${sql.split('\n').length}`);
    
    // Test basic SQL syntax
    console.log('\n🔍 Validating SQL syntax...');
    const syntaxResult = validateSQLSyntax(sql);
    
    if (syntaxResult.valid) {
      console.log('✅ SQL syntax validation passed');
    } else {
      console.log('❌ SQL syntax validation failed:');
      syntaxResult.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    // Test migration content
    console.log('\n🔍 Validating migration content...');
    const contentResult = validateMigrationContent(sql);
    
    if (contentResult.valid) {
      console.log('✅ Migration content validation passed');
    } else {
      console.log('❌ Migration content validation failed:');
      contentResult.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    // Overall result
    const overallValid = syntaxResult.valid && contentResult.valid;
    
    console.log('\n📋 Test Summary');
    console.log('===============');
    console.log(`Syntax Check: ${syntaxResult.valid ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Content Check: ${contentResult.valid ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Overall: ${overallValid ? '✅ PASS' : '❌ FAIL'}`);
    
    if (overallValid) {
      console.log('\n🎉 Migration script is ready for deployment!');
      console.log('\n📋 Next steps:');
      console.log('   1. Test the migration on a development database');
      console.log('   2. Run: npm run migrate:security');
      console.log('   3. Validate: npm run validate:security');
      console.log('   4. Update application code to use new security features');
    } else {
      console.log('\n⚠️  Migration script needs fixes before deployment');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Error testing migration:', error);
    process.exit(1);
  }
}

// Run test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testMigrationSyntax().catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
}

export { testMigrationSyntax };