import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useLocalized } from "@/lib/localized";
import { intlLocale, type resources } from "@/i18n";
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
import { isAssignmentDone, type AssignmentStatus } from "@/lib/roadmapStatus";
import { ConnectorBadge, DropZone, MistPanel, StatusChip } from "@/components/brand";
import { cn } from "@/lib/utils";
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

function getMediaLabel(url: string, t: TFunction<["curriculum", "common"]>): { label: string; icon: "video" | "pdf" | "link" } {
  const lower = url.toLowerCase();
  if (lower.includes("youtube.com") || lower.includes("youtu.be") || lower.includes("vimeo.com") || lower.endsWith(".mp4")) {
    return { label: t("media.video"), icon: "video" };
  }
  if (lower.includes(".pdf")) return { label: t("media.pdf"), icon: "pdf" };
  return { label: t("media.resource"), icon: "link" };
}

type CommonItemType = keyof (typeof resources)["en"]["common"]["itemType"];
type ExtraItemType = keyof (typeof resources)["en"]["curriculum"]["itemType"];
const COMMON_ITEM_TYPES = ["task", "assignment", "deliverable", "milestone", "checkin", "learning"] as const;
const EXTRA_ITEM_TYPES = ["lesson", "mentor_session"] as const;

/** Label for a stored roadmap item type; the stored value itself is never changed. */
function itemTypeLabel(itemType: string, t: TFunction<["curriculum", "common"]>): string {
  if ((COMMON_ITEM_TYPES as readonly string[]).includes(itemType)) {
    return t(`common:itemType.${itemType as CommonItemType}`);
  }
  if ((EXTRA_ITEM_TYPES as readonly string[]).includes(itemType)) {
    return t(`itemType.${itemType as ExtraItemType}`);
  }
  return itemType.replace(/_/g, " ");
}

