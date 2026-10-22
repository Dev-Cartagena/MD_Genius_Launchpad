import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/**
 * Builds pg pool options from DATABASE_URL.
 *
 * DATABASE_SSL controls TLS:
 *   - unset / "disable": no TLS (local Docker Postgres)
 *   - "require": TLS without certificate verification (Supabase pooler)
 *   - "verify": TLS with full certificate verification
 *
 * sslmode is stripped from the URL because pg lets it override the ssl
 * option, and newer pg versions treat sslmode=require as verify-full.
 */
function poolConfig(): pg.PoolConfig {
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.delete("sslmode");

  const sslSetting = (process.env.DATABASE_SSL ?? "disable").toLowerCase();
  const ssl =
    sslSetting === "require"
      ? { rejectUnauthorized: false }
      : sslSetting === "verify"
        ? { rejectUnauthorized: true }
        : undefined;

  return {
    connectionString: url.toString(),
    ssl,
    // Serverless functions should keep this small (DB_POOL_MAX=3 on Vercel).
    max: Number(process.env.DB_POOL_MAX ?? 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}

export const pool = new pg.Pool(poolConfig());

// Without a listener, an idle connection dropped by the pooler emits an
// unhandled 'error' event and crashes the process.
pool.on("error", (error) => {
  console.error("Postgres pool error:", error);
});
export const db = drizzle({ client: pool, schema });
