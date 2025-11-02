import { db } from '../db';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Run the resource library enhancement migration
 * This script applies the database schema changes for resource library features
 */
async function runResourceLibraryMigration() {
  try {
    console.log('Starting resource library enhancement migration...');

    // Read the migration SQL file
    const migrationPath = join(process.cwd(), 'migrations', '0007_resource_library_enhancement.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    await db.execute(sql.raw(migrationSQL));

    console.log('✅ Resource library enhancement migration completed successfully');
    console.log('Created tables:');
    console.log('  - resource_categories');
    console.log('  - resource_tags');
    console.log('  - resources');
    console.log('  - resource_tag_mappings');
    console.log('  - user_bookmarks');
    console.log('  - resource_ratings');
    console.log('  - resource_contributions');
    console.log('  - resource_access_history');
    console.log('  - resource_analytics');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

/**
 * Rollback the resource library enhancement migration
 */
async function rollbackResourceLibraryMigration() {
  try {
    console.log('Starting resource library enhancement migration rollback...');

    // Read the rollback SQL file
    const rollbackPath = join(process.cwd(), 'migrations', '0007_resource_library_enhancement_rollback.sql');
    const rollbackSQL = readFileSync(rollbackPath, 'utf-8');

    // Execute the rollback
    await db.execute(sql.raw(rollbackSQL));

    console.log('✅ Resource library enhancement migration rolled back successfully');

    process.exit(0);
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  }
}

// Check command line arguments
const command = process.argv[2];

if (command === 'rollback') {
  rollbackResourceLibraryMigration();
} else {
  runResourceLibraryMigration();
}

