import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes.js";
import { setupAuth } from "./auth.js";
import { log } from "./log.js";

/**
 * Builds the Express app with all API routes but no HTTP listener and no
 * client serving. Used by the local server (server/index.ts), the Vercel
 * function (api/index.ts) and the tests.
 */
export function createApp() {
  const app = express();

  app.use(
    helmet({
      // The SPA loads Google Fonts and is served separately on Vercel; keep
      // CSP off here and set it at the edge when the asset list is final.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));

  // Request log without bodies: responses contain personal data.
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      if (req.path.startsWith("/api")) {
        log(`${req.method} ${req.path} ${res.statusCode} in ${Date.now() - start}ms`);
      }
    });
    next();
  });

  setupAuth(app);
  registerRoutes(app);

  // Unknown API routes get JSON, not the SPA's index.html.
  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "Not found" });
  });

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error(err);
    const message =
      status >= 500 ? "Internal Server Error" : err.expose === false ? "Bad request" : err.message || "Bad request";
    // Let Express close a response that already started streaming.
    if (res.headersSent) return next(err);
    res.status(status).json({ message });
  });

  return app;
}
