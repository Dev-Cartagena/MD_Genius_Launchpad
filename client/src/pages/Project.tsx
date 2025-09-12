import AppLayout from "@/components/Layout/AppLayout";
import ProjectOverview from "@/components/Project/ProjectOverview";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Project() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user has access to project management
    if (user && !['participant', 'administrator'].includes(user.role)) {
      toast({
        title: "Access Restricted",
        description: "Project management is only available to program participants and administrators.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  // Show access denied for non-authorized users
  if (user && !['participant', 'administrator'].includes(user.role)) {
    return (
      <AppLayout title="My Project" subtitle="Access restricted">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-destructive/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">🔒</span>
            </div>
            <h3 className="text-xl font-semibold">Access Restricted</h3>
            <p className="text-muted-foreground max-w-md">
              Project management is only available to program participants and administrators. 
              Please apply to the program or contact support if you believe this is an error.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="My Project" 
      subtitle="Manage your startup project and track development progress"
    >
      <ProjectOverview />
    </AppLayout>
  );
}
