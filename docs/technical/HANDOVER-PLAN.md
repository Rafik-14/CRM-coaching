# Production & handover plan

> **Goal:** the project is finished and production-ready, and is handed over as a GitHub repository. The supervisor
> clones it, checks it, and deploys it on SwissWAI's servers **without needing anything else from us**.
> Status at the start of this plan (Oct. 2026): site + CRM complete (Phase 1, Phase 2, events), tests and CI in
> place, demo on Vercel. What is missing is listed below.

---

## 1. Content still to come (Jérémy) — blocks the launch, not the handover kit

| # | Item | Where it goes |
|---|---|---|
| C1 | Remaining V2 texts (other pages: Méthode, Accompagnements, Pour qui ?, Transformations, À propos…) | Site pages |
| C2 | Legal information: name / business name, address, contact e-mail and phone; CGV points « à compléter » (cancellation, applicable law) | Mentions légales, Confidentialité, CGV |
| C3 | Real availability for the « échange stratégique » | CRM › Paramètres › Réservation (he can do it himself) |
| C4 | Missing photos (Particuliers, Entrepreneurs), exact book video and Amazon links, OK for people shown in photos | Site |
| C5 | Professional e-mail address (CRM login + notifications). Not created yet: Jérémy's business status is being set up. Recommended: a mailbox at a mail provider on his OVH domain (e.g. Infomaniak), not self-hosted on SwissWAI's server; until then his personal address is used | Production env (SMTP, `MAIL_FROM`) + Mon compte |
| C6 | Decisions: desktop menu (« Plus ▾ » or two-line header); events visible at launch or hidden until the first one | Site |

The host's details (hosting company, address) for the Mentions légales come from SwissWAI.

## 2. Deployment kit in the repository — can start now

| # | Deliverable | Detail |
|---|---|---|
| D1 | `Dockerfile` | Multi-stage, Next.js `standalone` output, non-root user, health check |
| D2 | `docker-compose.prod.yml` | `app` + `postgres:16` + named volumes (database, uploaded files) + `cron` sidecar that calls `/api/cron/run` every 5 minutes. HTTPS stays with SwissWAI's reverse proxy (nginx / Caddy / Traefik), example config included |
| D3 | Start-up | Migrations applied automatically when the app container starts; one-off command to create the coach account on a real install (`SEED_DEMO_DATA=false`) |
| D4 | `.env.production.example` | Every variable explained (database, auth secret, public URL, SMTP, sender, cron secret, files folder, coach account), with how to generate the secrets |
| D5 | `GET /api/health` | App + database check, for the proxy / monitoring |
| D6 | Backups | Script for a daily `pg_dump` + uploaded files archive, with retention, and the restore procedure |
| D7 | `docs/DEPLOY.md` | Step by step for the supervisor: prerequisites, first install, DNS (incl. SPF / DKIM / DMARC for e-mail), HTTPS, first login, updates (`git pull` + rebuild), rollback, logs, backups / restore |
| D8 | Local check of the kit | `docker compose` profile with **Mailpit** (fake mail server) so the whole thing, e-mails included, can be tried on any machine before touching the server |

### Security items to build into the kit (from the security review, Oct. 2026)

| # | Item | Why |
|---|---|---|
| S1 | **Backups encrypted** (D6): daily `pg_dump` + uploaded files, encrypted before they leave the server, kept off the server, restore tested | Coaching notes are confidential; a stolen backup must be unreadable |
| S2 | **Real visitor IP behind the proxy**: the rate limits (`src/server/rate-limit.ts`) must read the header the reverse proxy sets (e.g. `X-Real-IP` overwritten by nginx), not a header the visitor can fake | Otherwise login and form limits can be dodged |
| S3 | **Error alerting**: app and container logs kept, and an alert (e-mail) when `/api/health` fails or errors spike | The error pages exist; nobody is told yet when they show |
| S4 | **Secret scan** of the whole Git history (gitleaks) before the handover (= R4) | No password or key may ship with the repository |
| S5 | **Database and files on an encrypted disk** if SwissWAI's server offers it; database only reachable inside the Docker network | Defence in depth for client data |
| S6 | **Vercel-only pieces removed**: the demo will be shut down (decided Oct. 2026), so SwissWAI's server is the only target (= R5) | One environment to secure |

Already done outside the kit: login attempts limited (5 per account, 10 per connection every 15 min),
Content-Security-Policy, error pages (site, CRM, global), weekly Dependabot update PRs.

## 3. Repository clean-up for the handover

| # | Item |
|---|---|
| R1 | README rewritten for a newcomer: what it is, architecture, local setup, tests, deployment (→ DEPLOY.md), environment variables, operations |
| R2 | `docs/technical/STACK.md` and `PHASE-2-PLAN.md` updated (billing removed, events added) ; short `docs/ARCHITECTURE.md` (modules, data model, scheduled jobs, private links, security choices) |
| R3 | Client-facing files (presentations, videos, PDFs for Jérémy) moved out of the code repository or into a clearly separated folder |
| R4 | Secret scan of the whole Git history (gitleaks) — no password, key or real client data in the repo |
| R5 | Vercel-only pieces documented as « demo only » (or removed if the demo is shut down) |
| R6 | `CHANGELOG.md` + Git tag `v1.0.0` on `main`, release notes listing features, known limits and what is pending from Jérémy |

## 4. Verification before handing over

| # | Check |
|---|---|
| V1 | Fresh clone on a clean machine → follow `DEPLOY.md` only → app up, migrations run, coach account created, login works |
| V2 | Booking, contact form, events registration, reminders (via the cron container) and e-mails seen in Mailpit |
| V3 | CI green on `main`: types, lint, unit tests, PostgreSQL concurrency tests, migrations, production build, end-to-end journeys, security audit |
| V4 | Real SMTP send — done by the supervisor with SwissWAI's mail account (checklist in DEPLOY.md), the only step we cannot run ourselves |

## 5. Handover

1. Supervisor invited to the GitHub repository (or repository transferred to SwissWAI's organisation).
2. Handover message: link to `docs/DEPLOY.md`, the `v1.0.0` release notes, the list of what is still pending from Jérémy (§1).
3. Supervisor reviews, deploys, and points the domain; we stay available for fixes.

## Order of work

1. **Now (no dependency):** D1–D8, R1–R6 except what needs Jérémy, V1–V3 with the demo content.
2. **When Jérémy's content arrives:** §1 → final content pass, legal pages complete, real coach e-mail.
3. **Tag `v1.0.0`, hand over (§5).** The supervisor does V4 and the deployment.
