import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import ConfirmDialog, { type ConfirmRequest } from "@/components/ConfirmDialog";
import { apiRequest } from "@/lib/queryClient";
import { getApiErrorMessage } from "@/lib/utils";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { RoadmapTemplate, RoadmapItem, Cohort, Module, Lesson, Project } from "@shared/schema";
import { useTranslation, Trans } from "react-i18next";
import type { TFunction } from "i18next";
import { useLocalized } from "@/lib/localized";
import { ContentLanguageTabs } from "@/components/ContentLanguageTabs";

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
import { ConnectorBadge } from "@/components/brand";
import { cn } from "@/lib/utils";

// Form handling
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Icons
import { Plus, Edit, Trash2, Eye, Calendar, Target, CheckCircle, Clock, Users, RotateCcw, Send } from "lucide-react";

// Sentinel values for "no selection" in Select components (Radix Select can't use "").
const ALL_COHORTS = "__all__";
const NONE = "__none__";

type AdminT = TFunction<["admin", "common"]>;
type ContentLang = "en" | "es";

// Form schemas (built with `t` so validation messages follow the interface language)
const makeTemplateFormSchema = (t: AdminT) => z.object({
  name: z.string().min(1, t("roadmap.validation.nameRequired")),
  description: z.string().min(1, t("roadmap.validation.descriptionRequired")),
  cohortId: z.string(), // ALL_COHORTS = global template
  isDefault: z.boolean().default(false),
  // Spanish version of the text fields; empty fields fall back to English.
  translations: z.object({
    es: z.object({ name: z.string().optional(), description: z.string().optional() }).optional(),
  }).optional(),
});

const autoCompletionTypes = ["none", "lesson", "module", "mentor_session"] as const;
const itemTypes = ["task", "assignment", "deliverable", "milestone", "checkin", "learning"] as const;

const makeItemFormSchema = (t: AdminT) => z.object({
  title: z.string().min(1, t("roadmap.validation.titleRequired")),
  description: z.string().min(1, t("roadmap.validation.descriptionRequired")),
  type: z.enum(itemTypes),
  week: z.coerce.number().min(1, t("roadmap.validation.weekMin")),
  orderIndex: z.coerce.number().min(0, t("roadmap.validation.orderMin")),
  isOptional: z.boolean().default(false),
  estimatedHours: z.coerce.number().min(1, t("roadmap.validation.hoursMin")).optional(),
  moduleId: z.string(), // NONE = not linked
  lessonId: z.string(), // NONE = not linked
  autoCompletionType: z.enum(autoCompletionTypes),
  autoThreshold: z.coerce.number().min(1, t("roadmap.validation.thresholdMin")),
  translations: z.object({
    es: z.object({ title: z.string().optional(), description: z.string().optional() }).optional(),
  }).optional(),
}).superRefine((data, ctx) => {
  if (data.autoCompletionType === "lesson" && data.lessonId === NONE) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lessonId"], message: t("roadmap.validation.pickLesson") });
  }
  if (data.autoCompletionType === "module" && data.moduleId === NONE) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["moduleId"], message: t("roadmap.validation.pickModule") });
  }
  if (data.autoCompletionType === "module" && data.autoThreshold > 100) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["autoThreshold"], message: t("roadmap.validation.percentMax") });
  }
});

type TemplateFormData = z.infer<ReturnType<typeof makeTemplateFormSchema>>;
type ItemFormData = z.infer<ReturnType<typeof makeItemFormSchema>>;

interface TemplateWithItems extends RoadmapTemplate {
  items?: RoadmapItem[];
}

const emptyTemplateForm: TemplateFormData = {
  name: "",
  description: "",
  cohortId: ALL_COHORTS,
  isDefault: false,
  translations: { es: { name: "", description: "" } },
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
  translations: { es: { title: "", description: "" } },
};

