import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Enums
export const userRoleEnum = pgEnum("user_role", [
  "public_visitor",
  "applicant", 
  "participant",
  "mentor",
  "investor",
  "administrator"
]);

export const applicationStatusEnum = pgEnum("application_status", [
  "draft",
  "submitted", 
  "under_review",
  "shortlisted",
  "interview",
  "offer",
  "waitlist",
  "rejected",
  "accepted"
]);

export const projectStageEnum = pgEnum("project_stage", [
  "ideation",
  "validation",
  "mvp_build", 
  "pilot_traction",
  "pitch_ready"
]);

export const deliverableStatusEnum = pgEnum("deliverable_status", [
  "not_started",
  "in_progress",
  "submitted",
  "needs_revision",
  "approved"
]);

export const disbursementStatusEnum = pgEnum("disbursement_status", [
  "draft",
  "submitted",
  "under_review", 
  "approved",
  "denied",
  "paid"
]);

export const investorInterestLevelEnum = pgEnum("investor_interest_level", [
  "viewed",
  "requested_info",
  "meeting_scheduled",
  "diligence",
  "soft_commit",
  "commit"
]);

export const objectPermissionEnum = pgEnum("object_permission", [
  "read",
  "write"
]);

export const roadmapItemTypeEnum = pgEnum("roadmap_item_type", [
  "task",
  "assignment",
  "deliverable", 
  "milestone",
  "checkin",
  "learning"
]);

export const roadmapStatusEnum = pgEnum("roadmap_status", [
  "not_started",
  "in_progress", 
  "completed",
  "blocked",
  "waived"
]);

