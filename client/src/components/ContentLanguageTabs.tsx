import { useTranslation } from "react-i18next";
import type { Locale } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ContentLanguageTabsProps {
  value: Locale;
  onChange: (value: Locale) => void;
  /** Marks the Spanish tab when no Spanish text has been entered yet. */
  spanishMissing?: boolean;
  className?: string;
}

/**
 * Switches an admin form between the English (base) and Spanish versions of its text fields.
 * Bind the Spanish inputs to `translations.es.<field>`; non-text fields stay shared.
 */
export function ContentLanguageTabs({ value, onChange, spanishMissing, className }: ContentLanguageTabsProps) {
  const { t } = useTranslation();
  return (
    <div className={cn("space-y-2", className)}>
      <div
        role="tablist"
        aria-label={t("content.language")}
        className="inline-flex items-center rounded-full bg-primary/[0.06] p-1"
        data-testid="content-language-tabs"
      >
        {(["en", "es"] as const).map((lng) => {
          const active = value === lng;
          return (
            <button
              key={lng}
              type="button"
              role="tab"
              aria-selected={active}
              lang={lng}
              onClick={() => onChange(lng)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 font-display text-sm font-medium transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25",
                active
                  ? "bg-card text-foreground shadow-[0_1px_2px_hsl(var(--navy)/0.08),0_2px_6px_-2px_hsl(var(--navy)/0.12)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
              data-testid={`content-language-${lng}`}
            >
              {lng === "en" ? t("content.english") : t("content.spanish")}
              {lng === "es" && spanishMissing && (
                <span className="h-1.5 w-1.5 rounded-full border border-steel/70" aria-label={t("content.missing")} />
              )}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{value === "en" ? t("content.required") : t("content.optional")}</p>
    </div>
  );
}
