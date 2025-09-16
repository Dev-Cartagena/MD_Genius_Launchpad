# MD Genius AI Startup Launchpad Platform

## Overview

The MD Genius AI Startup Launchpad is a comprehensive web application designed to manage the entire lifecycle of an AI startup accelerator program. The platform serves multiple stakeholders including applicants, participants, mentors, investors, and administrators through an 8-week intensive program focused on AI startup development. The system facilitates talent acquisition, application review, cohort management, curriculum delivery, project development, mentorship coordination, investor engagement, and funding disbursement.

The application follows a full-stack architecture with React frontend, Express backend, PostgreSQL database via Drizzle ORM, and integrates AI coaching capabilities through OpenAI's GPT model. The platform emphasizes security, accessibility, and multi-language support (English/Spanish).

## Current Implementation Status

**Production-Ready Features (Completed):**
- ✅ Authentication & Authorization with Replit OIDC integration
- ✅ Role-based access control (6 user roles: public_visitor, applicant, participant, mentor, investor, administrator)
- ✅ Complete application submission and review workflow
- ✅ Comprehensive admin panel with real-time metrics and application management
- ✅ Application status management with role transitions (applicant → participant)
- ✅ Cohort creation and management system
- ✅ AI Coach with 5 specialized modes (Process Guide, Ideation, Technical, Go-to-Market, Pitch Coach)
- ✅ Complete curriculum framework with 8-week AI accelerator content (27 lessons, modules, milestones)
- ✅ Professional curriculum delivery system with production-ready lesson content formatting, visual hierarchy, and structured learning experience
- ✅ Basic project creation and management
- ✅ Mentor and investor directory with search and filtering
- ✅ Object storage integration for file uploads
- ✅ Real-time dashboard metrics calculated from API data

**Partially Implemented Features:**
- 🔄 Messaging system (database schema exists, UI implementation needed)
- 🔄 Deliverable submission workflow (backend ready, frontend UI needed)
- 🔄 Notification system (database schema exists, no UI implementation)

**Planned Features (Not Yet Implemented):**
- ❌ Real-time communication and forums
- ❌ Advanced mentorship matching and scheduling
- ❌ Demo Day platform and pitch presentation system
- ❌ Investment workflow and due diligence management
- ❌ Funding disbursement system
- ❌ Comprehensive evaluation and scoring system

## Recent Changes

**September 2025:**
- **Admin Application Review System**: Implemented complete end-to-end application review workflow with status updates, filtering, and real-time metrics
- **TypeScript Fixes**: Resolved all LSP errors in admin panel with proper type definitions for API responses
- **Authentication Fix**: Resolved critical OIDC role mapping issue ensuring proper administrator access
- **Real Data Integration**: Replaced all mock data with actual API calculations throughout admin dashboard
- **Cohort Management**: Added cohort creation functionality with full schema validation and admin controls
- **API Endpoints**: Completed all missing admin endpoints (/api/admin/applications, /api/admin/users, /api/admin/projects, /api/cohorts) with proper authorization
- **Security Enhancement**: Implemented comprehensive role-based access control for all admin operations
- **Curriculum Content Population**: Created comprehensive 8-week AI startup accelerator curriculum with 27 lessons, 8 modules, and 4 milestones covering complete startup journey
- **Advanced Curriculum Features**: Implemented administrator cohort selection, read-only mode for admins, enhanced empty states, and rich lesson content display with secure markdown parsing
- **Security Fixes**: Resolved critical XSS vulnerability in lesson content rendering and improved state management for administrative users
- **UI/UX Enhancements**: Transformed plain text curriculum into rich, interactive card-based layouts with proper typography and visual hierarchy
- **Professional Lesson Content System**: Completed production-ready transformation of lesson content display from basic markdown to sophisticated structured format with line-based parser, universal list rendering, inline markdown formatting, and professional visual design

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

## Feature Implementation Details

