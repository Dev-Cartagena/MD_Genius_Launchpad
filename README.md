# MD Genius AI Startup Launchpad

Web platform for the MD Genius 8-week AI startup accelerator: applications, cohorts,
curriculum, project roadmaps, mentor and investor sessions, and an AI Coach.

## Stack

| Layer | Technology |
|---|---|
| Client | React 18, TypeScript, Vite, TanStack Query, Wouter, shadcn/ui, Tailwind |
| API | Express on Node 22, Drizzle ORM, express-session (sessions stored in Postgres) |
| Database | Postgres: Supabase in production, Docker locally |
| Files | Supabase Storage, private bucket `uploads`, signed URLs |
| Email | Resend (optional; links are logged without a key) |
| AI Coach | OpenAI (optional; the coach answers "not configured" without a key) |
| Hosting | Vercel: static client plus one serverless function for `/api/*` |

## Layout

```
api/index.ts          Vercel function entry (wraps the Express app)
server/app.ts         Express app factory: middleware, auth, routes, errors
server/index.ts       Local/self-hosted server (API + client on one port)
server/routes.ts      REST API
server/storage.ts     Database queries
server/auth.ts        Sessions, login state, isAuthenticated
server/fileStorage.ts Supabase Storage uploads and downloads
server/email.ts       Resend emails (password reset, invites)
server/rateLimit.ts   Postgres-backed rate limiting for auth endpoints
shared/schema.ts      Drizzle schema, Zod validation schemas, shared types
migrations/           SQL migrations (drizzle-kit)
tests/                API tests (vitest + supertest, real Postgres)
docs/                 Product requirements and project history
```

## Roles

`public_visitor` → `applicant` (after submitting an application) → `participant` (after
acceptance). `mentor`, `investor` and `administrator` are assigned by an admin.

## Local development

Requires Node 22 and Docker.

```bash
cp .env.example .env        # first time only; set SESSION_SECRET
npm install
npm run db:up               # Postgres 16 on localhost:5487
npm run db:migrate          # apply migrations
npm run dev:local           # http://localhost:5055
```

Register an account in the app, then make it an administrator:

```bash
docker compose exec -T db psql -U postgres -d launchpad \
  -c "update users set role='administrator' where email='you@example.com'"
```

Uploads, emails and the AI Coach need the optional keys in `.env.example`.

## Tests and checks

```bash
npm run check   # TypeScript
npm test        # API tests against the launchpad_test database (created automatically)
npm run build   # client + self-hosted server bundle
```

CI (`.github/workflows/ci.yml`) runs all three on every pull request.

## Database changes

1. Edit `shared/schema.ts`.
2. `npm run db:generate -- --name short_description` creates a SQL migration in `migrations/`.
3. `npm run db:migrate` applies it locally. Commit the migration with the schema change.
4. Apply it to production before deploying code that needs it:
   `DATABASE_URL="<session pooler URL>?sslmode=no-verify" npm run db:migrate`

Every table in `public` must have row level security enabled, because Supabase exposes
that schema through its public Data API. Migration `0001_lock_down_public_api` enables
it for existing tables and revokes the API roles' default privileges for new ones, and a
test fails if any table is missing RLS. New tables created by later migrations need
`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in the same migration.

## Deployment

Production: https://md-genius-launchpad.vercel.app

Vercel project `md-genius-launchpad` (team `mdgeniusai`) builds the client with
`npm run build:client` and deploys `api/index.ts` as the API function. Production
environment variables are set in Vercel; see `.env.example` for the full list.

- Supabase project: `md-genius-launchpad` (ref `klpwffswfhfwvsuqosct`, us-east-1).
- Runtime uses the transaction pooler (port 6543) with `DATABASE_SSL=require` and
  `DB_POOL_MAX=3`. Migrations use the session pooler (port 5432).
- Server-relative imports use `.js` extensions; Vercel runs the compiled files as native
  ES modules, which need them.
