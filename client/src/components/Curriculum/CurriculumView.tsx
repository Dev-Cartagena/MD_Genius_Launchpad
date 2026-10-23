import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Module, Lesson, Milestone, UserProgress, RoadmapItem, AssignedRoadmap, RoadmapTemplate } from "@shared/schema";

// Extended roadmap types for curriculum integration
type RoadmapItemWithAssignment = RoadmapItem & {
  assignment: AssignedRoadmap | null;
};

type ProjectRoadmap = {
  template: RoadmapTemplate;
  items: RoadmapItemWithAssignment[];
};
import {
  BookOpen,
  PlayCircle,
  CheckCircle,
  Clock,
  FileText,
  Award,
  Target,
  Users,
  AlertCircle,
  Info,
  ListTodo,
  Play,
  ExternalLink,
  HelpCircle,
  XCircle
} from "lucide-react";

// Only allow http(s) and mailto links from curriculum markdown
function isSafeLinkUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim(), window.location.origin);
    return ["http:", "https:", "mailto:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// apiRequest errors look like "409: {\"message\":\"...\"}" - pull out the server message
function getErrorMessage(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : "";
  const body = raw.replace(/^\d{3}:\s*/, "");
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed.message === "string") return parsed.message;
  } catch {
    // not JSON
  }
  return body || fallback;
}

function getErrorStatus(error: unknown): number | null {
  const match = error instanceof Error ? error.message.match(/^(\d{3}):/) : null;
  return match ? Number(match[1]) : null;
}

function getMediaLabel(url: string): { label: string; icon: "video" | "pdf" | "link" } {
  const lower = url.toLowerCase();
  if (lower.includes("youtube.com") || lower.includes("youtu.be") || lower.includes("vimeo.com") || lower.endsWith(".mp4")) {
    return { label: "Video", icon: "video" };
  }
  if (lower.includes(".pdf")) return { label: "PDF", icon: "pdf" };
  return { label: "Resource", icon: "link" };
}

type ParticipantQuiz = {
  id: string;
  title: string;
  passThreshold: number;
  maxAttempts: number | null;
  questions: { question: string; options: string[] }[];
};

type QuizResult = {
  score: number;
  passed: boolean;
  correct: number;
  total: number;
  attempts: number;
  maxAttempts: number | null;
};

