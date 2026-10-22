import { defineConfig } from "vitest/config";

// API tests run against a real Postgres database (local Docker or CI service).
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5487/launchpad_test";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/globalSetup.ts"],
    // Tests share one database, so run files one at a time.
    fileParallelism: false,
    testTimeout: 20000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: testDatabaseUrl,
      SESSION_SECRET: "test-session-secret",
      DB_POOL_MAX: "5",
    },
  },
});
