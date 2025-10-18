// Load environment variables FIRST before any other imports
import * as dotenv from 'dotenv';
dotenv.config();

import { Pool } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';

const databaseUrl = process.env.SUPABASE_DB_URL || 
                   process.env.DATABASE_URL || 
                   process.env.SUPABASE_URL;

if (!databaseUrl) {
  console.error('❌ No database URL found in environment variables');
  process.exit(1);
}

async function runMigration() {
  const pool = new Pool({ connectionString: databaseUrl });
  
  try {
    console.log('🚀 Starting analytics events migration...');
    
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'migrations', '0003_analytics_events.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Analytics events table created successfully');
    console.log('✅ Indexes created for efficient querying');
    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
