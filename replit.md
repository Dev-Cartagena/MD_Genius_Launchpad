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
- **Data Modeling**: Relational schema covering users, applications, projects, cohorts, curriculum, mentorship, and investment.

### AI Integration
- **AI Coach Service**: OpenAI GPT-5 integration for contextual guidance with 5 specialized modes (Process Guide, Ideation, Technical, Go-to-Market, Pitch Coach).
- **Knowledge Base**: Structured content for various coaching modes.

### File Storage
- **Object Storage**: Google Cloud Storage.

### Core Features
- **Application Management**: Multi-step forms, admin review, status updates, automatic role transitions.
- **Admin Dashboard**: Live metrics, user management, application review, cohort creation, project monitoring.
- **Curriculum Management**: Comprehensive database schema, production-ready lesson content system, 8-week AI accelerator curriculum (27 lessons), real-time progress tracking.
- **Program Progress Tracking**: Real-time progress calculation API, dynamic milestone indicators, participant dashboard integration, instant updates via smart cache invalidation.
- **Project Management**: Basic creation/editing, project overview, AI Coach integration.
- **Communication Framework**: Database schema for messages, threads, and notifications.

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