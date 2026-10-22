import passport from "passport";
import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Express, RequestHandler } from "express";
import { pool } from "./db.js";
import { storage } from "./storage.js";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

/**
 * Session payload stored by passport. Routes read the user id from
 * req.user.claims.sub, so that shape is kept from the old Replit auth.
 */
export interface SessionUser {
  claims: {
    sub: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  };
  authProvider: "local";
}

export function createLocalUserSession(user: {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}): SessionUser {
  return {
    claims: {
      sub: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
    },
    authProvider: "local",
  };
}

function getSession() {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set");
  }
  const PgStore = connectPg(session);
  const sessionStore = new PgStore({
    pool: pool as any,
    createTableIfMissing: false,
    ttl: SESSION_TTL_MS / 1000,
    tableName: "sessions",
  });
  sessionStore.on("error", (error) => {
    console.error("Session store error:", error);
  });

  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_TTL_MS,
      sameSite: "lax",
    },
  });
}

export function setupAuth(app: Express) {
  // Vercel terminates TLS at its proxy; without this, secure cookies are never
  // set. Only trust X-Forwarded-For behind a known proxy, otherwise clients
  // could spoof their IP and dodge per-IP rate limits.
  if (process.env.VERCEL || process.env.TRUST_PROXY === "true") {
    app.set("trust proxy", 1);
  }
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Old Replit login entry points. Kept so existing links keep working.
  app.get("/api/login", (_req, res) => res.redirect("/login"));
  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      req.session.destroy(() => res.redirect("/"));
    });
  });
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out" });
      });
    });
  });
}

/**
 * Requires a logged-in, active user. Deactivated users are logged out on
 * their next request.
 */
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const sessionUser = req.user as SessionUser | undefined;
  if (!req.isAuthenticated() || !sessionUser?.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await storage.getUser(sessionUser.claims.sub);
    if (!user || user.isActive === false) {
      return req.logout(() => {
        res.status(401).json({ message: "Unauthorized" });
      });
    }
    (req as any).currentUser = user;
    next();
  } catch (error) {
    next(error);
  }
};
