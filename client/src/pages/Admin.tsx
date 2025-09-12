import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/Layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Users,
  FileText,
  Settings,
  TrendingUp,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  BarChart3,
  UserCheck,
  GraduationCap,
  Filter,
  Download,
  Plus,
  Edit,
  Trash2,
  Eye,
  Mail,
  Shield
} from "lucide-react";

const cohortSchema = z.object({
  name: z.string().min(3, "Cohort name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  capacity: z.number().min(1, "Capacity must be at least 1"),
});

type CohortFormData = z.infer<typeof cohortSchema>;

export default function Admin() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedApplicationStatus, setSelectedApplicationStatus] = useState("all");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check admin access
  if (user?.role !== "administrator") {
    return (
      <AppLayout title="Admin Panel" subtitle="Access denied">
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              You don't have administrator privileges to access this page.
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  // Fetch admin data
  const { data: applications = [], isLoading: applicationsLoading } = useQuery({
    queryKey: ["/api/admin/applications"],
  });

  const { data: cohorts = [], isLoading: cohortsLoading } = useQuery<any[]>({
    queryKey: ["/api/cohorts"],
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/admin/projects"],
  });

  // Mock admin metrics and data
  const adminMetrics = {
    totalApplications: 156,
    acceptanceRate: 12,
    activeCohorts: 2,
    totalProjects: 24,
    mentorUtilization: 87,
    averageReadiness: 68,
    fundingDisbursed: 125000,
    completionRate: 92
  };

  const recentApplications = [
    { 
      id: "1", 
      applicant: "Sarah Johnson", 
      project: "HealthAI Diagnostics", 
      status: "under_review", 
      submittedDays: 2,
      score: 85 
    },
    { 
      id: "2", 
      applicant: "Michael Chen", 
      project: "AgriTech Optimizer", 
      status: "interview", 
      submittedDays: 5,
      score: 92 
    },
    { 
      id: "3", 
      applicant: "Emily Rodriguez", 
      project: "FinTech Analytics", 
      status: "shortlisted", 
      submittedDays: 7,
      score: 78 
    },
  ];

  const systemAlerts = [
    {
      id: "1",
      type: "warning",
      title: "Review Deadline Approaching",
      message: "8 applications pending review for Q4 cohort",
      priority: "high"
    },
    {
      id: "2", 
      type: "success",
      title: "Demo Day Completed",
      message: "Q3 cohort successfully completed Demo Day with 92% attendance",
      priority: "low"
    },
    {
      id: "3",
      type: "info",
      title: "Mentor Capacity",
      message: "3 participants need mentor assignments",
      priority: "medium"
    }
  ];

  // Form for creating cohorts
  const cohortForm = useForm<CohortFormData>({
    resolver: zodResolver(cohortSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      capacity: 15,
    },
  });

  // Create cohort mutation
  const createCohort = useMutation({
    mutationFn: async (data: CohortFormData) => {
      const response = await apiRequest("POST", "/api/admin/cohorts", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cohort Created!",
        description: "New cohort has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cohorts"] });
      cohortForm.reset();
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
        description: "Failed to create cohort. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update application status mutation
  const updateApplicationStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const response = await apiRequest("PUT", `/api/applications/${id}/status`, {
        status,
        reviewerNotes: notes
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

  const filteredApplications = recentApplications.filter(app => 
    selectedApplicationStatus === "all" || app.status === selectedApplicationStatus
  );

  return (
    <AppLayout 
      title="Admin Panel" 
      subtitle="Manage the MD Genius AI Launchpad platform"
    >
      <div className="space-y-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="applications" data-testid="tab-applications">Applications</TabsTrigger>
            <TabsTrigger value="cohorts" data-testid="tab-cohorts">Cohorts</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Applications</p>
                      <p className="text-2xl font-bold" data-testid="metric-total-applications">
                        {adminMetrics.totalApplications}
                      </p>
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
                      <p className="text-2xl font-bold" data-testid="metric-acceptance-rate">
                        {adminMetrics.acceptanceRate}%
                      </p>
                      <p className="text-xs text-accent mt-1">Highly selective</p>
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
                      <p className="text-2xl font-bold" data-testid="metric-active-projects">
                        {adminMetrics.totalProjects}
                      </p>
                      <p className="text-xs text-primary mt-1">Across {adminMetrics.activeCohorts} cohorts</p>
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
                      <p className="text-2xl font-bold" data-testid="metric-funding-disbursed">
                        ${(adminMetrics.fundingDisbursed / 1000).toFixed(0)}K
                      </p>
                      <p className="text-xs text-green-400 mt-1">85% utilization</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-400 opacity-80" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Applications and System Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Recent Applications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentApplications.map((application) => (
                      <Card key={application.id} className="bg-secondary/30">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm" data-testid={`application-name-${application.id}`}>
                                {application.applicant}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {application.project} • Score: {application.score}%
                              </p>
                              <Badge 
                                variant={
                                  application.status === 'interview' ? 'default' :
                                  application.status === 'shortlisted' ? 'secondary' :
                                  'outline'
                                }
                                className="mt-1"
                                data-testid={`application-status-${application.id}`}
                              >
                                {application.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              data-testid={`button-review-application-${application.id}`}
                            >
                              Review
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>System Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {systemAlerts.map((alert) => (
                      <Card 
                        key={alert.id} 
                        className={`${
                          alert.type === 'warning' ? 'bg-yellow-400/10 border-yellow-400/20' :
                          alert.type === 'success' ? 'bg-green-400/10 border-green-400/20' :
                          'bg-primary/10 border-primary/20'
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-2">
                            {alert.type === 'warning' && <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />}
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
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Health */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>System Health & Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Mentor Utilization</span>
                      <span className="font-medium text-green-400">{adminMetrics.mentorUtilization}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-green-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${adminMetrics.mentorUtilization}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Platform Uptime</span>
                      <span className="font-medium text-green-400">99.9%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-green-400 h-2 rounded-full w-full"></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>AI Coach Availability</span>
                      <span className="font-medium text-green-400">100%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-green-400 h-2 rounded-full w-full"></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications" className="space-y-6">
            {/* Application Filters */}
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Select value={selectedApplicationStatus} onValueChange={setSelectedApplicationStatus}>
                      <SelectTrigger className="w-48" data-testid="select-application-status">
                        <SelectValue placeholder="Application Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Applications</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="shortlisted">Shortlisted</SelectItem>
                        <SelectItem value="interview">Interview</SelectItem>
                        <SelectItem value="offer">Offer</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button variant="outline" data-testid="button-export-applications">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {filteredApplications.length} applications
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Applications List */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Application Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredApplications.map((application) => (
                    <Card key={application.id} className="bg-secondary/30">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4">
                              <div>
                                <p className="font-medium" data-testid={`app-applicant-${application.id}`}>
                                  {application.applicant}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {application.project}
                                </p>
                              </div>
                              <Badge 
                                variant={
                                  application.status === 'interview' ? 'default' :
                                  application.status === 'shortlisted' ? 'secondary' :
                                  'outline'
                                }
                                data-testid={`app-status-${application.id}`}
                              >
                                {application.status.replace('_', ' ')}
                              </Badge>
                              <div className="text-sm text-muted-foreground">
                                Score: <span className="font-medium">{application.score}%</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              data-testid={`button-view-app-${application.id}`}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm"
                                  data-testid={`button-update-status-${application.id}`}
                                >
                                  Update Status
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Update Application Status</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Select>
                                    <SelectTrigger data-testid={`select-new-status-${application.id}`}>
                                      <SelectValue placeholder="Select new status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="shortlisted">Shortlisted</SelectItem>
                                      <SelectItem value="interview">Interview</SelectItem>
                                      <SelectItem value="offer">Offer</SelectItem>
                                      <SelectItem value="accepted">Accepted</SelectItem>
                                      <SelectItem value="rejected">Rejected</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  
                                  <Textarea 
                                    placeholder="Add reviewer notes (optional)..."
                                    data-testid={`textarea-reviewer-notes-${application.id}`}
                                  />
                                  
                                  <Button 
                                    className="w-full"
                                    onClick={() => updateApplicationStatus.mutate({
                                      id: application.id,
                                      status: "shortlisted",
                                      notes: "Updated via admin panel"
                                    })}
                                    disabled={updateApplicationStatus.isPending}
                                    data-testid={`button-confirm-status-${application.id}`}
                                  >
                                    {updateApplicationStatus.isPending ? "Updating..." : "Update Status"}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cohorts" className="space-y-6">
            {/* Create Cohort */}
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Cohort Management</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button data-testid="button-create-cohort">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Cohort
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Cohort</DialogTitle>
                      </DialogHeader>
                      <Form {...cohortForm}>
                        <form onSubmit={cohortForm.handleSubmit((data) => createCohort.mutate(data))} className="space-y-4">
                          <FormField
                            control={cohortForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cohort Name</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="e.g., 2025 Q1 Cohort"
                                    data-testid="input-cohort-name"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={cohortForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    {...field}
                                    placeholder="Describe the cohort focus and goals..."
                                    data-testid="textarea-cohort-description"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={cohortForm.control}
                              name="startDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Start Date</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      type="date"
                                      data-testid="input-cohort-start-date"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={cohortForm.control}
                              name="endDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>End Date</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      type="date"
                                      data-testid="input-cohort-end-date"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={cohortForm.control}
                            name="capacity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Capacity</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number"
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                    data-testid="input-cohort-capacity"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <Button 
                            type="submit" 
                            className="w-full"
                            disabled={createCohort.isPending}
                            data-testid="button-submit-cohort"
                          >
                            {createCohort.isPending ? "Creating..." : "Create Cohort"}
                          </Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cohorts.map((cohort: any) => (
                    <Card key={cohort.id} className="bg-secondary/30">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold" data-testid={`cohort-name-${cohort.id}`}>
                              {cohort.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {cohort.description}
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                              <span>
                                {new Date(cohort.startDate).toLocaleDateString()} - {new Date(cohort.endDate).toLocaleDateString()}
                              </span>
                              <span>Capacity: {cohort.capacity}</span>
                              <Badge variant={cohort.isActive ? "default" : "secondary"}>
                                {cohort.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              data-testid={`button-edit-cohort-${cohort.id}`}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              data-testid={`button-manage-cohort-${cohort.id}`}
                            >
                              Manage
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-6">
                  <Input 
                    placeholder="Search users..." 
                    className="max-w-sm"
                    data-testid="input-search-users"
                  />
                  <Button data-testid="button-invite-user">
                    <Plus className="w-4 h-4 mr-2" />
                    Invite User
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {['Alice Smith', 'Bob Johnson', 'Carol Davis'].map((name, index) => (
                    <Card key={index} className="bg-secondary/30">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-semibold">
                              {name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="font-medium" data-testid={`user-name-${index}`}>{name}</p>
                              <p className="text-sm text-muted-foreground">
                                {index === 0 ? 'Administrator' : index === 1 ? 'Mentor' : 'Participant'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              data-testid={`button-edit-user-${index}`}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              data-testid={`button-message-user-${index}`}
                            >
                              <Mail className="w-3 h-3 mr-1" />
                              Message
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-2">General Settings</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Application Window</p>
                          <p className="text-sm text-muted-foreground">Control when applications are accepted</p>
                        </div>
                        <Button variant="outline" data-testid="button-configure-applications">
                          Configure
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Email Templates</p>
                          <p className="text-sm text-muted-foreground">Manage automated email templates</p>
                        </div>
                        <Button variant="outline" data-testid="button-manage-emails">
                          Manage
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">AI Coach Settings</p>
                          <p className="text-sm text-muted-foreground">Configure AI Coach behavior and knowledge</p>
                        </div>
                        <Button variant="outline" data-testid="button-configure-ai">
                          Configure
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">System Maintenance</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Database Backup</p>
                          <p className="text-sm text-muted-foreground">Last backup: 2 hours ago</p>
                        </div>
                        <Button variant="outline" data-testid="button-backup-database">
                          Backup Now
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">System Logs</p>
                          <p className="text-sm text-muted-foreground">View and download system logs</p>
                        </div>
                        <Button variant="outline" data-testid="button-view-logs">
                          View Logs
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
