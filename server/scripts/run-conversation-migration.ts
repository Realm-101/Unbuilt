import { db } from '../db';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Run the interactive conversations migration
 * This script applies the database schema changes for conversation features
 */
async function runConversationMigration() {
  try {
    console.log('Starting interactive conversations migration...');

    // Read the migration SQL file
    const migrationPath = join(process.cwd(), 'migrations', '0006_interactive_conversations.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    await db.execute(sql.raw(migrationSQL));

    console.log('✅ Interactive conversations migration completed successfully');
    console.log('Created tables:');
    console.log('  - conversations');
    console.log('  - conversation_messages');
    console.log('  - suggested_questions');
    console.log('  - conversation_analytics');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

/**
 * Rollback the interactive conversations migration
 */
async function rollbackConversationMigration() {
  try {
    console.log('Starting interactive conversations migration rollback...');

    // Read the rollback SQL file
    const rollbackPath = join(process.cwd(), 'migrations', '0006_interactive_conversations_rollback.sql');
    const rollbackSQL = readFileSync(rollbackPath, 'utf-8');

    // Execute the rollback
    await db.execute(sql.raw(rollbackSQL));

    console.log('✅ Interactive conversations migration rolled back successfully');

    process.exit(0);
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  }
}

// Check command line arguments
const command = process.argv[2];

if (command === 'rollback') {
  rollbackConversationMigration();
} else {
  runConversationMigration();
}