function LessonQuiz({
  lessonId,
  quizId,
  canSubmit,
  lessonCompleted,
  onPassed,
}: {
  lessonId: string;
  quizId: string;
  canSubmit: boolean;
  lessonCompleted: boolean;
  onPassed: () => void;
}) {
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [attemptsExhausted, setAttemptsExhausted] = useState<string | null>(null);

  const { data: quiz, isLoading, error } = useQuery<ParticipantQuiz>({
    queryKey: [`/api/quizzes/${quizId}`],
  });

  const submitMutation = useMutation({
    mutationFn: async (submitted: number[]) => {
      const response = await apiRequest("POST", `/api/lessons/${lessonId}/quiz/submit`, { answers: submitted });
      return (await response.json()) as QuizResult;
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.passed) {
        toast({ title: "Quiz passed", description: `You scored ${data.score}%. Lesson marked complete.` });
        onPassed();
      } else {
        toast({
          title: "Quiz not passed",
          description: `You scored ${data.score}%. ${quiz ? `You need ${quiz.passThreshold}% to pass.` : ""}`,
          variant: "destructive",
        });
      }
    },
    onError: (err) => {
      const message = getErrorMessage(err, "Failed to submit quiz. Please try again.");
      if (getErrorStatus(err) === 409) {
        setAttemptsExhausted(message);
        return;
      }
      toast({ title: "Quiz submission failed", description: message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="h-24 bg-secondary/30 rounded-lg animate-pulse" />;
  }

  if (error || !quiz) {
    return (
      <p className="text-sm text-muted-foreground">
        The quiz for this lesson could not be loaded.
      </p>
    );
  }

  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
  const allAnswered = questions.length > 0 && questions.every((_, i) => answers[i] !== undefined);
  const attemptsUsed = result?.attempts;
  const maxAttempts = result?.maxAttempts ?? quiz.maxAttempts;
  const noAttemptsLeft =
    !!attemptsExhausted ||
    (result !== null && !result.passed && maxAttempts != null && result.attempts >= maxAttempts);

  const handleSubmit = () => {
    if (!allAnswered) return;
    submitMutation.mutate(questions.map((_, i) => answers[i]));
  };

  return (
    <div className="border border-border/50 rounded-lg p-4 space-y-4 bg-background/50" data-testid={`lesson-quiz-${lessonId}`}>
      <div className="flex items-center justify-between">
        <h5 className="font-semibold text-sm flex items-center space-x-2">
          <HelpCircle className="w-4 h-4 text-primary" />
          <span>{quiz.title}</span>
        </h5>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">Pass: {quiz.passThreshold}%</Badge>
          {maxAttempts != null && (
            <Badge variant="outline" className="text-xs">
              {attemptsUsed !== undefined ? `Attempt ${attemptsUsed} of ${maxAttempts}` : `Max attempts: ${maxAttempts}`}
            </Badge>
          )}
        </div>
      </div>

      {lessonCompleted && !result && (
        <p className="text-sm text-green-500">You have already completed this lesson.</p>
      )}

      {questions.map((q, qIndex) => (
        <div key={qIndex} className="space-y-2">
          <p className="text-sm font-medium">
            {qIndex + 1}. {q.question}
          </p>
          <RadioGroup
            value={answers[qIndex] !== undefined ? String(answers[qIndex]) : ""}
            onValueChange={(value) => setAnswers((prev) => ({ ...prev, [qIndex]: Number(value) }))}
            disabled={!canSubmit || submitMutation.isPending || noAttemptsLeft}
          >
            {q.options.map((option, oIndex) => {
              const id = `quiz-${lessonId}-q${qIndex}-o${oIndex}`;
              return (
                <div key={oIndex} className="flex items-center space-x-2">
                  <RadioGroupItem value={String(oIndex)} id={id} data-testid={`radio-${id}`} />
                  <Label htmlFor={id} className="text-sm font-normal">{option}</Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>
      ))}

      {result && (
        <div
          className={`flex items-center space-x-2 text-sm rounded-md p-3 ${result.passed ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}`}
          data-testid={`quiz-result-${lessonId}`}
        >
          {result.passed ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span>
            {result.passed ? "Passed" : "Not passed"}: {result.correct} of {result.total} correct ({result.score}%).
          </span>
        </div>
      )}

      {noAttemptsLeft && !result?.passed && (
        <p className="text-sm text-destructive" data-testid={`quiz-no-attempts-${lessonId}`}>
          {attemptsExhausted || "You have no attempts left for this quiz."}
        </p>
      )}

      {canSubmit ? (
        !result?.passed && !noAttemptsLeft && (
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!allAnswered || submitMutation.isPending}
            data-testid={`button-submit-quiz-${lessonId}`}
          >
            {submitMutation.isPending ? "Submitting..." : result ? "Try again" : "Submit answers"}
          </Button>
        )
      ) : (
        <p className="text-xs text-muted-foreground">Quizzes are taken by program participants.</p>
      )}
    </div>
  );
}

export default function CurriculumView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);

  // Fetch user's projects (enabled for non-administrators)
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects/my"],
    enabled: user?.role !== 'administrator',
  });

  // Fetch cohort data
  // Administrators see every cohort (including inactive); everyone else sees active cohorts
  const { data: cohorts = [], isLoading: cohortsLoading } = useQuery<any[]>({
    queryKey: [user?.role === 'administrator' ? "/api/admin/cohorts" : "/api/cohorts"],
  });

  const canCompleteLessons = user?.role === 'participant' || user?.role === 'administrator';

  // Get current cohort based on user role and selected cohort
  const currentCohort = (() => {
    if (user?.role === 'administrator') {
      // For administrators, use selected cohort or default to first active cohort
      if (selectedCohortId) {
        return cohorts.find((c: any) => c.id === selectedCohortId);
      }
      return cohorts.find((c: any) => c.isActive) || cohorts[0];
    } else {
      // For participants, get cohort from their project assignment
      const currentProject = projects[0];
      return cohorts.find((c: any) => 
        currentProject?.cohortId ? c.id === currentProject.cohortId : c.isActive
      );
    }
  })();

  // Get current project for participants (for roadmap fetching)
  const currentProject = user?.role !== 'administrator' ? projects[0] : null;

  // Auto-select first active cohort for administrators on initial load
  useEffect(() => {
    if (user?.role === 'administrator' && cohorts.length > 0 && !selectedCohortId) {
      const firstActiveCohort = cohorts.find((c: any) => c.isActive) || cohorts[0];
      if (firstActiveCohort) {
        setSelectedCohortId(firstActiveCohort.id);
      }
    }
  }, [user?.role, cohorts, selectedCohortId]);

  // Reset state when administrators change cohorts
  useEffect(() => {
    if (user?.role === 'administrator' && selectedCohortId) {
      setSelectedWeek(1);
      setSelectedModule(null);
    }
  }, [selectedCohortId, user?.role]);

  // Fetch modules for current cohort
  const { data: modules = [], isLoading: modulesLoading } = useQuery<Module[]>({
    queryKey: [`/api/cohorts/${currentCohort?.id}/modules`],
    enabled: !!currentCohort?.id,
  });

  // Fetch milestones for current cohort
  const { data: milestones = [] } = useQuery<Milestone[]>({
    queryKey: [`/api/cohorts/${currentCohort?.id}/milestones`],
    enabled: !!currentCohort?.id,
  });

  // Fetch lessons for selected module
  const { data: lessons = [], isLoading: lessonsLoading } = useQuery<Lesson[]>({
    queryKey: ['/api/modules', selectedModule, 'lessons'],
    enabled: !!selectedModule,
  });

  // Fetch user progress for current module lessons
  const { data: userProgress = [], isLoading: progressLoading } = useQuery<UserProgress[]>({
    queryKey: ['/api/progress/module', selectedModule],
    enabled: !!selectedModule,
  });

  // Fetch roadmap for current project (participants only)
  const { data: roadmap, isLoading: roadmapLoading } = useQuery<ProjectRoadmap | null>({
    queryKey: ['/api/projects', currentProject?.id, 'roadmap'],
    enabled: !!currentProject?.id && user?.role !== 'administrator',
  });

  // Refresh lesson progress, cohort progress and roadmap (lesson completion can auto-complete roadmap items)
  const invalidateProgress = () => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && (
          key.startsWith('/api/progress') ||
          key.startsWith('/api/roadmap') ||
          (key === '/api/projects' && query.queryKey[2] === 'roadmap')
        );
      },
    });
  };

  // Create progress map for easy lookup
  const progressMap = new Map(userProgress.map(p => [p.lessonId, p]));

  // Mutation to mark lesson complete
  const markCompleteMutation = useMutation({
    mutationFn: async ({ lessonId, score }: { lessonId: string; score?: number }) => {
      return apiRequest('POST', `/api/progress/lesson/${lessonId}/complete`, { score, timeSpent: 0 });
    },
    onSuccess: () => {
      invalidateProgress();
    },
    onError: (error) => {
      toast({
        title: "Could not mark lesson complete",
        description: getErrorMessage(error, "Please try again."),
        variant: "destructive",
      });
    }
  });

  // Mutation to update roadmap item status
  const updateRoadmapStatusMutation = useMutation({
    mutationFn: async ({ assignmentId, status }: { assignmentId: string; status: 'not_started' | 'in_progress' | 'completed' }) => {
      return apiRequest('PATCH', `/api/roadmap/assignments/${assignmentId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'roadmap'] });
      toast({
        title: "Status Updated",
        description: "Roadmap item status has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Failed to update roadmap status:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update roadmap item status. Please try again.",
        variant: "destructive",
      });
    }
  });

  const toggleLessonComplete = async (lessonId: string) => {
    if (!canCompleteLessons) {
      return;
    }
    
    const progress = progressMap.get(lessonId);
    if (!progress?.isCompleted) {
      await markCompleteMutation.mutateAsync({ lessonId });
    }
  };

  const getCompletionPercentage = () => {
    if (!userProgress.length) return 0;
    const completedCount = userProgress.filter(p => p.isCompleted).length;
    return Math.round((completedCount / userProgress.length) * 100);
  };

  const getCurrentWeekModules = () => {
    return modules.filter((module: Module) => module.week === selectedWeek);
  };

  const getCurrentWeekMilestones = () => {
    return milestones.filter((milestone: Milestone) => {
      const dueWeek = Math.ceil(milestone.orderIndex / 2); // Approximate week based on order
      return dueWeek === selectedWeek;
    });
  };

  const getCurrentWeekRoadmapItems = () => {
    if (!roadmap || user?.role === 'administrator') return [];
    return roadmap.items.filter((item: RoadmapItemWithAssignment) => item.week === selectedWeek);
  };

  const handleRoadmapStatusUpdate = async (assignmentId: string, currentStatus: string) => {
    if (user?.role === 'administrator' || !assignmentId) return;
    
    // Server statuses: not_started | in_progress | completed | blocked | waived
    let newStatus: 'not_started' | 'in_progress' | 'completed';
    if (currentStatus === 'not_started' || currentStatus === 'blocked') {
      newStatus = 'in_progress';
    } else if (currentStatus === 'in_progress') {
      newStatus = 'completed';
    } else {
      return; // Already completed
    }
    
    await updateRoadmapStatusMutation.mutateAsync({ assignmentId, status: newStatus });
  };

  // Set selected module when week changes
  const handleWeekChange = (week: number) => {
    setSelectedWeek(week);
    const weekModules = modules.filter((module: Module) => module.week === week);
    if (weekModules.length > 0) {
      setSelectedModule(weekModules[0].id);
    }
  };

  // Auto-select first module on initial load
  useEffect(() => {
    if (modules.length > 0 && !selectedModule) {
      const weekModules = modules.filter((module: Module) => module.week === selectedWeek);
      if (weekModules.length > 0) {
        setSelectedModule(weekModules[0].id);
      }
    }
  }, [modules, selectedModule, selectedWeek]);

  // Show loading state while cohorts or modules are loading
  if (cohortsLoading || modulesLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="glass-card animate-pulse">
            <CardContent className="p-6">
              <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-muted rounded w-full mb-2"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalWeeks = Math.max(...modules.map((m: Module) => m.week), 8);
  const completionPercentage = getCompletionPercentage();

  // Better Empty States - only show after loading is complete
  if (!cohortsLoading && cohorts.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Cohorts Available</h3>
          <p className="text-muted-foreground">
            There are currently no active cohorts. Please contact an administrator to set up the curriculum.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!currentCohort) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Cohort Assigned</h3>
          <p className="text-muted-foreground">
            {user?.role === 'administrator' 
              ? 'Select a cohort to view its curriculum.' 
              : 'You have not been assigned to a cohort yet. Please contact an administrator.'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Administrator Cohort Selector */}
      {user?.role === 'administrator' && cohorts.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Admin Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Cohort to View</label>
              <Select 
                value={selectedCohortId || currentCohort.id} 
                onValueChange={setSelectedCohortId}
                data-testid="select-admin-cohort"
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a cohort" />
                </SelectTrigger>
                <SelectContent>
                  {cohorts.map((cohort: any) => (
                    <SelectItem 
                      key={cohort.id} 
                      value={cohort.id}
                      data-testid={`select-item-cohort-${cohort.id}`}
                    >
                      <div className="flex items-center space-x-2">
                        <span>{cohort.name}</span>
                        {cohort.isActive ? (
                          <Badge variant="secondary" className="text-xs">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                You are viewing the curriculum as an administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Overview */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              {currentCohort.name} - Curriculum Progress
            </CardTitle>
            <Badge className="bg-accent/20 text-accent" data-testid="completion-badge">
              {user?.role === 'administrator' ? 'Admin View' : `${completionPercentage}% Complete`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={completionPercentage} className="h-3" data-testid="progress-bar" />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary" data-testid="stat-modules">{modules.length}</p>
                <p className="text-sm text-muted-foreground">Modules</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-accent" data-testid="stat-lessons">
                  {lessons.length}
                </p>
                <p className="text-sm text-muted-foreground">Lessons</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400" data-testid="stat-completed">
                  {userProgress.filter(p => p.isCompleted).length}
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400" data-testid="stat-milestones">{milestones.length}</p>
                <p className="text-sm text-muted-foreground">Milestones</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Week Navigation */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Program Timeline</h3>
            <span className="text-sm text-muted-foreground">
              Week {selectedWeek} of {totalWeeks}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => (
              <Button
                key={week}
                variant={selectedWeek === week ? "default" : "outline"}
                size="sm"
                onClick={() => handleWeekChange(week)}
                className={selectedWeek === week ? "bg-primary" : ""}
                data-testid={`button-week-${week}`}
              >
                Week {week}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Week Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Modules & Lessons */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xl font-semibold flex items-center space-x-2">
            <BookOpen className="w-5 h-5" />
            <span>Week {selectedWeek} Modules</span>
          </h3>

          {getCurrentWeekModules().length === 0 ? (
            <Card className="glass-card">
              <CardContent className="p-8 text-center">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No modules available for this week.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {getCurrentWeekModules().map((module: Module) => (
                <Card key={module.id} className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span data-testid={`module-title-${module.id}`}>{module.title}</span>
                      <Badge variant="outline">Week {module.week}</Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground" data-testid={`module-description-${module.id}`}>
                      {module.description}
                    </p>
                  </CardHeader>
                  
                  <CardContent>
                    {/* Learning Objectives */}
                    <div className="mb-4">
                      <h4 className="font-semibold text-sm mb-2 flex items-center space-x-1">
                        <Target className="w-4 h-4" />
                        <span>Learning Objectives</span>
                      </h4>
                      <ul className="space-y-1">
                        {module.objectives?.map((objective, index) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-start space-x-2">
                            <span className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                            <span>{objective}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Lessons */}
                    <Accordion type="single" collapsible>
                      <AccordionItem value="lessons">
                        <AccordionTrigger 
                          className="text-sm font-semibold"
                          onClick={() => setSelectedModule(module.id)}
                        >
                          Lessons ({selectedModule === module.id ? lessons.length : 0})
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3">
                            {selectedModule === module.id && (lessonsLoading || progressLoading) ? (
                              <div className="space-y-2">
                                {[1, 2].map((i) => (
                                  <div key={i} className="h-16 bg-secondary/30 rounded-lg animate-pulse"></div>
                                ))}
                              </div>
                            ) : selectedModule === module.id && lessons.map((lesson) => {
                              const progress = progressMap.get(lesson.id);
                              return (
                                <Card key={lesson.id} className="bg-secondary/20 border-border/50">
                                  <CardContent className="p-4">
                                    <div className="space-y-4">
                                      <div className="flex-1 space-y-3">
                                          <div>
                                            <h4 className="font-semibold text-base leading-tight mb-2" data-testid={`lesson-title-${lesson.id}`}>
                                              {lesson.title}
                                            </h4>
                                            <div className="space-y-4">
                                              {(() => {
                                                const content = lesson.content || '';
                                                
                                                // Production-ready line-based content parser with robust state machine
                                                const parseContent = (rawContent: string) => {
                                                  const lines = rawContent.split('\n');
                                                  const processedSections: Array<{
                                                    type: 'overview' | 'objectives' | 'section' | 'content' | 'list' | 'paragraph';
                                                    title?: string;
                                                    content: Array<{
                                                      type: 'text' | 'list' | 'subheading';
                                                      text?: string;
                                                      items?: Array<{ text: string; isNumbered: boolean }>;
                                                    }>;
                                                    icon?: string;
                                                  }> = [];
                                                  
                                                  let currentSection: any = null;
                                                  let currentParagraph: string[] = [];
                                                  let currentList: Array<{ text: string; isNumbered: boolean }> = [];
                                                  let inListMode = false;
                                                  let listIsNumbered = false;
                                                  let isFirstContent = true;
                                                  
                                                  // Helper function to flush current paragraph
                                                  const flushParagraph = () => {
                                                    if (currentParagraph.length > 0) {
                                                      const paragraphText = currentParagraph.join(' ').trim();
                                                      if (paragraphText && currentSection) {
                                                        currentSection.content.push({
                                                          type: 'text',
                                                          text: paragraphText
                                                        });
                                                      }
                                                      currentParagraph = [];
                                                    }
                                                  };
                                                  
                                                  // Helper function to flush current list
                                                  const flushList = () => {
                                                    if (currentList.length > 0 && currentSection) {
                                                      currentSection.content.push({
                                                        type: 'list',
                                                        items: [...currentList]
                                                      });
                                                      currentList = [];
                                                    }
                                                    inListMode = false;
                                                    listIsNumbered = false;
                                                  };
                                                  
                                                  // Helper function to finalize current section
                                                  const finalizeSection = () => {
                                                    flushParagraph();
                                                    flushList();
                                                    if (currentSection && currentSection.content.length > 0) {
                                                      processedSections.push(currentSection);
                                                    }
                                                    currentSection = null;
                                                  };
                                                  
                                                  // Process each line with state machine
                                                  for (let i = 0; i < lines.length; i++) {
                                                    const line = lines[i];
                                                    const trimmed = line.trim();
                                                    
                                                    // Skip empty lines but use them to break context
                                                    if (!trimmed) {
                                                      if (inListMode) {
                                                        // Empty line breaks list
                                                        flushList();
                                                      } else if (currentParagraph.length > 0) {
                                                        // Empty line breaks paragraph
                                                        flushParagraph();
                                                      }
                                                      continue;
                                                    }
                                                    
                                                    // Check for main headings (##)
                                                    const headingMatch = trimmed.match(/^##\s*(.+)$/);
                                                    if (headingMatch) {
                                                      finalizeSection();
                                                      
                                                      const headingText = headingMatch[1];
                                                      const headingLower = headingText.toLowerCase();
                                                      
                                                      // Determine section type based on heading content
                                                      if (/learning\s*objectives?/i.test(headingLower)) {
                                                        currentSection = {
                                                          type: 'objectives',
                                                          title: 'Learning Objectives',
                                                          content: [],
                                                          icon: 'target'
                                                        };
                                                      } else if (/overview/i.test(headingLower)) {
                                                        currentSection = {
                                                          type: 'overview',
                                                          title: 'Overview',
                                                          content: [],
                                                          icon: 'info'
                                                        };
                                                      } else {
                                                        currentSection = {
                                                          type: 'section',
                                                          title: headingText,
                                                          content: [],
                                                          icon: 'book'
                                                        };
                                                      }
                                                      isFirstContent = false;
                                                      continue;
                                                    }
                                                    
                                                    // Check for subheadings (###)
                                                    const subheadingMatch = trimmed.match(/^###\s*(.+)$/);
                                                    if (subheadingMatch) {
                                                      flushParagraph();
                                                      flushList();
                                                      
                                                      if (!currentSection) {
                                                        currentSection = {
                                                          type: 'content',
                                                          content: []
                                                        };
                                                      }
                                                      
                                                      currentSection.content.push({
                                                        type: 'subheading',
                                                        text: subheadingMatch[1]
                                                      });
                                                      continue;
                                                    }
                                                    
                                                    // Check for list items (bullet or numbered)
                                                    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
                                                    const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
                                                    
                                                    if (bulletMatch || numberedMatch) {
                                                      flushParagraph();
                                                      
                                                      const isNumbered = !!numberedMatch;
                                                      const itemText = bulletMatch ? bulletMatch[1] : numberedMatch![1];
                                                      
                                                      // Check if we need to start a new list or continue existing
                                                      if (!inListMode || listIsNumbered !== isNumbered) {
                                                        flushList(); // Flush different list type
                                                        inListMode = true;
                                                        listIsNumbered = isNumbered;
                                                      }
                                                      
                                                      currentList.push({ text: itemText, isNumbered });
                                                      continue;
                                                    }
                                                    
                                                    // Regular text content
                                                    if (inListMode) {
                                                      flushList(); // End list mode for regular text
                                                    }
                                                    
                                                    // Initialize first section if none exists
                                                    if (!currentSection) {
                                                      currentSection = {
                                                        type: isFirstContent ? 'overview' : 'content',
                                                        title: isFirstContent ? 'Overview' : undefined,
                                                        content: [],
                                                        icon: isFirstContent ? 'info' : undefined
                                                      };
                                                      isFirstContent = false;
                                                    }
                                                    
                                                    // Add to current paragraph
                                                    currentParagraph.push(trimmed);
                                                  }
                                                  
                                                  // Finalize remaining content
                                                  finalizeSection();
                                                  
                                                  return processedSections;
                                                };
                                                
                                                // Comprehensive inline markdown transformer for all text content
                                                const transformInlineMarkdown = (text: string) => {
                                                  if (!text) return text;
                                                  
                                                  const elements: React.ReactNode[] = [];
                                                  let lastIndex = 0;
                                                  
                                                  // Enhanced regex for bold, italic, and links
                                                  const combinedRegex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(\[([^\]]+)\]\(([^)]+)\))/g;
                                                  let match;
                                                  
                                                  while ((match = combinedRegex.exec(text)) !== null) {
                                                    // Add text before the match
                                                    if (match.index > lastIndex) {
                                                      elements.push(text.slice(lastIndex, match.index));
                                                    }
                                                    
                                                    if (match[1]) {
                                                      // Bold (**text**)
                                                      elements.push(
                                                        <strong key={`bold-${match.index}`} className="font-semibold text-primary">
                                                          {match[2]}
                                                        </strong>
                                                      );
                                                    } else if (match[3]) {
                                                      // Italic (*text*)
                                                      elements.push(
                                                        <em key={`italic-${match.index}`} className="italic text-accent">
                                                          {match[4]}
                                                        </em>
                                                      );
                                                    } else if (match[5]) {
                                                      // Link [text](url) - only safe schemes become links
                                                      elements.push(
                                                        isSafeLinkUrl(match[7]) ? (
                                                        <a
                                                          key={`link-${match.index}`}
                                                          href={match[7]}
                                                          className="text-primary hover:text-primary/80 underline underline-offset-2"
                                                          target="_blank"
                                                          rel="noopener noreferrer"
                                                        >
                                                          {match[6]}
                                                        </a>
                                                        ) : (
                                                          <span key={`link-${match.index}`}>{match[6]}</span>
                                                        )
                                                      );
                                                    }
                                                    
                                                    lastIndex = match.index + match[0].length;
                                                  }
                                                  
                                                  // Add remaining text
                                                  if (lastIndex < text.length) {
                                                    elements.push(text.slice(lastIndex));
                                                  }
                                                  
                                                  return elements.length > 0 ? elements : text;
                                                };
                                                
                                                const processedSections = parseContent(content);
                                                
                                                return processedSections.map((section, sectionIdx) => (
                                                  <div key={sectionIdx} className="space-y-3">
                                                    {section.title && (
                                                      <div className="flex items-center space-x-2 mb-3">
                                                        {section.type === 'objectives' && (
                                                          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                                                            <Target className="w-4 h-4 text-accent" />
                                                          </div>
                                                        )}
                                                        {section.type === 'section' && (
                                                          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                                            <BookOpen className="w-4 h-4 text-primary" />
                                                          </div>
                                                        )}
                                                        {section.type === 'overview' && (
                                                          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                                            <Info className="w-4 h-4 text-blue-500" />
                                                          </div>
                                                        )}
                                                        <h4 className="text-base font-semibold text-foreground">
                                                          {section.title}
                                                        </h4>
                                                      </div>
                                                    )}
                                                    
                                                    <div className="space-y-3">
                                                      {section.content.map((contentItem, itemIdx) => {
                                                        if (contentItem.type === 'subheading') {
                                                          return (
                                                            <h5 key={itemIdx} className="text-sm font-semibold text-primary mt-4 mb-2 flex items-center space-x-2">
                                                              <div className="w-1 h-4 bg-primary rounded-full"></div>
                                                              <span>{transformInlineMarkdown(contentItem.text!)}</span>
                                                            </h5>
                                                          );
                                                        }
                                                        
                                                        if (contentItem.type === 'list') {
                                                          const items = contentItem.items!;
                                                          const isNumbered = items.length > 0 && items[0].isNumbered;
                                                          
                                                          if (section.type === 'objectives') {
                                                            // Special objectives styling
                                                            return (
                                                              <div key={itemIdx} className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                                                                <div className="grid grid-cols-1 gap-2">
                                                                  {items.map((item, objIdx) => (
                                                                    <div key={objIdx} className="flex items-start space-x-3">
                                                                      <div className="w-5 h-5 rounded border-2 border-accent/40 flex items-center justify-center mt-0.5 bg-background">
                                                                        <CheckCircle className="w-3 h-3 text-accent opacity-60" />
                                                                      </div>
                                                                      <p className="text-sm leading-relaxed text-foreground flex-1">
                                                                        {transformInlineMarkdown(item.text)}
                                                                      </p>
                                                                    </div>
                                                                  ))}
                                                                </div>
                                                              </div>
                                                            );
                                                          } else {
                                                            // Regular list styling
                                                            return (
                                                              <div key={itemIdx} className="bg-secondary/30 rounded-lg p-4">
                                                                {isNumbered ? (
                                                                  <ol className="space-y-2 list-decimal list-inside">
                                                                    {items.map((item, listItemIdx) => (
                                                                      <li key={listItemIdx} className="text-sm leading-relaxed text-foreground">
                                                                        <span className="ml-2">{transformInlineMarkdown(item.text)}</span>
                                                                      </li>
                                                                    ))}
                                                                  </ol>
                                                                ) : (
                                                                  <ul className="space-y-2">
                                                                    {items.map((item, listItemIdx) => (
                                                                      <li key={listItemIdx} className="flex items-start space-x-3">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                                                                        <span className="text-sm leading-relaxed text-foreground">
                                                                          {transformInlineMarkdown(item.text)}
                                                                        </span>
                                                                      </li>
                                                                    ))}
                                                                  </ul>
                                                                )}
                                                              </div>
                                                            );
                                                          }
                                                        }
                                                        
                                                        if (contentItem.type === 'text') {
                                                          return (
                                                            <div key={itemIdx} className="bg-background/50 rounded-lg p-4 border border-border/50">
                                                              <p className="text-sm leading-relaxed text-foreground">
                                                                {transformInlineMarkdown(contentItem.text!)}
                                                              </p>
                                                            </div>
                                                          );
                                                        }
                                                        
                                                        return null;
                                                      })}
                                                    </div>
                                                  </div>
                                                ));
                                              })()}
                                            </div>
                                          </div>
                                        </div>
                                      
                                      {/* Media Resources */}
                                      {lesson.media && lesson.media.filter(m => m && isSafeLinkUrl(m)).length > 0 && (
                                        <div className="flex flex-wrap items-center gap-2">
                                          {lesson.media.filter(m => m && isSafeLinkUrl(m)).map((media, mediaIndex) => {
                                            const { label, icon } = getMediaLabel(media);
                                            return (
                                              <Button key={mediaIndex} size="sm" variant="outline" asChild>
                                                <a
                                                  href={media}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  data-testid={`link-media-${lesson.id}-${mediaIndex}`}
                                                >
                                                  {icon === 'video' ? (
                                                    <PlayCircle className="w-3 h-3 mr-1" />
                                                  ) : icon === 'pdf' ? (
                                                    <FileText className="w-3 h-3 mr-1" />
                                                  ) : (
                                                    <ExternalLink className="w-3 h-3 mr-1" />
                                                  )}
                                                  {label}
                                                </a>
                                              </Button>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {/* Lesson Quiz */}
                                      {lesson.quizId && (
                                        <LessonQuiz
                                          lessonId={lesson.id}
                                          quizId={lesson.quizId}
                                          canSubmit={canCompleteLessons}
                                          lessonCompleted={Boolean(progress?.isCompleted)}
                                          onPassed={invalidateProgress}
                                        />
                                      )}

                                      {/* Lesson Completion */}
                                      <div className="border-t border-border/50 pt-4">
                                        {canCompleteLessons ? (
                                          <div className="flex items-center justify-between">
                                            <div className="text-sm text-muted-foreground">
                                              {progress?.isCompleted
                                                ? "✅ Lesson completed"
                                                : lesson.quizId
                                                ? "Pass the quiz above to complete this lesson"
                                                : "Mark this lesson as completed when you're done"}
                                            </div>
                                            {(progress?.isCompleted || !lesson.quizId) && (
                                              <Button
                                                onClick={() => toggleLessonComplete(lesson.id)}
                                                disabled={markCompleteMutation.isPending || Boolean(progress?.isCompleted)}
                                                size="sm"
                                                className={progress?.isCompleted ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
                                                data-testid={`button-complete-lesson-${lesson.id}`}
                                              >
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                {progress?.isCompleted
                                                  ? 'Completed'
                                                  : markCompleteMutation.isPending ? 'Marking...' : 'Mark as Complete'}
                                              </Button>
                                            )}
                                          </div>
                                        ) : (
                                          <p className="text-xs text-muted-foreground">
                                            Lesson completion is tracked for program participants.
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    {/* Resources */}
                    {module.resources && module.resources.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-sm mb-2 flex items-center space-x-1">
                          <FileText className="w-4 h-4" />
                          <span>Additional Resources</span>
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {module.resources.map((resource, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {resource}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar - Milestones & Quick Actions */}
        <div className="space-y-6">
          {/* Week Milestones */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Award className="w-5 h-5" />
                <span>Week {selectedWeek} Milestones</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getCurrentWeekMilestones().length === 0 ? (
                <p className="text-sm text-muted-foreground">No milestones this week.</p>
              ) : (
                <div className="space-y-3">
                  {getCurrentWeekMilestones().map((milestone: Milestone) => (
                    <Card key={milestone.id} className="bg-secondary/30">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-yellow-400/20`}>
                            <Clock className="w-4 h-4 text-yellow-400" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm" data-testid={`milestone-title-${milestone.id}`}>
                              {milestone.title}
                            </p>
                            <p className="text-xs text-muted-foreground mb-2">
                              {milestone.description}
                            </p>
                            {milestone.dueDate && (
                              <p className="text-xs text-accent">
                                Due: {new Date(milestone.dueDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Week Roadmap - For Participants Only */}
          {user?.role === 'participant' && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <ListTodo className="w-5 h-5" />
                  <span>Week {selectedWeek} Roadmap</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {roadmapLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <Card key={i} className="animate-pulse bg-secondary/30">
                        <CardContent className="p-4">
                          <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : getCurrentWeekRoadmapItems().length === 0 ? (
                  <p className="text-sm text-muted-foreground">No roadmap items this week.</p>
                ) : (
                  <div className="space-y-3">
                    {getCurrentWeekRoadmapItems().map((item: RoadmapItemWithAssignment) => (
                      <Card key={item.id} className="bg-secondary/30">
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              item.assignment?.status === 'completed' 
                                ? 'bg-green-400/20' 
                                : item.assignment?.status === 'in_progress'
                                ? 'bg-blue-400/20'
                                : 'bg-gray-400/20'
                            }`}>
                              {item.assignment?.status === 'completed' ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : item.assignment?.status === 'in_progress' ? (
                                <Play className="w-4 h-4 text-blue-400" />
                              ) : (
                                <Clock className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm mb-1" data-testid={`roadmap-title-${item.id}`}>
                                {item.title}
                              </p>
                              <p className="text-xs text-muted-foreground mb-2">
                                {item.description}
                              </p>
                              <div className="flex items-center justify-between">
                                <Badge 
                                  variant="outline" 
                                  className="text-xs"
                                  data-testid={`roadmap-type-${item.id}`}
                                >
                                  {item.type}
                                </Badge>
                                {item.assignment ? (
                                  (() => {
                                    const assignment = item.assignment;
                                    if (!assignment?.id) return null;
                                    return (
                                      <Button
                                        size="sm"
                                        variant={assignment.status === 'completed' ? "secondary" : "outline"}
                                        disabled={updateRoadmapStatusMutation.isPending || assignment.status === 'completed'}
                                        onClick={() => handleRoadmapStatusUpdate(assignment.id as string, assignment.status as string)}
                                        className="text-xs"
                                        data-testid={`button-roadmap-${assignment.status}-${item.id}`}
                                      >
                                        {assignment.status === 'completed' ? (
                                          'Completed'
                                        ) : assignment.status === 'in_progress' ? (
                                          updateRoadmapStatusMutation.isPending ? 'Completing...' : 'Complete'
                                        ) : (
                                          updateRoadmapStatusMutation.isPending ? 'Starting...' : 'Start'
                                        )}
                                      </Button>
                                    );
                                  })()
                                ) : (
                                  <Badge variant="secondary" className="text-xs">
                                    Not Assigned
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions - participants only */}
          {user?.role === 'participant' && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link href="/mentors" data-testid="button-schedule-session">
                    <Users className="w-4 h-4 mr-2" />
                    Schedule Mentor Session
                  </Link>
                </Button>
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link href="/roadmap" data-testid="button-view-assignments">
                    <ListTodo className="w-4 h-4 mr-2" />
                    View Roadmap
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Learning Path */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Learning Path</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => (
                  <div key={week} className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      week < selectedWeek ? 'bg-green-400' :
                      week === selectedWeek ? 'bg-primary' :
                      'bg-muted'
                    }`}></div>
                    <span className={`text-sm ${
                      week === selectedWeek ? 'font-medium text-primary' : 'text-muted-foreground'
                    }`}>
                      Week {week}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
