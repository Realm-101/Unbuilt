import 'dotenv/config';
import { db } from '../db';
import { sql } from 'drizzle-orm';

async function initDatabase() {
  try {
    console.log('🔄 Initializing database...');
    
    // Test connection
    const result = await db.execute(sql`SELECT NOW()`);
    console.log('✅ Database connection successful');
    
    // Check if users table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    const tablesExist = tableCheck.rows[0]?.exists;
    
    if (tablesExist) {
      console.log('✅ Database tables already exist');
    } else {
      console.log('⚠️ Database tables do not exist');
      console.log('📝 Please run the SQL schema manually in Neon console');
      console.log('   Or use: npm run db:generate && npm run db:migrate');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initDatabase();
