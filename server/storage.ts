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
  type UserWithCredentials,
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
  type MentorWithProfile,
  type MentorSession,
  type InsertMentorSession,
  type Investor,
  type InsertInvestor,
  type InvestorInterest,
  type InvestorSession,
  type InsertInvestorSession,
  type InvestorCohortParticipation,
  type InsertInvestorCohortParticipation,
} from "../shared/schema.js";
import { db } from "./db.js";
import { sanitizeTranslations, type TranslatableKind } from "./translations.js";

/** Replace `translations` with its sanitized form, or drop it when it isn't a valid object. */
function withCleanTranslations<T extends { translations?: unknown }>(kind: TranslatableKind, data: T): T {
  if (!("translations" in data)) return data;
  const clean = sanitizeTranslations(kind, data.translations);
  const { translations: _ignored, ...rest } = data;
  return (clean === undefined ? rest : { ...rest, translations: clean }) as T;
}
import { eq, and, desc, asc, ilike, or, gt, isNull, sql, getTableColumns, inArray } from "drizzle-orm";

// User columns that are safe to return from the API: everything except the
// password hash and reset-token fields.
const {
  passwordHash: _passwordHash,
  passwordResetTokenHash: _passwordResetTokenHash,
  passwordResetExpires: _passwordResetExpires,
  ...safeUserColumns
} = getTableColumns(users);

