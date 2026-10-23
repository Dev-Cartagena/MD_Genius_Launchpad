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
import { cn, getApiErrorMessage } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { isAssignmentDone, type AssignmentStatus } from "@/lib/roadmapStatus";
import { ConnectorBadge, ProgressRing, StatusChip } from "@/components/brand";
import { isUnauthorizedError } from "@/lib/authUtils";
import { ObjectUploader, fileUrl, type UploadedFile } from "@/components/ObjectUploader";
import type { Project, Deliverable, Artifact, RoadmapItem, AssignedRoadmap, RoadmapTemplate, Application, Cohort } from "@shared/schema";

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
  Flag,
  File,
  FileImage,
  FileVideo
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
  { value: "validation", label: "Market validation", description: "Testing assumptions and validating market need" },
  { value: "mvp_build", label: "MVP development", description: "Building the minimum viable product" },
  { value: "pilot_traction", label: "Pilot and traction", description: "Testing with real users and gaining traction" },
  { value: "pitch_ready", label: "Pitch ready", description: "Ready for investor presentations" },
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

/** Display names for artifact types (the type strings themselves are stored data). */
const artifactTypeLabels: Record<string, string> = {
  "Pitch Deck": "Pitch deck",
  "One-Pager": "One-pager",
  "Demo Video": "Demo video",
  "Model Documentation": "Model documentation",
};

