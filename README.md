# Budget

Family budget tracker: calendar of expenses and income, recurring rules, balance projection and a forecast of when the money runs out.

Stack: Next.js 15 · React 19 · TypeScript · Tailwind v4 · Prisma + SQLite.

## Local development

```powershell
npm install
npm run db:push      # creates/updates prisma/dev.db from the schema (keeps existing data)
npm run dev          # http://localhost:3000
```

Environment variables live in `.env` (not committed). See `.env.example`:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite file. Local: `file:./dev.db` (relative to `prisma/`). |
| `EDIT_PASSWORD` | Password that unlocks edit mode. Checked server-side only. |
| `NEXT_PUBLIC_CURRENCY` | ISO currency code used for formatting (e.g. `USD`, `EUR`). |

If `npm` is blocked by PowerShell's execution policy, use `npm.cmd` / `npx.cmd`, or run once:
`Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`.

## Deploying to Railway

The database is a single SQLite file. On Railway the container filesystem is wiped on every deploy, so the file **must** live on a Volume.

1. Push this repo to GitHub and create a new Railway project from it.
2. In the service, open **Volumes** and add a volume with mount path `/data`.
3. In **Variables**, set:
   - `DATABASE_URL` = `file:/data/budget.db`
   - `EDIT_PASSWORD` = your password
   - `NEXT_PUBLIC_CURRENCY` = `USD` (or your currency)
4. Leave the build command as `npm run build` and the start command as `npm start`.
5. Generate a domain under **Settings → Networking**.

`npm start` runs `prisma migrate deploy` before `next start`, so the schema is created on the first boot and updated on later deploys.

## How your data survives updates

- **Code-only changes** (UI, logic, styles): the deploy replaces the app container but never touches the volume. The database file and all entries stay exactly as they were.
- **Schema changes** (new tables or columns): they ship as SQL migrations in `prisma/migrations/`. On start, `prisma migrate deploy` applies only the migrations that have not run yet, in order. Migrations are additive (add column, add table) and never drop data.
- Never run `prisma db push --force-reset` or `prisma migrate reset` against the production database; those are the only commands that wipe data.

Back up the database at any time by downloading `/data/budget.db` from the volume (Railway CLI: `railway volume` or a shell into the service).

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | `prisma generate` + `next build` |
| `npm start` | Apply pending migrations, then serve the production build |
| `npm run db:push` | Sync the local dev database to the schema (local only) |
| `npm run db:migrate` | Create a new migration from schema changes (local, dev DB) |
| `npm run db:studio` | Browse the database in Prisma Studio |
| `npm run lint` | ESLint |
