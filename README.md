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

## Illustrations

3D characters from the Figma Community file "Free 3D Man Illustrations", converted from
~5 MB SVGs to ~25 KB WebP in `src/assets/illustrations/` and listed in
`src/components/illustrations/registry.ts`.

- `<Illustration3D name="waving" alt="" height={180} />`: tilt toward the mouse, parallax between
  the figure and its backdrop disc, gentle float. No motion on touch or with "reduce motion".
- `<EmptyState illustration="confused" title="…" description="…" action={…} />` for empty screens.
- To add one: export it from Figma (or rasterize the SVG with `sharp`) to a transparent WebP about
  640 px tall, put it in `src/assets/illustrations/`, and register it.
- Check the Figma file's license before commercial use.

## Notes on Next.js 16

- **Cache Components** is enabled: anything that reads the session, cookies, `params` or `searchParams` must be rendered inside `<Suspense>`. Pages follow the pattern *static header + `<Suspense>` around the data part*.
- `middleware.ts` is now `proxy.ts`.
- Bundled docs for this exact version: `node_modules/next/dist/docs/`.

## Production

PostgreSQL in Docker on SwissWAI's server: set `DATABASE_URL` to the real database, `DATABASE_POOL_MAX=10`,
a strong `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` to the public URL. See `docs/STACK.md` §10.
