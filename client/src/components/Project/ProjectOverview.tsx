import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { ObjectUploader, fileUrl, type UploadedFile } from "@/components/ObjectUploader";
import type { Project, Deliverable, Artifact, RoadmapItem, AssignedRoadmap, RoadmapTemplate } from "@shared/schema";

// Extended types for roadmap milestone tracking
type RoadmapItemWithAssignment = RoadmapItem & {
  assignment: AssignedRoadmap | null;
};

type ProjectRoadmap = {
  template: RoadmapTemplate;
  items: RoadmapItemWithAssignment[];
};
import {
  Lightbulb,
  Users,
  Target,
  TrendingUp,
  FileText,
  Upload,
  Edit,
  Save,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Award,
  Play,
  Flag
} from "lucide-react";

const projectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  summary: z.string().min(50, "Summary must be at least 50 characters"),
  problem: z.string().min(50, "Problem description must be at least 50 characters"),
  solution: z.string().min(50, "Solution description must be at least 50 characters"),
  market: z.string().min(30, "Market description must be at least 30 characters"),
  aiComponents: z.array(z.string()).min(1, "Please specify at least one AI component"),
  dataNeeds: z.string().min(30, "Data needs must be at least 30 characters"),
  risks: z.array(z.string()),
  ethics: z.string().min(30, "Ethics considerations must be at least 30 characters"),
});

type ProjectFormData = z.infer<typeof projectSchema>;

const stageOptions = [
  { value: "ideation", label: "Ideation", description: "Exploring and refining the core idea" },
  { value: "validation", label: "Market Validation", description: "Testing assumptions and validating market need" },
  { value: "mvp_build", label: "MVP Development", description: "Building minimum viable product" },
  { value: "pilot_traction", label: "Pilot & Traction", description: "Testing with real users and gaining traction" },
  { value: "pitch_ready", label: "Pitch Ready", description: "Ready for investor presentations" },
];

const aiComponentOptions = [
  "Machine Learning Models",
  "Natural Language Processing",
  "Computer Vision",
  "AI Agents/Chatbots",
  "Predictive Analytics",
  "Recommendation Systems",
  "Generative AI",
  "Reinforcement Learning",
  "Speech Recognition",
  "Data Mining"
];

interface ProjectOverviewProps {
  projectId?: string;
}

