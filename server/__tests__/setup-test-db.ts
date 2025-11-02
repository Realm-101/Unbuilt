/**
 * Test Database Setup
 * 
 * This script sets up a test database for running integration tests.
 * It creates all necessary tables and seeds minimal test data.
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import * as schema from '../../shared/schema.js';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

const TEST_DATABASE_URL = process.env.DATABASE_URL;

if (!TEST_DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.test');
  console.error('Please set up a test database connection string in .env.test');
  process.exit(1);
}

// Verify it's a test database
// Allow if: contains 'test', is 'localhost', or NODE_ENV is 'test'
const isTestDatabase = 
  TEST_DATABASE_URL.includes('test') || 
  TEST_DATABASE_URL.includes('localhost') ||
  process.env.NODE_ENV === 'test';

if (!isTestDatabase) {
  console.error('❌ DATABASE_URL does not appear to be a test database');
  console.error('Test database URL should contain "test" or "localhost", or NODE_ENV should be "test"');
  console.error('Current URL:', TEST_DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
  console.error('Current NODE_ENV:', process.env.NODE_ENV);
  process.exit(1);
}

// Warn if using production-like database
if (!TEST_DATABASE_URL.includes('test') && !TEST_DATABASE_URL.includes('localhost')) {
  console.warn('⚠️  Warning: Using a database that does not contain "test" or "localhost"');
  console.warn('   Make sure this is a dedicated test database!');
  console.warn('   Database:', TEST_DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
}

export async function setupTestDatabase() {
  console.log('🔧 Setting up test database...');
  
  if (!TEST_DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }
  
  try {
    const sql = neon(TEST_DATABASE_URL);
    const db = drizzle(sql, { schema });

    // Run migrations to create all tables
    console.log('📦 Running migrations...');
    await migrate(db, { migrationsFolder: './migrations' });

    console.log('✅ Test database setup complete!');
    console.log('📊 Database URL:', TEST_DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
    
    return db;
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    throw error;
  }
}

export async function cleanupTestDatabase() {
  console.log('🧹 Cleaning up test database...');
  
  if (!TEST_DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }
  
  try {
    const sql = neon(TEST_DATABASE_URL);
    const db = drizzle(sql, { schema });

    // Drop all tables in reverse order of dependencies
    const tables = [
      'conversation_analytics',
      'suggested_questions',
      'conversation_messages',
      'conversations',
      'help_articles',
      'share_links',
      'action_plan_progress',
      'project_analyses',
      'projects',
      'user_preferences',
      'analytics_events',
      'password_history',
      'security_alerts',
      'security_audit_logs',
      'activity_feed',
      'comments',
      'idea_shares',
      'team_members',
      'teams',
      'ideas',
      'jwt_tokens',
      'search_results',
      'searches',
      'session',
      'users',
      'resource_categories',
      'resources',
    ];

    for (const table of tables) {
      try {
        await sql(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        console.log(`  ✓ Dropped table: ${table}`);
      } catch (error) {
        console.warn(`  ⚠ Could not drop table ${table}:`, error);
      }
    }

    console.log('✅ Test database cleanup complete!');
  } catch (error) {
    console.error('❌ Failed to cleanup test database:', error);
    throw error;
  }
}

// Run setup if called directly
async function main() {
  const command = process.argv[2];
  
  if (command === 'cleanup') {
    await cleanupTestDatabase();
  } else {
    await setupTestDatabase();
  }
  
  process.exit(0);
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
}
