import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Only configure WebSocket for Neon if not using Supabase
if (process.env.DATABASE_URL?.includes('neon')) {
  neonConfig.webSocketConstructor = ws;
}

// Check for Supabase URL first, then DATABASE_URL
const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "Database URL must be set. Supabase should be connected via Bolt integration.",
  );
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });