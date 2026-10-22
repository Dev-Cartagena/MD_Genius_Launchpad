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

## Local development

```bash
cp .env.example .env        # first time only, then set SESSION_SECRET
npm install
npm run db:up               # Postgres 16 in Docker on localhost:5487
npm run db:push             # create or update tables from shared/schema.ts
npm run dev:local           # app + API on http://localhost:5055
npm run db:down             # stop the database (data is kept in a Docker volume)
```

- Port 5000 is taken by macOS AirPlay Receiver, so local dev uses 5055.
- Replit login does not work locally. Register with email and password, then promote the account:
  `docker compose exec -T db psql -U postgres -d launchpad -c "update users set role='administrator' where email='you@example.com'"`
- `server/db.ts` uses node-postgres for any non-Neon URL (local, Supabase). Set `DB_DRIVER=neon|pg` to override.
- AI Coach and file uploads need real OpenAI keys and storage, so they fail locally with placeholders.

## Rules

- Never write tokens, passwords or API keys into this file or any committed file.
  Keep them in `.env` / `.env.local`, which must stay gitignored.
- Deploy target: Vercel (team mdgeniusai). Database and file storage: Supabase (org mdgeniusai).
