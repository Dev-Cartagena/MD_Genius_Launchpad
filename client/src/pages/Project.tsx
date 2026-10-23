import AppLayout from "@/components/Layout/AppLayout";
import ProjectOverview from "@/components/Project/ProjectOverview";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";

export default function Project() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user has access to project management
    if (user && !['participant', 'administrator'].includes(user.role)) {
      toast({
        title: "Access restricted",
        description: "Project management is only available to program participants and administrators.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  // Show access denied for non-authorized users
  if (user && !['participant', 'administrator'].includes(user.role)) {
    return (
      <AppLayout title="My project" subtitle="Access restricted">
        <div className="flex items-center justify-center min-h-96">
          <div className="panel max-w-lg p-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto bg-secondary text-primary rounded-lg flex items-center justify-center">
              <Lock className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-xl">Access restricted</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Project management is available to program participants and administrators.
              Apply to the program, or contact the program team if you think you should have access.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="My project"
      subtitle="Your startup project, its materials and its progress through the program"
    >
      <ProjectOverview />
    </AppLayout>
  );
}
