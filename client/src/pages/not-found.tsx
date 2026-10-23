import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Logo, NodeRule } from "@/components/brand";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-8 bg-background px-4">
      <div className="flex w-full max-w-md items-center justify-between">
        <Logo layout="compact" className="h-8" />
        <LanguageSwitcher />
      </div>
      <div className="panel w-full max-w-md p-6 sm:p-8">
        <p className="font-display text-sm text-muted-foreground mb-2">{t("notFound.code")}</p>
        <h1 className="text-2xl font-medium mb-4">{t("notFound.title")}</h1>
        <NodeRule className="mb-4" />
        <p className="text-sm text-muted-foreground mb-6">{t("notFound.body")}</p>
        <Button asChild>
          <Link href="/">{t("notFound.home")}</Link>
        </Button>
      </div>
    </div>
  );
}
