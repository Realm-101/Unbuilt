import { Pool } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const databaseUrl = process.env.SUPABASE_DB_URL || 
                     process.env.DATABASE_URL || 
                     process.env.SUPABASE_URL;

  if (!databaseUrl) {
    console.error('❌ No database URL found. Please set SUPABASE_DB_URL, DATABASE_URL, or SUPABASE_URL');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    console.log('🚀 Running search history and favorites migration...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../../migrations/0004_search_history_favorites.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('📊 Added:');
    console.log('   - is_favorite column to searches table');
    console.log('   - Index on user_id for efficient user search queries');
    console.log('   - Index on timestamp for chronological ordering');
    console.log('   - Index on is_favorite for filtering favorites');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
