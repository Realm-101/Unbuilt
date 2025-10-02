#!/usr/bin/env tsx

/**
 * Security Database Migration Runner
 * 
 * This script applies comprehensive security enhancements to the database.
 * It can be run standalone or integrated into the application startup process.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../db.js';
import { sql } from 'drizzle-orm';

interface MigrationResult {
  success: boolean;
  message: string;
  error?: string;
  executionTime: number;
}

/**
 * Executes a SQL migration file
 */
async function executeMigrationFile(filePath: string): Promise<MigrationResult> {
  const startTime = Date.now();
  
  try {
    console.log(`📄 Reading migration file: ${filePath}`);
    const migrationSQL = readFileSync(filePath, 'utf-8');
    
    console.log('🔄 Executing migration...');
    await db.execute(sql.raw(migrationSQL));
    
    const executionTime = Date.now() - startTime;
    
    return {
      success: true,
      message: `Migration completed successfully in ${executionTime}ms`,
      executionTime
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      message: `Migration failed after ${executionTime}ms`,
      error: errorMessage,
      executionTime
    };
  }
}

/**
 * Validates that all required security tables exist
 */
async function validateSecurityTables(): Promise<boolean> {
  const requiredTables = [
    'jwt_tokens',
    'security_audit_logs', 
    'security_alerts',
    'password_history'
  ];
  
  try {
    console.log('🔍 Validating security tables...');
    
    for (const tableName of requiredTables) {
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = ${tableName}
        );
      `);
      
      const exists = result.rows[0]?.exists;
      if (!exists) {
        console.error(`❌ Required table '${tableName}' does not exist`);
        return false;
      }
      console.log(`✅ Table '${tableName}' exists`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error validating tables:', error);
    return false;
  }
}

/**
 * Validates that all required security columns exist in users table
 */
async function validateSecurityColumns(): Promise<boolean> {
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
  
  try {
    console.log('🔍 Validating security columns in users table...');
    
    for (const columnName of requiredColumns) {
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = ${columnName}
        );
      `);
      
      const exists = result.rows[0]?.exists;
      if (!exists) {
        console.error(`❌ Required column 'users.${columnName}' does not exist`);
        return false;
      }
      console.log(`✅ Column 'users.${columnName}' exists`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error validating columns:', error);
    return false;
  }
}

/**
 * Gets current security metrics to verify the system is working
 */
async function getSecurityMetrics(): Promise<void> {
  try {
    console.log('📊 Getting security metrics...');
    
    const result = await db.execute(sql`SELECT * FROM get_security_metrics(24);`);
    const metrics = result.rows[0];
    
    if (metrics) {
      console.log('📈 Security Metrics (Last 24 hours):');
      console.log(`   Total Events: ${metrics.total_events}`);
      console.log(`   Failed Logins: ${metrics.failed_logins}`);
      console.log(`   Successful Logins: ${metrics.successful_logins}`);
      console.log(`   Suspicious Activities: ${metrics.suspicious_activities}`);
      console.log(`   Active Alerts: ${metrics.active_alerts}`);
      console.log(`   Locked Accounts: ${metrics.locked_accounts}`);
      console.log(`   Unique IPs: ${metrics.unique_ips}`);
      console.log(`   Unique Users: ${metrics.unique_users}`);
      console.log(`   Expired Tokens: ${metrics.expired_tokens}`);
    }
  } catch (error) {
    console.warn('⚠️  Could not retrieve security metrics:', error);
  }
}

/**
 * Main migration function
 */
async function runSecurityMigration(): Promise<void> {
  console.log('🚀 Starting Security Database Migration');
  console.log('=====================================');
  
  const migrationFile = join(__dirname, 'migrate-comprehensive-security.sql');
  
  try {
    // Execute the comprehensive migration
    const result = await executeMigrationFile(migrationFile);
    
    if (!result.success) {
      console.error('❌ Migration failed:', result.error);
      process.exit(1);
    }
    
    console.log('✅', result.message);
    
    // Validate that everything was created correctly
    const tablesValid = await validateSecurityTables();
    const columnsValid = await validateSecurityColumns();
    
    if (!tablesValid || !columnsValid) {
      console.error('❌ Migration validation failed');
      process.exit(1);
    }
    
    console.log('✅ All security tables and columns validated successfully');
    
    // Show security metrics
    await getSecurityMetrics();
    
    console.log('');
    console.log('🎉 Security migration completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Update your application to use the new security features');
    console.log('   2. Configure security monitoring and alerting');
    console.log('   3. Set up periodic cleanup jobs for maintenance');
    console.log('   4. Review and test all authentication flows');
    console.log('');
    console.log('🔧 Maintenance commands:');
    console.log('   - SELECT cleanup_expired_jwt_tokens();');
    console.log('   - SELECT cleanup_password_history();');
    console.log('   - SELECT cleanup_old_audit_logs();');
    console.log('');
    console.log('📊 Monitoring queries:');
    console.log('   - SELECT * FROM get_security_metrics(24);');
    console.log('   - SELECT * FROM active_security_alerts;');
    console.log('   - SELECT * FROM recent_security_events;');
    console.log('   - SELECT * FROM locked_accounts;');
    
  } catch (error) {
    console.error('💥 Unexpected error during migration:', error);
    process.exit(1);
  }
}

/**
 * Cleanup function for maintenance
 */
export async function runSecurityMaintenance(): Promise<void> {
  console.log('🧹 Running security maintenance tasks...');
  
  try {
    // Clean up expired JWT tokens
    const expiredTokens = await db.execute(sql`SELECT cleanup_expired_jwt_tokens();`);
    console.log(`✅ Cleaned up ${expiredTokens.rows[0]?.cleanup_expired_jwt_tokens || 0} expired JWT tokens`);
    
    // Clean up old password history
    const oldPasswords = await db.execute(sql`SELECT cleanup_password_history();`);
    console.log(`✅ Cleaned up ${oldPasswords.rows[0]?.cleanup_password_history || 0} old password history entries`);
    
    // Clean up old audit logs
    const oldLogs = await db.execute(sql`SELECT cleanup_old_audit_logs();`);
    console.log(`✅ Cleaned up ${oldLogs.rows[0]?.cleanup_old_audit_logs || 0} old audit log entries`);
    
    console.log('🎉 Security maintenance completed successfully');
  } catch (error) {
    console.error('❌ Error during security maintenance:', error);
    throw error;
  }
}

/**
 * Check if security migration is needed
 */
export async function checkMigrationStatus(): Promise<boolean> {
  try {
    const tablesExist = await validateSecurityTables();
    const columnsExist = await validateSecurityColumns();
    
    return tablesExist && columnsExist;
  } catch (error) {
    console.warn('⚠️  Could not check migration status:', error);
    return false;
  }
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSecurityMigration().catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
}

export { runSecurityMigration };