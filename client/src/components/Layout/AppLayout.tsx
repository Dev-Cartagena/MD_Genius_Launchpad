import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "./Sidebar";
import { NodeRule } from "@/components/brand/NodeRule";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ChevronDown, User, LogOut, Menu } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
  /** Omit to render a page with its own hero (only the menu and profile controls show). */
  title?: string;
  subtitle?: string;
}

export default function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (error) {
      console.error("Logout failed:", error);
    }
    queryClient.clear();
    window.location.href = "/";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavOpen} />
      
      <main className="flex-1 min-w-0 overflow-auto">
        {/* Header */}
        <header className="bg-background px-4 pt-4 md:px-8 md:pt-6">
          <div className={`flex items-center justify-between gap-2 ${title ? "pb-3 md:pb-4" : "pb-1"}`}>
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden shrink-0"
                onClick={() => setMobileNavOpen(true)}
                aria-label={t("nav.openNavigation")}
                title={t("nav.openNavigation")}
                data-testid="button-mobile-menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
              {title && <div className="min-w-0">
                <h1 className="line-clamp-2 break-words font-display text-xl font-medium leading-tight text-foreground md:line-clamp-1 md:text-[32px] md:leading-snug" data-testid="page-title">{title}</h1>
                {subtitle && (
                  <p className="mt-1 line-clamp-2 font-display text-sm text-muted-foreground md:truncate md:text-base" data-testid="page-subtitle">{subtitle}</p>
                )}
              </div>}
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <LanguageSwitcher />
              {/* Profile Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 px-2 py-2 font-display text-sm md:px-3"
                    aria-label={t("nav.openProfileMenu")}
                    data-testid="button-profile-menu"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden md:inline" data-testid="text-username">
                      {user?.firstName || t("account.user")}
                    </span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 max-w-[calc(100vw-2rem)]">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.firstName && user?.lastName 
                          ? `${user.firstName} ${user.lastName}` 
                          : user?.firstName || t("account.user")}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground break-all">
                        {user?.email}
                      </p>
                      {user?.role && (
                        <span className="inline-flex w-fit items-center rounded-md bg-secondary px-2 py-0.5 font-display text-xs font-medium capitalize text-secondary-foreground">
                          {t(`roles.${user.role}`)}
                        </span>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t("account.logOut")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {title && <NodeRule />}
        </header>

        {/* Main Content */}
        <div className="p-4 md:px-8 md:py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
