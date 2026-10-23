import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import ConfirmDialog, { type ConfirmRequest } from "@/components/ConfirmDialog";
import { apiRequest } from "@/lib/queryClient";
import { formatCohortDate } from "@/lib/dates";
import type { Module, Lesson, Quiz, Cohort } from "@shared/schema";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// Form handling
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Icons
import { 
  Plus, Edit, Trash2, BookOpen, Users, Clock, 
  ChevronDown, ChevronRight, Copy, PlayCircle,
  FileText, HelpCircle, Calendar, Target, X, ExternalLink
} from "lucide-react";

// Form schemas
const moduleFormSchema = z.object({
  title: z.string().min(1, "Module title is required"),
  description: z.string().min(1, "Description is required"),
  cohortId: z.string().min(1, "Cohort is required"),
  week: z.coerce.number().min(1, "Week number must be at least 1"),
  orderIndex: z.coerce.number().min(0, "Order index must be 0 or greater"),
});

const lessonFormSchema = z.object({
  title: z.string().min(1, "Lesson title is required"),
  content: z.string().min(1, "Content is required"),
  moduleId: z.string().min(1, "Module is required"),
  orderIndex: z.coerce.number().min(0, "Order index must be 0 or greater"),
  media: z.array(z.string()).default([]),
  quizId: z.string().nullable().default(null),
});

const quizFormSchema = z.object({
  title: z.string().min(1, "Quiz title is required"),
  questions: z.array(z.object({
    question: z.string().trim().min(1, "Question text is required"),
    options: z.array(z.string().trim().min(1, "Option text is required"))
      .min(2, "At least 2 options required")
      .max(6, "At most 6 options allowed"),
    correctAnswer: z.number().int().min(0, "Pick the correct option"),
  }).refine((q) => q.correctAnswer < q.options.length, {
    message: "Pick the correct option",
    path: ["correctAnswer"],
  })).min(1, "At least one question required"),
  passThreshold: z.coerce.number().min(1).max(100, "Pass threshold must be between 1-100"),
  maxAttempts: z.coerce.number().min(1, "Max attempts must be at least 1").optional(),
});

type ModuleFormData = z.infer<typeof moduleFormSchema>;
type LessonFormData = z.infer<typeof lessonFormSchema>;
type QuizFormData = z.infer<typeof quizFormSchema>;

const NO_QUIZ = "__none__";
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

function cohortLabel(cohort: Cohort) {
  const dates = cohort.startDate ? ` (starts ${formatCohortDate(cohort.startDate)})` : "";
  return `${cohort.name}${dates}${cohort.isActive === false ? " (Inactive)" : ""}`;
}

type QuizQuestion = QuizFormData["questions"][number];

const emptyQuestion = (): QuizQuestion => ({ question: "", options: ["", ""], correctAnswer: 0 });

// Normalise stored quiz questions (jsonb) into the editor's shape
function toEditableQuestions(raw: unknown): QuizQuestion[] {
  if (!Array.isArray(raw) || raw.length === 0) return [emptyQuestion()];
  return raw.map((q: any) => {
    const options = Array.isArray(q?.options) ? q.options.map((o: unknown) => String(o ?? "")) : ["", ""];
    while (options.length < MIN_OPTIONS) options.push("");
    const correct = typeof q?.correctAnswer === "number" && q.correctAnswer < options.length ? q.correctAnswer : 0;
    return { question: String(q?.question ?? ""), options, correctAnswer: correct };
  });
}

