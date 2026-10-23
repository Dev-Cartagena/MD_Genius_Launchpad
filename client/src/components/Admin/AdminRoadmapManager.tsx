import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import ConfirmDialog, { type ConfirmRequest } from "@/components/ConfirmDialog";
import { apiRequest } from "@/lib/queryClient";
import { getApiErrorMessage } from "@/lib/utils";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { RoadmapTemplate, RoadmapItem, Cohort, Module, Lesson, Project } from "@shared/schema";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";

// Form handling
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Icons
import { Plus, Edit, Trash2, Eye, Calendar, Target, CheckCircle, Clock, Users, RotateCcw, Send } from "lucide-react";

// Sentinel values for "no selection" in Select components (Radix Select can't use "").
const ALL_COHORTS = "__all__";
const NONE = "__none__";

// Form schemas
const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().min(1, "Description is required"),
  cohortId: z.string(), // ALL_COHORTS = global template
  isDefault: z.boolean().default(false),
});

const autoCompletionTypes = ["none", "lesson", "module", "mentor_session"] as const;

const itemFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  type: z.enum(["task", "assignment", "deliverable", "milestone", "checkin", "learning"]),
  week: z.coerce.number().min(1, "Week must be at least 1"),
  orderIndex: z.coerce.number().min(0, "Order index must be 0 or greater"),
  isOptional: z.boolean().default(false),
  estimatedHours: z.coerce.number().min(1, "Estimated hours must be at least 1").optional(),
  moduleId: z.string(), // NONE = not linked
  lessonId: z.string(), // NONE = not linked
  autoCompletionType: z.enum(autoCompletionTypes),
  autoThreshold: z.coerce.number().min(1, "Threshold must be at least 1"),
}).superRefine((data, ctx) => {
  if (data.autoCompletionType === "lesson" && data.lessonId === NONE) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lessonId"], message: "Pick the lesson that completes this item" });
  }
  if (data.autoCompletionType === "module" && data.moduleId === NONE) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["moduleId"], message: "Pick the module that completes this item" });
  }
  if (data.autoCompletionType === "module" && data.autoThreshold > 100) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["autoThreshold"], message: "Percent must be 100 or less" });
  }
});

type TemplateFormData = z.infer<typeof templateFormSchema>;
type ItemFormData = z.infer<typeof itemFormSchema>;

interface TemplateWithItems extends RoadmapTemplate {
  items?: RoadmapItem[];
}

const emptyTemplateForm: TemplateFormData = {
  name: "",
  description: "",
  cohortId: ALL_COHORTS,
  isDefault: false,
};

const emptyItemForm: ItemFormData = {
  title: "",
  description: "",
  type: "task",
  week: 1,
  orderIndex: 0,
  isOptional: false,
  estimatedHours: 1,
  moduleId: NONE,
  lessonId: NONE,
  autoCompletionType: "none",
  autoThreshold: 100,
};

function templatePayload(data: TemplateFormData) {
  return {
    name: data.name,
    description: data.description,
    cohortId: data.cohortId === ALL_COHORTS ? null : data.cohortId,
    isDefault: data.isDefault,
  };
}

function itemPayload(data: ItemFormData) {
  return {
    title: data.title,
    description: data.description,
    type: data.type,
    week: data.week,
    orderIndex: data.orderIndex,
    isOptional: data.isOptional,
    estimatedHours: data.estimatedHours,
    moduleId: data.moduleId === NONE ? null : data.moduleId,
    lessonId: data.lessonId === NONE ? null : data.lessonId,
    autoCompletionType: data.autoCompletionType,
    autoThreshold: data.autoThreshold,
  };
}

