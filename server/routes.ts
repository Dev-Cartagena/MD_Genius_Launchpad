import type { Express, Request, Response, NextFunction } from "express";
import { storage, normalizeEmail, InactiveTemplateError } from "./storage.js";
import { isAuthenticated, createLocalUserSession } from "./auth.js";
import { aiCoachService, isAiConfigured } from "./aiCoach.js";
import {
  createSignedUpload,
  createSignedDownload,
  isAllowedContentType,
  ownerOfPath,
  MAX_UPLOAD_BYTES,
  StorageNotConfiguredError,
} from "./fileStorage.js";
import { sendEmail, passwordResetEmail, inviteEmail, appBaseUrl } from "./email.js";
import { rateLimit } from "./rateLimit.js";
import { z } from "zod";
import {
  insertApplicationSchema,
  insertProjectSchema,
  insertMessageSchema,
  insertCohortSchema,
  insertModuleSchema,
  insertLessonSchema,
  insertQuizSchema,
  insertRoadmapTemplateSchema,
  insertRoadmapItemSchema,
  insertMentorProfileSchema,
  insertMentorSessionSchema,
  insertInvestorSchema,
  insertInvestorSessionSchema,
  insertInvestorCohortParticipationSchema,
  adminUpdateUserSchema,
  adminUpdateCohortSchema,
  adminUpdateMentorProfileSchema,
  applicationStatusEnum,
  investorInterestLevelEnum,
  userRoleEnum,
  type User,
} from "../shared/schema.js";
import bcrypt from "bcrypt";
import crypto from "crypto";

const email = z.string().trim().toLowerCase().email("Invalid email address");

// Validation schemas for email/password authentication
const registerSchema = z.object({
  email,
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
});

const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required").max(200),
});

const forgotPasswordSchema = z.object({ email });

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required").max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const FIFTEEN_MINUTES = 15 * 60 * 1000;

const loginLimit = rateLimit({ name: "login", windowMs: FIFTEEN_MINUTES, maxPerIp: 50, maxPerEmail: 10 });
const registerLimit = rateLimit({ name: "register", windowMs: 60 * 60 * 1000, maxPerIp: 20 });
const passwordResetLimit = rateLimit({ name: "reset", windowMs: FIFTEEN_MINUTES, maxPerIp: 20, maxPerEmail: 5 });

// Validation schemas for mentor operations
const updateMentorProfileSchema = insertMentorProfileSchema.partial().omit({ userId: true });
// Participant lists are set only by booking, so nobody can add arbitrary users to a session.
const updateMentorSessionSchema = insertMentorSessionSchema.partial().omit({ mentorId: true, participantIds: true });

// Validation schemas for investor operations
const updateInvestorSchema = insertInvestorSchema.partial().omit({ userId: true });
// Admins may also link a user account and (re)activate investors.
const adminUpdateInvestorSchema = insertInvestorSchema.partial();
const updateInvestorSessionSchema = insertInvestorSessionSchema.partial().omit({ investorId: true });

// Fields that only the server or reviewers may set.
const applicationInputSchema = insertApplicationSchema.omit({
  userId: true,
  status: true,
  scores: true,
  reviewerNotes: true,
  submittedAt: true,
});
const projectInputSchema = insertProjectSchema.omit({ ownerId: true, readinessScore: true });

const aiChatSchema = z.object({
  messages: z
    .array(z.discriminatedUnion("role", [
      z.object({ role: z.literal("user"), content: z.string().min(1).max(4000) }),
      // Coach replies can be long; they come back from the server, so allow more.
      z.object({ role: z.literal("assistant"), content: z.string().min(1).max(20000) }),
    ]))
    .min(1)
    .max(40),
  mode: z.enum(["process_guide", "ideation", "technical", "gtm", "pitch"]).default("process_guide"),
  conversationId: z.string().max(64).optional(),
});

const uploadRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1).max(200),
  size: z.number().int().positive(),
});

/**
 * Maps expected Postgres errors to client errors instead of 500s:
 * unknown referenced ids (FK), duplicates (unique), and malformed values.
 * Returns true when it sent a response.
 */
function respondDbError(res: Response, error: unknown): boolean {
  const code = (error as any)?.code ?? (error as any)?.cause?.code;
  if (code === "23503") {
    res.status(400).json({ message: "A referenced record does not exist" });
    return true;
  }
  if (code === "23505") {
    res.status(409).json({ message: "This record already exists" });
    return true;
  }
  if (code === "22P02" || code === "22007" || code === "22008") {
    res.status(400).json({ message: "Invalid value" });
    return true;
  }
  return false;
}

/** The active user loaded by isAuthenticated. */
function currentUser(req: Request): User {
  return (req as any).currentUser as User;
}

function hasRole(user: User | undefined, ...roles: User["role"][]): boolean {
  return Boolean(user && roles.includes(user.role));
}

