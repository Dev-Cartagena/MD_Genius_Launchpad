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
  mentorProfiles,
  mentorSessions,
  investors,
  investorInterests,
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
  type Module,
  type Lesson,
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
  type InsertCohort,
  type RoadmapTemplate,
  type InsertRoadmapTemplate,
  type RoadmapItem,
  type InsertRoadmapItem,
  type AssignedRoadmap,
  type InsertAssignedRoadmap,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, ilike, or, gt, isNull } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  
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
  
  // Curriculum operations
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
  getMentorSessions(mentorId: string): Promise<any[]>;
  
  // Investor operations
  getInvestors(): Promise<any[]>;
  getInvestorInterests(projectId: string): Promise<any[]>;
  
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

  // Curriculum operations
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

  async getMentorSessions(mentorId: string): Promise<any[]> {
    return await db
      .select()
      .from(mentorSessions)
      .where(eq(mentorSessions.mentorId, mentorId))
      .orderBy(desc(mentorSessions.startTime));
  }

  // Investor operations
  async getInvestors(): Promise<any[]> {
    return await db
      .select()
      .from(investors)
      .where(eq(investors.isActive, true))
      .orderBy(asc(investors.organization));
  }

  async getInvestorInterests(projectId: string): Promise<any[]> {
    return await db
      .select()
      .from(investorInterests)
      .where(eq(investorInterests.projectId, projectId))
      .orderBy(desc(investorInterests.createdAt));
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
    items: Array<RoadmapItem & { assignment: AssignedRoadmap | null }>;
  } | undefined> {
    // Get project to find its cohort
    const project = await this.getProject(projectId);
    if (!project?.cohortId) return undefined;

    // Get the roadmap template for this cohort (or default)
    const templates = await this.getRoadmapTemplates(project.cohortId);
    const template = templates.find(t => t.isDefault) || templates[0];
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
        deliverableId: roadmapItems.deliverableId,
        mentorSessionId: roadmapItems.mentorSessionId,
        autoCompletionType: roadmapItems.autoCompletionType,
        autoRefId: roadmapItems.autoRefId,
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

    const itemsWithAssignments = results.map(row => ({
      ...row,
      assignment: row.assignment || null,
    }));

    return {
      template,
      items: itemsWithAssignments,
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

        case "deliverable":
          if (item.deliverableId) {
            const deliverables = await this.getDeliverablesByProject(projectId);
            const deliverable = deliverables.find(d => d.id === item.deliverableId);
            shouldAutoComplete = deliverable?.status === "approved";
          }
          break;

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
          if (item.mentorSessionId) {
            // Check if the specific mentor session has occurred and has notes
            const session = await db
              .select()
              .from(mentorSessions)
              .where(eq(mentorSessions.id, item.mentorSessionId));
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
    // Find roadmap items that auto-complete when this deliverable is approved
    const relevantItems = await db
      .select()
      .from(roadmapItems)
      .where(and(
        eq(roadmapItems.autoCompletionType, "deliverable"),
        eq(roadmapItems.deliverableId, deliverableId)
      ));

    return relevantItems.map(item => item.id);
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
}

export const storage = new DatabaseStorage();
