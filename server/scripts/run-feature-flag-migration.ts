/**
 * Run Feature Flag Migration
 * 
 * Applies the feature flag migration to the database
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../config/logger';

async function runMigration() {
  console.log('\n🚀 Running Feature Flag Migration\n');

  try {
    // Read migration file
    const migrationPath = join(process.cwd(), 'migrations', '0012_feature_flags.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.execute(sql.raw(statement));
          console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
        } catch (error: any) {
          // Ignore "already exists" errors
          if (error.message?.includes('already exists')) {
            console.log(`⚠️  Skipped (already exists): ${statement.substring(0, 50)}...`);
          } else {
            throw error;
          }
        }
      }
    }

    console.log('\n✅ Migration completed successfully!\n');
    console.log('Next steps:');
    console.log('1. Initialize feature flag: npm run deploy:feature-flag init');
    console.log('2. Check status: npm run deploy:feature-flag status\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    logger.error('Feature flag migration failed', { error });
    process.exit(1);
  }
}

runMigration();