type ParticipantQuiz = {
  id: string;
  title: string;
  translations?: unknown;
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
  const { t } = useTranslation(["curriculum", "common"]);
  const localized = useLocalized();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  // `result` is the result currently on screen; `lastResult` survives "Try again"
  // so the attempt counter stays accurate while the quiz is retaken.
  const [result, setResult] = useState<QuizResult | null>(null);
  const [lastResult, setLastResult] = useState<QuizResult | null>(null);
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
      setLastResult(data);
      if (data.passed) {
        toast({ title: t("quiz.toast.passed.title"), description: t("quiz.toast.passed.description", { score: data.score }) });
        onPassed();
      } else {
        toast({
          title: t("quiz.toast.notPassed.title"),
          description: quiz
            ? t("quiz.toast.notPassed.descriptionWithThreshold", { score: data.score, threshold: quiz.passThreshold })
            : t("quiz.toast.notPassed.description", { score: data.score }),
          variant: "destructive",
        });
      }
    },
    onError: (err) => {
      const message = getErrorMessage(err, t("quiz.toast.submitFailed.description"));
      if (getErrorStatus(err) === 409) {
        setAttemptsExhausted(message);
        return;
      }
      toast({ title: t("quiz.toast.submitFailed.title"), description: message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="h-24 bg-secondary/30 rounded-lg animate-pulse" />;
  }

  if (error || !quiz) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("quiz.loadFailed")}
      </p>
    );
  }

  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
  // Display text only; answers are submitted by index against the base questions.
  const displayQuestions = localized.questions<ParticipantQuiz["questions"][number]>(quiz);
  const allAnswered = questions.length > 0 && questions.every((_, i) => answers[i] !== undefined);
  const maxAttempts = lastResult?.maxAttempts ?? quiz.maxAttempts;
  const noAttemptsLeft =
    !!attemptsExhausted ||
    (lastResult !== null && !lastResult.passed && maxAttempts != null && lastResult.attempts >= maxAttempts);
  // Attempt counter comes from the last submitted result (kept across "Try again").
  const attemptNumber = lastResult?.attempts;

  const handleSubmit = () => {
    if (!allAnswered || submitMutation.isPending) return;
    submitMutation.mutate(questions.map((_, i) => answers[i]));
  };

  // Reset to a fresh, unanswered quiz. Does not submit anything.
  const handleTryAgain = () => {
    setAnswers({});
    setResult(null);
  };

  return (
    <div className="border border-border rounded-lg p-4 space-y-4 bg-card" data-testid={`lesson-quiz-${lessonId}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h5 className="font-display font-medium text-sm flex items-center space-x-2">
          <HelpCircle className="w-4 h-4 text-primary" />
          <span>{localized.text(quiz, "title")}</span>
        </h5>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs">{t("quiz.passMark", { threshold: quiz.passThreshold })}</Badge>
          {maxAttempts != null && (
            <Badge variant="outline" className="text-xs">
              {attemptNumber !== undefined
                ? t("quiz.attemptOf", { attempt: attemptNumber, max: maxAttempts })
                : t("quiz.maxAttempts", { max: maxAttempts })}
            </Badge>
          )}
        </div>
      </div>

      {lessonCompleted && !result && (
        <p className="text-sm text-success">{t("quiz.alreadyCompleted")}</p>
      )}

      {displayQuestions.map((q, qIndex) => (
        <div key={qIndex} className="space-y-2">
          <p className="text-sm font-medium">
            {qIndex + 1}. {q.question}
          </p>
          <RadioGroup
            value={answers[qIndex] !== undefined ? String(answers[qIndex]) : ""}
            onValueChange={(value) => setAnswers((prev) => ({ ...prev, [qIndex]: Number(value) }))}
            disabled={!canSubmit || submitMutation.isPending || noAttemptsLeft || result !== null}
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
          className={`flex items-center space-x-2 text-sm rounded-md p-3 ${result.passed ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
          data-testid={`quiz-result-${lessonId}`}
        >
          {result.passed ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          <span>
            {result.passed
              ? t("quiz.result.passed", { correct: result.correct, total: result.total, score: result.score })
              : t("quiz.result.notPassed", { correct: result.correct, total: result.total, score: result.score })}
          </span>
        </div>
      )}

      {noAttemptsLeft && !result?.passed && (
        <p className="text-sm text-destructive" data-testid={`quiz-no-attempts-${lessonId}`}>
          {attemptsExhausted || t("quiz.noAttemptsLeft")}
        </p>
      )}

      {canSubmit ? (
        !result?.passed && !noAttemptsLeft && (
          result ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleTryAgain}
              data-testid={`button-retry-quiz-${lessonId}`}
            >
              {t("common:actions.tryAgain")}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!allAnswered || submitMutation.isPending}
              data-testid={`button-submit-quiz-${lessonId}`}
            >
              {submitMutation.isPending ? t("quiz.submitting") : t("quiz.submit")}
            </Button>
          )
        )
      ) : (
        <p className="text-xs text-muted-foreground">{t("quiz.participantsOnly")}</p>
      )}
    </div>
  );
}