function TemplateFormFields({ form, cohorts }: { form: UseFormReturn<TemplateFormData>; cohorts: Cohort[] }) {
  const cohortId = form.watch("cohortId");
  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Template Name</FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder="e.g., 8-Week AI Startup Accelerator"
                data-testid="input-template-name"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder="Describe the program structure and goals..."
                data-testid="textarea-template-description"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="cohortId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Cohort</FormLabel>
            <Select
              onValueChange={(value) => {
                field.onChange(value);
                if (value === ALL_COHORTS) form.setValue("isDefault", false);
              }}
              value={field.value}
            >
              <FormControl>
                <SelectTrigger data-testid="select-template-cohort">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value={ALL_COHORTS}>All cohorts</SelectItem>
                {cohorts.map((cohort) => (
                  <SelectItem key={cohort.id} value={cohort.id}>
                    {cohort.name}{cohort.isActive === false ? " (Inactive)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="isDefault"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5 pr-4">
              <FormLabel>Default for its cohort</FormLabel>
              <FormDescription>
                Assigned automatically to every project that joins this cohort.
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={cohortId === ALL_COHORTS}
                data-testid="switch-template-default"
              />
            </FormControl>
          </FormItem>
        )}
      />
    </>
  );
}

export default function AdminRoadmapManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RoadmapTemplate | null>(null);
  const [assigningTemplate, setAssigningTemplate] = useState<RoadmapTemplate | null>(null);
  const [assignProjectId, setAssignProjectId] = useState<string>("");
  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);

  // Forms
  const templateForm = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: emptyTemplateForm,
  });

  const editTemplateForm = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: emptyTemplateForm,
  });

  const itemForm = useForm<ItemFormData>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: emptyItemForm,
  });

  // Queries
  const { data: templates = [], isLoading: templatesLoading } = useQuery<TemplateWithItems[]>({
    queryKey: ["/api/admin/roadmap/templates"],
  });

  const { data: cohorts = [] } = useQuery<Cohort[]>({
    queryKey: ["/api/admin/cohorts"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/admin/projects"],
    enabled: !!assigningTemplate,
  });

  const { data: selectedTemplateItems = [], isLoading: itemsLoading } = useQuery<RoadmapItem[]>({
    queryKey: [`/api/admin/roadmap/templates/${selectedTemplate}/items`],
    enabled: !!selectedTemplate,
  });

  // Computed values
  const selectedTemplateData = useMemo(() => {
    return templates.find(t => t.id === selectedTemplate);
  }, [templates, selectedTemplate]);

  const cohortName = (cohortId: string | null | undefined) =>
    cohortId ? cohorts.find(c => c.id === cohortId)?.name ?? "Unknown cohort" : "All cohorts";

  // Modules offered for linking: the template's cohort, or every module for global templates.
  const modulesUrl = selectedTemplateData?.cohortId
    ? `/api/admin/modules?cohortId=${encodeURIComponent(selectedTemplateData.cohortId)}`
    : "/api/admin/modules";
  const isItemDialogOpen = isCreateItemOpen || !!editingItem;
  const { data: modules = [] } = useQuery<Module[]>({
    queryKey: [modulesUrl],
    enabled: !!selectedTemplate && isItemDialogOpen,
  });

  const itemModuleId = itemForm.watch("moduleId");
  const itemAutoType = itemForm.watch("autoCompletionType");
  const { data: lessons = [] } = useQuery<Lesson[]>({
    queryKey: [`/api/admin/lessons?moduleId=${encodeURIComponent(itemModuleId)}`],
    enabled: isItemDialogOpen && itemModuleId !== NONE,
  });

  const itemsByWeek = useMemo(() => {
    const weeks: { [key: number]: RoadmapItem[] } = {};
    selectedTemplateItems.forEach(item => {
      if (!weeks[item.week]) {
        weeks[item.week] = [];
      }
      weeks[item.week].push(item);
    });
    return weeks;
  }, [selectedTemplateItems]);

  // Shared error handler
  const handleError = (error: unknown, fallback: string) => {
    if (isUnauthorizedError(error as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => window.location.href = "/login", 500);
      return;
    }
    toast({
      title: "Error",
      description: getApiErrorMessage(error, fallback),
      variant: "destructive",
    });
  };

  const invalidateTemplates = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/admin/roadmap/templates"] });
  const invalidateItems = () =>
    queryClient.invalidateQueries({ queryKey: [`/api/admin/roadmap/templates/${selectedTemplate}/items`] });

  // Mutations
  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const response = await apiRequest("POST", "/api/admin/roadmap/templates", templatePayload(data));
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template Created",
        description: "Roadmap template has been created successfully.",
      });
      invalidateTemplates();
      templateForm.reset(emptyTemplateForm);
      setIsCreateTemplateOpen(false);
    },
    onError: (error) => handleError(error, "Failed to create template. Please try again."),
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const response = await apiRequest("PUT", `/api/admin/roadmap/templates/${id}`, data);
      return response.json();
    },
    onSuccess: (_result, variables) => {
      toast({
        title: "Template Updated",
        description: variables.data.isActive === true
          ? "Template has been restored."
          : "Roadmap template has been updated.",
      });
      invalidateTemplates();
      setEditingTemplate(null);
    },
    onError: (error) => handleError(error, "Failed to update template. Please try again."),
  });

  const deactivateTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      // 204 No Content: don't parse a body.
      await apiRequest("DELETE", `/api/admin/roadmap/templates/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Template Deactivated",
        description: "The template is hidden from new assignments. You can restore it at any time.",
      });
      invalidateTemplates();
    },
    onError: (error) => handleError(error, "Failed to deactivate template. Please try again."),
  });

  const assignTemplateMutation = useMutation({
    mutationFn: async ({ templateId, projectId }: { templateId: string; projectId: string }) => {
      const response = await apiRequest("POST", `/api/admin/roadmap/templates/${templateId}/assign`, { projectId });
      return response.json();
    },
    onSuccess: (result) => {
      const count = Array.isArray(result) ? result.length : undefined;
      toast({
        title: "Roadmap Assigned",
        description: count !== undefined
          ? `${count} roadmap item${count === 1 ? "" : "s"} assigned to the project.`
          : "The roadmap was assigned to the project.",
      });
      setAssigningTemplate(null);
      setAssignProjectId("");
    },
    onError: (error) => handleError(error, "Failed to assign the roadmap. Please try again."),
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: ItemFormData) => {
      const response = await apiRequest("POST", `/api/admin/roadmap/templates/${selectedTemplate}/items`, itemPayload(data));
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Item Created",
        description: "Roadmap item has been created successfully.",
      });
      invalidateItems();
      itemForm.reset(emptyItemForm);
      setIsCreateItemOpen(false);
    },
    onError: (error) => handleError(error, "Failed to create item. Please try again."),
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ItemFormData }) => {
      const response = await apiRequest("PATCH", `/api/admin/roadmap/items/${id}`, itemPayload(data));
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Item Updated",
        description: "Roadmap item has been updated successfully.",
      });
      invalidateItems();
      itemForm.reset(emptyItemForm);
      setEditingItem(null);
    },
    onError: (error) => handleError(error, "Failed to update item. Please try again."),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      // 204 No Content: don't parse a body.
      await apiRequest("DELETE", `/api/admin/roadmap/items/${itemId}`);
    },
    onSuccess: () => {
      toast({
        title: "Item Deleted",
        description: "Roadmap item has been deleted successfully.",
      });
      invalidateItems();
    },
    onError: (error) => handleError(error, "Failed to delete item. Please try again."),
  });

  // Populate the edit-template form when a template is picked for editing.
  useEffect(() => {
    if (editingTemplate) {
      editTemplateForm.reset({
        name: editingTemplate.name,
        description: editingTemplate.description || "",
        cohortId: editingTemplate.cohortId ?? ALL_COHORTS,
        isDefault: !!editingTemplate.isDefault,
      });
    }
  }, [editingTemplate, editTemplateForm]);

  // Event handlers
  const handleCreateTemplate = (data: TemplateFormData) => {
    createTemplateMutation.mutate(data);
  };

  const handleUpdateTemplate = (data: TemplateFormData) => {
    if (!editingTemplate) return;
    updateTemplateMutation.mutate({ id: editingTemplate.id, data: templatePayload(data) });
  };

  const handleRestoreTemplate = (template: RoadmapTemplate) => {
    updateTemplateMutation.mutate({ id: template.id, data: { isActive: true } });
  };

  const handleDeactivateTemplate = (template: RoadmapTemplate) => {
    setConfirmRequest({
      title: `Deactivate "${template.name}"?`,
      description: "Existing project roadmaps are kept.",
      confirmLabel: "Deactivate",
      onConfirm: () => deactivateTemplateMutation.mutate(template.id),
    });
  };

  const handleCreateItem = (data: ItemFormData) => {
    if (!selectedTemplate) return;
    createItemMutation.mutate(data);
  };

  const handleUpdateItem = (data: ItemFormData) => {
    if (!editingItem) return;
    updateItemMutation.mutate({ id: editingItem.id, data });
  };

  const handleEditItem = (item: RoadmapItem) => {
    setEditingItem(item);
    const autoType = (autoCompletionTypes as readonly string[]).includes(item.autoCompletionType ?? "")
      ? (item.autoCompletionType as ItemFormData["autoCompletionType"])
      : "none";
    itemForm.reset({
      title: item.title,
      description: item.description || "",
      type: item.type as ItemFormData["type"],
      week: item.week,
      orderIndex: item.orderIndex,
      isOptional: item.isOptional || false,
      estimatedHours: item.estimatedHours || 1,
      moduleId: item.moduleId ?? NONE,
      lessonId: item.lessonId ?? NONE,
      autoCompletionType: autoType,
      autoThreshold: item.autoThreshold ?? (autoType === "mentor_session" ? 1 : 100),
    });
  };

  const handleDeleteItem = (itemId: string, itemTitle?: string) => {
    setConfirmRequest({
      title: itemTitle ? `Delete roadmap item "${itemTitle}"?` : "Delete this roadmap item?",
      description: "This cannot be undone.",
      onConfirm: () => deleteItemMutation.mutate(itemId),
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "task": return <CheckCircle className="w-4 h-4" />;
      case "assignment": return <Edit className="w-4 h-4" />;
      case "deliverable": return <Clock className="w-4 h-4" />;
      case "milestone": return <Target className="w-4 h-4" />;
      case "checkin": return <Users className="w-4 h-4" />;
      case "learning": return <Calendar className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "task": return "default";
      case "assignment": return "secondary";
      case "deliverable": return "outline";
      case "milestone": return "destructive";
      case "checkin": return "default";
      case "learning": return "default";
      default: return "default";
    }
  };

  const autoCompletionLabel = (item: RoadmapItem) => {
    switch (item.autoCompletionType) {
      case "lesson": return "Auto: lesson completed";
      case "module": return `Auto: ${item.autoThreshold ?? 100}% of module`;
      case "mentor_session": return `Auto: ${item.autoThreshold ?? 1} mentor session${(item.autoThreshold ?? 1) === 1 ? "" : "s"}`;
      default: return null;
    }
  };

  const activeCount = templates.filter(t => t.isActive !== false).length;

  return (
    <div className="space-y-6">
      {/* Template Management Section */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Roadmap Templates</h3>
          <p className="text-sm text-muted-foreground">
            {activeCount} active template{activeCount !== 1 ? 's' : ''}
            {templates.length > activeCount ? `, ${templates.length - activeCount} inactive` : ""}
          </p>
        </div>

        <Dialog
          open={isCreateTemplateOpen}
          onOpenChange={(open) => {
            setIsCreateTemplateOpen(open);
            if (!open) templateForm.reset(emptyTemplateForm);
          }}
        >
          <DialogTrigger asChild>
            <Button data-testid="button-create-template">
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Roadmap Template</DialogTitle>
            </DialogHeader>
            <Form {...templateForm}>
              <form onSubmit={templateForm.handleSubmit(handleCreateTemplate)} className="space-y-4">
                <TemplateFormFields form={templateForm} cohorts={cohorts} />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createTemplateMutation.isPending}
                  data-testid="button-submit-template"
                >
                  {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Template Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => { if (!open) setEditingTemplate(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Roadmap Template</DialogTitle>
          </DialogHeader>
          <Form {...editTemplateForm}>
            <form onSubmit={editTemplateForm.handleSubmit(handleUpdateTemplate)} className="space-y-4">
              <TemplateFormFields form={editTemplateForm} cohorts={cohorts} />
              <Button
                type="submit"
                className="w-full"
                disabled={updateTemplateMutation.isPending}
                data-testid="button-update-template"
              >
                {updateTemplateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Assign Template Dialog */}
      <Dialog
        open={!!assigningTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setAssigningTemplate(null);
            setAssignProjectId("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign "{assigningTemplate?.name}" to a project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Every item in this template is added to the project's roadmap. Items the project already has are kept.
            </p>
            <div className="space-y-2">
              <Label>Project</Label>
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No projects exist yet.</p>
              ) : (
                <Select value={assignProjectId} onValueChange={setAssignProjectId}>
                  <SelectTrigger data-testid="select-assign-project">
                    <SelectValue placeholder="Pick a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...projects]
                      .sort((a, b) => {
                        // Projects in the template's cohort first.
                        const cohort = assigningTemplate?.cohortId;
                        const aMatch = cohort && a.cohortId === cohort ? 0 : 1;
                        const bMatch = cohort && b.cohortId === cohort ? 0 : 1;
                        return aMatch - bMatch || a.name.localeCompare(b.name);
                      })
                      .map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                          {project.cohortId ? ` (${cohortName(project.cohortId)})` : " (no cohort)"}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button
              className="w-full"
              disabled={!assignProjectId || assignTemplateMutation.isPending}
              onClick={() => {
                if (assigningTemplate && assignProjectId) {
                  assignTemplateMutation.mutate({ templateId: assigningTemplate.id, projectId: assignProjectId });
                }
              }}
              data-testid="button-confirm-assign"
            >
              {assignTemplateMutation.isPending ? "Assigning..." : "Assign Roadmap"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templatesLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="glass-card">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : templates.length === 0 ? (
          <Card className="glass-card col-span-full">
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Templates Found</h3>
              <p className="text-muted-foreground">
                Create your first roadmap template to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => {
            const inactive = template.isActive === false;
            return (
              <Card
                key={template.id}
                className={`glass-card cursor-pointer transition-all hover:border-primary/50 ${
                  selectedTemplate === template.id ? 'border-primary bg-primary/5' : ''
                } ${inactive ? 'opacity-70' : ''}`}
                onClick={() => setSelectedTemplate(template.id)}
                data-testid={`template-card-${template.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {inactive && <Badge variant="secondary">Inactive</Badge>}
                      {template.isDefault && <Badge>Default</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {template.description}
                  </p>
                  <div className="flex items-center text-xs text-muted-foreground mt-3">
                    <Users className="w-3 h-3 mr-1" />
                    {cohortName(template.cohortId)}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1 mt-4 pt-4 border-t">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTemplate(template.id);
                      }}
                      data-testid={`button-select-template-${template.id}`}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTemplate(template);
                      }}
                      data-testid={`button-edit-template-${template.id}`}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    {inactive ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestoreTemplate(template);
                        }}
                        disabled={updateTemplateMutation.isPending}
                        data-testid={`button-restore-template-${template.id}`}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Restore
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssigningTemplate(template);
                          }}
                          data-testid={`button-assign-template-${template.id}`}
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Assign
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeactivateTemplate(template);
                          }}
                          disabled={deactivateTemplateMutation.isPending}
                          aria-label="Deactivate template"
                          title="Deactivate template"
                          data-testid={`button-deactivate-template-${template.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Template Items Management */}
      {selectedTemplate && (
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedTemplateData?.name} - Items
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedTemplateItems.length} item{selectedTemplateItems.length !== 1 ? 's' : ''} configured
                </p>
              </div>

              <Dialog open={isItemDialogOpen} onOpenChange={(open) => {
                setIsCreateItemOpen(open);
                if (!open) {
                  setEditingItem(null);
                  itemForm.reset(emptyItemForm);
                }
              }}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-item">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? "Edit Roadmap Item" : "Create Roadmap Item"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...itemForm}>
                    <form
                      onSubmit={itemForm.handleSubmit(editingItem ? handleUpdateItem : handleCreateItem)}
                      className="space-y-4"
                    >
                      <FormField
                        control={itemForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g., Complete Market Research"
                                data-testid="input-item-title"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={itemForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Detailed description of the task or milestone..."
                                data-testid="textarea-item-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormField
                          control={itemForm.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-item-type">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="task">Task</SelectItem>
                                  <SelectItem value="assignment">Assignment</SelectItem>
                                  <SelectItem value="deliverable">Deliverable</SelectItem>
                                  <SelectItem value="milestone">Milestone</SelectItem>
                                  <SelectItem value="checkin">Check-in</SelectItem>
                                  <SelectItem value="learning">Learning</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={itemForm.control}
                          name="week"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Week</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  min="1"
                                  max="12"
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  data-testid="input-item-week"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={itemForm.control}
                          name="orderIndex"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Order Index</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  min="0"
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  data-testid="input-item-order"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={itemForm.control}
                          name="moduleId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Linked module</FormLabel>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  itemForm.setValue("lessonId", NONE);
                                }}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-item-module">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value={NONE}>None</SelectItem>
                                  {modules.map((module) => (
                                    <SelectItem key={module.id} value={module.id}>
                                      Week {module.week}: {module.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={itemForm.control}
                          name="lessonId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Linked lesson</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                                disabled={itemModuleId === NONE}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-item-lesson">
                                    <SelectValue placeholder={itemModuleId === NONE ? "Pick a module first" : undefined} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value={NONE}>None</SelectItem>
                                  {lessons.map((lesson) => (
                                    <SelectItem key={lesson.id} value={lesson.id}>
                                      {lesson.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={itemForm.control}
                          name="autoCompletionType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Auto-complete when</FormLabel>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  if (value === "mentor_session") itemForm.setValue("autoThreshold", 1);
                                  if (value === "module") itemForm.setValue("autoThreshold", 100);
                                }}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-item-auto-type">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">Never (manual)</SelectItem>
                                  <SelectItem value="lesson">Linked lesson is completed</SelectItem>
                                  <SelectItem value="module">Linked module reaches a percent</SelectItem>
                                  <SelectItem value="mentor_session">Mentor sessions are completed</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {(itemAutoType === "module" || itemAutoType === "mentor_session") && (
                          <FormField
                            control={itemForm.control}
                            name="autoThreshold"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  {itemAutoType === "module" ? "Module completion (%)" : "Completed sessions"}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    min="1"
                                    max={itemAutoType === "module" ? "100" : undefined}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                    data-testid="input-item-auto-threshold"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>

                      <FormField
                        control={itemForm.control}
                        name="isOptional"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3">
                            <FormLabel>Optional item</FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-item-optional"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={editingItem ? updateItemMutation.isPending : createItemMutation.isPending}
                        data-testid="button-submit-item"
                      >
                        {editingItem ? (
                          updateItemMutation.isPending ? "Updating..." : "Update Item"
                        ) : (
                          createItemMutation.isPending ? "Creating..." : "Create Item"
                        )}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {itemsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 w-full" />
                ))}
              </div>
            ) : selectedTemplateItems.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h4 className="text-lg font-semibold mb-2">No Items Yet</h4>
                <p className="text-muted-foreground">
                  Add tasks, milestones, and deliverables to structure your program.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(itemsByWeek)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([week, items]) => (
                    <div key={week} className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="font-semibold">
                          Week {week}
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          {items.length} item{items.length !== 1 ? 's' : ''}
                        </div>
                      </div>

                      <div className="space-y-2">
                        {items.map((item) => {
                          const autoLabel = autoCompletionLabel(item);
                          return (
                            <Card key={item.id} className="bg-secondary/30">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      {getTypeIcon(item.type)}
                                      <h5 className="font-medium" data-testid={`item-title-${item.id}`}>
                                        {item.title}
                                      </h5>
                                      <Badge
                                        variant={getTypeColor(item.type) as any}
                                        className="text-xs"
                                      >
                                        {item.type}
                                      </Badge>
                                      {item.isOptional && (
                                        <Badge variant="outline" className="text-xs">
                                          Optional
                                        </Badge>
                                      )}
                                      {autoLabel && (
                                        <Badge variant="outline" className="text-xs">
                                          {autoLabel}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {item.description}
                                    </p>
                                  </div>

                                  <div className="flex items-center space-x-2 ml-4">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEditItem(item)}
                                      aria-label={`Edit roadmap item ${item.title}`}
                                      title="Edit roadmap item"
                                      data-testid={`button-edit-item-${item.id}`}
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteItem(item.id, item.title)}
                                      disabled={deleteItemMutation.isPending}
                                      aria-label={`Delete roadmap item ${item.title}`}
                                      title="Delete roadmap item"
                                      data-testid={`button-delete-item-${item.id}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        request={confirmRequest}
        onOpenChange={(open) => { if (!open) setConfirmRequest(null); }}
      />
    </div>
  );
}
