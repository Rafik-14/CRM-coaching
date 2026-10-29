# Conferences & workshops (« Événements ») · Implementation plan

> **Request (Jérémy, Oct. 2026):** a part of the website presenting his upcoming conferences and workshops, where
> people book a seat directly, linked to the CRM.
> **Constraint:** no payment method anywhere (no business status yet). A price can be *shown* as information
> (« Gratuit », « 20 € à régler sur place »), never collected online.
> Client-facing text in French.

---

## 1. Visitor journey (website)

1. **/evenements** — upcoming events as cards: type (Conférence / Atelier), date and time, place or « En ligne »,
   short description, price text, seats left (« Plus que 4 places », « Complet »). Past events below, with photos.
   Link in the main navigation and a block on the home page when an event is coming.
2. **/evenements/[slug]** — the event page: full description, what people will get out of it, practical details,
   map link or « lien envoyé avant l’événement », and the **booking form**:
   first name, last name, e-mail, phone (optional), company (optional, for company events), number of seats
   (1–N, capped), consent line (RGPD). Same anti-spam protections as the contact form (honeypot, rate limit).
3. **Confirmation page + e-mail** with the details, an « Ajouter à mon agenda » file (.ics) and a private link.
4. **Private link /inscription/[token]** — see the booking, cancel it in one click (frees the seat).
5. **Reminder e-mail the day before** (with the online link or the address).
6. **Full event** — the form becomes « Rejoindre la liste d’attente ». When a seat frees up, the first person on the
   list is moved in automatically and receives an e-mail.
7. **After the event** — a thank-you e-mail the next day (optional, editable), with a link to book the free
   « échange stratégique ».

## 2. Jérémy’s side (CRM)

New menu item **« Événements »**:

- **List**: upcoming / past / drafts, with registrations vs capacity (« 18 / 25 »), waiting list count.
- **Create / edit**: title, type, date, start and end time, place (address) or online link, description, picture,
  capacity, price text, partner organisation (association, company — optional), registration open/closed,
  published or draft. The page address (slug) is generated from the title.
- **Attendees** of an event: name, e-mail, phone, seats, status (inscrit, liste d’attente, annulé), registration
  date. Actions: tick « présent » on the day, add someone by hand, cancel a registration, export the list (CSV),
  send a message to all attendees (uses the existing e-mail system and templates).
- **Cancel an event**: everyone registered receives a cancellation e-mail.
- **Paramètres › E-mails**: the new automatic e-mails appear with the others (preview, edit, on/off).

## 3. How it connects to the rest of the CRM

| Website action | What happens in the CRM |
|---|---|
| Someone registers | Contact found by e-mail or created (`findOrCreateSiteContact`, already used by the contact and booking forms), with source **« Événement »** and the event name. Existing contacts are not duplicated. |
| — | A line in the contact’s history: « Inscrit à : Conférence … (12 nov.) ». |
| — | New contacts enter the pipeline at the first stage, like other website leads; notification + bell, like online bookings. |
| Present at the event | Tick « présent » → history line « A participé à … ». The contact page shows the events attended. |
| Thank-you e-mail | Invites people to book an « échange stratégique » — the existing booking flow takes over. |
| Analyses | Registrations and attendance rate per event; contacts coming from events and how many became clients (the existing « conversion by source » view counts them automatically). |
| Calendrier | Events appear in the CRM calendar and in Jérémy’s phone agenda (existing private calendar feed). Booking slots for the « échange stratégique » are blocked during an event. |

## 3 bis. History of past events (« Ils m’ont fait confiance »)

Past conferences and workshops are proof of experience — useful when Jérémy approaches companies.

**On the website**
- **/evenements** shows the upcoming events first, then **« Événements passés »**: newest first, with a « Voir plus »
  button when the list grows.
- Each past event keeps its own page, switched to a **recap**: date, place, partner organisation (with its name
  or logo if allowed), a short summary of what happened, a **photo gallery**, optional quotes from participants,
  optional number of participants (« 40 participants »), optional video link.
- Registration is closed automatically once the event has started; the page stays online as a reference.
- Filters when there are enough events: Conférences / Ateliers, and by audience (entreprises, écoles,
  associations).
