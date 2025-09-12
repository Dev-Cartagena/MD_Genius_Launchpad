import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "./Sidebar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, ChevronDown, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const { user } = useAuth();
  const [notifications] = useState(3); // Mock notification count

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gradient" data-testid="page-title">{title}</h2>
              {subtitle && (
                <p className="text-muted-foreground" data-testid="page-subtitle">{subtitle}</p>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Language Selector */}
              <Select defaultValue="en" data-testid="language-selector">
                <SelectTrigger className="w-32 bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                  <SelectItem value="es">🇪🇸 Español</SelectItem>
                </SelectContent>
              </Select>

              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-secondary"
                data-testid="button-notifications"
              >
                <Bell className="h-5 w-5" />
                {notifications > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    data-testid="notification-count"
                  >
                    {notifications}
                  </Badge>
                )}
              </Button>

              {/* Profile Menu */}
              <Button
                variant="ghost"
                className="flex items-center space-x-2 hover:bg-secondary px-3 py-2"
                data-testid="button-profile-menu"
              >
                <User className="h-4 w-4" />
                <span className="hidden md:inline" data-testid="text-username">
                  {user?.firstName || "User"}
                </span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
