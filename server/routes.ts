import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, createLocalUserSession } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { aiCoachService } from "./aiCoach";
import { z } from "zod";
import { insertApplicationSchema, insertProjectSchema, insertMessageSchema, insertAiConversationSchema, insertUserProgressSchema, insertCohortSchema, insertRoadmapTemplateSchema, insertRoadmapItemSchema, insertAssignedRoadmapSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import crypto from "crypto";

// Validation schemas for email/password authentication
const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Email/Password Authentication Routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      // Create user and hash password
      const user = await storage.createLocalUser({ email, firstName, lastName });
      const passwordHash = await bcrypt.hash(password, 12);
      await storage.setPasswordHash(user.id, passwordHash);
      
      // Create session and regenerate session ID to prevent session fixation
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
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Create session and regenerate session ID to prevent session fixation
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
      console.error("Login error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal whether email exists or not
        return res.json({ message: "If an account exists with this email, you will receive password reset instructions." });
      }
      
      // Generate reset token (24 hours expiry)
      const resetToken = crypto.randomBytes(32).toString('hex');
      // Use SHA-256 for deterministic token hashing (not bcrypt which is randomized)
      const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await storage.setResetToken(user.id, tokenHash, expiresAt);
      
      // SECURITY: Never return plaintext tokens in API responses
      // In production, this token should be sent via secure email
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV ONLY] Password reset token for ${email}: ${resetToken}`);
        console.log('SECURITY WARNING: In production, implement secure email delivery for reset tokens');
      }
      
      res.json({ 
        message: "Password reset instructions sent to your email."
        // REMOVED: resetToken - never expose plaintext tokens in API responses
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Password reset request failed" });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);
      
      // Hash the new password
      const newPasswordHash = await bcrypt.hash(password, 12);
      
      // Hash the provided token to match against stored hash
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      // Update password using reset token hash
      const success = await storage.updatePasswordByResetToken(tokenHash, newPasswordHash);
      
      if (!success) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      
      res.json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Reset password error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Password reset failed" });
    }
  });

  // Existing Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Application routes
  app.post('/api/applications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const applicationData = insertApplicationSchema.parse({
        ...req.body,
        userId
      });
      
      const application = await storage.createApplication(applicationData);
      res.json(application);
    } catch (error) {
      console.error("Error creating application:", error);
      res.status(400).json({ message: "Failed to create application" });
    }
  });

  app.get('/api/applications/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const applications = await storage.getApplicationsByUser(userId);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.post('/api/applications/submit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Parse application data, excluding fields that should be set server-side
      const applicationData = insertApplicationSchema.omit({ 
        status: true, 
        submittedAt: true, 
        userId: true 
      }).parse(req.body);
      
      // Set server-controlled fields
      const submissionData = {
        ...applicationData,
        userId,
        status: "submitted" as const,
        submittedAt: new Date()
      };
      
      const application = await storage.createApplication(submissionData);
      
      // Update user role to applicant after successful submission
      try {
        const user = await storage.getUser(userId);
        if (user && user.role === 'public_visitor') {
          console.log(`Updating user role from ${user.role} to applicant for user ${userId}`);
          await storage.upsertUser({
            ...user,
            role: 'applicant'
          });
          console.log(`Successfully updated user role to applicant for user ${userId}`);
        } else {
          console.log(`User role update skipped - current role: ${user?.role || 'undefined'} for user ${userId}`);
        }
      } catch (roleUpdateError) {
        console.error(`Failed to update user role after application submission for user ${userId}:`, roleUpdateError);
        // Don't fail the entire request if role update fails
      }
      
      res.json(application);
    } catch (error) {
      console.error("Error submitting application:", error);
      res.status(400).json({ message: "Failed to submit application" });
    }
  });

  app.put('/api/applications/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, reviewerNotes } = req.body;
      
      // Check if user has admin/mentor role for status updates
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !['administrator', 'mentor'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      const application = await storage.updateApplicationStatus(id, status, reviewerNotes);
      
      // Handle automatic role progression when application is accepted
      if (status === 'accepted') {
        try {
          const applicantUser = await storage.getUser(application.userId);
          if (applicantUser && applicantUser.role === 'applicant') {
            await storage.upsertUser({
              ...applicantUser,
              role: 'participant'
            });
            console.log(`User role upgraded from applicant to participant for user ${application.userId} after application acceptance`);
          }
        } catch (roleUpdateError) {
          // Log the error but don't fail the entire request
          console.error(`Failed to update user role for accepted application ${id}:`, roleUpdateError);
        }
      }
      
      res.json(application);
    } catch (error) {
      console.error("Error updating application status:", error);
      res.status(500).json({ message: "Failed to update application status" });
    }
  });

  // Project routes
  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Check role authorization
      if (!user || !['participant', 'administrator'].includes(user.role)) {
        return res.status(403).json({ message: "Only participants and administrators can create projects" });
      }
      
      const projectData = insertProjectSchema.parse({
        ...req.body,
        ownerId: userId
      });
      
      const project = await storage.createProject(projectData);
      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(400).json({ message: "Failed to create project" });
    }
  });

  app.get('/api/projects/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projects = await storage.getProjectsByUser(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
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
      
      // Check ownership or admin permissions
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (project.ownerId !== userId && user?.role !== 'administrator') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      // Validate update data with schema (excluding auto-managed fields)
      const updateSchema = insertProjectSchema.omit({ ownerId: true }).partial();
      const validatedData = updateSchema.parse(req.body);
      
      const updatedProject = await storage.updateProject(id, validatedData);
      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.get('/api/projects/cohort/:cohortId', isAuthenticated, async (req: any, res) => {
    try {
      const { cohortId } = req.params;
      const projects = await storage.getProjectsByCohort(cohortId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching cohort projects:", error);
      res.status(500).json({ message: "Failed to fetch cohort projects" });
    }
  });

  // Roadmap routes
  
  // Participant roadmap routes
  app.get('/api/projects/:projectId/roadmap', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify project access
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const user = await storage.getUser(userId);
      if (project.ownerId !== userId && user?.role !== 'administrator' && user?.role !== 'mentor') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      const roadmap = await storage.getProjectRoadmap(projectId);
      res.json(roadmap);
    } catch (error) {
      console.error("Error fetching project roadmap:", error);
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
      res.status(500).json({ message: "Failed to update assignment status" });
    }
  });

  // Participant roadmap convenience routes
  app.get('/api/roadmap', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Find the user's active project
      const projects = await storage.getProjectsByUser(userId);
      const activeProject = projects.find((p: any) => p.stage !== 'completed') || projects[0];
      
      if (!activeProject) {
        return res.status(404).json({ message: "No project found for user" });
      }
      
      const roadmap = await storage.getProjectRoadmap(activeProject.id);
      res.json(roadmap);
    } catch (error) {
      console.error("Error fetching user roadmap:", error);
      res.status(500).json({ message: "Failed to fetch roadmap" });
    }
  });

  app.get('/api/roadmap/current-week', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Find the user's active project
      const projects = await storage.getProjectsByUser(userId);
      const activeProject = projects.find((p: any) => p.stage !== 'completed') || projects[0];
      
      if (!activeProject) {
        return res.status(404).json({ message: "No project found for user" });
      }
      
      // Get current week (you may want to make this configurable)
      const currentWeek = 1; // For now, default to week 1
      const currentWeekItems = await storage.getParticipantRoadmapByWeek(activeProject.id, currentWeek);
      res.json(currentWeekItems);
    } catch (error) {
      console.error("Error fetching current week roadmap:", error);
      res.status(500).json({ message: "Failed to fetch current week roadmap" });
    }
  });
  
  // Admin roadmap template management routes
  app.get('/api/admin/roadmap/templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'administrator') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const templates = await storage.getRoadmapTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching roadmap templates:", error);
      res.status(500).json({ message: "Failed to fetch roadmap templates" });
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
      res.status(500).json({ message: "Failed to get roadmap items" });
    }
  });

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
      const item = await storage.createRoadmapItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating roadmap item for template:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create roadmap item" });
    }
  });
  
  app.post('/api/admin/roadmap/templates/:templateId/assign', isAuthenticated, async (req: any, res) => {
    try {
      const { templateId } = req.params;
      const { projectId } = req.body;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'administrator') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      if (!projectId) {
        return res.status(400).json({ message: "Project ID is required" });
      }
      
      const result = await storage.assignRoadmapTemplate(templateId, projectId);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error assigning roadmap template:", error);
      res.status(500).json({ message: "Failed to assign roadmap template" });
    }
  });
  
  app.delete('/api/admin/roadmap/templates/:templateId', isAuthenticated, async (req: any, res) => {
    try {
      const { templateId } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'administrator') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      await storage.deleteRoadmapTemplate(templateId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting roadmap template:", error);
      res.status(500).json({ message: "Failed to delete roadmap template" });
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
      const item = await storage.createRoadmapItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating roadmap item:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
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
      res.status(500).json({ message: "Failed to update roadmap item" });
    }
  });
  
  app.delete('/api/admin/roadmap/items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const { itemId } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'administrator') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      await storage.deleteRoadmapItem(itemId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting roadmap item:", error);
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
      res.status(500).json({ message: "Failed to fetch cohort" });
    }
  });

  // Curriculum routes
  app.get('/api/cohorts/:cohortId/modules', isAuthenticated, async (req: any, res) => {
    try {
      const { cohortId } = req.params;
      const modules = await storage.getModulesByCohort(cohortId);
      res.json(modules);
    } catch (error) {
      console.error("Error fetching modules:", error);
      res.status(500).json({ message: "Failed to fetch modules" });
    }
  });

  app.get('/api/modules/:moduleId/lessons', isAuthenticated, async (req: any, res) => {
    try {
      const { moduleId } = req.params;
      const lessons = await storage.getLessonsByModule(moduleId);
      res.json(lessons);
    } catch (error) {
      console.error("Error fetching lessons:", error);
      res.status(500).json({ message: "Failed to fetch lessons" });
    }
  });

  app.get('/api/cohorts/:cohortId/milestones', isAuthenticated, async (req: any, res) => {
    try {
      const { cohortId } = req.params;
      const milestones = await storage.getMilestonesByCohort(cohortId);
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching milestones:", error);
      res.status(500).json({ message: "Failed to fetch milestones" });
    }
  });

  // Lesson routes
  app.get('/api/modules/:moduleId/lessons', isAuthenticated, async (req: any, res) => {
    try {
      const { moduleId } = req.params;
      const lessons = await storage.getLessonsByModule(moduleId);
      res.json(lessons);
    } catch (error) {
      console.error("Error fetching lessons:", error);
      res.status(500).json({ message: "Failed to fetch lessons" });
    }
  });

  app.get('/api/lessons/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const lesson = await storage.getLesson(id);
      
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      res.json(lesson);
    } catch (error) {
      console.error("Error fetching lesson:", error);
      res.status(500).json({ message: "Failed to fetch lesson" });
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
      res.status(500).json({ message: "Failed to fetch module progress" });
    }
  });

  app.post('/api/progress/lesson/:lessonId/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { lessonId } = req.params;
      
      // Validate input data
      const progressSchema = z.object({
        score: z.number().int().min(0).max(100).optional(),
        timeSpent: z.number().int().min(0).optional(),
      });
      
      const { score, timeSpent } = progressSchema.parse(req.body);
      
      const progress = await storage.markLessonComplete(userId, lessonId, score, timeSpent);
      res.json(progress);
    } catch (error) {
      console.error("Error marking lesson complete:", error);
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
      res.status(500).json({ message: "Failed to fetch cohort progress" });
    }
  });

  // Deliverable routes
  app.get('/api/projects/:projectId/deliverables', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const deliverables = await storage.getDeliverablesByProject(projectId);
      res.json(deliverables);
    } catch (error) {
      console.error("Error fetching deliverables:", error);
      res.status(500).json({ message: "Failed to fetch deliverables" });
    }
  });

  app.post('/api/projects/:projectId/artifacts', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.claims.sub;
      
      // Check project ownership
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const user = await storage.getUser(userId);
      if (project.ownerId !== userId && user?.role !== 'administrator') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      // Validate artifact data
      const artifactSchema = z.object({
        type: z.string().min(1),
        title: z.string().min(1),
        fileRef: z.string().min(1),
        version: z.number().int().positive().optional().default(1),
        isGated: z.boolean().optional().default(false),
      });
      
      const artifactData = artifactSchema.parse(req.body);
      const artifact = await storage.createArtifact({
        ...artifactData,
        projectId
      });
      
      res.json(artifact);
    } catch (error) {
      console.error("Error creating artifact:", error);
      res.status(400).json({ message: "Failed to create artifact" });
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
      res.status(500).json({ message: "Failed to fetch users" });
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
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post('/api/admin/cohorts', isAuthenticated, async (req: any, res) => {
    try {
      // Check admin permissions
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'administrator') {
        return res.status(403).json({ message: "Administrator access required" });
      }
      
      const cohortData = insertCohortSchema.parse(req.body);
      const cohort = await storage.createCohort(cohortData);
      res.json(cohort);
    } catch (error) {
      console.error("Error creating cohort:", error);
      res.status(400).json({ message: "Failed to create cohort" });
    }
  });

  // Mentor routes
  app.get('/api/mentors', isAuthenticated, async (req: any, res) => {
    try {
      const mentors = await storage.getMentors();
      res.json(mentors);
    } catch (error) {
      console.error("Error fetching mentors:", error);
      res.status(500).json({ message: "Failed to fetch mentors" });
    }
  });

  // Investor routes
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
      res.status(500).json({ message: "Failed to fetch investors" });
    }
  });

  // AI Coach routes
  app.post('/api/ai-coach/chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { messages, mode = "process_guide", conversationId } = req.body;
      
      const user = await storage.getUser(userId);
      const response = await aiCoachService.generateResponse(
        messages, 
        mode, 
        user?.role || "participant",
        user?.locale || "en"
      );
      
      // Update or create conversation
      if (conversationId) {
        await storage.updateAiConversation(conversationId, messages);
      } else {
        await storage.createAiConversation({
          userId,
          title: messages[0]?.content?.substring(0, 50) || "New conversation",
          mode,
          messages
        });
      }
      
      res.json(response);
    } catch (error) {
      console.error("Error in AI Coach chat:", error);
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
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post('/api/ai-coach/analyze-project', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.body;
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check permissions
      const userId = req.user.claims.sub;
      if (project.ownerId !== userId) {
        const user = await storage.getUser(userId);
        if (!user || !['administrator', 'mentor'].includes(user.role)) {
          return res.status(403).json({ message: "Insufficient permissions" });
        }
      }
      
      const analysis = await aiCoachService.analyzeProject(project);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing project:", error);
      res.status(500).json({ message: "Failed to analyze project" });
    }
  });

  // Object storage routes for file uploads
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req: any, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.put("/api/documents", isAuthenticated, async (req: any, res) => {
    if (!req.body.documentURL) {
      return res.status(400).json({ error: "documentURL is required" });
    }

    const userId = req.user?.claims?.sub;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.documentURL,
        {
          owner: userId,
          visibility: "private", // Documents are private by default
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting document ACL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Search routes
  app.get('/api/search/users', isAuthenticated, async (req: any, res) => {
    try {
      const { q: query, role } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Query parameter required" });
      }
      
      const users = await storage.searchUsers(query, role);
      res.json(users);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  app.get('/api/search/projects', isAuthenticated, async (req: any, res) => {
    try {
      const { q: query } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Query parameter required" });
      }
      
      const projects = await storage.searchProjects(query);
      res.json(projects);
    } catch (error) {
      console.error("Error searching projects:", error);
      res.status(500).json({ message: "Failed to search projects" });
    }
  });

  // Message routes
  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: userId
      });
      
      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(400).json({ message: "Failed to create message" });
    }
  });

  app.get('/api/messages/thread/:threadId', isAuthenticated, async (req: any, res) => {
    try {
      const { threadId } = req.params;
      const messages = await storage.getMessagesByThread(threadId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
