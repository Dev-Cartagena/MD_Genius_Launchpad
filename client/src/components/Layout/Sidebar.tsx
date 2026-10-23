import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { 
  Home, 
  BookOpen, 
  Lightbulb, 
  Users, 
  TrendingUp, 
  Settings,
  Bot,
  Map,
  UserCircle,
  LayoutGrid
} from "lucide-react";
import ChatModal from "@/components/AICoach/ChatModal";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

interface SidebarProps {
  /** Mobile navigation drawer state (below the md breakpoint). */
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export default function Sidebar({ mobileOpen = false, onMobileOpenChange }: SidebarProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [location] = useLocation();
  const [showAiChat, setShowAiChat] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    onMobileOpenChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const closeMobile = () => onMobileOpenChange?.(false);

  const navigationItems = [
    // `id` keeps data-testids stable whatever the interface language.
    { href: "/", icon: Home, id: "home", label: t("nav.home"), roles: ["participant", "mentor", "investor", "administrator", "applicant", "public_visitor"] },
    { href: "/dashboard", icon: LayoutGrid, id: "dashboard", label: t("nav.dashboard"), roles: ["participant", "mentor", "investor", "administrator"] },
    { href: "/curriculum", icon: BookOpen, id: "curriculum", label: t("nav.curriculum"), roles: ["participant"] },
    { href: "/roadmap", icon: Map, id: "roadmap", label: t("nav.roadmap"), roles: ["participant"] },
    { href: "/project", icon: Lightbulb, id: "my-project", label: t("nav.project"), roles: ["participant"] },
    { href: "/mentors", icon: Users, id: "mentors", label: t("nav.mentors"), roles: ["participant", "mentor"] },
    { href: "/mentor-profile", icon: UserCircle, id: "my-mentor-profile", label: t("nav.mentorProfile"), roles: ["mentor"] },
    { href: "/investors", icon: TrendingUp, id: "investors", label: t("nav.investors"), roles: ["participant", "investor"] },
    { href: "/admin", icon: Settings, id: "admin-panel", label: t("nav.admin"), roles: ["administrator"] },
  ];

  const visibleItems = navigationItems.filter(item => 
    !item.roles || item.roles.includes(user?.role || "")
  );

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location === href || location.startsWith(href + "/");

  const renderContent = (isMobile: boolean) => (
    <>
        {/* Logo Section */}
        <div className="px-6 pt-6 pb-5">
          <Link href="/" aria-label={t("nav.homeLink")} data-testid="app-title">
            <Logo layout="compact" className="h-7" />
          </Link>
        </div>

        {/* User Profile */}
        <div className="mx-4 mb-2 flex items-center gap-3 rounded-2xl bg-card px-3 py-3 shadow-card">
          <div className="btn-brand flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display text-sm font-medium text-primary-foreground">
            {(user?.firstName?.[0] || user?.email?.[0] || "U").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-medium" data-testid="text-user-name">
              {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || t("account.user")}
            </p>
            <p className="truncate text-xs capitalize text-muted-foreground">
              {t(`roles.${user?.role ?? "participant"}`)}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 px-4 py-3" aria-label={t("nav.main")}>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-3 rounded-full px-3.5 py-2.5 font-display text-sm transition-[background-color,color,box-shadow] duration-150 ${
                  active
                    ? "active bg-card font-medium text-foreground shadow-[0_1px_2px_hsl(var(--navy)/0.06),0_4px_12px_-6px_hsl(var(--navy)/0.18)]"
                    : "text-muted-foreground hover:bg-card/70 hover:text-foreground"
                }`}
                onClick={isMobile ? closeMobile : undefined}
                data-testid={`${isMobile ? 'mobile-' : ''}link-${item.id}`}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* AI Coach Quick Access */}
        <div className="p-4">
          <Button
            onClick={() => {
              if (isMobile) closeMobile();
              setShowAiChat(true);
            }}
            className="w-full"
            data-testid={isMobile ? "button-ai-coach-mobile" : "button-ai-coach"}
          >
            <Bot className="h-4 w-4" />
            <span>{t("nav.aiCoach")}</span>
          </Button>
        </div>
    </>
  );

  return (
    <>
      <aside className="hidden md:flex w-64 shrink-0 bg-primary/[0.035] border-r border-primary/[0.06] flex-col overflow-y-auto">
        {renderContent(false)}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={(open) => onMobileOpenChange?.(open)}>
        <SheetContent side="left" className="w-72 max-w-[85vw] p-0 flex flex-col overflow-y-auto bg-background">
          <SheetTitle className="sr-only">{t("nav.navigation")}</SheetTitle>
          <SheetDescription className="sr-only">{t("nav.navigationDescription")}</SheetDescription>
          {renderContent(true)}
        </SheetContent>
      </Sheet>

      <ChatModal 
        isOpen={showAiChat} 
        onClose={() => setShowAiChat(false)} 
      />
    </>
  );
}
