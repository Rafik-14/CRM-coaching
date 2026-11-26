# Le Révélateur — "Cinema" prototype: audit and integration spec

| | |
|---|---|
| Source audited | `Downloads/le-revelateur-jg` (Vite + React 19, v2.0.0) and the live build https://le-revelateur-jg.vercel.app |
| Audited on | 24 Nov 2026 |
| Target | `coach-crm` (Next.js 16), the passation at `/revelateur/experience` |
| Reference rules | Dossier maître v2.0, annexe 02 (scoring), note de verrouillage, the site/CRM visual brief |
| Status | Proposal. Nothing in this document is implemented yet. |

---

## 1. Summary

The prototype is a **front-end-only visual concept**. The whole test runs inside the browser, with a dark
"cinema / darkroom" theme, a full-screen WebGL light background, five "light columns" as the answer scale,
a chapter interlude every 6 statements, synthesized sound, and kinetic typography (GSAP SplitText).

It is a strong **experience idea**, but it is **not portable as code**:

- it breaks several locked rules of the dossier v2.0 (automatic move after a choice, dark/glow aesthetic,
  all 30 statements and the scoring keys public in the bundle, statement wording in the summary,
  no reduced-motion support);
- it has **no back end**: answers live in `localStorage`, and "confirmation" deletes them. Nothing is
  frozen, scored, stored or sent to the CRM, although the final screen says "Votre cartographie est calculée";
- its data file contains **invented method content** (other dimension names, other level thresholds,
  "archetypes", readings, coaching questions) that is not from Jérémy.

**Approach for integration:** keep coach-crm's server-driven architecture as it is (session, one statement
per payload, server scoring, idempotent confirmation). Port only **presentation ideas**, rebuilt as
components inside the existing `RevelateurExperience`, each behind the existing rules. §5 lists what to take,
§6 how, §8 the acceptance checklist.

---

## 2. What the prototype contains

| Area | File | Lines | Notes |
|---|---|---|---|
| App shell / stage switch | `src/App.tsx` | 58 | Stages: `landing → interlude → question → open → review → confirmed`. Forces dark `body`. Hidden Alt+Shift+D demo shortcut. |
| State | `src/store/useJourneyStore.ts` | 270 | Zustand. Answers + index + open answer in `localStorage` key `le_revelateur_traversee_v4`, 30-day expiry. |
| Content + scoring | `src/data/revelateurData.ts` | 476 | 30 statements (verbatim), dimension map, reversed items, **invented** dimension metadata, thresholds and archetypes, `computeCartography()` (unused at runtime). |
| Landing + welcome | `scenes/LandingOverture.tsx` | 259 | Kinetic title (SplitText + ScrambleText), welcome text below the fold. |
| Chapter interlude | `scenes/ActInterlude.tsx` | 194 | 2.39:1 "letterbox shutters", "Regard I–V", ≈2.3 s, click to skip. |
| Question screen | `scenes/LightColumnsStage.tsx` | 916 | Five light columns (desktop) / vertical rail (mobile), hover preview, word-peel exit, auto-commit 520 ms after the choice. |
| Open question | `scenes/OpenIntention.tsx` | 92 | Verbatim question, 1000 chars. |
| Summary + confirm | `scenes/ContactOverlay.tsx` | 474 | Grouped by series, shows the statement text, inline edit, confirm dialog. |
| Final | `scenes/CompletionSequence.tsx` | 125 | Copies the staging "Vos réponses sont confirmées." screen. |
| HUD | `components/CinemaHUD.tsx` | 140 | Logo, question counter, 5 series dots, sound toggle. |
| Background | `webgl/HorizonWorld.tsx` | 462 | Three.js full-screen fragment shader: "liquid silk", 5 volumetric shafts, caustics, motes, pointer gravity, ripple on answer. |
| Sound | `audio/cinemaAudio.ts` | 336 | Web Audio, synthesized (no files): ticks, "seal stamp" on answer, swells on interlude. |
| Motion setup | `lib/gsapSetup.ts` | 49 | Registers 9 GSAP plugins; only SplitText, ScrambleText and core are used. |

Dependencies: `gsap`, `@gsap/react`, `three`, `zustand`, `@phosphor-icons/react`, `lenis` (unused).
Live bundle: **≈295 KB gzipped JS (≈994 KB raw)** in one file, plus Google Fonts from the Google CDN.

