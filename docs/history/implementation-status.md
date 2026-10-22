# MD Genius AI Startup Launchpad - Implementation Documentation

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Database Schema](#database-schema)
5. [Features Implemented](#features-implemented)
6. [API Architecture](#api-architecture)
7. [Security Implementation](#security-implementation)

---

## Overview

The MD Genius AI Startup Launchpad is a full-stack web application being developed to manage an 8-week AI startup accelerator program. The platform is under active development with the following planned capabilities:

**Functional Core:**
- **Authentication**: Dual authentication system (Replit OIDC + local email/password)
- **Database Schema**: Comprehensive 28+ table schema for all platform features

**In Development:**
- **Cohort Management**: Program organization with basic CRUD operations
- **Curriculum System**: Module/lesson/quiz structure with admin interface in progress
- **Mentor Management**: Profile management with admin viewing capabilities
- **Investor Management**: Profile and session scheduling schemas with partial UI

**Planned (Schema Defined):**
- **Application Management**: Multi-step application process
- **Project Development**: 5-stage startup lifecycle management
- **AI Coach**: GPT-powered guidance system
- **Funding Management**: Grant/stipend/prize disbursement workflows

---

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI component library with TypeScript |
| **Vite** | Build tool and development server |
| **TanStack Query v5** | Server state management and caching |
| **Wouter** | Lightweight client-side routing |
| **React Hook Form** | Form state management and validation |
| **Zod** | Schema validation for forms and API |
| **shadcn/ui** | Pre-built accessible UI components |
| **Radix UI** | Headless component primitives |
| **Tailwind CSS** | Utility-first CSS styling |
| **Lucide React** | Icon library |
| **Recharts** | Data visualization charts |

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime environment |
| **Express.js** | Web framework for REST API |
| **TypeScript** | Type-safe JavaScript |
| **Drizzle ORM** | Type-safe database ORM |
| **Passport.js** | Authentication middleware |
| **bcrypt** | Password hashing |
| **connect-pg-simple** | PostgreSQL session storage |

### Database
| Technology | Purpose |
|------------|---------|
| **PostgreSQL** | Relational database (Neon serverless) |
| **Drizzle Kit** | Database migrations and schema management |

### External Services
| Service | Purpose |
|---------|---------|
| **Replit OIDC** | OAuth authentication provider |
| **OpenAI API** | AI Coach conversational intelligence |
| **Object Storage** | File and asset storage (Replit integration) |

---

## System Architecture

### Application Structure

```
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ui/           # shadcn/ui components
│   │   │   └── Admin/        # Admin panel components
│   │   ├── pages/            # Route page components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utility functions
│   │   └── App.tsx           # Root application component
│   └── index.html
├── server/                    # Backend Express application
│   ├── index.ts              # Server entry point
│   ├── routes.ts             # API route definitions
│   ├── storage.ts            # Database access layer
│   ├── auth.ts               # Authentication logic
│   └── vite.ts               # Vite integration
├── shared/                    # Shared code between frontend/backend
│   └── schema.ts             # Database schema and types
└── drizzle.config.ts         # Drizzle ORM configuration
```

### Authentication Flow

The platform implements a dual authentication system:

1. **Replit OIDC**: OAuth-based authentication for Replit platform users
2. **Local Email/Password**: Traditional authentication with bcrypt hashing

Both methods use:
- HTTP-only session cookies
- Session storage in PostgreSQL
- Role-Based Access Control (RBAC)

### Role-Based Access Control (RBAC)

Six distinct user roles with hierarchical permissions:

| Role | Description | Access Level |
|------|-------------|--------------|
| `public_visitor` | Unauthenticated users | Public pages only |
| `applicant` | Users with submitted applications | Application portal |
| `participant` | Accepted program members | Full program access |
| `mentor` | Industry experts and advisors | Mentorship features |
| `investor` | VCs and angel investors | Investment features |
| `administrator` | Platform administrators | Full administrative access |

---

## Database Schema

### Entity Relationship Diagram

The database consists of 28+ tables organized into functional domains:

### Core Tables

#### Users Table
Central user management with authentication and profile data.

```
users
├── id (varchar, PK, UUID)
├── email (varchar, unique)
├── firstName (varchar)
├── lastName (varchar)
├── profileImageUrl (varchar)
├── role (enum: user_role)
├── passwordHash (varchar, nullable)
├── emailVerified (boolean)
├── passwordResetTokenHash (varchar, nullable)
├── passwordResetExpires (timestamp, nullable)
├── bio (text)
├── skills (text[])
├── interests (text[])
├── industryFocus (text)
├── timezone (varchar)
├── locale (varchar)
├── profileVisibility (varchar)
├── isActive (boolean)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

**Relationships:**
- One-to-Many: applications, signatures, projects, messages, notifications
- One-to-One: mentorProfile
- Many-to-Many: projectTeamMembers

#### Sessions Table
Session storage for authentication.

```
sessions
├── sid (varchar, PK)
├── sess (jsonb)
└── expire (timestamp, indexed)
```

### Program Management Tables

#### Cohorts Table
Program cohort organization.

```
cohorts
├── id (varchar, PK, UUID)
├── name (varchar)
├── description (text)
├── startDate (timestamp)
├── endDate (timestamp)
├── capacity (integer)
├── tracks (text[])
├── calendarId (varchar)
├── isActive (boolean)
└── createdAt (timestamp)
```

**Relationships:**
- One-to-Many: applications, modules, milestones, projects, fundingPrograms

#### Applications Table
Program applications with status tracking.

```
applications
├── id (varchar, PK, UUID)
├── userId (varchar, FK → users.id)
├── cohortId (varchar, FK → cohorts.id)
├── answers (jsonb)
├── uploads (text[])
├── status (enum: application_status)
├── scores (jsonb)
├── reviewerNotes (text[])
├── submittedAt (timestamp)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

**Status Values:** draft → submitted → under_review → shortlisted → interview → offer/waitlist/rejected → accepted

### Curriculum Tables

#### Modules Table
Weekly learning modules.

```
modules
├── id (varchar, PK, UUID)
├── cohortId (varchar, FK → cohorts.id)
├── title (varchar)
├── description (text)
├── week (integer)
├── objectives (text[])
├── resources (text[])
├── orderIndex (integer)
└── createdAt (timestamp)
```

#### Lessons Table
Individual learning units within modules.

```
lessons
├── id (varchar, PK, UUID)
├── moduleId (varchar, FK → modules.id)
├── title (varchar)
├── content (text)
├── media (text[])
├── quizId (varchar)
├── prerequisites (varchar[])
├── orderIndex (integer)
└── createdAt (timestamp)
```

#### Quizzes Table
Assessment quizzes with configurable scoring.

```
quizzes
├── id (varchar, PK, UUID)
├── title (varchar)
├── questions (jsonb)
├── passThreshold (integer)
├── maxAttempts (integer)
└── createdAt (timestamp)
```

#### User Progress Table
Tracks individual learning progress.

```
user_progress
├── id (varchar, PK, UUID)
├── userId (varchar, FK → users.id)
├── lessonId (varchar, FK → lessons.id)
├── isCompleted (boolean)
├── completedAt (timestamp)
├── timeSpent (integer, minutes)
├── score (integer)
├── attempts (integer)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

**Unique Constraint:** (userId, lessonId)

### Project Tables

#### Projects Table
Startup project management.

```
projects
├── id (varchar, PK, UUID)
├── ownerId (varchar, FK → users.id)
├── cohortId (varchar, FK → cohorts.id, nullable)
├── name (varchar)
├── stage (enum: project_stage)
├── summary (text)
├── problem (text)
├── solution (text)
├── market (text)
├── aiComponents (text[])
├── dataNeeds (text)
├── risks (text[])
├── ethics (text)
├── readinessScore (integer, 0-100)
├── isPublic (boolean)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

**Stage Values:** ideation → validation → mvp_build → pilot_traction → pitch_ready

#### Project Team Members Table
Multi-member project collaboration.

```
project_team_members
├── id (varchar, PK, UUID)
├── projectId (varchar, FK → projects.id)
├── userId (varchar, FK → users.id)
├── role (varchar: CEO, CTO, PM, DS)
└── joinedAt (timestamp)
```

#### Artifacts Table
Project deliverable storage.

```
artifacts
├── id (varchar, PK, UUID)
├── projectId (varchar, FK → projects.id)
├── type (varchar: deck, one_pager, video, model_card)
├── title (varchar)
├── fileRef (varchar, object storage reference)
├── version (integer)
├── isGated (boolean)
└── createdAt (timestamp)
```

### Mentorship Tables

#### Mentor Profiles Table
Extended mentor information.

```
mentor_profiles
├── id (varchar, PK, UUID)
├── userId (varchar, FK → users.id)
├── expertise (text[])
├── availability (jsonb)
├── bio (text)
├── industries (text[])
├── isActive (boolean)
└── createdAt (timestamp)
```

**Expertise Areas:** AI/ML, Product Strategy, Engineering, Data Science, Business Development, Marketing, Fundraising, Legal, UX/UI, Operations, Sales, Leadership

**Industry Verticals:** Healthcare, Fintech, EdTech, E-commerce, SaaS, Cybersecurity, Climate Tech, Web3, Robotics, IoT, Gaming, Media

##### Mentor Sessions Table
Scheduled mentoring sessions.

```
mentor_sessions
├── id (varchar, PK, UUID)
├── mentorId (varchar, FK → users.id)
├── participantIds (varchar[])
├── title (varchar)
├── startTime (timestamp)
├── endTime (timestamp)
├── agenda (text)
├── notes (text)
├── attendance (jsonb)
├── meetingLink (varchar)
└── createdAt (timestamp)
```

### Investor Tables

#### Investors Table
Investor organization profiles.

```
investors
├── id (varchar, PK, UUID)
├── userId (varchar, FK → users.id, nullable)
├── organization (varchar)
├── contactEmail (varchar)
├── sectors (text[])
├── stages (text[])
├── geography (text[])
├── checkSize (varchar)
├── preferences (jsonb)
├── ndaStatus (boolean)
├── isActive (boolean)
└── createdAt (timestamp)
```

#### Investor Interests Table
Investment pipeline tracking.

```
investor_interests
├── id (varchar, PK, UUID)
├── investorId (varchar, FK → investors.id)
├── projectId (varchar, FK → projects.id)
├── level (enum: investor_interest_level)
├── questions (text[])
├── meetings (jsonb)
├── notes (text)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

**Interest Levels:** viewed → requested_info → meeting_scheduled → diligence → soft_commit → commit

#### Investor Sessions Table
Investor meeting scheduling.

```
investor_sessions
├── id (varchar, PK, UUID)
├── investorId (varchar, FK → investors.id)
├── participantIds (varchar[])
├── title (varchar)
├── startTime (timestamp)
├── endTime (timestamp)
├── agenda (text)
├── notes (text)
├── attendance (jsonb)
├── meetingLink (varchar)
├── sessionType (varchar: pitch, feedback, due_diligence, demo_day)
└── createdAt (timestamp)
```

#### Investor Cohort Participation Table
Cohort assignment tracking.

```
investor_cohort_participation
├── id (varchar, PK, UUID)
├── investorId (varchar, FK → investors.id)
├── cohortId (varchar, FK → cohorts.id)
├── role (varchar: judge, advisor, funding_partner, demo_day_evaluator)
├── status (varchar)
├── assignedAt (timestamp)
└── createdAt (timestamp)
```

### Roadmap Tables

#### Roadmap Templates Table
Reusable program roadmap templates.

```
roadmap_templates
├── id (varchar, PK, UUID)
├── name (varchar)
├── description (text)
├── cohortId (varchar, FK → cohorts.id, nullable)
├── isActive (boolean)
├── isDefault (boolean)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

#### Roadmap Items Table
Individual roadmap tasks and milestones.

```
roadmap_items
├── id (varchar, PK, UUID)
├── templateId (varchar, FK → roadmap_templates.id, CASCADE)
├── type (enum: roadmap_item_type)
├── title (varchar)
├── description (text)
├── week (integer, 1-8)
├── dueOffsetDays (integer)
├── orderIndex (integer)
├── moduleId (varchar, FK → modules.id, nullable)
├── lessonId (varchar, FK → lessons.id, nullable)
├── milestoneId (varchar, FK → milestones.id, nullable)
├── autoCompletionType (enum: auto_completion_type)
├── autoThreshold (integer, percentage)
├── dependencyIds (varchar[])
├── isOptional (boolean)
├── estimatedHours (integer)
├── tags (text[])
└── createdAt (timestamp)
```

**Item Types:** task, assignment, deliverable, milestone, checkin, learning

**Auto-Completion Types:** none, lesson, module, deliverable, milestone, mentor_session

#### Assigned Roadmap Table
Project-specific roadmap assignments.

```
assigned_roadmap
├── id (varchar, PK, UUID)
├── itemId (varchar, FK → roadmap_items.id, CASCADE)
├── projectId (varchar, FK → projects.id)
├── userId (varchar, FK → users.id)
├── status (enum: roadmap_status)
├── completedAt (timestamp)
├── evidenceArtifactId (varchar, FK → artifacts.id, nullable)
├── deliverableId (varchar, FK → deliverables.id, nullable)
├── mentorSessionId (varchar, FK → mentor_sessions.id, nullable)
├── notes (text)
├── blockerReason (text)
├── waiveReason (text)
├── reviewerFeedback (text)
├── autoCompleted (boolean)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

**Status Values:** not_started, in_progress, completed, blocked, waived

### Funding Tables

#### Funding Programs Table
Available funding programs.

```
funding_programs
├── id (varchar, PK, UUID)
├── cohortId (varchar, FK → cohorts.id)
├── name (varchar)
├── type (varchar: grant, stipend, prize, sponsorship)
├── rules (jsonb)
├── totalAmount (integer)
├── isActive (boolean)
└── createdAt (timestamp)
```

#### Disbursement Requests Table
Funding request workflow.

```
disbursement_requests
├── id (varchar, PK, UUID)
├── projectId (varchar, FK → projects.id)
├── milestoneId (varchar, FK → milestones.id, nullable)
├── fundingProgramId (varchar, FK → funding_programs.id)
├── amount (integer)
├── docs (text[])
├── status (enum: disbursement_status)
├── decisionReason (text)
├── paymentRef (varchar)
├── requestedAt (timestamp)
├── reviewedAt (timestamp)
└── paidAt (timestamp)
```

**Status Values:** draft → submitted → under_review → approved/denied → paid

### Communication Tables

#### Messages Table
User messaging system.

```
messages
├── id (varchar, PK, UUID)
├── threadId (varchar)
├── senderId (varchar, FK → users.id)
├── receiverId (varchar, FK → users.id, nullable)
├── subject (varchar)
├── body (text)
├── attachments (text[])
├── visibility (varchar: public, private, cohort)
├── readAt (timestamp)
└── createdAt (timestamp)
```

#### Notifications Table
Multi-channel notification system.

```
notifications
├── id (varchar, PK, UUID)
├── userId (varchar, FK → users.id)
├── type (varchar)
├── channel (varchar: email, in_app, sms)
├── subject (varchar)
├── payload (jsonb)
├── readAt (timestamp)
├── sentAt (timestamp)
└── createdAt (timestamp)
```

### Assessment Tables

#### Rubrics Table
Configurable scoring rubrics.

```
rubrics
├── id (varchar, PK, UUID)
├── name (varchar)
├── description (text)
├── criteria (jsonb)
├── weights (jsonb)
└── createdAt (timestamp)
```

#### Scores Table
Rubric-based scoring records.

```
scores
├── id (varchar, PK, UUID)
├── rubricId (varchar, FK → rubrics.id)
├── subjectType (varchar: application, deliverable, project)
├── subjectId (varchar)
├── reviewerId (varchar, FK → users.id)
├── values (jsonb)
├── total (integer)
├── comments (text)
└── createdAt (timestamp)
```

### AI Integration Tables

#### AI Conversations Table
AI Coach conversation history.

```
ai_conversations
├── id (varchar, PK, UUID)
├── userId (varchar, FK → users.id)
├── title (varchar)
├── mode (varchar: process_guide, ideation, technical, gtm, pitch)
├── messages (jsonb)
├── isActive (boolean)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

### Audit Tables

#### Audit Logs Table
System activity tracking.

```
audit_logs
├── id (varchar, PK, UUID)
├── actorId (varchar, FK → users.id, nullable)
├── action (varchar)
├── subjectType (varchar)
├── subjectId (varchar)
├── metadata (jsonb)
├── ipAddress (varchar)
├── userAgent (varchar)
└── createdAt (timestamp)
```

### Legal Tables

#### Agreements Table
Legal document management.

```
agreements
├── id (varchar, PK, UUID)
├── type (varchar: commitment, nda, policy)
├── version (varchar)
├── title (varchar)
├── body (text)
├── locale (varchar)
├── isActive (boolean)
└── createdAt (timestamp)
```

#### Signatures Table
Agreement signature records.

```
signatures
├── id (varchar, PK, UUID)
├── userId (varchar, FK → users.id)
├── agreementId (varchar, FK → agreements.id)
├── ipAddress (varchar)
└── signedAt (timestamp)
```

### Milestone Tables

#### Milestones Table
Program milestone definitions.

```
milestones
├── id (varchar, PK, UUID)
├── cohortId (varchar, FK → cohorts.id)
├── title (varchar)
├── description (text)
├── criteria (text[])
├── requiredArtifacts (text[])
├── dueDate (timestamp)
├── orderIndex (integer)
└── createdAt (timestamp)
```

#### Deliverables Table
Milestone-linked deliverables.

```
deliverables
├── id (varchar, PK, UUID)
├── milestoneId (varchar, FK → milestones.id)
├── projectId (varchar, FK → projects.id)
├── ownerId (varchar, FK → users.id)
├── title (varchar)
├── files (text[])
├── status (enum: deliverable_status)
├── feedback (jsonb)
├── score (integer)
├── submittedAt (timestamp)
├── reviewedAt (timestamp)
└── createdAt (timestamp)
```

**Status Values:** not_started, in_progress, submitted, needs_revision, approved

---

## Features Implementation Status

### Core Infrastructure (Functional)

#### 1. Authentication & User Management
**Status:** Functional
- Dual authentication (Replit OIDC + local email/password)
- Secure password hashing with bcrypt
- Session management with PostgreSQL storage
- Role-based access control (6 roles)
- User profile storage and retrieval

#### 2. Database & Schema
**Status:** Functional
- 28+ tables defined with Drizzle ORM
- PostgreSQL with Neon serverless
- Foreign key relationships established
- Type-safe queries with TypeScript

### Admin Panel Features (In Progress)

#### 3. Cohort Management
**Status:** Admin UI functional, basic CRUD working
- Cohort listing and viewing
- Basic cohort creation
- Capacity and date management

#### 4. Curriculum Management
**Status:** Admin UI in progress
- Module/Lesson/Quiz schema defined
- Admin interface components created
- CRUD operations partially implemented
- Cohort-based organization

#### 5. Roadmap System
**Status:** Schema complete, UI in progress
- Template-based roadmap schema
- Roadmap items with type categorization
- Assignment tracking schema
- Admin interface partially implemented

#### 6. Mentor Management
**Status:** In active development
- Profile schema with expertise/industries
- Backend storage functions
- Admin viewing interface
- Admin editing in development

#### 7. Investor Management
**Status:** Admin UI components created
- Investor profile schema
- Session scheduling schema
- Cohort participation tracking schema
- Admin interface components

### Planned Features (Schema Defined)

#### 8. Project Management
**Status:** Schema complete, UI pending
- 5-stage lifecycle schema
- Team member relationships
- Artifact storage references
- Readiness scoring fields

#### 9. AI Coach Integration
**Status:** Schema defined, integration pending
- Conversation storage schema
- 5 coaching modes defined
- OpenAI integration planned

#### 10. Application Management
**Status:** Schema complete, UI pending
- Multi-step application schema
- Status workflow defined
- Scoring system schema

#### 11. Communication System
**Status:** Schema defined
- Message threading schema
- Notification channels schema

#### 12. Funding Management
**Status:** Schema defined
- Funding programs schema
- Disbursement workflow schema

---

## API Architecture

### RESTful Design Patterns

The API follows RESTful conventions:

**Base URL:** `/api`

**Common Patterns:**
- `GET /api/{resource}` - List resources
- `GET /api/{resource}/:id` - Get by ID
- `POST /api/{resource}` - Create new
- `PATCH /api/{resource}/:id` - Update existing
- `DELETE /api/{resource}/:id` - Delete

**Admin Endpoints:** `/api/admin/{resource}`

### Routes Defined in server/routes.ts

**Authentication Routes:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset completion
- `GET /api/auth/user` - Get current user

**Cohort Routes:**
- `GET /api/cohorts` - List all cohorts
- `GET /api/cohorts/:id` - Get cohort by ID
- `GET /api/cohorts/:cohortId/modules` - Get cohort modules
- `GET /api/cohorts/:cohortId/milestones` - Get cohort milestones

**Admin Curriculum Routes:**
- `GET/POST/PUT/DELETE /api/admin/modules` - Module CRUD
- `GET/POST/PUT/DELETE /api/admin/lessons` - Lesson CRUD
- `GET/POST/PUT/DELETE /api/admin/quizzes` - Quiz CRUD

**Mentor Routes:**
- `GET /api/mentors` - List mentors with profiles
- `PATCH /api/admin/mentors/:id` - Admin mentor profile update
- `GET/POST/PUT /api/mentor/profile` - Mentor self-profile management
- `GET/POST/PUT /api/mentor/sessions` - Mentor session management

**Roadmap Routes:**
- `GET/POST/DELETE /api/admin/roadmap/templates` - Template CRUD
- `GET/POST/PATCH/DELETE /api/admin/roadmap/items` - Item management
- `POST /api/admin/roadmap/templates/:templateId/assign` - Assignment

### Error Handling Pattern

```json
{
  "message": "Error description"
}
```

**HTTP Status Codes Used:**
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

---

## Security Implementation

### Authentication Security
- HTTP-only cookies for session storage
- bcrypt password hashing
- Session storage in PostgreSQL
- Role verification middleware

### Authorization
- Role-based middleware on protected routes
- Admin-only endpoint protection
- User authentication checks

### Data Validation
- Zod schema validation on inputs
- Type-safe database operations with Drizzle ORM
- SQL injection prevention through parameterized queries

---

## Development Practices

### Code Organization
- Shared types between frontend and backend (`shared/schema.ts`)
- Storage interface pattern for database access (`server/storage.ts`)
- Component-based frontend architecture
- Route handlers in `server/routes.ts`

### Type Safety
- Full TypeScript implementation
- Drizzle-Zod for schema generation
- Inferred types from database schema
- Runtime validation with Zod

### State Management
- TanStack Query v5 for server state
- React Hook Form for form state
- Cache invalidation patterns
- Loading and error state handling

---

*Last Updated: December 2025*