### Fully Operational Systems

**Application Management System:**
- Multi-step application form with progress tracking and validation
- Admin review interface with status updates (draft → submitted → under_review → accepted/rejected)
- Automatic role transitions (public_visitor → applicant → participant)
- Real-time application metrics and analytics dashboard
- Advanced filtering and search capabilities for administrators
- Application scoring and reviewer notes system

**Admin Dashboard:**
- Live metrics: total applications, acceptance rates, active cohorts, project counts
- Complete user management with role visualization and bulk operations
- Application review workflow with status updates and detailed notes
- Cohort creation and management interface with date validation
- Project monitoring and evaluation tools
- Real-time data integration (no mock/placeholder data)

**Authentication & Authorization:**
- Replit OIDC integration with automatic user creation and role assignment
- Comprehensive role-based route protection and API endpoint security
- Session management with PostgreSQL store and automatic cleanup
- Token refresh handling and secure logout with session termination
- Role-based sidebar navigation and conditional feature access

**AI Coach System:**
- 5 specialized modes: Process Guide, Ideation, Technical, Go-to-Market, Pitch Coach
- Persistent conversation history and context management across sessions
- Integration with user roles and localization support (English/Spanish)
- OpenAI GPT-5 powered responses with domain-specific knowledge base
- Conversation export and search capabilities

### Partially Implemented Systems

**Curriculum Management:**
- Complete database schema for modules, lessons, quizzes, and progress tracking
- Production-ready lesson content system with sophisticated line-based parser and structured formatting
- Professional visual hierarchy with organized sections (Overview, Learning Objectives, Content) using distinct icons and styling
- Comprehensive inline markdown support for bold, italic, and links across all content types
- Universal list rendering with proper HTML semantics for both bullet and numbered lists
- Administrator cohort selection with seamless switching between different cohorts
- Read-only mode for administrators to view curriculum without affecting participant progress
- User progress tracking system with completion metrics and visual indicators
- Enhanced empty states with proper loading guards and user-friendly messaging
- 8-week AI startup accelerator curriculum with 27 comprehensive lessons
- Complete module structure covering AI fundamentals through Demo Day preparation
- Professional, engaging learning experience suitable for AI accelerator program
- Missing: Interactive learning elements, quiz assessment system, and functional media buttons

**Project Management:**
- Basic project creation and editing functionality with validation
- Project overview interface with AI Coach integration
- Database schema for deliverables, milestones, and team management
- Missing: Complete deliverable submission workflow, milestone tracking, and team collaboration features

**Communication Framework:**
- Database schema for messages, threads, and notifications
- API endpoints for message operations and thread management
- Missing: Real-time chat interface, notification system UI, and email integration

**Mentorship System:**
- Mentor directory with search, filtering, and profile management
- Basic mentor-participant connection framework
- Missing: Formal mentorship matching, session scheduling, and feedback system

### Development Workflow

**Database Management:**
- Drizzle ORM with TypeScript for complete type safety
- Schema migrations via `npm run db:push` (use `--force` for schema conflicts)
- Comprehensive relational model with proper foreign key constraints
- Automated backup and rollback capabilities through Replit

**API Architecture:**
- RESTful endpoints with Express.js and proper HTTP status codes
- Zod validation for all request/response schemas
- Role-based authorization middleware for protected routes
- Comprehensive error handling with user-friendly messages
- Request logging and performance monitoring

**Frontend Architecture:**
- React 18 with TypeScript and strict type checking
- TanStack Query for server state management and intelligent caching
- Wouter for lightweight client-side routing with lazy loading
- shadcn/ui component system with Radix UI primitives
- Responsive design with dark mode support and accessibility features

**Testing & Quality Assurance:**
- Comprehensive end-to-end testing with Playwright
- Type safety validation across frontend and backend
- Real-time error monitoring and debugging tools
- Performance optimization with code splitting and lazy loading