/** Lucide icon for a project file, from its extension or else its artifact type. */
function getFileIcon(artifactType: string, fileName?: string | null) {
  const ext = fileName?.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return FileImage;
  if (["mp4", "mov", "webm", "m4v", "avi"].includes(ext)) return FileVideo;
  if (["pdf", "doc", "docx", "ppt", "pptx", "key", "txt", "md"].includes(ext)) return FileText;
  if (fileName) return File;
  return artifactType === "Demo Video" ? FileVideo : FileText;
}

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

  // Accepted applications decide which cohorts the project may join
  const { data: myApplications = [] } = useQuery<Application[]>({
    queryKey: ["/api/applications/my"],
  });
  const { data: openCohorts = [] } = useQuery<Cohort[]>({
    queryKey: ["/api/cohorts"],
  });
  const acceptedCohortIds = Array.from(new Set(
    myApplications.filter((app) => app.status === "accepted").map((app) => app.cohortId),
  ));
  const cohortLabel = (id: string) => openCohorts.find((c) => c.id === id)?.name ?? "Your accepted cohort";
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");

  // Fetch deliverables for current project
  const currentProject = projects[0] || null;

  // Default the cohort picker to the project's cohort, or the only accepted cohort
  useEffect(() => {
    if (currentProject?.cohortId) {
      setSelectedCohortId(currentProject.cohortId);
    } else if (acceptedCohortIds.length === 1) {
      setSelectedCohortId(acceptedCohortIds[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.cohortId, acceptedCohortIds.join(",")]);
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
    mutationFn: async ({ assignmentId, status }: { assignmentId: string; status: AssignmentStatus }) => {
      return apiRequest('PATCH', `/api/roadmap/assignments/${assignmentId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'roadmap'] });
      toast({
        title: "Status updated",
        description: "The milestone has been updated.",
      });
    },
    onError: (error) => {
      console.error('Failed to update milestone status:', error);
      toast({
        title: "Could not update status",
        description: "The milestone was not updated. Please try again.",
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
      const response = await apiRequest("POST", "/api/projects", {
        ...data,
        ...(selectedCohortId ? { cohortId: selectedCohortId } : {}),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Project created",
        description: "Your project has been created.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/projects/my"] });
      // Joining a cohort can auto-assign the cohort's default roadmap
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Signed out",
          description: "Your session has ended. Taking you to sign in.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Could not create project",
        description: getApiErrorMessage(error, "The project was not created. Please try again."),
        variant: "destructive",
      });
    }
  });

  // Update project mutation
  const updateProject = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      if (!currentProject?.id) throw new Error("No project to update");
      const cohortChanged = !!selectedCohortId && selectedCohortId !== currentProject.cohortId;
      const response = await apiRequest("PUT", `/api/projects/${currentProject.id}`, {
        ...data,
        ...(cohortChanged ? { cohortId: selectedCohortId } : {}),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Project saved",
        description: "Your changes have been saved.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/projects/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Signed out",
          description: "Your session has ended. Taking you to sign in.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Could not save project",
        description: getApiErrorMessage(error, "Your changes were not saved. Please try again."),
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
        title: "File uploaded",
        description: `${artifactTypeLabels[artifactType] ?? artifactType} has been saved to your project.`,
      });
    } catch (error) {
      console.error('Failed to save artifact:', error);
      toast({
        title: "File not saved",
        description: "The file was uploaded but could not be added to your project. Please try again.",
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
    
    let newStatus: AssignmentStatus;
    if (currentStatus === 'not_started' || currentStatus === 'blocked') {
      newStatus = 'in_progress';
    } else if (currentStatus === 'in_progress') {
      newStatus = 'completed';
    } else {
      return; // Already done (completed or waived)
    }
    
    await updateRoadmapStatusMutation.mutateAsync({ assignmentId, status: newStatus });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
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
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-secondary text-primary flex items-center justify-center">
              <Lightbulb className="w-6 h-6" />
            </div>
            <h3 className="text-xl mb-2">No project yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your project to start working through the program.
            </p>
            <Button
              onClick={() => setIsEditing(true)}
              data-testid="button-create-project"
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              Create your project
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStageIndex = stageOptions.findIndex(s => s.value === currentProject?.stage);
  const stageState = (index: number): "done" | "current" | "upcoming" => {
    if (currentStageIndex < 0) return "upcoming";
    if (index < currentStageIndex) return "done";
    if (index === currentStageIndex) return "current";
    return "upcoming";
  };

  return (
    <div className="space-y-6">
      {/* Project Header */}
      {currentProject && !isEditing && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-12 h-12 shrink-0 bg-secondary text-primary rounded-lg flex items-center justify-center">
                  <Lightbulb className="w-6 h-6" />
                </div>
                <div className="min-w-0 space-y-2">
                  <CardTitle className="text-2xl break-words" data-testid="project-name">
                    {currentProject.name}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-secondary text-primary border-transparent"
                      data-testid="project-stage"
                    >
                      {stageOptions.find(s => s.value === currentProject.stage)?.label || currentProject.stage}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground" data-testid="project-summary">
                    {currentProject.summary}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                <ProgressRing
                  value={currentProject.readinessScore || 0}
                  size={104}
                  caption="Readiness"
                />
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  data-testid="button-edit-project"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit project
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Lifecycle stages as connected blocks */}
            <div className="border-t border-border pt-6">
              <h3 className="font-display text-sm text-muted-foreground mb-4">Project lifecycle</h3>
              <ol className="grid gap-4 lg:grid-cols-5 lg:gap-0">
                {stageOptions.map((stage, index) => {
                  const state = stageState(index);
                  return (
                    <li key={stage.value} className="relative flex gap-3 lg:flex-col lg:pr-4">
                      {index < stageOptions.length - 1 && (
                        <span
                          aria-hidden="true"
                          className="absolute left-[17px] top-10 -bottom-3 w-px bg-primary/20 lg:left-12 lg:right-2 lg:top-[18px] lg:bottom-auto lg:h-px lg:w-auto"
                        />
                      )}
                      <ConnectorBadge state={state}>{index + 1}</ConnectorBadge>
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "font-display text-sm font-medium",
                            state === "upcoming" ? "text-muted-foreground" : "text-foreground",
                          )}
                        >
                          {stage.label}
                          <span className="sr-only">
                            {state === "done" ? " (completed)" : state === "current" ? " (current stage)" : " (upcoming)"}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">{stage.description}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Form */}
      {isEditing && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {currentProject ? "Edit project" : "Create your project"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
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
                      <FormLabel>Project summary</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder="Brief overview of your AI startup project..."
                          className="min-h-[100px]"
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
                        <FormLabel>Problem statement</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field}
                            placeholder="What specific problem does your project solve?"
                            className="min-h-[120px]"
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
                        <FormLabel>Solution approach</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field}
                            placeholder="How does your AI solution address this problem?"
                            className="min-h-[120px]"
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
                      <FormLabel>Target market</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder="Who is your target customer and what is the market size?"
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
                      <FormLabel>AI components</FormLabel>
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
                        <FormLabel>Data requirements</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field}
                            placeholder="What data do you need for your AI solution?"
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
                        <FormLabel>Ethics and considerations</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field}
                            placeholder="What ethical considerations and responsible AI practices will you implement?"
                            data-testid="textarea-ethics"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {acceptedCohortIds.length > 0 && (
                  <div className="space-y-2">
                    <label className="font-display text-sm font-medium">Cohort</label>
                    <Select value={selectedCohortId} onValueChange={setSelectedCohortId}>
                      <SelectTrigger data-testid="select-project-cohort">
                        <SelectValue placeholder="Pick the cohort this project belongs to" />
                      </SelectTrigger>
                      <SelectContent>
                        {acceptedCohortIds.map((id) => (
                          <SelectItem key={id} value={id}>{cohortLabel(id)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Your cohort's roadmap is assigned to the project automatically.
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button 
                    type="submit" 
                    disabled={createProject.isPending || updateProject.isPending}
                    data-testid="button-save-project"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {createProject.isPending || updateProject.isPending ? "Saving..." : "Save project"}
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <span>Problem and solution</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-display text-sm text-muted-foreground mb-1">Problem statement</h4>
                <p className="text-sm text-foreground" data-testid="display-problem">
                  {currentProject.problem || "Not specified"}
                </p>
              </div>
              <div>
                <h4 className="font-display text-sm text-muted-foreground mb-1">Solution approach</h4>
                <p className="text-sm text-foreground" data-testid="display-solution">
                  {currentProject.solution || "Not specified"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Market & AI Components */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span>Market and technology</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-display text-sm text-muted-foreground mb-1">Target market</h4>
                <p className="text-sm text-foreground" data-testid="display-market">
                  {currentProject.market || "Not specified"}
                </p>
              </div>
              <div>
                <h4 className="font-display text-sm text-muted-foreground mb-2">AI components</h4>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span>Data and ethics</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-display text-sm text-muted-foreground mb-1">Data requirements</h4>
                <p className="text-sm text-foreground" data-testid="display-data-needs">
                  {currentProject.dataNeeds || "Not specified"}
                </p>
              </div>
              <div>
                <h4 className="font-display text-sm text-muted-foreground mb-1">Ethics and considerations</h4>
                <p className="text-sm text-foreground" data-testid="display-ethics">
                  {currentProject.ethics || "Not specified"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Project Artifacts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span>Project files</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {["Pitch Deck", "One-Pager", "Demo Video", "Model Documentation"].map((artifactType) => {
                  const latest = artifacts
                    .filter(a => a.type === artifactType && !!a.fileRef)
                    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0];
                  const FileIcon = getFileIcon(artifactType, latest?.title);
                  return (
                  <div key={artifactType} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="w-9 h-9 shrink-0 rounded-lg bg-secondary text-primary flex items-center justify-center">
                      <FileIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{artifactTypeLabels[artifactType] ?? artifactType}</p>
                      {latest ? (
                        <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                          <a
                            href={fileUrl(latest.fileRef!)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:underline truncate"
                            data-testid={`link-artifact-${artifactType.toLowerCase().replace(/ /g, '-')}`}
                          >
                            {latest.title}
                          </a>
                          {latest.createdAt && (
                            <span className="shrink-0">· {new Date(latest.createdAt).toLocaleDateString()}</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Not uploaded yet</p>
                      )}
                    </div>
                      <Dialog
                        open={openUploadDialog === artifactType}
                        onOpenChange={(open) => setOpenUploadDialog(open ? artifactType : null)}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="shrink-0" data-testid={`button-upload-${artifactType.toLowerCase().replace(/ /g, '-')}`}>
                            <Upload className="w-3 h-3 mr-1" />
                            {artifacts.some(a => a.type === artifactType) ? "Replace" : "Upload"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Upload {(artifactTypeLabels[artifactType] ?? artifactType).toLowerCase()}</DialogTitle>
                          </DialogHeader>
                          <ObjectUploader
                            maxFileSize={10 * 1024 * 1024}
                            onUploaded={(file) => handleUploadComplete(file, artifactType)}
                            buttonClassName="w-full sm:w-auto"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Select file
                          </ObjectUploader>
                        </DialogContent>
                      </Dialog>
                  </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Deliverables & Milestones */}
      {currentProject && !isEditing && deliverables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span>Deliverables</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {deliverables.map((deliverable: any) => (
                <div key={deliverable.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className={cn(
                    "w-8 h-8 shrink-0 rounded-lg flex items-center justify-center",
                    deliverable.status === 'approved' ? 'bg-success/10 text-success' :
                    deliverable.status === 'submitted' ? 'bg-secondary text-accent' :
                    deliverable.status === 'needs_revision' ? 'bg-warning/10 text-warning' :
                    'border border-dashed border-steel/50 text-muted-foreground'
                  )}>
                    {deliverable.status === 'approved' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : deliverable.status === 'submitted' ? (
                      <Clock className="w-4 h-4" />
                    ) : deliverable.status === 'needs_revision' ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm" data-testid={`deliverable-title-${deliverable.id}`}>
                      {deliverable.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Status: {deliverable.status?.replace('_', ' ')}
                      {deliverable.submittedAt && ` · Submitted ${new Date(deliverable.submittedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Roadmap Milestones */}
      {currentProject && !isEditing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              <span>Roadmap milestones</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {roadmapLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse p-3 bg-muted/50 rounded-lg">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : getRoadmapMilestones().length === 0 ? (
              <div className="text-center py-8">
                <Flag className="w-10 h-10 mx-auto text-primary mb-4" />
                {roadmap && roadmap.items.length > 0 ? (
                  <>
                    <p className="text-muted-foreground" data-testid="text-no-milestone-items">
                      Your roadmap has no milestone items.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      This section lists only milestone-type items. Your roadmap
                      {roadmap.template?.name ? ` "${roadmap.template.name}"` : ""} has{" "}
                      {roadmap.items.length} {roadmap.items.length === 1 ? "item" : "items"}.
                    </p>
                    <Button asChild size="sm" variant="outline" className="mt-4">
                      <Link href="/roadmap" data-testid="link-full-roadmap">View full roadmap</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">No roadmap is assigned to this project yet.</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Milestones will appear here once a roadmap is assigned to your project.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <ol className="relative space-y-4 before:absolute before:left-[17px] before:top-4 before:bottom-4 before:w-px before:bg-primary/20 before:content-['']">
                {getRoadmapMilestones().map((milestone: RoadmapItemWithAssignment, index: number) => (
                  <li key={milestone.id} className="relative flex gap-3 sm:gap-4">
                    <ConnectorBadge
                      state={
                        isAssignmentDone(milestone.assignment?.status)
                          ? "done"
                          : milestone.assignment?.status === 'in_progress'
                          ? "current"
                          : "upcoming"
                      }
                    >
                      {index + 1}
                    </ConnectorBadge>
                    <div className="flex min-w-0 flex-1 flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <h4 className="font-medium text-base mb-1" data-testid={`milestone-title-${milestone.id}`}>
                          {milestone.title}
                        </h4>
                        {milestone.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {milestone.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-xs"
                            data-testid={`milestone-week-${milestone.id}`}
                          >
                            Week {milestone.week}
                          </Badge>
                          <span data-testid={`milestone-status-${milestone.id}`}>
                            <StatusChip status={milestone.assignment?.status} />
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {milestone.assignment ? (
                          !isAssignmentDone(milestone.assignment.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updateRoadmapStatusMutation.isPending}
                              onClick={() => milestone.assignment?.id && milestone.assignment.status && handleMilestoneStatusUpdate(milestone.assignment.id, milestone.assignment.status)}
                              data-testid={`button-milestone-${milestone.assignment.status}-${milestone.id}`}
                            >
                              {milestone.assignment.status !== 'in_progress' ? (
                                updateRoadmapStatusMutation.isPending ? 'Starting...' : 'Start'
                              ) : (
                                updateRoadmapStatusMutation.isPending ? 'Completing...' : 'Complete'
                              )}
                            </Button>
                          )
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Not assigned
                          </Badge>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
