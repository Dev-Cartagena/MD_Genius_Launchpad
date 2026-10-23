import { useTranslation } from "react-i18next";
import type { Locale } from "@shared/schema";
import { currentLocale } from "@/i18n";

type WithTranslations = { translations?: unknown } | null | undefined;

function translatedValue(entity: WithTranslations, field: string, locale: Locale): unknown {
  if (!entity || locale === "en") return undefined;
  const t = entity.translations as Record<string, Record<string, unknown> | undefined> | undefined;
  return t?.[locale]?.[field];
}

/**
 * A content field in the given language, falling back to the base (English) value
 * when there is no translation. Works for admin-entered cohorts, modules, lessons,
 * quizzes, milestones, roadmap templates and roadmap items.
 */
export function localizedText(entity: WithTranslations, field: string, locale: Locale = currentLocale()): string {
  const value = translatedValue(entity, field, locale);
  if (typeof value === "string" && value.trim()) return value;
  const base = (entity as Record<string, unknown> | null | undefined)?.[field];
  return typeof base === "string" ? base : "";
}

/** A list field (objectives, criteria, resources); each item falls back to the base item at the same position. */
export function localizedList(entity: WithTranslations, field: string, locale: Locale = currentLocale()): string[] {
  const base = (entity as Record<string, unknown> | null | undefined)?.[field];
  const baseList = Array.isArray(base) ? (base as string[]) : [];
  const value = translatedValue(entity, field, locale);
  if (!Array.isArray(value)) return baseList;
  return baseList.map((item, i) => (typeof value[i] === "string" && value[i].trim() ? value[i] : item));
}

export interface QuizQuestionText {
  question: string;
  options: string[];
}

/** Quiz questions with translated text. Order and option positions come from the base questions. */
export function localizedQuestions<Q extends QuizQuestionText>(
  quiz: (WithTranslations & { questions?: unknown }) | null | undefined,
  locale: Locale = currentLocale(),
): Q[] {
  const base = Array.isArray(quiz?.questions) ? (quiz!.questions as Q[]) : [];
  const value = translatedValue(quiz, "questions", locale);
  if (!Array.isArray(value)) return base;
  return base.map((q, i) => {
    const tq = value[i] as Partial<QuizQuestionText> | undefined;
    return {
      ...q,
      question: tq?.question?.trim() ? tq.question : q.question,
      options: q.options.map((o, j) => (tq?.options?.[j]?.trim() ? tq.options[j] : o)),
    };
  });
}

/** Hook form: re-renders on language change and binds the current language. */
export function useLocalized() {
  const { i18n } = useTranslation();
  const locale = (i18n.language === "es" ? "es" : "en") as Locale;
  return {
    locale,
    text: (entity: WithTranslations, field: string) => localizedText(entity, field, locale),
    list: (entity: WithTranslations, field: string) => localizedList(entity, field, locale),
    questions: <Q extends QuizQuestionText>(quiz: (WithTranslations & { questions?: unknown }) | null | undefined) =>
      localizedQuestions<Q>(quiz, locale),
  };
}
