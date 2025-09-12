import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

export default function AdminDashboard() {
  // Fetch admin metrics
  const { data: cohorts = [] } = useQuery({
    queryKey: ["/api/cohorts"],
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["/api/applications"],
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  // Mock admin metrics - in real app these would come from API
  const metrics = {
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
    { id: 1, name: "Sarah Johnson", project: "HealthAI Diagnostics", status: "under_review", submittedDays: 2 },
    { id: 2, name: "Michael Chen", project: "AgriTech Optimizer", status: "interview", submittedDays: 5 },
    { id: 3, name: "Emily Rodriguez", project: "FinTech Analytics", status: "shortlisted", submittedDays: 7 },
    { id: 4, name: "James Wilson", project: "EduAI Platform", status: "submitted", submittedDays: 1 },
  ];

  const cohortPerformance = [
    { name: "2024-Q1", participants: 12, completion: 92, avgReadiness: 78 },
    { name: "2024-Q2", participants: 15, completion: 87, avgReadiness: 71 },
    { name: "2024-Q3", participants: 18, completion: 94, avgReadiness: 82 },
  ];

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
                          {application.name}
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
                      <Button 
                        size="sm" 
                        variant="outline"
                        data-testid={`button-review-${application.id}`}
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
              <span>Alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Card className="bg-yellow-400/10 border-yellow-400/20">
                <CardContent className="p-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Review Deadline</p>
                      <p className="text-xs text-muted-foreground">
                        8 applications pending review for 2024-Q4 cohort
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-primary/10 border-primary/20">
                <CardContent className="p-3">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Demo Day Ready</p>
                      <p className="text-xs text-muted-foreground">
                        Q1 cohort completed all requirements
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-accent/10 border-accent/20">
                <CardContent className="p-3">
                  <div className="flex items-start space-x-2">
                    <Clock className="w-4 h-4 text-accent mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Mentor Scheduling</p>
                      <p className="text-xs text-muted-foreground">
                        3 participants need mentor assignments
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
