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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, ilike, or } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  
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
      .then(rows => rows.map(row => row.user_progress));
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
}

export const storage = new DatabaseStorage();
