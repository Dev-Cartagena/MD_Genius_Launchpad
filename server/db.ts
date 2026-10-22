import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import pg from 'pg';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const connectionString = process.env.DATABASE_URL;

// Neon's serverless driver only talks to Neon over WebSockets. Any other
// Postgres (local Docker, Supabase) uses the standard node-postgres driver.
// DB_DRIVER=neon|pg overrides the detection.
const useNeon =
  process.env.DB_DRIVER === "neon" ||
  (process.env.DB_DRIVER !== "pg" && new URL(connectionString).hostname.endsWith(".neon.tech"));

const poolOptions = {
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

let pool: NeonPool | pg.Pool;
let db: NeonDatabase<typeof schema>;

if (useNeon) {
  neonConfig.webSocketConstructor = ws;
  const neonPool = new NeonPool(poolOptions);
  pool = neonPool;
  db = drizzleNeon({ client: neonPool, schema });
} else {
  const pgPool = new pg.Pool(poolOptions);
  pool = pgPool;
  // Both drivers expose the same query builder; the cast keeps one type for callers.
  db = drizzlePg({ client: pgPool, schema }) as unknown as NeonDatabase<typeof schema>;
}

export { pool, db };
