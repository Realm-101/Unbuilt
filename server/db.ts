import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon databases
neonConfig.webSocketConstructor = ws;

// Check for database URL in order of preference
const databaseUrl = process.env.SUPABASE_DB_URL || 
                   process.env.DATABASE_URL || 
                   process.env.SUPABASE_URL;

let pool: Pool;
let db: ReturnType<typeof drizzle>;

if (!databaseUrl) {
  console.warn("⚠️ No database URL found. Using fallback configuration.");
  // Create a fallback pool that won't crash the app
  pool = new Pool({ 
    connectionString: "postgresql://user:pass@localhost:5432/fallback",
    max: 1,
    connectionTimeoutMillis: 1000,
  });
  db = drizzle({ client: pool, schema });
} else {
  pool = new Pool({ connectionString: databaseUrl });
  db = drizzle({ client: pool, schema });
}

export { pool, db };