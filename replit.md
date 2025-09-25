# MD Genius AI Startup Launchpad Platform

## Overview

The MD Genius AI Startup Launchpad is a full-stack web application for managing an 8-week AI startup accelerator program. It streamlines talent acquisition, application management, cohort organization, curriculum delivery, project development, mentorship, investor engagement, and funding. The platform aims to professionalize the AI startup acceleration process with data-driven experiences for all stakeholders.

## User Preferences

- **Communication Style**: Simple, everyday language
- **Design Philosophy**: Dark-first UI with glassmorphism aesthetic, neon gradients, and responsive design
- **Data Integrity**: Authentic data over synthetic/mock content, production-ready stability
- **User Experience**: Role-based dashboards, intuitive workflows, and real-time updates

## System Architecture

### UI/UX Decisions
- **Design System**: Dark-first UI with glassmorphism, neon gradients, and responsive design.
- **Components**: Radix UI primitives with shadcn/ui.
- **Styling**: Tailwind CSS with custom themes.
- **User Experience**: Role-based dashboards, intuitive workflows, and real-time updates.

### Technical Implementations
- **Frontend**: React 18 (TypeScript, Vite), TanStack Query v5 for state, Wouter for routing, React Hook Form with Zod validation.
- **Backend**: Node.js (TypeScript, Express.js) REST API with Drizzle ORM for PostgreSQL.
- **Authentication**: Dual system (Replit OIDC + local email/password) with HTTP-only cookies and bcrypt hashing.
- **Authorization**: Role-Based Access Control (RBAC) with six roles: `public_visitor`, `applicant`, `participant`, `mentor`, `investor`, `administrator`.
- **AI Integration**: OpenAI GPT-5 for an AI Coach service with 5 specialized modes and contextual guidance.
- **File Storage**: Google Cloud Storage for scalable asset management.

### Feature Specifications
- **User Management**: Dual authentication, secure password management, comprehensive profiles, role-based access.
- **Application Management**: Multi-step forms, status tracking, admin review, automated workflows.
- **Program Management**: Cohort creation, calendar integration, track organization, participant assignment.
- **Curriculum Management**: Complete administrative curriculum system with module/lesson/quiz CRUD operations, cohort-based template management, and real-time content updates.
- **Roadmap System**: Template-based (57 structured items), auto-completion, project assignment, admin management.
- **AI Coach**: GPT-5 powered guidance (Process, Ideation, Technical, Go-to-Market, Pitch modes).
- **Project Management**: 5-stage lifecycle, team management, artifact storage, readiness scoring.
- **Mentor Management**: Detailed profiles (expertise, industry), advanced session booking (7-day windows, morning/afternoon slots), session lifecycle.
- **Investor Management**: Comprehensive organization profiles, investment focus, advanced session scheduling (timezone-aware, duration options).
- **Communication**: Message threading, multi-channel notifications, announcements.
- **Analytics**: Rubric-based scoring, performance metrics, AI-driven readiness scoring.
- **Funding**: Grant/stipend/prize management, milestone-based disbursement.

### System Design Choices
- **Database**: PostgreSQL with Neon serverless deployment, Drizzle Kit for migrations.
- **API Design**: RESTful with proper status codes, error handling, and comprehensive middleware.
- **Performance**: TanStack Query caching, lazy loading, optimized builds.
- **Accessibility**: ARIA-compliant and WCAG-compliant components.

## Recent Changes (December 2025)

### Curriculum Management System Implementation
- **Complete Admin Interface**: Implemented comprehensive curriculum management in the admin panel with dedicated Curriculum tab
- **Three-Tier Content Structure**: Modules → Lessons → Quizzes with proper relational linking and cohort assignment
- **CRUD Operations**: Full create, read, update, delete functionality for all curriculum components
- **Route Contract Optimization**: Fixed frontend/backend API communication using proper query string parameters (`/api/admin/modules?cohortId=...`, `/api/admin/lessons?moduleId=...`)
- **Advanced Cache Management**: Implemented predicate-based cache invalidation with forced refetch for immediate UI updates
- **Real-Time UI Updates**: Content appears instantly in the interface after creation/modification operations
- **Form Integration**: React Hook Form with Zod validation, controlled Select components, and comprehensive error handling
- **Cohort-Centric Design**: All modules are required to be linked to cohorts, preventing orphaned educational content

### Technical Improvements
- **Database Integrity**: Schema constraints ensure all modules are properly linked to cohorts with foreign key relationships
- **API Design**: RESTful endpoints with proper query parameter handling and comprehensive error responses
- **Frontend Architecture**: TanStack Query v5 with custom queryFn for URL building and sophisticated cache invalidation patterns
- **Testing Coverage**: End-to-end validation with Playwright testing confirming complete CRUD functionality

### System Validation
- **Data Integrity Confirmed**: All existing modules and lessons are properly linked to cohorts through database constraints
- **Production Ready**: Comprehensive testing validates the curriculum management system is stable and ready for administrator use
- **Performance Optimized**: Efficient cache management ensures responsive UI and minimal API calls

### Comprehensive Frontend Fixes (December 2025)
- **Edit Module Dialog Fix**: Resolved critical runtime bug by implementing complete form field structure (title, description, week, orderIndex, cohort selection) with proper validation and data population via useEffect patterns
- **Rich Media Enhancement**: Implemented sophisticated resource management with dynamic type detection for videos, PDFs, external links, and file uploads including visual type indicators and badges
- **Form Reset Reliability**: Fixed form reset patterns across all create/edit dialogs to prevent stale values and ensure proper data population when editing existing content
- **Lessons Overview Enhancement**: Replaced placeholder content with functional allCohortLessons query providing comprehensive lesson display grouped by module with real-time updates
- **Cache Consistency Fixes**: Resolved critical cache invalidation gaps - all module mutations (create, update, delete, duplicate) now properly invalidate both modules AND cohort-lessons queries with forced refetch for immediate UI updates
- **Runtime Stability**: Fixed missing icon imports (X, ExternalLink) preventing component crashes and ensuring smooth user experience
- **Query Key Optimization**: Standardized query key formats using object notation for consistent cache management and reliable data fetching

### Architectural Excellence Achievement
- **Frontend System Confirmation**: Architect review confirmed the curriculum management frontend as "architecturally excellent" and production-ready
- **Comprehensive CRUD Operations**: All create, read, update, delete, and duplicate operations work seamlessly with real-time UI updates
- **Professional User Experience**: Enhanced forms with proper validation, loading states, success messaging, and comprehensive error handling
- **Data Synchronization**: Perfect synchronization between all tabs and views ensuring administrators see changes instantly across the interface

## External Dependencies

- **Database**: Neon PostgreSQL serverless database
- **Authentication**: Replit OIDC provider
- **AI Services**: OpenAI API (GPT-5 model)
- **File Storage**: Google Cloud Storage
- **Email Services**: Integrated email delivery
- **Frontend Frameworks**: React 18, TypeScript, Vite, Tailwind CSS, Radix UI, TanStack Query v5, Wouter
- **Backend Frameworks**: Express.js, Drizzle ORM, Passport.js, bcrypt, connect-pg-simple
- **Validation**: Zod