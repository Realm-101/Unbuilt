import 'dotenv/config';
import { db } from '../db';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import path from 'path';

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    
    const migrationsFolder = path.join(process.cwd(), 'migrations');
    console.log(`📁 Migrations folder: ${migrationsFolder}`);
    
    await migrate(db, { migrationsFolder });
    
    console.log('✅ Migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