---

## 3. Audit findings

Severity: **Blocker** = breaks a locked rule or loses data. **High** = must be solved before it reaches users.
**Medium/Low** = quality.

### 3.1 Blockers

| # | Finding | Evidence | Rule |
|---|---|---|---|
| B1 | **Automatic move after a choice.** Clicking a column or pressing 1–5 commits and moves to the next statement after 520 ms. There is no "Suivante". Verified live: pressing 4 on Q01 lands on Q02. | `LightColumnsStage.tsx:398-404` | v2.0 §2: no automatic move; an explicit "Suivante". |
| B2 | **All 30 statements, the dimension of each and the 4 reversed items are in the public JS bundle.** Verified: the live bundle contains Q11's wording and 4 `reverse:!0` flags. Anyone can extract the full questionnaire and the scoring keys. | `revelateurData.ts`, live `index-*.js` | v2.0: never expose all 30 questions in one client payload; method protection (© notice). |
| B3 | **No back end; confirmation loses the answers.** `confirmFinal()` calls `clearPersisted()`. Nothing is frozen, scored, stored or sent. The final text "Votre cartographie est calculée" is untrue in this build. | `useJourneyStore.ts` `confirmFinal` | v2.0 flow: confirmation freezes the answers, then scoring and report. |
| B4 | **Invented method content.** Dimension names ("Clarté identitaire", "Posture & Légitimité", "Résonance relationnelle", "Mobilisation & Cohérence") differ from annexe 02 (Conscience de soi, Positionnement, Expression, Impact relationnel, Incarnation). Levels at 72 % / 48 % named "affirmée / en consolidation / en éveil", "archetypes" and "readings" are not in Jérémy's documents. Missing answers default to 3. Not shown at runtime (tree-shaken), but must **never** be ported. | `revelateurData.ts` `DIMENSIONS`, `ARCHETYPES`, `computeCartography` | Annexe 02 (scoring, levels, configurations), proof matrix still pending. |
| B5 | **Statement wording shown in the summary.** | `ContactOverlay.tsx:239` | Current implementation shows labels only (open point with Jérémy: "summary without wording"). |
| B6 | **Dark, glowing aesthetic.** Obsidian background (`#060910`), volumetric light shafts, glow shadows, film grain, gradients. | `App.tsx`, `HorizonWorld.tsx`, `index.css` | v2.0 §3: light palette (ivory/navy/champagne/teal), no cosmic/halo effects, no dark dominant background. Visual brief: no gradients. |

### 3.2 High

| # | Finding | Evidence |
|---|---|---|
| H1 | **No reduced-motion support anywhere** (no `prefers-reduced-motion` in source or bundle). Shader, SplitText, shutters, ripples always run. | grep, live bundle |
| H2 | **Sound on by default.** The first click starts Web Audio with no prior opt-in. | `cinemaAudio.ts` `enabled = true`, store `soundEnabled: true` |
| H3 | **Validated texts changed or missing.** Intro lacks "JG® — UNE EXCLUSIVITÉ JG® — PRÉSENTE", "Vous avez une valeur.", "Savez-vous ce qui vous rend unique ?". Welcome lacks the e-mail paragraph and "Bonne exploration.". Save notice replaced by "Sauvegarde automatique (30 jours) · Touches 1–5". | `LandingOverture.tsx`, `LightColumnsStage.tsx:911` |
| H4 | **No "Votre valeur prend forme." preparation step** (v2.0 §3, 5–7 s). | — |
| H5 | **Performance on phones.** Full-screen fragment shader at 60 fps on every screen (DPR up to 1.75, `powerPreference: 'high-performance'`), no pause when the tab is hidden (no `visibilitychange`), ≈1 MB raw JS on first load, text waits for `document.fonts.ready` before animating. In the test browser at 375 px, the landing was still blank after 5 s (the test pane may throttle; measure on a real phone). | `HorizonWorld.tsx:312-330` |
| H6 | **Accessibility.** Buttons with `role="radio"` without arrow-key handling; `aria-checked` true on the previous answer; the interlude is a full-screen click target; low-contrast text (`/32`–`/45` opacity on near-black); `touch-none` on the mobile rail; ArrowLeft = "Précédente" globally. | `LightColumnsStage.tsx:601-728`, `ActInterlude.tsx` |
| H7 | **Hidden Alt+Shift+D shortcut** loads demo answers and jumps to the summary in production. | `App.tsx:20-30` |
| H8 | **Google Fonts loaded from Google's CDN** (visitor IP sent to Google; GDPR exposure in the EU). coach-crm self-hosts fonts via `next/font`. | `index.html` |

