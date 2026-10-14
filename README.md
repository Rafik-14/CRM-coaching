# CRM Coaching

Custom CRM for a life coach (SwissWAI client): contacts, pipeline, clients, sessions & notes, goals, tasks —
plus the coach's public website (Méthode JG®) with online booking, in the same app. Website plan: [`docs/WEBSITE-PLAN.md`](docs/WEBSITE-PLAN.md).
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

Log in with the coach account defined in your `.env` (`SEED_COACH_EMAIL` / `SEED_COACH_PASSWORD`, values you choose).

Which login is where:
- **Local (your machine):** `.env` → created by `npm run db:seed`.
- **Online demo (Vercel):** `.env.vercel-demo` (not committed). Its password is set from the Vercel variable
  `SEED_COACH_PASSWORD` at each deploy.
- `.env.example` only contains placeholders.

The seed creates Jérémy's reference data (`src/server/db/jg-defaults.ts`: pipeline stages, note templates,
the three JG® offers) and, unless `SEED_DEMO_DATA=false`, fake demo contacts. For the real installation run it
with `SEED_DEMO_DATA=false`. `SEED_RESET_DEMO=true` re-creates the demo data on an existing demo database.
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
    (site)/               public website: /, /methode, /accompagnements, /pour-qui, /transformations,
                          /a-propos, /le-chant-du-merle, /contact, /reserver (online booking), /faq, legal pages
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
  components/site/        website building blocks (header, footer, sections, forms, booking widget)
  proxy.ts                optimistic redirect to /connexion on CRM paths only (the website is public)
```

## Security rules

- Every query and server action calls `requireCoach()` (or `requireUser()`) first. The proxy is only an optimistic redirect, not the real check.
- Every input is validated with Zod on the server.
- Public sign-up is disabled: accounts are created by the coach / seed script.

## Public website

- Pages live in `src/app/(site)/`; texts come from the client's « Site web JG instructions », design from the « Brief maître ».
- Offers and prices (`/accompagnements`, FAQ) and consented case studies (`/transformations`) are read from the CRM
  through cached queries (`src/server/queries/site.ts`); CRM actions call `updateTag` so changes show at once.
- **Contact form** (`/contact`): server action → contact (found by e-mail or created in stage 1) + « Rappeler » task.
- **Online booking** (`/reserver`): availability set in **Paramètres → Réservation en ligne**; slots computed on the server
  in the coach's time zone, re-checked in a locked transaction. A booking creates/finds the contact, creates the
  « Échange stratégique » session, moves a prospect to stage 2 and adds a task. Confirmation page with a signed link + .ics.
- Every button passes `?source=…` (stored in the contact's source) and, where relevant, `?profil=…` (pre-selects the client type).
- SEO: metadata per page, `/sitemap.xml`, `/robots.txt`; the whole site is `noindex` on Vercel (demo) or with `SITE_NOINDEX=true`.
  Set `NEXT_PUBLIC_SITE_URL` to the public address in production.

## Website contact form → CRM (external site)

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
