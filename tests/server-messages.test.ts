import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { app, resetDatabase, signUp } from "./helpers";
import { translateMessage } from "../server/i18n/index";
import { MESSAGES_ES, PATTERNS_ES } from "../server/i18n/messages-es";

const ROOT = join(__dirname, "..");

/** Literal strings in server code that never reach an API client. */
const ALLOWLIST = [
  // Startup configuration errors: thrown at boot, logged, never sent in a response.
  "SESSION_SECRET must be set",
  "ANTHROPIC_API_KEY is not set",
  "DATABASE_URL must be set. Did you forget to provision a database?",
  // Supabase signing fallbacks: routes catch these and answer with their own "Failed to ..." message.
  "Could not create upload URL",
  "Could not create download URL",
];

const STRING = String.raw`"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'`;
const SOURCES: RegExp[] = [
  new RegExp(String.raw`\bmessage:\s*(?:${STRING})`, "g"),
  new RegExp(String.raw`\.(?:min|max|length)\(\s*[^,()]+,\s*(?:${STRING})`, "g"),
  new RegExp(String.raw`\.(?:email|url|uuid|datetime|nonempty)\(\s*(?:${STRING})`, "g"),
  new RegExp(String.raw`\.regex\(\s*\/(?:[^\/\\\n]|\\.)+\/[a-z]*\s*,\s*(?:${STRING})`, "g"),
  new RegExp(String.raw`\b(?:required_error|invalid_type_error):\s*(?:${STRING})`, "g"),
  // Error messages: thrown errors (some are forwarded as { message: error.message }).
  new RegExp(String.raw`\bsuper\(\s*(?:${STRING})`, "g"),
  new RegExp(String.raw`\bnew Error\(\s*(?:${STRING})`, "g"),
  // Helpers in routes.ts that return a message string for res.json({ message }).
  new RegExp(String.raw`\breturn\s+"([A-Z][^"\\\n]*)";`, "g"),
];

function unquote(double: string | undefined, single: string | undefined): string {
  if (double !== undefined) return JSON.parse(`"${double}"`);
  return (single ?? "").replace(/\\'/g, "'").replace(/\\\\/g, "\\");
}

function sourceMessages(): Map<string, string> {
  const files = [
    ...readdirSync(join(ROOT, "server"))
      .filter((f) => f.endsWith(".ts"))
      .map((f) => join("server", f)),
    join("shared", "schema.ts"),
  ];
  const found = new Map<string, string>();
  for (const file of files) {
    const text = readFileSync(join(ROOT, file), "utf8");
    for (const re of SOURCES) {
      for (const m of Array.from(text.matchAll(re))) {
        const value = unquote(m[1], m[2]);
        if (value.trim()) found.set(value, file);
      }
    }
  }
  return found;
}

function hasSpanish(message: string): boolean {
  return message in MESSAGES_ES || PATTERNS_ES.some(([re]) => re.test(message));
}

describe("server message catalog", () => {
  it("finds the messages it is meant to scan", () => {
    const found = sourceMessages();
    expect(found.size).toBeGreaterThan(100);
    expect(found.has("Invalid email or password")).toBe(true);
    expect(found.has("Password must be at least 8 characters")).toBe(true);
    expect(found.has("This roadmap template is archived. Restore it before assigning it.")).toBe(true);
  });

  it("has Spanish for every user-facing literal message", () => {
    const missing = Array.from(sourceMessages())
      .filter(([message]) => !ALLOWLIST.includes(message) && !hasSpanish(message))
      .map(([message, file]) => `${file}: ${message}`);
    expect(missing).toEqual([]);
  });

  it("keeps the allowlist honest", () => {
    const found = sourceMessages();
    for (const entry of ALLOWLIST) expect(found.has(entry), entry).toBe(true);
  });

  it("uses no exclamation marks in Spanish", () => {
    const values = [...Object.values(MESSAGES_ES), ...PATTERNS_ES.map(([, es]) => es)];
    expect(values.filter((v) => v.includes("¡") || v.includes("!"))).toEqual([]);
  });

  it("anchors every pattern", () => {
    for (const [re] of PATTERNS_ES) {
      expect(re.source.startsWith("^") && re.source.endsWith("$"), re.source).toBe(true);
    }
  });

  it("translates validation messages and keeps the field prefix", () => {
    expect(translateMessage("password: Password must be at least 8 characters", "es")).toBe(
      "password: La contraseña debe tener al menos 8 caracteres",
    );
    expect(translateMessage("title: String must contain at least 1 character(s)", "es")).toBe(
      "title: Debe tener al menos 1 caracteres",
    );
    expect(translateMessage("Invalid email or password", "en")).toBe("Invalid email or password");
    expect(translateMessage("Something nobody translated", "es")).toBe("Something nobody translated");
  });
});

describe("localized API responses", () => {
  beforeEach(resetDatabase);

  it("answers a failed login in Spanish when the client asks for it", async () => {
    await signUp("es@test.local");
    const body = { email: "es@test.local", password: "wrong-password" };

    const es = await request(app).post("/api/auth/login").set("Accept-Language", "es-419,es;q=0.9").send(body);
    expect(es.status).toBe(401);
    expect(es.body.message).toBe(MESSAGES_ES["Invalid email or password"]);

    const en = await request(app).post("/api/auth/login").send(body);
    expect(en.status).toBe(401);
    expect(en.body.message).toBe("Invalid email or password");
  });
});
