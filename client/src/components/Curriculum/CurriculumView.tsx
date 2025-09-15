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
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { Module, Lesson, Milestone, UserProgress } from "@shared/schema";
import {
  BookOpen,
  PlayCircle,
  CheckCircle,
  Clock,
  FileText,
  Video,
  Download,
  Award,
  Target,
  Users,
  Lightbulb,
  AlertCircle
} from "lucide-react";

export default function CurriculumView() {
  const { user } = useAuth();
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);

  // Fetch user's projects (enabled for non-administrators)
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects/my"],
    enabled: user?.role !== 'administrator',
  });

  // Fetch cohort data
  const { data: cohorts = [], isLoading: cohortsLoading } = useQuery<any[]>({
    queryKey: ["/api/cohorts"],
  });

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

  // Create progress map for easy lookup
  const progressMap = new Map(userProgress.map(p => [p.lessonId, p]));

  // Mutation to mark lesson complete
  const markCompleteMutation = useMutation({
    mutationFn: async ({ lessonId, score }: { lessonId: string; score?: number }) => {
      return apiRequest('POST', `/api/progress/lesson/${lessonId}/complete`, { score, timeSpent: 0 });
    },
    onSuccess: () => {
      // Invalidate progress queries
      queryClient.invalidateQueries({ queryKey: ['/api/progress/module', selectedModule] });
    },
    onError: (error) => {
      console.error('Failed to mark lesson complete:', error);
      // Could show toast notification here
    }
  });

  const toggleLessonComplete = async (lessonId: string) => {
    // Prevent administrators from marking lessons complete (read-only mode)
    if (user?.role === 'administrator') {
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
                        {cohort.isActive && (
                          <Badge variant="secondary" className="text-xs">Active</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                📖 You are viewing in read-only mode - lesson completion is disabled for administrators.
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
                              const isAdmin = user?.role === 'administrator';
                              return (
                                <Card key={lesson.id} className="bg-secondary/20 border-border/50">
                                  <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-start space-x-3 flex-1">
                                        <button
                                          onClick={() => toggleLessonComplete(lesson.id)}
                                          className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                            progress?.isCompleted
                                              ? 'bg-green-400 text-green-900' 
                                              : isAdmin
                                              ? 'bg-muted border border-border cursor-not-allowed opacity-50'
                                              : 'bg-secondary border border-border hover:bg-primary/10 transition-colors'
                                          }`}
                                          data-testid={`button-complete-lesson-${lesson.id}`}
                                          disabled={markCompleteMutation.isPending || isAdmin}
                                          title={isAdmin ? 'Completion disabled in admin mode' : 'Mark as complete'}
                                        >
                                          {progress?.isCompleted && (
                                            <CheckCircle className="w-4 h-4" />
                                          )}
                                        </button>
                                        <div className="flex-1 space-y-3">
                                          <div>
                                            <h4 className="font-semibold text-base leading-tight mb-2" data-testid={`lesson-title-${lesson.id}`}>
                                              {lesson.title}
                                            </h4>
                                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                              {lesson.content?.split('\n\n').map((paragraph, idx) => {
                                                const trimmed = paragraph.trim();
                                                if (!trimmed) return null;
                                                
                                                // Handle different content types
                                                if (trimmed.startsWith('##')) {
                                                  return (
                                                    <h3 key={idx} className="text-lg font-semibold text-primary mt-4 mb-2">
                                                      {trimmed.replace(/^##\s*/, '')}
                                                    </h3>
                                                  );
                                                }
                                                if (trimmed.startsWith('###')) {
                                                  return (
                                                    <h4 key={idx} className="text-base font-medium text-accent mt-3 mb-2">
                                                      {trimmed.replace(/^###\s*/, '')}
                                                    </h4>
                                                  );
                                                }
                                                if (trimmed.startsWith('- ')) {
                                                  const listItems = paragraph.split('\n').filter(line => line.trim().startsWith('- '));
                                                  return (
                                                    <ul key={idx} className="list-disc list-inside space-y-1 my-3 ml-2">
                                                      {listItems.map((item, itemIdx) => (
                                                        <li key={itemIdx} className="text-sm leading-relaxed">
                                                          {item.replace(/^-\s*/, '')}
                                                        </li>
                                                      ))}
                                                    </ul>
                                                  );
                                                }
                                                if (trimmed.includes('**') || trimmed.includes('*')) {
                                                  // Safe content rendering - parse markdown-style formatting
                                                  const parts: { text: string; type: 'normal' | 'bold' | 'italic' }[] = [];
                                                  let remainingText = trimmed;
                                                  
                                                  // Parse bold text (**text**)
                                                  const boldRegex = /\*\*([^*]+)\*\*/g;
                                                  let lastIndex = 0;
                                                  let match;
                                                  
                                                  while ((match = boldRegex.exec(remainingText)) !== null) {
                                                    // Add text before the bold
                                                    if (match.index > lastIndex) {
                                                      const beforeText = remainingText.slice(lastIndex, match.index);
                                                      if (beforeText) parts.push({ text: beforeText, type: 'normal' });
                                                    }
                                                    // Add bold text
                                                    parts.push({ text: match[1], type: 'bold' });
                                                    lastIndex = match.index + match[0].length;
                                                  }
                                                  
                                                  // Add remaining text
                                                  if (lastIndex < remainingText.length) {
                                                    const afterText = remainingText.slice(lastIndex);
                                                    if (afterText) parts.push({ text: afterText, type: 'normal' });
                                                  }
                                                  
                                                  // If no bold formatting found, check for italic
                                                  if (parts.length === 0) {
                                                    const italicRegex = /\*([^*]+)\*/g;
                                                    lastIndex = 0;
                                                    while ((match = italicRegex.exec(remainingText)) !== null) {
                                                      if (match.index > lastIndex) {
                                                        const beforeText = remainingText.slice(lastIndex, match.index);
                                                        if (beforeText) parts.push({ text: beforeText, type: 'normal' });
                                                      }
                                                      parts.push({ text: match[1], type: 'italic' });
                                                      lastIndex = match.index + match[0].length;
                                                    }
                                                    if (lastIndex < remainingText.length) {
                                                      const afterText = remainingText.slice(lastIndex);
                                                      if (afterText) parts.push({ text: afterText, type: 'normal' });
                                                    }
                                                  }
                                                  
                                                  // If no formatting found, treat as normal text
                                                  if (parts.length === 0) {
                                                    parts.push({ text: trimmed, type: 'normal' });
                                                  }
                                                  
                                                  return (
                                                    <p key={idx} className="text-sm leading-relaxed my-2">
                                                      {parts.map((part, partIdx) => {
                                                        if (part.type === 'bold') {
                                                          return (
                                                            <strong key={partIdx} className="font-semibold text-primary">
                                                              {part.text}
                                                            </strong>
                                                          );
                                                        } else if (part.type === 'italic') {
                                                          return (
                                                            <em key={partIdx} className="italic text-accent">
                                                              {part.text}
                                                            </em>
                                                          );
                                                        }
                                                        return part.text;
                                                      })}
                                                    </p>
                                                  );
                                                }
                                                return (
                                                  <p key={idx} className="text-sm leading-relaxed my-2">
                                                    {trimmed}
                                                  </p>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        {lesson.media?.some(m => m.includes('.mp4')) && (
                                          <Button size="sm" variant="outline" data-testid={`button-play-${lesson.id}`}>
                                            <PlayCircle className="w-3 h-3 mr-1" />
                                            Play
                                          </Button>
                                        )}
                                        {lesson.media?.some(m => m.includes('.pdf')) && (
                                          <Button size="sm" variant="outline" data-testid={`button-download-${lesson.id}`}>
                                            <Download className="w-3 h-3 mr-1" />
                                            PDF
                                          </Button>
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

          {/* Quick Actions */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full justify-start" 
                variant="outline"
                data-testid="button-download-materials"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Week Materials
              </Button>
              
              <Button 
                className="w-full justify-start" 
                variant="outline"
                data-testid="button-schedule-session"
              >
                <Users className="w-4 h-4 mr-2" />
                Schedule Mentor Session
              </Button>
              
              <Button 
                className="w-full justify-start" 
                variant="outline"
                data-testid="button-ai-coach"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Ask AI Coach
              </Button>
              
              <Button 
                className="w-full justify-start" 
                variant="outline"
                data-testid="button-view-assignments"
              >
                <FileText className="w-4 h-4 mr-2" />
                View Assignments
              </Button>
            </CardContent>
          </Card>

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
