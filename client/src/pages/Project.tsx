import AppLayout from "@/components/Layout/AppLayout";
import ProjectOverview from "@/components/Project/ProjectOverview";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";

export default function Project() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation("project");

  useEffect(() => {
    // Check if user has access to project management
    if (user && !['participant', 'administrator'].includes(user.role)) {
      toast({
        title: t("restricted.toast.title"),
        description: t("restricted.toast.description"),
        variant: "destructive",
      });
    }
  }, [user, toast]);

  // Show access denied for non-authorized users
  if (user && !['participant', 'administrator'].includes(user.role)) {
    return (
      <AppLayout title={t("page.title")} subtitle={t("restricted.subtitle")}>
        <div className="flex items-center justify-center min-h-96">
          <div className="panel max-w-lg p-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto bg-secondary text-primary rounded-lg flex items-center justify-center">
              <Lock className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-xl">{t("restricted.title")}</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {t("restricted.body")}
            </p>
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
      <ProjectOverview />
    </AppLayout>
  );
}
