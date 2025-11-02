import { db, pool } from '../db.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runUXMigration() {
  console.log('🚀 Starting UX Information Architecture migration...');
  
  try {
    // Read the migration file
    const migrationPath = join(__dirname, '../../migrations/0005_ux_information_architecture.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Execute the migration
    console.log('📝 Executing migration SQL...');
    await pool.query(migrationSQL);
    
    console.log('✅ UX Information Architecture migration completed successfully!');
    console.log('\nCreated tables:');
    console.log('  - user_preferences');
    console.log('  - projects');
    console.log('  - project_analyses');
    console.log('  - action_plan_progress');
    console.log('  - share_links');
    console.log('  - help_articles');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runUXMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { runUXMigration };
