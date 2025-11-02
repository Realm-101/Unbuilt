import { db } from '../db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run Resource Performance Optimization Migration
 * 
 * This script applies performance optimizations to the resource library:
 * - Adds composite indexes for common query patterns
 * - Creates JSONB indexes for phase and idea type filtering
 * - Creates materialized views for popular resources and analytics
 * - Optimizes full-text search configuration
 */

async function runMigration() {
  console.log('Starting resource performance optimization migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../../migrations/0009_resource_performance_optimization.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split by semicolons and filter out empty statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty lines
      if (statement.startsWith('--') || statement.trim().length === 0) {
        continue;
      }

      try {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        await db.execute(sql.raw(statement));
        console.log(`✓ Statement ${i + 1} completed\n`);
      } catch (error: any) {
        // Some statements might fail if objects already exist, which is okay
        if (error.message.includes('already exists')) {
          console.log(`⚠ Statement ${i + 1} skipped (already exists)\n`);
        } else {
          console.error(`✗ Statement ${i + 1} failed:`, error.message);
          throw error;
        }
      }
    }

    console.log('\n✓ Migration completed successfully!');
    console.log('\nPerformance optimizations applied:');
    console.log('  - Composite indexes for common query patterns');
    console.log('  - JSONB indexes for phase and idea type filtering');
    console.log('  - Materialized views for popular resources');
    console.log('  - Materialized views for analytics summary');
    console.log('  - Optimized full-text search configuration');
    console.log('\nNote: Materialized views should be refreshed periodically.');
    console.log('Run these commands to refresh:');
    console.log('  SELECT refresh_popular_resources_mv();');
    console.log('  SELECT refresh_resource_analytics_summary_mv();');

  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('\nMigration script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration script failed:', error);
    process.exit(1);
  });

