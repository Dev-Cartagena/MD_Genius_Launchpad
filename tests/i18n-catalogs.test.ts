import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../client/src/i18n/locales");

function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flatten(v as Record<string, unknown>, key));
    else out[key] = v as string;
  }
  return out;
}

const load = (lng: string, ns: string) =>
  flatten(JSON.parse(readFileSync(join(ROOT, lng, `${ns}.json`), "utf8")));
const vars = (s: string) => (s.match(/\{\{\s*\w+\s*\}\}/g) ?? []).map((m) => m.replace(/[{}\s]/g, "")).sort();

const namespaces = readdirSync(join(ROOT, "en")).map((f) => f.replace(/\.json$/, ""));

describe("translation catalogs", () => {
  it("has the same namespaces in every language", () => {
    expect(readdirSync(join(ROOT, "es")).map((f) => f.replace(/\.json$/, "")).sort()).toEqual([...namespaces].sort());
  });

  for (const ns of namespaces) {
    it(`${ns}: Spanish matches English keys, values and placeholders`, () => {
      const en = load("en", ns);
      const es = load("es", ns);
      expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
      for (const [key, value] of Object.entries(en)) {
        expect(typeof value, `${ns}:${key} (en)`).toBe("string");
        expect(value.trim(), `${ns}:${key} (en) is empty`).not.toBe("");
        expect(typeof es[key], `${ns}:${key} (es)`).toBe("string");
        expect(es[key].trim(), `${ns}:${key} (es) is empty`).not.toBe("");
        expect(vars(es[key]), `${ns}:${key} placeholders`).toEqual(vars(value));
      }
    });

    it(`${ns}: Spanish follows the voice rules`, () => {
      for (const [key, value] of Object.entries(load("es", ns))) {
        expect(value, `${ns}:${key} uses an exclamation mark`).not.toMatch(/[!¡]/);
        expect(value, `${ns}:${key} uses vosotros`).not.toMatch(/\b(vosotros|vuestro|vuestra)\b/i);
      }
      for (const [key, value] of Object.entries(load("en", ns))) {
        expect(value, `${ns}:${key} uses an exclamation mark`).not.toMatch(/!/);
      }
    });
  }
});