### 3.3 Medium / Low

- **Answer-scale colour bias.** Columns go from cold blue (1) to bright gold (5), and 5 glows the most. This visually rewards "Tout à fait vrai" on a self-assessment, which can bias answers. The scale should look neutral (equal weight).
- Layout bug: at ≈800 px wide the lead "Une expérience pour révéler ce qui vous distingue." breaks one word per line (SplitText line masks).
- Answers in clear in `localStorage` on shared devices (coach-crm keeps them server-side behind a hashed cookie).
- Dead weight: 6 GSAP plugins registered but unused; `lenis` unused; two icon libraries if merged (Phosphor vs lucide in coach-crm).
- GSAP licence: free for commercial use since 2025, including SplitText/ScrambleText. OK, but it adds ≈70 KB gz if adopted.
- No error/offline handling (nothing is sent anyway).

### 3.4 What is good (worth keeping)

1. **The scale as five spatial positions** with hover preview and keys 1–5: answering feels physical rather than form-like.
2. **Statement transitions** (words leaving, the next statement developing in): each statement feels like a new "shot".
3. **Chapter interludes** every 6 statements ("Regard I–V", 2 s, skippable): rhythm through 30 items. *Note: progress chapters only, never dimensions; the question order mixes dimensions.*
4. **A discreet HUD**: counter + 5 series dots instead of a 30-segment bar.
5. **Optional sound design**, synthesized (no audio files to host).
6. **Resume on the landing** ("Reprendre (n/30)").
7. **Summary grouped by series** with a filter.
8. **Ambient background** that reacts to the choice (as an idea; see §6.6 for a light, compliant version).

---

## 4. Architecture rule for the integration

Nothing changes in the data path. The prototype's store, data file and scoring are **not** imported.

```
Browser (RevelateurExperience, client)          Server (unchanged)
  shows ONE screen at a time        ── action ──▶  src/server/actions/revelateur.ts
  sends only the person's choice                   src/server/revelateur/session.ts   (state, resume 30 days)
  never sees other statements, map, reversals      src/lib/revelateur/scoring.ts       (annexe 02, server use)
                                    ◀── Screen ──  question-texts.ts / questionnaire.ts (server-only texts)
```

Allowed client knowledge per screen: the current statement, its number, the `answered[]` flags, the scale
labels. The axis map is sent **only after confirmation** (already the case: `ConfirmState.axes`).

---

## 5. Port matrix

| Prototype idea | Decision | Target in coach-crm |
|---|---|---|
| Light columns scale | **Adapt**: light palette, neutral colours, native radios, no auto-move | new `ScaleColumns` replacing the option grid in `Question` |
| Word-peel / develop transition | **Adapt** with CSS/WAAPI (no SplitText) | `Question` legend + `globals.css` `rv-*` |
| Chapter interlude (Regard I–V) | **Optional**: the user earlier preferred no chapter screens. Build behind a constant, off by default | new `Interlude` in `experience.tsx` |
| HUD (counter + 5 dots) | **Adapt** | `Question` header (keep `rv-film` as fallback) |
| Ambient WebGL background | **Rebuild light version**, lazy, opt-out on low-end/reduced motion | new `revelateur/ambient.tsx` (dynamic import) |
| Sound | **Adapt**: off by default, explicit toggle | new `revelateur/sound.ts` + toggle in the experience layout |
| Landing kinetic title | **Not needed**: intro « Les cinq regards » already built | — |
| Resume button with count | **Already covered** (welcome screen "Reprendre") | — |
| Summary grouped by series + filter | **Adapt**, labels only | `Recap` |
| Confirm dialog | Already built | — |
| `computeCartography`, archetypes, readings, thresholds, dimension names | **Reject** | — |
| `localStorage` persistence, Zustand store | **Reject** (server session) | — |
| Alt+Shift+D demo | **Reject** (use the e2e script / seed instead) | — |
| Google Fonts CDN | **Reject** (`next/font` already) | — |

---

## 6. Implementation spec

