import AppLayout from "@/components/Layout/AppLayout";
import CurriculumView from "@/components/Curriculum/CurriculumView";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

const CURRICULUM_ROLES = ['participant', 'mentor', 'administrator'];

function getRestrictedMessage(
  role: string | undefined,
  t: TFunction<"curriculum">,
): { message: string; action?: { href: string; label: string } } {
  switch (role) {
    case 'applicant':
      return {
        message: t("restricted.applicant.message"),
        action: { href: "/apply", label: t("restricted.applicant.action") },
      };
    case 'investor':
      return {
        message: t("restricted.investor.message"),
        action: { href: "/investors", label: t("restricted.investor.action") },
      };
    default:
      return {
        message: t("restricted.other.message"),
      };
  }
}

export default function Curriculum() {
  const { user } = useAuth();
  const { t } = useTranslation("curriculum");

  // Other roles get an explanation instead of failing curriculum requests
  if (user && !CURRICULUM_ROLES.includes(user.role)) {
    const { message, action } = getRestrictedMessage(user.role, t);
    return (
      <AppLayout title={t("page.title")} subtitle={t("restricted.subtitle")}>
        <div className="flex items-center justify-center min-h-96">
          <div className="panel max-w-lg p-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto bg-secondary text-primary rounded-lg flex items-center justify-center">
              <Lock className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-xl">{t("restricted.title")}</h3>
            <p className="text-muted-foreground max-w-md mx-auto" data-testid="text-curriculum-restricted">
              {message}
            </p>
            {action && (
              <Button asChild variant="outline">
                <Link href={action.href} data-testid="link-curriculum-restricted-action">{action.label}</Link>
              </Button>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={t("page.title")}
      subtitle={t("page.subtitle")}
    >
      <CurriculumView />
    </AppLayout>
  );
}
