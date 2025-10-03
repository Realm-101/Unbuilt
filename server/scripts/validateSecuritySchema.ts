#!/usr/bin/env tsx

/**
 * Security Schema Validation Script
 * 
 * This script validates that all security enhancements have been properly
 * applied to the database schema. It checks for required tables, columns,
 * indexes, and functions.
 */

import { db } from '../db.js';
import { sql } from 'drizzle-orm';

interface ValidationResult {
  category: string;
  item: string;
  exists: boolean;
  required: boolean;
  message?: string;
}

interface ValidationSummary {
  total: number;
  passed: number;
  failed: number;
  results: ValidationResult[];
}

/**
 * Check if a table exists
 */
async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = ${tableName}
      );
    `);
    return (result.rows[0]?.exists as boolean) || false;
  } catch (error) {
    console.error(`Error checking table ${tableName}:`, error);
    return false;
  }
}

/**
 * Check if a column exists in a table
 */
async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = ${tableName} AND column_name = ${columnName}
      );
    `);
    return (result.rows[0]?.exists as boolean) || false;
  } catch (error) {
    console.error(`Error checking column ${tableName}.${columnName}:`, error);
    return false;
  }
}

/**
 * Check if an index exists
 */
async function checkIndexExists(indexName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM pg_indexes 
        WHERE indexname = ${indexName}
      );
    `);
    return (result.rows[0]?.exists as boolean) || false;
  } catch (error) {
    console.error(`Error checking index ${indexName}:`, error);
    return false;
  }
}

/**
 * Check if a function exists
 */
async function checkFunctionExists(functionName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = ${functionName}
      );
    `);
    return (result.rows[0]?.exists as boolean) || false;
  } catch (error) {
    console.error(`Error checking function ${functionName}:`, error);
    return false;
  }
}

/**
 * Check if a view exists
 */
