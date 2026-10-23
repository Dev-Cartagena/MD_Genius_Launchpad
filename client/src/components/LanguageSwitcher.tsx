import { useTranslation } from "react-i18next";
import { LOCALES } from "@shared/schema";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

/** EN | ES segmented control. `tone="dark"` sits on the navy hero surface. */
export function LanguageSwitcher({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const dark = tone === "dark";

  return (
    <div
      role="group"
      aria-label={t("language.label")}
      className={cn(
        "inline-flex items-center rounded-full p-0.5",
        dark ? "bg-white/10 ring-1 ring-inset ring-white/15" : "bg-primary/[0.06]",
        className,
      )}
      data-testid="language-switcher"
    >
      {LOCALES.map((lng) => {
        const active = lng === language;
        return (
          <button
            key={lng}
            type="button"
            lang={lng}
            aria-pressed={active}
            aria-label={t("language.switchTo", { language: t(`language.${lng}`) })}
            onClick={() => setLanguage(lng)}
            className={cn(
              "h-7 min-w-9 rounded-full px-2.5 font-display text-xs font-medium transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25",
              active
                ? dark
                  ? "bg-white text-primary"
                  : "bg-card text-foreground shadow-[0_1px_2px_hsl(var(--navy)/0.08),0_2px_6px_-2px_hsl(var(--navy)/0.12)]"
                : dark
                  ? "text-white/75 hover:text-white"
                  : "text-muted-foreground hover:text-foreground",
            )}
            data-testid={`language-${lng}`}
          >
            {t(lng === "en" ? "language.enShort" : "language.esShort")}
          </button>
        );
      })}
    </div>
  );
}
