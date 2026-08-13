# Development and deployment workflow

GitHub is the shared source of truth. Each computer works on its own CR branch;
production deploys only the latest `origin/main` commit.

## One-time setup on this computer

The protected production environment has been copied to `.env` and is ignored by
Git. Install and verify the project with:

```powershell
npm ci
npm run prisma:generate
npm run build
```

Start local development with:

```powershell
.\scripts\dev.cmd
```

This project intentionally uses the production PostgreSQL database for local
development. Do not run `npm run db:seed`, `prisma migrate reset`, destructive SQL,
or an unreviewed migration from a development branch. Runtime uploads made locally
are not automatically copied to production.

## Work on a CR

Always begin from the latest remote main and use a unique branch name:

```powershell
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c codex/cr-short-description
```

Build and lint before pushing. Push the CR branch, review it, then merge it into
`main` on GitHub. This prevents work on another computer from being overwritten.

```powershell
npm run lint
npm run build
git push -u origin codex/cr-short-description
```

## Deploy production

After the reviewed CR is merged into GitHub `main`:

```powershell
.\scripts\deploy-production.cmd
```

The deploy script fetches the exact current `origin/main`, refuses dirty or
non-fast-forward production state, takes a PostgreSQL custom-format backup, builds,
applies committed Prisma migrations, restarts PM2, and checks the app on port 3010.
Concurrent deployments are blocked with a server-side lock.

Useful read-only checks:

```powershell
ssh project-planning-prod "cd /app/myshop && git status --short --branch"
ssh project-planning-prod "pm2 status myshop"
ssh project-planning-prod "pm2 logs myshop --lines 100 --nostream"
```