export const autoCompletionTypeEnum = pgEnum("auto_completion_type", [
  "none",
  "lesson",
  "module", 
  "deliverable",
  "milestone",
  "mentor_session"
]);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull().default("public_visitor"),
  // Password authentication fields
  passwordHash: varchar("password_hash"), // nullable - OIDC users won't have passwords
  emailVerified: boolean("email_verified").default(false),
  passwordResetTokenHash: varchar("password_reset_token_hash"), // nullable
  passwordResetExpires: timestamp("password_reset_expires"), // nullable
  // Profile fields
  bio: text("bio"),
  skills: text("skills").array(),
  interests: text("interests").array(),
  industryFocus: text("industry_focus"),
  timezone: varchar("timezone"),
  locale: varchar("locale").default("en"),
  profileVisibility: varchar("profile_visibility").default("private"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Agreements and signatures
export const agreements = pgTable("agreements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type").notNull(), // "commitment", "nda", "policy"
  version: varchar("version").notNull(),
  title: varchar("title").notNull(),
  body: text("body").notNull(),
  locale: varchar("locale").default("en"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const signatures = pgTable("signatures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  agreementId: varchar("agreement_id").notNull().references(() => agreements.id),
  ipAddress: varchar("ip_address"),
  signedAt: timestamp("signed_at").defaultNow(),
});

// Cohorts
export const cohorts = pgTable("cohorts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  capacity: integer("capacity").notNull(),
  tracks: text("tracks").array(),
  calendarId: varchar("calendar_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Applications
export const applications = pgTable("applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  cohortId: varchar("cohort_id").notNull().references(() => cohorts.id),
  answers: jsonb("answers"),
  uploads: text("uploads").array(),
  status: applicationStatusEnum("status").default("draft"),
  scores: jsonb("scores"),
  reviewerNotes: text("reviewer_notes").array(),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Curriculum
export const modules = pgTable("modules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cohortId: varchar("cohort_id").notNull().references(() => cohorts.id),
  title: varchar("title").notNull(),
  description: text("description"),
  week: integer("week").notNull(),
  objectives: text("objectives").array(),
  resources: text("resources").array(),
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lessons = pgTable("lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  moduleId: varchar("module_id").notNull().references(() => modules.id),
  title: varchar("title").notNull(),
  content: text("content"),
  media: text("media").array(),
  quizId: varchar("quiz_id"),
  prerequisites: varchar("prerequisites").array(),
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const quizzes = pgTable("quizzes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  questions: jsonb("questions").notNull(),
  passThreshold: integer("pass_threshold").notNull(),
  maxAttempts: integer("max_attempts").default(3),
  createdAt: timestamp("created_at").defaultNow(),
});

// User progress tracking
export const userProgress = pgTable("user_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  lessonId: varchar("lesson_id").notNull().references(() => lessons.id),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  timeSpent: integer("time_spent"), // in minutes
  score: integer("score"), // quiz score if applicable
  attempts: integer("attempts").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("user_progress_user_lesson_unq").on(table.userId, table.lessonId),
]);

// Milestones and deliverables
export const milestones = pgTable("milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cohortId: varchar("cohort_id").notNull().references(() => cohorts.id),
  title: varchar("title").notNull(),
  description: text("description"),
  criteria: text("criteria").array(),
  requiredArtifacts: text("required_artifacts").array(),
  dueDate: timestamp("due_date"),
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Projects (Startups)
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  cohortId: varchar("cohort_id").references(() => cohorts.id),
  name: varchar("name").notNull(),
  stage: projectStageEnum("stage").default("ideation"),
  summary: text("summary"),
  problem: text("problem"),
  solution: text("solution"),
  market: text("market"),
  aiComponents: text("ai_components").array(),
  dataNeeds: text("data_needs"),
  risks: text("risks").array(),
  ethics: text("ethics"),
  readinessScore: integer("readiness_score").default(0),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectTeamMembers = pgTable("project_team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: varchar("role"), // "CEO", "CTO", "PM", "DS"
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const artifacts = pgTable("artifacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  type: varchar("type").notNull(), // "deck", "one_pager", "video", "model_card"
  title: varchar("title").notNull(),
  fileRef: varchar("file_ref"), // object storage reference
  version: integer("version").default(1),
  isGated: boolean("is_gated").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const deliverables = pgTable("deliverables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  milestoneId: varchar("milestone_id").notNull().references(() => milestones.id),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  files: text("files").array(),
  status: deliverableStatusEnum("status").default("not_started"),
  feedback: jsonb("feedback"),
  score: integer("score"),
  submittedAt: timestamp("submitted_at"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Mentorship
export const mentorProfiles = pgTable("mentor_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  expertise: text("expertise").array(),
  availability: jsonb("availability"),
  bio: text("bio"),
  industries: text("industries").array(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mentorSessions = pgTable("mentor_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mentorId: varchar("mentor_id").notNull().references(() => users.id),
  participantIds: varchar("participant_ids").array(),
  title: varchar("title").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  agenda: text("agenda"),
  notes: text("notes"),
  attendance: jsonb("attendance"),
  meetingLink: varchar("meeting_link"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Investors
export const investors = pgTable("investors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  organization: varchar("organization"),
  contactEmail: varchar("contact_email"),
  sectors: text("sectors").array(),
  stages: text("stages").array(),
  geography: text("geography").array(),
  checkSize: varchar("check_size"),
  preferences: jsonb("preferences"),
  ndaStatus: boolean("nda_status").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const investorInterests = pgTable("investor_interests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  investorId: varchar("investor_id").notNull().references(() => investors.id),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  level: investorInterestLevelEnum("level").default("viewed"),
  questions: text("questions").array(),
  meetings: jsonb("meetings"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const investorSessions = pgTable("investor_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  investorId: varchar("investor_id").notNull().references(() => investors.id),
  participantIds: varchar("participant_ids").array(),
  title: varchar("title").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  agenda: text("agenda"),
  notes: text("notes"),
  attendance: jsonb("attendance"),
  meetingLink: varchar("meeting_link"),
  sessionType: varchar("session_type"), // "pitch", "feedback", "due_diligence", "demo_day"
  createdAt: timestamp("created_at").defaultNow(),
});

export const investorCohortParticipation = pgTable("investor_cohort_participation", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  investorId: varchar("investor_id").notNull().references(() => investors.id),
  cohortId: varchar("cohort_id").notNull().references(() => cohorts.id),
  role: varchar("role"), // "judge", "advisor", "funding_partner", "demo_day_evaluator"
  status: varchar("status").default("active"), // "active", "inactive"
  assignedAt: timestamp("assigned_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Funding
export const fundingPrograms = pgTable("funding_programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cohortId: varchar("cohort_id").notNull().references(() => cohorts.id),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // "grant", "stipend", "prize", "sponsorship"
  rules: jsonb("rules"),
  totalAmount: integer("total_amount"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const disbursementRequests = pgTable("disbursement_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  milestoneId: varchar("milestone_id").references(() => milestones.id),
  fundingProgramId: varchar("funding_program_id").notNull().references(() => fundingPrograms.id),
  amount: integer("amount").notNull(),
  docs: text("docs").array(),
  status: disbursementStatusEnum("status").default("draft"),
  decisionReason: text("decision_reason"),
  paymentRef: varchar("payment_ref"),
  requestedAt: timestamp("requested_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  paidAt: timestamp("paid_at"),
});

// Communications
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id"),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").references(() => users.id),
  subject: varchar("subject"),
  body: text("body").notNull(),
  attachments: text("attachments").array(),
  visibility: varchar("visibility").default("private"), // "public", "private", "cohort"
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(),
  channel: varchar("channel").notNull(), // "email", "in_app", "sms"
  subject: varchar("subject"),
  payload: jsonb("payload"),
  readAt: timestamp("read_at"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Rubrics and scoring
export const rubrics = pgTable("rubrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  criteria: jsonb("criteria").notNull(),
  weights: jsonb("weights"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const scores = pgTable("scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rubricId: varchar("rubric_id").notNull().references(() => rubrics.id),
  subjectType: varchar("subject_type").notNull(), // "application", "deliverable", "project"
  subjectId: varchar("subject_id").notNull(),
  reviewerId: varchar("reviewer_id").notNull().references(() => users.id),
  values: jsonb("values").notNull(),
  total: integer("total"),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit logs
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: varchar("actor_id").references(() => users.id),
  action: varchar("action").notNull(),
  subjectType: varchar("subject_type"),
  subjectId: varchar("subject_id"),
  metadata: jsonb("metadata"),
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// AI Coach conversations
export const aiConversations = pgTable("ai_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title"),
  mode: varchar("mode"), // "process_guide", "ideation", "technical", "gtm", "pitch"
  messages: jsonb("messages").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Program Roadmap System
export const roadmapTemplates = pgTable("roadmap_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  cohortId: varchar("cohort_id").references(() => cohorts.id), // null = global template
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const roadmapItems = pgTable("roadmap_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => roadmapTemplates.id, { onDelete: "cascade" }),
  type: roadmapItemTypeEnum("type").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  week: integer("week").notNull(), // 1-8 for 8-week program
  dueOffsetDays: integer("due_offset_days").default(0), // days relative to cohort start
  orderIndex: integer("order_index").notNull(),
  // Template-level integration (reusable across projects)
  moduleId: varchar("module_id").references(() => modules.id),
  lessonId: varchar("lesson_id").references(() => lessons.id),
  milestoneId: varchar("milestone_id").references(() => milestones.id),
  // Auto-completion settings
  autoCompletionType: autoCompletionTypeEnum("auto_completion_type").default("none"),
  autoThreshold: integer("auto_threshold").default(100), // percentage threshold for completion
  // Dependencies
  dependencyIds: varchar("dependency_ids").array(), // IDs of other roadmap items that must be completed first
  isOptional: boolean("is_optional").default(false),
  estimatedHours: integer("estimated_hours"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("roadmap_items_template_week_idx").on(table.templateId, table.week),
]);

export const assignedRoadmap = pgTable("assigned_roadmap", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: varchar("item_id").notNull().references(() => roadmapItems.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: roadmapStatusEnum("status").default("not_started"),
  completedAt: timestamp("completed_at"),
  evidenceArtifactId: varchar("evidence_artifact_id").references(() => artifacts.id),
  // Project-specific bindings (set during assignment)
  deliverableId: varchar("deliverable_id").references(() => deliverables.id),
  mentorSessionId: varchar("mentor_session_id").references(() => mentorSessions.id),
  notes: text("notes"),
  blockerReason: text("blocker_reason"),
  waiveReason: text("waive_reason"),
  reviewerFeedback: text("reviewer_feedback"),
  autoCompleted: boolean("auto_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("assigned_roadmap_item_project_unq").on(table.itemId, table.projectId),
  index("assigned_roadmap_project_status_idx").on(table.projectId, table.status),
]);

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  applications: many(applications),
  signatures: many(signatures),
  projects: many(projects),
  projectTeamMembers: many(projectTeamMembers),
  mentorProfile: one(mentorProfiles),
  mentorSessions: many(mentorSessions),
  deliverables: many(deliverables),
  scores: many(scores),
  messages: many(messages),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
  aiConversations: many(aiConversations),
}));

export const cohortsRelations = relations(cohorts, ({ many }) => ({
  applications: many(applications),
  modules: many(modules),
  milestones: many(milestones),
  projects: many(projects),
  fundingPrograms: many(fundingPrograms),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, { fields: [projects.ownerId], references: [users.id] }),
  cohort: one(cohorts, { fields: [projects.cohortId], references: [cohorts.id] }),
  teamMembers: many(projectTeamMembers),
  artifacts: many(artifacts),
  deliverables: many(deliverables),
  investorInterests: many(investorInterests),
  disbursementRequests: many(disbursementRequests),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  user: one(users, { fields: [applications.userId], references: [users.id] }),
  cohort: one(cohorts, { fields: [applications.cohortId], references: [cohorts.id] }),
}));

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  cohort: one(cohorts, { fields: [milestones.cohortId], references: [cohorts.id] }),
  deliverables: many(deliverables),
}));

export const deliverablesRelations = relations(deliverables, ({ one }) => ({
  milestone: one(milestones, { fields: [deliverables.milestoneId], references: [milestones.id] }),
  project: one(projects, { fields: [deliverables.projectId], references: [projects.id] }),
  owner: one(users, { fields: [deliverables.ownerId], references: [users.id] }),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  cohort: one(cohorts, { fields: [modules.cohortId], references: [cohorts.id] }),
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  module: one(modules, { fields: [lessons.moduleId], references: [modules.id] }),
  quiz: one(quizzes, { fields: [lessons.quizId], references: [quizzes.id] }),
  userProgress: many(userProgress),
}));

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  user: one(users, { fields: [userProgress.userId], references: [users.id] }),
  lesson: one(lessons, { fields: [userProgress.lessonId], references: [lessons.id] }),
}));

export const roadmapTemplatesRelations = relations(roadmapTemplates, ({ one, many }) => ({
  cohort: one(cohorts, { fields: [roadmapTemplates.cohortId], references: [cohorts.id] }),
  items: many(roadmapItems),
}));

export const roadmapItemsRelations = relations(roadmapItems, ({ one, many }) => ({
  template: one(roadmapTemplates, { fields: [roadmapItems.templateId], references: [roadmapTemplates.id] }),
  module: one(modules, { fields: [roadmapItems.moduleId], references: [modules.id] }),
  lesson: one(lessons, { fields: [roadmapItems.lessonId], references: [lessons.id] }),
  milestone: one(milestones, { fields: [roadmapItems.milestoneId], references: [milestones.id] }),
  assignments: many(assignedRoadmap),
}));

export const assignedRoadmapRelations = relations(assignedRoadmap, ({ one }) => ({
  item: one(roadmapItems, { fields: [assignedRoadmap.itemId], references: [roadmapItems.id] }),
  project: one(projects, { fields: [assignedRoadmap.projectId], references: [projects.id] }),
  user: one(users, { fields: [assignedRoadmap.userId], references: [users.id] }),
  evidenceArtifact: one(artifacts, { fields: [assignedRoadmap.evidenceArtifactId], references: [artifacts.id] }),
  deliverable: one(deliverables, { fields: [assignedRoadmap.deliverableId], references: [deliverables.id] }),
  mentorSession: one(mentorSessions, { fields: [assignedRoadmap.mentorSessionId], references: [mentorSessions.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  role: true,
});

export const adminUpdateUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  role: true,
  bio: true,
  skills: true,
  interests: true,
  industryFocus: true,
  timezone: true,
  locale: true,
  profileVisibility: true,
  isActive: true,
});

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDeliverableSchema = createInsertSchema(deliverables).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertAiConversationSchema = createInsertSchema(aiConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertModuleSchema = createInsertSchema(modules).omit({
  id: true,
  createdAt: true,
});

export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
  createdAt: true,
});

export const insertQuizSchema = createInsertSchema(quizzes).omit({
  id: true,
  createdAt: true,
});

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCohortSchema = createInsertSchema(cohorts).omit({
  id: true,
  createdAt: true,
});

export const insertArtifactSchema = createInsertSchema(artifacts).omit({
  id: true,
  createdAt: true,
});

export const insertRoadmapTemplateSchema = createInsertSchema(roadmapTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoadmapItemSchema = createInsertSchema(roadmapItems).omit({
  id: true,
  createdAt: true,
});

export const insertAssignedRoadmapSchema = createInsertSchema(assignedRoadmap).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMentorProfileSchema = createInsertSchema(mentorProfiles).omit({
  id: true,
  createdAt: true,
});

export const insertMentorSessionSchema = createInsertSchema(mentorSessions).omit({
  id: true,
  createdAt: true,
});

export const insertInvestorSchema = createInsertSchema(investors).omit({
  id: true,
  createdAt: true,
});

export const insertInvestorSessionSchema = createInsertSchema(investorSessions).omit({
  id: true,
  createdAt: true,
});

export const insertInvestorCohortParticipationSchema = createInsertSchema(investorCohortParticipation).omit({
  id: true,
  createdAt: true,
  assignedAt: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Cohort = typeof cohorts.$inferSelect;
export type InsertCohort = z.infer<typeof insertCohortSchema>;
export type Module = typeof modules.$inferSelect;
export type InsertModule = z.infer<typeof insertModuleSchema>;
export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type Milestone = typeof milestones.$inferSelect;
export type Deliverable = typeof deliverables.$inferSelect;
export type InsertDeliverable = z.infer<typeof insertDeliverableSchema>;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type AiConversation = typeof aiConversations.$inferSelect;
export type InsertAiConversation = z.infer<typeof insertAiConversationSchema>;
export type InvestorInterest = typeof investorInterests.$inferSelect;
export type DisbursementRequest = typeof disbursementRequests.$inferSelect;
export type Score = typeof scores.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Artifact = typeof artifacts.$inferSelect;
export type InsertArtifact = z.infer<typeof insertArtifactSchema>;
export type RoadmapTemplate = typeof roadmapTemplates.$inferSelect;
export type InsertRoadmapTemplate = z.infer<typeof insertRoadmapTemplateSchema>;
export type RoadmapItem = typeof roadmapItems.$inferSelect;
export type InsertRoadmapItem = z.infer<typeof insertRoadmapItemSchema>;
export type AssignedRoadmap = typeof assignedRoadmap.$inferSelect;
export type InsertAssignedRoadmap = z.infer<typeof insertAssignedRoadmapSchema>;
export type MentorProfile = typeof mentorProfiles.$inferSelect;
export type InsertMentorProfile = z.infer<typeof insertMentorProfileSchema>;
export type MentorSession = typeof mentorSessions.$inferSelect;
export type InsertMentorSession = z.infer<typeof insertMentorSessionSchema>;
export type Investor = typeof investors.$inferSelect;
export type InsertInvestor = z.infer<typeof insertInvestorSchema>;
export type InvestorSession = typeof investorSessions.$inferSelect;
export type InsertInvestorSession = z.infer<typeof insertInvestorSessionSchema>;
export type InvestorCohortParticipation = typeof investorCohortParticipation.$inferSelect;
export type InsertInvestorCohortParticipation = z.infer<typeof insertInvestorCohortParticipationSchema>;