/** The Spanish text stored on an entity, for prefilling the Spanish tab. */
function spanishOf(entity: { translations?: unknown } | null | undefined): Record<string, unknown> {
  const es = (entity?.translations as Record<string, unknown> | undefined)?.es;
  return es && typeof es === "object" ? (es as Record<string, unknown>) : {};
}

const textOr = (value: unknown) => (typeof value === "string" ? value : "");

function templatePayload(data: TemplateFormData) {
  return {
    name: data.name,
    description: data.description,
    cohortId: data.cohortId === ALL_COHORTS ? null : data.cohortId,
    isDefault: data.isDefault,
    translations: data.translations,
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
    translations: data.translations,
  };
}

function TemplateFormFields({
  form,
  cohorts,
  lang,
  onLangChange,
}: {
  form: UseFormReturn<TemplateFormData>;
  cohorts: Cohort[];
  lang: ContentLang;
  onLangChange: (lang: ContentLang) => void;
}) {
  const { t } = useTranslation(["admin", "common"]);
  const localized = useLocalized();
  const cohortId = form.watch("cohortId");
  const esName = form.watch("translations.es.name");
  const esDescription = form.watch("translations.es.description");
  return (
    <>
      <ContentLanguageTabs
        className="md:col-span-2"
        value={lang}
        onChange={onLangChange}
        spanishMissing={!esName?.trim() && !esDescription?.trim()}
      />

      {lang === "en" ? (
        <FormField
          key="name-en"
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("roadmap.templateForm.name")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t("roadmap.templateForm.namePlaceholder")}
                  data-testid="input-template-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <FormField
          key="name-es"
          control={form.control}
          name="translations.es.name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("roadmap.templateForm.name")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  lang="es"
                  placeholder={form.getValues("name") || t("roadmap.templateForm.namePlaceholder")}
                  data-testid="input-template-name-es"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="cohortId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("roadmap.templateForm.cohort")}</FormLabel>
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
                <SelectItem value={ALL_COHORTS}>{t("roadmap.templates.allCohorts")}</SelectItem>
                {cohorts.map((cohort) => (
                  <SelectItem key={cohort.id} value={cohort.id}>
                    {cohort.isActive === false
                      ? t("roadmap.templateForm.inactiveCohort", { name: localized.text(cohort, "name") })
                      : localized.text(cohort, "name")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {lang === "en" ? (
        <FormField
          key="description-en"
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>{t("shared.description")}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={t("roadmap.templateForm.descriptionPlaceholder")}
                  data-testid="textarea-template-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <FormField
          key="description-es"
          control={form.control}
          name="translations.es.description"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>{t("shared.description")}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  lang="es"
                  placeholder={form.getValues("description") || t("roadmap.templateForm.descriptionPlaceholder")}
                  data-testid="textarea-template-description-es"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="isDefault"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between gap-4 rounded-xl border p-4 md:col-span-2">
            <div className="space-y-0.5">
              <FormLabel>{t("roadmap.templateForm.default")}</FormLabel>
              <FormDescription>
                {t("roadmap.templateForm.defaultHint")}
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
  const { t } = useTranslation(["admin", "common"]);
  const localized = useLocalized();
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
  // Which content language each form is showing (English is the base text).
  const [templateLang, setTemplateLang] = useState<ContentLang>("en");
  const [editTemplateLang, setEditTemplateLang] = useState<ContentLang>("en");
  const [itemLang, setItemLang] = useState<ContentLang>("en");

  // Forms
  const templateFormSchema = useMemo(() => makeTemplateFormSchema(t), [t]);
  const itemFormSchema = useMemo(() => makeItemFormSchema(t), [t]);

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

  // English is required; if it fails validation while the Spanish tab is open, show it.
  const showEnglishOnError =
    (setLang: (lang: ContentLang) => void, fields: string[]) => (errors: Record<string, unknown>) => {
      if (fields.some((f) => errors[f])) setLang("en");
    };

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
    cohortId
      ? (() => {
          const cohort = cohorts.find(c => c.id === cohortId);
          return cohort ? localized.text(cohort, "name") : t("roadmap.templates.unknownCohort");
        })()
      : t("roadmap.templates.allCohorts");

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
  const itemEsTitle = itemForm.watch("translations.es.title");
  const itemEsDescription = itemForm.watch("translations.es.description");
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
        title: t("shared.signedOutTitle"),
        description: t("shared.signedOutBody"),
        variant: "destructive",
      });
      setTimeout(() => window.location.href = "/login", 500);
      return;
    }
    toast({
      title: t("shared.errorTitle"),
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
        title: t("roadmap.toast.templateCreatedTitle"),
        description: t("roadmap.toast.templateCreatedBody"),
      });
      invalidateTemplates();
      templateForm.reset(emptyTemplateForm);
      setIsCreateTemplateOpen(false);
    },
    onError: (error) => handleError(error, t("roadmap.toast.templateCreateFailed")),
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const response = await apiRequest("PUT", `/api/admin/roadmap/templates/${id}`, data);
      return response.json();
    },
    onSuccess: (_result, variables) => {
      toast({
        title: t("roadmap.toast.templateUpdatedTitle"),
        description: variables.data.isActive === true
          ? t("roadmap.toast.templateRestoredBody")
          : t("shared.changesSaved"),
      });
      invalidateTemplates();
      setEditingTemplate(null);
    },
    onError: (error) => handleError(error, t("roadmap.toast.templateUpdateFailed")),
  });

  const deactivateTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      // 204 No Content: don't parse a body.
      await apiRequest("DELETE", `/api/admin/roadmap/templates/${id}`);
    },
    onSuccess: () => {
      toast({
        title: t("roadmap.toast.templateDeactivatedTitle"),
        description: t("roadmap.toast.templateDeactivatedBody"),
      });
      invalidateTemplates();
    },
    onError: (error) => handleError(error, t("roadmap.toast.templateDeactivateFailed")),
  });

  const assignTemplateMutation = useMutation({
    mutationFn: async ({ templateId, projectId }: { templateId: string; projectId: string }) => {
      const response = await apiRequest("POST", `/api/admin/roadmap/templates/${templateId}/assign`, { projectId });
      return response.json();
    },
    onSuccess: (result) => {
      const count = Array.isArray(result) ? result.length : undefined;
      toast({
        title: t("roadmap.toast.assignedTitle"),
        description: count !== undefined
          ? t("roadmap.toast.assigned", { count })
          : t("roadmap.toast.assignedGeneric"),
      });
      setAssigningTemplate(null);
      setAssignProjectId("");
    },
    onError: (error) => handleError(error, t("roadmap.toast.assignFailed")),
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: ItemFormData) => {
      const response = await apiRequest("POST", `/api/admin/roadmap/templates/${selectedTemplate}/items`, itemPayload(data));
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("roadmap.toast.itemAddedTitle"),
        description: t("roadmap.toast.itemAddedBody"),
      });
      invalidateItems();
      itemForm.reset(emptyItemForm);
      setIsCreateItemOpen(false);
    },
    onError: (error) => handleError(error, t("roadmap.toast.itemAddFailed")),
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ItemFormData }) => {
      const response = await apiRequest("PATCH", `/api/admin/roadmap/items/${id}`, itemPayload(data));
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("roadmap.toast.itemUpdatedTitle"),
        description: t("shared.changesSaved"),
      });
      invalidateItems();
      itemForm.reset(emptyItemForm);
      setEditingItem(null);
    },
    onError: (error) => handleError(error, t("roadmap.toast.itemUpdateFailed")),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      // 204 No Content: don't parse a body.
      await apiRequest("DELETE", `/api/admin/roadmap/items/${itemId}`);
    },
    onSuccess: () => {
      toast({
        title: t("roadmap.toast.itemDeletedTitle"),
        description: t("roadmap.toast.itemDeletedBody"),
      });
      invalidateItems();
    },
    onError: (error) => handleError(error, t("roadmap.toast.itemDeleteFailed")),
  });

  // Populate the edit-template form when a template is picked for editing.
  useEffect(() => {
    if (editingTemplate) {
      const es = spanishOf(editingTemplate);
      setEditTemplateLang("en");
      editTemplateForm.reset({
        name: editingTemplate.name,
        description: editingTemplate.description || "",
        cohortId: editingTemplate.cohortId ?? ALL_COHORTS,
        isDefault: !!editingTemplate.isDefault,
        translations: { es: { name: textOr(es.name), description: textOr(es.description) } },
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
      title: t("roadmap.confirm.deactivateTitle", { name: localized.text(template, "name") }),
      description: t("roadmap.confirm.deactivateBody"),
      confirmLabel: t("roadmap.confirm.deactivateLabel"),
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
    setItemLang("en");
    const es = spanishOf(item);
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
      translations: { es: { title: textOr(es.title), description: textOr(es.description) } },
    });
  };

  const handleDeleteItem = (itemId: string, itemTitle?: string) => {
    setConfirmRequest({
      title: itemTitle ? t("roadmap.confirm.deleteItemNamed", { title: itemTitle }) : t("roadmap.confirm.deleteItem"),
      description: t("roadmap.confirm.deleteItemBody"),
      onConfirm: () => deleteItemMutation.mutate(itemId),
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "task": return <CheckCircle className="w-4 h-4 shrink-0 text-primary" />;
      case "assignment": return <Edit className="w-4 h-4 shrink-0 text-primary" />;
      case "deliverable": return <Clock className="w-4 h-4 shrink-0 text-primary" />;
      case "milestone": return <Target className="w-4 h-4 shrink-0 text-primary" />;
      case "checkin": return <Users className="w-4 h-4 shrink-0 text-primary" />;
      case "learning": return <Calendar className="w-4 h-4 shrink-0 text-primary" />;
      default: return <CheckCircle className="w-4 h-4 shrink-0 text-primary" />;
    }
  };

  // Item types are categories, not statuses: one neutral badge style for all of them.
  // Stored type values stay as they are; only the label is translated.
  const typeLabel = (type: string) =>
    (itemTypes as readonly string[]).includes(type)
      ? t(`common:itemType.${type as (typeof itemTypes)[number]}`)
      : type.charAt(0).toUpperCase() + type.slice(1);

  const autoCompletionLabel = (item: RoadmapItem) => {
    switch (item.autoCompletionType) {
      case "lesson": return t("roadmap.items.auto.lesson");
      case "module": return t("roadmap.items.auto.module", { percent: item.autoThreshold ?? 100 });
      case "mentor_session": return t("roadmap.items.auto.mentorSession", { count: item.autoThreshold ?? 1 });
      default: return null;
    }
  };

  const activeCount = templates.filter(t => t.isActive !== false).length;

  return (
    <div className="space-y-6">
      {/* Template Management Section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg">{t("roadmap.templates.heading")}</h3>
          <p className="text-sm text-muted-foreground">
            <Trans
              t={t}
              i18nKey="roadmap.templates.activeCount"
              count={activeCount}
              components={{ num: <span className="font-display" /> }}
            />
            {templates.length > activeCount
              ? t("roadmap.templates.inactiveSuffix", { count: templates.length - activeCount })
              : ""}
          </p>
        </div>

        <Dialog
          open={isCreateTemplateOpen}
          onOpenChange={(open) => {
            setIsCreateTemplateOpen(open);
            setTemplateLang("en");
            if (!open) templateForm.reset(emptyTemplateForm);
          }}
        >
          <DialogTrigger asChild>
            <Button data-testid="button-create-template">
              <Plus className="w-4 h-4 mr-2" />
              {t("roadmap.templates.add")}
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("roadmap.templates.addTitle")}</DialogTitle>
            </DialogHeader>
            <Form {...templateForm}>
              <form
                onSubmit={templateForm.handleSubmit(
                  handleCreateTemplate,
                  showEnglishOnError(setTemplateLang, ["name", "description"]),
                )}
                className="grid gap-4 md:grid-cols-2"
              >
                <TemplateFormFields
                  form={templateForm}
                  cohorts={cohorts}
                  lang={templateLang}
                  onLangChange={setTemplateLang}
                />
                <div className="flex justify-end pt-2 md:col-span-2">
                  <Button
                    type="submit"
                    className="w-full sm:w-auto"
                    disabled={createTemplateMutation.isPending}
                    data-testid="button-submit-template"
                  >
                    {createTemplateMutation.isPending ? t("roadmap.templates.creating") : t("roadmap.templates.add")}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Template Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => { if (!open) setEditingTemplate(null); }}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("roadmap.templates.editTitle")}</DialogTitle>
          </DialogHeader>
          <Form {...editTemplateForm}>
            <form
              onSubmit={editTemplateForm.handleSubmit(
                handleUpdateTemplate,
                showEnglishOnError(setEditTemplateLang, ["name", "description"]),
              )}
              className="grid gap-4 md:grid-cols-2"
            >
              <TemplateFormFields
                form={editTemplateForm}
                cohorts={cohorts}
                lang={editTemplateLang}
                onLangChange={setEditTemplateLang}
              />
              <div className="flex justify-end pt-2 md:col-span-2">
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={updateTemplateMutation.isPending}
                  data-testid="button-update-template"
                >
                  {updateTemplateMutation.isPending ? t("shared.saving") : t("common:actions.saveChanges")}
                </Button>
              </div>
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
            <DialogTitle>{t("roadmap.assign.title", { name: localized.text(assigningTemplate, "name") })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("roadmap.assign.body")}
            </p>
            <div className="space-y-2">
              <Label className="font-display">{t("roadmap.assign.project")}</Label>
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("roadmap.assign.noProjects")}</p>
              ) : (
                <Select value={assignProjectId} onValueChange={setAssignProjectId}>
                  <SelectTrigger data-testid="select-assign-project">
                    <SelectValue placeholder={t("roadmap.assign.selectProject")} />
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
                          {project.cohortId
                            ? t("roadmap.assign.projectOption", { project: project.name, cohort: cohortName(project.cohortId) })
                            : t("roadmap.assign.projectNoCohort", { project: project.name })}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex justify-end">
              <Button
                className="w-full sm:w-auto"
                disabled={!assignProjectId || assignTemplateMutation.isPending}
                onClick={() => {
                  if (assigningTemplate && assignProjectId) {
                    assignTemplateMutation.mutate({ templateId: assigningTemplate.id, projectId: assignProjectId });
                  }
                }}
                data-testid="button-confirm-assign"
              >
                {assignTemplateMutation.isPending ? t("roadmap.assign.assigning") : t("roadmap.assign.confirm")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templatesLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
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
          <div className="col-span-full rounded-xl border border-dashed border-steel/50 p-8 text-center">
            <Calendar className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg mb-1">{t("roadmap.templates.emptyTitle")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("roadmap.templates.emptyBody")}
            </p>
          </div>
        ) : (
          templates.map((template) => {
            const inactive = template.isActive === false;
            return (
              <Card
                key={template.id}
                className={cn(
                  "cursor-pointer transition-colors hover:border-steel/60",
                  selectedTemplate === template.id && "border-primary ring-1 ring-primary",
                  inactive && "opacity-70",
                )}
                onClick={() => setSelectedTemplate(template.id)}
                data-testid={`template-card-${template.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{localized.text(template, "name")}</CardTitle>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {inactive && <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground">{t("roadmap.templates.inactive")}</Badge>}
                      {template.isDefault && <Badge>{t("roadmap.templates.default")}</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {localized.text(template, "description")}
                  </p>
                  <div className="flex items-center text-xs text-muted-foreground mt-3">
                    <Users className="w-3 h-3 mr-1" />
                    {cohortName(template.cohortId)}
                  </div>
                  <div className="flex flex-wrap items-center justify-end mt-4 pt-3 border-t">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTemplate(template.id);
                      }}
                      data-testid={`button-select-template-${template.id}`}
                    >
                      <Eye className="w-3 h-3" />
                      {t("shared.view")}
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
                      <Edit className="w-3 h-3" />
                      {t("common:actions.edit")}
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
                        <RotateCcw className="w-3 h-3" />
                        {t("roadmap.templates.restore")}
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
                          <Send className="w-3 h-3" />
                          {t("roadmap.templates.assign")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeactivateTemplate(template);
                          }}
                          disabled={deactivateTemplateMutation.isPending}
                          aria-label={t("roadmap.templates.deactivate")}
                          title={t("roadmap.templates.deactivate")}
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
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>
                  {t("roadmap.items.heading", { name: localized.text(selectedTemplateData, "name") })}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  <Trans
                    t={t}
                    i18nKey="roadmap.items.count"
                    count={selectedTemplateItems.length}
                    components={{ num: <span className="font-display" /> }}
                  />
                </p>
              </div>

              <Dialog open={isItemDialogOpen} onOpenChange={(open) => {
                setIsCreateItemOpen(open);
                if (open) setItemLang("en");
                if (!open) {
                  setEditingItem(null);
                  itemForm.reset(emptyItemForm);
                }
              }}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-item">
                    <Plus className="w-4 h-4 mr-2" />
                    {t("roadmap.items.add")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? t("roadmap.items.editTitle") : t("roadmap.items.addTitle")}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...itemForm}>
                    <form
                      onSubmit={itemForm.handleSubmit(
                        editingItem ? handleUpdateItem : handleCreateItem,
                        showEnglishOnError(setItemLang, ["title", "description"]),
                      )}
                      className="space-y-4"
                    >
                      <ContentLanguageTabs
                        value={itemLang}
                        onChange={setItemLang}
                        spanishMissing={!itemEsTitle?.trim() && !itemEsDescription?.trim()}
                      />

                      {itemLang === "en" ? (
                        <>
                          <FormField
                            key="title-en"
                            control={itemForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("roadmap.itemForm.title")}</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder={t("roadmap.itemForm.titlePlaceholder")}
                                    data-testid="input-item-title"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            key="description-en"
                            control={itemForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("shared.description")}</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    placeholder={t("roadmap.itemForm.descriptionPlaceholder")}
                                    data-testid="textarea-item-description"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      ) : (
                        <>
                          <FormField
                            key="title-es"
                            control={itemForm.control}
                            name="translations.es.title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("roadmap.itemForm.title")}</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    value={field.value ?? ""}
                                    lang="es"
                                    placeholder={itemForm.getValues("title") || t("roadmap.itemForm.titlePlaceholder")}
                                    data-testid="input-item-title-es"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            key="description-es"
                            control={itemForm.control}
                            name="translations.es.description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("shared.description")}</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    value={field.value ?? ""}
                                    lang="es"
                                    placeholder={itemForm.getValues("description") || t("roadmap.itemForm.descriptionPlaceholder")}
                                    data-testid="textarea-item-description-es"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormField
                          control={itemForm.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("roadmap.itemForm.type")}</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-item-type">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {itemTypes.map((type) => (
                                    <SelectItem key={type} value={type}>{t(`common:itemType.${type}`)}</SelectItem>
                                  ))}
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
                              <FormLabel>{t("roadmap.itemForm.week")}</FormLabel>
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
                              <FormLabel>{t("roadmap.itemForm.order")}</FormLabel>
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
                              <FormLabel>{t("roadmap.itemForm.linkedModule")}</FormLabel>
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
                                  <SelectItem value={NONE}>{t("roadmap.itemForm.none")}</SelectItem>
                                  {modules.map((module) => (
                                    <SelectItem key={module.id} value={module.id}>
                                      {t("roadmap.itemForm.moduleOption", { week: module.week, title: localized.text(module, "title") })}
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
                              <FormLabel>{t("roadmap.itemForm.linkedLesson")}</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                                disabled={itemModuleId === NONE}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-item-lesson">
                                    <SelectValue placeholder={itemModuleId === NONE ? t("roadmap.itemForm.pickModuleFirst") : undefined} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value={NONE}>{t("roadmap.itemForm.none")}</SelectItem>
                                  {lessons.map((lesson) => (
                                    <SelectItem key={lesson.id} value={lesson.id}>
                                      {localized.text(lesson, "title")}
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
                              <FormLabel>{t("roadmap.itemForm.autoComplete")}</FormLabel>
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
                                  {autoCompletionTypes.map((type) => (
                                    <SelectItem key={type} value={type}>{t(`roadmap.itemForm.autoTypes.${type}`)}</SelectItem>
                                  ))}
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
                                  {itemAutoType === "module" ? t("roadmap.itemForm.thresholdModule") : t("roadmap.itemForm.thresholdSessions")}
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
                          <FormItem className="flex items-center justify-between gap-4 rounded-xl border p-4">
                            <FormLabel>{t("roadmap.itemForm.optional")}</FormLabel>
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

                      <div className="flex justify-end pt-2">
                        <Button
                          type="submit"
                          className="w-full sm:w-auto"
                          disabled={editingItem ? updateItemMutation.isPending : createItemMutation.isPending}
                          data-testid="button-submit-item"
                        >
                          {editingItem ? (
                            updateItemMutation.isPending ? t("shared.saving") : t("common:actions.saveChanges")
                          ) : (
                            createItemMutation.isPending ? t("roadmap.items.adding") : t("roadmap.items.add")
                          )}
                        </Button>
                      </div>
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
              <div className="rounded-xl border border-dashed border-steel/50 py-8 px-4 text-center">
                <Target className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
                <h4 className="text-lg mb-1">{t("roadmap.items.emptyTitle")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("roadmap.items.emptyBody")}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(itemsByWeek)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([week, items]) => (
                    <div key={week} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <ConnectorBadge state="current">{week}</ConnectorBadge>
                        <div>
                          <p className="font-display font-medium">{t("common:week", { week })}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("roadmap.items.weekCount", { count: items.length })}
                          </p>
                        </div>
                      </div>

                      <div className="divide-y rounded-xl border">
                        {items.map((item) => {
                          const autoLabel = autoCompletionLabel(item);
                          const itemTitle = localized.text(item, "title");
                          return (
                            <div key={item.id} className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      {getTypeIcon(item.type)}
                                      <h5 className="font-medium" data-testid={`item-title-${item.id}`}>
                                        {itemTitle}
                                      </h5>
                                      <Badge variant="outline" className="border-transparent bg-secondary text-foreground">
                                        {typeLabel(item.type)}
                                      </Badge>
                                      {item.isOptional && (
                                        <Badge variant="outline" className="border-dashed border-steel/60 bg-transparent text-muted-foreground">
                                          {t("roadmap.items.optional")}
                                        </Badge>
                                      )}
                                      {autoLabel && (
                                        <Badge variant="outline" className="text-muted-foreground">
                                          {autoLabel}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {localized.text(item, "description")}
                                    </p>
                                  </div>

                                  <div className="flex shrink-0 items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEditItem(item)}
                                      aria-label={t("roadmap.items.editAria", { title: itemTitle })}
                                      title={t("roadmap.items.editTooltip")}
                                      data-testid={`button-edit-item-${item.id}`}
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteItem(item.id, itemTitle)}
                                      disabled={deleteItemMutation.isPending}
                                      aria-label={t("roadmap.items.deleteAria", { title: itemTitle })}
                                      title={t("roadmap.items.deleteTooltip")}
                                      data-testid={`button-delete-item-${item.id}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                            </div>
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