async function checkViewExists(viewName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_name = ${viewName}
      );
    `);
    return (result.rows[0]?.exists as boolean) || false;
  } catch (error) {
    console.error(`Error checking view ${viewName}:`, error);
    return false;
  }
}

/**
 * Validate all security tables
 */
async function validateSecurityTables(): Promise<ValidationResult[]> {
  const requiredTables = [
    'jwt_tokens',
    'security_audit_logs',
    'security_alerts', 
    'password_history'
  ];
  
  const results: ValidationResult[] = [];
  
  for (const tableName of requiredTables) {
    const exists = await checkTableExists(tableName);
    results.push({
      category: 'Tables',
      item: tableName,
      exists,
      required: true,
      message: exists ? 'Table exists' : 'Table missing - run security migration'
    });
  }
  
  return results;
}

/**
 * Validate security columns in users table
 */
async function validateSecurityColumns(): Promise<ValidationResult[]> {
  const requiredColumns = [
    'failed_login_attempts',
    'last_failed_login', 
    'account_locked',
    'lockout_expires',
    'last_password_change',
    'password_expiry_warning_sent',
    'force_password_change',
    'password_strength_score'
  ];
  
  const results: ValidationResult[] = [];
  
  for (const columnName of requiredColumns) {
    const exists = await checkColumnExists('users', columnName);
    results.push({
      category: 'User Columns',
      item: `users.${columnName}`,
      exists,
      required: true,
      message: exists ? 'Column exists' : 'Column missing - run security migration'
    });
  }
  
  return results;
}

/**
 * Validate security indexes
 */
async function validateSecurityIndexes(): Promise<ValidationResult[]> {
  const requiredIndexes = [
    // Users table indexes
    'idx_users_account_locked',
    'idx_users_lockout_expires',
    'idx_users_failed_login_attempts',
    'idx_users_last_password_change',
    
    // JWT tokens indexes
    'jwt_tokens_user_id_idx',
    'jwt_tokens_expires_at_idx',
    'jwt_tokens_token_type_idx',
    'jwt_tokens_is_revoked_idx',
    
    // Security audit logs indexes
    'security_audit_logs_timestamp_idx',
    'security_audit_logs_event_type_idx',
    'security_audit_logs_user_id_idx',
    'security_audit_logs_ip_address_idx',
    'security_audit_logs_severity_idx',
    
    // Security alerts indexes
    'security_alerts_timestamp_idx',
    'security_alerts_alert_type_idx',
    'security_alerts_severity_idx',
    'security_alerts_status_idx',
    
    // Password history indexes
    'password_history_user_id_idx',
    'password_history_created_at_idx',
    'password_history_user_created_idx'
  ];
  
  const results: ValidationResult[] = [];
  
  for (const indexName of requiredIndexes) {
    const exists = await checkIndexExists(indexName);
    results.push({
      category: 'Indexes',
      item: indexName,
      exists,
      required: true,
      message: exists ? 'Index exists' : 'Index missing - may impact performance'
    });
  }
  
  return results;
}

/**
 * Validate security functions
 */
async function validateSecurityFunctions(): Promise<ValidationResult[]> {
  const requiredFunctions = [
    'track_password_change',
    'cleanup_expired_jwt_tokens',
    'cleanup_password_history',
    'cleanup_old_audit_logs',
    'get_security_metrics'
  ];
  
  const results: ValidationResult[] = [];
  
  for (const functionName of requiredFunctions) {
    const exists = await checkFunctionExists(functionName);
    results.push({
      category: 'Functions',
      item: functionName,
      exists,
      required: true,
      message: exists ? 'Function exists' : 'Function missing - some features may not work'
    });
  }
  
  return results;
}

/**
 * Validate security views
 */
async function validateSecurityViews(): Promise<ValidationResult[]> {
  const requiredViews = [
    'recent_security_events',
    'active_security_alerts',
    'locked_accounts'
  ];
  
  const results: ValidationResult[] = [];
  
  for (const viewName of requiredViews) {
    const exists = await checkViewExists(viewName);
    results.push({
      category: 'Views',
      item: viewName,
      exists,
      required: true,
      message: exists ? 'View exists' : 'View missing - monitoring features may not work'
    });
  }
  
  return results;
}

/**
 * Test security functions
 */
async function testSecurityFunctions(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  
  try {
    // Test get_security_metrics function
    await db.execute(sql`SELECT * FROM get_security_metrics(1);`);
    results.push({
      category: 'Function Tests',
      item: 'get_security_metrics',
      exists: true,
      required: true,
      message: 'Function executes successfully'
    });
  } catch (error) {
    results.push({
      category: 'Function Tests',
      item: 'get_security_metrics',
      exists: false,
      required: true,
      message: `Function test failed: ${error}`
    });
  }
  
  try {
    // Test cleanup functions (dry run)
    await db.execute(sql`SELECT cleanup_expired_jwt_tokens();`);
    results.push({
      category: 'Function Tests',
      item: 'cleanup_expired_jwt_tokens',
      exists: true,
      required: true,
      message: 'Function executes successfully'
    });
  } catch (error) {
    results.push({
      category: 'Function Tests',
      item: 'cleanup_expired_jwt_tokens',
      exists: false,
      required: true,
      message: `Function test failed: ${error}`
    });
  }
  
  return results;
}

/**
 * Print validation results
 */
function printResults(summary: ValidationSummary): void {
  console.log('\n📋 Security Schema Validation Results');
  console.log('=====================================');
  
  // Group results by category
  const categories = [...new Set(summary.results.map(r => r.category))];
  
  for (const category of categories) {
    const categoryResults = summary.results.filter(r => r.category === category);
    const passed = categoryResults.filter(r => r.exists).length;
    const total = categoryResults.length;
    
    console.log(`\n${category}: ${passed}/${total} ✅`);
    
    for (const result of categoryResults) {
      const status = result.exists ? '✅' : '❌';
      const message = result.message ?? '';
      console.log(`  ${status} ${result.item} - ${message}`);
    }
  }
  
  console.log('\n📊 Summary');
  console.log('===========');
  console.log(`Total Checks: ${summary.total}`);
  console.log(`Passed: ${summary.passed} ✅`);
  console.log(`Failed: ${summary.failed} ❌`);
  console.log(`Success Rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%`);
  
  if (summary.failed > 0) {
    console.log('\n⚠️  Some security features are missing or not working properly.');
    console.log('   Run the security migration script to fix these issues:');
    console.log('   npm run migrate:security');
  } else {
    console.log('\n🎉 All security features are properly configured!');
  }
}

/**
 * Main validation function
 */
async function validateSecuritySchema(): Promise<ValidationSummary> {
  console.log('🔍 Validating Security Database Schema...');
  
  const allResults: ValidationResult[] = [];
  
  try {
    // Validate all components
    const tableResults = await validateSecurityTables();
    const columnResults = await validateSecurityColumns();
    const indexResults = await validateSecurityIndexes();
    const functionResults = await validateSecurityFunctions();
    const viewResults = await validateSecurityViews();
    const testResults = await testSecurityFunctions();
    
    allResults.push(
      ...tableResults,
      ...columnResults,
      ...indexResults,
      ...functionResults,
      ...viewResults,
      ...testResults
    );
    
    const summary: ValidationSummary = {
      total: allResults.length,
      passed: allResults.filter(r => r.exists).length,
      failed: allResults.filter(r => !r.exists).length,
      results: allResults
    };
    
    printResults(summary);
    
    return summary;
    
  } catch (error) {
    console.error('💥 Error during validation:', error);
    throw error;
  }
}

/**
 * Export for use in other scripts
 */
export { validateSecuritySchema, ValidationResult, ValidationSummary };

// Run validation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateSecuritySchema()
    .then((summary) => {
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('💥 Validation failed:', error);
      process.exit(1);
    });
}