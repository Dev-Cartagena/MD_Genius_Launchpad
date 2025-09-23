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
- **Curriculum**: 8-week modules, progress tracking, quizzes, resource library.
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

## External Dependencies

- **Database**: Neon PostgreSQL serverless database
- **Authentication**: Replit OIDC provider
- **AI Services**: OpenAI API (GPT-5 model)
- **File Storage**: Google Cloud Storage
- **Email Services**: Integrated email delivery
- **Frontend Frameworks**: React 18, TypeScript, Vite, Tailwind CSS, Radix UI, TanStack Query v5, Wouter
- **Backend Frameworks**: Express.js, Drizzle ORM, Passport.js, bcrypt, connect-pg-simple
- **Validation**: Zod