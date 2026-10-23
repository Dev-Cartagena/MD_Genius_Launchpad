import { useState } from "react";
import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatCohortDate } from "@/lib/dates";
import { Link } from "wouter";
import { MistPanel, DropZone } from "@/components/brand";
import {
  FileText,
  Calendar,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  UserCheck,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";
import type { Cohort } from "@shared/schema";

interface AdminMetrics {
  totalApplications: number;
  acceptanceRate: number;
  activeCohorts: number;
  totalProjects: number;
  mentorUtilization: number;
  averageReadiness: number;
  fundingDisbursed: number;
  completionRate: number;
}

interface ProcessedApplication {
  id: string;
  applicant: string;
  project: string;
  status: string;
  submittedDays: number;
  score: number;
  email?: string | null;
  description?: string;
  reviewerNotes?: string[];
}

interface SystemAlert {
  id: string;
  type: "warning" | "info" | "success" | "error";
  title: string;
  message: string;
  priority: "high" | "medium" | "low";
}

interface AdminDashboardProps {
  metrics: AdminMetrics;
  recentApplications: ProcessedApplication[];
  cohorts: Cohort[];
  systemAlerts: SystemAlert[];
}

type UpdateStatusMutation = UseMutationResult<unknown, Error, { id: string; status: string; notes?: string }>;

const formatStatus = (status: string) =>
  status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

// Application Status Dialog Component (module scope so its state survives parent re-renders)
function ApplicationStatusDialog({ application, updateStatus }: { application: ProcessedApplication; updateStatus: UpdateStatusMutation }) {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState("");
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleStatusUpdate = () => {
    if (!selectedStatus) {
      toast({
        title: "Select a status",
        description: "Choose a new status before saving.",
        variant: "destructive",
      });
      return;
    }

    updateStatus.mutate(
      {
        id: application.id,
        status: selectedStatus,
        notes: reviewerNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setIsOpen(false);
          setSelectedStatus("");
          setReviewerNotes("");
        }
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          size="sm"
          variant="outline"
          data-testid={`button-review-${application.id}`}
        >
          Review
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update application status</DialogTitle>
          <div className="text-sm text-muted-foreground">
            Application by {application.applicant} for {application.project}
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="font-display text-sm font-medium">Current status</label>
            <p className="text-sm text-muted-foreground">
              {formatStatus(application.status)}
            </p>
          </div>
          
          <div>
            <label className="font-display text-sm font-medium">New status</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger data-testid={`select-new-status-${application.id}`}>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under review</SelectItem>
                <SelectItem value="shortlisted">Shortlisted</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="offer">Offer</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="font-display text-sm font-medium">Reviewer notes</label>
            <Textarea 
              placeholder="Add reviewer notes (optional)"
              value={reviewerNotes}
              onChange={(e) => setReviewerNotes(e.target.value)}
              data-testid={`textarea-reviewer-notes-${application.id}`}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleStatusUpdate}
              disabled={updateStatus.isPending}
              data-testid={`button-update-status-${application.id}`}
            >
              {updateStatus.isPending ? "Updating..." : "Update status"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminDashboard({ metrics, recentApplications, cohorts, systemAlerts }: AdminDashboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Application status update mutation
  const updateApplicationStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const response = await apiRequest("PUT", `/api/applications/${id}/status`, {
        status,
        reviewerNotes: notes,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application updated",
        description: "The new status has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      // Accepting an application can change the applicant's role
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Could not update application",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total applications" value={metrics.totalApplications} hint="All time" icon={FileText} testId="metric-applications" />
        <KpiCard label="Acceptance rate" value={`${metrics.acceptanceRate}%`} hint="Of all applications" icon={UserCheck} testId="metric-acceptance-rate" />
        <KpiCard label="Projects" value={metrics.totalProjects} hint={`${metrics.activeCohorts} active cohort${metrics.activeCohorts === 1 ? '' : 's'}`} icon={GraduationCap} testId="metric-projects" />
        <KpiCard label="Active cohorts" value={metrics.activeCohorts} hint={`${cohorts.length} in total`} icon={Calendar} testId="metric-active-cohorts" />
      </section>

      {/* Application Review and Cohort Management */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Applications (next step) */}
        <MistPanel>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-sm text-foreground/80">Latest submissions</p>
              <h2 className="font-display text-xl font-medium">Recent applications</h2>
            </div>
            <Link href="/admin">
              <Button size="sm" data-testid="button-view-all-applications">View all</Button>
            </Link>
          </div>

          <div className="space-y-3">
            {recentApplications.length === 0 && (
              <DropZone className="bg-card/60 py-8">
                <p className="text-sm">New applications will appear here as they are submitted.</p>
              </DropZone>
            )}
            {recentApplications.slice(0, 5).map((application) => (
              <Card key={application.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-medium text-sm" data-testid={`application-name-${application.id}`}>
                        {application.applicant}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">
                        {application.project}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            application.status === 'accepted' ? 'default' :
                            application.status === 'interview' || application.status === 'shortlisted' || application.status === 'offer' ? 'secondary' :
                            'outline'
                          }
                          data-testid={`application-status-${application.id}`}
                        >
                          {formatStatus(application.status)}
                        </Badge>
                        <span className="font-display text-xs text-muted-foreground">
                          {application.submittedDays} days ago
                        </span>
                      </div>
                    </div>
                    <ApplicationStatusDialog updateStatus={updateApplicationStatus} application={application} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </MistPanel>

        {/* Cohorts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Cohorts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cohorts.length === 0 && (
                <DropZone className="py-6">
                  <p className="text-sm">Create a cohort in the Admin Panel to open applications.</p>
                </DropZone>
              )}
              {cohorts.map((cohort, index) => (
                <div key={cohort.id} className="flex items-center justify-between gap-3 border-b border-border pb-4 last:border-0 last:pb-0" data-testid={`cohort-${index}`}>
                  <div className="min-w-0">
                    <p className="font-display font-medium text-sm" data-testid={`cohort-name-${index}`}>
                      {cohort.name}
                    </p>
                    <p className="font-display text-xs text-muted-foreground">
                      {formatCohortDate(cohort.startDate)} – {formatCohortDate(cohort.endDate)} · Capacity {cohort.capacity}
                    </p>
                  </div>
                  <Badge variant={cohort.isActive ? "default" : "outline"}>
                    {cohort.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* System Health and Quick Actions */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Quick actions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Cohorts, applications, curriculum, roadmaps, mentors, investors and users are managed in the Admin Panel.
            </p>
            <Link href="/admin">
              <Button className="w-full justify-start" variant="outline" data-testid="button-open-admin-panel">
                <Settings className="w-4 h-4 mr-2" />
                Open Admin Panel
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Alerts & Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              <span>System alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {systemAlerts.length > 0 ? (
                systemAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-lg border p-3 ${
                      alert.type === 'warning' ? 'bg-warning/10 border-warning/30' :
                      alert.type === 'error' ? 'bg-destructive/10 border-destructive/30' :
                      alert.type === 'success' ? 'bg-success/10 border-success/30' :
                      'bg-secondary border-border'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {alert.type === 'warning' && <AlertCircle className="w-4 h-4 shrink-0 text-warning mt-0.5" />}
                      {alert.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-destructive mt-0.5" />}
                      {alert.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0 text-success mt-0.5" />}
                      {alert.type === 'info' && <Clock className="w-4 h-4 shrink-0 text-primary mt-0.5" />}
                      <div>
                        <p className="font-display text-sm font-medium" data-testid={`alert-title-${alert.id}`}>
                          {alert.title}
                        </p>
                        <p className="text-xs text-muted-foreground" data-testid={`alert-message-${alert.id}`}>
                          {alert.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <DropZone className="py-6">
                  <p className="text-sm">Nothing needs attention right now.</p>
                </DropZone>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function KpiCard({ label, value, hint, icon: Icon, testId }: {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  testId: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-display text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-3xl font-medium text-foreground" data-testid={testId}>{value}</p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
