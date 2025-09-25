import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
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

// Form handling
import { useForm } from "react-hook-form";
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
  duration: z.coerce.number().min(1, "Duration must be at least 1 minute").optional(),
  media: z.array(z.string()).default([]),
});

const quizFormSchema = z.object({
  title: z.string().min(1, "Quiz title is required"),
  questions: z.array(z.object({
    question: z.string().min(1, "Question is required"),
    options: z.array(z.string()).min(2, "At least 2 options required"),
    correctAnswer: z.number().min(0, "Correct answer index required"),
  })).min(1, "At least one question required"),
  passThreshold: z.coerce.number().min(1).max(100, "Pass threshold must be between 1-100"),
  maxAttempts: z.coerce.number().min(1, "Max attempts must be at least 1").optional(),
});

type ModuleFormData = z.infer<typeof moduleFormSchema>;
type LessonFormData = z.infer<typeof lessonFormSchema>;
type QuizFormData = z.infer<typeof quizFormSchema>;

interface ModuleWithLessons extends Module {
  lessons?: Lesson[];
  cohortName?: string;
}

export default function AdminCurriculumManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null);
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
      });
    } else {
      // Reset to defaults when not editing
      lessonForm.reset({
        title: "",
        content: "",
        moduleId: "",
        orderIndex: 0,
        media: [],
      });
    }
  }, [editingLesson, lessonForm]);

  useEffect(() => {
    if (editingQuiz) {
      // Populate form with existing data
      quizForm.reset({
        title: editingQuiz.title,
        questions: editingQuiz.questions as { question: string; options: string[]; correctAnswer: number; }[],
        passThreshold: editingQuiz.passThreshold ?? 70,
        maxAttempts: editingQuiz.maxAttempts ?? 3,
      });
    } else {
      // Reset to defaults when not editing
      quizForm.reset({
        title: "",
        questions: [{ question: "", options: ["", ""], correctAnswer: 0 }],
        passThreshold: 70,
        maxAttempts: 3,
      });
    }
  }, [editingQuiz, quizForm]);

  // Queries
  const { data: cohorts = [], isLoading: isLoadingCohorts } = useQuery({
    queryKey: ['/api/cohorts'],
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

  const { data: allQuizzes = [], isLoading: isLoadingQuizzes } = useQuery({
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
      setIsCreateModuleOpen(false);
      moduleForm.reset();
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
      setEditingModule(null);
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
      const response = await apiRequest("DELETE", `/api/admin/modules/${id}`);
      return response.json();
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
      setIsCreateLessonOpen(false);
      lessonForm.reset();
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
      setEditingLesson(null);
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
      const response = await apiRequest("DELETE", `/api/admin/lessons/${id}`);
      return response.json();
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/quizzes'] });
      setIsCreateQuizOpen(false);
      quizForm.reset();
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/quizzes'] });
      setEditingQuiz(null);
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
      const response = await apiRequest("DELETE", `/api/admin/quizzes/${id}`);
      return response.json();
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

  const handleUpdateQuiz = (data: Partial<Quiz>) => {
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
                  {cohort.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCohort && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
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
              <Dialog open={isCreateModuleOpen} onOpenChange={setIsCreateModuleOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-module">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Module
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
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
                      <div className="grid grid-cols-2 gap-4">
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
                                    {cohort.name}
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
                              const targetCohort = (cohorts as Cohort[]).find((c: Cohort) => c.id !== module.cohortId);
                              if (targetCohort) {
                                duplicateModuleMutation.mutate({
                                  id: module.id,
                                  newCohortId: targetCohort.id,
                                });
                              }
                            }}
                            data-testid={`button-duplicate-module-${module.id}`}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingModule(module)}
                            data-testid={`button-edit-module-${module.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteModuleMutation.mutate(module.id)}
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
                                        data-testid={`button-edit-lesson-${lesson.id}`}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => deleteLessonMutation.mutate(lesson.id)}
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
                <DialogContent className="max-w-4xl">
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
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={lessonForm.control}
                          name="duration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Duration (minutes)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min={1} 
                                  {...field} 
                                  data-testid="input-lesson-duration"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
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
                                    data-testid={`button-edit-lesson-overview-${lesson.id}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => deleteLessonMutation.mutate(lesson.id)}
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
              <Dialog open={isCreateQuizOpen} onOpenChange={setIsCreateQuizOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-quiz">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Quiz
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Create New Quiz</DialogTitle>
                  </DialogHeader>
                  <Form {...quizForm}>
                    <form onSubmit={quizForm.handleSubmit(handleCreateQuiz)} className="space-y-4">
                      <FormField
                        control={quizForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quiz Title</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., Week 1 Assessment: AI Fundamentals" 
                                {...field} 
                                data-testid="input-quiz-title"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={quizForm.control}
                          name="passThreshold"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pass Threshold (%)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min={1} 
                                  max={100} 
                                  {...field} 
                                  data-testid="input-quiz-threshold"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={quizForm.control}
                          name="maxAttempts"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max Attempts</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min={1} 
                                  {...field} 
                                  data-testid="input-quiz-attempts"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Questions</h4>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              const currentQuestions = quizForm.getValues("questions");
                              quizForm.setValue("questions", [
                                ...currentQuestions,
                                { question: "", options: ["", ""], correctAnswer: 0 }
                              ]);
                            }}
                            data-testid="button-add-question"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Question
                          </Button>
                        </div>
                        {/* Quiz questions would be rendered here with a more complex form */}
                        <div className="p-4 border border-white/10 rounded-lg bg-white/5">
                          <p className="text-sm text-muted-foreground">
                            Quiz builder interface would be implemented here with dynamic question management
                          </p>
                        </div>
                      </div>
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
                            data-testid={`button-edit-quiz-${quiz.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteQuizMutation.mutate(quiz.id)}
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

      {/* Edit Module Dialog */}
      {editingModule && (
        <Dialog open={!!editingModule} onOpenChange={() => setEditingModule(null)}>
          <DialogContent className="max-w-2xl">
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
                <div className="grid grid-cols-2 gap-4">
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
                              {cohort.name}
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
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Edit Lesson</DialogTitle>
            </DialogHeader>
            <Form {...lessonForm}>
              <form onSubmit={lessonForm.handleSubmit(handleUpdateLesson)} className="space-y-4">
                {/* Similar form fields as create lesson */}
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
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Edit Quiz</DialogTitle>
            </DialogHeader>
            <Form {...quizForm}>
              <form onSubmit={quizForm.handleSubmit(handleUpdateQuiz)} className="space-y-4">
                {/* Similar form fields as create quiz */}
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
    </div>
  );
}