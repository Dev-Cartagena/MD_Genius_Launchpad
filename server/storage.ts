import {
  users,
  applications,
  projects,
  cohorts,
  modules,
  lessons,
  milestones,
  deliverables,
  artifacts,
  userProgress,
  quizzes,
  mentorProfiles,
  mentorSessions,
  investors,
  investorInterests,
  investorSessions,
  investorCohortParticipation,
  messages,
  aiConversations,
  fundingPrograms,
  disbursementRequests,
  scores,
  rubrics,
  roadmapTemplates,
  roadmapItems,
  assignedRoadmap,
  type User,
  type UpsertUser,
  type InsertUser,
  type Application,
  type InsertApplication,
  type Project,
  type InsertProject,
  type Cohort,
  type InsertCohort,
  type Module,
  type InsertModule,
  type Lesson,
  type InsertLesson,
  type Quiz,
  type InsertQuiz,
  type Milestone,
  type Deliverable,
  type InsertDeliverable,
  type Artifact,
  type InsertArtifact,
  type UserProgress,
  type InsertUserProgress,
  type Message,
  type InsertMessage,
  type AiConversation,
  type InsertAiConversation,
  type RoadmapTemplate,
  type InsertRoadmapTemplate,
  type RoadmapItem,
  type InsertRoadmapItem,
  type AssignedRoadmap,
  type InsertAssignedRoadmap,
  type MentorProfile,
  type InsertMentorProfile,
  type MentorSession,
  type InsertMentorSession,
  type Investor,
  type InsertInvestor,
  type InvestorInterest,
  type InvestorSession,
  type InsertInvestorSession,
  type InvestorCohortParticipation,
  type InsertInvestorCohortParticipation,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, ilike, or, gt, isNull, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  
  // Email/Password authentication operations
  getUserByEmail(email: string): Promise<User | undefined>;
  createLocalUser(userData: { email: string; firstName?: string; lastName?: string; role?: string }): Promise<User>;
  setPasswordHash(userId: string, passwordHash: string): Promise<void>;
  setResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  consumeResetToken(tokenHash: string): Promise<User | undefined>;
  updatePasswordByResetToken(tokenHash: string, newPasswordHash: string): Promise<boolean>;
  
  // Application operations
  createApplication(application: InsertApplication): Promise<Application>;
  getApplication(id: string): Promise<Application | undefined>;
  getApplicationsByUser(userId: string): Promise<Application[]>;
  getAllApplications(): Promise<Application[]>;
  updateApplicationStatus(id: string, status: any, reviewerNotes?: string): Promise<Application>;
  
  // Project operations
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByUser(userId: string): Promise<Project[]>;
  getProjectsByCohort(cohortId: string): Promise<Project[]>;
  getAllProjects(): Promise<Project[]>;
  updateProject(id: string, data: Partial<Project>): Promise<Project>;
  
  // Cohort operations
  getCohorts(): Promise<Cohort[]>;
  getActiveCohorts(): Promise<Cohort[]>;
  getCohort(id: string): Promise<Cohort | undefined>;
  createCohort(cohort: InsertCohort): Promise<Cohort>;
  updateCohort(id: string, data: Partial<Cohort>): Promise<Cohort>;
  
  // Curriculum operations
  getModule(id: string): Promise<Module | undefined>;
  getModulesByCohort(cohortId: string): Promise<Module[]>;
  getLessonsByModule(moduleId: string): Promise<Lesson[]>;
  getLesson(id: string): Promise<Lesson | undefined>;
  getMilestonesByCohort(cohortId: string): Promise<Milestone[]>;
  
  // User progress operations
  getUserProgress(userId: string, lessonId: string): Promise<UserProgress | undefined>;
  getUserProgressForModule(userId: string, moduleId: string): Promise<UserProgress[]>;
  getUserProgressForCohort(userId: string, cohortId: string): Promise<{
    totalLessons: number;
    completedLessons: number;
    completionPercentage: number;
    moduleProgress: Array<{
      moduleId: string;
      moduleName: string;
      week: number;
      totalLessons: number;
      completedLessons: number;
      completionPercentage: number;
    }>;
  }>;
  createOrUpdateUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
  markLessonComplete(userId: string, lessonId: string, score?: number, timeSpent?: number): Promise<UserProgress>;
  
  // Deliverable operations
  createDeliverable(deliverable: InsertDeliverable): Promise<Deliverable>;
  getDeliverablesByProject(projectId: string): Promise<Deliverable[]>;
  updateDeliverableStatus(id: string, status: any, feedback?: any): Promise<Deliverable>;
  
  // Artifact operations
  createArtifact(artifact: InsertArtifact): Promise<Artifact>;
  
  // Mentor operations
  getMentors(): Promise<User[]>;
  getMentorProfile(userId: string): Promise<MentorProfile | undefined>;
  createMentorProfile(profile: InsertMentorProfile): Promise<MentorProfile>;
  updateMentorProfile(userId: string, data: Partial<MentorProfile>): Promise<MentorProfile>;
  getMentorSessions(mentorId: string): Promise<MentorSession[]>;
  getParticipantSessions(participantId: string): Promise<MentorSession[]>;
  createMentorSession(session: InsertMentorSession): Promise<MentorSession>;
  updateMentorSession(sessionId: string, data: Partial<MentorSession>): Promise<MentorSession>;
  getMentorSession(sessionId: string): Promise<MentorSession | undefined>;
  
  // Investor operations
  getInvestors(): Promise<Investor[]>;
  getInvestor(id: string): Promise<Investor | undefined>;
  createInvestor(investor: InsertInvestor): Promise<Investor>;
  updateInvestor(id: string, data: Partial<Investor>): Promise<Investor>;
  deactivateInvestor(id: string): Promise<Investor>;
  getInvestorsByUser(userId: string): Promise<Investor[]>;
  
  // Investor interest management
  getInvestorInterests(projectId: string): Promise<InvestorInterest[]>;
  createInvestorInterest(interest: { investorId: string; projectId: string; level?: string; questions?: string[]; notes?: string }): Promise<InvestorInterest>;
  updateInvestorInterest(id: string, data: Partial<InvestorInterest>): Promise<InvestorInterest>;
  
  // Investor session management
  getInvestorSessions(investorId: string): Promise<InvestorSession[]>;
  getInvestorSessionsForParticipant(participantId: string): Promise<InvestorSession[]>;
  createInvestorSession(session: InsertInvestorSession): Promise<InvestorSession>;
  updateInvestorSession(sessionId: string, data: Partial<InvestorSession>): Promise<InvestorSession>;
  getInvestorSession(sessionId: string): Promise<InvestorSession | undefined>;
  cancelInvestorSession(sessionId: string): Promise<void>;
  
  // Investor-cohort participation management
  getInvestorCohortParticipation(investorId: string): Promise<InvestorCohortParticipation[]>;
  getCohortInvestors(cohortId: string): Promise<(InvestorCohortParticipation & { investor: Investor })[]>;
  getAllCohortAssignments(): Promise<InvestorCohortParticipation[]>;
  assignInvestorToCohort(participation: InsertInvestorCohortParticipation): Promise<InvestorCohortParticipation>;
  updateInvestorCohortRole(participationId: string, role: string): Promise<InvestorCohortParticipation>;
  removeInvestorFromCohort(participationId: string): Promise<void>;
  
  // AI Coach operations
  createAiConversation(conversation: InsertAiConversation): Promise<AiConversation>;
  getAiConversations(userId: string): Promise<AiConversation[]>;
  updateAiConversation(id: string, messages: any): Promise<AiConversation>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByThread(threadId: string): Promise<Message[]>;
  
  // Search operations
  searchUsers(query: string, role?: string): Promise<User[]>;
  searchProjects(query: string): Promise<Project[]>;
  
  // Roadmap operations
  // Template management
  createRoadmapTemplate(template: InsertRoadmapTemplate): Promise<RoadmapTemplate>;
  getRoadmapTemplate(id: string): Promise<RoadmapTemplate | undefined>;
  getRoadmapTemplates(cohortId?: string): Promise<RoadmapTemplate[]>;
  updateRoadmapTemplate(id: string, data: Partial<RoadmapTemplate>): Promise<RoadmapTemplate>;
  deleteRoadmapTemplate(id: string): Promise<void>;
  
  // Roadmap item management
  createRoadmapItem(item: InsertRoadmapItem): Promise<RoadmapItem>;
  getRoadmapItem(id: string): Promise<RoadmapItem | undefined>;
  getRoadmapItemsByTemplate(templateId: string): Promise<RoadmapItem[]>;
  getRoadmapItemsByWeek(templateId: string, week: number): Promise<RoadmapItem[]>;
  updateRoadmapItem(id: string, data: Partial<RoadmapItem>): Promise<RoadmapItem>;
  deleteRoadmapItem(id: string): Promise<void>;
  
  // Participant roadmap assignments
  getParticipantRoadmap(projectId: string): Promise<{
    template: RoadmapTemplate;
    items: Array<RoadmapItem & { assignment: AssignedRoadmap | null }>;
  } | undefined>;
  getParticipantRoadmapByWeek(projectId: string, week: number): Promise<Array<RoadmapItem & { assignment: AssignedRoadmap | null }>>;
  assignRoadmapToProject(projectId: string, templateId?: string): Promise<AssignedRoadmap[]>;
  updateRoadmapAssignment(assignmentId: string, data: Partial<AssignedRoadmap>): Promise<AssignedRoadmap>;
  completeRoadmapItem(assignmentId: string, evidenceArtifactId?: string, notes?: string): Promise<AssignedRoadmap>;
  
  // Auto-completion logic
  processAutoCompletions(projectId: string): Promise<AssignedRoadmap[]>;
  checkLessonAutoCompletion(userId: string, lessonId: string): Promise<string[]>; // Returns roadmap item IDs to auto-complete
  checkModuleAutoCompletion(userId: string, moduleId: string): Promise<string[]>;
  checkDeliverableAutoCompletion(projectId: string, deliverableId: string): Promise<string[]>;
  checkMilestoneAutoCompletion(projectId: string, milestoneId: string): Promise<string[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    // First check if user exists
    const existingUser = await this.getUser(id);
    if (!existingUser) {
      return undefined;
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(asc(users.createdAt));
  }

  // Email/Password authentication operations
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async createLocalUser(userData: { email: string; firstName?: string; lastName?: string; role?: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role as any || "public_visitor",
        emailVerified: false,
      })
      .returning();
    return user;
  }

  async setPasswordHash(userId: string, passwordHash: string): Promise<void> {
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async setResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await db
      .update(users)
      .set({ 
        passwordResetTokenHash: tokenHash, 
        passwordResetExpires: expiresAt,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async consumeResetToken(tokenHash: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.passwordResetTokenHash, tokenHash),
          gt(users.passwordResetExpires, new Date())
        )
      );
    return user;
  }

  async updatePasswordByResetToken(tokenHash: string, newPasswordHash: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ 
        passwordHash: newPasswordHash,
        passwordResetTokenHash: null,
        passwordResetExpires: null,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(users.passwordResetTokenHash, tokenHash),
          gt(users.passwordResetExpires, new Date())
        )
      )
      .returning({ id: users.id });
    
    return result.length > 0;
  }

  // Application operations
  async createApplication(application: InsertApplication): Promise<Application> {
    const [newApplication] = await db
      .insert(applications)
      .values(application)
      .returning();
    return newApplication;
  }

  async getApplication(id: string): Promise<Application | undefined> {
    const [application] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, id));
    return application;
  }

  async getApplicationsByUser(userId: string): Promise<Application[]> {
    return await db
      .select()
      .from(applications)
      .where(eq(applications.userId, userId))
      .orderBy(desc(applications.createdAt));
  }

  async getAllApplications(): Promise<Application[]> {
    return await db
      .select()
      .from(applications)
      .orderBy(desc(applications.createdAt));
  }

  async updateApplicationStatus(id: string, status: any, reviewerNotes?: string): Promise<Application> {
    const updateData: any = { status, updatedAt: new Date() };
    
    if (reviewerNotes) {
      // First fetch current application to get existing reviewer notes
      const [currentApp] = await db
        .select({ reviewerNotes: applications.reviewerNotes })
        .from(applications)
        .where(eq(applications.id, id));
      
      // Add new note to existing reviewer notes array
      const existingNotes = currentApp?.reviewerNotes || [];
      updateData.reviewerNotes = [...existingNotes, reviewerNotes];
    }
    
    const [updatedApplication] = await db
      .update(applications)
      .set(updateData)
      .where(eq(applications.id, id))
      .returning();
    return updatedApplication;
  }

  // Project operations
  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values(project)
      .returning();
    return newProject;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return project;
  }

  async getProjectsByUser(userId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.ownerId, userId))
      .orderBy(desc(projects.createdAt));
  }

  async getProjectsByCohort(cohortId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.cohortId, cohortId))
      .orderBy(desc(projects.createdAt));
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async getAllProjects(): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt));
  }

  // Cohort operations
  async getCohorts(): Promise<Cohort[]> {
    return await db
      .select()
      .from(cohorts)
      .orderBy(desc(cohorts.startDate));
  }

  async getActiveCohorts(): Promise<Cohort[]> {
    return await db
      .select()
      .from(cohorts)
      .where(eq(cohorts.isActive, true))
      .orderBy(desc(cohorts.startDate));
  }

  async getCohort(id: string): Promise<Cohort | undefined> {
    const [cohort] = await db
      .select()
      .from(cohorts)
      .where(eq(cohorts.id, id));
    return cohort;
  }

  async createCohort(cohort: InsertCohort): Promise<Cohort> {
    const [newCohort] = await db
      .insert(cohorts)
      .values(cohort)
      .returning();
    return newCohort;
  }

  async updateCohort(id: string, data: Partial<Cohort>): Promise<Cohort> {
    const [updatedCohort] = await db
      .update(cohorts)
      .set(data)
      .where(eq(cohorts.id, id))
      .returning();
    
    if (!updatedCohort) {
      throw new Error(`Cohort with id ${id} not found`);
    }
    
    return updatedCohort;
  }

  // Curriculum operations
  async getModule(id: string): Promise<Module | undefined> {
    const [module] = await db
      .select()
      .from(modules)
      .where(eq(modules.id, id));
    return module;
  }

  async getModulesByCohort(cohortId: string): Promise<Module[]> {
    return await db
      .select()
      .from(modules)
      .where(eq(modules.cohortId, cohortId))
      .orderBy(asc(modules.orderIndex));
  }

  async getLessonsByModule(moduleId: string): Promise<Lesson[]> {
    return await db
      .select()
      .from(lessons)
      .where(eq(lessons.moduleId, moduleId))
      .orderBy(asc(lessons.orderIndex));
  }

  async getLesson(id: string): Promise<Lesson | undefined> {
    const [lesson] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, id));
    return lesson;
  }

  async getMilestonesByCohort(cohortId: string): Promise<Milestone[]> {
    return await db
      .select()
      .from(milestones)
      .where(eq(milestones.cohortId, cohortId))
      .orderBy(asc(milestones.orderIndex));
  }

  // User progress operations
  async getUserProgress(userId: string, lessonId: string): Promise<UserProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userProgress)
      .where(and(eq(userProgress.userId, userId), eq(userProgress.lessonId, lessonId)));
    return progress;
  }

  async getUserProgressForModule(userId: string, moduleId: string): Promise<UserProgress[]> {
    return await db
      .select()
      .from(userProgress)
      .innerJoin(lessons, eq(userProgress.lessonId, lessons.id))
      .where(and(eq(userProgress.userId, userId), eq(lessons.moduleId, moduleId)))
      .then((rows: any[]) => rows.map((row: any) => row.user_progress));
  }

  async getUserProgressForCohort(userId: string, cohortId: string): Promise<{
    totalLessons: number;
    completedLessons: number;
    completionPercentage: number;
    moduleProgress: Array<{
      moduleId: string;
      moduleName: string;
      week: number;
      totalLessons: number;
      completedLessons: number;
      completionPercentage: number;
    }>;
  }> {
    // Get all modules for the cohort
    const cohortModules = await db
      .select()
      .from(modules)
      .where(eq(modules.cohortId, cohortId));

    // Calculate progress for each module
    const moduleProgress = await Promise.all(
      cohortModules.map(async (module) => {
        // Get all lessons for this module
        const moduleLessons = await db
          .select()
          .from(lessons)
          .where(eq(lessons.moduleId, module.id));

        // Get user progress for these lessons
        const progress = await db
          .select()
          .from(userProgress)
          .innerJoin(lessons, eq(userProgress.lessonId, lessons.id))
          .where(
            and(
              eq(userProgress.userId, userId),
              eq(lessons.moduleId, module.id),
              eq(userProgress.isCompleted, true)
            )
          );

        const totalLessons = moduleLessons.length;
        const completedLessons = progress.length;
        const completionPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

        return {
          moduleId: module.id,
          moduleName: module.title,
          week: module.week,
          totalLessons,
          completedLessons,
          completionPercentage,
        };
      })
    );

    // Calculate overall progress
    const totalLessons = moduleProgress.reduce((sum, mp) => sum + mp.totalLessons, 0);
    const completedLessons = moduleProgress.reduce((sum, mp) => sum + mp.completedLessons, 0);
    const completionPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      totalLessons,
      completedLessons,
      completionPercentage,
      moduleProgress: moduleProgress.sort((a, b) => a.week - b.week),
    };
  }

  async createOrUpdateUserProgress(progress: InsertUserProgress): Promise<UserProgress> {
    const [result] = await db
      .insert(userProgress)
      .values(progress)
      .onConflictDoUpdate({
        target: [userProgress.userId, userProgress.lessonId],
        set: {
          ...progress,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async markLessonComplete(userId: string, lessonId: string, score?: number, timeSpent?: number): Promise<UserProgress> {
    const progressData: InsertUserProgress = {
      userId,
      lessonId,
      isCompleted: true,
      completedAt: new Date(),
      score,
      timeSpent,
      attempts: 1, // TODO: Increment existing attempts
    };
    return this.createOrUpdateUserProgress(progressData);
  }

  // Curriculum Management Operations (Admin)
  async createModule(module: InsertModule): Promise<Module> {
    const [newModule] = await db
      .insert(modules)
      .values(module)
      .returning();
    return newModule;
  }

  async updateModule(id: string, data: Partial<Module>): Promise<Module> {
    const allowedFields = {
      title: data.title,
      description: data.description,
      week: data.week,
      objectives: data.objectives,
      resources: data.resources,
      orderIndex: data.orderIndex,
    };
    
    const updateData = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
    );
    
    const [updated] = await db
      .update(modules)
      .set(updateData)
      .where(eq(modules.id, id))
      .returning();
    return updated;
  }

  async deleteModule(id: string): Promise<void> {
    await db.delete(modules).where(eq(modules.id, id));
  }

  async createLesson(lesson: InsertLesson): Promise<Lesson> {
    const [newLesson] = await db
      .insert(lessons)
      .values(lesson)
      .returning();
    return newLesson;
  }

  async updateLesson(id: string, data: Partial<Lesson>): Promise<Lesson> {
    const allowedFields = {
      title: data.title,
      content: data.content,
      media: data.media,
      quizId: data.quizId,
      prerequisites: data.prerequisites,
      orderIndex: data.orderIndex,
    };
    
    const updateData = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
    );
    
    const [updated] = await db
      .update(lessons)
      .set(updateData)
      .where(eq(lessons.id, id))
      .returning();
    return updated;
  }

  async deleteLesson(id: string): Promise<void> {
    await db.delete(lessons).where(eq(lessons.id, id));
  }

  async duplicateModule(moduleId: string, newCohortId: string): Promise<Module> {
    // Get the original module
    const originalModule = await this.getModule(moduleId);
    if (!originalModule) {
      throw new Error('Module not found');
    }

    // Create new module
    const moduleData: InsertModule = {
      cohortId: newCohortId,
      title: originalModule.title,
      description: originalModule.description,
      week: originalModule.week,
      objectives: originalModule.objectives,
      resources: originalModule.resources,
      orderIndex: originalModule.orderIndex,
    };
    
    const newModule = await this.createModule(moduleData);

    // Get and duplicate lessons
    const originalLessons = await this.getLessonsByModule(moduleId);
    for (const lesson of originalLessons) {
      const lessonData: InsertLesson = {
        moduleId: newModule.id,
        title: lesson.title,
        content: lesson.content,
        media: lesson.media,
        quizId: lesson.quizId,
        prerequisites: lesson.prerequisites,
        orderIndex: lesson.orderIndex,
      };
      await this.createLesson(lessonData);
    }

    return newModule;
  }

  // Quiz Management Operations (Admin)
  async createQuiz(quiz: InsertQuiz): Promise<Quiz> {
    const [newQuiz] = await db
      .insert(quizzes)
      .values(quiz)
      .returning();
    return newQuiz;
  }

  async getQuiz(id: string): Promise<Quiz | undefined> {
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, id));
    return quiz;
  }

  async getAllQuizzes(): Promise<Quiz[]> {
    return await db
      .select()
      .from(quizzes)
      .orderBy(desc(quizzes.createdAt));
  }

  async updateQuiz(id: string, data: Partial<Quiz>): Promise<Quiz> {
    const allowedFields = {
      title: data.title,
      questions: data.questions,
      passThreshold: data.passThreshold,
      maxAttempts: data.maxAttempts,
    };
    
    const updateData = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
    );
    
    const [updated] = await db
      .update(quizzes)
      .set(updateData)
      .where(eq(quizzes.id, id))
      .returning();
    return updated;
  }

  async deleteQuiz(id: string): Promise<void> {
    await db.delete(quizzes).where(eq(quizzes.id, id));
  }

  // Deliverable operations
  async createDeliverable(deliverable: InsertDeliverable): Promise<Deliverable> {
    const [newDeliverable] = await db
      .insert(deliverables)
      .values(deliverable)
      .returning();
    return newDeliverable;
  }

  async getDeliverablesByProject(projectId: string): Promise<Deliverable[]> {
    return await db
      .select()
      .from(deliverables)
      .where(eq(deliverables.projectId, projectId))
      .orderBy(desc(deliverables.createdAt));
  }

  async updateDeliverableStatus(id: string, status: any, feedback?: any): Promise<Deliverable> {
    const updateData: any = { status };
    if (feedback) {
      updateData.feedback = feedback;
      updateData.reviewedAt = new Date();
    }
    
    const [updatedDeliverable] = await db
      .update(deliverables)
      .set(updateData)
      .where(eq(deliverables.id, id))
      .returning();
    return updatedDeliverable;
  }

  // Artifact operations
  async createArtifact(artifact: InsertArtifact): Promise<Artifact> {
    const [newArtifact] = await db
      .insert(artifacts)
      .values(artifact)
      .returning();
    return newArtifact;
  }

  // Mentor operations
  async getMentors(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.role, "mentor"))
      .orderBy(asc(users.firstName));
  }

  async getMentorProfile(userId: string): Promise<MentorProfile | undefined> {
    const [profile] = await db
      .select()
      .from(mentorProfiles)
      .where(eq(mentorProfiles.userId, userId));
    return profile;
  }

  async createMentorProfile(profile: InsertMentorProfile): Promise<MentorProfile> {
    const [newProfile] = await db
      .insert(mentorProfiles)
      .values(profile)
      .returning();
    return newProfile;
  }

  async updateMentorProfile(userId: string, data: Partial<MentorProfile>): Promise<MentorProfile> {
    // Whitelist allowed fields to prevent mass assignment security issues
    const allowedFields = {
      expertise: data.expertise,
      availability: data.availability,
      bio: data.bio,
      industries: data.industries,
      isActive: data.isActive,
    };
    
    // Remove undefined values
    const updateData = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
    );
    
    const [updated] = await db
      .update(mentorProfiles)
      .set(updateData)
      .where(eq(mentorProfiles.userId, userId))
      .returning();
    return updated;
  }

  async getMentorSessions(mentorId: string): Promise<MentorSession[]> {
    return await db
      .select()
      .from(mentorSessions)
      .where(eq(mentorSessions.mentorId, mentorId))
      .orderBy(desc(mentorSessions.startTime));
  }

  async getParticipantSessions(participantId: string): Promise<MentorSession[]> {
    return await db
      .select()
      .from(mentorSessions)
      .where(sql`${participantId} = ANY(${mentorSessions.participantIds})`)
      .orderBy(desc(mentorSessions.startTime));
  }

  async getAllMentorSessions(): Promise<MentorSession[]> {
    return await db
      .select()
      .from(mentorSessions)
      .orderBy(desc(mentorSessions.startTime));
  }

  async createMentorSession(session: InsertMentorSession): Promise<MentorSession> {
    const [newSession] = await db
      .insert(mentorSessions)
      .values(session)
      .returning();
    return newSession;
  }

  async updateMentorSession(sessionId: string, data: Partial<MentorSession>): Promise<MentorSession> {
    // Whitelist allowed fields to prevent mass assignment security issues
    const allowedFields = {
      title: data.title,
      startTime: data.startTime,
      endTime: data.endTime,
      agenda: data.agenda,
      notes: data.notes,
      attendance: data.attendance,
      meetingLink: data.meetingLink,
      participantIds: data.participantIds,
    };
    
    // Remove undefined values
    const updateData = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
    );
    
    const [updated] = await db
      .update(mentorSessions)
      .set(updateData)
      .where(eq(mentorSessions.id, sessionId))
      .returning();
    return updated;
  }

  async getMentorSession(sessionId: string): Promise<MentorSession | undefined> {
    const [session] = await db
      .select()
      .from(mentorSessions)
      .where(eq(mentorSessions.id, sessionId));
    return session;
  }

  // Investor operations
  async getInvestors(): Promise<Investor[]> {
    return await db
      .select()
      .from(investors)
      .where(eq(investors.isActive, true))
      .orderBy(asc(investors.organization));
  }

  async getInvestor(id: string): Promise<Investor | undefined> {
    const [investor] = await db
      .select()
      .from(investors)
      .where(eq(investors.id, id));
    return investor;
  }

  async createInvestor(investor: InsertInvestor): Promise<Investor> {
    const [newInvestor] = await db
      .insert(investors)
      .values(investor)
      .returning();
    return newInvestor;
  }

  async updateInvestor(id: string, data: Partial<Investor>): Promise<Investor> {
    const allowedFields = {
      organization: data.organization,
      contactEmail: data.contactEmail,
      sectors: data.sectors,
      stages: data.stages,
      geography: data.geography,
      checkSize: data.checkSize,
      preferences: data.preferences,
      ndaStatus: data.ndaStatus,
    };
    
    const updateData = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
    );
    
    const [updated] = await db
      .update(investors)
      .set(updateData)
      .where(eq(investors.id, id))
      .returning();
    return updated;
  }

  async deactivateInvestor(id: string): Promise<Investor> {
    const [updated] = await db
      .update(investors)
      .set({ isActive: false })
      .where(eq(investors.id, id))
      .returning();
    return updated;
  }

  async getInvestorsByUser(userId: string): Promise<Investor[]> {
    return await db
      .select()
      .from(investors)
      .where(and(eq(investors.userId, userId), eq(investors.isActive, true)))
      .orderBy(asc(investors.organization));
  }

  // Investor interest management
  async getInvestorInterests(projectId: string): Promise<InvestorInterest[]> {
    return await db
      .select()
      .from(investorInterests)
      .where(eq(investorInterests.projectId, projectId))
      .orderBy(desc(investorInterests.createdAt));
  }

  async createInvestorInterest(interest: { investorId: string; projectId: string; level?: string; questions?: string[]; notes?: string }): Promise<InvestorInterest> {
    const insertData = {
      investorId: interest.investorId,
      projectId: interest.projectId,
      level: interest.level as any,
      questions: interest.questions,
      notes: interest.notes,
    };
    
    const [newInterest] = await db
      .insert(investorInterests)
      .values(insertData)
      .returning();
    return newInterest;
  }

  async updateInvestorInterest(id: string, data: Partial<InvestorInterest>): Promise<InvestorInterest> {
    const allowedFields = {
      level: data.level,
      questions: data.questions,
      notes: data.notes,
      meetings: data.meetings,
    };
    
    const updateData = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
    );
    
    const [updated] = await db
      .update(investorInterests)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(investorInterests.id, id))
      .returning();
    return updated;
  }

  // Investor session management
  async getInvestorSessions(investorId: string): Promise<InvestorSession[]> {
    return await db
      .select()
      .from(investorSessions)
      .where(eq(investorSessions.investorId, investorId))
      .orderBy(desc(investorSessions.startTime));
  }

  async getInvestorSessionsForParticipant(participantId: string): Promise<InvestorSession[]> {
    return await db
      .select()
      .from(investorSessions)
      .where(sql`${participantId} = ANY(${investorSessions.participantIds})`)
      .orderBy(desc(investorSessions.startTime));
  }

  async createInvestorSession(session: InsertInvestorSession): Promise<InvestorSession> {
    const [newSession] = await db
      .insert(investorSessions)
      .values(session)
      .returning();
    return newSession;
  }

  async updateInvestorSession(sessionId: string, data: Partial<InvestorSession>): Promise<InvestorSession> {
    const allowedFields = {
      title: data.title,
      startTime: data.startTime,
      endTime: data.endTime,
      agenda: data.agenda,
      notes: data.notes,
      attendance: data.attendance,
      meetingLink: data.meetingLink,
      participantIds: data.participantIds,
      sessionType: data.sessionType,
    };
    
    const updateData = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
    );
    
    const [updated] = await db
      .update(investorSessions)
      .set(updateData)
      .where(eq(investorSessions.id, sessionId))
      .returning();
    return updated;
  }

  async getInvestorSession(sessionId: string): Promise<InvestorSession | undefined> {
    const [session] = await db
      .select()
      .from(investorSessions)
      .where(eq(investorSessions.id, sessionId));
    return session;
  }

  async cancelInvestorSession(sessionId: string): Promise<void> {
    await db
      .delete(investorSessions)
      .where(eq(investorSessions.id, sessionId));
  }

  // Investor-cohort participation management
  async getInvestorCohortParticipation(investorId: string): Promise<InvestorCohortParticipation[]> {
    return await db
      .select()
      .from(investorCohortParticipation)
      .where(and(eq(investorCohortParticipation.investorId, investorId), eq(investorCohortParticipation.status, "active")))
      .orderBy(desc(investorCohortParticipation.assignedAt));
  }

  async getCohortInvestors(cohortId: string): Promise<(InvestorCohortParticipation & { investor: Investor })[]> {
    const results = await db
      .select()
      .from(investorCohortParticipation)
      .innerJoin(investors, eq(investorCohortParticipation.investorId, investors.id))
      .where(and(eq(investorCohortParticipation.cohortId, cohortId), eq(investorCohortParticipation.status, "active")))
      .orderBy(asc(investors.organization));
    
    return results.map(result => ({
      ...result.investor_cohort_participation,
      investor: result.investors
    }));
  }

  async assignInvestorToCohort(participation: InsertInvestorCohortParticipation): Promise<InvestorCohortParticipation> {
    const [newParticipation] = await db
      .insert(investorCohortParticipation)
      .values(participation)
      .returning();
    return newParticipation;
  }

  async updateInvestorCohortRole(participationId: string, role: string): Promise<InvestorCohortParticipation> {
    const [updated] = await db
      .update(investorCohortParticipation)
      .set({ role })
      .where(eq(investorCohortParticipation.id, participationId))
      .returning();
    return updated;
  }

  async getAllCohortAssignments(): Promise<InvestorCohortParticipation[]> {
    return await db
      .select()
      .from(investorCohortParticipation)
      .where(eq(investorCohortParticipation.status, "active"))
      .orderBy(desc(investorCohortParticipation.assignedAt));
  }

  async removeInvestorFromCohort(participationId: string): Promise<void> {
    await db
      .update(investorCohortParticipation)
      .set({ status: "inactive" })
      .where(eq(investorCohortParticipation.id, participationId));
  }

  // AI Coach operations
  async createAiConversation(conversation: InsertAiConversation): Promise<AiConversation> {
    const [newConversation] = await db
      .insert(aiConversations)
      .values(conversation)
      .returning();
    return newConversation;
  }

  async getAiConversations(userId: string): Promise<AiConversation[]> {
    return await db
      .select()
      .from(aiConversations)
      .where(and(eq(aiConversations.userId, userId), eq(aiConversations.isActive, true)))
      .orderBy(desc(aiConversations.updatedAt));
  }

  async updateAiConversation(id: string, messages: any): Promise<AiConversation> {
    const [updatedConversation] = await db
      .update(aiConversations)
      .set({ messages, updatedAt: new Date() })
      .where(eq(aiConversations.id, id))
      .returning();
    return updatedConversation;
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getMessagesByThread(threadId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.threadId, threadId))
      .orderBy(asc(messages.createdAt));
  }

  // Search operations
  async searchUsers(query: string, role?: string): Promise<User[]> {
    const conditions = [
      ilike(users.firstName, `%${query}%`),
      ilike(users.lastName, `%${query}%`),
      ilike(users.email, `%${query}%`)
    ];

    let whereClause = or(...conditions);
    if (role) {
      whereClause = and(whereClause, eq(users.role, role as any));
    }

    return await db
      .select()
      .from(users)
      .where(whereClause)
      .orderBy(asc(users.firstName));
  }

  async searchProjects(query: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(or(
        ilike(projects.name, `%${query}%`),
        ilike(projects.summary, `%${query}%`),
        ilike(projects.problem, `%${query}%`)
      ))
      .orderBy(desc(projects.createdAt));
  }

  // Roadmap Template Management
  async createRoadmapTemplate(template: InsertRoadmapTemplate): Promise<RoadmapTemplate> {
    const [newTemplate] = await db
      .insert(roadmapTemplates)
      .values(template)
      .returning();
    return newTemplate;
  }

  async getRoadmapTemplate(id: string): Promise<RoadmapTemplate | undefined> {
    const [template] = await db
      .select()
      .from(roadmapTemplates)
      .where(eq(roadmapTemplates.id, id));
    return template;
  }

  async getRoadmapTemplates(cohortId?: string): Promise<RoadmapTemplate[]> {
    let whereClause;
    if (cohortId) {
      // Get templates for specific cohort OR global templates
      whereClause = and(
        eq(roadmapTemplates.isActive, true),
        or(
          eq(roadmapTemplates.cohortId, cohortId),
          isNull(roadmapTemplates.cohortId)
        )
      );
    } else {
      // Get all active templates
      whereClause = eq(roadmapTemplates.isActive, true);
    }

    return await db
      .select()
      .from(roadmapTemplates)
      .where(whereClause)
      .orderBy(desc(roadmapTemplates.isDefault), desc(roadmapTemplates.createdAt));
  }

  async updateRoadmapTemplate(id: string, data: Partial<RoadmapTemplate>): Promise<RoadmapTemplate> {
    const [updatedTemplate] = await db
      .update(roadmapTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(roadmapTemplates.id, id))
      .returning();
    return updatedTemplate;
  }

  async deleteRoadmapTemplate(id: string): Promise<void> {
    // Soft delete by setting isActive to false
    await db
      .update(roadmapTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(roadmapTemplates.id, id));
  }

  // Roadmap Item Management
  async createRoadmapItem(item: InsertRoadmapItem): Promise<RoadmapItem> {
    const [newItem] = await db
      .insert(roadmapItems)
      .values(item)
      .returning();
    return newItem;
  }

  async getRoadmapItem(id: string): Promise<RoadmapItem | undefined> {
    const [item] = await db
      .select()
      .from(roadmapItems)
      .where(eq(roadmapItems.id, id));
    return item;
  }

  async getRoadmapItemsByTemplate(templateId: string): Promise<RoadmapItem[]> {
    return await db
      .select()
      .from(roadmapItems)
      .where(eq(roadmapItems.templateId, templateId))
      .orderBy(asc(roadmapItems.week), asc(roadmapItems.orderIndex));
  }

  async getRoadmapItemsByWeek(templateId: string, week: number): Promise<RoadmapItem[]> {
    return await db
      .select()
      .from(roadmapItems)
      .where(and(
        eq(roadmapItems.templateId, templateId),
        eq(roadmapItems.week, week)
      ))
      .orderBy(asc(roadmapItems.orderIndex));
  }

  async updateRoadmapItem(id: string, data: Partial<RoadmapItem>): Promise<RoadmapItem> {
    const [updatedItem] = await db
      .update(roadmapItems)
      .set(data)
      .where(eq(roadmapItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteRoadmapItem(id: string): Promise<void> {
    await db
      .delete(roadmapItems)
      .where(eq(roadmapItems.id, id));
  }

  // Participant Roadmap Assignments
  async getParticipantRoadmap(projectId: string): Promise<{
    template: RoadmapTemplate;
    items: Array<RoadmapItem & { 
      assignment: AssignedRoadmap | null;
      lesson?: any;
      module?: any;
      progressData?: any;
    }>;
  } | undefined> {
    // Get project 
    const project = await this.getProject(projectId);
    if (!project) return undefined;

    // First check if project has existing roadmap assignments
    const existingAssignments = await db
      .select({ templateId: roadmapItems.templateId })
      .from(assignedRoadmap)
      .innerJoin(roadmapItems, eq(assignedRoadmap.itemId, roadmapItems.id))
      .where(eq(assignedRoadmap.projectId, projectId))
      .limit(1);

    let template: RoadmapTemplate | undefined;
    
    if (existingAssignments.length > 0) {
      // Use template from existing assignments
      template = await this.getRoadmapTemplate(existingAssignments[0].templateId);
    } else if (project.cohortId) {
      // Fallback to cohort-based template lookup
      const templates = await this.getRoadmapTemplates(project.cohortId);
      template = templates.find(t => t.isDefault) || templates[0];
    }
    
    if (!template) return undefined;

    // Use optimized JOIN query to get items with assignments in one query
    const results = await db
      .select({
        // RoadmapItem fields
        id: roadmapItems.id,
        templateId: roadmapItems.templateId,
        type: roadmapItems.type,
        title: roadmapItems.title,
        description: roadmapItems.description,
        week: roadmapItems.week,
        dueOffsetDays: roadmapItems.dueOffsetDays,
        orderIndex: roadmapItems.orderIndex,
        moduleId: roadmapItems.moduleId,
        lessonId: roadmapItems.lessonId,
        milestoneId: roadmapItems.milestoneId,
        autoCompletionType: roadmapItems.autoCompletionType,
        autoThreshold: roadmapItems.autoThreshold,
        dependencyIds: roadmapItems.dependencyIds,
        isOptional: roadmapItems.isOptional,
        estimatedHours: roadmapItems.estimatedHours,
        tags: roadmapItems.tags,
        createdAt: roadmapItems.createdAt,
        // AssignedRoadmap fields (nullable)
        assignment: assignedRoadmap,
      })
      .from(roadmapItems)
      .leftJoin(
        assignedRoadmap,
        and(
          eq(assignedRoadmap.itemId, roadmapItems.id),
          eq(assignedRoadmap.projectId, projectId)
        )
      )
      .where(eq(roadmapItems.templateId, template.id))
      .orderBy(asc(roadmapItems.week), asc(roadmapItems.orderIndex));

    // Enrich items with curriculum data and auto-computed status
    const enrichedItems = await Promise.all(results.map(async (row) => {
      const item: any = {
        ...row,
        assignment: row.assignment || null,
      };

      // Add lesson data if item has lessonId
      if (item.lessonId) {
        const lesson = await this.getLesson(item.lessonId);
        if (lesson) {
          item.lesson = lesson;
        }
      }

      // Add module data if item has moduleId
      if (item.moduleId) {
        const module = await this.getModule(item.moduleId);
        if (module) {
          item.module = module;
        }
      }

      // Auto-compute status for learning items based on userProgress
      if (item.autoCompletionType === 'lesson' || item.autoCompletionType === 'module') {
        let computedStatus = 'not_started';
        let progressData = null;

        if (item.autoCompletionType === 'lesson' && item.lessonId) {
          const progress = await this.getUserProgress(project.ownerId, item.lessonId);
          progressData = {
            type: 'lesson',
            isCompleted: progress?.isCompleted || false,
            completedAt: progress?.completedAt,
            score: progress?.score,
            timeSpent: progress?.timeSpent,
          };
          
          if (progress?.isCompleted) {
            computedStatus = 'completed';
          } else if (progress?.attempts && progress.attempts > 0) {
            computedStatus = 'in_progress';
          }
        } else if (item.autoCompletionType === 'module' && item.moduleId) {
          const moduleProgress = await this.getUserProgressForModule(project.ownerId, item.moduleId);
          const totalLessons = moduleProgress.length;
          const completedLessons = moduleProgress.filter(p => p.isCompleted).length;
          const completionRate = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
          
          progressData = {
            type: 'module',
            totalLessons,
            completedLessons,
            completionRate,
            isCompleted: completionRate >= (item.autoThreshold || 100),
          };
          
          if (completionRate >= (item.autoThreshold || 100)) {
            computedStatus = 'completed';
          } else if (completedLessons > 0) {
            computedStatus = 'in_progress';
          }
        }

        // Update assignment status if it differs from computed status
        if (item.assignment && item.assignment.status !== computedStatus) {
          await this.updateRoadmapAssignment(item.assignment.id, {
            status: computedStatus as any,
            autoCompleted: true,
            ...(computedStatus === 'completed' ? { completedAt: new Date() } : {})
          });
          
          // Update the local assignment object to reflect the change
          item.assignment = {
            ...item.assignment,
            status: computedStatus as any,
            autoCompleted: true,
            ...(computedStatus === 'completed' ? { completedAt: new Date() } : {})
          };
        }

        item.progressData = progressData;
      }

      return item;
    }));

    return {
      template,
      items: enrichedItems,
    };
  }

  async getParticipantRoadmapByWeek(projectId: string, week: number): Promise<Array<RoadmapItem & { assignment: AssignedRoadmap | null }>> {
    const roadmap = await this.getParticipantRoadmap(projectId);
    if (!roadmap) return [];

    return roadmap.items.filter(item => item.week === week);
  }

  async assignRoadmapToProject(projectId: string, templateId?: string): Promise<AssignedRoadmap[]> {
    // Use transaction for consistency
    return await db.transaction(async (trx) => {
      // Get project and its owner
      const project = await this.getProject(projectId);
      if (!project) throw new Error("Project not found");

      // Get template
      let template: RoadmapTemplate | undefined;
      if (templateId) {
        template = await this.getRoadmapTemplate(templateId);
      } else {
        // Get default template for project's cohort
        const templates = await this.getRoadmapTemplates(project.cohortId || undefined);
        template = templates.find(t => t.isDefault) || templates[0];
      }
      
      if (!template) throw new Error("No roadmap template found");

      // Get all items for this template
      const items = await this.getRoadmapItemsByTemplate(template.id);

      // Upsert assignments to ensure idempotency
      const assignments: AssignedRoadmap[] = [];
      
      for (const item of items) {
        const [assignment] = await trx
          .insert(assignedRoadmap)
          .values({
            itemId: item.id,
            projectId,
            userId: project.ownerId,
            status: "not_started" as const,
          })
          .onConflictDoUpdate({
            target: [assignedRoadmap.itemId, assignedRoadmap.projectId],
            set: {
              updatedAt: new Date(),
            },
          })
          .returning();
        
        assignments.push(assignment);
      }

      return assignments;
    });
  }

  async updateRoadmapAssignment(assignmentId: string, data: Partial<AssignedRoadmap>): Promise<AssignedRoadmap> {
    const [updatedAssignment] = await db
      .update(assignedRoadmap)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(assignedRoadmap.id, assignmentId))
      .returning();
    return updatedAssignment;
  }

  async completeRoadmapItem(assignmentId: string, evidenceArtifactId?: string, notes?: string): Promise<AssignedRoadmap> {
    return this.updateRoadmapAssignment(assignmentId, {
      status: "completed",
      completedAt: new Date(),
      evidenceArtifactId,
      notes,
    });
  }

  // Auto-completion Logic
  async processAutoCompletions(projectId: string): Promise<AssignedRoadmap[]> {
    const roadmap = await this.getParticipantRoadmap(projectId);
    if (!roadmap) return [];

    const project = await this.getProject(projectId);
    if (!project) return [];

    const autoCompletedAssignments: AssignedRoadmap[] = [];

    for (const item of roadmap.items) {
      if (item.assignment?.status === "completed" || item.autoCompletionType === "none") {
        continue;
      }

      let shouldAutoComplete = false;

      switch (item.autoCompletionType) {
        case "lesson":
          if (item.lessonId) {
            const progress = await this.getUserProgress(project.ownerId, item.lessonId);
            shouldAutoComplete = progress?.isCompleted === true;
          }
          break;

        case "module":
          if (item.moduleId) {
            const moduleProgress = await this.getUserProgressForModule(project.ownerId, item.moduleId);
            const totalLessons = moduleProgress.length;
            const completedLessons = moduleProgress.filter(p => p.isCompleted).length;
            const completionRate = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
            shouldAutoComplete = completionRate >= (item.autoThreshold || 100);
          }
          break;

        case "deliverable": {
          const assignment = item.assignment;
          if (assignment?.deliverableId) {
            const deliverables = await this.getDeliverablesByProject(projectId);
            const deliverable = deliverables.find(d => d.id === assignment.deliverableId);
            shouldAutoComplete = deliverable?.status === "approved";
          }
          break;
        }

        case "milestone":
          if (item.milestoneId) {
            // Check if milestone is marked as completed via project stage or deliverables
            const deliverables = await this.getDeliverablesByProject(projectId);
            const milestoneDeliverables = deliverables.filter(d => d.milestoneId === item.milestoneId);
            const approvedDeliverables = milestoneDeliverables.filter(d => d.status === "approved");
            const completionRate = milestoneDeliverables.length > 0 
              ? (approvedDeliverables.length / milestoneDeliverables.length) * 100 
              : 0;
            shouldAutoComplete = completionRate >= (item.autoThreshold || 100);
          }
          break;

        case "mentor_session":
          if (item.assignment?.mentorSessionId) {
            // Check if the specific mentor session has occurred and has notes
            const session = await db
              .select()
              .from(mentorSessions)
              .where(eq(mentorSessions.id, item.assignment.mentorSessionId));
            shouldAutoComplete = session.length > 0 && session[0].notes !== null;
          } else if (item.autoThreshold) {
            // Alternative: check if user has attended enough sessions this week
            const sessions = await db
              .select()
              .from(mentorSessions)
              .where(eq(mentorSessions.participantIds, [project.ownerId]));
            shouldAutoComplete = sessions.length >= item.autoThreshold;
          }
          break;
      }

      if (shouldAutoComplete && item.assignment) {
        const completed = await this.updateRoadmapAssignment(item.assignment.id, {
          status: "completed",
          completedAt: new Date(),
          autoCompleted: true,
        });
        autoCompletedAssignments.push(completed);
      }
    }

    return autoCompletedAssignments;
  }

  async checkLessonAutoCompletion(userId: string, lessonId: string): Promise<string[]> {
    // Find roadmap items that auto-complete when this lesson is completed
    const relevantItems = await db
      .select()
      .from(roadmapItems)
      .where(and(
        eq(roadmapItems.autoCompletionType, "lesson"),
        eq(roadmapItems.lessonId, lessonId)
      ));

    return relevantItems.map(item => item.id);
  }

  async checkModuleAutoCompletion(userId: string, moduleId: string): Promise<string[]> {
    // Find roadmap items that auto-complete when this module reaches threshold
    const relevantItems = await db
      .select()
      .from(roadmapItems)
      .where(and(
        eq(roadmapItems.autoCompletionType, "module"),
        eq(roadmapItems.moduleId, moduleId)
      ));

    return relevantItems.map(item => item.id);
  }

  async checkDeliverableAutoCompletion(projectId: string, deliverableId: string): Promise<string[]> {
    // Find roadmap assignments that auto-complete when this deliverable is approved
    const relevantAssignments = await db
      .select({ itemId: assignedRoadmap.itemId })
      .from(assignedRoadmap)
      .innerJoin(roadmapItems, eq(assignedRoadmap.itemId, roadmapItems.id))
      .where(and(
        eq(assignedRoadmap.projectId, projectId),
        eq(roadmapItems.autoCompletionType, "deliverable"),
        eq(assignedRoadmap.deliverableId, deliverableId)
      ));

    return relevantAssignments.map(assignment => assignment.itemId);
  }

  async checkMilestoneAutoCompletion(projectId: string, milestoneId: string): Promise<string[]> {
    // Find roadmap items that auto-complete when this milestone is achieved
    const relevantItems = await db
      .select()
      .from(roadmapItems)
      .where(and(
        eq(roadmapItems.autoCompletionType, "milestone"),
        eq(roadmapItems.milestoneId, milestoneId)
      ));

    return relevantItems.map(item => item.id);
  }

  // Additional API support methods
  async getProjectRoadmap(projectId: string) {
    return this.getParticipantRoadmap(projectId);
  }

  async getAssignedRoadmapItem(assignmentId: string): Promise<AssignedRoadmap | null> {
    const [assignment] = await db
      .select()
      .from(assignedRoadmap)
      .where(eq(assignedRoadmap.id, assignmentId))
      .limit(1);
    
    return assignment || null;
  }

  async updateAssignedRoadmapStatus(assignmentId: string, status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'waived'): Promise<AssignedRoadmap> {
    const [updated] = await db
      .update(assignedRoadmap)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(assignedRoadmap.id, assignmentId))
      .returning();
    
    return updated;
  }

  async assignRoadmapTemplate(templateId: string, projectId: string): Promise<AssignedRoadmap[]> {
    return this.assignRoadmapToProject(projectId, templateId);
  }
}

export const storage = new DatabaseStorage();
