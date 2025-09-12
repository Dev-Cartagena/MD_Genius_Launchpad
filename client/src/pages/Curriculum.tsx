import AppLayout from "@/components/Layout/AppLayout";
import CurriculumView from "@/components/Curriculum/CurriculumView";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Curriculum() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user has access to curriculum
    if (user && !['participant', 'mentor', 'administrator'].includes(user.role)) {
      toast({
        title: "Access Restricted",
        description: "The curriculum is only available to program participants, mentors, and administrators.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  // Show access denied for non-authorized users
  if (user && !['participant', 'mentor', 'administrator'].includes(user.role)) {
    return (
      <AppLayout title="Curriculum" subtitle="Access restricted">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-destructive/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">🔒</span>
            </div>
            <h3 className="text-xl font-semibold">Access Restricted</h3>
            <p className="text-muted-foreground max-w-md">
              The curriculum is only available to program participants, mentors, and administrators. 
              Please apply to the program or contact support if you believe this is an error.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Curriculum" 
      subtitle="Access comprehensive learning modules and track your progress"
    >
      <CurriculumView />
    </AppLayout>
  );
}