function QuizFormFields({ form, idPrefix }: { form: UseFormReturn<QuizFormData>; idPrefix: string }) {
  const questions = form.watch("questions") || [];
  const questionErrors = form.formState.errors.questions;

  const setQuestions = (next: QuizQuestion[]) => {
    form.setValue("questions", next, { shouldDirty: true, shouldValidate: form.formState.isSubmitted });
  };

  const updateQuestion = (index: number, patch: Partial<QuizQuestion>) => {
    setQuestions(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  return (
    <>
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Quiz Title</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g., Week 1 Assessment: AI Fundamentals"
                {...field}
                data-testid={`input-${idPrefix}-title`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="passThreshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pass Threshold (%)</FormLabel>
              <FormControl>
                <Input type="number" min={1} max={100} {...field} data-testid={`input-${idPrefix}-threshold`} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="maxAttempts"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Max Attempts</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  {...field}
                  value={field.value ?? ""}
                  data-testid={`input-${idPrefix}-attempts`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Questions ({questions.length})</h4>
          <Button
            type="button"
            size="sm"
            onClick={() => setQuestions([...questions, emptyQuestion()])}
            data-testid={`button-${idPrefix}-add-question`}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>
        {typeof questionErrors?.message === "string" && (
          <p className="text-sm font-medium text-destructive">{questionErrors.message}</p>
        )}
        {questions.map((q, qIndex) => {
          const errors = Array.isArray(questionErrors) ? questionErrors[qIndex] : undefined;
          return (
            <div key={qIndex} className="p-4 border border-white/10 rounded-lg bg-white/5 space-y-3">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-2">{qIndex + 1}</Badge>
                <div className="flex-1 space-y-1">
                  <Input
                    placeholder="Question text"
                    value={q.question}
                    onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
                    data-testid={`input-${idPrefix}-question-${qIndex}`}
                  />
                  {errors?.question?.message && (
                    <p className="text-sm font-medium text-destructive">{errors.question.message}</p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={questions.length <= 1}
                  onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))}
                  aria-label="Remove question"
                  data-testid={`button-${idPrefix}-remove-question-${qIndex}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Select the correct answer.</p>
              <RadioGroup
                value={String(q.correctAnswer)}
                onValueChange={(value) => updateQuestion(qIndex, { correctAnswer: Number(value) })}
                className="space-y-1"
              >
                {q.options.map((option, oIndex) => {
                  const optionId = `${idPrefix}-q${qIndex}-o${oIndex}`;
                  const optionError = Array.isArray(errors?.options) ? errors?.options[oIndex]?.message : undefined;
                  return (
                    <div key={oIndex} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value={String(oIndex)} id={optionId} aria-label={`Option ${oIndex + 1} is correct`} />
                        <Input
                          placeholder={`Option ${oIndex + 1}`}
                          value={option}
                          onChange={(e) => {
                            const options = [...q.options];
                            options[oIndex] = e.target.value;
                            updateQuestion(qIndex, { options });
                          }}
                          data-testid={`input-${idPrefix}-option-${qIndex}-${oIndex}`}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={q.options.length <= MIN_OPTIONS}
                          onClick={() => {
                            const options = q.options.filter((_, i) => i !== oIndex);
                            let correctAnswer = q.correctAnswer;
                            if (correctAnswer === oIndex) correctAnswer = 0;
                            else if (correctAnswer > oIndex) correctAnswer -= 1;
                            updateQuestion(qIndex, { options, correctAnswer });
                          }}
                          aria-label="Remove option"
                          data-testid={`button-${idPrefix}-remove-option-${qIndex}-${oIndex}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {optionError && <p className="text-sm font-medium text-destructive ml-6">{optionError}</p>}
                    </div>
                  );
                })}
              </RadioGroup>
              {typeof errors?.options?.message === "string" && (
                <p className="text-sm font-medium text-destructive">{errors.options.message}</p>
              )}
              {errors?.correctAnswer?.message && (
                <p className="text-sm font-medium text-destructive">{errors.correctAnswer.message}</p>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={q.options.length >= MAX_OPTIONS}
                onClick={() => updateQuestion(qIndex, { options: [...q.options, ""] })}
                data-testid={`button-${idPrefix}-add-option-${qIndex}`}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            </div>
          );
        })}
      </div>
    </>
  );
}

function LessonQuizField({ form, quizzes }: { form: UseFormReturn<LessonFormData>; quizzes: Quiz[] }) {
  return (
    <FormField
      control={form.control}
      name="quizId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Quiz</FormLabel>
          <Select
            onValueChange={(value) => field.onChange(value === NO_QUIZ ? null : value)}
            value={field.value ?? NO_QUIZ}
          >
            <FormControl>
              <SelectTrigger data-testid="select-lesson-quiz">
                <SelectValue placeholder="No quiz" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value={NO_QUIZ}>No quiz</SelectItem>
              {quizzes.map((quiz) => (
                <SelectItem key={quiz.id} value={quiz.id}>
                  {quiz.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Participants complete this lesson by passing the quiz.
          </p>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface ModuleWithLessons extends Module {
  lessons?: Lesson[];
  cohortName?: string;
}

interface AdminCurriculumManagerProps {
  /** Optional lifted cohort selection, so it survives the parent switching tabs. */
  selectedCohort?: string | null;
  onSelectedCohortChange?: (cohortId: string | null) => void;
}

export default function AdminCurriculumManager({
  selectedCohort: controlledCohort,
  onSelectedCohortChange,
}: AdminCurriculumManagerProps = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [localCohort, setLocalCohort] = useState<string | null>(null);
  const selectedCohort = controlledCohort !== undefined ? controlledCohort : localCohort;
  const setSelectedCohort = (cohortId: string | null) => {
    if (onSelectedCohortChange) onSelectedCohortChange(cohortId);
    else setLocalCohort(cohortId);
  };
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>("modules");
  
  // Dialog states
  const [isCreateModuleOpen, setIsCreateModuleOpen] = useState(false);
  const [isCreateLessonOpen, setIsCreateLessonOpen] = useState(false);
  const [isCreateQuizOpen, setIsCreateQuizOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [duplicatingModule, setDuplicatingModule] = useState<Module | null>(null);
  const [duplicateTargetCohort, setDuplicateTargetCohort] = useState<string>("");
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);

  // Forms
  const moduleForm = useForm<ModuleFormData>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: {
      title: "",
      description: "",
      cohortId: "",
      week: 1,
      orderIndex: 0,
    },
  });

  const lessonForm = useForm<LessonFormData>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: {
      title: "",
      content: "",
      moduleId: "",
      orderIndex: 0,
      media: [],
      quizId: null,
    },
  });

  const quizForm = useForm<QuizFormData>({
    resolver: zodResolver(quizFormSchema),
    defaultValues: {
      title: "",
      questions: [{ question: "", options: ["", ""], correctAnswer: 0 }],
      passThreshold: 70,
      maxAttempts: 3,
    },
  });

  // Populate forms with existing data when editing, reset when closing
  useEffect(() => {
    if (editingModule) {
      // Populate form with existing data
      moduleForm.reset({
        title: editingModule.title,
        description: editingModule.description || "",
        cohortId: editingModule.cohortId,
        week: editingModule.week,
        orderIndex: editingModule.orderIndex,
      });
    } else {
      // Reset to defaults when not editing
      moduleForm.reset({
        title: "",
        description: "",
        cohortId: "",
        week: 1,
        orderIndex: 0,
      });
    }
  }, [editingModule, moduleForm]);

  useEffect(() => {
    if (editingLesson) {
      // Populate form with existing data
      lessonForm.reset({
        title: editingLesson.title,
        content: editingLesson.content || "",
        moduleId: editingLesson.moduleId,
        orderIndex: editingLesson.orderIndex,
        media: editingLesson.media || [],
        quizId: editingLesson.quizId ?? null,
      });
    } else {
      // Reset to defaults when not editing
      lessonForm.reset({
        title: "",
        content: "",
        moduleId: "",
        orderIndex: 0,
        media: [],
        quizId: null,
      });
    }
  }, [editingLesson, lessonForm]);

  useEffect(() => {
    if (editingQuiz) {
      // Populate form with existing data
      quizForm.reset({
        title: editingQuiz.title,
        questions: toEditableQuestions(editingQuiz.questions),
        passThreshold: editingQuiz.passThreshold ?? 70,
        maxAttempts: editingQuiz.maxAttempts ?? 3,
      });
    } else {
      // Reset to defaults when not editing
      quizForm.reset({
        title: "",
        questions: [emptyQuestion()],
        passThreshold: 70,
        maxAttempts: 3,
      });
    }
  }, [editingQuiz, quizForm]);

  // Queries
  // Admin endpoint returns every cohort, including inactive ones
  const { data: cohorts = [], isLoading: isLoadingCohorts } = useQuery<Cohort[]>({
    queryKey: ['/api/admin/cohorts'],
  });

  const { data: modules = [], isLoading: isLoadingModules } = useQuery({
    queryKey: ['/api/admin/modules', { cohortId: selectedCohort }],
    queryFn: async () => {
      if (!selectedCohort) return [];
      const response = await apiRequest("GET", `/api/admin/modules?cohortId=${selectedCohort}`);
      return response.json();
    },
    enabled: !!selectedCohort,
  });

  const { data: allQuizzes = [], isLoading: isLoadingQuizzes } = useQuery<Quiz[]>({
    queryKey: ['/api/admin/quizzes'],
  });

  // Get lessons for selected module (used in Modules tab)
  const { data: lessons = [] } = useQuery({
    queryKey: ['/api/admin/lessons', { moduleId: selectedModule }],
    queryFn: async () => {
      if (!selectedModule) return [];
      const response = await apiRequest("GET", `/api/admin/lessons?moduleId=${selectedModule}`);
      return response.json();
    },
    enabled: !!selectedModule,
  });

  // Get all lessons for all modules in selected cohort (used in Lessons tab)
  const { data: allCohortLessons = [], isLoading: isLoadingAllLessons } = useQuery({
    queryKey: ['/api/admin/cohort-lessons', { cohortId: selectedCohort }],
    queryFn: async () => {
      if (!selectedCohort || !modules || modules.length === 0) return [];
      
      // Fetch lessons for all modules in this cohort
      const lessonPromises = (modules as Module[]).map(async (module) => {
        try {
          const response = await apiRequest("GET", `/api/admin/lessons?moduleId=${module.id}`);
          const moduleLessons = await response.json();
          return moduleLessons.map((lesson: Lesson) => ({
            ...lesson,
            moduleName: module.title,
            moduleWeek: module.week,
          }));
        } catch (error) {
          console.error(`Failed to fetch lessons for module ${module.id}:`, error);
          return [];
        }
      });

      const allLessons = await Promise.all(lessonPromises);
      return allLessons.flat();
    },
    enabled: !!selectedCohort && !!modules && Array.isArray(modules) && modules.length > 0,
  });

  // Mutations
  const createModuleMutation = useMutation({
    mutationFn: async (data: ModuleFormData) => {
      const response = await apiRequest("POST", "/api/admin/modules", data);
      return response.json();
    },
    onSuccess: () => {
      setIsCreateModuleOpen(false);
      moduleForm.reset();
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          (query.queryKey[0] === '/api/admin/modules' || query.queryKey[0] === '/api/admin/cohort-lessons')
      });
      // Force refetch the current modules query if selectedCohort exists
      if (selectedCohort) {
        queryClient.refetchQueries({ 
          queryKey: ['/api/admin/modules', { cohortId: selectedCohort }],
          exact: true 
        });
      }
      // Force refetch cohort lessons overview after module creation
      if (selectedCohort) {
        queryClient.refetchQueries({ 
          queryKey: ['/api/admin/cohort-lessons', { cohortId: selectedCohort }],
          exact: true 
        });
      }
      toast({ title: "Module created successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating module",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateModuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Module> }) => {
      const response = await apiRequest("PUT", `/api/admin/modules/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      setEditingModule(null);
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          (query.queryKey[0] === '/api/admin/modules' || query.queryKey[0] === '/api/admin/cohort-lessons')
      });
      // Force refetch cohort lessons overview after module update
      if (selectedCohort) {
        queryClient.refetchQueries({ 
          queryKey: ['/api/admin/cohort-lessons', { cohortId: selectedCohort }],
          exact: true 
        });
      }
      toast({ title: "Module updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating module",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (id: string) => {
      // DELETE returns 204 with no body
      await apiRequest("DELETE", `/api/admin/modules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          (query.queryKey[0] === '/api/admin/modules' || query.queryKey[0] === '/api/admin/cohort-lessons')
      });
      // Force refetch cohort lessons overview after module deletion
      if (selectedCohort) {
        queryClient.refetchQueries({ 
          queryKey: ['/api/admin/cohort-lessons', { cohortId: selectedCohort }],
          exact: true 
        });
      }
      toast({ title: "Module deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting module",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const duplicateModuleMutation = useMutation({
    mutationFn: async ({ id, newCohortId }: { id: string; newCohortId: string }) => {
      const response = await apiRequest("POST", `/api/admin/modules/${id}/duplicate`, { newCohortId });
      return response.json();
    },
    onSuccess: () => {
      setDuplicatingModule(null);
      setDuplicateTargetCohort("");
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          (query.queryKey[0] === '/api/admin/modules' || query.queryKey[0] === '/api/admin/cohort-lessons')
      });
      // Force refetch cohort lessons overview after module duplication
      if (selectedCohort) {
        queryClient.refetchQueries({ 
          queryKey: ['/api/admin/cohort-lessons', { cohortId: selectedCohort }],
          exact: true 
        });
      }
      toast({ title: "Module duplicated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error duplicating module",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createLessonMutation = useMutation({
    mutationFn: async (data: LessonFormData) => {
      const response = await apiRequest("POST", "/api/admin/lessons", data);
      return response.json();
    },
    onSuccess: () => {
      setIsCreateLessonOpen(false);
      lessonForm.reset();
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          (query.queryKey[0] === '/api/admin/lessons' || query.queryKey[0] === '/api/admin/cohort-lessons')
      });
      // Force refetch the current lessons query if selectedModule exists
      if (selectedModule) {
        queryClient.refetchQueries({ 
          queryKey: ['/api/admin/lessons', { moduleId: selectedModule }],
          exact: true 
        });
      }
      // Force refetch cohort lessons overview
      if (selectedCohort) {
        queryClient.refetchQueries({ 
          queryKey: ['/api/admin/cohort-lessons', { cohortId: selectedCohort }],
          exact: true 
        });
      }
      toast({ title: "Lesson created successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating lesson",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateLessonMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Lesson> }) => {
      const response = await apiRequest("PUT", `/api/admin/lessons/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      setEditingLesson(null);
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          (query.queryKey[0] === '/api/admin/lessons' || query.queryKey[0] === '/api/admin/cohort-lessons')
      });
      // Force refetch lessons for the module of the edited lesson
      if (editingLesson && editingLesson.moduleId) {
        queryClient.refetchQueries({ 
          queryKey: ['/api/admin/lessons', { moduleId: editingLesson.moduleId }],
          exact: true 
        });
      }
      // Also refetch for selectedModule if it exists and is different
      if (selectedModule && selectedModule !== editingLesson?.moduleId) {
        queryClient.refetchQueries({ 
          queryKey: ['/api/admin/lessons', { moduleId: selectedModule }],
          exact: true 
        });
      }
      // Force refetch cohort lessons overview
      if (selectedCohort) {
        queryClient.refetchQueries({ 
          queryKey: ['/api/admin/cohort-lessons', { cohortId: selectedCohort }],
          exact: true 
        });
      }
      toast({ title: "Lesson updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating lesson",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: string) => {
      // DELETE returns 204 with no body
      await apiRequest("DELETE", `/api/admin/lessons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          (query.queryKey[0] === '/api/admin/lessons' || query.queryKey[0] === '/api/admin/cohort-lessons')
      });
      if (selectedModule) {
        queryClient.refetchQueries({ 
          queryKey: ['/api/admin/lessons', { moduleId: selectedModule }],
          exact: true 
        });
      }
      // Force refetch cohort lessons overview
      if (selectedCohort) {
        queryClient.refetchQueries({ 
          queryKey: ['/api/admin/cohort-lessons', { cohortId: selectedCohort }],
          exact: true 
        });
      }
      toast({ title: "Lesson deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting lesson",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createQuizMutation = useMutation({
    mutationFn: async (data: QuizFormData) => {
      const response = await apiRequest("POST", "/api/admin/quizzes", data);
      return response.json();
    },
    onSuccess: () => {
      setIsCreateQuizOpen(false);
      quizForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/quizzes'] });
      toast({ title: "Quiz created successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating quiz",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateQuizMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Quiz> }) => {
      const response = await apiRequest("PUT", `/api/admin/quizzes/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      setEditingQuiz(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/quizzes'] });
      toast({ title: "Quiz updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating quiz",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteQuizMutation = useMutation({
    mutationFn: async (id: string) => {
      // DELETE returns 204 with no body
      await apiRequest("DELETE", `/api/admin/quizzes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/quizzes'] });
      toast({ title: "Quiz deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting quiz",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleCreateModule = (data: ModuleFormData) => {
    createModuleMutation.mutate(data);
  };

  const handleUpdateModule = (data: Partial<Module>) => {
    if (editingModule) {
      updateModuleMutation.mutate({ id: editingModule.id, data });
    }
  };

  const handleCreateLesson = (data: LessonFormData) => {
    createLessonMutation.mutate(data);
  };

  const handleUpdateLesson = (data: Partial<Lesson>) => {
    if (editingLesson) {
      updateLessonMutation.mutate({ id: editingLesson.id, data });
    }
  };

  const handleCreateQuiz = (data: QuizFormData) => {
    createQuizMutation.mutate(data);
  };

  const handleUpdateQuiz = (data: QuizFormData) => {
    if (editingQuiz) {
      updateQuizMutation.mutate({ id: editingQuiz.id, data });
    }
  };

  const toggleModuleExpansion = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
      setSelectedModule(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  // Computed data
  const modulesWithLessons: ModuleWithLessons[] = useMemo(() => {
    if (!modules || !Array.isArray(modules) || modules.length === 0) return [];
    
    return (modules as Module[]).map((module: Module) => {
      const cohort = (cohorts as Cohort[]).find((c: Cohort) => c.id === module.cohortId);
      return {
        ...module,
        cohortName: cohort?.name || "Unknown Cohort",
        lessons: expandedModules.has(module.id) ? (lessons as Lesson[]) : undefined,
      };
    });
  }, [modules, cohorts, lessons, expandedModules]);

  if (isLoadingCohorts) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Curriculum Management
          </h2>
          <p className="text-muted-foreground">
            Manage modules, lessons, and quizzes for your accelerator program
          </p>
        </div>
      </div>

      {/* Cohort Selection */}
      <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Cohort
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select 
            value={selectedCohort || ""} 
            onValueChange={setSelectedCohort}
            data-testid="select-cohort"
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a cohort to manage curriculum" />
            </SelectTrigger>
            <SelectContent>
              {(cohorts as Cohort[]).map((cohort: Cohort) => (
                <SelectItem key={cohort.id} value={cohort.id}>
                  {cohortLabel(cohort)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCohort && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex w-full justify-start overflow-x-auto overflow-y-hidden h-auto sm:grid sm:grid-cols-3">
            <TabsTrigger value="modules" data-testid="tab-modules">
              <BookOpen className="h-4 w-4 mr-2" />
              Modules
            </TabsTrigger>
            <TabsTrigger value="lessons" data-testid="tab-lessons">
              <FileText className="h-4 w-4 mr-2" />
              Lessons
            </TabsTrigger>
            <TabsTrigger value="quizzes" data-testid="tab-quizzes">
              <HelpCircle className="h-4 w-4 mr-2" />
              Quizzes
            </TabsTrigger>
          </TabsList>

          {/* Modules Tab */}
          <TabsContent value="modules" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Curriculum Modules</h3>
              <Dialog
                open={isCreateModuleOpen}
                onOpenChange={(open) => {
                  if (open) {
                    // Pre-select the cohort currently being viewed
                    moduleForm.reset({
                      title: "",
                      description: "",
                      cohortId: selectedCohort || "",
                      week: 1,
                      orderIndex: 0,
                    });
                  }
                  setIsCreateModuleOpen(open);
                }}
              >
                <DialogTrigger asChild>
                  <Button data-testid="button-create-module">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Module
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Module</DialogTitle>
                  </DialogHeader>
                  <Form {...moduleForm}>
                    <form onSubmit={moduleForm.handleSubmit(handleCreateModule)} className="space-y-4">
                      <FormField
                        control={moduleForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Module Title</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., Introduction to AI Fundamentals" 
                                {...field} 
                                data-testid="input-module-title"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={moduleForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe what participants will learn in this module"
                                {...field} 
                                data-testid="input-module-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={moduleForm.control}
                          name="week"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Week Number</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min={1} 
                                  {...field} 
                                  data-testid="input-module-week"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={moduleForm.control}
                          name="orderIndex"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Order Index</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min={0} 
                                  {...field} 
                                  data-testid="input-module-order"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={moduleForm.control}
                        name="cohortId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cohort</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                              data-testid="select-module-cohort"
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select cohort" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(cohorts as Cohort[]).map((cohort: Cohort) => (
                                  <SelectItem key={cohort.id} value={cohort.id}>
                                    {cohortLabel(cohort)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsCreateModuleOpen(false)}
                          data-testid="button-cancel-module"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createModuleMutation.isPending}
                          data-testid="button-submit-module"
                        >
                          {createModuleMutation.isPending ? "Creating..." : "Create Module"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {isLoadingModules ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : modulesWithLessons.length === 0 ? (
              <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No modules yet</h3>
                  <p className="text-muted-foreground text-center">
                    Create your first curriculum module to get started.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {modulesWithLessons.map((module) => (
                  <Card key={module.id} className="border-white/10 bg-white/5 backdrop-blur-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Collapsible>
                          <CollapsibleTrigger 
                            onClick={() => toggleModuleExpansion(module.id)}
                            className="flex items-center gap-2 text-left"
                            data-testid={`button-expand-module-${module.id}`}
                          >
                            {expandedModules.has(module.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <div>
                              <CardTitle className="text-lg">{module.title}</CardTitle>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="outline">Week {module.week}</Badge>
                                <Badge variant="secondary">{module.cohortName}</Badge>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Order: {module.orderIndex}
                                </span>
                              </div>
                            </div>
                          </CollapsibleTrigger>
                        </Collapsible>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setDuplicateTargetCohort("");
                              setDuplicatingModule(module);
                            }}
                            aria-label={`Duplicate module ${module.title} to another cohort`}
                            title="Duplicate to another cohort"
                            data-testid={`button-duplicate-module-${module.id}`}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingModule(module)}
                            aria-label={`Edit module ${module.title}`}
                            title="Edit module"
                            data-testid={`button-edit-module-${module.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setConfirmRequest({
                              title: `Delete module "${module.title}"?`,
                              description: "This deletes the module and its lessons. This cannot be undone.",
                              onConfirm: () => deleteModuleMutation.mutate(module.id),
                            })}
                            aria-label={`Delete module ${module.title}`}
                            title="Delete module"
                            data-testid={`button-delete-module-${module.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-muted-foreground">{module.description}</p>
                    </CardHeader>
                    <Collapsible open={expandedModules.has(module.id)}>
                      <CollapsibleContent>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">Lessons</h4>
                              <Button
                                size="sm"
                                onClick={() => {
                                  lessonForm.setValue("moduleId", module.id);
                                  setIsCreateLessonOpen(true);
                                }}
                                data-testid={`button-add-lesson-${module.id}`}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Lesson
                              </Button>
                            </div>
                            {module.lessons && module.lessons.length > 0 ? (
                              <div className="space-y-2">
                                {module.lessons.map((lesson: Lesson, index: number) => (
                                  <div
                                    key={lesson.id}
                                    className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5"
                                  >
                                    <div className="flex items-center gap-3">
                                      <Badge variant="outline">{index + 1}</Badge>
                                      <div>
                                        <div className="font-medium">{lesson.title}</div>
                                        <div className="text-sm text-muted-foreground">
                                          <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            Lesson {index + 1}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setEditingLesson(lesson)}
                                        aria-label={`Edit lesson ${lesson.title}`}
                                        title="Edit lesson"
                                        data-testid={`button-edit-lesson-${lesson.id}`}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setConfirmRequest({
                                          title: `Delete lesson "${lesson.title}"?`,
                                          description: "This cannot be undone.",
                                          onConfirm: () => deleteLessonMutation.mutate(lesson.id),
                                        })}
                                        aria-label={`Delete lesson ${lesson.title}`}
                                        title="Delete lesson"
                                        data-testid={`button-delete-lesson-${lesson.id}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-muted-foreground text-center py-4">
                                No lessons yet. Click "Add Lesson" to create the first one.
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Lessons Tab */}
          <TabsContent value="lessons" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">All Lessons</h3>
              <Dialog open={isCreateLessonOpen} onOpenChange={setIsCreateLessonOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-lesson">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Lesson
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Lesson</DialogTitle>
                  </DialogHeader>
                  <Form {...lessonForm}>
                    <form onSubmit={lessonForm.handleSubmit(handleCreateLesson)} className="space-y-4">
                      <FormField
                        control={lessonForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lesson Title</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., Introduction to Machine Learning" 
                                {...field} 
                                data-testid="input-lesson-title"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={lessonForm.control}
                        name="moduleId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Module</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-lesson-module">
                                  <SelectValue placeholder="Select module" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(modules as Module[]).map((module: Module) => (
                                  <SelectItem key={module.id} value={module.id}>
                                    {module.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={lessonForm.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Content</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter the lesson content, materials, and instructions"
                                className="min-h-[200px]"
                                {...field} 
                                data-testid="input-lesson-content"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Media Resources Section */}
                      <FormField
                        control={lessonForm.control}
                        name="media"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Media Resources</FormLabel>
                            <FormControl>
                              <div className="space-y-3">
                                {field.value.map((resource: string, index: number) => (
                                  <div key={index} className="flex items-center gap-2 p-3 border border-white/10 rounded-lg bg-white/5">
                                    <div className="flex-1">
                                      <Input
                                        placeholder="Enter URL or file reference (e.g., https://youtube.com/watch?v=..., file.pdf, https://docs.google.com/...)"
                                        value={resource}
                                        onChange={(e) => {
                                          const newResources = [...field.value];
                                          newResources[index] = e.target.value;
                                          field.onChange(newResources);
                                        }}
                                        data-testid={`input-lesson-resource-${index}`}
                                      />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {/* Resource type indicator */}
                                      {resource.includes('youtube.com') || resource.includes('youtu.be') || resource.includes('vimeo.com') ? (
                                        <Badge variant="secondary" className="text-xs">
                                          <PlayCircle className="h-3 w-3 mr-1" />
                                          Video
                                        </Badge>
                                      ) : resource.includes('.pdf') || resource.includes('pdf') ? (
                                        <Badge variant="secondary" className="text-xs">
                                          <FileText className="h-3 w-3 mr-1" />
                                          PDF
                                        </Badge>
                                      ) : resource.startsWith('http') ? (
                                        <Badge variant="secondary" className="text-xs">
                                          <ExternalLink className="h-3 w-3 mr-1" />
                                          Link
                                        </Badge>
                                      ) : resource ? (
                                        <Badge variant="secondary" className="text-xs">
                                          <FileText className="h-3 w-3 mr-1" />
                                          File
                                        </Badge>
                                      ) : null}
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          const newResources = field.value.filter((_: string, i: number) => i !== index);
                                          field.onChange(newResources);
                                        }}
                                        aria-label="Remove resource"
                                        title="Remove resource"
                                        data-testid={`button-remove-resource-${index}`}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    field.onChange([...field.value, ""]);
                                  }}
                                  className="w-full"
                                  data-testid="button-add-resource"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Media Resource
                                </Button>
                                <div className="text-sm text-muted-foreground">
                                  <p>Supported resources:</p>
                                  <ul className="list-disc list-inside space-y-1 mt-1">
                                    <li><strong>Video URLs:</strong> YouTube, Vimeo, or direct video links</li>
                                    <li><strong>PDF Files:</strong> Document links or uploaded files</li>
                                    <li><strong>External Links:</strong> Websites, articles, or other resources</li>
                                    <li><strong>File References:</strong> Any uploaded files or assets</li>
                                  </ul>
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <LessonQuizField form={lessonForm} quizzes={allQuizzes} />
                        <FormField
                          control={lessonForm.control}
                          name="orderIndex"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Order Index</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min={0} 
                                  {...field} 
                                  data-testid="input-lesson-order"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsCreateLessonOpen(false)}
                          data-testid="button-cancel-lesson"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createLessonMutation.isPending}
                          data-testid="button-submit-lesson"
                        >
                          {createLessonMutation.isPending ? "Creating..." : "Create Lesson"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
{/* Lesson Overview - All lessons grouped by module */}
            {isLoadingAllLessons ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : allCohortLessons.length > 0 ? (
              <div className="space-y-6">
                {/* Group lessons by module */}
                {modulesWithLessons.map((module) => {
                  const moduleLessons = allCohortLessons.filter((lesson: any) => lesson.moduleId === module.id);
                  
                  return (
                    <Card key={module.id} className="border-white/10 bg-white/5 backdrop-blur-sm">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <BookOpen className="h-5 w-5" />
                              {module.title}
                              <Badge variant="secondary" className="ml-2">
                                {moduleLessons.length} lesson{moduleLessons.length !== 1 ? 's' : ''}
                              </Badge>
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {module.cohortName} • Week {module.week}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              lessonForm.reset({
                                title: "",
                                content: "",
                                moduleId: module.id,
                                orderIndex: moduleLessons.length,
                                media: [],
                                quizId: null,
                              });
                              setIsCreateLessonOpen(true);
                            }}
                            data-testid={`button-add-lesson-overview-${module.id}`}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Lesson
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {moduleLessons.length > 0 ? (
                          <div className="space-y-2">
                            {moduleLessons.map((lesson: any, index: number) => (
                              <div
                                key={lesson.id}
                                className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5"
                              >
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline">{index + 1}</Badge>
                                  <div>
                                    <div className="font-medium">{lesson.title}</div>
                                    <div className="text-sm text-muted-foreground">
                                      <span className="flex items-center gap-2">
                                        <Clock className="h-3 w-3" />
                                        Lesson {index + 1}
                                        {lesson.media && lesson.media.length > 0 && (
                                          <>
                                            • <FileText className="h-3 w-3" />
                                            {lesson.media.length} resource{lesson.media.length !== 1 ? 's' : ''}
                                          </>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingLesson(lesson)}
                                    aria-label={`Edit lesson ${lesson.title}`}
                                    title="Edit lesson"
                                    data-testid={`button-edit-lesson-overview-${lesson.id}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setConfirmRequest({
                                      title: `Delete lesson "${lesson.title}"?`,
                                      description: "This cannot be undone.",
                                      onConfirm: () => deleteLessonMutation.mutate(lesson.id),
                                    })}
                                    aria-label={`Delete lesson ${lesson.title}`}
                                    title="Delete lesson"
                                    data-testid={`button-delete-lesson-overview-${lesson.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            No lessons in this module yet. Click "Add Lesson" to create the first one.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                <CardContent className="p-6">
                  <p className="text-muted-foreground text-center">
                    No lessons found for this cohort. Create modules and lessons to get started.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Quizzes Tab */}
          <TabsContent value="quizzes" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Assessment Quizzes</h3>
              <Dialog
                open={isCreateQuizOpen}
                onOpenChange={(open) => {
                  if (open) {
                    setEditingQuiz(null);
                    quizForm.reset({ title: "", questions: [emptyQuestion()], passThreshold: 70, maxAttempts: 3 });
                  }
                  setIsCreateQuizOpen(open);
                }}
              >
                <DialogTrigger asChild>
                  <Button data-testid="button-create-quiz">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Quiz
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Quiz</DialogTitle>
                  </DialogHeader>
                  <Form {...quizForm}>
                    <form onSubmit={quizForm.handleSubmit(handleCreateQuiz)} className="space-y-4">
                      <QuizFormFields form={quizForm} idPrefix="quiz" />
                      <div className="flex justify-end gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsCreateQuizOpen(false)}
                          data-testid="button-cancel-quiz"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createQuizMutation.isPending}
                          data-testid="button-submit-quiz"
                        >
                          {createQuizMutation.isPending ? "Creating..." : "Create Quiz"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {isLoadingQuizzes ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : !allQuizzes || !Array.isArray(allQuizzes) || allQuizzes.length === 0 ? (
              <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No quizzes yet</h3>
                  <p className="text-muted-foreground text-center">
                    Create your first assessment quiz to test participant knowledge.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {(allQuizzes as Quiz[]).map((quiz: Quiz) => (
                  <Card key={quiz.id} className="border-white/10 bg-white/5 backdrop-blur-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{quiz.title}</CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline">{Array.isArray(quiz.questions) ? quiz.questions.length : 0} questions</Badge>
                            <Badge variant="secondary">Pass: {quiz.passThreshold}%</Badge>
                            {quiz.maxAttempts && (
                              <span className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                Max attempts: {quiz.maxAttempts}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingQuiz(quiz)}
                            aria-label={`Edit quiz ${quiz.title}`}
                            title="Edit quiz"
                            data-testid={`button-edit-quiz-${quiz.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setConfirmRequest({
                              title: `Delete quiz "${quiz.title}"?`,
                              description: "Lessons using this quiz will no longer have a quiz. This cannot be undone.",
                              onConfirm: () => deleteQuizMutation.mutate(quiz.id),
                            })}
                            aria-label={`Delete quiz ${quiz.title}`}
                            title="Delete quiz"
                            data-testid={`button-delete-quiz-${quiz.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Duplicate Module Dialog */}
      <Dialog
        open={!!duplicatingModule}
        onOpenChange={(open) => {
          if (!open) {
            setDuplicatingModule(null);
            setDuplicateTargetCohort("");
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicate Module</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Copy "{duplicatingModule?.title}" and its lessons into another cohort.
            </p>
            <div className="space-y-2">
              <Label htmlFor="select-duplicate-cohort">Target cohort</Label>
              <Select value={duplicateTargetCohort} onValueChange={setDuplicateTargetCohort}>
                <SelectTrigger id="select-duplicate-cohort" data-testid="select-duplicate-cohort">
                  <SelectValue placeholder="Select target cohort" />
                </SelectTrigger>
                <SelectContent>
                  {cohorts
                    .filter((cohort) => cohort.id !== duplicatingModule?.cohortId)
                    .map((cohort) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        {cohortLabel(cohort)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {cohorts.filter((cohort) => cohort.id !== duplicatingModule?.cohortId).length === 0 && (
                <p className="text-xs text-muted-foreground">Create another cohort first to duplicate this module.</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDuplicatingModule(null);
                  setDuplicateTargetCohort("");
                }}
                data-testid="button-cancel-duplicate-module"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!duplicateTargetCohort || duplicateModuleMutation.isPending}
                onClick={() => {
                  if (duplicatingModule && duplicateTargetCohort) {
                    duplicateModuleMutation.mutate({ id: duplicatingModule.id, newCohortId: duplicateTargetCohort });
                  }
                }}
                data-testid="button-confirm-duplicate-module"
              >
                {duplicateModuleMutation.isPending ? "Duplicating..." : "Duplicate"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Module Dialog */}
      {editingModule && (
        <Dialog open={!!editingModule} onOpenChange={() => setEditingModule(null)}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Module</DialogTitle>
            </DialogHeader>
            <Form {...moduleForm}>
              <form onSubmit={moduleForm.handleSubmit(handleUpdateModule)} className="space-y-4">
                <FormField
                  control={moduleForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Module Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Introduction to AI Fundamentals" 
                          {...field} 
                          data-testid="input-edit-module-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={moduleForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe what participants will learn in this module"
                          {...field} 
                          data-testid="input-edit-module-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={moduleForm.control}
                    name="week"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Week Number</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={1} 
                            {...field} 
                            data-testid="input-edit-module-week"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={moduleForm.control}
                    name="orderIndex"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Index</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={0} 
                            {...field} 
                            data-testid="input-edit-module-order"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={moduleForm.control}
                  name="cohortId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cohort</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        data-testid="select-edit-module-cohort"
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select cohort" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(cohorts as Cohort[]).map((cohort: Cohort) => (
                            <SelectItem key={cohort.id} value={cohort.id}>
                              {cohortLabel(cohort)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setEditingModule(null)}
                    data-testid="button-cancel-edit-module"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateModuleMutation.isPending}
                    data-testid="button-save-module"
                  >
                    {updateModuleMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Lesson Dialog */}
      {editingLesson && (
        <Dialog open={!!editingLesson} onOpenChange={() => setEditingLesson(null)}>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Lesson</DialogTitle>
            </DialogHeader>
            <Form {...lessonForm}>
              <form onSubmit={lessonForm.handleSubmit(handleUpdateLesson)} className="space-y-4">
                <FormField
                  control={lessonForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lesson Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Introduction to Machine Learning" 
                          {...field} 
                          data-testid="input-edit-lesson-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={lessonForm.control}
                  name="moduleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Module</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-lesson-module">
                            <SelectValue placeholder="Select module" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(modules as Module[]).map((module: Module) => (
                            <SelectItem key={module.id} value={module.id}>
                              {module.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={lessonForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter the lesson content, materials, and instructions"
                          className="min-h-[200px]"
                          {...field} 
                          data-testid="input-edit-lesson-content"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Media Resources Section */}
                <FormField
                  control={lessonForm.control}
                  name="media"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Media Resources</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          {field.value.map((resource: string, index: number) => (
                            <div key={index} className="flex items-center gap-2 p-3 border border-white/10 rounded-lg bg-white/5">
                              <div className="flex-1">
                                <Input
                                  placeholder="Enter URL or file reference (e.g., https://youtube.com/watch?v=..., file.pdf, https://docs.google.com/...)"
                                  value={resource}
                                  onChange={(e) => {
                                    const newResources = [...field.value];
                                    newResources[index] = e.target.value;
                                    field.onChange(newResources);
                                  }}
                                  data-testid={`input-edit-lesson-resource-${index}`}
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                {/* Resource type indicator */}
                                {resource.includes('youtube.com') || resource.includes('youtu.be') || resource.includes('vimeo.com') ? (
                                  <Badge variant="secondary" className="text-xs">
                                    <PlayCircle className="h-3 w-3 mr-1" />
                                    Video
                                  </Badge>
                                ) : resource.includes('.pdf') || resource.includes('pdf') ? (
                                  <Badge variant="secondary" className="text-xs">
                                    <FileText className="h-3 w-3 mr-1" />
                                    PDF
                                  </Badge>
                                ) : resource.startsWith('http') ? (
                                  <Badge variant="secondary" className="text-xs">
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Link
                                  </Badge>
                                ) : resource ? (
                                  <Badge variant="secondary" className="text-xs">
                                    <FileText className="h-3 w-3 mr-1" />
                                    File
                                  </Badge>
                                ) : null}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const newResources = field.value.filter((_: string, i: number) => i !== index);
                                    field.onChange(newResources);
                                  }}
                                  aria-label="Remove resource"
                                  title="Remove resource"
                                  data-testid={`button-remove-edit-resource-${index}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              field.onChange([...field.value, ""]);
                            }}
                            className="w-full"
                            data-testid="button-add-edit-resource"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Media Resource
                          </Button>
                          <div className="text-sm text-muted-foreground">
                            <p>Supported resources:</p>
                            <ul className="list-disc list-inside space-y-1 mt-1">
                              <li><strong>Video URLs:</strong> YouTube, Vimeo, or direct video links</li>
                              <li><strong>PDF Files:</strong> Document links or uploaded files</li>
                              <li><strong>External Links:</strong> Websites, articles, or other resources</li>
                              <li><strong>File References:</strong> Any uploaded files or assets</li>
                            </ul>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <LessonQuizField form={lessonForm} quizzes={allQuizzes} />
                  <FormField
                    control={lessonForm.control}
                    name="orderIndex"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Index</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={0} 
                            {...field} 
                            data-testid="input-edit-lesson-order"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setEditingLesson(null)}
                    data-testid="button-cancel-edit-lesson"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateLessonMutation.isPending}
                    data-testid="button-save-lesson"
                  >
                    {updateLessonMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Quiz Dialog */}
      {editingQuiz && (
        <Dialog open={!!editingQuiz} onOpenChange={() => setEditingQuiz(null)}>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Quiz</DialogTitle>
            </DialogHeader>
            <Form {...quizForm}>
              <form onSubmit={quizForm.handleSubmit(handleUpdateQuiz)} className="space-y-4">
                <QuizFormFields form={quizForm} idPrefix="edit-quiz" />
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setEditingQuiz(null)}
                    data-testid="button-cancel-edit-quiz"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateQuizMutation.isPending}
                    data-testid="button-save-quiz"
                  >
                    {updateQuizMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        request={confirmRequest}
        onOpenChange={(open) => { if (!open) setConfirmRequest(null); }}
      />
    </div>
  );
}