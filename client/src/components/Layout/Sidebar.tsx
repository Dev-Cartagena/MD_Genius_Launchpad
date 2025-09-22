import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  BookOpen, 
  Lightbulb, 
  Calendar, 
  Users, 
  TrendingUp, 
  Folder, 
  Rocket,
  Settings,
  Bot,
  Map
} from "lucide-react";
import ChatModal from "@/components/AICoach/ChatModal";

export default function Sidebar() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [showAiChat, setShowAiChat] = useState(false);

  const navigationItems = [
    { href: "/dashboard", icon: Home, label: "Dashboard", roles: ["participant", "mentor", "investor", "administrator"] },
    { href: "/curriculum", icon: BookOpen, label: "Curriculum", roles: ["participant"] },
    { href: "/roadmap", icon: Map, label: "Roadmap", roles: ["participant"] },
    { href: "/project", icon: Lightbulb, label: "My Project", roles: ["participant"] },
    { href: "/mentors", icon: Users, label: "Mentors", roles: ["participant", "mentor", "administrator"] },
    { href: "/investors", icon: TrendingUp, label: "Investors", roles: ["participant", "investor", "administrator"] },
    { href: "/admin", icon: Settings, label: "Admin Panel", roles: ["administrator"] },
  ];

  const visibleItems = navigationItems.filter(item => 
    !item.roles || item.roles.includes(user?.role || "")
  );

  const isActive = (href: string) => location === href || location.startsWith(href + "/");

  return (
    <>
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        {/* Logo Section */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center animate-glow">
              <Rocket className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gradient" data-testid="app-title">MD Genius</h1>
              <p className="text-xs text-muted-foreground">AI Launchpad</p>
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-semibold">
              {user?.firstName?.[0] || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" data-testid="text-user-name">
                {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate capitalize">
                {user?.role?.replace('_', ' ') || "Participant"} • Cohort 2024-Q1
              </p>
              <div className="flex items-center mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                <span className="text-xs text-green-400">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 sidebar-nav">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                  isActive(item.href) ? "active" : ""
                }`}
                data-testid={`link-${item.label.toLowerCase().replace(' ', '-')}`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* AI Coach Quick Access */}
        <div className="p-4 border-t border-border">
          <Button
            onClick={() => setShowAiChat(true)}
            className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-lg px-4 py-3 text-sm font-medium flex items-center justify-center space-x-2 hover:opacity-90 transition-opacity animate-glow"
            data-testid="button-ai-coach"
          >
            <Bot className="w-4 h-4" />
            <span>AI Coach</span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse-slow"></div>
          </Button>
        </div>
      </aside>

      <ChatModal 
        isOpen={showAiChat} 
        onClose={() => setShowAiChat(false)} 
      />
    </>
  );
}
