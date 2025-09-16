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
  AlertCircle,
  Info
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
                                                      // Link [text](url)
                                                      elements.push(
                                                        <a
                                                          key={`link-${match.index}`}
                                                          href={match[7]}
                                                          className="text-primary hover:text-primary/80 underline underline-offset-2"
                                                          target="_blank"
                                                          rel="noopener noreferrer"
                                                        >
                                                          {match[6]}
                                                        </a>
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
