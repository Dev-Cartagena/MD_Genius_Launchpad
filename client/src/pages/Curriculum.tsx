import AppLayout from "@/components/Layout/AppLayout";
import CurriculumView from "@/components/Curriculum/CurriculumView";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

const CURRICULUM_ROLES = ['participant', 'mentor', 'administrator'];

function getRestrictedMessage(role: string | undefined): { message: string; action?: { href: string; label: string } } {
  switch (role) {
    case 'applicant':
      return {
        message: "The curriculum opens once your application is accepted and you join a cohort as a participant.",
        action: { href: "/apply", label: "View my application" },
      };
    case 'investor':
      return {
        message: "The curriculum is for program participants and mentors. As an investor, you can follow cohort startups from the Investors area.",
        action: { href: "/investors", label: "Go to Investors" },
      };
    default:
      return {
        message: "The curriculum is available to program participants, mentors, and administrators. Contact the program team if you think you should have access.",
      };
  }
}

export default function Curriculum() {
  const { user } = useAuth();

  // Other roles get an explanation instead of failing curriculum requests
  if (user && !CURRICULUM_ROLES.includes(user.role)) {
    const { message, action } = getRestrictedMessage(user.role);
    return (
      <AppLayout title="Curriculum" subtitle="Not available for your role">
        <div className="flex items-center justify-center min-h-96">
          <div className="panel max-w-lg p-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto bg-secondary text-primary rounded-lg flex items-center justify-center">
              <Lock className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-xl">Curriculum not available</h3>
            <p className="text-muted-foreground max-w-md mx-auto" data-testid="text-curriculum-restricted">
              {message}
            </p>
            {action && (
              <Button asChild variant="outline">
                <Link href={action.href} data-testid="link-curriculum-restricted-action">{action.label}</Link>
              </Button>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Curriculum"
      subtitle="Weekly learning modules for the program, with your progress"
    >
      <CurriculumView />
    </AppLayout>
  );
}