export default function ProjectOverview({ projectId }: ProjectOverviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [openUploadDialog, setOpenUploadDialog] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's projects
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects/my"],
  });

  // Fetch deliverables for current project
  const currentProject = projects[0] || null;
  const { data: deliverables = [] } = useQuery<Deliverable[]>({
    queryKey: ["/api/projects", currentProject?.id, "deliverables"],
    enabled: !!currentProject?.id,
  });

  // Fetch uploaded artifacts for current project
  const { data: artifacts = [] } = useQuery<Artifact[]>({
    queryKey: ["/api/projects", currentProject?.id, "artifacts"],
    enabled: !!currentProject?.id,
  });

  // Fetch roadmap for current project (null when no roadmap is assigned yet)
  const { data: roadmap, isLoading: roadmapLoading } = useQuery<ProjectRoadmap | null>({
    queryKey: ['/api/projects', currentProject?.id, 'roadmap'],
    enabled: !!currentProject?.id,
  });

  // Mutation to update roadmap milestone status
  const updateRoadmapStatusMutation = useMutation({
    mutationFn: async ({ assignmentId, status }: { assignmentId: string; status: 'not_started' | 'in_progress' | 'completed' }) => {
      return apiRequest('PATCH', `/api/roadmap/assignments/${assignmentId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'roadmap'] });
      toast({
        title: "Status Updated",
        description: "Milestone status has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Failed to update milestone status:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update milestone status. Please try again.",
        variant: "destructive",
      });
    }
  });

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: currentProject?.name || "",
      summary: currentProject?.summary || "",
      problem: currentProject?.problem || "",
      solution: currentProject?.solution || "",
      market: currentProject?.market || "",
      aiComponents: currentProject?.aiComponents || [],
      dataNeeds: currentProject?.dataNeeds || "",
      risks: currentProject?.risks || [],
      ethics: currentProject?.ethics || "",
    },
  });

  // Default values are computed before the project loads, so reset once it arrives
  useEffect(() => {
    if (!currentProject) return;
    form.reset({
      name: currentProject.name || "",
      summary: currentProject.summary || "",
      problem: currentProject.problem || "",
      solution: currentProject.solution || "",
      market: currentProject.market || "",
      aiComponents: currentProject.aiComponents || [],
      dataNeeds: currentProject.dataNeeds || "",
      risks: currentProject.risks || [],
      ethics: currentProject.ethics || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.id, currentProject?.updatedAt]);

  // Create new project mutation
  const createProject = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const response = await apiRequest("POST", "/api/projects", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Project Created!",
        description: "Your project has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/my"] });
      setIsEditing(false);
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
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update project mutation
  const updateProject = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      if (!currentProject?.id) throw new Error("No project to update");
      const response = await apiRequest("PUT", `/api/projects/${currentProject.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Project Updated!",
        description: "Your project has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/my"] });
      setIsEditing(false);
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
        description: "Failed to update project. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleUploadComplete = async (file: UploadedFile, artifactType: string) => {
    if (!currentProject) return;
    try {
      await apiRequest('POST', `/api/projects/${currentProject.id}/artifacts`, {
        type: artifactType,
        title: file.fileName,
        fileRef: file.path,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject.id, 'artifacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject.id, 'deliverables'] });
      setOpenUploadDialog(null);

      toast({
        title: "Artifact uploaded successfully!",
        description: `${artifactType} has been uploaded and saved to your project.`,
      });
    } catch (error) {
      console.error('Failed to save artifact:', error);
      toast({
        title: "Upload successful, but save failed",
        description: "File was uploaded but couldn't be saved to the project. Please try again.",
        variant: "destructive"
      });
    }
  };

  const onSubmit = (data: ProjectFormData) => {
    if (currentProject) {
      updateProject.mutate(data);
    } else {
      createProject.mutate(data);
    }
  };

  // Helper functions for roadmap milestone tracking
  const getRoadmapMilestones = () => {
    if (!roadmap) return [];
    return roadmap.items.filter((item: RoadmapItemWithAssignment) => item.type === 'milestone');
  };

  const handleMilestoneStatusUpdate = async (assignmentId: string, currentStatus: string) => {
    if (!assignmentId) return;
    
    let newStatus: 'not_started' | 'in_progress' | 'completed';
    if (currentStatus === 'not_started') {
      newStatus = 'in_progress';
    } else if (currentStatus === 'in_progress') {
      newStatus = 'completed';
    } else {
      return; // Already completed
    }
    
    await updateRoadmapStatusMutation.mutateAsync({ assignmentId, status: newStatus });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="glass-card animate-pulse">
          <CardContent className="p-6">
            <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-muted rounded w-full mb-2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentProject && !isEditing) {
    return (
      <div className="space-y-6">
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <Lightbulb className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Project Yet</h3>
            <p className="text-muted-foreground mb-6">
              Start your entrepreneurial journey by creating your first project.
            </p>
            <Button 
              onClick={() => setIsEditing(true)} 
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
              data-testid="button-create-project"
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              Create Your Project
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Header */}
      {currentProject && !isEditing && (
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                  <Lightbulb className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl" data-testid="project-name">
                    {currentProject.name}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      className={`${
                        currentProject.stage === 'pitch_ready' ? 'bg-green-400/20 text-green-400' :
                        currentProject.stage === 'mvp_build' ? 'bg-primary/20 text-primary' :
                        currentProject.stage === 'validation' ? 'bg-accent/20 text-accent' :
                        'bg-yellow-400/20 text-yellow-400'
                      }`}
                      data-testid="project-stage"
                    >
                      {stageOptions.find(s => s.value === currentProject.stage)?.label || currentProject.stage}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Readiness Score: <span className="font-medium text-accent">{currentProject.readinessScore || 0}%</span>
                    </span>
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => setIsEditing(true)} 
                variant="outline"
                data-testid="button-edit-project"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Project
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground" data-testid="project-summary">
              {currentProject.summary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Project Form */}
      {isEditing && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>
                  {currentProject ? "Edit Project" : "Create New Project"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-secondary border-border input-glow"
                          data-testid="input-project-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="summary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Summary</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder="Brief overview of your AI startup project..."
                          className="bg-secondary border-border input-glow min-h-[100px]"
                          data-testid="textarea-project-summary"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="problem"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Problem Statement</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field}
                            placeholder="What specific problem does your project solve?"
                            className="bg-secondary border-border input-glow min-h-[120px]"
                            data-testid="textarea-problem-statement"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="solution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Solution Approach</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field}
                            placeholder="How does your AI solution address this problem?"
                            className="bg-secondary border-border input-glow min-h-[120px]"
                            data-testid="textarea-solution"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="market"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Market</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder="Who is your target customer and what is the market size?"
                          className="bg-secondary border-border input-glow"
                          data-testid="textarea-target-market"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="aiComponents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AI Components</FormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {aiComponentOptions.map((component) => (
                          <div key={component} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={component}
                              checked={field.value?.includes(component)}
                              onChange={(e) => {
                                const updatedComponents = e.target.checked
                                  ? [...(field.value || []), component]
                                  : field.value?.filter(c => c !== component) || [];
                                field.onChange(updatedComponents);
                              }}
                              className="rounded border-border"
                              data-testid={`checkbox-ai-${component.toLowerCase().replace(/\s+/g, '-')}`}
                            />
                            <label htmlFor={component} className="text-sm">
                              {component}
                            </label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="dataNeeds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Requirements</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field}
                            placeholder="What data do you need for your AI solution?"
                            className="bg-secondary border-border input-glow"
                            data-testid="textarea-data-needs"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ethics"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ethics & Considerations</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field}
                            placeholder="What ethical considerations and responsible AI practices will you implement?"
                            className="bg-secondary border-border input-glow"
                            data-testid="textarea-ethics"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex space-x-4">
                  <Button 
                    type="submit" 
                    disabled={createProject.isPending || updateProject.isPending}
                    className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
                    data-testid="button-save-project"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {createProject.isPending || updateProject.isPending ? "Saving..." : "Save Project"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditing(false)}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      )}

      {/* Project Details Grid */}
      {currentProject && !isEditing && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Problem & Solution */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-5 h-5" />
                <span>Problem & Solution</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">Problem Statement</h4>
                <p className="text-sm text-muted-foreground" data-testid="display-problem">
                  {currentProject.problem || "Not specified"}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Solution Approach</h4>
                <p className="text-sm text-muted-foreground" data-testid="display-solution">
                  {currentProject.solution || "Not specified"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Market & AI Components */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Market & Technology</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">Target Market</h4>
                <p className="text-sm text-muted-foreground" data-testid="display-market">
                  {currentProject.market || "Not specified"}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">AI Components</h4>
                <div className="flex flex-wrap gap-1">
                  {currentProject.aiComponents?.map((component: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {component}
                    </Badge>
                  )) || <span className="text-sm text-muted-foreground">None specified</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data & Ethics */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Data & Ethics</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">Data Requirements</h4>
                <p className="text-sm text-muted-foreground" data-testid="display-data-needs">
                  {currentProject.dataNeeds || "Not specified"}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Ethics & Considerations</h4>
                <p className="text-sm text-muted-foreground" data-testid="display-ethics">
                  {currentProject.ethics || "Not specified"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Project Artifacts */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Project Artifacts</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {["Pitch Deck", "One-Pager", "Demo Video", "Model Documentation"].map((artifactType) => (
                  <div key={artifactType} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{artifactType}</span>
                    <div className="flex items-center space-x-2">
                      {(() => {
                        const latest = artifacts
                          .filter(a => a.type === artifactType && !!a.fileRef)
                          .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0];
                        return latest ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <a
                              href={fileUrl(latest.fileRef!)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline max-w-[10rem] truncate"
                              data-testid={`link-artifact-${artifactType.toLowerCase().replace(/ /g, '-')}`}
                            >
                              {latest.title}
                            </a>
                          </>
                        ) : null;
                      })()}
                      <Dialog
                        open={openUploadDialog === artifactType}
                        onOpenChange={(open) => setOpenUploadDialog(open ? artifactType : null)}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" data-testid={`button-upload-${artifactType.toLowerCase().replace(/ /g, '-')}`}>
                            <Upload className="w-3 h-3 mr-1" />
                            {artifacts.some(a => a.type === artifactType) ? "Replace" : "Upload"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Upload {artifactType}</DialogTitle>
                          </DialogHeader>
                          <ObjectUploader
                            maxFileSize={10 * 1024 * 1024}
                            onUploaded={(file) => handleUploadComplete(file, artifactType)}
                            buttonClassName="w-full bg-primary hover:bg-primary/90"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Select {artifactType}
                          </ObjectUploader>
                          <p className="text-xs text-muted-foreground">Maximum file size: 10MB</p>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Deliverables & Milestones */}
      {currentProject && !isEditing && deliverables.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Deliverables & Milestones</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {deliverables.map((deliverable: any) => (
                <div key={deliverable.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      deliverable.status === 'approved' ? 'bg-green-400/20' :
                      deliverable.status === 'submitted' ? 'bg-primary/20' :
                      deliverable.status === 'needs_revision' ? 'bg-yellow-400/20' :
                      'bg-gray-400/20'
                    }`}>
                      {deliverable.status === 'approved' ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : deliverable.status === 'submitted' ? (
                        <Clock className="w-4 h-4 text-primary" />
                      ) : deliverable.status === 'needs_revision' ? (
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      ) : (
                        <span className="text-xs font-medium">•</span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm" data-testid={`deliverable-title-${deliverable.id}`}>
                        {deliverable.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Status: {deliverable.status?.replace('_', ' ')} 
                        {deliverable.submittedAt && ` • Submitted ${new Date(deliverable.submittedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" data-testid={`button-view-deliverable-${deliverable.id}`}>
                    View Details
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Roadmap Milestones */}
      {currentProject && !isEditing && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="w-5 h-5" />
              <span>Roadmap Milestones</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {roadmapLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse p-3 bg-secondary/30 rounded-lg">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : getRoadmapMilestones().length === 0 ? (
              <div className="text-center py-8">
                <Flag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No roadmap milestones available for this project.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Milestones will appear here once a roadmap template is assigned to your project.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {getRoadmapMilestones().map((milestone: RoadmapItemWithAssignment) => (
                  <div key={milestone.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        milestone.assignment?.status === 'completed' 
                          ? 'bg-green-400/20' 
                          : milestone.assignment?.status === 'in_progress'
                          ? 'bg-blue-400/20'
                          : 'bg-gray-400/20'
                      }`}>
                        {milestone.assignment?.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : milestone.assignment?.status === 'in_progress' ? (
                          <Play className="w-5 h-5 text-blue-400" />
                        ) : (
                          <Flag className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-base mb-1" data-testid={`milestone-title-${milestone.id}`}>
                          {milestone.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {milestone.description}
                        </p>
                        <div className="flex items-center space-x-4">
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                            data-testid={`milestone-week-${milestone.id}`}
                          >
                            Week {milestone.week}
                          </Badge>
                          <Badge 
                            variant={
                              milestone.assignment?.status === 'completed' ? 'default' :
                              milestone.assignment?.status === 'in_progress' ? 'secondary' :
                              'outline'
                            }
                            className="text-xs"
                            data-testid={`milestone-status-${milestone.id}`}
                          >
                            {milestone.assignment?.status === 'completed' ? 'Completed' :
                             milestone.assignment?.status === 'in_progress' ? 'In Progress' :
                             'Not Started'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {milestone.assignment ? (
                        milestone.assignment.status !== 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updateRoadmapStatusMutation.isPending}
                            onClick={() => milestone.assignment?.id && milestone.assignment.status && handleMilestoneStatusUpdate(milestone.assignment.id, milestone.assignment.status)}
                            data-testid={`button-milestone-${milestone.assignment.status}-${milestone.id}`}
                          >
                            {milestone.assignment.status === 'not_started' ? (
                              updateRoadmapStatusMutation.isPending ? 'Starting...' : 'Start'
                            ) : (
                              updateRoadmapStatusMutation.isPending ? 'Completing...' : 'Complete'
                            )}
                          </Button>
                        )
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Not Assigned
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
