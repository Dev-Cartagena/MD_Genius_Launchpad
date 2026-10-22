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

- GitHub repo: https://github.com/Dev-Cartagena/MD_Genius_Launchpad (private)
- Supabase project: `md-genius-launchpad`, ref `klpwffswfhfwvsuqosct`, us-east-1, org mdgeniusai
- Vercel project: `md-genius-launchpad`, team mdgeniusai. Production: https://md-genius-launchpad.vercel.app
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
- Login is email/password only. Promote a local admin with:
  `docker compose exec -T db psql -U postgres -d launchpad -c "update users set role='administrator' where email='you@example.com'"`

## Rules

- Never write tokens, passwords or API keys into this file or any committed file.
  Keep them in `.env` / `.env.local`, which must stay gitignored.
- Deploy target: Vercel (team mdgeniusai). Database and file storage: Supabase (org mdgeniusai).
