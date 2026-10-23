import { useEffect, useState } from "react";
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
  UserCircle
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
  const [location] = useLocation();
  const [showAiChat, setShowAiChat] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    onMobileOpenChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const closeMobile = () => onMobileOpenChange?.(false);

  const navigationItems = [
    { href: "/dashboard", icon: Home, label: "Dashboard", roles: ["participant", "mentor", "investor", "administrator"] },
    { href: "/curriculum", icon: BookOpen, label: "Curriculum", roles: ["participant"] },
    { href: "/roadmap", icon: Map, label: "Roadmap", roles: ["participant"] },
    { href: "/project", icon: Lightbulb, label: "My Project", roles: ["participant"] },
    { href: "/mentors", icon: Users, label: "Mentors", roles: ["participant", "mentor"] },
    { href: "/mentor-profile", icon: UserCircle, label: "My Mentor Profile", roles: ["mentor"] },
    { href: "/investors", icon: TrendingUp, label: "Investors", roles: ["participant", "investor"] },
    { href: "/admin", icon: Settings, label: "Admin Panel", roles: ["administrator"] },
  ];

  const visibleItems = navigationItems.filter(item => 
    !item.roles || item.roles.includes(user?.role || "")
  );

  const isActive = (href: string) => location === href || location.startsWith(href + "/");

  const renderContent = (isMobile: boolean) => (
    <>
        {/* Logo Section */}
        <div className="px-6 pt-6 pb-5">
          <Link href="/dashboard" aria-label="MD Genius Launchpad home" data-testid="app-title">
            <Logo layout="compact" className="h-7" />
          </Link>
        </div>

        {/* User Profile */}
        <div className="mx-4 mb-2 flex items-center gap-3 rounded-lg border border-border px-3 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary font-display text-sm font-medium text-primary-foreground">
            {(user?.firstName?.[0] || user?.email?.[0] || "U").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-medium" data-testid="text-user-name">
              {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || "User"}
            </p>
            <p className="truncate text-xs capitalize text-muted-foreground">
              {user?.role?.replace('_', ' ') || "Participant"}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 px-4 py-3" aria-label="Main">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-3 rounded-md px-3 py-2 font-display text-sm transition-colors ${
                  active
                    ? "active bg-secondary font-medium text-foreground before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-accent"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
                onClick={isMobile ? closeMobile : undefined}
                data-testid={`${isMobile ? 'mobile-' : ''}link-${item.label.toLowerCase().replace(/ /g, '-')}`}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* AI Coach Quick Access */}
        <div className="border-t border-border p-4">
          <Button
            onClick={() => {
              if (isMobile) closeMobile();
              setShowAiChat(true);
            }}
            className="w-full"
            data-testid={isMobile ? "button-ai-coach-mobile" : "button-ai-coach"}
          >
            <Bot className="h-4 w-4" />
            <span>AI Coach</span>
          </Button>
        </div>
    </>
  );

  return (
    <>
      <aside className="hidden md:flex w-64 shrink-0 bg-card border-r border-border flex-col overflow-y-auto">
        {renderContent(false)}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={(open) => onMobileOpenChange?.(open)}>
        <SheetContent side="left" className="w-72 max-w-[85vw] p-0 flex flex-col overflow-y-auto bg-card">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Main navigation menu</SheetDescription>
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
