import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { useTranslation } from "react-i18next";
import { BlockLoader } from "@/components/brand/BlockLoader";
import { isLocale } from "@/i18n";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import Home from "@/pages/Home";
import Application from "@/pages/Application";
import Dashboard from "@/pages/Dashboard";
import Curriculum from "@/pages/Curriculum";
import Roadmap from "@/pages/Roadmap";
import Project from "@/pages/Project";
import Mentors from "@/pages/Mentors";
import Investors from "@/pages/Investors";
import Admin from "@/pages/Admin";
import MentorProfile from "@/pages/MentorProfile";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import ResetPassword from "@/pages/ResetPassword";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  // Subscribing here re-renders the whole tree when the language changes.
  const { t, i18n } = useTranslation();

  // The account's language wins once we know who is signed in.
  useEffect(() => {
    if (user && isLocale(user.locale) && user.locale !== i18n.language) {
      i18n.changeLanguage(user.locale);
    }
  }, [user, i18n]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <BlockLoader label={t("status.loading")} />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/reset-password" component={ResetPassword} />
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/login" component={Auth} />
          <Route path="/apply" component={Application} />
          <Route path="/terms" component={Terms} />
          <Route path="/privacy" component={Privacy} />
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/apply" component={Application} />
          <Route path="/curriculum" component={Curriculum} />
          <Route path="/roadmap" component={Roadmap} />
          <Route path="/project" component={Project} />
          <Route path="/mentors" component={Mentors} />
          <Route path="/mentor-profile" component={MentorProfile} />
          <Route path="/investors" component={Investors} />
          <Route path="/terms" component={Terms} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/admin" component={Admin} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