/** Middleware: only allow the listed roles. Use after isAuthenticated. */
function requireRole(...roles: User["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!hasRole(currentUser(req), ...roles)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

function zodMessage(error: z.ZodError): string {
  const issue = error.errors[0];
  return issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message;
}

/** Week 1-8 of the user's cohort today, or null when they have no cohort. */
async function currentProgramWeek(userId: string): Promise<number | null> {
  const project = await storage.getRoadmapProjectForUser(userId);
  const cohortId = project?.cohortId ?? (await storage.getAcceptedCohortIds(userId))[0];
  if (!cohortId) return null;
  const cohort = await storage.getCohort(cohortId);
  if (!cohort?.startDate) return null;
  const elapsed = Math.floor((Date.now() - new Date(cohort.startDate).getTime()) / (7 * 24 * 60 * 60 * 1000));
  return Math.min(Math.max(elapsed + 1, 1), 8);
}

/** Non-admins may only attach a project to a cohort they were accepted into. */
async function canUseCohort(user: User, cohortId: string | null | undefined): Promise<boolean> {
  if (!cohortId || user.role === "administrator") return true;
  const accepted = await storage.getAcceptedCohortIds(user.id);
  return accepted.includes(cohortId);
}

export function registerRoutes(app: Express): void {
  // Email/Password Authentication Routes
  app.post('/api/auth/register', registerLimit, async (req, res) => {
    try {
      const { email, password, firstName, lastName } = registerSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      const passwordHash = await bcrypt.hash(password, 12);
      let user;
      try {
        user = await storage.createLocalUser({ email, firstName, lastName, passwordHash });
      } catch (insertError: any) {
        // Lost a race with a concurrent sign-up for the same email.
        if (insertError?.code === "23505" || insertError?.cause?.code === "23505") {
          return res.status(400).json({ message: "User with this email already exists" });
        }
        throw insertError;
      }
      
      // Regenerate the session ID to prevent session fixation
      const userSession = createLocalUserSession(user);
      req.session.regenerate((sessionErr) => {
        if (sessionErr) {
          console.error('Session regeneration error during registration:', sessionErr);
          return res.status(500).json({ message: "Registration successful but session setup failed" });
        }
        
        req.login(userSession, (err) => {
          if (err) {
            console.error('Login error during registration:', err);
            return res.status(500).json({ message: "Registration successful but login failed" });
          }
          res.status(201).json({ message: "Registration successful", user: { id: user.id, email: user.email, role: user.role } });
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Registration error:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post('/api/auth/login', loginLimit, async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserCredentialsByEmail(email);
      // Same message for every failure so the response doesn't reveal which emails exist.
      if (!user || !user.passwordHash || user.isActive === false) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Regenerate the session ID to prevent session fixation
      const userSession = createLocalUserSession(user);
      req.session.regenerate((sessionErr) => {
        if (sessionErr) {
          console.error('Session regeneration error during login:', sessionErr);
          return res.status(500).json({ message: "Login failed due to session error" });
        }
        
        req.login(userSession, (err) => {
          if (err) {
            console.error('Login error:', err);
            return res.status(500).json({ message: "Login failed" });
          }
          res.json({ message: "Login successful", user: { id: user.id, email: user.email, role: user.role } });
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Login error:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post('/api/auth/forgot-password', passwordResetLimit, async (req, res) => {
    const genericMessage = "If an account exists with this email, you will receive password reset instructions.";
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user || user.isActive === false) {
        // Don't reveal whether the email exists
        return res.json({ message: genericMessage });
      }
      
      const resetToken = crypto.randomBytes(32).toString('hex');
      // SHA-256 so the stored value can be looked up; the token itself is never stored.
      const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      await storage.setResetToken(user.id, tokenHash, new Date(Date.now() + RESET_TOKEN_TTL_MS));
      
      const link = `${appBaseUrl()}/reset-password?token=${resetToken}`;
      try {
        await sendEmail(passwordResetEmail(user.email!, link));
      } catch (emailError) {
        // Same response either way, so failures don't reveal which emails exist.
        console.error("Password reset email failed:", emailError);
      }
      
      res.json({ message: genericMessage });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Forgot password error:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Password reset request failed" });
    }
  });

  app.post('/api/auth/reset-password', passwordResetLimit, async (req, res) => {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);
      
      const newPasswordHash = await bcrypt.hash(password, 12);
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const success = await storage.updatePasswordByResetToken(tokenHash, newPasswordHash);
      
      if (!success) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      
      res.json({ message: "Password reset successful" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Reset password error:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Password reset failed" });
    }
  });

  // Existing Auth routes
  app.get('/api/auth/user', isAuthenticated, (req, res) => {
    res.json(currentUser(req));
  });

  // Application routes
  app.post('/api/applications', isAuthenticated, async (req: any, res) => {
    try {
      const applicationData = applicationInputSchema.parse(req.body);
      const application = await storage.createApplication({
        ...applicationData,
        userId: currentUser(req).id,
        status: "draft",
      });
      res.status(201).json(application);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error creating application:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to create application" });
    }
  });

  app.get('/api/applications/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const applications = await storage.getApplicationsByUser(userId);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.post('/api/applications/submit', isAuthenticated, async (req: any, res) => {
    try {
      const user = currentUser(req);
      const applicationData = applicationInputSchema.parse(req.body);
      const previous = await storage.getApplicationsByUser(user.id);
      if (previous.some((a) => a.cohortId === applicationData.cohortId && a.status !== 'draft' && a.status !== 'rejected')) {
        return res.status(409).json({ message: "You have already applied to this cohort" });
      }
      
      const application = await storage.createApplication({
        ...applicationData,
        userId: user.id,
        status: "submitted",
        submittedAt: new Date(),
      });
      
      // Visitors become applicants once they submit.
      if (user.role === 'public_visitor') {
        try {
          await storage.updateUser(user.id, { role: 'applicant' });
        } catch (roleUpdateError) {
          console.error(`Failed to update role after application submission for user ${user.id}:`, roleUpdateError);
        }
      }
      
      res.status(201).json(application);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error submitting application:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to submit application" });
    }
  });

  const applicationStatusSchema = z.object({
    status: z.enum(applicationStatusEnum.enumValues),
    reviewerNotes: z.string().max(5000).optional(),
    // Rubric scores, e.g. { total: 82, team: 4 }.
    scores: z.record(z.number()).optional(),
  });

  app.put('/api/applications/:id/status', isAuthenticated, requireRole('administrator', 'mentor'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, reviewerNotes, scores } = applicationStatusSchema.parse(req.body);
      
      const existing = await storage.getApplication(id);
      if (!existing) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      const application = await storage.updateApplicationStatus(id, status, reviewerNotes, scores);
      
      // Accepted applicants become participants.
      if (status === 'accepted') {
        try {
          const applicantUser = await storage.getUser(application.userId);
          if (applicantUser && ['applicant', 'public_visitor'].includes(applicantUser.role)) {
            await storage.updateUser(applicantUser.id, { role: 'participant' });
          }
        } catch (roleUpdateError) {
          console.error(`Failed to update user role for accepted application ${id}:`, roleUpdateError);
        }
      }
      
      res.json(application);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error updating application status:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to update application status" });
    }
  });

  // Project routes
  app.post('/api/projects', isAuthenticated, requireRole('participant', 'administrator'), async (req: any, res) => {
    try {
      const user = currentUser(req);
      const projectData = projectInputSchema.parse(req.body);
      if (!(await canUseCohort(user, projectData.cohortId))) {
        return res.status(403).json({ message: "You can only add a project to a cohort you were accepted into" });
      }
      // A participant accepted into exactly one cohort gets that cohort by default.
      if (!projectData.cohortId && user.role === 'participant') {
        const accepted = await storage.getAcceptedCohortIds(user.id);
        if (accepted.length === 1) projectData.cohortId = accepted[0];
      }
      
      const project = await storage.createProject({ ...projectData, ownerId: user.id });
      await storage.autoAssignDefaultRoadmap(project.id);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error creating project:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Project directory: staff and investors see all projects, everyone else
  // sees public projects plus their own.
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const user = currentUser(req);
      const projects = hasRole(user, 'administrator', 'mentor', 'investor')
        ? await storage.getAllProjects()
        : await storage.getVisibleProjects(user.id);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projects = await storage.getProjectsByUser(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.put('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const project = await storage.getProject(id);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const user = currentUser(req);
      const isAdmin = user.role === 'administrator';
      if (project.ownerId !== user.id && !isAdmin) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      // Admins may also set the readiness score; owners may not score themselves.
      const updateSchema = isAdmin
        ? insertProjectSchema.omit({ ownerId: true }).partial()
        : projectInputSchema.partial();
      const validatedData = updateSchema.parse(req.body);
      if ('cohortId' in validatedData && validatedData.cohortId !== project.cohortId &&
          !(await canUseCohort(user, validatedData.cohortId))) {
        return res.status(403).json({ message: "You can only add a project to a cohort you were accepted into" });
      }
      
      const updatedProject = await storage.updateProject(id, validatedData);
      if (validatedData.cohortId) {
        await storage.autoAssignDefaultRoadmap(id);
      }
      res.json(updatedProject);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error updating project:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.get('/api/projects/cohort/:cohortId', isAuthenticated, async (req: any, res) => {
    try {
      const { cohortId } = req.params;
      const user = currentUser(req);
      const isStaff = hasRole(user, 'administrator', 'mentor', 'investor');
      if (!isStaff) {
        const accepted = await storage.getAcceptedCohortIds(user.id);
        if (!accepted.includes(cohortId)) {
          return res.status(403).json({ message: "Insufficient permissions" });
        }
      }
      const projects = await storage.getProjectsByCohort(cohortId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching cohort projects:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch cohort projects" });
    }
  });

  // Roadmap routes
  
  // Participant roadmap routes
  app.get('/api/projects/:projectId/roadmap', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const user = currentUser(req);
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.ownerId !== user.id && !hasRole(user, 'administrator', 'mentor')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      // Completions that became due (e.g. a mentor session ended) are applied before reading.
      await storage.processAutoCompletions(projectId);
      const roadmap = await storage.getProjectRoadmap(projectId);
      // null (not an empty body) when no roadmap is assigned yet
      res.json(roadmap ?? null);
    } catch (error) {
      console.error("Error fetching project roadmap:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch project roadmap" });
    }
  });
  
  app.patch('/api/roadmap/assignments/:assignmentId/status', isAuthenticated, async (req: any, res) => {
    try {
      const { assignmentId } = req.params;
      const { status } = req.body;
      const userId = req.user.claims.sub;
      
      // Validate status
      if (!['not_started', 'in_progress', 'completed', 'blocked', 'waived'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be not_started, in_progress, completed, blocked, or waived" });
      }
      
      // Get assignment and verify permission
      const assignment = await storage.getAssignedRoadmapItem(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      const project = await storage.getProject(assignment.projectId);
      const user = await storage.getUser(userId);
      if (project?.ownerId !== userId && user?.role !== 'administrator') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      const updatedAssignment = await storage.updateAssignedRoadmapStatus(assignmentId, status);
      
      // Process auto-completions if marked as completed
      if (status === 'completed') {
        await storage.processAutoCompletions(assignment.projectId);
      }
      
      res.json(updatedAssignment);
    } catch (error) {
      console.error("Error updating assignment status:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to update assignment status" });
    }
  });

  // Participant roadmap convenience routes
  app.get('/api/roadmap', isAuthenticated, async (req: any, res) => {
    try {
      const activeProject = await storage.getRoadmapProjectForUser(currentUser(req).id);
      
      if (!activeProject) {
        return res.json(null);
      }
      
      await storage.processAutoCompletions(activeProject.id);
      const roadmap = await storage.getProjectRoadmap(activeProject.id);
      res.json(roadmap ?? null);
    } catch (error) {
      console.error("Error fetching user roadmap:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch roadmap" });
    }
  });

  app.get('/api/roadmap/current-week', isAuthenticated, async (req: any, res) => {
    try {
      const activeProject = await storage.getRoadmapProjectForUser(currentUser(req).id);
      
      if (!activeProject) {
        return res.json([]);
      }
      await storage.processAutoCompletions(activeProject.id);
      
      // Program week from the project's cohort start date (week 1..8).
      let currentWeek = 1;
      if (activeProject.cohortId) {
        const cohort = await storage.getCohort(activeProject.cohortId);
        if (cohort?.startDate) {
          const elapsedWeeks = Math.floor((Date.now() - new Date(cohort.startDate).getTime()) / (7 * 24 * 60 * 60 * 1000));
          currentWeek = Math.min(Math.max(elapsedWeeks + 1, 1), 8);
        }
      }
      const currentWeekItems = await storage.getParticipantRoadmapByWeek(activeProject.id, currentWeek);
      res.json(currentWeekItems);
    } catch (error) {
      console.error("Error fetching current week roadmap:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch current week roadmap" });
    }
  });
  
  // Admin roadmap template management routes
  // Admins see archived templates too, so they can restore them.
  app.get('/api/admin/roadmap/templates', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      res.json(await storage.getRoadmapTemplates(undefined, true));
    } catch (error) {
      console.error("Error fetching roadmap templates:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch roadmap templates" });
    }
  });

  const templateUpdateSchema = z.object({
    name: z.string().trim().min(1).max(255).optional(),
    description: z.string().max(5000).nullable().optional(),
    cohortId: z.string().min(1).nullable().optional(),
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }).strict();

  app.put('/api/admin/roadmap/templates/:templateId', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      const updateData = templateUpdateSchema.parse(req.body);
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "At least one field must be provided for update" });
      }
      if (!(await storage.getRoadmapTemplate(req.params.templateId))) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(await storage.updateRoadmapTemplate(req.params.templateId, updateData));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error updating roadmap template:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to update roadmap template" });
    }
  });
  
  app.post('/api/admin/roadmap/templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'administrator') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const validatedData = insertRoadmapTemplateSchema.parse(req.body);
      const template = await storage.createRoadmapTemplate(validatedData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating roadmap template:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to create roadmap template" });
    }
  });
  
  app.get('/api/admin/roadmap/templates/:templateId', isAuthenticated, async (req: any, res) => {
    try {
      const { templateId } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'administrator') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const template = await storage.getRoadmapTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching roadmap template:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch roadmap template" });
    }
  });

  app.get('/api/admin/roadmap/templates/:templateId/items', isAuthenticated, async (req: any, res) => {
    try {
      const { templateId } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'administrator') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const items = await storage.getRoadmapItemsByTemplate(templateId);
      res.json(items);
    } catch (error) {
      console.error("Error getting roadmap items for template:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to get roadmap items" });
    }
  });


  /** Checks linked lesson/module ids and fills a sensible threshold. Returns an error message or null. */
  async function prepareRoadmapItem(data: Record<string, any>): Promise<string | null> {
    if (data.lessonId && !(await storage.getLesson(data.lessonId))) return "Linked lesson not found";
    if (data.moduleId && !(await storage.getModule(data.moduleId))) return "Linked module not found";
    if (data.autoCompletionType === "lesson" && !data.lessonId) return "Lesson auto-completion needs a linked lesson";
    if (data.autoCompletionType === "module" && !data.moduleId) return "Module auto-completion needs a linked module";
    if (data.autoCompletionType === "deliverable" || data.autoCompletionType === "milestone") {
      return "Deliverable and milestone auto-completion are not supported yet";
    }
    // For mentor sessions the threshold is a session count, not a percentage.
    if (data.autoCompletionType === "mentor_session" && (data.autoThreshold === undefined || data.autoThreshold === 100)) {
      data.autoThreshold = 1;
    }
    return null;
  }

  app.post('/api/admin/roadmap/templates/:templateId/items', isAuthenticated, async (req: any, res) => {
    try {
      const { templateId } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'administrator') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // Merge templateId from params with request body
      const itemData = { ...req.body, templateId };
      const validatedData = insertRoadmapItemSchema.parse(itemData);
      const itemError = await prepareRoadmapItem(validatedData);
      if (itemError) {
        return res.status(400).json({ message: itemError });
      }
      const item = await storage.createRoadmapItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating roadmap item for template:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to create roadmap item" });
    }
  });
  
  app.post('/api/admin/roadmap/templates/:templateId/assign', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      const { templateId } = req.params;
      const { projectId } = z.object({ projectId: z.string().min(1) }).parse(req.body);
      if (!(await storage.getRoadmapTemplate(templateId))) {
        return res.status(404).json({ message: "Template not found" });
      }
      if (!(await storage.getProject(projectId))) {
        return res.status(404).json({ message: "Project not found" });
      }
      const result = await storage.assignRoadmapTemplate(templateId, projectId);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      if (error instanceof InactiveTemplateError) {
        return res.status(409).json({ message: error.message });
      }
      console.error("Error assigning roadmap template:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to assign roadmap template" });
    }
  });
  
  app.delete('/api/admin/roadmap/templates/:templateId', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      const found = await storage.deleteRoadmapTemplate(req.params[Object.keys(req.params)[0]]);
      if (!found) {
        return res.status(404).json({ message: "Roadmap template not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error archiving roadmap template:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to archiving roadmap template" });
    }
  });
  
  app.post('/api/admin/roadmap/items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'administrator') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const validatedData = insertRoadmapItemSchema.parse(req.body);
      const itemError = await prepareRoadmapItem(validatedData);
      if (itemError) {
        return res.status(400).json({ message: itemError });
      }
      const item = await storage.createRoadmapItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating roadmap item:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to create roadmap item" });
    }
  });
  
  app.patch('/api/admin/roadmap/items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const { itemId } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'administrator') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const updateSchema = insertRoadmapItemSchema.partial();
      const validatedData = updateSchema.parse(req.body);
      if (Object.keys(validatedData).length === 0) {
        return res.status(400).json({ message: "At least one field must be provided for update" });
      }
      const current = await storage.getRoadmapItem(itemId);
      if (!current) {
        return res.status(404).json({ message: "Roadmap item not found" });
      }
      const itemError = await prepareRoadmapItem({ ...current, ...validatedData });
      if (itemError) {
        return res.status(400).json({ message: itemError });
      }
      const updatedItem = await storage.updateRoadmapItem(itemId, validatedData);
      
      if (!updatedItem) {
        return res.status(404).json({ message: "Roadmap item not found" });
      }
      
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating roadmap item:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to update roadmap item" });
    }
  });
  
  app.delete('/api/admin/roadmap/items/:itemId', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      const found = await storage.deleteRoadmapItem(req.params[Object.keys(req.params)[0]]);
      if (!found) {
        return res.status(404).json({ message: "Roadmap item not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error delete roadmap item:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to delete roadmap item" });
    }
  });

  // Cohort routes
  app.get('/api/cohorts', async (req, res) => {
    try {
      const cohorts = await storage.getActiveCohorts();
      res.json(cohorts);
    } catch (error) {
      console.error("Error fetching cohorts:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch cohorts" });
    }
  });

  app.get('/api/cohorts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const cohort = await storage.getCohort(id);
      
      if (!cohort) {
        return res.status(404).json({ message: "Cohort not found" });
      }
      
      res.json(cohort);
    } catch (error) {
      console.error("Error fetching cohort:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch cohort" });
    }
  });

  // Curriculum routes
  app.get('/api/cohorts/:cohortId/modules', isAuthenticated, requireRole('participant', 'mentor', 'administrator'), async (req: any, res) => {
    try {
      const { cohortId } = req.params;
      const modules = await storage.getModulesByCohort(cohortId);
      res.json(modules);
    } catch (error) {
      console.error("Error fetching modules:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch modules" });
    }
  });

  app.get('/api/modules/:moduleId/lessons', isAuthenticated, requireRole('participant', 'mentor', 'administrator'), async (req: any, res) => {
    try {
      const { moduleId } = req.params;
      const lessons = await storage.getLessonsByModule(moduleId);
      res.json(lessons);
    } catch (error) {
      console.error("Error fetching lessons:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch lessons" });
    }
  });

  app.get('/api/cohorts/:cohortId/milestones', isAuthenticated, requireRole('participant', 'mentor', 'administrator'), async (req: any, res) => {
    try {
      const { cohortId } = req.params;
      const milestones = await storage.getMilestonesByCohort(cohortId);
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching milestones:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch milestones" });
    }
  });

  // Lesson routes

  app.get('/api/lessons/:id', isAuthenticated, requireRole('participant', 'mentor', 'administrator'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const lesson = await storage.getLesson(id);
      
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      res.json(lesson);
    } catch (error) {
      console.error("Error fetching lesson:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch lesson" });
    }
  });

  // Admin Curriculum Management Routes
  
  // Module Management
  app.get('/api/admin/modules', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'administrator') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { cohortId } = req.query;
      let modules;
      if (cohortId) {
        modules = await storage.getModulesByCohort(cohortId as string);
      } else {
        // Get all modules across all cohorts
        const cohorts = await storage.getCohorts();
        const allModules = await Promise.all(
          cohorts.map(async (cohort: any) => {
            const cohortModules = await storage.getModulesByCohort(cohort.id);
            return cohortModules.map((module: any) => ({
              ...module,
              cohortName: cohort.name
            }));
          })
        );
        modules = allModules.flat();
      }
      
      res.json(modules);
    } catch (error) {
      console.error("Error fetching modules:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch modules" });
    }
  });

  app.post('/api/admin/modules', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'administrator') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const moduleData = insertModuleSchema.parse(req.body);
      const module = await storage.createModule(moduleData);
      res.status(201).json(module);
    } catch (error) {
      console.error("Error creating module:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to create module" });
    }
  });

  app.put('/api/admin/modules/:id', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = insertModuleSchema.partial().parse(req.body);
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "At least one field must be provided for update" });
      }
      const updated = await storage.updateModule(id, updateData);
      if (!updated) {
        return res.status(404).json({ message: "Module not found" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error updating module:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to update module" });
    }
  });

  app.delete('/api/admin/modules/:id', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      const found = await storage.deleteModule(req.params[Object.keys(req.params)[0]]);
      if (!found) {
        return res.status(404).json({ message: "Module not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error delete module:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to delete module" });
    }
  });

  app.post('/api/admin/modules/:id/duplicate', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { newCohortId } = z.object({ newCohortId: z.string().min(1) }).parse(req.body);
      if (!(await storage.getCohort(newCohortId))) {
        return res.status(404).json({ message: "Cohort not found" });
      }
      const duplicatedModule = await storage.duplicateModule(id, newCohortId);
      res.status(201).json(duplicatedModule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error duplicating module:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to duplicate module" });
    }
  });

  // Lesson Management
  app.get('/api/admin/lessons', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'administrator') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { moduleId } = req.query;
      if (!moduleId) {
        return res.status(400).json({ message: "moduleId is required" });
      }
      
      const lessons = await storage.getLessonsByModule(moduleId as string);
      res.json(lessons);
    } catch (error) {
      console.error("Error fetching lessons:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch lessons" });
    }
  });

  app.post('/api/admin/lessons', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'administrator') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const lessonData = insertLessonSchema.parse(req.body);
      const lesson = await storage.createLesson(lessonData);
      res.status(201).json(lesson);
    } catch (error) {
      console.error("Error creating lesson:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to create lesson" });
    }
  });

  app.put('/api/admin/lessons/:id', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = insertLessonSchema.partial().parse(req.body);
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "At least one field must be provided for update" });
      }
      const updated = await storage.updateLesson(id, updateData);
      if (!updated) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error updating lesson:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to update lesson" });
    }
  });

  app.delete('/api/admin/lessons/:id', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      const found = await storage.deleteLesson(req.params[Object.keys(req.params)[0]]);
      if (!found) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error delete lesson:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to delete lesson" });
    }
  });

  // Quiz Management
  app.get('/api/admin/quizzes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'administrator') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const quizzes = await storage.getAllQuizzes();
      res.json(quizzes);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch quizzes" });
    }
  });

  app.post('/api/admin/quizzes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'administrator') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const quizData = insertQuizSchema.parse(req.body);
      const quiz = await storage.createQuiz(quizData);
      res.status(201).json(quiz);
    } catch (error) {
      console.error("Error creating quiz:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to create quiz" });
    }
  });

  app.put('/api/admin/quizzes/:id', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = insertQuizSchema.partial().parse(req.body);
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "At least one field must be provided for update" });
      }
      const updated = await storage.updateQuiz(id, updateData);
      if (!updated) {
        return res.status(404).json({ message: "Quiz not found" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error updating quiz:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to update quiz" });
    }
  });

  app.delete('/api/admin/quizzes/:id', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      const found = await storage.deleteQuiz(req.params[Object.keys(req.params)[0]]);
      if (!found) {
        return res.status(404).json({ message: "Quiz not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error delete quiz:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to delete quiz" });
    }
  });

  // Quiz for a lesson, without the answers.
  app.get('/api/quizzes/:id', isAuthenticated, requireRole('participant', 'mentor', 'administrator'), async (req: any, res) => {
    try {
      const quiz = await storage.getQuiz(req.params.id);
      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }
      const questions = (Array.isArray(quiz.questions) ? quiz.questions : []) as Array<{ question: string; options: string[] }>;
      res.json({
        id: quiz.id,
        title: quiz.title,
        passThreshold: quiz.passThreshold,
        maxAttempts: quiz.maxAttempts,
        questions: questions.map((q) => ({ question: q.question, options: q.options })),
      });
    } catch (error) {
      console.error("Error fetching quiz:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch quiz" });
    }
  });

  // Scores a quiz attempt on the server; passing completes the lesson.
  app.post('/api/lessons/:lessonId/quiz/submit', isAuthenticated, requireRole('participant', 'administrator'), async (req: any, res) => {
    try {
      const user = currentUser(req);
      const { answers } = z.object({ answers: z.array(z.number().int().min(0)).max(200) }).parse(req.body);
      const lesson = await storage.getLesson(req.params.lessonId);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      const quiz = lesson.quizId ? await storage.getQuiz(lesson.quizId) : undefined;
      if (!quiz) {
        return res.status(404).json({ message: "This lesson has no quiz" });
      }
      const progress = await storage.getUserProgress(user.id, lesson.id);
      const maxAttempts = quiz.maxAttempts ?? 3;
      if (!progress?.isCompleted && (progress?.attempts ?? 0) >= maxAttempts) {
        return res.status(409).json({ message: "No attempts left for this quiz. Please contact your mentor." });
      }
      const questions = (Array.isArray(quiz.questions) ? quiz.questions : []) as Array<{ correctAnswer: number }>;
      const correct = questions.filter((q, i) => answers[i] === q.correctAnswer).length;
      const total = questions.length;
      const score = total > 0 ? Math.round((correct / total) * 100) : 0;
      const passed = score >= quiz.passThreshold;
      const updated = await storage.recordQuizAttempt(user.id, lesson.id, score, passed);
      if (passed) {
        for (const project of await storage.getProjectsByUser(user.id)) {
          await storage.processAutoCompletions(project.id);
        }
      }
      res.json({ score, passed, correct, total, attempts: updated.attempts, maxAttempts });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error submitting quiz:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to submit quiz" });
    }
  });

  // User progress routes
  app.get('/api/progress/lesson/:lessonId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { lessonId } = req.params;
      const progress = await storage.getUserProgress(userId, lessonId);
      res.json(progress || { isCompleted: false, score: null });
    } catch (error) {
      console.error("Error fetching lesson progress:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch lesson progress" });
    }
  });

  app.get('/api/progress/module/:moduleId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { moduleId } = req.params;
      const progress = await storage.getUserProgressForModule(userId, moduleId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching module progress:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch module progress" });
    }
  });

  app.post('/api/progress/lesson/:lessonId/complete', isAuthenticated, requireRole('participant', 'administrator'), async (req: any, res) => {
    try {
      const { lessonId } = req.params;
      const progressSchema = z.object({
        score: z.number().int().min(0).max(100).optional(),
        timeSpent: z.number().int().min(0).optional(),
      });
      const { score, timeSpent } = progressSchema.parse(req.body ?? {});
      
      if (!(await storage.getLesson(lessonId))) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      const user = currentUser(req);
      const progress = await storage.markLessonComplete(user.id, lessonId, score, timeSpent);
      for (const project of await storage.getProjectsByUser(user.id)) {
        await storage.processAutoCompletions(project.id);
      }
      res.json(progress);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error marking lesson complete:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to mark lesson complete" });
    }
  });

  app.get('/api/progress/cohort/:cohortId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { cohortId } = req.params;
      const progress = await storage.getUserProgressForCohort(userId, cohortId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching cohort progress:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch cohort progress" });
    }
  });

  // Deliverable routes
  app.get('/api/projects/:projectId/deliverables', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      const user = currentUser(req);
      if (project.ownerId !== user.id && !hasRole(user, 'administrator', 'mentor')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      const deliverables = await storage.getDeliverablesByProject(projectId);
      res.json(deliverables);
    } catch (error) {
      console.error("Error fetching deliverables:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch deliverables" });
    }
  });

  app.get('/api/projects/:projectId/artifacts', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      const user = currentUser(req);
      if (project.ownerId !== user.id && !hasRole(user, 'administrator', 'mentor')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      res.json(await storage.getArtifactsByProject(projectId));
    } catch (error) {
      console.error("Error fetching artifacts:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch artifacts" });
    }
  });

  app.post('/api/projects/:projectId/artifacts', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const user = currentUser(req);
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const isAdmin = user.role === 'administrator';
      if (project.ownerId !== user.id && !isAdmin) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      const artifactSchema = z.object({
        type: z.string().min(1).max(100),
        title: z.string().min(1).max(255),
        fileRef: z.string().min(1).max(500),
        version: z.number().int().positive().optional().default(1),
        isGated: z.boolean().optional().default(false),
      });
      
      const artifactData = artifactSchema.parse(req.body);
      // Only files the caller uploaded can be attached.
      if (!isAdmin && ownerOfPath(artifactData.fileRef) !== user.id) {
        return res.status(400).json({ message: "fileRef must be a file you uploaded" });
      }
      const artifact = await storage.createArtifact({ ...artifactData, projectId });
      
      res.status(201).json(artifact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error creating artifact:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to create artifact" });
    }
  });

  app.patch('/api/projects/:id/stage', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { stage } = req.body;
      
      // Validate stage
      const validStages = ['ideation', 'validation', 'mvp_build', 'pilot_traction', 'pitch_ready'];
      if (!validStages.includes(stage)) {
        return res.status(400).json({ message: "Invalid project stage" });
      }
      
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check ownership or admin permissions
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (project.ownerId !== userId && user?.role !== 'administrator') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      const updatedProject = await storage.updateProject(id, { stage });
      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating project stage:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to update project stage" });
    }
  });

  // Admin routes
  app.get('/api/admin/applications', isAuthenticated, async (req: any, res) => {
    try {
      // Check admin permissions
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ message: "Administrator access required" });
      }
      
      const applications = await storage.getAllApplications();
      res.json(applications);
    } catch (error) {
      console.error("Error fetching admin applications:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      // Check admin permissions
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ message: "Administrator access required" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/admin/users/:id', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = adminUpdateUserSchema.partial().parse(req.body);
      
      // Admins can't lock themselves out.
      if (id === currentUser(req).id &&
          ((updateData.role && updateData.role !== 'administrator') || updateData.isActive === false)) {
        return res.status(400).json({ message: "You can't remove your own administrator access" });
      }
      
      if (updateData.email) {
        updateData.email = normalizeEmail(updateData.email);
        const existingUser = await storage.getUserByEmail(updateData.email);
        if (existingUser && existingUser.id !== id) {
          return res.status(400).json({ message: "Email address is already in use" });
        }
      }
      
      const updatedUser = await storage.updateUser(id, updateData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error updating user:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  const inviteSchema = z.object({
    email,
    firstName: z.string().trim().max(100).optional(),
    lastName: z.string().trim().max(100).optional(),
    role: z.enum(userRoleEnum.enumValues).default("public_visitor"),
  });

  // Creates the account and emails a link to set a password.
  app.post('/api/admin/users/invite', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      const userData = inviteSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      const newUser = await storage.createLocalUser(userData);
      
      const inviteToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(inviteToken).digest('hex');
      await storage.setResetToken(newUser.id, tokenHash, new Date(Date.now() + INVITE_TOKEN_TTL_MS));
      
      const admin = currentUser(req);
      const inviterName = [admin.firstName, admin.lastName].filter(Boolean).join(" ");
      let inviteEmailSent = false;
      try {
        inviteEmailSent = await sendEmail(inviteEmail(newUser.email!, `${appBaseUrl()}/reset-password?token=${inviteToken}`, inviterName));
      } catch (emailError) {
        console.error("Invite email failed:", emailError);
      }
      
      res.status(201).json({ ...newUser, inviteEmailSent });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error inviting user:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to invite user" });
    }
  });

  app.get('/api/admin/projects', isAuthenticated, async (req: any, res) => {
    try {
      // Check admin permissions
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ message: "Administrator access required" });
      }
      
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching admin projects:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // All cohorts, including inactive ones (the public list is active-only).
  app.get('/api/admin/cohorts', isAuthenticated, requireRole('administrator'), async (_req: any, res) => {
    try {
      res.json(await storage.getCohorts());
    } catch (error) {
      console.error("Error fetching cohorts:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch cohorts" });
    }
  });

  app.post('/api/admin/cohorts', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      const cohortData = insertCohortSchema
        .extend({ capacity: z.number().int().min(1, "Capacity must be at least 1") })
        .refine((c) => c.endDate > c.startDate, { message: "End date must be after start date", path: ["endDate"] })
        .parse(req.body);
      const cohort = await storage.createCohort(cohortData);
      res.status(201).json(cohort);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error creating cohort:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to create cohort" });
    }
  });

  app.patch('/api/admin/cohorts/:id', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = adminUpdateCohortSchema.partial().parse(req.body);
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "At least one field must be provided for update" });
      }
      const existing = await storage.getCohort(id);
      if (!existing) {
        return res.status(404).json({ message: "Cohort not found" });
      }
      const start = updateData.startDate ?? existing.startDate;
      const end = updateData.endDate ?? existing.endDate;
      if (end <= start) {
        return res.status(400).json({ message: "End date must be after start date" });
      }
      res.json(await storage.updateCohort(id, updateData));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error updating cohort:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to update cohort" });
    }
  });

  // Creates a profile for a mentor who doesn't have one yet.
  app.post('/api/admin/mentors', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      const { userId, ...profile } = z.object({ userId: z.string().min(1) })
        .merge(adminUpdateMentorProfileSchema)
        .parse(req.body);
      const mentor = await storage.getUser(userId);
      if (!mentor) {
        return res.status(404).json({ message: "User not found" });
      }
      if (mentor.role !== "mentor") {
        return res.status(400).json({ message: "The user must have the mentor role" });
      }
      if (await storage.getMentorProfile(userId)) {
        return res.status(409).json({ message: "This mentor already has a profile" });
      }
      res.status(201).json(await storage.createMentorProfile({ ...profile, userId }));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error creating mentor profile:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to create mentor profile" });
    }
  });

  app.patch('/api/admin/mentors/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Check admin permissions
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ message: "Administrator access required" });
      }
      
      const { id } = req.params;
      
      // Validate update data using restricted schema
      const updateData = adminUpdateMentorProfileSchema.partial().parse(req.body);
      
      // Check for empty updates
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "At least one field must be provided for update" });
      }
      
      // Check if mentor profile exists
      const existingProfile = await storage.getMentorProfileById(id);
      if (!existingProfile) {
        return res.status(404).json({ message: "Mentor profile not found" });
      }
      
      // Update mentor profile
      const updatedProfile = await storage.updateMentorProfileById(id, updateData);
      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating mentor profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to update mentor profile" });
    }
  });

  // Mentor routes
  app.get('/api/mentors', isAuthenticated, async (req: any, res) => {
    try {
      const mentors = await storage.getMentors();
      const isAdmin = currentUser(req).role === 'administrator';
      if (isAdmin) {
        return res.json(mentors);
      }
      // Others only see bookable mentors (active profile), without emails.
      res.json(
        mentors
          .filter((m) => m.mentorProfile?.id && m.mentorProfile.isActive !== false)
          .map(({ email: _email, ...mentor }) => mentor),
      );
    } catch (error) {
      console.error("Error fetching mentors:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch mentors" });
    }
  });

  // Mentor Profile Management Routes
  // Participants who have booked sessions with the logged-in mentor.
  app.get('/api/mentors/mentees', isAuthenticated, requireRole('mentor'), async (req: any, res) => {
    try {
      res.json(await storage.getMenteesForMentor(currentUser(req).id));
    } catch (error) {
      console.error("Error fetching mentees:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch mentees" });
    }
  });

  app.get('/api/mentor/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Verify user has mentor role
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'mentor') {
        return res.status(403).json({ message: "Access denied. User must have mentor role." });
      }
      
      const profile = await storage.getMentorProfile(userId);
      // null means "no profile yet"; the page then offers to create one.
      res.json(profile ?? null);
    } catch (error) {
      console.error("Error fetching mentor profile:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch mentor profile" });
    }
  });

  app.post('/api/mentor/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profileData = insertMentorProfileSchema.parse({ ...req.body, userId });
      
      // Check if user has mentor role
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'mentor') {
        return res.status(403).json({ message: "Access denied. User must have mentor role." });
      }
      
      // Check if profile already exists
      const existingProfile = await storage.getMentorProfile(userId);
      if (existingProfile) {
        return res.status(400).json({ message: "Mentor profile already exists. Use PUT to update." });
      }
      
      const profile = await storage.createMentorProfile(profileData);
      res.status(201).json(profile);
    } catch (error) {
      console.error("Error creating mentor profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to create mentor profile" });
    }
  });

  app.put('/api/mentor/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updateData = updateMentorProfileSchema.parse(req.body);
      
      // Verify user has mentor role
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'mentor') {
        return res.status(403).json({ message: "Access denied. User must have mentor role." });
      }
      
      // Check for empty updates
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "At least one field must be provided for update" });
      }
      
      // Check if profile exists
      const existingProfile = await storage.getMentorProfile(userId);
      if (!existingProfile) {
        return res.status(404).json({ message: "Mentor profile not found" });
      }
      
      const updatedProfile = await storage.updateMentorProfile(userId, updateData);
      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating mentor profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to update mentor profile" });
    }
  });

  // Mentor Session Management Routes
  app.get('/api/mentor/sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessions = await storage.getMentorSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching mentor sessions:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch mentor sessions" });
    }
  });

  app.post('/api/mentor/sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessionData = insertMentorSessionSchema.omit({ participantIds: true }).parse({ ...req.body, mentorId: userId });
      if (sessionData.endTime <= sessionData.startTime) {
        return res.status(400).json({ message: "End time must be after start time" });
      }
      
      // Verify user is a mentor
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'mentor') {
        return res.status(403).json({ message: "Access denied. User must have mentor role." });
      }
      
      const session = await storage.createMentorSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating mentor session:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to create mentor session" });
    }
  });

  app.put('/api/mentor/sessions/:sessionId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId } = req.params;
      const updateData = updateMentorSessionSchema.parse(req.body);
      
      // Check for empty updates
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "At least one field must be provided for update" });
      }
      
      // Verify session exists and belongs to mentor
      const session = await storage.getMentorSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      if (session.mentorId !== userId) {
        return res.status(403).json({ message: "Access denied. You can only update your own sessions." });
      }
      if ((updateData.endTime ?? session.endTime) <= (updateData.startTime ?? session.startTime)) {
        return res.status(400).json({ message: "End time must be after start time" });
      }
      
      const updatedSession = await storage.updateMentorSession(sessionId, updateData);
      res.json(updatedSession);
    } catch (error) {
      console.error("Error updating mentor session:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to update mentor session" });
    }
  });

  app.get('/api/mentor/sessions/:sessionId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId } = req.params;
      
      const session = await storage.getMentorSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // Allow access to mentor or participants
      const user = await storage.getUser(userId);
      const isParticipant = session.participantIds?.includes(userId);
      const isMentor = session.mentorId === userId;
      
      if (!isMentor && !isParticipant && user?.role !== 'administrator') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(session);
    } catch (error) {
      console.error("Error fetching mentor session:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch mentor session" });
    }
  });

  // Participant Session Routes
  app.get('/api/participant/sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessions = await storage.getParticipantSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching participant sessions:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch participant sessions" });
    }
  });

  // Session Booking Route (for participants)
  const bookingSchema = z.object({
    title: z.string().trim().min(1).max(255),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    agenda: z.string().max(5000).optional(),
  }).refine((v) => v.endTime > v.startTime, { message: "endTime must be after startTime", path: ["endTime"] });

  function overlaps(a: { startTime: Date; endTime: Date }, b: { startTime: Date; endTime: Date }) {
    return a.startTime < b.endTime && b.startTime < a.endTime;
  }

  // Participants book a mentor. The server sets the participant list so a
  // booking can't add other people.
  app.post('/api/sessions/book', isAuthenticated, requireRole('participant'), async (req: any, res) => {
    try {
      const user = currentUser(req);
      const { mentorId } = z.object({ mentorId: z.string().min(1) }).parse(req.body);
      const booking = bookingSchema.parse(req.body);
      
      const mentor = await storage.getUser(mentorId);
      if (!mentor || mentor.role !== 'mentor' || mentor.isActive === false) {
        return res.status(404).json({ message: "Mentor not found" });
      }
      const profile = await storage.getMentorProfile(mentorId);
      if (profile && profile.isActive === false) {
        return res.status(409).json({ message: "This mentor is not taking bookings" });
      }
      
      const existing = await storage.getMentorSessions(mentorId);
      if (existing.some((s) => overlaps(s, booking))) {
        return res.status(409).json({ message: "The mentor already has a session at that time" });
      }
      
      const session = await storage.createMentorSession({
        ...booking,
        mentorId,
        participantIds: [user.id],
      });
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error booking session:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to book session" });
    }
  });

  // Investor Session Booking Route (for participants)
  app.post('/api/investor-sessions/book', isAuthenticated, requireRole('participant'), async (req: any, res) => {
    try {
      const user = currentUser(req);
      const { investorId, sessionType } = z.object({
        investorId: z.string().min(1),
        sessionType: z.string().max(50).optional(),
      }).parse(req.body);
      const booking = bookingSchema.parse(req.body);
      
      const investor = await storage.getInvestor(investorId);
      if (!investor || investor.isActive === false) {
        return res.status(404).json({ message: "Investor not found" });
      }
      
      const existing = await storage.getInvestorSessions(investorId);
      if (existing.some((s) => overlaps(s, booking))) {
        return res.status(409).json({ message: "The investor already has a session at that time" });
      }
      
      const session = await storage.createInvestorSession({
        ...booking,
        investorId,
        sessionType,
        participantIds: [user.id],
      });
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error booking investor session:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to book investor session" });
    }
  });

  // Admin Session Management Route
  app.get('/api/admin/sessions', isAuthenticated, async (req: any, res) => {
    try {
      // Verify user is an administrator
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ message: "Access denied. Administrator role required." });
      }
      
      const sessions = await storage.getAllMentorSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching admin sessions:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Investor Session Management Routes (for investors to manage their own sessions)
  app.get('/api/investor/sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Verify user is an investor and get their investor profile
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'investor') {
        return res.status(403).json({ message: "Access denied. Only investors can view their sessions." });
      }
      
      // Get investor by user ID and then their sessions
      const investors = await storage.getInvestorsByUser(userId);
      if (investors.length === 0) {
        // Not linked to an investor record yet: nothing scheduled.
        return res.json([]);
      }
      
      const sessions = await storage.getInvestorSessions(investors[0].id);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching investor sessions:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch investor sessions" });
    }
  });

  app.post('/api/investor/sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sessionData = insertInvestorSessionSchema.omit({ investorId: true, participantIds: true }).parse(req.body);
      
      // Verify user is an investor and get their investor profile
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'investor') {
        return res.status(403).json({ message: "Access denied. Only investors can create sessions." });
      }
      
      // Get investor by user ID
      const investors = await storage.getInvestorsByUser(userId);
      if (investors.length === 0) {
        return res.status(404).json({ message: "Investor profile not found" });
      }
      
      // Set the investorId from the authenticated investor
      const sessionWithInvestorId = { ...sessionData, investorId: investors[0].id };
      
      const session = await storage.createInvestorSession(sessionWithInvestorId);
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating investor session:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to create investor session" });
    }
  });

  // Investor routes
  // Investor asks a startup for a meeting; recorded as investor interest.
  app.post('/api/investor/meetings', isAuthenticated, requireRole('investor'), async (req: any, res) => {
    try {
      const { startupId, message } = z.object({
        startupId: z.string().min(1),
        message: z.string().trim().max(2000).optional(),
      }).parse(req.body);
      
      const [investor] = await storage.getInvestorsByUser(currentUser(req).id);
      if (!investor) {
        return res.status(404).json({ message: "Investor profile not found" });
      }
      if (!(await storage.getProject(startupId))) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const interest = await storage.upsertInvestorInterest(investor.id, startupId, "requested_info", message);
      res.status(201).json(interest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error requesting meeting:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to request meeting" });
    }
  });

  app.get('/api/investor/interests', isAuthenticated, requireRole('investor'), async (req: any, res) => {
    try {
      const [investor] = await storage.getInvestorsByUser(currentUser(req).id);
      if (!investor) {
        return res.json([]);
      }
      res.json(await storage.getInvestorInterestsForInvestor(investor.id));
    } catch (error) {
      console.error("Error fetching investor interests:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch investor interests" });
    }
  });

  app.get('/api/investors', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user has appropriate permissions
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !['administrator', 'investor', 'participant'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      const investors = await storage.getInvestors();
      res.json(investors);
    } catch (error) {
      console.error("Error fetching investors:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch investors" });
    }
  });

  // Admin Investor Management Routes

  /** Validates an investor's linked user: must be an investor and not linked to another record. */
  async function checkInvestorUser(userId: string | null | undefined, investorId?: string): Promise<string | null> {
    if (!userId) return null;
    const linked = await storage.getUser(userId);
    if (!linked) return "User not found";
    if (linked.role !== "investor") return "The linked user must have the investor role";
    const existing = await storage.getInvestorsByUser(userId, true);
    if (existing.some((i) => i.id !== investorId)) return "This user is already linked to another investor";
    return null;
  }

  // Admins see inactive investors too, so they can reactivate them.
  app.get('/api/admin/investors', isAuthenticated, requireRole('administrator'), async (_req: any, res) => {
    try {
      res.json(await storage.getInvestors(true));
    } catch (error) {
      console.error("Error fetching admin investors:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch investors" });
    }
  });

  app.get('/api/admin/investors/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ message: "Administrator access required" });
      }
      
      const { id } = req.params;
      const investor = await storage.getInvestor(id);
      
      if (!investor) {
        return res.status(404).json({ message: "Investor not found" });
      }
      
      res.json(investor);
    } catch (error) {
      console.error("Error fetching investor:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch investor" });
    }
  });

  app.post('/api/admin/investors', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      const validatedData = insertInvestorSchema.parse(req.body);
      const linkError = await checkInvestorUser(validatedData.userId);
      if (linkError) {
        return res.status(linkError.startsWith("This user") ? 409 : 400).json({ message: linkError });
      }
      res.status(201).json(await storage.createInvestor(validatedData));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error creating investor:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to create investor" });
    }
  });

  app.put('/api/admin/investors/:id', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = adminUpdateInvestorSchema.parse(req.body);
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "At least one field must be provided for update" });
      }
      if (!(await storage.getInvestor(id))) {
        return res.status(404).json({ message: "Investor not found" });
      }
      if (updateData.userId !== undefined) {
        const linkError = await checkInvestorUser(updateData.userId, id);
        if (linkError) {
          return res.status(linkError.startsWith("This user") ? 409 : 400).json({ message: linkError });
        }
      }
      res.json(await storage.updateInvestor(id, updateData));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error updating investor:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to update investor" });
    }
  });

  // Deactivates (does not delete) so history stays intact.
  app.delete('/api/admin/investors/:id', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      const investor = await storage.deactivateInvestor(req.params.id);
      if (!investor) {
        return res.status(404).json({ message: "Investor not found" });
      }
      res.json(investor);
    } catch (error) {
      console.error("Error deactivating investor:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to deactivate investor" });
    }
  });

  // Investor Session Management Routes
  app.get('/api/admin/investor-sessions', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ message: "Administrator access required" });
      }
      
      // Get all investor sessions across all investors
      const investors = await storage.getInvestors();
      const allSessions = [];
      
      for (const investor of investors) {
        const sessions = await storage.getInvestorSessions(investor.id);
        allSessions.push(...sessions.map(session => ({ ...session, investorOrganization: investor.organization })));
      }
      
      res.json(allSessions);
    } catch (error) {
      console.error("Error fetching admin investor sessions:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch investor sessions" });
    }
  });

  app.post('/api/admin/investor-sessions', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ message: "Administrator access required" });
      }
      
      const validatedData = insertInvestorSessionSchema.parse(req.body);
      const session = await storage.createInvestorSession(validatedData);
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating investor session:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to create investor session" });
    }
  });

  app.put('/api/admin/investor-sessions/:id', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      const updateData = updateInvestorSessionSchema.parse(req.body);
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "At least one field must be provided for update" });
      }
      const existing = await storage.getInvestorSession(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Investor session not found" });
      }
      const start = updateData.startTime ?? existing.startTime;
      const end = updateData.endTime ?? existing.endTime;
      if (end <= start) {
        return res.status(400).json({ message: "End time must be after start time" });
      }
      res.json(await storage.updateInvestorSession(req.params.id, updateData));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error updating investor session:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to update investor session" });
    }
  });

  app.delete('/api/admin/investor-sessions/:id', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      const found = await storage.cancelInvestorSession(req.params[Object.keys(req.params)[0]]);
      if (!found) {
        return res.status(404).json({ message: "Investor session not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error canceling investor session:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to canceling investor session" });
    }
  });

  // Investor-Cohort Participation Management Routes
  app.get('/api/admin/cohorts/:cohortId/investors', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ message: "Administrator access required" });
      }
      
      const { cohortId } = req.params;
      const cohortInvestors = await storage.getCohortInvestors(cohortId);
      res.json(cohortInvestors);
    } catch (error) {
      console.error("Error fetching cohort investors:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch cohort investors" });
    }
  });

  app.post('/api/admin/investors/:investorId/cohorts', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      const { investorId } = req.params;
      const { cohortId, role } = z.object({
        cohortId: z.string().min(1),
        role: z.string().trim().min(1).max(50).default("advisor"),
      }).parse(req.body);
      if (!(await storage.getInvestor(investorId))) {
        return res.status(404).json({ message: "Investor not found" });
      }
      if (!(await storage.getCohort(cohortId))) {
        return res.status(404).json({ message: "Cohort not found" });
      }
      const existing = await storage.findInvestorCohortParticipation(investorId, cohortId);
      if (existing && existing.status !== "inactive") {
        return res.status(409).json({ message: "This investor is already assigned to that cohort" });
      }
      const participation = existing
        ? await storage.reactivateInvestorCohortParticipation(existing.id, role)
        : await storage.assignInvestorToCohort(insertInvestorCohortParticipationSchema.parse({ investorId, cohortId, role }));
      res.status(201).json(participation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error assigning investor to cohort:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to assign investor to cohort" });
    }
  });

  app.put('/api/admin/investor-cohort-participation/:id/role', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      const { role } = z.object({ role: z.string().trim().min(1).max(50) }).parse(req.body);
      const participation = await storage.updateInvestorCohortRole(req.params.id, role);
      if (!participation) {
        return res.status(404).json({ message: "Cohort assignment not found" });
      }
      res.json(participation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error updating investor cohort role:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to update investor cohort role" });
    }
  });

  app.delete('/api/admin/investor-cohort-participation/:id', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      const found = await storage.removeInvestorFromCohort(req.params[Object.keys(req.params)[0]]);
      if (!found) {
        return res.status(404).json({ message: "Cohort assignment not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error removing cohort assignment:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to removing cohort assignment" });
    }
  });

  app.get('/api/admin/cohort-assignments', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ message: "Administrator access required" });
      }
      
      const assignments = await storage.getAllCohortAssignments();
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching cohort assignments:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch cohort assignments" });
    }
  });

  // Investor Interest Management Routes
  app.get('/api/admin/investor-interests', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ message: "Administrator access required" });
      }
      
      // Get all projects and their investor interests
      const projects = await storage.getAllProjects();
      const allInterests = [];
      
      for (const project of projects) {
        const interests = await storage.getInvestorInterests(project.id);
        allInterests.push(...interests.map(interest => ({ ...interest, projectName: project.name })));
      }
      
      res.json(allInterests);
    } catch (error) {
      console.error("Error fetching admin investor interests:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch investor interests" });
    }
  });

  app.post('/api/admin/investor-interests', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      const { investorId, projectId, level, notes } = z.object({
        investorId: z.string().min(1),
        projectId: z.string().min(1),
        level: z.enum(investorInterestLevelEnum.enumValues).default("viewed"),
        notes: z.string().max(10000).optional(),
      }).parse(req.body);
      if (!(await storage.getInvestor(investorId))) {
        return res.status(404).json({ message: "Investor not found" });
      }
      if (!(await storage.getProject(projectId))) {
        return res.status(404).json({ message: "Project not found" });
      }
      // One record per investor and project; a repeat updates it.
      const interest = await storage.upsertInvestorInterest(investorId, projectId, level, notes);
      res.status(201).json(interest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error creating investor interest:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to create investor interest" });
    }
  });

  const investorInterestUpdateSchema = z.object({
    level: z.enum(investorInterestLevelEnum.enumValues).optional(),
    questions: z.array(z.string().max(2000)).max(100).optional(),
    meetings: z.any().optional(),
    notes: z.string().max(10000).nullable().optional(),
  }).strict();

  app.put('/api/admin/investor-interests/:id', isAuthenticated, requireRole('administrator'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = investorInterestUpdateSchema.parse(req.body);
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "At least one field must be provided for update" });
      }
      
      const interest = await storage.updateInvestorInterest(id, updateData as any);
      if (!interest) {
        return res.status(404).json({ message: "Investor interest not found" });
      }
      res.json(interest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error updating investor interest:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to update investor interest" });
    }
  });

  // AI Coach routes
  app.post('/api/ai-coach/chat', isAuthenticated, async (req: any, res) => {
    try {
      const user = currentUser(req);
      const { messages, mode, conversationId } = aiChatSchema.parse(req.body);
      
      if (!isAiConfigured()) {
        return res.status(503).json({ message: "The AI Coach is not configured yet. Please contact a mentor." });
      }
      
      const programWeek = await currentProgramWeek(user.id);
      const response = await aiCoachService.generateResponse(messages, mode, user.role, user.locale || "en", programWeek);
      const history = [...messages, { role: "assistant" as const, content: response.message }];
      
      let savedId = conversationId;
      if (conversationId) {
        const updated = await storage.updateAiConversation(conversationId, user.id, history);
        if (!updated) {
          return res.status(404).json({ message: "Conversation not found" });
        }
      } else {
        const created = await storage.createAiConversation({
          userId: user.id,
          title: messages[0].content.substring(0, 50) || "New conversation",
          mode,
          messages: history,
        });
        savedId = created.id;
      }
      
      res.json({ ...response, conversationId: savedId });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error in AI Coach chat:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to process AI Coach request" });
    }
  });

  app.get('/api/ai-coach/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getAiConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching AI conversations:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post('/api/ai-coach/analyze-project', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = z.object({ projectId: z.string().min(1) }).parse(req.body);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const user = currentUser(req);
      if (project.ownerId !== user.id && !hasRole(user, 'administrator', 'mentor')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      if (!isAiConfigured()) {
        return res.status(503).json({ message: "The AI Coach is not configured yet." });
      }
      
      const analysis = await aiCoachService.analyzeProject(project);
      res.json(analysis);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error analyzing project:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to analyze project" });
    }
  });

  // Object storage routes for file uploads
  // File uploads go straight to Supabase Storage with a signed URL under the
  // caller's own folder; the API never handles file bytes.
  app.post("/api/uploads", isAuthenticated, async (req: any, res) => {
    try {
      const { fileName, contentType, size } = uploadRequestSchema.parse(req.body);
      if (size > MAX_UPLOAD_BYTES) {
        return res.status(400).json({ message: "Files can be at most 10 MB" });
      }
      if (!isAllowedContentType(contentType)) {
        return res.status(400).json({ message: "This file type is not allowed" });
      }
      const upload = await createSignedUpload(currentUser(req).id, fileName);
      res.json(upload);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      if (error instanceof StorageNotConfiguredError) {
        return res.status(503).json({ message: error.message });
      }
      console.error("Error creating upload URL:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to create upload URL" });
    }
  });

  // Owners, mentors and admins can open a file. Redirects to a signed URL
  // that expires after a minute.
  app.get("/api/files/*", isAuthenticated, async (req: any, res) => {
    try {
      const path = req.params[0] as string;
      const owner = ownerOfPath(path);
      if (!owner) {
        return res.status(404).json({ message: "File not found" });
      }
      const user = currentUser(req);
      if (owner !== user.id && !hasRole(user, 'administrator', 'mentor')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      res.redirect(302, await createSignedDownload(path));
    } catch (error) {
      if (error instanceof StorageNotConfiguredError) {
        return res.status(503).json({ message: error.message });
      }
      console.error("Error creating download URL:", error);
      res.status(404).json({ message: "File not found" });
    }
  });



  // Search routes
  const searchUsersSchema = z.object({
    q: z.string().trim().min(2, "Search needs at least 2 characters").max(100),
    role: z.enum(userRoleEnum.enumValues).optional(),
  });

  // Visitors and applicants can't browse the member directory. Only admins
  // see email addresses.
  app.get('/api/search/users', isAuthenticated, requireRole('administrator', 'mentor', 'participant', 'investor'), async (req: any, res) => {
    try {
      const { q, role } = searchUsersSchema.parse(req.query);
      const isAdmin = currentUser(req).role === 'administrator';
      // Non-admins can't see emails, so they can't search by them either.
      const users = await storage.searchUsers(q, role, 20, isAdmin);
      res.json(users.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        profileImageUrl: u.profileImageUrl,
        ...(isAdmin ? { email: u.email } : {}),
      })));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error searching users:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  app.get('/api/search/projects', isAuthenticated, async (req: any, res) => {
    try {
      const { q } = z.object({ q: z.string().trim().min(2).max(100) }).parse(req.query);
      const user = currentUser(req);
      const projects = hasRole(user, 'administrator', 'mentor', 'investor')
        ? await storage.searchProjects(q)
        : await storage.searchProjects(q, user.id);
      res.json(projects);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error searching projects:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to search projects" });
    }
  });

  // Message routes
  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const user = currentUser(req);
      const messageData = insertMessageSchema.omit({ senderId: true }).parse(req.body);
      
      if (messageData.receiverId && !(await storage.getUser(messageData.receiverId))) {
        return res.status(404).json({ message: "Recipient not found" });
      }
      // Replying to an existing thread requires being part of it.
      if (messageData.threadId) {
        const thread = await storage.getMessagesByThread(messageData.threadId);
        if (thread.length > 0 && user.role !== 'administrator' &&
            !thread.some((m) => m.senderId === user.id || m.receiverId === user.id)) {
          return res.status(403).json({ message: "You are not part of this conversation" });
        }
      }
      
      const message = await storage.createMessage({ ...messageData, senderId: user.id });
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: zodMessage(error) });
      }
      console.error("Error creating message:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  app.get('/api/messages/thread/:threadId', isAuthenticated, async (req: any, res) => {
    try {
      const { threadId } = req.params;
      const user = currentUser(req);
      const messages = user.role === 'administrator'
        ? await storage.getMessagesByThread(threadId)
        : await storage.getMessagesByThread(threadId, user.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      if (respondDbError(res, error)) return;
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

}
