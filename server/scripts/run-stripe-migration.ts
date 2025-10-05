import { Pool } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runStripeMigration() {
  const databaseUrl = process.env.SUPABASE_DB_URL || 
                     process.env.DATABASE_URL || 
                     process.env.SUPABASE_URL;

  if (!databaseUrl) {
    console.error('❌ No database URL found in environment variables');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    console.log('🚀 Starting Stripe subscription migration...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../../migrations/0002_stripe_subscriptions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✅ Stripe subscription migration completed successfully!');
    console.log('');
    console.log('Added fields:');
    console.log('  - subscription_tier (TEXT, default: free)');
    console.log('  - subscription_period_end (TIMESTAMP)');
    console.log('');
    console.log('Created indexes:');
    console.log('  - idx_users_subscription_tier');
    console.log('  - idx_users_subscription_status');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runStripeMigration();
