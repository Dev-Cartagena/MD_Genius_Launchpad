import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    const issuerUrl = process.env.ISSUER_URL ?? "https://replit.com/oidc";
    const replId = process.env.REPL_ID!;
    console.log('OIDC Discovery - Issuer URL:', issuerUrl);
    console.log('OIDC Discovery - REPL_ID:', replId);
    
    try {
      const config = await client.discovery(
        new URL(issuerUrl),
        replId
      );
      console.log('OIDC Discovery successful');
      return config;
    } catch (error) {
      console.error('OIDC Discovery failed:', error);
      throw error;
    }
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  // Add error handling for session store
  sessionStore.on('error', (error) => {
    console.error('Session store error:', error);
  });

  // Fix cookie configuration for incognito mode and development
  const isProduction = process.env.NODE_ENV === 'production';
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction, // Only require HTTPS in production
      maxAge: sessionTtl,
      sameSite: 'lax', // Better compatibility for OIDC flows
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
  user.authProvider = 'oidc'; // Mark as OIDC authentication
}

// Helper function for local authentication sessions
export function createLocalUserSession(userData: any) {
  return {
    claims: {
      sub: userData.id,
      email: userData.email,
      first_name: userData.firstName,
      last_name: userData.lastName,
    },
    authProvider: 'local', // Mark as local authentication
    expires_at: null, // Local sessions don't expire via tokens
  };
}

async function upsertUser(
  claims: any,
) {
  // Check if email is in super admin list
  const SUPER_ADMIN_EMAILS = process.env.SUPER_ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
  const userEmail = claims["email"];
  const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(userEmail);
  
  // Determine role: super admin override, OIDC claims, or default
  let assignedRole = claims["role"] || "public_visitor";
  if (isSuperAdmin) {
    assignedRole = "administrator";
    console.log(`Super admin access granted to ${userEmail}`);
  }

  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    role: assignedRole,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      console.log('Authentication verify function called');
      const user = {};
      const claims = tokens.claims();
      
      if (!claims) {
        console.error('No claims received from token');
        return verified(new Error('No claims in token'), null);
      }
      
      console.log('User claims received:', { 
        sub: claims.sub, 
        email: claims.email, 
        first_name: claims.first_name 
      });
      
      updateUserSession(user, tokens);
      await upsertUser(claims);
      console.log('User authentication successful for:', claims.email);
      verified(null, user);
    } catch (error) {
      console.error('Authentication verify error:', error);
      verified(error, null);
    }
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const callbackURL = `https://${domain}/api/callback`;
    console.log(`Configuring OIDC strategy for domain: ${domain}`);
    console.log(`Callback URL: ${callbackURL}`);
    
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL,
      },
      verify,
    );
    passport.use(strategy);
    console.log(`OIDC strategy registered for: replitauth:${domain}`);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    console.log('Login attempt initiated for hostname:', req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    console.log('Authentication callback received for hostname:', req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, (err: any) => {
      if (err) {
        console.error('Authentication callback error:', err);
        console.error('Error details:', {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
        return res.redirect("/api/login?error=auth_failed");
      }
      next();
    });
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Handle local authentication (email/password)
  if (user.authProvider === 'local') {
    // Local sessions don't expire via tokens, so just proceed
    return next();
  }

  // Handle OIDC authentication (social login)
  if (!user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  // Token has expired, try to refresh
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    console.error('Token refresh failed:', error);
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
