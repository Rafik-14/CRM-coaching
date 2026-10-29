# Life Coach CRM — Technical Stack & Project Plan

> **Project:** Custom CRM for a life coach (client of **SwissWAI**)
> **Status:** Phase 1 in progress: auth, dashboard, contacts, pipeline, tasks done (demo data)
> **Last updated:** 2026-10-09

---

## Table of contents

1. [Project context](#1-project-context)
2. [Goals & principles](#2-goals--principles)
3. [Architecture overview](#3-architecture-overview)
4. [Frontend stack](#4-frontend-stack)
5. [Backend stack](#5-backend-stack)
6. [Database design](#6-database-design)
7. [Security & privacy](#7-security--privacy)
8. [Project structure](#8-project-structure)
9. [Development environment](#9-development-environment)
10. [Deployment (SwissWAI server)](#10-deployment-swisswai-server)
11. [Domain & DNS (OVH)](#11-domain--dns-ovh)
12. [Backups & monitoring](#12-backups--monitoring)
13. [Roadmap & phases](#13-roadmap--phases)
14. [Costs](#14-costs)
15. [Open questions](#15-open-questions)
16. [Why this stack (decisions log)](#16-why-this-stack-decisions-log)

---

## 1. Project context

| Item | Detail |
|---|---|
| **End client** | A life coach (works alone, 1-on-1 coaching) |
| **Existing assets** | A simple presentation website + a domain name bought at **OVH** |
| **Need** | A CRM to manage prospects, clients, sessions, notes, tasks, and later booking, payments and a client portal |
| **Built by** | SwissWAI |
| **Hosting** | A VM on **SwissWAI's own server** (not OVH) |
| **Domain** | Stays at OVH; only DNS records point to SwissWAI's server |
| **Language** | Interface in **French** |

---

## 2. Goals & principles

- **Secure:** coaching data is highly personal (emotions, relationships, sometimes health), so it's treated as sensitive data.
- **No recurring license costs:** 100% open-source, self-hosted.
- **Simple to run:** few moving parts (2 containers in production).
- **Configurable, not hard-coded:** pipeline stages, packages, note templates and branding live in the database as settings, so the coach's specifics can be plugged in without code changes.
- **Build without real data:** development uses **fake demo data** only; no real personal data on developer machines.
- **Great UX:** clean, fast, mobile-friendly, in French.

---

## 3. Architecture overview

```
                    ┌──────────────────────────────┐
  Client's domain   │  OVH (registrar + DNS only)  │
  coachname.com ───▶│  A  crm.coachname.com → IP   │
                    └──────────────┬───────────────┘
                                   │ HTTPS
                                   ▼
┌──────────────────────── SwissWAI server ────────────────────────┐
│  VM (Ubuntu Server LTS)                                          │
│                                                                  │
│   ┌──────────────┐     ┌──────────────────────────────────────┐  │
│   │ Caddy /      │────▶│  app  (Next.js)                       │  │
│   │ Traefik      │     │  - UI (React, Tailwind, shadcn/ui)    │  │
│   │ (HTTPS, LE)  │     │  - Server Actions / Route Handlers    │  │
│   └──────────────┘     │  - Better Auth (sessions, roles)      │  │
│                        │  - Drizzle ORM                        │  │
│                        └───────────────┬──────────────────────┘  │
│                                        │                         │
│                        ┌───────────────▼──────┐  ┌────────────┐  │
│                        │  db  (PostgreSQL)    │  │ /data/files│  │
│                        └───────────────┬──────┘  │ (private)  │  │
│                                        │         └────────────┘  │
└────────────────────────────────────────┼─────────────────────────┘
                                         │ nightly pg_dump + files
                                         ▼
                              Off-site backup storage
```

**In one line:** Next.js + TypeScript + Tailwind + shadcn/ui, PostgreSQL + Drizzle, Better Auth, deployed with Docker on SwissWAI's server, domain at OVH.

---

## 4. Frontend stack

| Tool | Role | Why |
|---|---|---|
| **Next.js** (App Router) | App framework, pages + backend in one project | One codebase, server-side rendering, server actions |
| **TypeScript** | Language | Type safety end-to-end (DB → server → UI) |
| **Tailwind CSS** | Styling | Fast, consistent design |
| **shadcn/ui** | UI components (tables, forms, dialogs, tabs...) | Polished, accessible, code is owned by us |
| **Lucide** | Icons | Pairs with shadcn/ui |
| **dnd-kit** | Drag & drop | Pipeline Kanban board |
| **TanStack Table** | Data tables | Contacts list with search, sort, filters, pagination |
| **React Hook Form + Zod** | Forms + validation | Same Zod schemas reused on the server |
| **Recharts** | Charts | Dashboard (sessions, revenue, leads) |
| **next-intl** | Internationalization | French first, other languages possible later |
| **date-fns** | Dates | Formatting in French, time zones |
| **Sonner** | Toasts | Feedback ("Contact ajouté", errors) |

### Main screens (Phase 1)

| Screen | Content |
|---|---|
| **Connexion** | Login, password reset |
| **Tableau de bord** | Today's sessions, tasks due, new leads, active clients, small charts |
| **Contacts** | Searchable/filterable list, "Ajouter un contact" |
| **Pipeline** | Kanban: drag contacts between stages |
| **Fiche client** | Tabs: Aperçu · Séances & notes · Objectifs · Documents · Tâches |
| **Tâches** | All tasks, due dates, done/undone |
| **Paramètres** | Pipeline stages, packages, note template, branding (logo, colors) |

---

## 5. Backend stack

| Tool | Role | Why |
|---|---|---|
| **Next.js Server Actions** | Mutations from forms (create contact, add note...) | No separate API project needed |
| **Next.js Route Handlers** | REST endpoints (website form webhook, file downloads, future integrations) | For anything called from outside the app |
| **PostgreSQL** | Database | Reliable, free, standard |
| **Drizzle ORM** | Queries + migrations | Type-safe, lightweight, SQL-like, has Drizzle Studio |
| **Better Auth** | Authentication | Email/password, sessions, roles (`coach` / `client`), password reset, optional 2FA; data stored in our own Postgres |
| **Zod** | Server-side validation | Every input validated before touching the DB |
| **Nodemailer** + SMTP | Transactional emails | Password reset, reminders. SMTP from the client's OVH mailbox or Brevo free plan |
| **sharp** | Image processing | Compress/resize uploaded images |
| **Local private storage** | Client documents | Stored outside the public folder, served only after permission checks. Can move to **MinIO** (S3-compatible) later without changing the app logic |

### Server code conventions

- All data access goes through `src/server/` (never from client components).
- Every server action starts with an **access guard**:
  ```ts
  const user = await requireCoach();        // throws if not logged in as coach
  const input = createContactSchema.parse(formData); // Zod validation
  ```
- Errors are returned as typed results; they're never thrown raw to the UI.

---

## 6. Database design

### Tables (first version)

| Table | Main fields | Notes |
|---|---|---|
| `users` / `sessions` / `accounts` | Managed by **Better Auth** | Login data |
| `profiles` | `user_id`, `role` (`coach` \| `client`), `full_name`, `phone` | One per user |
| `pipeline_stages` | `id`, `name`, `position`, `color` | **Configurable.** Defaults: *Nouveau → Appel découverte → Proposition → Client → Terminé* |
| `contacts` | `id`, `first_name`, `last_name`, `email`, `phone`, `source`, `stage_id`, `tags[]`, `notes`, `created_at` | Every prospect and client starts as a contact |
| `clients` | `id`, `contact_id`, `user_id` (nullable, for portal), `start_date`, `status`, `main_goal` | Created when a contact becomes a client |
| `coaching_sessions` | `id`, `client_id`, `starts_at`, `duration_min`, `type`, `status` (`planned` \| `done` \| `cancelled` \| `no_show`), `location` / `meeting_url` | Named `coaching_sessions` to avoid confusion with auth sessions |
| `session_notes` | `id`, `session_id`, `content` (rich text), `template_data` (JSON), `next_steps`, `private` (bool) | **Coach-only** by default |
| `note_templates` | `id`, `name`, `fields` (JSON) | **Configurable.** Default: *Sujet · Prises de conscience · Actions · Prochaine étape* |
| `goals` | `id`, `client_id`, `title`, `description`, `progress` (0–100), `due_date`, `status` | |
| `tasks` | `id`, `title`, `due_at`, `done`, `contact_id` / `client_id` (nullable) | Coach's to-dos |
| `packages` | `id`, `name`, `sessions_count`, `price`, `currency`, `active` | **Configurable** (placeholders until we get real offers) |
| `client_packages` | `id`, `client_id`, `package_id`, `sessions_used`, `purchased_at`, `payment_status` | Tracks remaining sessions |
| `documents` | `id`, `client_id`, `file_name`, `storage_path`, `mime_type`, `size`, `uploaded_by` | Files on private storage |
| `activity_log` | `id`, `actor_id`, `entity`, `entity_id`, `action`, `created_at` | Who changed what and when (audit trail) |
| `settings` | `key`, `value` (JSON) | Branding, business name, defaults |

### Relationships (simplified)

```
pipeline_stages 1──* contacts 1──0..1 clients 1──* coaching_sessions 1──0..1 session_notes
                                         │
                                         ├──* goals
                                         ├──* documents
                                         ├──* client_packages *──1 packages
                                         └──* tasks
```

### Demo data (seed)

- ~30 fake contacts spread across pipeline stages (French names, generated with **@faker-js/faker** `fr` locale)
- ~10 clients with sessions, notes, goals and packages
- 1 coach account + 1 demo client account (test credentials stored in `.env.example` / seed file only)

---

## 7. Security & privacy

### Application security
- **Authorization guards** (`requireCoach()`, `requireClient()`) in one shared module, called at the top of every server action and route handler.
- **Ownership checks:** a client can only ever read their own records (`where client.user_id = currentUser.id`).
- **Session notes are private** to the coach by default.
- **Zod validation** on every input.
- **Passwords** hashed by Better Auth; optional **2FA** for the coach account.
- **Rate limiting** on login and public endpoints.
- **File uploads:** max 10 MB, allowed types only (PDF, images, Word); random file names; served through a permission-checked route, never as public static files.
- **Security headers:** CSP, HSTS, X-Frame-Options, Referrer-Policy (in `next.config`).
- **Secrets** only in environment variables, never committed.
- *Optional second layer:* PostgreSQL Row Level Security on sensitive tables.

### Server security (VM)
- Non-root user, **SSH keys only** (no password login).
- Firewall (`ufw`): only 22 (SSH), 80, 443 open.
- `fail2ban` against brute force.
- Automatic security updates (`unattended-upgrades`).
- Database **not exposed** to the internet (only reachable from the `app` container).

### Privacy / legal
- Data hosted on SwissWAI's server; **confirm the physical location** before telling the client.
  - If in Switzerland: covered by the Swiss nFADP, which the EU recognizes as adequate (GDPR-equivalent).
- SwissWAI acts as **data processor**, so a **DPA** (data processing agreement) with the client is recommended.
- Features for data rights: **export** a client's data, **delete** a client and all related data.
- Privacy policy on the site, updated to mention the CRM/client portal.
- **No real personal data** in development or screenshots.

---

## 8. Project structure

```
coach-crm/
├── docs/
│   └── STACK.md                # this file
├── drizzle/                    # generated SQL migrations
├── public/
├── src/
│   ├── app/
│   │   ├── (auth)/connexion/   # login, reset password
│   │   ├── (coach)/            # coach area (protected)
│   │   │   ├── tableau-de-bord/
│   │   │   ├── contacts/
│   │   │   ├── pipeline/
│   │   │   ├── clients/[id]/
│   │   │   ├── taches/
│   │   │   └── parametres/
│   │   ├── (client)/espace/    # client portal (Phase 3)
│   │   ├── api/
│   │   │   ├── auth/[...all]/  # Better Auth handler
│   │   │   ├── files/[id]/     # permission-checked downloads
│   │   │   └── webhooks/site-form/  # existing website → new lead
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   └── ...                 # feature components
│   ├── server/
│   │   ├── db/
│   │   │   ├── schema.ts       # Drizzle schema
│   │   │   ├── index.ts        # DB client
│   │   │   └── seed.ts         # French demo data
│   │   ├── auth.ts             # Better Auth config
│   │   ├── guards.ts           # requireCoach / requireClient
│   │   ├── actions/            # server actions per feature
│   │   └── email.ts
│   ├── lib/
│   │   ├── validations/        # Zod schemas (shared client/server)
│   │   └── utils.ts
│   └── messages/
│       └── fr.json             # French UI strings
├── docker-compose.yml          # local Postgres
├── docker-compose.prod.yml     # app + db for the server
├── Dockerfile
├── drizzle.config.ts
├── .env.example
└── package.json
```

---

## 9. Development environment

### Requirements
| Tool | Purpose |
|---|---|
| **Node.js** 24+ | Runtime |
| **npm** | Package manager |
| **PGlite server** (`@electric-sql/pglite-socket`, installed with the project) | Local PostgreSQL on port 54320. No Docker needed on developer machines |
| **Git + GitHub** | Version control |
| **VS Code** (or similar) | Editor |

> **Why PGlite instead of Docker for dev:** Docker isn't required on developer machines. PGlite is real Postgres (WASM) served over the normal Postgres protocol, so the app uses the **same driver (`postgres`) in dev and production**. It runs as **one separate process**: opening the database files directly from Next.js crashed because Next's dev renders open several instances. It handles one session at a time, so dev uses `DATABASE_POOL_MAX=1`.

### Dev tools
| Tool | Purpose |
|---|---|
| **Drizzle Studio** | Browse/edit the local database |
| **ESLint + Prettier** | Code quality and formatting |
| **Vitest** | Unit tests (permissions, package logic, validations) |
| **Playwright** *(later)* | End-to-end tests of key flows |
| **@faker-js/faker** | French demo data |

### Environment variables (`.env.example`)
```bash
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54320/postgres
DATABASE_POOL_MAX=1                 # 10+ with real PostgreSQL
BETTER_AUTH_SECRET=change-me
BETTER_AUTH_URL=http://localhost:3100
SEED_COACH_EMAIL=coach@demo.test    # demo account created by db:seed
SEED_COACH_PASSWORD=...
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM="CRM <no-reply@example.com>"
FILES_DIR=./data/files
```

### Typical commands
```bash
npm install
cp .env.example .env          # set BETTER_AUTH_SECRET
npm run db:reset              # local DB + migrations + French demo data
npm run dev                   # DB server + app on http://localhost:3100
npm run db:studio             # open Drizzle Studio
```

---

## 10. Deployment (SwissWAI server)

> ⚠️ The SwissWAI server setup is **not known yet**. Confirm the questions in [§15](#15-open-questions) before deploying.

### VM to request
| Resource | Recommendation |
|---|---|
| CPU | 2–4 vCPU |
| RAM | 8 GB |
| Disk | 60–100 GB SSD |
| OS | Ubuntu Server 24.04 LTS |
| Network | Static public IP with ports 80/443 reachable, **or** a Cloudflare Tunnel if the server is behind an office connection |

### Production containers (`docker-compose.prod.yml`)
| Service | Image | Notes |
|---|---|---|
| `app` | Built from `Dockerfile` (Next.js standalone output) | Port 3000, internal only |
| `db` | `postgres` (LTS major version) | Volume for data, **not exposed** publicly |
| *(proxy)* | Caddy or Traefik, or **SwissWAI's existing reverse proxy** | HTTPS via Let's Encrypt |

### Deployment options
1. **Coolify** (recommended if SwissWAI doesn't already have a tool): self-hosted panel that deploys from GitHub on every push, with automatic HTTPS, logs and env var management.
2. **SwissWAI's existing tooling** (Portainer, CI/CD...) if they have one. Reuse it rather than adding another tool.
3. **Manual:** `git pull && docker compose -f docker-compose.prod.yml up -d --build`.

### Environments
| Env | URL (example) | Purpose |
|---|---|---|
| Local | `localhost:3000` | Development with demo data |
| Staging | `staging-crm.coachname.com` | Test before release (demo data) |
| Production | `crm.coachname.com` | Real data |

### First deployment checklist
- [ ] VM created, SSH key access, non-root user
- [ ] Firewall, fail2ban, automatic updates
- [ ] Docker + Docker Compose (or Coolify) installed
- [ ] Production env vars set (strong secrets)
- [ ] DNS record added at OVH ([§11](#11-domain--dns-ovh))
- [ ] HTTPS certificate issued
- [ ] Migrations applied, coach account created
- [ ] Backups configured **and a restore tested**
- [ ] Monitoring and alerts active

---

## 11. Domain & DNS (OVH)

The client **keeps his domain at OVH**. Only a DNS record is added:

| Type | Name | Value |
|---|---|---|
| `A` | `crm` | SwissWAI server's public IP |
| *(optional)* `A` | `staging-crm` | Same IP |

**Rules**
- Use a **subdomain** (`crm.`), so the existing website isn't affected.
- **Do not modify `MX` records:** the client's email would stop working.
- **Never ask for the client's OVH password.** Either:
  1. the client adds the record himself (send him the exact values), or
  2. the client adds SwissWAI as a **technical contact** in his OVH account (delegated access).
- If a Cloudflare Tunnel is used, the DNS setup differs (CNAME to the tunnel). Decide this once the server setup is known.

---

## 12. Backups & monitoring

### Backups
| What | How | Frequency | Retention |
|---|---|---|---|
| Database | `pg_dump` (compressed) | Nightly | 7 daily + 4 weekly + 6 monthly |
| Uploaded files | `rsync` / `restic` | Nightly | Same |
| Location | **Off the server** (other site/provider, e.g., Backblaze B2, Scaleway, or SwissWAI's backup storage) | | |
| Encryption | `restic` or `gpg` before upload | | |
| **Restore test** | Restore to staging | **Monthly** | |

### Monitoring
| Tool | Purpose |
|---|---|
| **Uptime Kuma** | Alerts if the CRM is down (email / Telegram / Slack) |
| **Sentry** (free plan) | Application errors |
| Disk alert | Warn at 80% disk usage |
| Docker logs / Coolify logs | Debugging |

---

## 13. Roadmap & phases

### Phase 1 — **Organiser** (about 3–4 weeks)
Can be built **now, without client data**.

| Week | Work |
|---|---|
| 1 | Project setup, DB schema + migrations, Better Auth, layout & navigation, contacts list, demo seed |
| 2 | Pipeline Kanban, client file (overview, sessions, notes), goals |
| 3 | Tasks, dashboard, documents (private upload/download), settings page |
| 4 | Polish, tests, staging deployment, **demo to supervisor & client** |

**Deliverable:** working CRM demo with fake data.

### Phase 2 — **Automatiser** (about 2–3 weeks)
- Online booking: **Cal.com** (self-hosted or cloud) or a custom booking page
- Email reminders (24h / 1h before sessions)
- Packages & session counting, invoices
- Payments: **Stripe** or an alternative, depending on the client's country
- Intake questionnaire before the first session
- **Website form → CRM** (new lead created automatically via webhook)
- Dashboard with revenue and conversion stats

### Phase 3 — **Accompagner** (about 3–4 weeks)
- **Client portal** (`client` role): sessions, goals, homework, documents
- Homework/exercises assigned by the coach, answered by the client
- Optional **AI assistant** (Claude API):
  - Session summary drafts from the coach's notes
  - Follow-up email drafts
  - Website chatbot that answers prospects and books discovery calls
  - *(consent and data-handling rules required before enabling)*

### What's needed from the client (send a short questionnaire)
- How do you find clients? What are the steps from first contact to client?
- Which packages/sessions do you offer, and at what price?
- What do you write after a session? (note template)
- Do you have an existing client list (Excel/Google Sheets) to import?
- Logo, colors, business name
- Do you use an email address on your domain? (SMTP + don't touch MX)
- In which country is your business registered? (payments, legal)

---

## 14. Costs

| Item | Cost |
|---|---|
| All software (Next.js, Postgres, Drizzle, Better Auth, Coolify, Uptime Kuma...) | **Free / open source** |
| Hosting | **SwissWAI server: free** |
| Domain | Already owned by the client (OVH) |
| Storage | No per-GB fees, limited only by VM disk (a coach CRM typically stays under 5–10 GB for years) |
| Sentry | Free plan |
| *Optional later* | Transactional email at volume, Stripe fees per transaction, AI API usage, off-site backup storage (a few cents per GB) |

---

## 15. Open questions

### For SwissWAI (supervisor / IT)
- [ ] What runs the server (Proxmox, VMware, plain Docker)? Who creates the VM?
- [ ] Where is the server **physically** located (country/city)?
- [ ] Static public IP? Ports 80/443 reachable, or should we use a Cloudflare Tunnel?
- [ ] Is there an existing reverse proxy or deployment tool to reuse?
- [ ] UPS / power and internet redundancy?
- [ ] Existing backup system? Off-site?
- [ ] Security rules: VPN, SSH access policy, who else has access?
- [ ] Is there a DPA template with clients?
- [ ] Long term: does the client's data stay on SwissWAI's server, or should it be portable to his own account?

### For the client
- [ ] Where is the current website hosted, and who manages it?
- [ ] Email on his domain?
- [ ] Can he add a DNS record, or add SwissWAI as a technical contact at OVH?
- [ ] The questionnaire in [§13](#13-roadmap--phases)

---

## 16. Why this stack (decisions log)

| Decision | Chosen | Alternatives considered | Reason |
|---|---|---|---|
| Hosting | SwissWAI server (VM) | OVH VPS paid by client | Free, approved by supervisor, fits company tooling. Domain registrar doesn't affect hosting choice. |
| Backend | Own backend in Next.js | Supabase Cloud, self-hosted Supabase, separate NestJS/Laravel API | No usage limits or fees, only 2 containers, one codebase, full control |
| Database | PostgreSQL | MySQL, SQLite | Robust, standard, great tooling, optional RLS |
| ORM | Drizzle | Prisma | Lighter, SQL-like, fast, good migrations |
| Auth | Better Auth | Auth.js, Supabase Auth, Clerk | Self-hosted, data in our DB, roles + 2FA built in, no per-user fees |
| UI | Tailwind + shadcn/ui | MUI, Chakra | Modern look, owned components, fast to build |
| CRM approach | Custom | Paperbell, Practice, HubSpot, Notion | Tailored to the coach, in French, data under our control, no subscription |
| Storage | Local private disk (MinIO later) | Supabase Storage, S3 | Free, simple; S3-compatible upgrade path |
