# MD Genius AI Startup Launchpad Platform

## Overview

The MD Genius AI Startup Launchpad is a comprehensive web application designed to manage the entire lifecycle of an AI startup accelerator program. It facilitates talent acquisition, application review, cohort management, curriculum delivery, project development, mentorship coordination, investor engagement, and funding disbursement for applicants, participants, mentors, investors, and administrators. The platform supports an 8-week intensive program focused on AI startup development. Its business vision is to streamline and professionalize the AI startup acceleration process, offering a robust and scalable solution for nurturing next-generation AI ventures.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite.
- **UI Library**: Radix UI components with shadcn/ui design system.
- **Styling**: Tailwind CSS with custom CSS variables, dark mode, and web3-inspired design.
- **State Management**: TanStack Query for server state management.
- **Routing**: Wouter for lightweight client-side routing.
- **Forms**: React Hook Form with Zod validation.
- **File Structure**: Component-based architecture.

### Backend Architecture
- **Runtime**: Node.js with TypeScript and ESM modules.
- **Framework**: Express.js for REST API endpoints.
- **Database ORM**: Drizzle ORM with PostgreSQL dialect.
- **Session Management**: Express sessions with PostgreSQL store.
- **File Structure**: Clear separation between routes, database layer, and business logic.

### Authentication & Authorization
- **Identity Provider**: Replit OIDC integration.
- **Session Management**: HTTP-only cookies with PostgreSQL-backed session store.
- **Authorization**: Role-based access control (RBAC) with six user roles (public_visitor, applicant, participant, mentor, investor, administrator).

### Database Design
- **Primary Database**: PostgreSQL with Neon serverless deployment.
- **Schema Management**: Drizzle Kit for migrations.
- **Data Modeling**: Comprehensive relational schema covering users, applications, projects, cohorts, curriculum, mentorship, and investment.

### AI Integration
- **AI Coach Service**: OpenAI GPT-5 integration for contextual guidance.
- **Knowledge Base**: Structured content for various coaching modes.

### File Storage & Media
- **Object Storage**: Google Cloud Storage integration with custom ACL.

### Core Features
- **Application Management**: Multi-step application form, admin review interface with status updates, automatic role transitions, real-time metrics, advanced filtering.
- **Admin Dashboard**: Live metrics, user management, application review workflow, cohort creation, project monitoring.
- **AI Coach System**: 5 specialized modes (Process Guide, Ideation, Technical, Go-to-Market, Pitch Coach), persistent conversation history, context management, localization support.
- **Curriculum Management**: Comprehensive database schema, production-ready lesson content system with structured formatting, professional visual hierarchy, inline markdown support, universal list rendering, administrator cohort selection, read-only mode for admins, real-time progress tracking, and an 8-week AI startup accelerator curriculum (27 lessons).
- **Program Progress Tracking**: Real-time progress calculation API, dynamic milestone indicators, participant dashboard integration, instant dashboard updates via smart cache invalidation.
- **Project Management**: Basic creation/editing, project overview, AI Coach integration.
- **Communication Framework**: Database schema for messages, threads, and notifications; API endpoints for operations.

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