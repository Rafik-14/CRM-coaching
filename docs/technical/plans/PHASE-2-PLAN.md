# Phase 2 — « Automatiser » · Detailed implementation plan

> **Project:** CRM Coaching (Jérémie, life coach · SwissWAI client)
> **Prerequisite:** Phase 1 « Organiser » (done) — contacts, pipeline, sessions & notes, packages, goals, tasks, documents, calendar, settings, website form.
> **Goal of Phase 2:** remove the coach's repetitive admin: booking back-and-forth, reminders, invoices and payment follow-ups, standard e-mails.
> **Estimate:** 3 to 5 weeks (one developer), excluding waiting time for client decisions.
> **Last updated:** 2026-10-10

---

## Table of contents

1. [Scope](#1-scope)
2. [Decisions needed before starting](#2-decisions-needed-before-starting)
3. [Architecture additions](#3-architecture-additions)
4. [Data model changes](#4-data-model-changes)
5. [Feature 1 — E-mail foundation](#5-feature-1--e-mail-foundation)
6. [Feature 2 — Scheduled jobs](#6-feature-2--scheduled-jobs)
7. [Feature 3 — Session reminders](#7-feature-3--session-reminders)
8. [Feature 4 — Calendar feed (ICS)](#8-feature-4--calendar-feed-ics)
9. [Feature 5 — Online booking](#9-feature-5--online-booking)
10. [Feature 6 — E-mail templates & sequences](#10-feature-6--e-mail-templates--sequences)
11. [Feature 7 — Intake questionnaire](#11-feature-7--intake-questionnaire)
12. [Feature 8 — Invoices & payments](#12-feature-8--invoices--payments)
13. [Feature 9 — Dashboard & analytics additions](#13-feature-9--dashboard--analytics-additions)
14. [Optional — Two-way calendar sync](#14-optional--two-way-calendar-sync)
15. [Security & privacy](#15-security--privacy)
16. [Environment variables](#16-environment-variables)
17. [Testing strategy](#17-testing-strategy)
18. [Milestones & timeline](#18-milestones--timeline)
19. [Definition of done](#19-definition-of-done)
20. [Risks](#20-risks)

---

## 1. Scope

| # | Feature | In scope | Out of scope (later) |
|---|---|---|---|
| 1 | E-mail foundation | SMTP sending, layout, logging, DNS (SPF/DKIM/DMARC) | Marketing newsletters |
| 2 | Scheduled jobs | One cron entry point, idempotent jobs | Queue infrastructure (Redis, etc.) |
| 3 | Reminders | E-mail 24 h + 1 h before sessions, cancel/reschedule link | SMS / WhatsApp (optional add-on, §7.6) |
| 4 | Calendar feed | Private read-only ICS URL for Google / Outlook / iPhone | — |
| 5 | Online booking | Public booking page, availability rules, discovery calls for prospects, sessions for clients | Group sessions / workshops |
| 6 | Templates & sequences | Editable templates, event-based automatic e-mails | Visual e-mail editor |
| 7 | Intake questionnaire | Editable form, public token link, answers in client file | Conditional logic |
| 8 | Invoices & payments | PDF invoices, numbering, Stripe Checkout (card + TWINT), Swiss QR-bill, payment reminders | Accounting exports (bexio), subscriptions |
| 9 | Dashboard additions | Revenue forecast, unpaid amounts, no-show trend, booking sources | — |
| 10 | Handwritten notes scanner | Photos → straightened, cleaned pages → branded PDF in the client file (title, keywords, session) | Handwriting → typed text (OCR) |
| — | Two-way calendar sync | Optional stretch (§14) | — |

---

## 2. Decisions needed before starting

| Decision | Who | Impacts |
|---|---|---|
| Country where the business is registered (CH / FR) | Jérémie | VAT, invoice mentions, QR-bill, TWINT, currency |
| Sending address (e.g. `contact@domain`) + SMTP credentials | Jérémie | Feature 1 |
| Delegated access to OVH DNS (SPF/DKIM/DMARC records) | Jérémie | Deliverability |
| Availability, session durations, buffer, cancellation rule | Jérémie | Feature 5 |
| Pay before booking or after the session? | Jérémie | Features 5 & 8 |
| Stripe account (owner = Jérémie) | Jérémie | Feature 8 |
| Calendar used (Google / Outlook / iPhone) | Jérémie | Feature 4, §14 |
| SMS / WhatsApp reminders worth a monthly cost? | Jérémie | §7.6 |
| How cron runs on the SwissWAI server (system cron / Coolify scheduled task) | SwissWAI | Feature 2 |

Features 1–4 and 6–7 can start before the country/payment decisions; Feature 8 cannot.

---

## 3. Architecture additions

```
                ┌──────────────── Public (no login) ────────────────┐
 visitor ─────▶ │ /reserver            booking page                 │
 client  ─────▶ │ /rdv/[token]         manage / cancel a booking    │
 client  ─────▶ │ /questionnaire/[t]   intake form                  │
 client  ─────▶ │ /paiement/[token]    pay an invoice (→ Stripe)    │
 calendar ────▶ │ /api/agenda/[t].ics  read-only calendar feed      │
 Stripe  ─────▶ │ /api/webhooks/stripe payment events (signed)      │
 cron    ─────▶ │ /api/cron/run        scheduled jobs (secret)      │
                └───────────────────────────────────────────────────┘
                                   │
                         Next.js app (existing)
                                   │
           ┌───────────────┬───────┴────────┬──────────────────┐
       PostgreSQL       SMTP server      Stripe API      File storage
     (new tables)     (coach mailbox)   (Checkout)      (invoice PDFs)
```

**Principles**
- Everything stays inside the existing Next.js app (no new service to host).
- Public routes are added to the `proxy.ts` matcher exclusions and each does its own check (signed token, webhook signature or cron secret).
- **Tokens:** random 32-byte values stored hashed (SHA-256) in the database; links expire.
- **Time zone:** all slot and reminder logic in `APP_TIME_ZONE` (Europe/Zurich), stored as UTC.
- **Idempotency:** every job and webhook can run twice without sending twice (status columns + unique keys).

**New dependencies (to confirm at implementation time)**

| Package | Use |
|---|---|
| `nodemailer` | SMTP sending |
| `stripe` | Checkout sessions, webhooks |
| `@react-pdf/renderer` or `pdfkit` | Invoice PDFs |
| `swissqrbill` | Swiss QR-bill section on invoices (if CH) |
| — (hand-written) | ICS generation (simple text format, no dependency needed) |

---

## 4. Data model changes

New tables (Drizzle, one migration per milestone):

| Table | Key columns | Purpose |
|---|---|---|
| `email_log` | `id`, `contact_id`, `to`, `template_key`, `subject`, `status` (`queued`/`sent`/`failed`), `error`, `provider_id`, `sent_at` | Trace of every e-mail; shown in contact history |
| `email_templates` | `key` (PK), `subject`, `body_html`, `enabled`, `updated_at` | Editable templates with `{{variables}}` |
| `scheduled_emails` | `id`, `contact_id`, `template_key`, `send_at`, `status`, `dedupe_key` (unique), `payload` (jsonb) | Delayed / sequence e-mails |
| `availability_rules` | `id`, `weekday` (0–6), `start_time`, `end_time` | Weekly availability |
| `availability_exceptions` | `id`, `date`, `start_time?`, `end_time?`, `kind` (`blocked`/`extra`) | Holidays, extra slots |
| `booking_tokens` | `id`, `session_id`, `token_hash`, `purpose` (`manage`), `expires_at` | Cancel / reschedule links |
| `intake_forms` | `id`, `fields` (jsonb), `is_default` | Questionnaire definition |
| `intake_responses` | `id`, `contact_id`, `token_hash`, `answers` (jsonb), `sent_at`, `submitted_at` | Answers |
| `invoices` | `id`, `number` (unique), `contact_id`, `client_package_id?`, `items` (jsonb), `subtotal`, `vat_rate`, `vat_amount`, `total`, `currency`, `status` (`draft`/`issued`/`paid`/`void`), `issued_at`, `due_at`, `paid_at`, `pdf_path`, `stripe_checkout_id`, `stripe_payment_intent` | Invoicing |
| `invoice_sequences` | `year` (PK), `last_number` | Gap-free numbering per year |
| `payment_events` | `id`, `stripe_event_id` (unique), `type`, `invoice_id`, `payload`, `received_at` | Webhook idempotency |

Changes to existing tables:

| Table | Change |
|---|---|
| `coaching_sessions` | `reminder_24h_sent_at`, `reminder_1h_sent_at`, `booked_via` (`coach`/`online`), `video_url` |
| `contacts` | `email_opt_out` (boolean) for non-essential e-mails |
| `settings` | new keys: `booking` (durations, buffer, min notice, horizon, cancellation hours, require payment), `calendar_feed` (token hash), `invoicing` (legal name, address, VAT number, IBAN/QR-IBAN, payment terms) |

Optional DB guard against double booking: a PostgreSQL exclusion constraint on `tstzrange(starts_at, starts_at + duration)` for `status = 'planned'` (requires `btree_gist`); otherwise a transaction with `SELECT … FOR UPDATE` on overlapping sessions.

---

## 5. Feature 1 — E-mail foundation

**Goal:** one reliable way to send e-mails, logged and deliverable.

**Server**
- `src/server/email/send.ts`: `sendEmail({ to, subject, html, text, contactId, templateKey })` → nodemailer transport from `SMTP_*` env vars; writes `email_log` (queued → sent/failed).
- `src/server/email/layout.ts`: shared HTML layout (business name, colors, footer with address and opt-out link for non-essential e-mails), plain-text fallback.
- Dev mode: if `SMTP_HOST` is empty, log the e-mail to the console and mark it `sent` (no real sending).

**DNS (OVH, client's account)**
- SPF include for the SMTP provider, DKIM record, DMARC `p=none` to start, then `quarantine`.

**UI**
- Contact history (timeline) shows « E-mail envoyé : <sujet> » from `email_log`.
- Paramètres → Général: « Envoyer un e-mail de test » button.

**Acceptance criteria**
- Test e-mail arrives in Gmail and Outlook inboxes (not spam) with SPF/DKIM pass.
- A failed send is logged with its error and doesn't crash the action that triggered it.

---

## 6. Feature 2 — Scheduled jobs

**Goal:** run time-based work (reminders, sequences, payment reminders) every 5 minutes.

- Route `POST /api/cron/run` protected by `Authorization: Bearer <CRON_SECRET>`; runs jobs in order, each wrapped in try/catch, returns a JSON summary.
- Jobs: `sendSessionReminders`, `sendScheduledEmails`, `sendPaymentReminders`, `expireTokens`.
- **Triggering**
  - SwissWAI server: system cron (or Coolify scheduled task) `*/5 * * * *` → `curl -X POST -H "Authorization: Bearer …" https://crm…/api/cron/run`.
  - Vercel demo: `vercel.json` cron (free plan limits apply; daily only on Hobby — acceptable for the demo).
- Each job selects rows by status and timestamp and updates them in the same transaction (no double send).

**Acceptance criteria**
- Calling the route twice in a row sends each e-mail once.
- Wrong or missing secret → 401.

---

## 7. Feature 3 — Session reminders

**Goal:** fewer no-shows.

**7.1 Rules**
- 24 h reminder: sessions with `status = planned`, `starts_at` between now+23h and now+25h, `reminder_24h_sent_at IS NULL`, contact has an e-mail.
- 1 h reminder: same with now+50min / now+70min and `reminder_1h_sent_at`.
- Skip if the session was created less than 2 h before it starts (avoid a burst of e-mails).

**7.2 Content** — date/time in the coach's zone, duration, type, place or video link, buttons « Reporter » / « Annuler » (→ `/rdv/[token]`), coach contact.

**7.3 Manage page `/rdv/[token]`** — shows the session; cancel or pick another slot (reuses booking slot logic, §9). Cancellation allowed until `cancellation_hours` before start; after that, shows the coach's contact instead. Cancelling sets `status = cancelled`, logs activity, e-mails the coach.

**7.4 Settings** — Paramètres → « Rappels »: enable 24 h / 1 h, cancellation window, message preview.

**7.5 Metrics** — no-show rate before / after activation (Feature 9).

**7.6 Optional SMS / WhatsApp** — provider (e.g. Twilio / Brevo SMS), phone normalization (E.164), consent flag on contact; same job, separate channel column. Cost per message → only if Jérémie agrees.

**Acceptance criteria**
- A session at 10:00 tomorrow gets one 24 h e-mail around 10:00 today and one 1 h e-mail around 09:00 tomorrow.
- A cancelled or rescheduled session gets no reminder for the old time.

---

## 8. Feature 4 — Calendar feed (ICS)

**Goal:** CRM sessions visible in the coach's phone calendar.

- `GET /api/agenda/[token].ics` returns a `text/calendar` feed of sessions from 3 months back to 12 months ahead (planned + done), one `VEVENT` per session with stable `UID` (`session-<id>@crm`), `DTSTART`/`DTEND` in UTC, summary « Séance · Prénom N. », location / video link. No notes or sensitive content in the feed.
- Token generated in Paramètres → « Agenda » with « Copier le lien » and « Régénérer » (revokes the old one).
- Instructions shown for Google Agenda, Outlook and iPhone (subscribe by URL).

**Acceptance criteria**
- Feed validates (e.g. icalendar.org validator) and appears in Google Calendar; changes show up after the provider's refresh delay (Google: up to several hours — documented in the UI).

---

## 9. Feature 5 — Online booking

**Goal:** clients and prospects book a slot themselves.

**9.1 Settings (Paramètres → « Réservation »)**
- Weekly availability (day, start, end — several ranges per day), exceptions (holidays, extra slots).
- Bookable types: « Appel découverte » (public, e.g. 20 min, free), « Séance individuelle » (clients), durations, buffer between sessions, minimum notice (e.g. 12 h), booking horizon (e.g. 6 weeks), video link template, « paiement requis avant réservation » (from Feature 8).

**9.2 Slot computation** (`src/server/booking/slots.ts`)
- For a date range: generate candidate start times from availability rules (step = 15 or 30 min) in `APP_TIME_ZONE` → convert to UTC → remove overlaps with existing planned sessions (+ buffer) and exceptions → remove past / below minimum notice / beyond horizon.
- Pure function, unit-tested (DST change weekends included).

**9.3 Public page `/reserver`**
- Step 1: choose the type. Step 2: calendar with available days, then slots. Step 3: name, e-mail, phone, short message, consent checkbox (privacy policy). Step 4: confirmation screen + confirmation e-mail with ICS attachment and manage link.
- Anti-abuse: honeypot field, rate limit per IP, optional Cloudflare Turnstile.

**9.4 Who is booking**
- Unknown e-mail → create contact (source « Réservation en ligne », stage « Appel découverte ») + discovery call session + task « Préparer l'appel ».
- Existing prospect → add the discovery call to their file.
- Existing **client** booking a coaching session → needs a personal booking link (`/reserver?c=<token>`) sent by the coach or in the welcome e-mail (full client login comes with the Phase 3 portal). Session linked to the client; counted against the package when marked done (existing logic).

**9.5 Concurrency** — final insert inside a transaction that re-checks overlap (or exclusion constraint); on conflict, show « Ce créneau vient d'être pris » with fresh slots.

**9.6 Coach side** — new sessions appear in Calendrier / fiche with a badge « Réservé en ligne »; notification in the bell; optional e-mail to the coach.

**Acceptance criteria**
- Two people booking the same slot at the same time → only one succeeds.
- A booking never lands outside availability, inside the minimum notice, or on top of another session.
- New prospect booking appears in the pipeline at « Appel découverte » with a task.

---

## 10. Feature 6 — E-mail templates & sequences

**Goal:** standard e-mails written once, sent automatically or in one click.

**10.1 Templates (Paramètres → « E-mails »)**

| Key | Trigger | Default timing |
|---|---|---|
| `booking_confirmation` | Booking created (online or by coach, optional) | Immediately |
| `discovery_follow_up` | Discovery call marked done and contact still not client | +1 day |
| `welcome_client` | Contact becomes client | Immediately (includes intake link + booking link) |
| `package_last_session` | Package reaches 1 session left | Immediately |
| `coaching_finished` | Coaching closed as « terminé » | +2 days (thank-you + testimonial request) |
| `invoice_issued` / `payment_reminder` | Feature 8 | Immediately / per payment terms |
| `session_reminder_24h` / `_1h` | Feature 3 | Scheduled |

- Editor: subject + body (rich text or Markdown) with variables `{{prenom}}`, `{{date_seance}}`, `{{lien_reservation}}`, `{{lien_questionnaire}}`, `{{nom_coach}}`… and a live preview with a sample contact.
- Each template can be turned off.

**10.2 Sequence engine**
- Domain events already exist as `activity_log` actions (`stage_changed`, `session_done`, `coaching_finished`, `package_assigned`…). Add a small `src/server/automation/on-event.ts` called from the server actions that inserts `scheduled_emails` rows with a `dedupe_key` (e.g. `welcome_client:<contactId>`), so an event never schedules the same e-mail twice.
- The cron job sends due rows, re-checking conditions at send time (e.g. skip `discovery_follow_up` if the contact became a client meanwhile, skip if `email_opt_out`).

**10.3 Manual sending** — on the contact file: « Envoyer un e-mail » with template picker and editable text before sending.

**Acceptance criteria**
- Moving a contact to « Client » sends exactly one welcome e-mail, even if moved back and forth.
- Every sent e-mail appears in the contact history.

---

## 11. Feature 7 — Intake questionnaire

**Goal:** the coach knows the client before the first session.

- Paramètres → « Questionnaire »: ordered fields (short text, long text, single choice, multiple choice, scale 1–10, date), required flag; default set: objectives, current situation, what they expect, availability, how they found the coach, consent to data processing (required).
- Sent automatically in `welcome_client` (and optionally after a discovery call booking), or manually from the file.
- Public page `/questionnaire/[token]`: mobile-friendly, saves when submitted, token valid 30 days, one submission (editable until the first session if allowed).
- Client file: new block / tab « Questionnaire » with answers, submission date, « Renvoyer le lien ».
- Coach notified when submitted.

**Acceptance criteria**
- Answers appear in the right client file; an expired or reused token shows a clear message.

---

## 12. Feature 8 — Invoices & payments

**Depends on:** country decision + Stripe account.

**12.1 Invoices**
- Created when a package is assigned (option « Générer la facture ») or manually (« Nouvelle facture »: lines, quantity, unit price).
- Gap-free numbering `YYYY-0001` via `invoice_sequences` in a transaction.
- PDF: business identity, client, number, dates, lines, VAT (rate configurable, 0 % with mention if not subject), total, payment terms, IBAN; **Swiss QR-bill** section if CH (`swissqrbill`). Stored in private storage, downloadable from the file and sent by e-mail.
- Statuses: draft → issued → paid / void (no deletion of issued invoices — legal requirement; void with a reason instead).

**12.2 Online payment (Stripe)**
- Public page `/paiement/[token]` → creates a Stripe Checkout Session (card; TWINT when currency is CHF) with `invoice_id` in metadata.
- `POST /api/webhooks/stripe`: verify signature (`STRIPE_WEBHOOK_SECRET`), store event in `payment_events` (unique `stripe_event_id` → idempotent), on `checkout.session.completed` mark invoice paid and linked `client_packages.payment_status = 'paid'`, log activity, e-mail receipt.
- Optional rule « paiement requis avant réservation »: booking flow redirects to Checkout and only confirms the session after payment.

**12.3 Follow-up**
- Paramètres → « Facturation »: legal details, VAT, payment terms (e.g. 10 days), reminder schedule (e.g. due date +3 days, +10 days).
- Page « Factures » (new menu item): list with status filters, totals to collect, overdue in red.
- Cron job sends `payment_reminder` e-mails per schedule until paid.
- Renewal: `package_last_session` e-mail + task « Proposer un renouvellement ».

**Acceptance criteria**
- Paying through Stripe test mode marks the invoice and the package as paid within seconds; replaying the webhook does nothing more.
- Invoice numbers are consecutive with no gaps, even with concurrent creation.
- PDF passes a QR-bill validator when CH is selected.

---

## 13. Feature 9 — Dashboard & analytics additions

| Widget | Definition |
|---|---|
| Revenue forecast (next month) | Planned sessions × package unit price + open invoices due next month + likely renewals (packages with ≤ 1 session left) |
| Amount to collect | Sum of issued, unpaid invoices; overdue part highlighted |
| No-show trend | No-show rate per month, marker when reminders were enabled |
| Booking sources | Share of sessions booked online vs by the coach; new contacts from the booking page |
| E-mail health | Sent / failed e-mails over 30 days (settings page) |

---

## 13 bis. Feature 10 — Handwritten notes scanner (« Scanner des notes »)

**Goal:** Jérémy photographs his handwritten session notes; the CRM turns them into a clean, branded PDF in the client file.

- **Capture:** « Scanner des notes » in the client file (Documents) — phone camera or photos from the gallery, several pages,
  reorder / remove before sending. Photos are reduced in the browser (≈ 2 000 px) so a 12-page scan stays under the upload limit.
- **Processing on the server only** (nothing sent to a third party): OpenCV (WebAssembly build, no native compilation)
  finds the sheet's edges and straightens it (perspective); background evened out to white (shadows removed), ink kept sharp,
  cropped and compressed with sharp.
- **PDF** (pdf-lib): cover header with the JG® logo, client name, date and linked session, then the cleaned pages.
  Stored as a private document with a title and keywords (« Séance 3 – posture »), linked to the session if chosen.
- **Not included:** handwriting recognition (the PDF shows the handwriting, cleaned up).
- **Data model:** `documents` gets `title`, `keywords`, `session_id`, `source` (`upload` / `scan`).

**Acceptance criteria**
- A photo taken at an angle comes out straight and cropped to the sheet; a shadowed page comes out on a white background.
- A few seconds per page on the server, no GPU; the PDF opens from the client file and is found by its title / keywords.

---

## 14. Optional — Two-way calendar sync

Only if Jérémie wants the booking page to respect his **personal** calendar.

- Google: OAuth (Calendar API, `freebusy` read scope), tokens encrypted at rest; Outlook: Microsoft Graph equivalent.
- Busy periods fetched at slot computation time (with short cache) and removed from available slots.
- Optional: push CRM sessions into his calendar (insert events) instead of the read-only ICS feed.
- Estimate: +1 week; requires Google/Microsoft app verification for production use.

---

## 15. Security & privacy

- Public routes never expose notes, documents or other contacts' data; tokens are random, hashed in DB, expiring, single-purpose.
- Rate limiting on `/reserver`, `/questionnaire`, `/rdv`, `/paiement` (per IP + per token).
- Stripe webhook signature verification; cron secret; no secrets in client bundles.
- Consent captured on booking and questionnaire (timestamp stored); privacy policy link in every public page and e-mail footer.
- `email_opt_out` respected for non-essential e-mails (reminders and invoices stay transactional).
- Logs: never log full e-mail bodies with personal content; `email_log` keeps subject and status.
- DPA with SMTP provider and Stripe; data stays in EU/CH where possible.

---

## 16. Environment variables

```bash
# E-mail
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM="Jérémie Coaching <contact@domain>"
MAIL_REPLY_TO=

# Scheduled jobs
CRON_SECRET=                    # long random value

# Public links
APP_URL=https://crm.domain      # base for links in e-mails (can reuse BETTER_AUTH_URL)

# Stripe (Feature 8)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Optional
TURNSTILE_SECRET_KEY=           # anti-bot on public booking page
SMS_PROVIDER_API_KEY=           # optional SMS reminders
```

---

## 17. Testing strategy

| Level | What |
|---|---|
| Unit (Vitest) | Slot computation (DST, buffers, notice, exceptions), invoice numbering, template variable rendering, reminder windows, token hashing/expiry |
| Integration | Server actions + DB (booking conflict, sequence dedupe, webhook idempotency) against a test database |
| End-to-end (Playwright) | Public booking → session in calendar → reminder e-mail (captured) → cancel via link; intake form submission; Stripe test payment → invoice paid |
| E-mail capture | Local SMTP catcher (e.g. Mailpit) in dev/staging |
| Manual | Deliverability check (Gmail, Outlook), ICS subscription in Google / iPhone, mobile layout of public pages |

---

## 18. Milestones & timeline

| Milestone | Content | Estimate | Demo-able result |
|---|---|---|---|
| **M1 — Foundation** | Feature 1 (e-mail) + Feature 2 (cron) + migrations | 3–4 days | Test e-mail from settings, cron route working |
| **M2 — Reminders & calendar** | Features 3 + 4, manage/cancel page | 3–4 days | Reminder e-mails, sessions in phone calendar |
| **M3 — Online booking** | Feature 5 (settings, slots, public page, conflicts) | 5–7 days | Prospect books a discovery call from a public link |
| **M4 — Templates & sequences** | Feature 6 | 3–4 days | Welcome / follow-up e-mails sent automatically |
| **M5 — Intake questionnaire** | Feature 7 | 2–3 days | Client fills the form, answers in the file |
| **M6 — Invoices & payments** | Feature 8 | 5–8 days | Invoice PDF + Stripe test payment marks it paid |
| **M7 — Dashboard & polish** | Feature 9, tests, docs | 2–3 days | New dashboard widgets, test suite green |
| **Scanner** (done after M1, needs nothing from the client) | Feature 10 | 2–3 days | Photos of notes → clean PDF in the client file |
| **Total** | | **≈ 3 to 5 weeks** | |

Each milestone: migration + feature + tests → staging deploy → short demo / feedback.

---

## 19. Definition of done

- Type check, lint, production build and test suite pass.
- Migrations are reversible-safe (additive) and applied on staging before production.
- Every public route has abuse protection and a clear error page.
- Every automatic e-mail can be previewed, disabled, and appears in contact history.
- French UI copy reviewed; mobile layout checked for all public pages.
- README / STACK.md updated (env vars, cron setup, Stripe webhook URL).

---

## 20. Risks

| Risk | Mitigation |
|---|---|
| E-mails land in spam | SPF/DKIM/DMARC before go-live, sending from the coach's domain, plain-text part, test with mail-tester |
| Double bookings | Transaction re-check or DB exclusion constraint + concurrency test |
| Time zone / DST bugs | All computation in `APP_TIME_ZONE`, unit tests on DST weekends |
| Payment depends on country / Stripe account | Start M1–M5 first; M6 only after decisions |
| Cron not running on the server | Health check in settings (« dernière exécution »), alert if > 15 min |
| Vercel demo limits (cron frequency, no persistent files) | Demo uses daily cron and disables PDF storage; full behaviour on the SwissWAI server |
