import { db } from '../db';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Run performance optimization migration
 * Adds indexes to frequently queried columns
 */

async function runPerformanceMigration() {
  console.log('🚀 Starting performance optimization migration...');
  
  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), 'migrations', '0001_performance_indexes.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Split by semicolons and filter out empty statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n[${i + 1}/${statements.length}] Executing: ${statement.substring(0, 80)}...`);
      
      try {
        await db.execute(sql.raw(statement));
        console.log(`✅ Success`);
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error.message?.includes('already exists')) {
          console.log(`⚠️  Index already exists, skipping`);
        } else {
          console.error(`❌ Error: ${error.message}`);
          throw error;
        }
      }
    }
    
    console.log('\n✅ Performance optimization migration completed successfully!');
    console.log('\n📊 Indexes created for:');
    console.log('  - User lookups (email, username)');
    console.log('  - Search history queries');
    console.log('  - Search results filtering');
    console.log('  - Ideas and related data');
    console.log('  - Team and collaboration data');
    console.log('  - Security events monitoring');
    console.log('  - Session and token management');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPerformanceMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { runPerformanceMigration };
