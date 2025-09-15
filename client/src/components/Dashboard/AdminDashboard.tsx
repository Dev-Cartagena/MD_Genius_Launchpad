import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
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

  // Application Status Dialog Component
  const ApplicationStatusDialog = ({ application }: { application: ProcessedApplication }) => {
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

      updateApplicationStatus.mutate(
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
                disabled={updateApplicationStatus.isPending}
                data-testid={`button-update-status-${application.id}`}
              >
                {updateApplicationStatus.isPending ? "Updating..." : "Update Status"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Calculate cohort performance from real cohort data
  const cohortPerformance = cohorts.map((cohort) => ({
    name: cohort.name,
    participants: 0, // TODO: Calculate from participants assigned to cohort
    completion: 0, // TODO: Calculate from actual completion data
    avgReadiness: Math.round(metrics.averageReadiness) // Use calculated average for now
  }));

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
                <p className="text-xs text-green-400 mt-1">↑ 23% from last quarter</p>
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
                <p className="text-xs text-accent mt-1">Highly selective program</p>
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
                <p className="text-sm font-medium text-muted-foreground">Funding Disbursed</p>
                <p className="text-2xl font-bold" data-testid="metric-funding">${(metrics.fundingDisbursed / 1000).toFixed(0)}K</p>
                <p className="text-xs text-green-400 mt-1">85% utilization rate</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400 opacity-80" />
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
              <Button size="sm" data-testid="button-view-all-applications">View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentApplications.map((application) => (
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
                      <ApplicationStatusDialog application={application} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cohort Performance */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Cohort Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cohortPerformance.map((cohort, index) => (
                <div key={index} className="space-y-2" data-testid={`cohort-${index}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm" data-testid={`cohort-name-${index}`}>
                        {cohort.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cohort.participants} participants
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium" data-testid={`cohort-completion-${index}`}>
                        {cohort.completion}% completion
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Avg readiness: {cohort.avgReadiness}%
                      </p>
                    </div>
                  </div>
                  <Progress value={cohort.completion} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* System Health and Quick Actions */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>System Health</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Mentor Utilization</span>
                <span className="text-sm font-medium text-green-400" data-testid="mentor-utilization">
                  {metrics.mentorUtilization}%
                </span>
              </div>
              <Progress value={metrics.mentorUtilization} className="h-2" />
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Platform Uptime</span>
                <span className="text-sm font-medium text-green-400">99.9%</span>
              </div>
              <Progress value={99.9} className="h-2" />
              
              <div className="flex items-center justify-between">
                <span className="text-sm">AI Coach Availability</span>
                <span className="text-sm font-medium text-green-400">100%</span>
              </div>
              <Progress value={100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button 
                className="w-full justify-start" 
                variant="outline"
                data-testid="button-create-cohort"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Create New Cohort
              </Button>
              
              <Button 
                className="w-full justify-start" 
                variant="outline"
                data-testid="button-review-applications"
              >
                <FileText className="w-4 h-4 mr-2" />
                Review Applications
              </Button>
              
              <Button 
                className="w-full justify-start" 
                variant="outline"
                data-testid="button-manage-mentors"
              >
                <Users className="w-4 h-4 mr-2" />
                Manage Mentors
              </Button>
              
              <Button 
                className="w-full justify-start" 
                variant="outline"
                data-testid="button-funding-management"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Funding Management
              </Button>
              
              <Button 
                className="w-full justify-start" 
                variant="outline"
                data-testid="button-system-settings"
              >
                <Settings className="w-4 h-4 mr-2" />
                System Settings
              </Button>
            </div>
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
                  <p className="text-sm text-muted-foreground">All systems operating normally</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
