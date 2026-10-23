import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "../client/src");

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return tsxFiles(full);
    return e.name.endsWith(".tsx") ? [relative(SRC, full)] : [];
  });
}

// JSX text between tags, string props users see, and title/description literals (toasts).
const JSX_TEXT = />\s*([^<>{}\n=;]*[A-Za-z]{3,}[^<>{}\n;]*?)\s*</g;
const ATTR = /\b(placeholder|title|aria-label|alt|label)="([A-Za-z][^"]*[a-z]{2,}[^"]*)"/g;
const OBJECT = /\b(title|description):\s*"([A-Z][^"]{3,})"/g;

/** Not user-facing copy: example URLs and expressions the regex catches inside JSX. */
const ALLOWED = (text: string) =>
  /^https?:\/\//.test(text) || /^[\w.]+$/.test(text) || /[()&|?]|=>|\bconst\b/.test(text);

describe("no hard-coded interface text", () => {
  it("routes every visible string in screens through the translation catalogs", () => {
    const files = tsxFiles(SRC).filter((f) => !f.startsWith("components/ui/"));
    expect(files.length).toBeGreaterThan(30);
    const found: string[] = [];
    for (const file of files) {
      const src = readFileSync(join(SRC, file), "utf8");
      for (const re of [JSX_TEXT, ATTR, OBJECT]) {
        for (const m of Array.from(src.matchAll(re))) {
          const text = (m[2] ?? m[1]).trim();
          if (!ALLOWED(text)) found.push(`${relative(SRC, join(SRC, file))}: ${text.slice(0, 80)}`);
        }
      }
    }
    expect(found).toEqual([]);
  });
});
