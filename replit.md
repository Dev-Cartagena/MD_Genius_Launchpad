# MD Genius AI Startup Launchpad Platform

## Overview

The MD Genius AI Startup Launchpad is a web application designed to manage the entire lifecycle of an AI startup accelerator program. It supports talent acquisition, application review, cohort management, curriculum delivery, project development, mentorship coordination, investor engagement, and funding disbursement. The platform facilitates an 8-week intensive program focused on AI startup development, aiming to streamline and professionalize the AI startup acceleration process.

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
- **Authorization**: Role-based access control (RBAC) with six user roles.

### Database Design
- **Primary Database**: PostgreSQL with Neon serverless deployment.
- **Schema Management**: Drizzle Kit for migrations.
- **Data Modeling**: Relational schema covering users, applications, projects, cohorts, curriculum, mentorship, investment, and a comprehensive roadmap system.

### AI Integration
- **AI Coach Service**: OpenAI GPT-5 integration for contextual guidance with 5 specialized modes.

### File Storage
- **Object Storage**: Google Cloud Storage.

### Core Features
- **Application Management**: Multi-step forms, admin review, status updates.
- **Admin Dashboard**: Metrics, user management, application review, cohort creation, project monitoring.
- **Curriculum Management**: Comprehensive database schema, 8-week AI accelerator curriculum, real-time progress tracking.
- **Program Roadmap System**: Complete 8-week AI startup accelerator roadmap template with 57 structured items. Includes roadmap templates, item management, assignment tracking, and multi-project reusability.
- **Roadmap Participant Experience**: Dashboard "This Week" widget, full roadmap view, curriculum integration, project milestone tracking, and real-time progress updates.
- **Roadmap Admin Management**: Interface for creating/editing templates, assigning roadmaps to projects, and monitoring participant progress.
- **Program Progress Tracking**: Real-time progress calculation API, dynamic milestone indicators, auto-completion logic for dependent tasks.
- **Project Management**: Basic creation/editing, overview, AI Coach integration, roadmap milestone tracking.
- **Communication Framework**: Database schema for messages, threads, and notifications.
- **Mentor Management System**: Comprehensive mentor profiles, multi-expertise categorization, industry specialization, advanced session booking system, and dashboard analytics.
- **Investor Management System**: Advanced session scheduling with timezone awareness, duration preservation logic, expanded investment sectors (including AI/ML), and improved investor card UI/UX.

## Recent Major Updates

### Enhanced Mentor Management System (September 2025)
- **Comprehensive Mentor Profiles**: Complete mentor profile management with expertise areas, professional bio, industry focus, availability preferences, and active status tracking.
- **Multi-Expertise Categorization**: Mentor expertise spans 12 key areas including AI/Machine Learning, Product Strategy, Software Engineering, Data Science, Business Development, Marketing & Growth, Fundraising, Legal & Compliance, UX/UI Design, Operations, Sales, and Leadership.
- **Industry Specialization Tracking**: Support for 12 industry verticals including Healthcare, Fintech, EdTech, E-commerce, SaaS, Cybersecurity, Climate Tech, Web3/Blockchain, Robotics, IoT, Gaming, and Media & Entertainment.
- **Advanced Session Booking System**: Intelligent session scheduling with 7-day availability windows, morning (10:00 AM) and afternoon (2:00 PM) time slots, customizable session durations (30-120 minutes), and structured agenda planning.
- **Mentor Dashboard Analytics**: Real-time mentor performance tracking including session statistics, upcoming sessions overview, recent feedback summaries, and mentee progress monitoring.
- **Role-Based Profile Access**: Secure mentor profile creation and editing restricted to users with mentor role, ensuring data integrity and proper access control.
- **Session Management Workflow**: Complete session lifecycle management from booking to completion with title, agenda, timing, duration tracking, and participant coordination.

### Enhanced Investor Management System (September 2025)
- **Advanced Session Scheduling**: Complete time picker system with date selection, time slots (9:00 AM - 5:00 PM in 30-minute intervals), and duration options (30 minutes, 1 hour, 1.5 hours, 2 hours).
- **Timezone-Aware Time Calculation**: Fixed critical time calculation bugs by implementing local datetime formatting instead of UTC conversion, ensuring accurate time display across all timezones without date shifting.
- **Duration Preservation Logic**: Enhanced form handling to preserve user-selected session duration across date/time changes, preventing unwanted overrides from default 60-minute assumptions.
- **AI/Machine Learning Sector Addition**: Expanded investment sector options to include "AI/Machine Learning" category for better investor categorization and filtering.
- **Cohort Assignment Display**: Implemented real-time cohort assignment tracking with dedicated API endpoint (`/api/admin/cohort-assignments`) replacing placeholder content with live administrative data.
- **Improved Card UI/UX**: Redesigned investor cards with compact layout (max-width constraints), better proportions (smaller avatars, tighter spacing), enhanced typography hierarchy, and more subtle control styling.
- **Professional Time Display**: Session scheduling now shows accurate end time calculations with proper local timezone handling and preserves user-selected durations across form interactions.

### Technical Achievements
- **Mentor Management Infrastructure**: Complete REST API layer for mentor profile CRUD operations with role-based authentication, session booking endpoints, and mentor dashboard analytics.
- **Session Booking Architecture**: Advanced session scheduling system with 7-day time slot generation, duration validation (30-120 minutes), and intelligent availability windows with morning/afternoon scheduling options.
- **Mentor Profile Validation**: Comprehensive form validation using Zod schemas for expertise arrays, bio content, industry selections, and availability preferences with custom field support.
- **Mentorship Analytics Engine**: Real-time mentor performance tracking including session statistics, feedback aggregation, and mentee progress monitoring with dashboard integration.
- **Local DateTime Handling**: Implemented timezone-safe datetime formatting and calculation functions for accurate session scheduling across different user locations.
- **State Preservation**: Enhanced form management with duration tracking state to maintain user selections across form field interactions and recalculations.
- **Investor Management API**: Enhanced investor management endpoints with session scheduling, cohort assignment tracking, and administrative oversight capabilities.

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