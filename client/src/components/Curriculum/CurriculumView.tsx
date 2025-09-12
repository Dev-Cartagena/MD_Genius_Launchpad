import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Lightbulb
} from "lucide-react";

interface Module {
  id: string;
  title: string;
  description: string;
  week: number;
  objectives: string[];
  resources: string[];
  orderIndex: number;
  lessons?: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  content: string;
  media: string[];
  prerequisites: string[];
  orderIndex: number;
  completed?: boolean;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  criteria: string[];
  requiredArtifacts: string[];
  dueDate: string;
  orderIndex: number;
  completed?: boolean;
}

export default function CurriculumView() {
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());

  // Fetch cohort data - using first active cohort for demo
  const { data: cohorts = [] } = useQuery({
    queryKey: ["/api/cohorts"],
  });

  const currentCohort = cohorts[0];

  // Fetch modules for current cohort
  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ["/api/cohorts", currentCohort?.id, "modules"],
    enabled: !!currentCohort?.id,
  });

  // Fetch milestones for current cohort
  const { data: milestones = [] } = useQuery({
    queryKey: ["/api/cohorts", currentCohort?.id, "milestones"],
    enabled: !!currentCohort?.id,
  });

  // Mock lessons for modules (in real app, would fetch from API)
  const moduleLessons: Record<string, Lesson[]> = {
    [modules[0]?.id]: [
      {
        id: "1",
        title: "Introduction to AI Entrepreneurship",
        content: "Overview of AI startup landscape and opportunities",
        media: ["intro-video.mp4", "slides.pdf"],
        prerequisites: [],
        orderIndex: 1,
        completed: true
      },
      {
        id: "2", 
        title: "Problem Identification Framework",
        content: "Systematic approach to identifying market problems suitable for AI solutions",
        media: ["framework-video.mp4", "template.pdf"],
        prerequisites: ["1"],
        orderIndex: 2,
        completed: false
      }
    ]
  };

  const toggleLessonComplete = (lessonId: string) => {
    const newCompleted = new Set(completedLessons);
    if (newCompleted.has(lessonId)) {
      newCompleted.delete(lessonId);
    } else {
      newCompleted.add(lessonId);
    }
    setCompletedLessons(newCompleted);
  };

  const getCompletionPercentage = () => {
    if (!modules.length) return 0;
    const totalLessons = modules.reduce((acc, module) => 
      acc + (moduleLessons[module.id]?.length || 0), 0);
    if (totalLessons === 0) return 0;
    return Math.round((completedLessons.size / totalLessons) * 100);
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

  if (modulesLoading) {
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

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Curriculum Progress</CardTitle>
            <Badge className="bg-accent/20 text-accent" data-testid="completion-badge">
              {completionPercentage}% Complete
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
                  {Object.values(moduleLessons).reduce((acc, lessons) => acc + lessons.length, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Lessons</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400" data-testid="stat-completed">
                  {completedLessons.size}
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
                onClick={() => setSelectedWeek(week)}
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
                        <AccordionTrigger className="text-sm font-semibold">
                          Lessons ({moduleLessons[module.id]?.length || 0})
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3">
                            {moduleLessons[module.id]?.map((lesson) => (
                              <div key={lesson.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <button
                                    onClick={() => toggleLessonComplete(lesson.id)}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                      completedLessons.has(lesson.id) || lesson.completed
                                        ? 'bg-green-400 text-green-900' 
                                        : 'bg-secondary border border-border'
                                    }`}
                                    data-testid={`button-complete-lesson-${lesson.id}`}
                                  >
                                    {(completedLessons.has(lesson.id) || lesson.completed) && (
                                      <CheckCircle className="w-4 h-4" />
                                    )}
                                  </button>
                                  <div>
                                    <p className="font-medium text-sm" data-testid={`lesson-title-${lesson.id}`}>
                                      {lesson.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {lesson.content}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  {lesson.media?.includes('.mp4') && (
                                    <Button size="sm" variant="outline" data-testid={`button-play-${lesson.id}`}>
                                      <PlayCircle className="w-3 h-3 mr-1" />
                                      Play
                                    </Button>
                                  )}
                                  {lesson.media?.includes('.pdf') && (
                                    <Button size="sm" variant="outline" data-testid={`button-download-${lesson.id}`}>
                                      <Download className="w-3 h-3 mr-1" />
                                      PDF
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
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
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            milestone.completed ? 'bg-green-400/20' : 'bg-yellow-400/20'
                          }`}>
                            {milestone.completed ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <Clock className="w-4 h-4 text-yellow-400" />
                            )}
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
