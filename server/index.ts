import { createServer } from "http";
import { createApp } from "./app.js";
import { log } from "./log.js";

/**
 * Local and self-hosted entry point: serves the API and the client on one
 * port. On Vercel, api/index.ts serves the API and the client is static.
 */
async function main() {
  const app = createApp();
  const server = createServer(app);

  if (process.env.NODE_ENV === "development") {
    // Vite is a dev dependency; load it only in development.
    const { setupVite } = await import("./vite.js");
    await setupVite(app, server);
  } else {
    const { serveStatic } = await import("./static.js");
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: process.env.HOST || "0.0.0.0",
      // reusePort is only supported on Linux; macOS rejects it with ENOTSUP.
      reusePort: process.platform === "linux",
    },
    () => log(`serving on port ${port}`),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
