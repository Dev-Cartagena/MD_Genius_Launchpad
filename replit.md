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

### Curriculum-Roadmap Integration (September 2025)
- **Unified Learning Experience**: Seamless integration of curriculum modules into roadmap workflow, creating a single weekly learning journey for participants.
- **Learning Item Enhancement**: Roadmap learning items now display curriculum module information, progress tracking, and direct navigation to course content.
- **Auto-Completion System**: Learning items automatically update completion status based on curriculum progress with 70% module completion threshold.
- **Week-by-Week Binding**: All 8 curriculum modules properly bound to corresponding weekly roadmap learning items, ensuring structured progression through the accelerator program.
- **Mixed Content Display**: Each week shows both curriculum learning items (with module navigation) and manual program items (tasks, assignments, milestones) with appropriate controls.
- **Real-Time Progress Sync**: Curriculum completion immediately reflects in roadmap status with smart cache invalidation and live updates.
- **Enhanced UI/UX**: Learning items show module titles, progress indicators, "View Module" buttons, and auto-completion badges for improved participant experience.

### Technical Achievements
- **Database Schema**: Extended with roadmapTemplates, roadmapItems, and assignedRoadmap tables supporting full roadmap lifecycle management.
- **Storage Interface**: Comprehensive CRUD operations for roadmap management with auto-completion logic and template reusability.
- **API Routes**: Full REST API including participant routes (/api/roadmap, /api/roadmap/current-week) and admin management endpoints.
- **Frontend Integration**: Roadmap components integrated into existing participant views with proper state management and cache invalidation.
- **Progress Tracking**: Real-time progress calculation and milestone tracking with visual indicators across all views.
- **Curriculum Integration**: Enhanced storage layer to fetch and bind lesson/module data with roadmap items, enabling auto-completion based on curriculum progress.
- **Learning Item Architecture**: Implemented sophisticated auto-completion logic with configurable thresholds (70% module completion) and real-time status synchronization.
- **Cross-Component Navigation**: Seamless navigation between roadmap and curriculum views with proper state preservation and cache invalidation strategies.

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

## Future Development Phases

### Phase 1: Enhanced Mentor Management System
**Mentor Booking System Enhancements:**
- **Advanced Scheduling**: Implement granular scheduling options including recurring slots, buffer times between sessions, and automated rescheduling workflows.
- **Calendar Integration**: Connect with external calendar systems (Google Calendar, Outlook) for seamless mentor availability management.
- **Session Feedback System**: Develop post-session feedback mechanisms for both mentors and participants with qualitative and quantitative rating systems.
- **Smart Mentor Matching**: Implement AI-powered matching algorithms based on participant project needs, mentor expertise, and compatibility factors.

### Phase 2: Investor Portal Enhancement
**Advanced Investor Experience:**
- **Advanced Filtering & Search**: Develop sophisticated filtering capabilities for investors to discover startups based on funding stage, AI technology stack, market vertical, and growth metrics.
- **Investor Dashboard**: Create personalized dashboards for tracking portfolio interests, meeting requests, deal flow analytics, and investment pipeline management.
- **Profile Management**: Allow investors to create comprehensive profiles including investment thesis, preferred sectors, funding stages, and portfolio companies.
- **Secure Data Rooms**: Implement secure document sharing spaces for startups to share sensitive information post-NDA agreement with granular access controls.

### Phase 3: Advanced Communication & Notification System
**Real-Time Communication Infrastructure:**
- **Multi-Channel Notifications**: Expand beyond email and in-app notifications to include SMS, Slack integration, and mobile push notifications.
- **User Preference Management**: Implement granular notification preferences allowing users to customize alert types, frequency, and delivery channels.
- **Real-Time Notification Feed**: Develop live notification center within the application with instant updates and interactive elements.
- **Smart Notification Batching**: Introduce intelligent notification digests and batching to reduce user overload while maintaining important communication flow.
- **Audit Trail System**: Implement comprehensive notification logging and audit trails for compliance and troubleshooting purposes.