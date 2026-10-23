import type { NextFunction, Request, Response } from "express";
import { MESSAGES_ES, PATTERNS_ES } from "./messages-es.js";

export type ServerLocale = "en" | "es";

/** The signed-in user's language, else the client's Accept-Language, else English. */
export function requestLocale(req: Request): ServerLocale {
  const user = (req as any).currentUser as { locale?: string | null } | undefined;
  if (user?.locale === "es" || user?.locale === "en") return user.locale;
  const header = req.headers["accept-language"];
  return typeof header === "string" && header.toLowerCase().startsWith("es") ? "es" : "en";
}

function translateOne(message: string): string {
  const exact = MESSAGES_ES[message];
  if (exact) return exact;
  for (const [pattern, replacement] of PATTERNS_ES) {
    if (pattern.test(message)) return message.replace(pattern, replacement);
  }
  return message;
}

/** Spanish for an English API message; validation messages ("field: text") translate the text part. */
export function translateMessage(message: string, locale: ServerLocale): string {
  if (locale !== "es") return message;
  const direct = translateOne(message);
  if (direct !== message) return direct;
  const field = message.match(/^([\w.]+): (.+)$/);
  if (field) {
    const text = translateOne(field[2]);
    if (text !== field[2]) return `${field[1]}: ${text}`;
  }
  return message;
}

/** Translates `{ message }` in JSON responses for Spanish-speaking users. English responses are unchanged. */
export function localizeMessages(req: Request, res: Response, next: NextFunction) {
  const json = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (body && typeof body === "object" && !Array.isArray(body) && typeof (body as any).message === "string") {
      const locale = requestLocale(req);
      if (locale === "es") body = { ...(body as object), message: translateMessage((body as any).message, locale) };
    }
    return json(body);
  }) as Response["json"];
  next();
}