All work in `src/components/revelateur/` and `src/app/globals.css`; no change to `src/server/**` except where noted.
Each step is independently shippable to staging.

### 6.1 Scale: `ScaleColumns`

File: `src/components/revelateur/scale-columns.tsx` (client).

```ts
type Props = {
  name: string;                // `answer-${screen.id}`
  labels: readonly string[];   // SCALE_LABELS, from the server
  value: number | null;        // screen.value
  disabled: boolean;           // pending
  onChoose: (v: number) => void;
};
```

- Markup: a `<fieldset>` with **5 native `<input type="radio">`** (visually hidden) inside `<label>` columns.
  Native radios give arrow-key navigation, `checked` state and screen-reader semantics for free.
  Do not use `role="radio"` on buttons.
- Desktop (≥768 px): 5 vertical columns. Each column is a thin line (1 px, `--jg-light-gray`) with the label
  at the bottom. Hover/focus: the line brightens to `--jg-navy` and a soft ivory light rises
  (`linear-gradient` is banned by the brief → use an opacity-animated solid `--gold` at 12 %).
  Selected: line `--gold` 2 px, label navy semibold, small gold marker at the base.
- **All five columns have the same weight and colour at rest.** No blue→gold ramp.
- Mobile (<768 px): stacked rows (as today), same states.
- Choosing **never** moves on. It calls `onChoose`; "Suivante" stays the only way forward (existing logic,
  keys 1–5 + Enter, queued Enter while pending).
- `disabled` → `pointer-events-none opacity-60` (existing behaviour, keep it: it prevents a click landing on the previous statement).
- Motion: 150–250 ms transitions only; none under reduced motion.

### 6.2 Statement transition

- On a new `screen.id`, the legend enters with `rv-develop` (exists). Add an exit: keep the previous statement
  in a `aria-hidden` layer for 250 ms with `rv-out` while the new one develops in.
- Implement with a `key`ed wrapper + CSS, no SplitText. Per-word stagger is possible with
  `text.split(" ").map((w,i) => <span style={{animationDelay: i*25+"ms"}}>)` but must keep the text a single
  accessible string (`aria-label` on the legend, spans `aria-hidden`).
- Reduced motion: no exit layer, instant swap.

### 6.3 Chapter interlude (optional, off by default)

- `const CHAPTER_INTERLUDES = false;` in `experience.tsx`.
- Trigger: on `apply()`, when the new screen is a question with `number ∈ {7,13,19,25}` **and** it came from
  a forward move (`prev.kind === "question" && prev.number === number - 1`). Never on resume, back, or edits
  from the summary.
- Content: "Regard II / V" + the chapter label (`Deuxième regard`). Chapters = statements 1–6, 7–12…; **no
  dimension names**.
- Duration ≤ 1.8 s, skippable by click/Enter/Escape, a visible "Passer" button, focus returns to the legend.
  Reduced motion: skip entirely.
- Light palette: ivory veil, two navy hairlines sliding in (letterbox idea without black bars).

### 6.4 HUD

- Replace the 30-segment `rv-film` by 5 series indicators with 6 ticks each (filled = answered), current
  tick gold. Data: `screen.answered` and `screen.index` (already sent). Keep the text counter
  "Question NN / 30" and "n réponses enregistrées".

### 6.5 Sound (opt-in)

- `src/components/revelateur/sound.ts`: a small Web Audio synth (port the *idea* of `cinemaAudio.ts`, max
  3 sounds: soft tick on choice, low swell on interlude, chord on confirmation). No files.
- Default **off**. Toggle in the experience header ("Son : activé / désactivé", `aria-pressed`).
  Preference in `localStorage` key `jg_rv_sound` (a convenience, wrapped in try/catch).
- Create the `AudioContext` only after the toggle is switched on (user gesture).
- Never play under reduced motion unless the person switched it on explicitly.

### 6.6 Ambient background (light version)

- `src/components/revelateur/ambient.tsx`, loaded with `next/dynamic(() => import(...), { ssr: false })`
  so Three.js is not in the main bundle. Prefer **plain WebGL** (one full-screen triangle, ≈2 KB shader)
  over Three.js (≈150 KB gz).
- Look: ivory base, very slow champagne light drifting (low contrast), a gentle brightening toward the
  hovered/selected column. No shafts, motes, caustics, halos, dark base.
