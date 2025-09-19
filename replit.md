# MD Genius AI Startup Launchpad Platform

## Overview
The MD Genius AI Startup Launchpad is a comprehensive web application designed to manage the entire lifecycle of an AI startup accelerator program. It facilitates talent acquisition, application review, cohort management, curriculum delivery, project development, mentorship coordination, investor engagement, and funding disbursement for applicants, participants, mentors, investors, and administrators. The platform aims to be a full-stack application with a React frontend, Express backend, PostgreSQL database (via Drizzle ORM), and integrate AI coaching capabilities through OpenAI's GPT model, emphasizing security, accessibility, and multi-language support (English/Spanish).

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite.
- **UI Library**: Radix UI components with shadcn/ui design system.
- **Styling**: Tailwind CSS with custom CSS variables, supporting dark mode and web3-inspired design.
- **State Management**: TanStack Query for server state management.
- **Routing**: Wouter for client-side routing.
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
- **Knowledge Base**: Structured content for various coaching modes (Process Guide, Ideation, Technical, Go-to-Market, Pitch Coach).

### File Storage & Media
- **Object Storage**: Google Cloud Storage integration with custom ACL.

## External Dependencies
### Third-Party Services
- **Database**: Neon PostgreSQL serverless database.
- **Authentication**: Replit OIDC provider.
- **AI Services**: OpenAI API (GPT-5 model).
- **File Storage**: Google Cloud Storage.

### Key Libraries & Frameworks
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Radix UI, TanStack Query, Wouter.
- **Backend**: Express, Drizzle ORM.
- **Validation**: Zod.