- Optional block on the home page and on « Pour qui ? »: the three latest past events as proof.

**In the CRM**
- Past events stay in « Événements › Passés » with their attendee list, attendance rate and the contacts they
  brought (nothing is deleted).
- **« Ajouter le compte rendu »** after an event: summary, photos (several at once, resized automatically),
  participant quotes, number of participants to display, show / hide on the website.
- **Past events from before the website**: Jérémy can add the talks he already gave for associations and
  organisations — date, place, partner, summary, photos — without any registrations. They appear in the
  history like the others.
- Privacy: attendee names are never shown publicly; photos and quotes are published only when Jérémy ticks
  « afficher sur le site » (he is responsible for having the participants’ agreement).

## 4. Data model (migration 0014, additive)

- `events`: id, slug (unique), kind (conference · workshop), title, summary, description, image path, starts_at,
  ends_at, location, online_url, capacity, max_seats_per_booking, price_text, partner, audience, status (draft ·
  published · cancelled), registration_open, recap (summary text), participants_shown, video_url, show_recap,
  created_at, updated_at. Past events added by hand simply have no registrations.
- `event_registrations`: id, event_id, contact_id, first/last name, e-mail, phone, company, seats, status
  (confirmed · waitlist · cancelled), attended, source (site · manual), created_at, cancelled_at.
  Unique (event_id, e-mail) for active registrations — the same person registering twice updates their booking.
- `access_tokens`: new purpose `event_registration` (private cancel link), same hashed-token system as today.
- `event_photos`: id, event_id, file path, caption, position (gallery order). `event_quotes`: id, event_id, text,
  author label (« Participante, atelier du 12 nov. »), shown.
- E-mail templates: `event_confirmation`, `event_waitlist`, `event_seat_available`, `event_reminder`,
  `event_cancelled`, `event_thanks`.

Seat counting is done in one transaction with a row lock on the event (same approach as `lockAndCheckSlot` for
bookings), so two people can never take the last seat at the same time.

## 5. Scheduled jobs (existing cron entry point)

- `eventReminders`: the day before, once per registration (atomic claim, like session reminders).
- `eventThanks`: the day after, for people marked present (or all confirmed, setting).
- Waiting-list promotion runs immediately when a registration is cancelled (no job needed).

## 6. Milestones

| # | Content | Done when |
|---|---|---|
| E1 | Tables, CRM « Événements » (create / edit / publish / cancel), attendee list, manual add, CSV | Jérémy can create an event and manage a list by hand |
| E2 | Public pages, booking form, contact creation, confirmation e-mail + .ics, private cancel link | A visitor books a seat and appears in the CRM |
| E3 | Waiting list, reminder, thank-you e-mail, attendance, calendar + analytics, home-page block | The full loop runs on its own |
| E4 | History: past events section and recap pages, « Ajouter le compte rendu » (photos, quotes), adding past events from before the website, filters | Jérémy can show his past conferences as references |

Each milestone: tests (seat counting under concurrency, waiting list, duplicates, tokens), typecheck, lint,
build, mobile check of the public pages, commit.

## 7. Decisions for Jérémy (defaults used until he answers)

| Question | Default |
|---|---|
| Conferences, workshops, or both? | Both (a « type » field) |
| In a room, online, or both? | Both (address or online link per event) |
| Free or paid on the day? | Price shown as text only; nothing collected online |
| Typical number of seats? | Set per event; « Plus que N places » shown under 5 |
| Waiting list? | Yes |
| Information asked | Name, e-mail; phone and company optional |
| Several seats per booking? | Yes, up to 4 |
| Thank-you e-mail after the event? | Yes, editable, can be switched off |
| Which past talks to add, with photos and partner names? | Added by Jérémy in the CRM when he has them |
| Show partner logos / participant numbers publicly? | Only when ticked per event |

## 8. Out of scope

- Online payment or tickets (no business status — see the billing decision of Oct. 2026).
- Multi-date workshops sold as one series (each date is its own event for now).
- Video-conference hosting (the online link is whatever tool Jérémy uses).