export default function CurriculumView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation(["curriculum", "common"]);
  const localized = useLocalized();
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
        title: t("toast.completeFailed.title"),
        description: getErrorMessage(error, t("toast.completeFailed.description")),
        variant: "destructive",
      });
    }
  });

  // Mutation to update roadmap item status
  const updateRoadmapStatusMutation = useMutation({
    mutationFn: async ({ assignmentId, status }: { assignmentId: string; status: AssignmentStatus }) => {
      return apiRequest('PATCH', `/api/roadmap/assignments/${assignmentId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'roadmap'] });
      toast({
        title: t("toast.statusUpdated.title"),
        description: t("toast.statusUpdated.description"),
      });
    },
    onError: (error) => {
      console.error('Failed to update roadmap status:', error);
      toast({
        title: t("toast.statusFailed.title"),
        description: t("toast.statusFailed.description"),
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
          <Card key={i} className="animate-pulse">
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

  // Program week from the cohort start date (same rule as the dashboard), used for the timeline
  const programWeek = (() => {
    if (!currentCohort?.startDate) return 1;
    const elapsedWeeks = Math.floor((Date.now() - new Date(currentCohort.startDate).getTime()) / (7 * 24 * 60 * 60 * 1000));
    return Math.min(Math.max(elapsedWeeks + 1, 1), totalWeeks);
  })();
  const weekState = (week: number): "done" | "current" | "upcoming" =>
    week < programWeek ? "done" : week === programWeek ? "current" : "upcoming";

  // Better Empty States - only show after loading is complete
  if (!cohortsLoading && cohorts.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-10 h-10 mx-auto text-primary mb-4" />
          <h3 className="text-xl mb-2">{t("empty.noCohorts.title")}</h3>
          <p className="text-muted-foreground">
            {t("empty.noCohorts.body")}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!currentCohort) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-10 h-10 mx-auto text-primary mb-4" />
          <h3 className="text-xl mb-2">{t("empty.noCohort.title")}</h3>
          <p className="text-muted-foreground">
            {user?.role === 'administrator'
              ? t("empty.noCohort.admin")
              : t("empty.noCohort.participant")
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  const weekModules = getCurrentWeekModules();
  const isProgramWeekSelected = selectedWeek === programWeek;
  const WeekPanel = isProgramWeekSelected ? MistPanel : "div";

  return (
    <div className="space-y-6">
      {/* Administrator Cohort Selector */}
      {user?.role === 'administrator' && cohorts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("admin.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label className="font-display text-sm font-medium">{t("admin.cohortLabel")}</label>
              <Select
                value={selectedCohortId || currentCohort.id}
                onValueChange={setSelectedCohortId}
                data-testid="select-admin-cohort"
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("admin.cohortPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {cohorts.map((cohort: any) => (
                    <SelectItem
                      key={cohort.id}
                      value={cohort.id}
                      data-testid={`select-item-cohort-${cohort.id}`}
                    >
                      <div className="flex items-center space-x-2">
                        <span>{localized.text(cohort, "name")}</span>
                        {cohort.isActive ? (
                          <Badge variant="secondary" className="text-xs">{t("admin.active")}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">{t("admin.inactive")}</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("admin.viewingAs")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-xl">
              {t("overview.title", { cohort: localized.text(currentCohort, "name") })}
            </CardTitle>
            <Badge variant="outline" className="bg-secondary text-primary border-transparent" data-testid="completion-badge">
              {user?.role === 'administrator' ? t("overview.adminView") : t("overview.percentComplete", { percent: completionPercentage })}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={completionPercentage} className="h-2" data-testid="progress-bar" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="font-display text-3xl font-medium" data-testid="stat-modules">{modules.length}</p>
                <p className="font-display text-sm text-muted-foreground">{t("overview.stats.modules", { count: modules.length })}</p>
              </div>
              <div>
                <p className="font-display text-3xl font-medium" data-testid="stat-lessons">
                  {lessons.length}
                </p>
                <p className="font-display text-sm text-muted-foreground">{t("overview.stats.lessons", { count: lessons.length })}</p>
              </div>
              <div>
                <p className="font-display text-3xl font-medium" data-testid="stat-completed">
                  {userProgress.filter(p => p.isCompleted).length}
                </p>
                <p className="font-display text-sm text-muted-foreground">{t("overview.stats.completed")}</p>
              </div>
              <div>
                <p className="font-display text-3xl font-medium" data-testid="stat-milestones">{milestones.length}</p>
                <p className="font-display text-sm text-muted-foreground">{t("overview.stats.milestones", { count: milestones.length })}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 lg:grid-rows-[auto_1fr]">
        {/* Week timeline on a hairline */}
        <Card className="lg:col-start-3 lg:row-start-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg">{t("timeline.title")}</CardTitle>
              <span className="shrink-0 whitespace-nowrap font-display text-sm text-muted-foreground">
                {t("common:weekOf", { week: selectedWeek, total: totalWeeks })}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-2 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-px before:bg-primary/20 before:content-['']">
              {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => {
                const state = weekState(week);
                const moduleCount = modules.filter((m: Module) => m.week === week).length;
                const isSelected = selectedWeek === week;
                return (
                  <li key={week} className="relative flex items-center gap-3">
                    <ConnectorBadge state={state}>{week}</ConnectorBadge>
                    <button
                      type="button"
                      onClick={() => handleWeekChange(week)}
                      aria-pressed={isSelected}
                      className={cn(
                        "flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-3 py-2 text-left transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isSelected ? "bg-secondary text-primary" : "hover:bg-muted",
                      )}
                      data-testid={`button-week-${week}`}
                    >
                      <span className={cn("font-display text-sm", isSelected ? "font-medium" : "text-foreground")}>
                        {t("common:week", { week })}
                        {state === "current" && <span className="ml-2 text-xs text-accent">{t("timeline.current")}</span>}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {t("timeline.moduleCount", { count: moduleCount })}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        {/* Modules & Lessons */}
        <WeekPanel
          className={cn(
            "min-w-0 space-y-4 p-4 sm:p-6 lg:col-span-2 lg:col-start-1 lg:row-span-2 lg:row-start-1",
            !isProgramWeekSelected && "panel",
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <span>{t("week.modules", { week: selectedWeek })}</span>
            </h3>
            {isProgramWeekSelected && (
              <span className="font-display text-xs text-accent">{t("week.current")}</span>
            )}
          </div>

          {weekModules.length === 0 ? (
            <DropZone className="bg-card p-8">
              <BookOpen className="w-8 h-8 text-primary" />
              <p className="text-muted-foreground">{t("week.noModules")}</p>
            </DropZone>
          ) : (
            <div className="space-y-4">
              {weekModules.map((module: Module) => (
                <Card key={module.id}>
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                      <span data-testid={`module-title-${module.id}`}>{localized.text(module, "title")}</span>
                      <Badge variant="outline">{t("common:week", { week: module.week })}</Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground" data-testid={`module-description-${module.id}`}>
                      {localized.text(module, "description")}
                    </p>
                  </CardHeader>
                  
                  <CardContent>
                    {/* Learning Objectives */}
                    <div className="mb-4">
                      <h4 className="font-display font-medium text-sm mb-2 flex items-center space-x-1">
                        <Target className="w-4 h-4 text-primary" />
                        <span>{t("module.objectives")}</span>
                      </h4>
                      <ul className="space-y-1">
                        {localized.list(module, "objectives").map((objective, index) => (
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
                          className="font-display text-sm font-medium"
                          onClick={() => setSelectedModule(module.id)}
                        >
                          {t("module.lessons", { count: selectedModule === module.id ? lessons.length : 0 })}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="divide-y divide-border">
                            {selectedModule === module.id && (lessonsLoading || progressLoading) ? (
                              <div className="space-y-2">
                                {[1, 2].map((i) => (
                                  <div key={i} className="h-16 bg-muted/60 rounded-lg animate-pulse"></div>
                                ))}
                              </div>
                            ) : selectedModule === module.id && lessons.map((lesson) => {
                              const progress = progressMap.get(lesson.id);
                              return (
                                <div key={lesson.id} className="bg-card py-5 first:pt-2 last:pb-2">
                                  <div>
                                    <div className="space-y-4">
                                      <div className="flex-1 space-y-3">
                                          <div>
                                            <h4 className="font-display font-medium text-base leading-tight mb-2" data-testid={`lesson-title-${lesson.id}`}>
                                              {localized.text(lesson, "title")}
                                            </h4>
                                            <div className="space-y-4">
                                              {(() => {
                                                const content = localized.text(lesson, "content");
                                                
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
                                                      if (/learning\s*objectives?|objetivos?\s*de\s*aprendizaje/i.test(headingLower)) {
                                                        currentSection = {
                                                          type: 'objectives',
                                                          title: t("lessonContent.objectives"),
                                                          content: [],
                                                          icon: 'target'
                                                        };
                                                      } else if (/overview|resumen|descripci[oó]n\s*general/i.test(headingLower)) {
                                                        currentSection = {
                                                          type: 'overview',
                                                          title: t("lessonContent.overview"),
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
                                                        title: isFirstContent ? t("lessonContent.overview") : undefined,
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
                                                        <strong key={`bold-${match.index}`} className="font-semibold text-foreground">
                                                          {match[2]}
                                                        </strong>
                                                      );
                                                    } else if (match[3]) {
                                                      // Italic (*text*)
                                                      elements.push(
                                                        <em key={`italic-${match.index}`} className="italic">
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
                                                          className="text-accent hover:text-primary underline underline-offset-2"
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
                                                          <div className="w-8 h-8 rounded-lg bg-secondary text-primary flex items-center justify-center">
                                                            <Target className="w-4 h-4" />
                                                          </div>
                                                        )}
                                                        {section.type === 'section' && (
                                                          <div className="w-8 h-8 rounded-lg bg-secondary text-primary flex items-center justify-center">
                                                            <BookOpen className="w-4 h-4" />
                                                          </div>
                                                        )}
                                                        {section.type === 'overview' && (
                                                          <div className="w-8 h-8 rounded-lg bg-secondary text-primary flex items-center justify-center">
                                                            <Info className="w-4 h-4" />
                                                          </div>
                                                        )}
                                                        <h4 className="font-display text-base font-medium text-foreground">
                                                          {section.title}
                                                        </h4>
                                                      </div>
                                                    )}
                                                    
                                                    <div className="space-y-3">
                                                      {section.content.map((contentItem, itemIdx) => {
                                                        if (contentItem.type === 'subheading') {
                                                          return (
                                                            <h5 key={itemIdx} className="font-display text-sm font-medium text-primary mt-4 mb-2 flex items-center space-x-2">
                                                              <div className="w-px h-4 bg-primary/40"></div>
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
                                                              <div key={itemIdx} className="bg-secondary rounded-lg p-4">
                                                                <div className="grid grid-cols-1 gap-2">
                                                                  {items.map((item, objIdx) => (
                                                                    <div key={objIdx} className="flex items-start space-x-3">
                                                                      <div className="w-5 h-5 shrink-0 flex items-center justify-center mt-0.5 text-primary">
                                                                        <CheckCircle className="w-4 h-4" />
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
                                                              <div key={itemIdx} className="pl-1">
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
                                                                        <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0"></div>
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
                                                            <p key={itemIdx} className="text-sm leading-relaxed text-foreground">
                                                              {transformInlineMarkdown(contentItem.text!)}
                                                            </p>
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
                                            const { label, icon } = getMediaLabel(media, t);
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
                                      <div className="border-t border-border pt-4">
                                        {canCompleteLessons ? (
                                          <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div className={cn("flex items-center gap-2 text-sm", progress?.isCompleted ? "text-success" : "text-muted-foreground")}>
                                              {progress?.isCompleted && <CheckCircle className="w-4 h-4" />}
                                              {progress?.isCompleted
                                                ? t("lesson.completed")
                                                : lesson.quizId
                                                ? t("lesson.passQuiz")
                                                : t("lesson.markWhenDone")}
                                            </div>
                                            {(progress?.isCompleted || !lesson.quizId) && (
                                              <Button
                                                onClick={() => toggleLessonComplete(lesson.id)}
                                                disabled={markCompleteMutation.isPending || Boolean(progress?.isCompleted)}
                                                size="sm"
                                                variant={progress?.isCompleted ? 'outline' : 'default'}
                                                className={progress?.isCompleted ? 'border-success/30 bg-success/10 text-success disabled:opacity-100' : ''}
                                                data-testid={`button-complete-lesson-${lesson.id}`}
                                              >
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                {progress?.isCompleted
                                                  ? t("common:assignmentStatus.completed")
                                                  : markCompleteMutation.isPending ? t("lesson.marking") : t("lesson.markComplete")}
                                              </Button>
                                            )}
                                          </div>
                                        ) : (
                                          <p className="text-xs text-muted-foreground">
                                            {t("lesson.participantsOnly")}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    {/* Resources */}
                    {module.resources && module.resources.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-display font-medium text-sm mb-2 flex items-center space-x-1">
                          <FileText className="w-4 h-4 text-primary" />
                          <span>{t("module.resources")}</span>
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {localized.list(module, "resources").map((resource, index) => (
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
        </WeekPanel>

        {/* Sidebar - Milestones & Quick Actions */}
        <div className="space-y-6 lg:col-start-3 lg:row-start-2">
          {/* Week Milestones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="w-5 h-5 text-primary" />
                <span>{t("week.milestones", { week: selectedWeek })}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getCurrentWeekMilestones().length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("week.noMilestones")}</p>
              ) : (
                <div className="divide-y divide-border">
                  {getCurrentWeekMilestones().map((milestone: Milestone) => (
                    <div key={milestone.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center bg-secondary text-primary">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm" data-testid={`milestone-title-${milestone.id}`}>
                          {localized.text(milestone, "title")}
                        </p>
                        {milestone.description && (
                          <p className="text-xs text-muted-foreground mb-1">
                            {localized.text(milestone, "description")}
                          </p>
                        )}
                        {milestone.dueDate && (
                          <p className="font-display text-xs text-accent">
                            {t("due", { date: new Date(milestone.dueDate).toLocaleDateString(intlLocale()) })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Week Roadmap - For Participants Only */}
          {user?.role === 'participant' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ListTodo className="w-5 h-5 text-primary" />
                  <span>{t("week.roadmap", { week: selectedWeek })}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {roadmapLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse rounded-lg bg-muted/50 p-4">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : getCurrentWeekRoadmapItems().length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("week.noRoadmapItems")}</p>
                ) : (
                  <div className="divide-y divide-border">
                    {getCurrentWeekRoadmapItems().map((item: RoadmapItemWithAssignment) => (
                      <div key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                        <div className={cn(
                          "w-8 h-8 shrink-0 rounded-lg flex items-center justify-center",
                          item.assignment?.status === 'blocked'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-secondary text-primary',
                        )}>
                          {item.assignment?.status === 'completed' || item.assignment?.status === 'waived' ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : item.assignment?.status === 'blocked' ? (
                            <XCircle className="w-4 h-4" />
                          ) : item.assignment?.status === 'in_progress' ? (
                            <Play className="w-4 h-4 text-accent" />
                          ) : (
                            <Clock className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm mb-1" data-testid={`roadmap-title-${item.id}`}>
                            {localized.text(item, "title")}
                          </p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mb-2">
                              {localized.text(item, "description")}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Badge
                              variant="outline"
                              className="text-xs"
                              data-testid={`roadmap-type-${item.id}`}
                            >
                              {itemTypeLabel(item.type, t)}
                            </Badge>
                            {item.assignment ? (
                              (() => {
                                const assignment = item.assignment;
                                if (!assignment?.id) return null;
                                if (isAssignmentDone(assignment.status)) {
                                  return (
                                    <span data-testid={`roadmap-status-${item.id}`}>
                                      <StatusChip status={assignment.status} />
                                    </span>
                                  );
                                }
                                return (
                                  <div className="flex items-center gap-2">
                                    {assignment.status === 'blocked' && (
                                      <StatusChip status="blocked" />
                                    )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={updateRoadmapStatusMutation.isPending}
                                    onClick={() => handleRoadmapStatusUpdate(assignment.id as string, assignment.status as string)}
                                    className="text-xs"
                                    data-testid={`button-roadmap-${assignment.status}-${item.id}`}
                                  >
                                    {assignment.status === 'in_progress' ? (
                                      updateRoadmapStatusMutation.isPending ? t("roadmap.completing") : t("roadmap.complete")
                                    ) : (
                                      updateRoadmapStatusMutation.isPending ? t("roadmap.starting") : t("roadmap.start")
                                    )}
                                  </Button>
                                  </div>
                                );
                              })()
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                {t("roadmap.notAssigned")}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions - participants only */}
          {user?.role === 'participant' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("quickActions.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link href="/mentors" data-testid="button-schedule-session">
                    <Users className="w-4 h-4 mr-2" />
                    {t("quickActions.scheduleSession")}
                  </Link>
                </Button>
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link href="/roadmap" data-testid="button-view-assignments">
                    <ListTodo className="w-4 h-4 mr-2" />
                    {t("quickActions.viewRoadmap")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