export class InactiveTemplateError extends Error {
  constructor() {
    super("This roadmap template is archived. Restore it before assigning it.");
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Escapes LIKE/ILIKE wildcards so user input matches literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export interface IStorage {
  // User operations. Every method returns users without password or
  // reset-token fields; only getUserCredentialsByEmail exposes the hash.
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  
  // Email/Password authentication operations (emails are case-insensitive)
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserCredentialsByEmail(email: string): Promise<UserWithCredentials | undefined>;
  createLocalUser(userData: { email: string; firstName?: string | null; lastName?: string | null; role?: string; passwordHash?: string; locale?: string }): Promise<User>;
  setPasswordHash(userId: string, passwordHash: string): Promise<void>;
  setResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  updatePasswordByResetToken(tokenHash: string, newPasswordHash: string): Promise<boolean>;
  
  // Application operations
  createApplication(application: InsertApplication): Promise<Application>;
  getApplication(id: string): Promise<Application | undefined>;
  getApplicationsByUser(userId: string): Promise<Application[]>;
  getAllApplications(): Promise<Application[]>;
  updateApplicationStatus(id: string, status: any, reviewerNotes?: string, scores?: Record<string, number>): Promise<Application>;
  
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
  getMentors(): Promise<MentorWithProfile[]>;
  getMentorProfile(userId: string): Promise<MentorProfile | undefined>;
  getMentorProfileById(id: string): Promise<MentorProfile | undefined>;
  createMentorProfile(profile: InsertMentorProfile): Promise<MentorProfile>;
  updateMentorProfile(userId: string, data: Partial<MentorProfile>): Promise<MentorProfile>;
  updateMentorProfileById(id: string, data: Partial<MentorProfile>): Promise<MentorProfile>;
  getMentorSessions(mentorId: string): Promise<MentorSession[]>;
  getParticipantSessions(participantId: string): Promise<MentorSession[]>;
  createMentorSession(session: InsertMentorSession): Promise<MentorSession>;
  updateMentorSession(sessionId: string, data: Partial<MentorSession>): Promise<MentorSession>;
  getMentorSession(sessionId: string): Promise<MentorSession | undefined>;
  
  // Investor operations
  getInvestors(includeInactive?: boolean): Promise<Investor[]>;
  getInvestor(id: string): Promise<Investor | undefined>;
  createInvestor(investor: InsertInvestor): Promise<Investor>;
  updateInvestor(id: string, data: Partial<Investor>): Promise<Investor>;
  deactivateInvestor(id: string): Promise<Investor>;
  getInvestorsByUser(userId: string, includeInactive?: boolean): Promise<Investor[]>;
  
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
  cancelInvestorSession(sessionId: string): Promise<boolean>;
  
  // Investor-cohort participation management
  getInvestorCohortParticipation(investorId: string): Promise<InvestorCohortParticipation[]>;
  getCohortInvestors(cohortId: string): Promise<(InvestorCohortParticipation & { investor: Investor })[]>;
  getAllCohortAssignments(): Promise<InvestorCohortParticipation[]>;
  assignInvestorToCohort(participation: InsertInvestorCohortParticipation): Promise<InvestorCohortParticipation>;
  updateInvestorCohortRole(participationId: string, role: string): Promise<InvestorCohortParticipation>;
  removeInvestorFromCohort(participationId: string): Promise<boolean>;
  
  // AI Coach operations
  createAiConversation(conversation: InsertAiConversation): Promise<AiConversation>;
  getAiConversations(userId: string): Promise<AiConversation[]>;
  updateAiConversation(id: string, userId: string, messages: any): Promise<AiConversation | undefined>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByThread(threadId: string, participantId?: string): Promise<Message[]>;
  
  // Search operations
  searchUsers(query: string, role?: string, limit?: number, matchEmail?: boolean): Promise<User[]>;
  searchProjects(query: string, visibleToUserId?: string): Promise<Project[]>;
  getVisibleProjects(userId: string): Promise<Project[]>;
  getArtifactsByProject(projectId: string): Promise<Artifact[]>;
  isFileAttachedToProjectOwnedBy(fileRef: string, ownerId: string): Promise<boolean>;
  getAcceptedCohortIds(userId: string): Promise<string[]>;
  getMenteesForMentor(mentorId: string): Promise<Array<{ id: string; firstName: string | null; lastName: string | null; email: string | null; profileImageUrl: string | null; sessionCount: number; lastSessionAt: Date | null }>>;
  getInvestorInterestsForInvestor(investorId: string): Promise<Array<InvestorInterest & { projectName: string | null }>>;
  upsertInvestorInterest(investorId: string, projectId: string, level: InvestorInterest["level"], note?: string): Promise<InvestorInterest>;
  
  // Roadmap operations
  // Template management
  createRoadmapTemplate(template: InsertRoadmapTemplate): Promise<RoadmapTemplate>;
  getRoadmapTemplate(id: string): Promise<RoadmapTemplate | undefined>;
  getRoadmapTemplates(cohortId?: string, includeInactive?: boolean): Promise<RoadmapTemplate[]>;
  updateRoadmapTemplate(id: string, data: Partial<RoadmapTemplate>): Promise<RoadmapTemplate>;
  deleteRoadmapTemplate(id: string): Promise<boolean>;
  
  // Roadmap item management
  createRoadmapItem(item: InsertRoadmapItem): Promise<RoadmapItem>;
  getRoadmapItem(id: string): Promise<RoadmapItem | undefined>;
  getRoadmapItemsByTemplate(templateId: string): Promise<RoadmapItem[]>;
  getRoadmapItemsByWeek(templateId: string, week: number): Promise<RoadmapItem[]>;
  updateRoadmapItem(id: string, data: Partial<RoadmapItem>): Promise<RoadmapItem>;
  deleteRoadmapItem(id: string): Promise<boolean>;
  
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
    const [user] = await db.select(safeUserColumns).from(users).where(eq(users.id, id));
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const { id: _ignoredId, createdAt: _ignoredCreatedAt, ...changes } = data as any;
    if (typeof changes.email === "string") {
      changes.email = normalizeEmail(changes.email);
    }
    const [updatedUser] = await db
      .update(users)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning(safeUserColumns);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return await db
      .select(safeUserColumns)
      .from(users)
      .orderBy(asc(users.createdAt));
  }

  // Email/Password authentication operations
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select(safeUserColumns)
      .from(users)
      .where(sql`lower(${users.email}) = ${normalizeEmail(email)}`);
    return user;
  }

