import { useState } from "react";
import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatCohortDate } from "@/lib/dates";
import { Link } from "wouter";
import { 
  Users,
  FileText,
  TrendingUp,
  Calendar,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  BarChart3,
  UserCheck,
  GraduationCap
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

// Application Status Dialog Component (module scope so its state survives parent re-renders)
function ApplicationStatusDialog({ application, updateStatus }: { application: ProcessedApplication; updateStatus: UpdateStatusMutation }) {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState("");
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleStatusUpdate = () => {
    if (!selectedStatus) {
      toast({
        title: "Error",
        description: "Please select a status",
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
          <DialogTitle>Update Application Status</DialogTitle>
          <div className="text-sm text-muted-foreground">
            Application by {application.applicant} for {application.project}
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Current Status</label>
            <p className="text-sm text-muted-foreground capitalize">
              {application.status.replace('_', ' ')}
            </p>
          </div>
          
          <div>
            <label className="text-sm font-medium">New Status</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger data-testid={`select-new-status-${application.id}`}>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="shortlisted">Shortlisted</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="offer">Offer</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Reviewer Notes</label>
            <Textarea 
              placeholder="Add reviewer notes (optional)..."
              value={reviewerNotes}
              onChange={(e) => setReviewerNotes(e.target.value)}
              data-testid={`textarea-reviewer-notes-${application.id}`}
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleStatusUpdate}
              disabled={updateStatus.isPending}
              data-testid={`button-update-status-${application.id}`}
            >
              {updateStatus.isPending ? "Updating..." : "Update Status"}
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
        title: "Application Updated!",
        description: "Application status has been updated successfully.",
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
        title: "Error",
        description: "Failed to update application. Please try again.",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Applications</p>
                <p className="text-2xl font-bold" data-testid="metric-applications">{metrics.totalApplications}</p>
                <p className="text-xs text-green-400 mt-1">All time</p>
              </div>
              <FileText className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Acceptance Rate</p>
                <p className="text-2xl font-bold" data-testid="metric-acceptance-rate">{metrics.acceptanceRate}%</p>
                <p className="text-xs text-accent mt-1">Of all applications</p>
              </div>
              <UserCheck className="w-8 h-8 text-accent opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                <p className="text-2xl font-bold" data-testid="metric-projects">{metrics.totalProjects}</p>
                <p className="text-xs text-primary mt-1">Across {metrics.activeCohorts} cohorts</p>
              </div>
              <GraduationCap className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Cohorts</p>
                <p className="text-2xl font-bold" data-testid="metric-active-cohorts">{metrics.activeCohorts}</p>
                <p className="text-xs text-green-400 mt-1">{cohorts.length} in total</p>
              </div>
              <Calendar className="w-8 h-8 text-green-400 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Application Review and Cohort Management */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Applications */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Recent Applications</CardTitle>
              <Link href="/admin">
                <Button size="sm" data-testid="button-view-all-applications">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentApplications.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No applications yet.</p>
              )}
              {recentApplications.slice(0, 5).map((application) => (
                <Card key={application.id} className="bg-secondary/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm" data-testid={`application-name-${application.id}`}>
                          {application.applicant}
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">
                          {application.project}
                        </p>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={
                              application.status === 'interview' ? 'default' :
                              application.status === 'shortlisted' ? 'secondary' :
                              application.status === 'under_review' ? 'outline' :
                              'outline'
                            }
                            data-testid={`application-status-${application.id}`}
                          >
                            {application.status.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
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
          </CardContent>
        </Card>

        {/* Cohorts */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Cohorts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cohorts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No cohorts yet. Create one in the Admin Panel to open applications.
                </p>
              )}
              {cohorts.map((cohort, index) => (
                <div key={cohort.id} className="flex items-center justify-between" data-testid={`cohort-${index}`}>
                  <div>
                    <p className="font-medium text-sm" data-testid={`cohort-name-${index}`}>
                      {cohort.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCohortDate(cohort.startDate)} - {formatCohortDate(cohort.endDate)} • Capacity {cohort.capacity}
                    </p>
                  </div>
                  <Badge variant={cohort.isActive ? "default" : "secondary"}>
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
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
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
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              <span>System Alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {systemAlerts.length > 0 ? (
                systemAlerts.map((alert) => (
                  <Card 
                    key={alert.id} 
                    className={`${
                      alert.type === 'warning' ? 'bg-yellow-400/10 border-yellow-400/20' :
                      alert.type === 'error' ? 'bg-destructive/10 border-destructive/20' :
                      alert.type === 'success' ? 'bg-green-400/10 border-green-400/20' :
                      'bg-primary/10 border-primary/20'
                    }`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start space-x-2">
                        {alert.type === 'warning' && <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />}
                        {alert.type === 'error' && <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />}
                        {alert.type === 'success' && <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />}
                        {alert.type === 'info' && <Clock className="w-4 h-4 text-primary mt-0.5" />}
                        <div>
                          <p className="text-sm font-medium" data-testid={`alert-title-${alert.id}`}>
                            {alert.title}
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid={`alert-message-${alert.id}`}>
                            {alert.message}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="w-8 h-8 mx-auto text-green-400 mb-2" />
                  <p className="text-sm text-muted-foreground">Nothing needs attention right now</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
