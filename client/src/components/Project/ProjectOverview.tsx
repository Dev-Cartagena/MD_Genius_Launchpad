import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useLocalized } from "@/lib/localized";
import { intlLocale } from "@/i18n";
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

function makeProjectSchema(t: TFunction<["project", "common"]>) {
  return z.object({
    name: z.string().min(3, t("form.errors.name", { count: 3 })),
    summary: z.string().min(50, t("form.errors.summary", { count: 50 })),
    problem: z.string().min(50, t("form.errors.problem", { count: 50 })),
    solution: z.string().min(50, t("form.errors.solution", { count: 50 })),
    market: z.string().min(30, t("form.errors.market", { count: 30 })),
    aiComponents: z.array(z.string()).min(1, t("form.errors.aiComponents")),
    dataNeeds: z.string().min(30, t("form.errors.dataNeeds", { count: 30 })),
    risks: z.array(z.string()),
    ethics: z.string().min(30, t("form.errors.ethics", { count: 30 })),
  });
}

type ProjectFormData = z.infer<ReturnType<typeof makeProjectSchema>>;

/** Stored stage values, in lifecycle order. Labels come from common:projectStage. */
const STAGES = ["ideation", "validation", "mvp_build", "pilot_traction", "pitch_ready"] as const;
type Stage = (typeof STAGES)[number];

/** Stored AI component values (shown through project:aiComponents.<slug>). */
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

/** Stable slug for a stored value, e.g. "Pitch Deck" -> "pitchDeck", "AI Agents/Chatbots" -> "aiAgentsChatbots". */
function slugKey(value: string): string {
  const words = value.split(/[^A-Za-z0-9]+/).filter(Boolean);
  return words
    .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join("");
}

const ARTIFACT_TYPES = ["Pitch Deck", "One-Pager", "Demo Video", "Model Documentation"] as const;
const ARTIFACT_TYPE_KEYS = ["pitchDeck", "onePager", "demoVideo", "modelDocumentation"] as const;
type ArtifactTypeKey = (typeof ARTIFACT_TYPE_KEYS)[number];

const AI_COMPONENT_KEYS = [
  "machineLearningModels", "naturalLanguageProcessing", "computerVision", "aiAgentsChatbots",
  "predictiveAnalytics", "recommendationSystems", "generativeAi", "reinforcementLearning",
  "speechRecognition", "dataMining",
] as const;
type AiComponentKey = (typeof AI_COMPONENT_KEYS)[number];

/** Display name for an artifact type (the type strings themselves are stored data). */
function artifactTypeLabel(type: string, t: TFunction<["project", "common"]>): string {
  const key = slugKey(type);
  return (ARTIFACT_TYPE_KEYS as readonly string[]).includes(key) ? t(`artifactTypes.${key as ArtifactTypeKey}`) : type;
}

/** Display name for a stored AI component value; unknown values are shown as stored. */
function aiComponentLabel(component: string, t: TFunction<["project", "common"]>): string {
  const key = slugKey(component);
  return (AI_COMPONENT_KEYS as readonly string[]).includes(key) ? t(`aiComponents.${key as AiComponentKey}`) : component;
}

