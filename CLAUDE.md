# MD Genius Launchpad — Project Instructions

## Accounts for this project

Always use these accounts for this project and no others.

| Service  | User         | Email              | Org / Team                                          |
|----------|--------------|--------------------|-----------------------------------------------------|
| GitHub   | cto-mdgenius | cto@mdgeniusai.com | Dev-Cartagena (https://github.com/orgs/Dev-Cartagena/) |
| Supabase | cto-mdgenius | cto@mdgeniusai.com | organization: mdgeniusai (id giejqzkjevrkvwzdhgto)  |
| Vercel   | cto-mdgenius | cto@mdgeniusai.com | team: mdgeniusai                                    |

This machine also has other accounts logged in, including other GitHub accounts,
another Supabase org and a personal Vercel account. Never create, push, deploy or
change resources under those accounts from this project.

## Check before starting work

Run these at the start of every session. Stop and ask the user if any check fails.

```bash
# GitHub: the active account must be cto-mdgenius
gh auth status
gh auth switch -u cto-mdgenius      # if another account is active

# Git identity for this repo (set locally in .git/config)
git config user.name                # expect: cto-mdgenius
git config user.email               # expect: cto@mdgeniusai.com
git remote -v                       # expect: a repo under github.com/Dev-Cartagena

# Vercel: must be cto-mdgenius, and every command scoped to the mdgeniusai team
vercel whoami                       # expect: cto-mdgenius
vercel teams ls                     # mdgeniusai must be listed
# Pass --scope mdgeniusai on vercel commands (deploy, env, link)

# Supabase: the projects listed must belong to the mdgeniusai org
supabase projects list
supabase orgs list                  # mdgeniusai must be listed
```

## Project resources

- GitHub repo: https://github.com/Dev-Cartagena/MD_Genius_Launchpad (public). Pushes to main deploy to production on Vercel; other branches get preview deployments.
- Supabase project: `md-genius-launchpad`, ref `klpwffswfhfwvsuqosct`, us-east-1, org mdgeniusai
- Vercel project: `md-genius-launchpad`, team mdgeniusai. Production: https://launchpad.mdgeniusai.com
  (CNAME `launchpad` in GoDaddy DNS for mdgeniusai.com; md-genius-launchpad.vercel.app redirects to it)
- Supabase Storage: `uploads` (private, signed URLs) and `lesson-media` (public, lesson videos and posters).
- Email: Resend, sending from the verified mdgeniusai.com domain (`RESEND_API_KEY` in Vercel production).
- Curriculum: `content/curriculum/` with importer `scripts/curriculum/import.ts`. Production cohort
  "Launchpad Cohort 1" (Jan 11 to Mar 7, 2027, 25 seats) has it imported.
- Lesson videos: HyperFrames projects in `~/Documents/MD_Genius_Launchpad_Videos/` (outside the repo).
  fal.ai is used through `FAL_KEY` in the local `.env` (video production only, never deployed).
  Do not spend on video generation without the user's approval: the budget for lessons
  1.2 to 8.3 is pending. Spanish narration needs a pronunciation list (IA, YC…) before TTS; see
  `w01-l1-es/REVIEW.md`.
- Production credentials live in Vercel env vars and in the gitignored `.env.supabase`.
  Never put production credentials in `.env` (local dev must not touch production data).

## Local development

See README.md. Short version:

```bash
npm run db:up && npm run db:migrate && npm run dev:local   # http://localhost:5055
npm run check && npm test                                  # before every commit
```

- Port 5000 is taken by macOS AirPlay Receiver, so local dev uses 5055.
- Schema changes: edit shared/schema.ts, `npm run db:generate -- --name x`, commit the migration.
  New tables must enable row level security in the same migration (Supabase Data API).
- Server relative imports need `.js` extensions (Vercel runs them as native ESM).
- UI text: add every string to `client/src/i18n/locales/en/<area>.json` AND `es/<area>.json`
  (Spanish per `docs/i18n/spanish-style-guide.md`: neutral Latin American, tú, no "!").
  New server messages need a Spanish entry in `server/i18n/messages-es.ts`. New
  translatable content fields go in `server/translations.ts` and render with `useLocalized()`.
  `npm test` fails on missing Spanish, hard-coded screen text or untranslated server messages.
- UI design: use the brand tokens and `client/src/components/brand` components
  (see README "Design system"); no off-palette colors, glows or decorative gradients.
- Login is email/password only. Promote a local admin with:
  `docker compose exec -T db psql -U postgres -d launchpad -c "update users set role='administrator' where email='you@example.com'"`

## Rules

- Never write tokens, passwords or API keys into this file or any committed file.
  Keep them in `.env` / `.env.local`, which must stay gitignored.
- Deploy target: Vercel (team mdgeniusai). Database and file storage: Supabase (org mdgeniusai).
