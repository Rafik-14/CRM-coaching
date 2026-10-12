# Phase 1 bis — « Personnaliser » · Tailoring the CRM to Jérémy Galéa (JG®)

> **Project:** CRM Coaching (Jérémy Galéa, coach & formateur · SwissWAI client)
> **Prerequisite:** Phase 1 « Organiser » (done).
> **Goal:** make the CRM speak Jérémy's brand and method: his identity (logo, colours, fonts), his three offers, his « échange stratégique », his client types, his session structure (Méthode JG®) and his case-study format.
> **Out of scope here:** the connection with the website (waiting for the site's source code, see §12) and everything in Phase 2 « Automatiser ».
> **Estimate:** 6 to 8 working days (one developer).
> **Sources:** client folder `OneDrive_2026-10-12/Jeremy Galea/Website Project/01 - Request Client/` (visual brief, site instructions, raw site text, pictures) + `docs/brand/logobleu-source.svg`.
> **Last updated:** 2026-10-12

---

## Table of contents

1. [Where this sits in the roadmap](#1-where-this-sits-in-the-roadmap)
2. [Source material](#2-source-material)
3. [Brand reference (from the visual brief)](#3-brand-reference-from-the-visual-brief)
4. [Business reference (from the site content)](#4-business-reference-from-the-site-content)
5. [What changes in the CRM — overview](#5-what-changes-in-the-crm--overview)
6. [Logo SVG — state and clean-up](#6-logo-svg--state-and-clean-up)
7. [Data model changes](#7-data-model-changes)
8. [Implementation steps (in order)](#8-implementation-steps-in-order)
9. [Open questions for Jérémy](#9-open-questions-for-jérémy)
10. [Testing & definition of done](#10-testing--definition-of-done)
11. [Risks](#11-risks)
12. [Deferred: website connection](#12-deferred-website-connection)

---

## 1. Where this sits in the roadmap

| Phase | Name | Status |
|---|---|---|
| 1 | « Organiser » — contacts, pipeline, sessions & notes, packages, goals, tasks, documents, calendar, analytics, settings, website form endpoint | Done |
| **1 bis** | **« Personnaliser » — JG® brand, offers, method, client types (this document)** | **To do — next** |
| 2 | « Automatiser » — e-mails, reminders, calendar feed, online booking, templates, intake form, invoices & payments (`docs/PHASE-2-PLAN.md`) | To do |
| 3 | « Accompagner » — client space, exercises, check-ins, wheel of life, end-of-coaching review, AI assistant (option) | To do |
| — | Production on the SwissWAI server (VM), domain at OVH | Separate track |

**When this plan is finished, Phase 1 and its personalisation are complete and the project moves to the start of Phase 2 « Automatiser » (milestone M1 — e-mail + scheduled jobs).** Phase 2 then reuses what is built here: the brand for the e-mail layout and invoice PDF, the EUR/CHF prices for invoices, the « Échange stratégique » type for the online booking page.

---

## 2. Source material

| File | Used for |
|---|---|
| `01 - VISUAL BRIEF MAÎTRE — DESIGN SYSTEM WEB JG®.pdf` | Colours, fonts, radii, buttons, icon style, forbidden effects, accessibility rules |
| `Site web JGinstructions.pdf` / `Site web JG_brut_pdf.pdf` | Offers and prices, method steps, client types, stakes vocabulary, case-study structure, discovery call (20 min, free), countries (France • Suisse) |
| `docs/brand/logobleu-source.svg` (copy of `Downloads/logobleu.svg`) | Logo, monogram, favicon (after clean-up, §6) |
| `Pictures/JG1Hero1.png` | Login screen photo (portrait, white shirt — the brief's « HERO » photo) |
| `Pictures/shemadansongletlamethode.png`, `shemajusteavantsection6enpagedaccueil.png` | Optional « Méthode JG® » reference card in the CRM |
| `Pictures/logoclarifier…`, `logoreveler…`, `logoincarner…` | Not used directly (raster, decorative) — method steps get line icons instead |

Not used: the other photos (website only), `JG.kdbx` (password vault, never opened).

---

## 3. Brand reference (from the visual brief)

### 3.1 Colours (the brief forbids changing the HEX codes or adding colours)

| Token | HEX | Usage in the CRM |
|---|---|---|
| `--jg-navy` | `#172536` | Primary: buttons, active nav, headings, sidebar (dark) |
| `--jg-navy-hover` | `#243A52` | Primary hover |
| `--jg-anthracite` | `#343A3F` | Body text (never pure black) |
| `--jg-gold` | `#D4A866` | Accents only: thin lines, active nav marker, key figures' underline, chart series. **Never body text.** |
| `--jg-teal` | `#0F6B6B` | Very occasional secondary accent (e.g. « payé », « terminé » states). **Never body text.** |
| `--jg-ivory` | `#F8F6F2` | App background (warm) |
| `--jg-light-gray` | `#E7E7E5` | Borders, separators, inputs |
| `--jg-white` | `#FFFFFF` | Cards, popovers, text on navy |

Proportions to respect: ~60 % white/ivory · 25 % navy · 10 % photo · 5 % gold + teal.

### 3.2 Typography

- **Headings:** Montserrat 500/600, colour `#172536`.
- **Text:** Lato 400/700, colour `#343A3F`; strong text Lato 700 `#172536`.
- **Max two typefaces** → Inter and Geist Mono are removed; numbers use Lato with `tabular-nums`.

### 3.3 Shapes, icons, effects

- Radius: buttons **7 px**, inputs **7 px**, cards **10–12 px**, images ≤ 14 px. **No pill buttons.**
- Shadows: very light only. No gradients, glassmorphism, neumorphism, neon, **no 3D**.
- Icons: thin line icons, 1.5–2 px stroke, navy with gold accent (lucide fits).
- Forbidden: emojis, cartoon icons, generic illustrations, centered text everywhere, auto carousels, excessive animation.
- Accessibility: visible focus states, touch targets ≥ 44 px, sufficient contrast, information never conveyed by colour alone.

### 3.4 Dark mode (not defined by the brief)

The brief describes a light website. The CRM keeps its light/dark toggle; dark mode is built only from brand colours: navy `#172536` as surfaces, a darker navy derived from it as background, white/ivory text, gold accents. (See question Q4 — it can be dropped if Jérémy prefers.)

---

## 4. Business reference (from the site content)

### 4.1 Identity

- Name: **Jérémy Galéa** — « Coach & formateur · Créateur de la Méthode JG® ».
- Signature: **« Révéler votre potentiel »**.
- Domains: Identité professionnelle • Positionnement • Évolution • Leadership • Recrutement.
- Countries: **France • Suisse** → prices in **EUR and CHF**.

### 4.2 Offers (« Accompagnements »)

| # | Offer | Sessions | EUR | CHF | Included / for |
|---|---|---|---|---|---|
| 01 | Architecture Identitaire JG® | 1 | 170 € | 190 CHF | Clarification • Repositionnement • Orientation • Reconversion • Évolution |
| 02 | Accompagnement Décisif JG® | 3 | 470 € | 490 CHF | Entretien • Stage • Alternance • Oral • Pitch • Négociation • Prise de poste |
| 03 | Parcours Signature JG® | 8 | 1 090 € | 1 190 CHF | 8 individual sessions • Workbook Signature JG® • Exercises between sessions |

Entry point for all: **« Échange stratégique » — 20 minutes, free, no commitment.**

### 4.3 Method

- Home page: **CLARIFIER → RÉVÉLER → INCARNER** (Comprendre → Donner du sens → Rendre visible).
- Method page: **RELIER → RÉVÉLER → INCARNER** (see Q1).
- Parcours Signature axes: **Identité · Valeur · Positionnement · Posture · Impact**.
- What the method transforms: Compréhension · Expression · Posture · Décisions · Impact.

### 4.4 Client types (« Pour qui ? »)

| Segment | Sub-types / typical stakes |
|---|---|
| Particuliers | Étudiant / jeune diplômé (stage, alternance, premier emploi) · En recherche d'emploi (positionnement, entretien, opportunité) · En reconversion ou en évolution |
| Entrepreneurs | Positioning in a competitive market |
| Entreprises | Collaborators and managers (B2B interventions) |
| Cabinets RH & chasseurs de têtes | Partners who send candidates (« Construire un partenariat ») |
| Écoles & universités | Interventions for students |

### 4.5 Case-study format (« Transformations »)

**Photo + nom + domaine → Avant → Le déclic → Après → Ce qui a changé**, with the **positioning statement** highlighted as the key piece (e.g. Jean-Gabriel's).

---

## 5. What changes in the CRM — overview

| Area | Today | After |
|---|---|---|
| Look | Graphite & steel blue, Inter, 12 px radius | JG® navy/gold/ivory, Montserrat + Lato, 7 px buttons, 10 px cards |
| Logo / favicon | Generic brand mark | JG® logo (sidebar, login), monogram favicon |
| Login screen | 3D illustration | Jérémy's portrait + « Révéler votre potentiel » |
| Empty states | 3D illustrations | Line icons (navy + gold), short text |
| Business name | « Jérémie — Coaching (démo) » | « Jérémy Galéa — Méthode JG® » (Q3) |
| Discovery call | « Appel découverte », 60 min | « Échange stratégique », 20 min, free |
| Packages (« Forfaits ») | Generic packages, one currency for all | « Accompagnements »: the 3 JG® offers, **price in EUR and CHF**, description, what's included |
| Sold package | Points to the package's current price | Stores the **price and currency at the time of sale** |
| Pipeline | Generic stages | Nouveau contact → Échange stratégique planifié → Échange réalisé → Offre recommandée → En accompagnement → Terminé |
| Contacts | Name, e-mail, phone, source, tags | + **segment**, sub-type, **organisation**, **referred by** (partner), **country/currency**, **stake** + **key-moment date** |
| Session notes | One generic template | One template per offer (Échange stratégique, Architecture Identitaire, Décisif, Signature) based on the method |
| Goals | Free | Parcours Signature pre-fills the 5 axes |
| Closing a coaching | Reason + note | + **Avant / Le déclic / Après / Ce qui a changé**, **positioning statement**, **testimonial consent** |
| Analytics | Generic | By segment, by offer, by partner; revenue shown per currency (EUR and CHF, never converted) |
| Vocabulary | Generic coaching words | Jérémy's words (accompagnement, échange stratégique, Méthode JG®, enjeu) |

---

## 6. Logo SVG — state and clean-up

`logobleu.svg` is an **automatic trace** of the PNG (generator: VTracer 0.6.4), not the designer's original vector:

- 1536 × 1024 canvas, **no `viewBox`** (doesn't scale cleanly), white background rectangle included.
- ~98 paths with **~90 slightly different navy shades** (`#13283F`, `#122941`, `#0F263F`…) and light-grey « halo » paths from anti-aliasing.
- Gold traced as `#CFAA74` / `#C59D66` instead of the official `#D4A866`.
- File size 35 KB.

**Clean-up (step 1):**

1. Remove the background rectangle and near-white / light-grey halo paths.
2. Normalise every navy shade → `#172536`, every gold shade → `#D4A866`.
3. Add a `viewBox` cropped to the drawing; round coordinates (`svgo`).
4. Produce the variants the brief asks for:
   - `public/brand/jg-logo.svg` — full logo (monogram + name + signature + gold line)
   - `public/brand/jg-logo-white.svg` — white version for navy backgrounds (dark mode, sidebar)
   - `public/brand/jg-monogram.svg` — monogram + arrow only (collapsed sidebar, mobile)
   - `src/app/icon.svg` + `src/app/apple-icon.png` — favicon from the monogram
5. Check the small text (« RÉVÉLER VOTRE POTENTIEL ») at sidebar size; if the traced letters look uneven, show the monogram + name set in Montserrat instead, and ask for the original vector (Q5).

The original trace stays in `docs/brand/logobleu-source.svg` as the reference.

---

## 7. Data model changes

One additive migration: `drizzle/0003_jg_tailoring.sql` (no column removed, safe on the demo DB).

### 7.1 `contacts`

| Column | Type | Notes |
|---|---|---|
| `segment` | text, nullable | `particulier` · `entrepreneur` · `entreprise` · `cabinet_rh` · `ecole` |
| `sub_segment` | text, nullable | For particuliers: `etudiant` · `recherche_emploi` · `reconversion` |
| `organization` | text, nullable | Company / firm / school name |
| `referred_by_contact_id` | uuid → `contacts.id`, on delete set null | Partner who sent this contact (HR firm, school) |
| `country` | text, nullable | `FR` · `CH` |
| `currency` | text, not null, default from business setting | `EUR` · `CHF` — used when selling an offer |
| `stake` | text, nullable | Enjeu: Entretien, Stage, Alternance, Oral, Pitch, Négociation, Prise de poste, Clarification, Repositionnement, Orientation, Reconversion, Évolution |
| `key_moment_at` | timestamptz, nullable | Date of the decisive moment (interview, pitch…) |

### 7.2 `packages` (« Accompagnements »)

| Column | Type | Notes |
|---|---|---|
| `price` (existing) | numeric | Becomes the **EUR** price |
| `price_chf` | numeric, nullable | CHF price |
| `tagline` | text, nullable | e.g. « Réussir un moment qui compte. » |
| `description` | text, nullable | Short description |
| `includes` | text[], default `{}` | e.g. Workbook Signature JG®, Exercices entre les séances |
| `note_template_id` | uuid → `note_templates.id`, nullable | Template used for this offer's sessions |
| `goal_presets` | text[], default `{}` | Goals created automatically when sold (Signature: the 5 axes) |
| `position` | integer, default 0 | Display order 01 / 02 / 03 |

`currency` on `packages` stays but is no longer used for display (kept for compatibility).

### 7.3 `client_packages`

| Column | Type | Notes |
|---|---|---|
| `price` | numeric, nullable | Price **at the time of sale** (backfilled from the package) |
| `currency` | text, nullable | `EUR` · `CHF` (backfilled from the business setting) |

Analytics and future invoices (Phase 2) read these, so a later price change never rewrites history.

### 7.4 `clients`

| Column | Type | Notes |
|---|---|---|
| `positioning_statement` | text, nullable | The « formulation de positionnement », shown at the top of the client file |
| `case_study` | jsonb, nullable | `{ before, trigger, after, changes[] }` = Avant / Le déclic / Après / Ce qui a changé |
| `testimonial_consent` | boolean, default false | Client agreed to be used as an (anonymised) case study |

### 7.5 `coaching_sessions`

No column change. Data update: `type = 'Appel découverte'` → `'Échange stratégique'`. Default durations become per type (Échange stratégique 20 min, Séance individuelle 60 min, Bilan 60 min, Intervention 120 min).

### 7.6 Settings & reference data (seed + data migration)

- `business`: `{ name: "Jérémy Galéa — Méthode JG®", signature: "Révéler votre potentiel", defaultCurrency: "CHF" | "EUR" }` (Q6).
- Pipeline stages (§8 step 8), note templates (step 10), the 3 offers (step 6).

---

## 8. Implementation steps (in order)

Each step ends with: type check + lint + build green, and a visual check in light and dark mode, desktop and mobile.

### Step 0 — Preparation (½ day)

- Commit the current uncommitted work (speed fixes, Vercel config, docs) — with your OK.
- Create the branch `feat/jg-tailoring`.
- Install `svgo` (dev) for the logo clean-up.

### Step 1 — Brand assets (½ day)

- Clean the SVG as described in §6; generate the 3 logo variants + favicon + apple icon.
- Convert `JG1Hero1.png` (1.7 MB) to `public/brand/jg-portrait.webp` (≈ 150–250 KB, 2 sizes).
- **Done when:** favicon shows the JG monogram; logo is sharp at 32 px and 200 px; colours are exactly `#172536` / `#D4A866`.

### Step 2 — Design tokens & fonts (1 day)

- `src/app/globals.css`: add the `--jg-*` variables (brief §18) and map the shadcn tokens:
  `--background` ivory, `--card`/`--popover` white, `--foreground` anthracite, `--primary` navy, `--primary-foreground` white, `--border`/`--input` light grey, `--ring` navy, `--accent` ivory/navy-tint, chart series navy · gold · teal · anthracite · light grey; dark-mode block built from navy (§3.4). `--destructive` stays a muted red (errors must remain readable — not a brand colour, functional only).
- Radius: `--radius: 0.625rem` (10 px cards), buttons and inputs forced to 7 px; remove any `rounded-full` on buttons.
- `src/app/layout.tsx`: replace Inter / Geist Mono with Montserrat (500, 600) for `--font-heading` and Lato (400, 700) for `--font-sans` via `next/font/google`; headings use `font-heading`.
- Remove the `illu-*` animations; soften shadows.
- **Done when:** no hard-coded old colours remain (`grep` for the old hex values), contrast AA on body text and buttons, gold never used for text.

### Step 3 — Brand in the layout (½ day)

- `src/components/layout/brand.tsx`: JG logo (white version on navy sidebar, monogram when collapsed / mobile).
- Login (`src/app/connexion`): split screen = form + Jérémy's portrait, signature « Révéler votre potentiel », thin gold line.
- Page headers: title in Montserrat + short gold underline (the brief's « signature graphique »).
- Active nav item: gold marker; metadata title « Jérémy Galéa — CRM ».
- **Done when:** login, sidebar, mobile nav and 404 page match the brand.

### Step 4 — Replace the 3D illustrations (½ day)

- `EmptyState`: line icon (lucide, 1.5 px, navy) in a light ivory circle + gold accent, text left-aligned.
- Update the 8 users: dashboard, contacts, contact file, tasks, analytics, close-coaching dialog, login, not-found.
- Delete `src/components/illustrations/illustration-3d.tsx`, the registry and `src/assets/illustrations/*`; update the README section.
- **Done when:** no 3D image is shipped (`grep Illustration3D` empty), bundle smaller.

### Step 5 — Database migration (½ day)

- Edit `src/server/db/schema.ts` (§7), generate `drizzle/0003_jg_tailoring.sql`, add backfills (`client_packages.price/currency`, session type rename).
- Update Zod schemas in `src/lib/validations/*`.
- **Done when:** migration runs on a fresh DB and on a copy of the demo DB without errors.

### Step 6 — Offers « Accompagnements » (1 day)

- Settings → rename « Forfaits » to **« Accompagnements »**; form gets EUR price, CHF price, tagline, description, « inclus » list, note template, goal presets, order.
- Offer cards styled like the website (01 / 02 / 03, name, tagline, sessions, both prices).
- Selling an offer to a client (`packages-panel.tsx`): price chosen in the **contact's currency**, stored on `client_packages`.
- When a Parcours Signature is sold: create the preset goals (Identité, Valeur, Positionnement, Posture, Impact).
- `formatMoney` everywhere reads the sold price/currency, not the business setting.
- **Done when:** selling « Accompagnement Décisif » to a Swiss contact records 490 CHF; to a French contact 470 €.

### Step 7 — « Échange stratégique » (½ day)

- `SESSION_TYPES`: Échange stratégique · Séance individuelle · Bilan · Intervention (B2B).
- Default duration per type (20 min for the échange); prospects can only book an « Échange stratégique ».
- Rename all copy (calendar, contact file, toasts, server action error message, schema comment).
- **Done when:** no « Appel découverte » text remains; existing sessions show the new name.

### Step 8 — Pipeline (½ day)

- Stages: **Nouveau contact → Échange stratégique planifié → Échange réalisé → Offre recommandée → En accompagnement** (`isClient`) **→ Terminé** (`isClient`).
- Seed for new installs + mapping of existing demo stages.
- Optional automation: booking an échange moves the contact to « Échange stratégique planifié »; marking it done moves it to « Échange réalisé ».
- **Done when:** the board shows the 6 stages and drag & drop still turns a contact into a client at « En accompagnement ».

### Step 9 — Contact segmentation (1 day)

- Contact form + quick view: segment (+ sub-type for particuliers), organisation, referred by (search among contacts), country → currency, stake, key-moment date.
- Contact list: segment column + filter; stake as a tag-like badge.
- Partner file (cabinet RH / école): list of the contacts they referred and how many became clients.
- Notifications: « Moment décisif dans 3 jours : entretien de X » (existing notifications query).
- CSV export: new columns.
- **Done when:** a contact referred by an HR firm appears in that firm's file; the key moment shows in notifications.

### Step 10 — Session note templates (1 day)

Templates (editable in settings), auto-selected from the session type or the client's active offer, with a selector in the note dialog:

| Template | Fields |
|---|---|
| Échange stratégique | Situation actuelle · Enjeu / moment visé · Ce qui freine · Accompagnement recommandé · Prochaine étape |
| Architecture Identitaire JG® | Relier — expériences & choix · Constantes & motivations · Fil conducteur · Ce qui distingue · Direction |
| Accompagnement Décisif JG® | Moment visé & date · Message clé · Posture · Mise en situation · Points à travailler |
| Parcours Signature JG® | Axe travaillé (Identité / Valeur / Positionnement / Posture / Impact) · Clarifier · Révéler · Incarner · Le déclic · Exercices entre les séances · Prochaine étape |

- « Exercices entre les séances » can be turned into client tasks in one click.
- **Done when:** a Signature session opens with the Signature template; notes keep the template order.

### Step 11 — Closing = case study (½ day)

- Close-coaching dialog: Avant · Le déclic · Après · Ce qui a changé (list) · Formulation de positionnement · consent checkbox.
- Client file: positioning statement shown at the top, highlighted (gold line) — the « pièce à conviction ».
- Analytics: « Transformations » list = finished coachings with a case study and consent (ready to copy for the website).
- **Done when:** closing a coaching with consent makes it appear in the list.

### Step 12 — Analytics (½ day)

- Breakdown by segment, by offer, by partner (referrals → clients).
- Revenue per currency (two figures, never converted).
- Échange stratégique → client conversion rate.
- **Done when:** the analytics page shows the new widgets with the demo data.

### Step 13 — Wording & accessibility pass (½ day)

- Replace generic words with Jérémy's vocabulary across the UI (accompagnement, échange stratégique, enjeu, Méthode JG®).
- Check: focus visible, targets ≥ 44 px on mobile, no colour-only information, no gold/teal body text.
- Optional: « Méthode JG® » reference card (diagram) in settings.

### Step 14 — Demo data & deployment (½ day)

- Rewrite `src/server/db/seed.ts`: JG® offers, stages, templates, ~30 **fake** contacts spread across the 5 segments (students, job seekers, an HR firm with referred candidates, a school, entrepreneurs), sessions, 2 fake case studies. Real client data never goes to the demo.
- Redeploy the Vercel demo (migrations run in the build); check login and every page.
- Update `README.md`, `docs/STACK.md`; refresh the supervisor PDF if needed.

### Summary

| Step | Content | Estimate |
|---|---|---|
| 0–1 | Preparation, brand assets | 1 day |
| 2–4 | Tokens & fonts, layout, illustrations | 2 days |
| 5–7 | Migration, offers, échange stratégique | 2 days |
| 8–11 | Pipeline, segmentation, note templates, case study | 3 days |
| 12–14 | Analytics, wording, demo & deploy | 1.5 days |
| **Total** | | **≈ 6 to 8 working days** |

---

## 9. Open questions for Jérémy

None of these block the start; a sensible default is used until answered.

| # | Question | Default used |
|---|---|---|
| Q1 | Method name: **CLARIFIER** or **RELIER** → Révéler → Incarner? (both appear on the site) | Clarifier on templates, editable |
| Q2 | Accompagnement Décisif: fixed **3 sessions** or **1 to 3**? | 3 sessions (offers page) |
| Q3 | Name in the CRM: « Jérémy Galéa » (brand spelling) instead of « Jérémie »? | Jérémy Galéa |
| Q4 | Keep a dark mode? | Kept, built from navy |
| Q5 | Original vector logo (AI / PDF / EPS) from the designer? | Cleaned trace |
| Q6 | Main currency / country of the business (CH or FR)? | CHF default, EUR per contact |
| Q7 | OK to show his portrait on the CRM login screen (also visible on the demo)? | Yes (public marketing photo) |

---

## 10. Testing & definition of done

- `npm run typecheck`, `npm run lint`, `npm run build` pass.
- Migration `0003` applies on a fresh DB and on the demo DB; no data lost.
- Manual pass: login, dashboard, contacts (create with segment/partner/stake), pipeline drag & drop, échange stratégique booking, selling each offer in EUR and CHF, Signature goals created, note templates, closing with case study, analytics, settings — in light & dark, desktop & 375 px mobile.
- Brand checklist from the brief (§20): correct logo, exact HEX codes, Montserrat/Lato only, no pure black text, clear H1/H2/H3, no 3D, no pill buttons, accessible contrast, touch targets.
- No real client data in the demo.

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| Traced logo looks uneven at small sizes | Monogram-only at small sizes; ask for the original vector (Q5) |
| Brand palette too light for dense CRM screens | Navy sidebar + white cards on ivory keep hierarchy; validated on every page |
| Removing Inter changes table/number widths | Lato `tabular-nums`; check tables and charts |
| Two currencies mixed in totals | Totals always grouped by currency, never summed across |
| Renaming the session type breaks old data | Data migration + type list updated in one step |
| Method naming (Q1) changes later | Templates and labels are editable in settings, no code change |

---

## 12. Deferred: website connection

Waiting for the website's source code (or admin access to its builder). Nothing in this plan depends on it. When it arrives:

1. Point the site's contact form at the existing `/api/formulaire-site` endpoint (fields: Nom, Prénom, E-mail, Téléphone facultatif, Message) **or** link the site's buttons to CRM-hosted pages.
2. Send the CTA used (`source`): « Réserver un échange stratégique », « Construire un partenariat » → `cabinet_rh`, « Échanger sur une intervention » → `ecole`, « Échangeons sur vos enjeux » → `entreprise`, « Parlons de votre positionnement » → `entrepreneur`, « Trouver mon accompagnement » → `particulier`, so the segment (§7.1) is filled automatically.
3. The « Réserver un échange stratégique » buttons will point to the public booking page built in **Phase 2, Feature 5 (online booking)**.