  /** The only query that returns the password hash. Use it for login only. */
  async getUserCredentialsByEmail(email: string): Promise<UserWithCredentials | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${normalizeEmail(email)}`);
    return user;
  }

  async createLocalUser(userData: { email: string; firstName?: string | null; lastName?: string | null; role?: string; passwordHash?: string; locale?: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        email: normalizeEmail(userData.email),
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: (userData.role as any) || "public_visitor",
        passwordHash: userData.passwordHash,
        locale: userData.locale ?? "en",
        emailVerified: false,
      })
      .returning(safeUserColumns);
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

  async updatePasswordByResetToken(tokenHash: string, newPasswordHash: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ 
        passwordHash: newPasswordHash,
        passwordResetTokenHash: null,
        passwordResetExpires: null,
        // Completing a reset or invite link proves the user owns the email.
        emailVerified: true,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(users.passwordResetTokenHash, tokenHash),
          gt(users.passwordResetExpires, new Date())
        )
      )
      .returning({ id: users.id });
    
    if (result.length === 0) return false;
    // Sign the user out everywhere: a stolen session must not survive a reset.
    await db.execute(
      sql`DELETE FROM sessions WHERE sess->'passport'->'user'->'claims'->>'sub' = ${result[0].id}`,
    );
    return true;
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

  async updateApplicationStatus(id: string, status: any, reviewerNotes?: string, scores?: Record<string, number>): Promise<Application> {
    const updateData: any = { status, updatedAt: new Date() };
    if (scores) updateData.scores = scores;
    
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
      .values(withCleanTranslations("cohort", cohort))
      .returning();
    return newCohort;
  }

  async updateCohort(id: string, data: Partial<Cohort>): Promise<Cohort> {
    const [updatedCohort] = await db
      .update(cohorts)
      .set(withCleanTranslations("cohort", data))
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

  /** Lesson completion for a module, counting every lesson in the module. */
  async getModuleCompletion(userId: string, moduleId: string): Promise<{
    totalLessons: number; completedLessons: number; completionRate: number;
  }> {
    const moduleLessons = await this.getLessonsByModule(moduleId);
    const progress = await this.getUserProgressForModule(userId, moduleId);
    const completedLessons = progress.filter((p) => p.isCompleted).length;
    const totalLessons = moduleLessons.length;
    return {
      totalLessons,
      completedLessons,
      completionRate: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0,
    };
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
    const existing = await this.getUserProgress(userId, lessonId);
    const progressData: InsertUserProgress = {
      userId,
      lessonId,
      isCompleted: true,
      completedAt: existing?.completedAt ?? new Date(),
      score: score ?? existing?.score ?? undefined,
      timeSpent: (existing?.timeSpent ?? 0) + (timeSpent ?? 0) || undefined,
      attempts: existing?.attempts ?? 1,
    };
    return this.createOrUpdateUserProgress(progressData);
  }

  /** Records a scored quiz attempt; completes the lesson when passed. */
  async recordQuizAttempt(userId: string, lessonId: string, score: number, passed: boolean): Promise<UserProgress> {
    const existing = await this.getUserProgress(userId, lessonId);
    const attempts = (existing?.attempts ?? 0) + 1;
    const bestScore = Math.max(score, existing?.score ?? 0);
    const completed = passed || existing?.isCompleted === true;
    return this.createOrUpdateUserProgress({
      userId,
      lessonId,
      isCompleted: completed,
      completedAt: completed ? existing?.completedAt ?? new Date() : null,
      score: bestScore,
      timeSpent: existing?.timeSpent ?? undefined,
      attempts,
    });
  }

  // Curriculum Management Operations (Admin)
  async createModule(module: InsertModule): Promise<Module> {
    const [newModule] = await db
      .insert(modules)
      .values(withCleanTranslations("module", module))
      .returning();
    return newModule;
  }

  async updateModule(id: string, data: Partial<Module>): Promise<Module> {
    const allowedFields = {
      cohortId: data.cohortId,
      title: data.title,
      description: data.description,
      week: data.week,
      objectives: data.objectives,
      resources: data.resources,
      orderIndex: data.orderIndex,
      translations: sanitizeTranslations("module", data.translations),
    };
    
    const updateData = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
    );
    if (Object.keys(updateData).length === 0) return this.getModule(id) as Promise<Module>;
    
    const [updated] = await db
      .update(modules)
      .set(updateData)
      .where(eq(modules.id, id))
      .returning();
    return updated;
  }

  /** Deletes a module with its lessons and their progress; unlinks roadmap items. */
  async deleteModule(id: string): Promise<boolean> {
    return await db.transaction(async (trx) => {
      const moduleLessons = await trx.select({ id: lessons.id }).from(lessons).where(eq(lessons.moduleId, id));
      const lessonIds = moduleLessons.map((l) => l.id);
      if (lessonIds.length > 0) {
        await trx.delete(userProgress).where(inArray(userProgress.lessonId, lessonIds));
        await trx
          .update(roadmapItems)
          .set({ lessonId: null, autoCompletionType: sql`CASE WHEN ${roadmapItems.autoCompletionType} = 'lesson' THEN 'none'::auto_completion_type ELSE ${roadmapItems.autoCompletionType} END` })
          .where(inArray(roadmapItems.lessonId, lessonIds));
        await trx.delete(lessons).where(inArray(lessons.id, lessonIds));
      }
      await trx
        .update(roadmapItems)
        .set({ moduleId: null, autoCompletionType: sql`CASE WHEN ${roadmapItems.autoCompletionType} = 'module' THEN 'none'::auto_completion_type ELSE ${roadmapItems.autoCompletionType} END` })
        .where(eq(roadmapItems.moduleId, id));
      const deleted = await trx.delete(modules).where(eq(modules.id, id)).returning({ id: modules.id });
      return deleted.length > 0;
    });
  }

  async createLesson(lesson: InsertLesson): Promise<Lesson> {
    const [newLesson] = await db
      .insert(lessons)
      .values(withCleanTranslations("lesson", lesson))
      .returning();
    return newLesson;
  }

  async updateLesson(id: string, data: Partial<Lesson>): Promise<Lesson> {
    const allowedFields = {
      moduleId: data.moduleId,
      title: data.title,
      content: data.content,
      media: data.media,
      quizId: data.quizId,
      prerequisites: data.prerequisites,
      orderIndex: data.orderIndex,
      translations: sanitizeTranslations("lesson", data.translations),
    };
    
    const updateData = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
    );
    if (Object.keys(updateData).length === 0) return this.getLesson(id) as Promise<Lesson>;
    
    const [updated] = await db
      .update(lessons)
      .set(updateData)
      .where(eq(lessons.id, id))
      .returning();
    return updated;
  }

  /** Deletes a lesson and its progress; unlinks roadmap items. */
  async deleteLesson(id: string): Promise<boolean> {
    return await db.transaction(async (trx) => {
      await trx.delete(userProgress).where(eq(userProgress.lessonId, id));
      await trx
        .update(roadmapItems)
        .set({ lessonId: null, autoCompletionType: sql`CASE WHEN ${roadmapItems.autoCompletionType} = 'lesson' THEN 'none'::auto_completion_type ELSE ${roadmapItems.autoCompletionType} END` })
        .where(eq(roadmapItems.lessonId, id));
      const deleted = await trx.delete(lessons).where(eq(lessons.id, id)).returning({ id: lessons.id });
      return deleted.length > 0;
    });
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
      .values(withCleanTranslations("quiz", quiz))
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
      translations: sanitizeTranslations("quiz", data.translations),
    };
    
    const updateData = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
    );
    if (Object.keys(updateData).length === 0) return this.getQuiz(id) as Promise<Quiz>;
    
    const [updated] = await db
      .update(quizzes)
      .set(updateData)
      .where(eq(quizzes.id, id))
      .returning();
    return updated;
  }

  /** Deletes a quiz and unlinks it from lessons. */
  async deleteQuiz(id: string): Promise<boolean> {
    return await db.transaction(async (trx) => {
      await trx.update(lessons).set({ quizId: null }).where(eq(lessons.quizId, id));
      const deleted = await trx.delete(quizzes).where(eq(quizzes.id, id)).returning({ id: quizzes.id });
      return deleted.length > 0;
    });
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

  async getArtifactsByProject(projectId: string): Promise<Artifact[]> {
    return await db
      .select()
      .from(artifacts)
      .where(eq(artifacts.projectId, projectId))
      .orderBy(desc(artifacts.createdAt));
  }

  /** True if fileRef is attached to an artifact of this project. */
  async isFileAttachedToProjectOwnedBy(fileRef: string, ownerId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: artifacts.id })
      .from(artifacts)
      .innerJoin(projects, eq(artifacts.projectId, projects.id))
      .where(and(eq(artifacts.fileRef, fileRef), eq(projects.ownerId, ownerId)))
      .limit(1);
    return Boolean(row);
  }

  /** Cohort ids where the user has an accepted application. */
  async getAcceptedCohortIds(userId: string): Promise<string[]> {
    const rows = await db
      .select({ cohortId: applications.cohortId })
      .from(applications)
      .where(and(eq(applications.userId, userId), eq(applications.status, "accepted")));
    return rows.map((r) => r.cohortId);
  }

  /** Participants who have booked at least one session with the mentor. */
  async getMenteesForMentor(mentorId: string): Promise<Array<{
    id: string; firstName: string | null; lastName: string | null; email: string | null;
    profileImageUrl: string | null; sessionCount: number; lastSessionAt: Date | null;
  }>> {
    const sessions = await db
      .select({ participantIds: mentorSessions.participantIds, startTime: mentorSessions.startTime })
      .from(mentorSessions)
      .where(eq(mentorSessions.mentorId, mentorId));
    const stats = new Map<string, { count: number; last: Date | null }>();
    for (const session of sessions) {
      for (const pid of session.participantIds ?? []) {
        const entry = stats.get(pid) ?? { count: 0, last: null };
        entry.count += 1;
        if (!entry.last || session.startTime > entry.last) entry.last = session.startTime;
        stats.set(pid, entry);
      }
    }
    if (stats.size === 0) return [];
    const mentees = await db
      .select({
        id: users.id, firstName: users.firstName, lastName: users.lastName,
        email: users.email, profileImageUrl: users.profileImageUrl,
      })
      .from(users)
      .where(inArray(users.id, Array.from(stats.keys())));
    return mentees.map((m) => ({
      ...m,
      sessionCount: stats.get(m.id)!.count,
      lastSessionAt: stats.get(m.id)!.last,
    }));
  }

  // Mentor operations
  async getMentors(): Promise<MentorWithProfile[]> {
    return await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        role: users.role,
        bio: users.bio,
        mentorProfile: {
          id: mentorProfiles.id,
          expertise: mentorProfiles.expertise,
          availability: mentorProfiles.availability,
          bio: mentorProfiles.bio,
          industries: mentorProfiles.industries,
          isActive: mentorProfiles.isActive,
        }
      })
      .from(users)
      .leftJoin(mentorProfiles, eq(users.id, mentorProfiles.userId))
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

  async getMentorProfileById(id: string): Promise<MentorProfile | undefined> {
    const [profile] = await db
      .select()
      .from(mentorProfiles)
      .where(eq(mentorProfiles.id, id));
    return profile;
  }

  async updateMentorProfileById(id: string, data: Partial<MentorProfile>): Promise<MentorProfile> {
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
      .where(eq(mentorProfiles.id, id))
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
  async getInvestors(includeInactive = false): Promise<Investor[]> {
    return await db
      .select()
      .from(investors)
      .where(includeInactive ? undefined : eq(investors.isActive, true))
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
      isActive: data.isActive,
      userId: data.userId,
    };
    
    const updateData = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
    );
    if (Object.keys(updateData).length === 0) return this.getInvestor(id) as Promise<Investor>;
    
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

  async getInvestorsByUser(userId: string, includeInactive = false): Promise<Investor[]> {
    return await db
      .select()
      .from(investors)
      .where(includeInactive ? eq(investors.userId, userId) : and(eq(investors.userId, userId), eq(investors.isActive, true)))
      .orderBy(asc(investors.organization));
  }

  // Investor interest management
  async getInvestorInterestsForInvestor(investorId: string): Promise<Array<InvestorInterest & { projectName: string | null }>> {
    const rows = await db
      .select({ interest: investorInterests, projectName: projects.name })
      .from(investorInterests)
      .leftJoin(projects, eq(investorInterests.projectId, projects.id))
      .where(eq(investorInterests.investorId, investorId))
      .orderBy(desc(investorInterests.updatedAt));
    return rows.map((r) => ({ ...r.interest, projectName: r.projectName }));
  }

  /** Creates or updates the interest record for an investor/project pair. */
  async upsertInvestorInterest(investorId: string, projectId: string, level: InvestorInterest["level"], note?: string): Promise<InvestorInterest> {
    const [existing] = await db
      .select()
      .from(investorInterests)
      .where(and(eq(investorInterests.investorId, investorId), eq(investorInterests.projectId, projectId)))
      .limit(1);
    if (existing) {
      const notes = note ? [existing.notes, note].filter(Boolean).join("\n\n") : existing.notes;
      const [updated] = await db
        .update(investorInterests)
        .set({ level, notes, updatedAt: new Date() })
        .where(eq(investorInterests.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(investorInterests)
      .values({ investorId, projectId, level, notes: note })
      .returning();
    return created;
  }

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

  async cancelInvestorSession(sessionId: string): Promise<boolean> {
    const deleted = await db
      .delete(investorSessions)
      .where(eq(investorSessions.id, sessionId))
      .returning({ id: investorSessions.id });
    return deleted.length > 0;
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

  async findInvestorCohortParticipation(investorId: string, cohortId: string): Promise<InvestorCohortParticipation | undefined> {
    const [row] = await db
      .select()
      .from(investorCohortParticipation)
      .where(and(
        eq(investorCohortParticipation.investorId, investorId),
        eq(investorCohortParticipation.cohortId, cohortId),
      ))
      .limit(1);
    return row;
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

  async removeInvestorFromCohort(participationId: string): Promise<boolean> {
    const updated = await db
      .update(investorCohortParticipation)
      .set({ status: "inactive" })
      .where(eq(investorCohortParticipation.id, participationId))
      .returning({ id: investorCohortParticipation.id });
    return updated.length > 0;
  }

  async reactivateInvestorCohortParticipation(participationId: string, role: string): Promise<InvestorCohortParticipation> {
    const [updated] = await db
      .update(investorCohortParticipation)
      .set({ status: "active", role })
      .where(eq(investorCohortParticipation.id, participationId))
      .returning();
    return updated;
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

  /** Updates a conversation only if it belongs to userId; returns undefined otherwise. */
  async updateAiConversation(id: string, userId: string, messages: any): Promise<AiConversation | undefined> {
    const [updatedConversation] = await db
      .update(aiConversations)
      .set({ messages, updatedAt: new Date() })
      .where(and(eq(aiConversations.id, id), eq(aiConversations.userId, userId)))
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

  /**
   * Messages in a thread. With participantId, only returns the thread if that
   * user sent or received at least one message in it.
   */
  async getMessagesByThread(threadId: string, participantId?: string): Promise<Message[]> {
    if (participantId) {
      const [membership] = await db
        .select({ id: messages.id })
        .from(messages)
        .where(and(
          eq(messages.threadId, threadId),
          or(eq(messages.senderId, participantId), eq(messages.receiverId, participantId))
        ))
        .limit(1);
      if (!membership) return [];
    }
    return await db
      .select()
      .from(messages)
      .where(eq(messages.threadId, threadId))
      .orderBy(asc(messages.createdAt));
  }

  // Search operations
  async searchUsers(query: string, role?: string, limit = 20, matchEmail = false): Promise<User[]> {
    const pattern = `%${escapeLike(query)}%`;
    const conditions = [
      ilike(users.firstName, pattern),
      ilike(users.lastName, pattern),
      ...(matchEmail ? [ilike(users.email, pattern)] : []),
    ];

    let whereClause = and(or(...conditions), eq(users.isActive, true));
    if (role) {
      whereClause = and(whereClause, eq(users.role, role as any));
    }

    return await db
      .select(safeUserColumns)
      .from(users)
      .where(whereClause)
      .orderBy(asc(users.firstName))
      .limit(limit);
  }

  /** Searches projects. Pass visibleToUserId to limit results to public projects plus that user's own. */
  async searchProjects(query: string, visibleToUserId?: string): Promise<Project[]> {
    const pattern = `%${escapeLike(query)}%`;
    const matches = or(
      ilike(projects.name, pattern),
      ilike(projects.summary, pattern),
      ilike(projects.problem, pattern)
    );
    const where = visibleToUserId
      ? and(matches, or(eq(projects.isPublic, true), eq(projects.ownerId, visibleToUserId)))
      : matches;
    return await db
      .select()
      .from(projects)
      .where(where)
      .orderBy(desc(projects.createdAt))
      .limit(50);
  }

  /** Public projects plus the user's own. */
  async getVisibleProjects(userId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(or(eq(projects.isPublic, true), eq(projects.ownerId, userId)))
      .orderBy(desc(projects.createdAt));
  }

  // Roadmap Template Management
  async createRoadmapTemplate(template: InsertRoadmapTemplate): Promise<RoadmapTemplate> {
    const [newTemplate] = await db
      .insert(roadmapTemplates)
      .values(withCleanTranslations("roadmapTemplate", template))
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

  async getRoadmapTemplates(cohortId?: string, includeInactive = false): Promise<RoadmapTemplate[]> {
    if (includeInactive) {
      return await db
        .select()
        .from(roadmapTemplates)
        .orderBy(desc(roadmapTemplates.isActive), desc(roadmapTemplates.isDefault), desc(roadmapTemplates.createdAt));
    }
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
      .set({ ...withCleanTranslations("roadmapTemplate", data), updatedAt: new Date() })
      .where(eq(roadmapTemplates.id, id))
      .returning();
    return updatedTemplate;
  }

  /** Soft delete: the template stays for existing assignments but can't be assigned again. */
  async deleteRoadmapTemplate(id: string): Promise<boolean> {
    const updated = await db
      .update(roadmapTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(roadmapTemplates.id, id))
      .returning({ id: roadmapTemplates.id });
    return updated.length > 0;
  }

  // Roadmap Item Management
  async createRoadmapItem(item: InsertRoadmapItem): Promise<RoadmapItem> {
    const [newItem] = await db
      .insert(roadmapItems)
      .values(withCleanTranslations("roadmapItem", item))
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
      .set(withCleanTranslations("roadmapItem", data))
      .where(eq(roadmapItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteRoadmapItem(id: string): Promise<boolean> {
    const deleted = await db
      .delete(roadmapItems)
      .where(eq(roadmapItems.id, id))
      .returning({ id: roadmapItems.id });
    return deleted.length > 0;
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
        translations: roadmapItems.translations,
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

      // Progress for learning items, for display only. Statuses are persisted
      // by processAutoCompletions (forward-only) and by manual updates, so a
      // read never overwrites what a participant or admin set.
      if (item.autoCompletionType === 'lesson' && item.lessonId) {
        const progress = await this.getUserProgress(project.ownerId, item.lessonId);
        item.progressData = {
          type: 'lesson',
          isCompleted: progress?.isCompleted || false,
          completedAt: progress?.completedAt,
          score: progress?.score,
          timeSpent: progress?.timeSpent,
        };
      } else if (item.autoCompletionType === 'module' && item.moduleId) {
        const completion = await this.getModuleCompletion(project.ownerId, item.moduleId);
        item.progressData = {
          type: 'module',
          ...completion,
          isCompleted: completion.totalLessons > 0 && completion.completionRate >= (item.autoThreshold || 100),
        };
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
        if (template && template.isActive === false) {
          throw new InactiveTemplateError();
        }
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
      // Forward-only: never touch completed or waived items.
      if (!item.assignment || item.assignment.status === "completed" || item.assignment.status === "waived" ||
          item.autoCompletionType === "none") {
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
            const completion = await this.getModuleCompletion(project.ownerId, item.moduleId);
            shouldAutoComplete = completion.totalLessons > 0 && completion.completionRate >= (item.autoThreshold || 100);
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
          } else {
            // Sessions the owner took part in that have already ended.
            // autoThreshold is the number of sessions required.
            const [row] = await db
              .select({ count: sql<number>`count(*)::int` })
              .from(mentorSessions)
              .where(and(
                sql`${project.ownerId} = ANY(${mentorSessions.participantIds})`,
                sql`${mentorSessions.endTime} < now()`,
              ));
            shouldAutoComplete = (row?.count ?? 0) >= Math.max(1, item.autoThreshold ?? 1);
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
        completedAt: status === "completed" ? new Date() : null,
        autoCompleted: false,
        updatedAt: new Date()
      })
      .where(eq(assignedRoadmap.id, assignmentId))
      .returning();
    
    return updated;
  }

  async assignRoadmapTemplate(templateId: string, projectId: string): Promise<AssignedRoadmap[]> {
    return this.assignRoadmapToProject(projectId, templateId);
  }

  /**
   * When a project has a cohort but no roadmap yet, assign the cohort's
   * default template (or the global default). Returns false if none applies.
   */
  async autoAssignDefaultRoadmap(projectId: string): Promise<boolean> {
    const project = await this.getProject(projectId);
    if (!project?.cohortId) return false;
    const [existing] = await db
      .select({ id: assignedRoadmap.id })
      .from(assignedRoadmap)
      .where(eq(assignedRoadmap.projectId, projectId))
      .limit(1);
    if (existing) return false;
    const templates = await this.getRoadmapTemplates(project.cohortId);
    const template =
      templates.find((t) => t.isDefault && t.cohortId === project.cohortId) ??
      templates.find((t) => t.isDefault && !t.cohortId);
    if (!template) return false;
    await this.assignRoadmapToProject(projectId, template.id);
    return true;
  }

  /** The project a participant's roadmap belongs to: one with a roadmap, else one with a cohort, else the newest. */
  async getRoadmapProjectForUser(userId: string): Promise<Project | undefined> {
    const userProjects = await this.getProjectsByUser(userId);
    if (userProjects.length === 0) return undefined;
    const withAssignments = await db
      .selectDistinct({ projectId: assignedRoadmap.projectId })
      .from(assignedRoadmap)
      .where(inArray(assignedRoadmap.projectId, userProjects.map((p) => p.id)));
    const assigned = new Set(withAssignments.map((r) => r.projectId));
    return (
      userProjects.find((p) => assigned.has(p.id)) ??
      userProjects.find((p) => p.cohortId) ??
      userProjects[0]
    );
  }
}

export const storage = new DatabaseStorage();
