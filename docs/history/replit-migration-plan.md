 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Migration Plan: Replit → VS Code + Supabase + Vercel

 Project Overview

 MD Genius AI Startup Launchpad - A comprehensive 8-week AI startup accelerator platform with:
 - 25+ database tables (PostgreSQL via Neon)
 - 50+ REST API endpoints (Express.js)
 - React 18 SPA with TypeScript
 - 6 user roles (public_visitor, applicant, participant, mentor, investor, administrator)
 - External integrations: OpenAI GPT-4o-mini, Google Cloud Storage
 - Authentication: Dual system (Replit OIDC + local email/password)

 Current State Analysis

 Implementation Status (From implementation.md)

 Functional Features:
 - ✅ Authentication & User Management (Dual: OIDC + local)
 - ✅ Database Schema (28+ tables defined with Drizzle ORM)
 - ⚠️ Cohort Management (Admin UI functional, basic CRUD working)
 - ⚠️ Curriculum Management (Admin UI in progress)
 - ⚠️ Roadmap System (Schema complete, UI in progress)
 - ⚠️ Mentor Management (In active development - backend + admin viewing)
 - ⚠️ Investor Management (Admin UI components created)

 Planned (Schema Only):
 - 📋 Project Management (Schema complete, UI pending)
 - 📋 AI Coach Integration (Schema defined, integration pending)
 - 📋 Application Management (Schema complete, UI pending)
 - 📋 Communication System (Schema defined)
 - 📋 Funding Management (Schema defined)

 Migration Compatibility Assessment

 ✅ Already Compatible (No Changes Needed):
 1. Database: Neon PostgreSQL is cloud-based and works from anywhere
 2. Core API: Express.js is platform-agnostic
 3. Local Authentication: Email/password auth works independently
 4. Frontend Framework: React + Vite builds work on any platform
 5. Schema & Types: Drizzle ORM with TypeScript (platform-agnostic)

 ⚠️ Requires Migration/Changes:
 1. Replit OIDC Authentication - Platform-specific, needs replacement or removal
 2. Google Cloud Storage via Replit Sidecar - Uses Replit credential endpoint at http://127.0.0.1:1106
 3. Replit-specific Vite plugins - Development tools (@replit/vite-plugin-*)
 4. Environment variables - Need local .env configuration
 5. Deployment configuration - From Replit Autoscale to Vercel Serverless
 6. OpenAI Integration - Currently unused (schema exists but no implementation found)

 ---
 Migration Strategy

 Phase 1: Local Development Environment Setup

 Goal: Get the application running locally in VS Code

 1.1 Remove Replit Dependencies

 Files to modify:
 - /package.json - Remove Replit dev dependencies
 - /vite.config.ts - Remove Replit plugins
 - /client/index.html - Remove Replit dev banner script
 - /.replit - Archive or delete (Replit-specific)

 1.2 Environment Configuration

 Create new file: /.env
 # Database (keep existing Neon)
 DATABASE_URL=<existing_neon_connection_string>

 # Sessions
 SESSION_SECRET=<generate_new_secure_random_string>

 # AI
 OPENAI_API_KEY=<existing_key>

 # Storage (to be updated later)
 SUPABASE_URL=
 SUPABASE_ANON_KEY=
 SUPABASE_SERVICE_ROLE_KEY=
 STORAGE_BUCKET_NAME=

 # Server
 PORT=5000
 NODE_ENV=development

 1.3 Update npm Scripts

 File: /package.json
 "scripts": {
   "dev": "NODE_ENV=development tsx watch server/index.ts",
   "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm
 --outdir=dist",
   "start": "NODE_ENV=production node dist/index.js",
   "check": "tsc",
   "db:push": "drizzle-kit push",
   "db:studio": "drizzle-kit studio"
 }

 ---
 Phase 2: Database Migration (Neon → Supabase)

 Goal: Move from Neon PostgreSQL to Supabase PostgreSQL

 2.1 Setup Supabase Project

 - Create new Supabase project
 - Copy connection string

 2.2 Schema Migration

 Files to review:
 - /shared/schema.ts - Database schema (Drizzle ORM)
 - Existing schema has 25+ tables with enums, indexes, relations

 Migration approach:
 1. Use Drizzle Kit to generate SQL migration from schema
 2. Run migration on Supabase database
 3. Verify all tables, enums, and indexes created

 Command:
 npm run db:push

 2.3 Data Migration (if needed)

 - Export data from Neon (pg_dump)
 - Import to Supabase (pg_restore)
 - Verify data integrity

 2.4 Update Database Connection

 File: /server/db.ts
 - Replace Neon-specific configuration
 - Update to standard PostgreSQL connection
 - Remove WebSocket configuration if not needed

 ---
 Phase 3: Authentication Migration

 Goal: Remove Replit OIDC dependency

 Option A: Use Local Auth Only (Simplest)

 Files to modify:
 - /server/replitAuth.ts - Disable OIDC routes
 - /server/routes.ts - Remove OIDC endpoints
 - /client/src/pages/Auth.tsx - Remove OIDC login button

 Impact: Users can only login with email/password

 Option B: Replace with Supabase Auth (Recommended)

 Benefits:
 - Social login (Google, GitHub, etc.)
 - Email verification
 - Password reset
 - Row Level Security (RLS) integration

 Files to modify:
 - /server/replitAuth.ts - Replace with Supabase Auth SDK
 - /server/routes.ts - Update auth endpoints
 - /client/src/hooks/useAuth.ts - Update to use Supabase client

 Option C: Use Third-Party OIDC Provider

 Options: Auth0, Clerk, FusionAuth
 Files to modify: Same as Option B

 DECISION NEEDED FROM USER

 ---
 Phase 4: File Storage Migration

 Goal: Replace Google Cloud Storage (via Replit sidecar) with Supabase Storage

 4.1 Create Supabase Storage Bucket

 - Public bucket for public assets
 - Private bucket for user uploads

 4.2 Update Storage Service

 File: /server/objectStorage.ts
 Current implementation:
 - Google Cloud Storage with Replit credential endpoint
 - ACL-based permissions
 - Signed URL generation

 New implementation:
 - Supabase Storage SDK (@supabase/storage-js)
 - Storage policies (equivalent to ACL)
 - Signed URL generation

 Key changes:
 // Replace Google Cloud Storage client
 import { createClient } from '@supabase/supabase-js';

 const supabase = createClient(
   process.env.SUPABASE_URL!,
   process.env.SUPABASE_SERVICE_ROLE_KEY!
 );

 // Update upload/download methods

 4.3 Update API Endpoints

 File: /server/routes.ts
 - /api/objects/upload - Generate Supabase signed upload URL
 - /objects/:objectPath(*) - Stream from Supabase Storage

 4.4 Update Frontend Upload Component

 File: /client/src/components/ObjectUploader.tsx
 - Update upload URL generation
 - Maintain existing UI/UX

 ---
 Phase 5: Vercel Deployment Configuration

 Goal: Deploy to Vercel with serverless functions

 5.1 Create Vercel Configuration

 New file: /vercel.json
 {
   "version": 2,
   "builds": [
     {
       "src": "dist/index.js",
       "use": "@vercel/node"
     },
     {
       "src": "dist/public/**",
       "use": "@vercel/static"
     }
   ],
   "routes": [
     {
       "src": "/api/(.*)",
       "dest": "dist/index.js"
     },
     {
       "src": "/(.*)",
       "dest": "dist/public/$1"
     }
   ],
   "env": {
     "NODE_ENV": "production"
   }
 }

 5.2 Update Build Process

 - Frontend: Vite builds to dist/public
 - Backend: esbuild bundles to dist/index.js
 - Both already configured correctly

 5.3 Session Storage for Serverless

 Challenge: Serverless functions are stateless
 Current: PostgreSQL session storage (connect-pg-simple)
 Solution: Keep PostgreSQL session storage (already compatible)

 5.4 Environment Variables

 Set in Vercel dashboard:
 - DATABASE_URL
 - SESSION_SECRET
 - OPENAI_API_KEY
 - SUPABASE_URL
 - SUPABASE_ANON_KEY
 - SUPABASE_SERVICE_ROLE_KEY
 - STORAGE_BUCKET_NAME

 ---
 Phase 6: Testing & Validation

 6.1 Local Development Testing

 - Application starts without errors
 - Database connection works
 - Authentication (local) works
 - File upload/download works
 - All API endpoints functional
 - Frontend routes work correctly

 6.2 Vercel Deployment Testing

 - Build completes successfully
 - Application accessible via Vercel URL
 - API routes respond correctly
 - Database operations work
 - File storage works
 - Authentication sessions persist

 6.3 Feature Testing

 - User registration/login
 - Application submission
 - Curriculum access
 - Roadmap tracking
 - Project management
 - Mentor/investor functionality
 - Admin panel operations
 - AI coach interaction

 ---
 Critical Files to Modify

 Configuration Files

 1. /package.json - Remove Replit dependencies
 2. /vite.config.ts - Remove Replit plugins
 3. /.env (new) - Environment variables
 4. /vercel.json (new) - Vercel deployment config

 Backend Files

 5. /server/db.ts - Database connection
 6. /server/replitAuth.ts - Authentication system
 7. /server/objectStorage.ts - File storage service
 8. /server/routes.ts - Auth routes cleanup

 Frontend Files

 9. /client/index.html - Remove Replit scripts
 10. /client/src/hooks/useAuth.ts - Auth hook (if using Supabase Auth)
 11. /client/src/pages/Auth.tsx - Login UI (if changing auth)
 12. /client/src/components/ObjectUploader.tsx - File upload (if needed)

 ---
 Migration Complexity Assessment

 | Component                   | Complexity | Estimated Effort | Risk Level |
 |-----------------------------|------------|------------------|------------|
 | Local Dev Setup             | Low        | 1 hour           | Low        |
 | Database Migration          | Low        | 2 hours          | Low        |
 | Auth Migration (Local Only) | Low        | 2 hours          | Low        |
 | Auth Migration (Supabase)   | Medium     | 4 hours          | Medium     |
 | Storage Migration           | Medium     | 4 hours          | Medium     |
 | Vercel Deployment           | Low        | 2 hours          | Low        |
 | Testing                     | Medium     | 4 hours          | Medium     |
 | TOTAL (Local Auth)          | -          | 15 hours         | -          |
 | TOTAL (Supabase Auth)       | -          | 19 hours         | -          |

 ---
 Recommended Approach

 Phased Migration (Lowest Risk)

 Week 1: Local Development
 1. Setup VS Code environment
 2. Remove Replit dependencies
 3. Keep Neon database initially
 4. Disable OIDC, use local auth only
 5. Mock file storage or use temporary solution
 6. Validate core functionality works locally

 Week 2: Backend Services
 7. Migrate to Supabase database
 8. Implement Supabase Storage
 9. Test all API endpoints
 10. Validate data integrity

 Week 3: Authentication Enhancement
 11. Implement Supabase Auth (if desired)
 12. Update frontend auth flows
 13. Test all user roles

 Week 4: Deployment
 14. Configure Vercel
 15. Deploy to staging
 16. Full feature testing
 17. Production deployment

 ---
 User Requirements (Confirmed)

 1. Authentication: Local email/password + Supabase Auth (social logins: Google, GitHub)
 2. Database: Migrate from Neon to Supabase PostgreSQL immediately
 3. Data: Has important created content - need assessment and selective migration
 4. Priority:
   - Phase 1: Core auth running locally
   - Phase 2: Admin features (cohorts, curriculum)
   - Phase 3: All in-progress features
 5. Timeline: ASAP (target: 5-7 days total)

 ---
 Implementation Timeline

 Total Estimated Time: 5-7 days

 - Day 1 (4-6 hours): Local Development Setup
 - Day 2 (6-8 hours): Database Migration to Supabase
 - Day 3 (6-8 hours): Supabase Auth Integration
 - Day 4 (4-6 hours): Supabase Storage Migration
 - Day 5 (4-6 hours): Vercel Deployment
 - Day 6 (2-4 hours): Testing & Cleanup

 ---
 PHASE 1: Local Development Setup (Day 1, ~4-6 hours)

 Objective: Get the application running locally in VS Code without Replit dependencies

 1.1 Environment Setup

 Files to Create:
 - /.env.local (from current Neon DATABASE_URL)
 - Update /.gitignore

 Required Environment Variables:
 # Database (keep Neon temporarily)
 DATABASE_URL=<current_neon_connection_string>

 # Session
 SESSION_SECRET=<generate_random_32_char_string>
 NODE_ENV=development
 PORT=5000

 # Super Admin
 SUPER_ADMIN_EMAILS=<your_admin_email>

 # Temporarily commented out
 # REPLIT_DOMAINS=
 # REPL_ID=
 # ISSUER_URL=

 Commands:
 cd /Users/felmco/Documents/MD_Genius_Launchpad
 node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

 1.2 Remove Replit Dependencies

 Files to Modify:
 1. /package.json - Remove devDependencies:
   - @replit/vite-plugin-cartographer
   - @replit/vite-plugin-runtime-error-modal
 2. /vite.config.ts - Remove:
   - Import of runtimeErrorOverlay
   - Conditional Replit plugin loading
   - Keep React plugin and all path aliases
 3. /server/replitAuth.ts - Make OIDC optional:
   - Wrap OIDC check in warning instead of error
   - Conditionally load OIDC routes only if REPLIT_DOMAINS exists
   - Provide stub /api/logout for local dev
 4. /server/objectStorage.ts - Create mock storage:
   - Add USE_MOCK_STORAGE environment check
   - Return mock URLs when storage not configured
   - Log warnings about disabled uploads

 Commands:
 npm uninstall @replit/vite-plugin-cartographer @replit/vite-plugin-runtime-error-modal
 npm install
 npm run dev

 Validation:
 - Server starts on port 5000
 - Can access http://localhost:5000
 - Register new account works
 - Login works
 - Session persists

 Rollback: Revert changes, restore Replit packages, add back Replit env vars

 ---
 PHASE 2: Database Migration to Supabase (Day 2, ~6-8 hours)

 Objective: Migrate from Neon PostgreSQL to Supabase with data preservation

 2.1 Data Assessment

 SQL Queries to Run on Neon:
 -- Overall data summary
 SELECT 'users' as table_name, COUNT(*) FROM users
 UNION ALL SELECT 'cohorts', COUNT(*) FROM cohorts
 UNION ALL SELECT 'modules', COUNT(*) FROM modules
 UNION ALL SELECT 'lessons', COUNT(*) FROM lessons
 UNION ALL SELECT 'roadmap_templates', COUNT(*) FROM roadmap_templates
 UNION ALL SELECT 'roadmap_items', COUNT(*) FROM roadmap_items
 UNION ALL SELECT 'mentor_profiles', COUNT(*) FROM mentor_profiles
 UNION ALL SELECT 'applications', COUNT(*) FROM applications
 UNION ALL SELECT 'projects', COUNT(*) FROM projects;

 -- User role distribution
 SELECT role, COUNT(*) FROM users GROUP BY role;

 -- Check for important content
 SELECT c.name, COUNT(m.id) as modules, COUNT(l.id) as lessons
 FROM cohorts c
 LEFT JOIN modules m ON c.id = m.cohort_id
 LEFT JOIN lessons l ON m.id = l.module_id
 GROUP BY c.id, c.name;

 Migration Decision Matrix:
 - ✅ MIGRATE: users, cohorts, modules, lessons, quizzes, roadmap_templates, roadmap_items, mentor_profiles
 - ⚠️ CONDITIONAL: applications, projects, user_progress (migrate if > 10 records)
 - ❌ SKIP: sessions (temporary data)

 2.2 Supabase Project Setup

 Actions:
 1. Create Supabase project at https://supab
 2. Project name: "MD Genius Launchpad"
 3. Generate strong database password
 4. Choose region closest to users
 5. Copy connection strings (Direct + Pooled)

 Connection Strings:
 Direct: postgres://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
 Pooled: postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres

 2.3 Schema Migration

 Files to Modify:
 - /.env.local - Add Supabase URL
 - /server/db.ts - Switch from Neon to pg driver

 db.ts changes:
 import { Pool } from 'pg';
 import { drizzle } from 'drizzle-orm/node-postgres';
 import * as schema from "@shared/schema";

 export const pool = new Pool({
   connectionString: process.env.DATABASE_URL,
   max: 10,
   ssl: process.env.NODE_ENV === 'production'
     ? { rejectUnauthorized: false }
     : false
 });

 export const db = drizzle(pool, { schema });

 Commands:
 npm install pg
 npm install --save-dev @types/pg
 npm uninstall @neondatabase/serverless ws

 # Update .env.local with Supabase URL
 # Then push schema
 npm run db:push

 # Verify
 psql "$SUPABASE_DB_URL" -c "\dt"

 2.4 Data Migration

 Export from Neon:
 pg_dump "$NEON_DB_URL" \
   --data-only \
   --table=users \
   --table=cohorts \
   --table=modules \
   --table=lessons \
   --table=quizzes \
   --table=roadmap_templates \
   --table=roadmap_items \
   --table=mentor_profiles \
   > neon_data_export.sql

 Import to Supabase:
 psql "$SUPABASE_DB_URL" < neon_data_export.sql

 # Verify
 psql "$SUPABASE_DB_URL" -c "SELECT COUNT(*) FROM users;"
 psql "$SUPABASE_DB_URL" -c "SELECT COUNT(*) FROM modules;"

 2.5 Test Application with Supabase

 Update .env.local:
 DATABASE_URL=<supabase_pooled_connection_string>

 Restart and test:
 npm run dev

 # Test:
 # - Login with existing account
 # - View cohorts
 # - Access modules
 # - Check mentor profiles

 Rollback: Change DATABASE_URL back to Neon, restart

 ---
 PHASE 3: Supabase Auth Integration (Day 3, ~6-8 hours)

 Objective: Add Supabase Auth with social login (keep local auth as fallback)

 3.1 Supabase Auth Setup

 In Supabase Dashboard:
 1. Enable Providers: Authentication > Providers
   - Email (already enabled)
   - Google OAuth (get credentials from Google Cloud Console)
   - GitHub OAuth (get credentials from GitHub Settings)
 2. Configure URLs: Authentication > URL Configuration
   - Site URL: http://localhost:5000
   - Redirect URLs: http://localhost:5000/**

 3.2 Install Supabase Client

 Commands:
 npm install @supabase/supabase-js

 Files to Create:
 - /server/supabaseAuth.ts - Server-side Supabase Auth
 - /client/src/lib/supabase.ts - Client-side Supabase client

 Update .env.local:
 SUPABASE_URL=https://[PROJECT-REF].supabase.co
 SUPABASE_ANON_KEY=<from_supabase_settings>
 SUPABASE_SERVICE_ROLE_KEY=<from_supabase_settings>

 VITE_SUPABASE_URL=https://[PROJECT-REF].supabase.co
 VITE_SUPABASE_ANON_KEY=<from_supabase_settings>

 3.3 Migrate Existing Users to Supabase Auth

 Create Script: /scripts/migrate-users-to-supabase.ts

 Strategy:
 - Create Supabase Auth users for all local users
 - Generate random passwords
 - Send password reset emails
 - Users will set new passwords on first login

 Run migration:
 npx tsx scripts/migrate-users-to-supabase.ts

 3.4 Update Authentication Middleware

 Files to Modify:
 - /server/routes.ts - Add Supabase Auth middleware
 - /server/supabaseAuth.ts - Implement auth sync

 Keep both local and Supabase auth during transition

 Test:
 - Email/password login
 - Google OAuth login
 - GitHub OAuth login
 - Session persistence

 ---
 PHASE 4: Supabase Storage Migration (Day 4, ~4-6 hours)

 Objective: Replace Google Cloud Storage with Supabase Storage

 4.1 Create Storage Buckets

 In Supabase Dashboard:
 1. Create bucket: "private-uploads" (Private)
 2. Create bucket: "public-assets" (Public)

 Set up RLS policies:
 -- Users can upload to their own folder
 CREATE POLICY "User folder upload" ON storage.objects
 FOR INSERT TO authenticated
 WITH CHECK (
   bucket_id = 'private-uploads' AND
   auth.uid()::text = (storage.foldername(name))[1]
 );

 -- Public assets readable
 CREATE POLICY "Public assets" ON storage.objects
 FOR SELECT TO public
 USING ( bucket_id = 'public-assets' );

 4.2 Replace Object Storage Implementation

 File to Rewrite: /server/objectStorage.ts

 New implementation:
 - Use Supabase Storage SDK
 - Generate signed upload URLs
 - Stream downloads via Supabase
 - Update ACL logic for Supabase policies

 Update routes in /server/routes.ts:
 - /api/upload/url - Generate Supabase upload URL
 - /api/objects/* - Download from Supabase

 4.3 Test File Operations

 Test:
 - Upload file
 - Download file
 - Check file permissions
 - Verify storage in Supabase Dashboard

 ---
 PHASE 5: Vercel Deployment (Day 5, ~4-6 hours)

 Objective: Deploy to Vercel with serverless functions

 5.1 Create Vercel Configuration

 Files to Create:
 - /vercel.json - Deployment config
 - /api/index.ts - Serverless function wrapper

 Update package.json:
 {
   "scripts": {
     "vercel-build": "vite build"
   }
 }

 5.2 Configure Vercel

 Actions:
 1. Create Vercel project
 2. Link to Git repository
 3. Add environment variables (all from .env.local)
 4. Configure build settings

 5.3 Deploy

 Commands:
 npm install -g vercel
 vercel login
 vercel         # Preview
 vercel --prod  # Production

 5.4 Update Supabase URLs

 In Supabase Dashboard:
 - Add production URL to allowed redirects
 - Update OAuth callback URLs

 Test production deployment:
 - Full auth flow
 - All CRUD operations
 - File uploads
 - Admin features

 ---
 PHASE 6: Testing & Cleanup (Day 6, ~2-4 hours)

 6.1 Comprehensive Testing

 Test all features:
 - ✅ User registration/login
 - ✅ Social auth (Google, GitHub)
 - ✅ Cohort management
 - ✅ Curriculum access
 - ✅ Mentor profiles
 - ✅ Roadmap display
 - ✅ File uploads
 - ✅ Admin dashboard

 6.2 Cleanup

 Remove:
 - Old Replit dependencies
 - Unused authentication code
 - Neon-specific code

 Archive:
 - .replit file (for reference)
 - server/replitAuth.ts (backup)

 6.3 Documentation

 Create files:
 - MIGRATION.md - Migration summary
 - README.md - Updated setup instructions
 - .env.example - Template for environment variables

 ---
 Critical Files Summary

 Top 5 files to modify:
 1. /server/db.ts - Database connection (Neon → Supabase)
 2. /server/replitAuth.ts - Authentication (make OIDC optional, add Supabase)
 3. /server/objectStorage.ts - File storage (GCS → Supabase Storage)
 4. /vite.config.ts - Build config (remove Replit plugins)
 5. /server/routes.ts - API routes (integrate new auth/storage)

 ---
 Rollback Strategies

 Phase 1: Restore Replit packages, revert code changes
 Phase 2: Switch DATABASE_URL back to Neon
 Phase 3: Disable Supabase Auth, use local only
 Phase 4: Revert to mock storage
 Phase 5: Use Vercel rollback in dashboard

 ---
 Cost Estimate

 - Supabase Free Tier: $0/month (500MB DB, 1GB storage, unlimited auth)
 - Vercel Hobby: $0/month (100GB bandwidth, unlimited functions)
 - Total: $0/month (scales to ~$45/month if needed)

 ---
 Success Criteria

 ✅ Application runs locally without Replit dependencies
 ✅ All data migrated from Neon to Supabase
 ✅ Authentication works (email + social login)
 ✅ File uploads/downloads functional
 ✅ Deployed to Vercel successfully
 ✅ All existing features work in production
 ✅ Zero data loss during migration