import type { RequestHandler } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db.js";
import { authRateLimits } from "../shared/schema.js";

/**
 * Increments a fixed-window counter in Postgres and returns the new count.
 * The window resets once it is older than windowMs.
 */
async function hit(key: string, windowMs: number): Promise<number> {
  // Compare in SQL with now(): window_start is a timestamp without time zone,
  // so a JS Date parameter would be shifted by the server's UTC offset.
  const windowExpired = sql`${authRateLimits.windowStart} < now() - make_interval(secs => ${windowMs / 1000})`;
  const [row] = await db
    .insert(authRateLimits)
    .values({ key, count: 1 })
    .onConflictDoUpdate({
      target: authRateLimits.key,
      set: {
        count: sql`CASE WHEN ${windowExpired} THEN 1 ELSE ${authRateLimits.count} + 1 END`,
        windowStart: sql`CASE WHEN ${windowExpired} THEN now() ELSE ${authRateLimits.windowStart} END`,
      },
    })
    .returning({ count: authRateLimits.count });
  return row.count;
}

interface LimitOptions {
  /** Short name for the endpoint, used in the counter key. */
  name: string;
  windowMs: number;
  /** Max requests per client IP in the window. */
  maxPerIp: number;
  /** Max requests per email address in the window (when the body has one). */
  maxPerEmail?: number;
}

export function rateLimit(options: LimitOptions): RequestHandler {
  return async (req, res, next) => {
    if (process.env.RATE_LIMIT_DISABLED === "true") return next();
    try {
      const ip = req.ip || "unknown";
      const ipCount = await hit(`${options.name}:ip:${ip}`, options.windowMs);
      let emailCount = 0;
      const email =
        typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      if (options.maxPerEmail && email) {
        emailCount = await hit(`${options.name}:email:${email}`, options.windowMs);
      }

      if (
        ipCount > options.maxPerIp ||
        (options.maxPerEmail !== undefined && emailCount > options.maxPerEmail)
      ) {
        res.setHeader("Retry-After", Math.ceil(options.windowMs / 1000));
        return res
          .status(429)
          .json({ message: "Too many attempts. Please wait a few minutes and try again." });
      }
      next();
    } catch (error) {
      // Never lock users out because the limiter itself failed.
      console.error("Rate limiter error:", error);
      next();
    }
  };
}