/** Stored deliverable statuses with a label; others are shown as stored. */
const DELIVERABLE_STATUSES = ["not_started", "in_progress", "submitted", "needs_revision", "approved"] as const;
type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number];

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
  const { t } = useTranslation(["project", "common"]);
  const localized = useLocalized();
  const projectSchema = useMemo(() => makeProjectSchema(t), [t]);

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
  const cohortLabel = (id: string) => {
    const cohort = openCohorts.find((c) => c.id === id);
    return cohort ? localized.text(cohort, "name") : t("form.cohort.fallback");
  };
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
        title: t("toast.milestoneUpdated.title"),
        description: t("toast.milestoneUpdated.description"),
      });
    },
    onError: (error) => {
      console.error('Failed to update milestone status:', error);
      toast({
        title: t("toast.milestoneFailed.title"),
        description: t("toast.milestoneFailed.description"),
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
        title: t("toast.created.title"),
        description: t("toast.created.description"),
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/projects/my"] });
      // Joining a cohort can auto-assign the cohort's default roadmap
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t("toast.signedOut.title"),
          description: t("toast.signedOut.description"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: t("toast.createFailed.title"),
        description: getApiErrorMessage(error, t("toast.createFailed.description")),
        variant: "destructive",
      });
    }
  });

  // Update project mutation
  const updateProject = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      if (!currentProject?.id) throw new Error(t("toast.saveFailed.noProject"));
      const cohortChanged = !!selectedCohortId && selectedCohortId !== currentProject.cohortId;
      const response = await apiRequest("PUT", `/api/projects/${currentProject.id}`, {
        ...data,
        ...(cohortChanged ? { cohortId: selectedCohortId } : {}),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("toast.saved.title"),
        description: t("toast.saved.description"),
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/projects/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t("toast.signedOut.title"),
          description: t("toast.signedOut.description"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: t("toast.saveFailed.title"),
        description: getApiErrorMessage(error, t("toast.saveFailed.description")),
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
        title: t("toast.uploaded.title"),
        description: t("toast.uploaded.description", { type: artifactTypeLabel(artifactType, t) }),
      });
    } catch (error) {
      console.error('Failed to save artifact:', error);
      toast({
        title: t("toast.uploadSaveFailed.title"),
        description: t("toast.uploadSaveFailed.description"),
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
            <h3 className="text-xl mb-2">{t("empty.title")}</h3>
            <p className="text-muted-foreground mb-6">
              {t("empty.body")}
            </p>
            <Button
              onClick={() => setIsEditing(true)}
              data-testid="button-create-project"
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              {t("empty.create")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stageLabel = (stage: string) =>
    (STAGES as readonly string[]).includes(stage) ? t(`common:projectStage.${stage as Stage}`) : stage;
  const currentStageIndex = STAGES.findIndex(s => s === currentProject?.stage);
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
                      {currentProject.stage ? stageLabel(currentProject.stage) : currentProject.stage}
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
                  caption={t("header.readiness")}
                />
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  data-testid="button-edit-project"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {t("header.edit")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Lifecycle stages as connected blocks */}
            <div className="border-t border-border pt-6">
              <h3 className="font-display text-sm text-muted-foreground mb-4">{t("lifecycle.title")}</h3>
              <ol className="grid gap-4 lg:grid-cols-5 lg:gap-0">
                {STAGES.map((stage, index) => {
                  const state = stageState(index);
                  return (
                    <li key={stage} className="relative flex gap-3 lg:flex-col lg:pr-4">
                      {index < STAGES.length - 1 && (
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
                          {t(`common:projectStage.${stage}`)}
                          <span className="sr-only">
                            {" "}
                            {state === "done" ? t("lifecycle.state.done") : state === "current" ? t("lifecycle.state.current") : t("lifecycle.state.upcoming")}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">{t(`lifecycle.descriptions.${stage}`)}</p>
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
                  {currentProject ? t("form.titleEdit") : t("form.titleCreate")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fields.name")}</FormLabel>
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
                      <FormLabel>{t("fields.summary")}</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder={t("form.placeholders.summary")}
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
                        <FormLabel>{t("fields.problem")}</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field}
                            placeholder={t("form.placeholders.problem")}
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
                        <FormLabel>{t("fields.solution")}</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field}
                            placeholder={t("form.placeholders.solution")}
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
                      <FormLabel>{t("fields.market")}</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder={t("form.placeholders.market")}
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
                      <FormLabel>{t("fields.aiComponents")}</FormLabel>
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
                              {aiComponentLabel(component, t)}
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
                        <FormLabel>{t("fields.dataNeeds")}</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field}
                            placeholder={t("form.placeholders.dataNeeds")}
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
                        <FormLabel>{t("fields.ethics")}</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field}
                            placeholder={t("form.placeholders.ethics")}
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
                    <label className="font-display text-sm font-medium">{t("form.cohort.label")}</label>
                    <Select value={selectedCohortId} onValueChange={setSelectedCohortId}>
                      <SelectTrigger data-testid="select-project-cohort">
                        <SelectValue placeholder={t("form.cohort.placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {acceptedCohortIds.map((id) => (
                          <SelectItem key={id} value={id}>{cohortLabel(id)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {t("form.cohort.hint")}
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
                    {createProject.isPending || updateProject.isPending ? t("form.saving") : t("form.save")}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditing(false)}
                    data-testid="button-cancel-edit"
                  >
                    {t("common:actions.cancel")}
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
                <span>{t("details.problemSolution")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-display text-sm text-muted-foreground mb-1">{t("fields.problem")}</h4>
                <p className="text-sm text-foreground" data-testid="display-problem">
                  {currentProject.problem || t("details.notSpecified")}
                </p>
              </div>
              <div>
                <h4 className="font-display text-sm text-muted-foreground mb-1">{t("fields.solution")}</h4>
                <p className="text-sm text-foreground" data-testid="display-solution">
                  {currentProject.solution || t("details.notSpecified")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Market & AI Components */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span>{t("details.marketTech")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-display text-sm text-muted-foreground mb-1">{t("fields.market")}</h4>
                <p className="text-sm text-foreground" data-testid="display-market">
                  {currentProject.market || t("details.notSpecified")}
                </p>
              </div>
              <div>
                <h4 className="font-display text-sm text-muted-foreground mb-2">{t("fields.aiComponents")}</h4>
                <div className="flex flex-wrap gap-1">
                  {currentProject.aiComponents?.map((component: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {aiComponentLabel(component, t)}
                    </Badge>
                  )) || <span className="text-sm text-muted-foreground">{t("details.noneSpecified")}</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data & Ethics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span>{t("details.dataEthics")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-display text-sm text-muted-foreground mb-1">{t("fields.dataNeeds")}</h4>
                <p className="text-sm text-foreground" data-testid="display-data-needs">
                  {currentProject.dataNeeds || t("details.notSpecified")}
                </p>
              </div>
              <div>
                <h4 className="font-display text-sm text-muted-foreground mb-1">{t("fields.ethics")}</h4>
                <p className="text-sm text-foreground" data-testid="display-ethics">
                  {currentProject.ethics || t("details.notSpecified")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Project Artifacts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span>{t("files.title")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {ARTIFACT_TYPES.map((artifactType) => {
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
                      <p className="text-sm font-medium">{artifactTypeLabel(artifactType, t)}</p>
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
                            <span className="shrink-0">· {new Date(latest.createdAt).toLocaleDateString(intlLocale())}</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">{t("files.notUploaded")}</p>
                      )}
                    </div>
                      <Dialog
                        open={openUploadDialog === artifactType}
                        onOpenChange={(open) => setOpenUploadDialog(open ? artifactType : null)}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="shrink-0" data-testid={`button-upload-${artifactType.toLowerCase().replace(/ /g, '-')}`}>
                            <Upload className="w-3 h-3 mr-1" />
                            {artifacts.some(a => a.type === artifactType) ? t("common:actions.replace") : t("common:actions.upload")}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t("files.uploadTitle", { type: artifactTypeLabel(artifactType, t).toLowerCase() })}</DialogTitle>
                          </DialogHeader>
                          <ObjectUploader
                            maxFileSize={10 * 1024 * 1024}
                            onUploaded={(file) => handleUploadComplete(file, artifactType)}
                            buttonClassName="w-full sm:w-auto"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {t("files.selectFile")}
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
              <span>{t("deliverables.title")}</span>
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
                      {t("deliverables.status", {
                        status: (DELIVERABLE_STATUSES as readonly string[]).includes(deliverable.status)
                          ? t(`deliverables.statuses.${deliverable.status as DeliverableStatus}`)
                          : deliverable.status?.replace('_', ' ') ?? "",
                      })}
                      {deliverable.submittedAt && ` · ${t("deliverables.submitted", { date: new Date(deliverable.submittedAt).toLocaleDateString(intlLocale()) })}`}
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
              <span>{t("milestones.title")}</span>
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
                      {t("milestones.noneInRoadmap")}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {roadmap.template?.name
                        ? t("milestones.onlyMilestonesNamed", { name: localized.text(roadmap.template, "name"), count: roadmap.items.length })
                        : t("milestones.onlyMilestones", { count: roadmap.items.length })}
                    </p>
                    <Button asChild size="sm" variant="outline" className="mt-4">
                      <Link href="/roadmap" data-testid="link-full-roadmap">{t("milestones.viewRoadmap")}</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">{t("milestones.noRoadmap")}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {t("milestones.noRoadmapHint")}
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
                          {localized.text(milestone, "title")}
                        </h4>
                        {milestone.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {localized.text(milestone, "description")}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-xs"
                            data-testid={`milestone-week-${milestone.id}`}
                          >
                            {t("common:week", { week: milestone.week })}
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
                                updateRoadmapStatusMutation.isPending ? t("milestones.starting") : t("milestones.start")
                              ) : (
                                updateRoadmapStatusMutation.isPending ? t("milestones.completing") : t("milestones.complete")
                              )}
                            </Button>
                          )
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {t("milestones.notAssigned")}
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
