# MD Genius AI Startup Launchpad Platform

## Overview

The MD Genius AI Startup Launchpad is a comprehensive web application designed to manage the entire lifecycle of an AI startup accelerator program. It facilitates talent acquisition, application review, cohort management, curriculum delivery, project development, mentorship coordination, investor engagement, and funding disbursement. The platform supports an 8-week intensive program focused on AI startup development, aiming to streamline and professionalize the AI startup acceleration process for nurturing next-generation AI ventures.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript and Vite.
- **UI**: Radix UI components with shadcn/ui design system, Tailwind CSS.
- **State Management**: TanStack Query.
- **Routing**: Wouter.
- **Forms**: React Hook Form with Zod validation.

### Backend
- **Runtime**: Node.js with TypeScript and ESM modules.
- **Framework**: Express.js for REST API.
- **Database ORM**: Drizzle ORM with PostgreSQL.
- **Session Management**: Express sessions with PostgreSQL store.

### Authentication & Authorization
- **Identity Provider**: Replit OIDC integration.
- **Session Management**: HTTP-only cookies with PostgreSQL-backed session store.
- **Authorization**: Role-based access control (RBAC) with six user roles (public_visitor, applicant, participant, mentor, investor, administrator).

### Database Design
- **Primary Database**: PostgreSQL with Neon serverless deployment.
- **Schema Management**: Drizzle Kit for migrations.
- **Data Modeling**: Relational schema covering users, applications, projects, cohorts, curriculum, mentorship, investment, and comprehensive roadmap system (roadmap templates, roadmap items, assigned roadmap tracking).

### AI Integration
- **AI Coach Service**: OpenAI GPT-5 integration for contextual guidance with 5 specialized modes (Process Guide, Ideation, Technical, Go-to-Market, Pitch Coach).
- **Knowledge Base**: Structured content for various coaching modes.

### File Storage
- **Object Storage**: Google Cloud Storage.

### Core Features
- **Application Management**: Multi-step forms, admin review, status updates, automatic role transitions.
- **Admin Dashboard**: Live metrics, user management, application review, cohort creation, project monitoring.
- **Curriculum Management**: Comprehensive database schema, production-ready lesson content system, 8-week AI accelerator curriculum (27 lessons), real-time progress tracking.
- **Program Roadmap System**: Complete 8-week AI startup accelerator roadmap template with 57 structured items covering the entire program lifecycle from ideation to demo day. Includes roadmap templates, item management, assignment tracking, and multi-project reusability.
- **Roadmap Participant Experience**: Dashboard "This Week" widget, full roadmap view, curriculum integration, project milestone tracking, and seamless cross-component navigation with real-time progress updates.
- **Roadmap Admin Management**: Program Roadmap Manager interface for creating/editing templates, assigning roadmaps to projects, monitoring participant progress, and managing reusable templates for different program types.
- **Program Progress Tracking**: Real-time progress calculation API, dynamic milestone indicators, participant dashboard integration, instant updates via smart cache invalidation, auto-completion logic for dependent tasks.
- **Project Management**: Basic creation/editing, project overview, AI Coach integration, roadmap milestone tracking integration.
- **Communication Framework**: Database schema for messages, threads, and notifications.

## Recent Major Updates

### Roadmap System Implementation (September 2025)
- **Complete 8-Week AI Startup Accelerator Program**: 57 structured roadmap items covering all program phases from Week 1 (AI Fundamentals & Problem Definition) to Week 8 (Scaling & Demo Day Preparation).
- **Roadmap Item Types**: Six types of program activities - tasks, assignments, deliverables, milestones, check-ins, and learning modules with proper categorization and tracking.
- **Multi-Project Template System**: Reusable roadmap templates that can be assigned to multiple projects, enabling scalable program management across different cohorts.
- **Participant Integration**: Roadmap items seamlessly integrated across all participant views (Dashboard, Roadmap, Curriculum, Project) with consistent data and real-time updates.
- **Admin Management Tools**: Comprehensive Program Roadmap Manager allowing administrators to create, edit, assign, and monitor roadmap templates and participant progress.
- **Auto-completion Logic**: Smart task dependency management with automatic completion triggers and progress calculation.
- **API Layer**: Complete REST API for roadmap management with proper authentication, authorization, and error handling.

### Technical Achievements
- **Database Schema**: Extended with roadmapTemplates, roadmapItems, and assignedRoadmap tables supporting full roadmap lifecycle management.
- **Storage Interface**: Comprehensive CRUD operations for roadmap management with auto-completion logic and template reusability.
- **API Routes**: Full REST API including participant routes (/api/roadmap, /api/roadmap/current-week) and admin management endpoints.
- **Frontend Integration**: Roadmap components integrated into existing participant views with proper state management and cache invalidation.
- **Progress Tracking**: Real-time progress calculation and milestone tracking with visual indicators across all views.

## External Dependencies

### Third-Party Services
- **Database**: Neon PostgreSQL serverless database.
- **Authentication**: Replit OIDC provider.
- **AI Services**: OpenAI API (GPT-5 model).
- **File Storage**: Google Cloud Storage.

### Key Libraries & Frameworks
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Radix UI, TanStack Query, Wouter.
- **Backend**: Express, Drizzle ORM, Passport.js, connect-pg-simple.
- **Validation**: Zod.