# CRM Coaching

Custom CRM for a life coach (SwissWAI client): contacts, pipeline, clients, sessions & notes, goals, tasks.
Full plan and architecture: [`docs/STACK.md`](docs/STACK.md).

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind v4 + shadcn/ui · PostgreSQL + Drizzle ORM · Better Auth

## Getting started

Requirements: Node.js 24+. No Docker or local PostgreSQL needed for development: an embedded
Postgres ([PGlite](https://pglite.dev)) runs as a small local server on port `54320`.

```bash
npm install
cp .env.example .env        # then set BETTER_AUTH_SECRET to a long random string
npm run db:reset            # creates the local DB, runs migrations, loads French demo data
npm run dev                 # starts the DB server + the app on http://localhost:3100
```

Log in with the demo coach account defined in `.env` (`SEED_COACH_EMAIL` / `SEED_COACH_PASSWORD`).
All demo data is fake — never put real client data on a development machine.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Local DB server + Next.js dev server (port 3100) |
| `npm run db:server` | Local DB server only |
| `npm run db:generate` | Generate a SQL migration after editing `src/server/db/schema.ts` |
| `npm run db:migrate` | Apply migrations (needs the DB server running) |
| `npm run db:seed` | Load demo data (needs the DB server running) |
| `npm run db:reset` | Wipe the local DB, migrate and seed (stop `npm run dev` first) |
| `npm run db:studio` | Browse the database in Drizzle Studio |
| `npm run typecheck` / `npm run lint` | Checks |

## Project layout

```
src/
  app/
    connexion/            login page
    (coach)/              coach area (sidebar layout)
      tableau-de-bord/    dashboard
      contacts/           list, search, add/edit, detail page
      pipeline/           Kanban (drag & drop)
      taches/             tasks
      parametres/         pipeline stages, packages, note template
    api/auth/[...all]/    Better Auth endpoints
  server/
    db/                   schema, client, migrate, seed
    auth.ts               Better Auth config
    dal.ts                Data Access Layer: requireUser / requireCoach
    queries/              read functions (each starts with requireCoach)
    actions/              server actions (each starts with requireCoach + Zod validation)
  lib/validations/        Zod schemas shared by forms and server
  proxy.ts                optimistic redirect to /connexion without a session cookie
```

## Security rules

- Every query and server action calls `requireCoach()` (or `requireUser()`) first. The proxy is only an optimistic redirect, not the real check.
- Every input is validated with Zod on the server.
- Public sign-up is disabled: accounts are created by the coach / seed script.

## Website contact form → CRM

`POST /api/formulaire-site` creates a lead (stage "Nouveau", source "Site web") and a "Rappeler…" task;
an existing e-mail only gets a new task. Accepts JSON or a plain HTML form.

- `SITE_FORM_ORIGINS`: comma-separated origins of the coach's website (browser posts)
- `SITE_FORM_SECRET`: optional, for server-to-server forwarding (header `x-form-key`)
- `SITE_FORM_THANKS_URL`: optional redirect after a plain HTML form submit
- Anti-spam: hidden `website` field (honeypot) + 5 requests/minute per IP.
- The ready-to-paste HTML snippet is shown in **Paramètres → Général**.

## Documents

Private files are stored on disk in `FILES_DIR` (default `./.data/files`), never in `/public`.
They're only served by `GET /api/fichiers/[id]` after a coach session check. Uploads: 10 MB max,
PDF / images / Word / text, and the file content must match its extension.
On the server, put `FILES_DIR` on a persistent volume and include it in backups.

## Brand (JG®)

The UI follows Jérémy Galéa's visual brief (« Brief maître — design system JG® »). Plan and rules:
`docs/JG-TAILORING-PLAN.md`.

- Colours: `--jg-*` variables in `src/app/globals.css` (navy `#172536`, gold `#D4A866`, teal, ivory,
  anthracite, light grey). Other states are tints mixed from these; gold and teal are never body text.
- Fonts: Montserrat (headings, buttons) and Lato (text) via `next/font`. No third typeface.
- Logo: `public/brand/` (full logo, white version, monogram), favicon `src/app/icon.svg`,
  `apple-icon.png`, `favicon.ico`. Source trace kept in `docs/brand/logobleu-source.svg`; the clean
  files were re-traced from the client's PNG (one navy + one gold shape, exact brand colours).
- No 3D, gradients or generic illustrations (forbidden by the brief): empty states use
  `<EmptyState icon={…} />` / `<IconMark icon={…} />` from `src/components/empty-state.tsx`
  (thin lucide icon + short gold line).

## Notes on Next.js 16

- **Cache Components** is enabled: anything that reads the session, cookies, `params` or `searchParams` must be rendered inside `<Suspense>`. Pages follow the pattern *static header + `<Suspense>` around the data part*.
- `middleware.ts` is now `proxy.ts`.
- Bundled docs for this exact version: `node_modules/next/dist/docs/`.

## Production

PostgreSQL in Docker on SwissWAI's server: set `DATABASE_URL` to the real database, `DATABASE_POOL_MAX=10`,
a strong `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` to the public URL. See `docs/STACK.md` §10.
