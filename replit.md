# MD Genius AI Startup Launchpad Platform

## Overview

The MD Genius AI Startup Launchpad is a comprehensive full-stack web application designed to manage the complete lifecycle of an AI startup accelerator program. It supports talent acquisition, application management, cohort organization, curriculum delivery, project development, mentorship coordination, investor engagement, and funding disbursement. The platform aims to streamline and professionalize the AI startup acceleration process, providing authentic, data-driven experiences for all stakeholders.

## User Preferences

- **Communication Style**: Simple, everyday language
- **Design Philosophy**: Dark-first UI with glassmorphism aesthetic, neon gradients, and responsive design
- **Data Integrity**: Authentic data over synthetic/mock content, production-ready stability
- **User Experience**: Role-based dashboards, intuitive workflows, and real-time updates

## System Architecture

### UI/UX Decisions
The platform features a dark-first UI with a glassmorphism aesthetic, neon gradients, and responsive design. It utilizes Radix UI primitives with shadcn/ui design system and Tailwind CSS for styling, ensuring ARIA-compliant and accessible components. Role-based dashboards provide intuitive workflows and real-time updates.

### Technical Implementations
- **Frontend**: React 18 with TypeScript and Vite, using TanStack Query v5 for server state, Wouter for routing, and React Hook Form with Zod for form validation.
- **Backend**: Node.js with TypeScript and Express.js REST API, employing Drizzle ORM with PostgreSQL for type-safe database interactions and Express sessions for management.
- **Authentication & Authorization**: A dual authentication system integrates Replit OIDC and local email/password. It uses HTTP-only cookies for sessions, bcrypt for password security, and Role-Based Access Control (RBAC) with six defined roles (`public_visitor`, `applicant`, `participant`, `mentor`, `investor`, `administrator`).
- **Database Design**: PostgreSQL (Neon serverless) with Drizzle Kit migrations defines a comprehensive relational schema (25+ tables) covering user management, application workflow, cohorts, curriculum, projects, mentorship, investor relations, roadmaps, communications, and AI interactions.
- **AI Integration**: OpenAI GPT-5 powers an AI Coach service with five specialized coaching modes (Process Guide, Ideation, Technical, Go-to-Market, Pitch Coach), offering contextual guidance, persistent chat history, and source attribution.
- **File Storage**: Google Cloud Storage handles scalable file management for documents, images, and videos.

### Feature Specifications
- **User Management**: Dual authentication, secure password management, comprehensive user profiles, and role-based access.
- **Application Management**: Multi-step forms, status tracking, admin review interface, and automated workflows.
- **Cohort & Program Management**: Tools for cohort creation, calendar integration, track organization, and participant assignment.
- **Curriculum & Learning**: 8-week structured modules, progress tracking, quiz system, and resource library.
- **Advanced Roadmap System**: Template-based 8-week AI startup accelerator roadmaps (57 structured items), auto-completion logic, and project assignment.
- **Project Management**: Five-stage lifecycle, team management, artifact storage, and readiness scoring.
- **Mentor Management**: Detailed mentor profiles, multi-expertise categorization (12 areas, 12 industries), advanced session booking with 7-day availability, and session management.
- **Investor Management**: Comprehensive investor profiles, investment focus tracking, advanced session scheduling with timezone-aware calculations, and cohort assignment tracking.
- **Communication & Collaboration**: Message threading, multi-channel notification system, and announcements.
- **Analytics & Assessment**: Rubric-based scoring, performance metrics, and audit trails.
- **Funding & Disbursement**: Management of grants, stipends, and prizes tied to milestone-based disbursement.

## External Dependencies

### Third-Party Services
- **Database**: Neon PostgreSQL (serverless)
- **Authentication**: Replit OIDC
- **AI Services**: OpenAI API (GPT-5 model)
- **File Storage**: Google Cloud Storage
- **Email Services**: Integrated email delivery

### Key Libraries & Frameworks
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Radix UI, TanStack Query v5, Wouter
- **Backend**: Express.js, Drizzle ORM, Passport.js, bcrypt, connect-pg-simple
- **Validation**: Zod