- Guards (all required):
  - not rendered if `prefers-reduced-motion: reduce`, `navigator.connection?.saveData`,
    `hardwareConcurrency <= 4`, or WebGL unavailable → plain ivory background;
  - DPR capped at 1, render at ≤30 fps, pause on `visibilitychange` and when the stage is off-screen;
  - `powerPreference: "low-power"`;
  - dispose on unmount.
- Interaction bridge: a module-level object `{ focus: number | null, pulse: number }` written by
  `ScaleColumns` (no React re-render), read by the render loop.

### 6.7 Summary grouped by series

- `Recap`: group `screen.items` by `Math.floor(index / 6)` with headers "Regard I … V" and an optional
  filter (buttons, `aria-pressed`). Labels only, **no statement wording** (until Jérémy decides otherwise).

### 6.8 Things that stay as they are

Intro « Les cinq regards », welcome texts, open question, confirm dialog, preparation animation
(`preparation.ts`), ownership footer, server actions, rate limit, cookie, 30-day resume.

---

## 7. Budgets

| Item | Budget |
|---|---|
| JS added to the experience route (initial) | ≤ 25 KB gz (no GSAP, no Three in the main chunk) |
| Ambient chunk (lazy) | ≤ 15 KB gz with plain WebGL |
| LCP on a mid-range phone (4G) | ≤ 2.5 s; first statement text visible without waiting for animations |
| GPU | ≤ 30 fps, DPR 1, paused when hidden |
| Interlude | ≤ 1.8 s, skippable |
| Each choice → "Suivante" enabled | ≤ 100 ms perceived (optimistic `value`, as today) |

---

## 8. Acceptance checklist (must all pass on staging)

Rules
- [ ] No automatic move after a choice (e2e: "no automatic move after a choice" stays green).
- [ ] Network: each question screen receives exactly one statement; no bundle contains other statements, the dimension map or reversed items (grep the built `.next/static` for Q11's wording → 0 hits).
- [ ] Summary shows labels only.
- [ ] Light palette only; no dark dominant background, glow, halo, gradient.
- [ ] Validated texts unchanged (intro lines, welcome, save notice, open question, preparation, © notice on every screen).
- [ ] Confirmation freezes and scores server-side (existing tests).

Motion and sound
- [ ] `prefers-reduced-motion: reduce`: no ambient canvas, no interlude, no transitions beyond opacity; e2e passes with `reducedMotion: "reduce"`.
- [ ] Sound off by default; no `AudioContext` created before the toggle.

Accessibility
- [ ] Scale operable by Tab + arrows + Space, keys 1–5, Enter; focus visible; labels read by screen readers.
- [ ] Text contrast ≥ 4.5:1 (body) on ivory.
- [ ] Interlude skippable by keyboard; focus returns to the statement.

Performance
- [ ] Budgets in §7 measured with Lighthouse mobile on staging.
- [ ] 375 px: no horizontal scroll (existing e2e).

Regression
- [ ] `npm test` (scoring 48, session 9) and the 12-check journey script green.

---

## 9. Suggested order

1. `ScaleColumns` + HUD (6.1, 6.4): the biggest change in feel, no new dependency.
2. Statement transition (6.2).
3. Summary grouping (6.7).
4. Sound toggle (6.5).
5. Ambient background (6.6), last, behind its guards.
6. Interlude (6.3) only if the decision in §10 is yes.

Each step: local e2e → commit on `feat/revelateur` → deploy to staging (remember: a staging redeploy turns
off the Vercel share link; re-enable "Anyone with the link" and send the new link).

---

## 10. Open points (for the supervisor / Jérémy)

These are facts that need a decision; no recommendation is implied.

1. **Palette.** The prototype is dark; dossier v2.0 §3 asks for a light palette and no halo effects. Options:
   (a) light adaptation as specified here; (b) a dark variant, which needs Jérémy's written change to §3.
2. **Chapter interludes.** Earlier in this project the chapter-screen version was set aside in favour of the
   plain flow. Options: keep off; turn on.
3. **Summary wording.** Prototype shows the statements; current build does not. Pending Jérémy's answer.
4. **Sound.** Options: no sound; opt-in sound as specified.
5. **Origin of the prototype content.** The invented dimension names, levels and archetypes in
   `revelateurData.ts` should be confirmed as not intended for use (they differ from annexe 02).
