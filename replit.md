# MD Genius AI Startup Launchpad Platform

## Overview

The MD Genius AI Startup Launchpad is a comprehensive web application designed to manage the entire lifecycle of an AI startup accelerator program. The platform serves multiple stakeholders including applicants, participants, mentors, investors, and administrators through an 8-week intensive program focused on AI startup development. The system facilitates talent acquisition, application review, cohort management, curriculum delivery, project development, mentorship coordination, investor engagement, and funding disbursement.

The application follows a full-stack architecture with React frontend, Express backend, PostgreSQL database via Drizzle ORM, and integrates AI coaching capabilities through OpenAI's GPT model. The platform emphasizes security, accessibility, and multi-language support (English/Spanish).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for build tooling
- **UI Library**: Radix UI components with shadcn/ui design system implementation
- **Styling**: Tailwind CSS with custom CSS variables for theming, supporting dark mode and web3-inspired design
- **State Management**: TanStack Query (React Query) for server state management and data fetching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **File Structure**: Component-based architecture with separation between pages, components, and utility functions

### Backend Architecture
- **Runtime**: Node.js with TypeScript and ESM modules
- **Framework**: Express.js for REST API endpoints
- **Database ORM**: Drizzle ORM with PostgreSQL dialect for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL store for persistence
- **File Structure**: Clear separation between routes, database layer, and business logic services

### Authentication & Authorization
- **Identity Provider**: Replit OIDC integration for authentication
- **Session Management**: HTTP-only cookies with PostgreSQL-backed session store
- **Authorization**: Role-based access control (RBAC) with six user roles: public_visitor, applicant, participant, mentor, investor, administrator
- **Security**: Session-based authentication with automatic token refresh

### Database Design
- **Primary Database**: PostgreSQL with Neon serverless deployment
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Data Modeling**: Comprehensive relational schema covering users, applications, projects, cohorts, curriculum modules, mentorship, and investment tracking
- **Session Storage**: Dedicated sessions table for authentication state

### AI Integration
- **AI Coach Service**: OpenAI GPT-5 integration for providing contextual guidance
- **Knowledge Base**: Structured content for process guidance, ideation support, technical assistance, and pitch preparation
- **Conversation Management**: Persistent AI conversation history with source tracking

### File Storage & Media
- **Object Storage**: Google Cloud Storage integration with custom ACL (Access Control List) system
- **File Upload**: Custom ObjectUploader component for secure file handling
- **Access Control**: Object-level permissions with group-based access control

## External Dependencies

### Third-Party Services
- **Database**: Neon PostgreSQL serverless database
- **Authentication**: Replit OIDC provider for user authentication
- **AI Services**: OpenAI API for AI Coach functionality using GPT-5 model
- **File Storage**: Google Cloud Storage for document and media storage
- **Session Storage**: PostgreSQL-based session persistence

### Key Libraries & Frameworks
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Radix UI, TanStack Query, Wouter
- **Backend**: Express, Drizzle ORM, Passport.js for OIDC, connect-pg-simple for sessions
- **Validation**: Zod for runtime type validation across frontend and backend
- **Development Tools**: TypeScript compiler, ESBuild for production builds, PostCSS for CSS processing

### Infrastructure Considerations
- **Deployment**: Production build process with ESBuild bundling for server-side code
- **Environment Variables**: Configuration for database URLs, API keys, session secrets, and service endpoints
- **Development Mode**: Vite development server with hot module replacement and error overlay
- **Security**: HTTPS enforcement, secure cookie configuration, environment-based configuration management