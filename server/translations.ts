import type { ContentTranslations } from "../shared/schema.js";

type FieldKind = "text" | "longText" | "list" | "questions";

/** Translatable fields per content type. Anything else in `translations` is dropped. */
export const TRANSLATABLE_FIELDS = {
  cohort: { name: "text", description: "longText" },
  module: { title: "text", description: "longText", objectives: "list", resources: "list" },
  lesson: { title: "text", content: "longText" },
  quiz: { title: "text", questions: "questions" },
  milestone: { title: "text", description: "longText", criteria: "list" },
  roadmapTemplate: { name: "text", description: "longText" },
  roadmapItem: { title: "text", description: "longText" },
} as const satisfies Record<string, Record<string, FieldKind>>;

export type TranslatableKind = keyof typeof TRANSLATABLE_FIELDS;

const TRANSLATED_LOCALES = ["es"] as const;
const MAX = { text: 500, longText: 100_000, listItem: 2_000, listLength: 100 };

function cleanText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function cleanList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.slice(0, MAX.listLength).map((v) => (typeof v === "string" ? v.trim().slice(0, MAX.listItem) : ""));
  // Keep positions so translated items line up with the base list; drop the field when all are empty.
  return items.some(Boolean) ? items : undefined;
}

/** Translated quiz text only. Correct answers stay on the base questions and are matched by index. */
function cleanQuestions(value: unknown): Array<{ question: string; options: string[] }> | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.slice(0, MAX.listLength).map((q: any) => ({
    question: typeof q?.question === "string" ? q.question.trim().slice(0, MAX.listItem) : "",
    options: Array.isArray(q?.options)
      ? q.options.slice(0, 20).map((o: unknown) => (typeof o === "string" ? o.trim().slice(0, MAX.listItem) : ""))
      : [],
  }));
  return out.some((q) => q.question || q.options.some(Boolean)) ? out : undefined;
}

/**
 * Keep only known locales and translatable fields with clean values.
 * Returns undefined when the input is not an object, so callers leave the column untouched.
 */
export function sanitizeTranslations(kind: TranslatableKind, input: unknown): ContentTranslations | undefined {
  if (input === undefined || input === null || typeof input !== "object" || Array.isArray(input)) return undefined;
  const fields = TRANSLATABLE_FIELDS[kind] as Record<string, FieldKind>;
  const result: ContentTranslations = {};
  for (const locale of TRANSLATED_LOCALES) {
    const source = (input as Record<string, unknown>)[locale];
    if (!source || typeof source !== "object") continue;
    const clean: Record<string, unknown> = {};
    for (const [field, fieldKind] of Object.entries(fields)) {
      const raw = (source as Record<string, unknown>)[field];
      const value =
        fieldKind === "text"
          ? cleanText(raw, MAX.text)
          : fieldKind === "longText"
            ? cleanText(raw, MAX.longText)
            : fieldKind === "list"
              ? cleanList(raw)
              : cleanQuestions(raw);
      if (value !== undefined) clean[field] = value;
    }
    if (Object.keys(clean).length > 0) result[locale] = clean;
  }
  return result;
}

/** Strip any non-text keys from translated quiz questions before sending them to participants. */
export function publicQuizTranslations(translations: unknown): ContentTranslations {
  return sanitizeTranslations("quiz", translations) ?? {};
}
