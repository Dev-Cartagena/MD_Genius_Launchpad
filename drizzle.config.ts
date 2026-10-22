import { defineConfig } from "drizzle-kit";

// Load .env for local development if present (Node 20.12+). Existing env vars win.
try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on the environment (Replit, CI, Vercel).
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
