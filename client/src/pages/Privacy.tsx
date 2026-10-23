import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { formatCohortDate } from "@/lib/dates";
import { ArrowLeft } from "lucide-react";

const LAST_UPDATED = "2025-09-12";
const FIVE = ["1", "2", "3", "4", "5"] as const;
const SIX = ["1", "2", "3", "4", "5", "6"] as const;

export default function Privacy() {
  const { t, i18n } = useTranslation(["legal", "common"]);

  const paragraph = (n: "4" | "5" | "7" | "8" | "9") => (
    <section key={n}>
      <h2 className="text-xl font-medium mb-3">{t(`privacy.sections.${n}.title`)}</h2>
      <p>{t(`privacy.sections.${n}.body`)}</p>
    </section>
  );

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <Button 
            variant="ghost" 
            onClick={() => window.history.back()}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("common:actions.back")}
          </Button>
          <h1 className="text-2xl md:text-3xl font-medium">{t("privacy.pageTitle")}</h1>
          <LanguageSwitcher className="ml-auto" />
        </div>

        {i18n.language === "es" && (
          <p className="text-sm text-muted-foreground" data-testid="legal-translation-note">
            {t("translationNote")}
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("privacy.documentTitle")}</CardTitle>
            <p className="text-muted-foreground">
              {t("lastUpdated", { date: formatCohortDate(LAST_UPDATED, { year: "numeric", month: "long", day: "numeric" }) })}
            </p>
          </CardHeader>
          <CardContent className="prose max-w-none space-y-6 prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-a:text-accent marker:text-muted-foreground">
            <section>
              <h2 className="text-xl font-medium mb-3">{t("privacy.sections.1.title")}</h2>
              <h3 className="text-lg font-medium mb-2">{t("privacy.sections.1.subtitle")}</h3>
              <p>{t("privacy.sections.1.body")}</p>
              <ul className="list-disc pl-6 space-y-1">
                {FIVE.map((i) => (
                  <li key={i}>{t(`privacy.sections.1.items.${i}`)}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-medium mb-3">{t("privacy.sections.2.title")}</h2>
              <p>{t("privacy.sections.2.body")}</p>
              <ul className="list-disc pl-6 space-y-1">
                {SIX.map((i) => (
                  <li key={i}>{t(`privacy.sections.2.items.${i}`)}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-medium mb-3">{t("privacy.sections.3.title")}</h2>
              <p>{t("privacy.sections.3.body")}</p>
              <ul className="list-disc pl-6 space-y-1">
                {FIVE.map((i) => (
                  <li key={i}>
                    <strong>{t(`privacy.sections.3.items.${i}.label`)}</strong> {t(`privacy.sections.3.items.${i}.text`)}
                  </li>
                ))}
              </ul>
            </section>

            {paragraph("4")}
            {paragraph("5")}

            <section>
              <h2 className="text-xl font-medium mb-3">{t("privacy.sections.6.title")}</h2>
              <p>{t("privacy.sections.6.body")}</p>
              <ul className="list-disc pl-6 space-y-1">
                {FIVE.map((i) => (
                  <li key={i}>{t(`privacy.sections.6.items.${i}`)}</li>
                ))}
              </ul>
            </section>

            {paragraph("7")}
            {paragraph("8")}
            {paragraph("9")}

            <section>
              <h2 className="text-xl font-medium mb-3">{t("privacy.sections.10.title")}</h2>
              <p>
                {t("privacy.sections.10.body")}
                <br />
                {t("privacy.sections.10.email")}
                <br />
                {t("privacy.sections.10.address")}
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
