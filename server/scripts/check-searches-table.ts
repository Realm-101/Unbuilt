import { Pool } from '@neondatabase/serverless';

async function checkTable() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ No database URL found');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    console.log('🔍 Checking searches table structure...\n');

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'searches'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ searches table does not exist');
      return;
    }

    console.log('✅ searches table exists\n');

    // Get column information
    const columns = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'searches'
      ORDER BY ordinal_position;
    `);

    console.log('📋 Current columns:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
    });

    // Get indexes
    const indexes = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'searches'
      ORDER BY indexname;
    `);

    console.log('\n📊 Current indexes:');
    indexes.rows.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkTable();
