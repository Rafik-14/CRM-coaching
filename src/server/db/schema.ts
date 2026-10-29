import { relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ---------------------------------------------------------------------------
// Auth (Better Auth core tables). `role` is an additional field on user.
// ---------------------------------------------------------------------------

export const userRole = pgEnum("user_role", ["coach", "client"]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: userRole("role").notNull().default("client"),
  ...timestamps,
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// ---------------------------------------------------------------------------
// CRM
// ---------------------------------------------------------------------------

/** Configurable pipeline stages (Nouveau contact → Échange stratégique planifié → ... ). */
export const pipelineStages = pgTable("pipeline_stages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  position: integer("position").notNull(),
  color: text("color").notNull().default("slate"),
  /** Moving a contact to a stage flagged `isClient` turns them into a client. */
  isClient: boolean("is_client").notNull().default(false),
  ...timestamps,
});

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull().default(""),
    email: text("email"),
    phone: text("phone"),
    source: text("source"),
    stageId: uuid("stage_id").references(() => pipelineStages.id, { onDelete: "set null" }),
    /** When the contact entered its current stage (for the "days in stage" badge). */
    stageChangedAt: timestamp("stage_changed_at", { withTimezone: true }).notNull().defaultNow(),
    /** Expected value of the coaching deal (e.g. the package they're interested in). */
    estimatedValue: numeric("estimated_value", { precision: 10, scale: 2 }),
    tags: text("tags").array().notNull().default([]),
    notes: text("notes"),
    /** JG® audience: particulier · entrepreneur · entreprise · cabinet_rh · ecole. */
    segment: text("segment"),
    /** For particuliers: etudiant · recherche_emploi · reconversion. */
    subSegment: text("sub_segment"),
    /** Company, HR firm or school name. */
    organization: text("organization"),
    /** Partner (HR firm, school…) who referred this contact. */
    referredByContactId: uuid("referred_by_contact_id").references((): AnyPgColumn => contacts.id, {
      onDelete: "set null",
    }),
    /** FR · CH — decides the price list (EUR / CHF) when an offer is sold. */
    country: text("country"),
    currency: text("currency").notNull().default("EUR"),
    /** The contact's stake (« enjeu »): Entretien, Pitch, Reconversion… */
    stake: text("stake"),
    /** Date of the decisive moment (interview, pitch…), for reminders. */
    keyMomentAt: timestamp("key_moment_at", { withTimezone: true }),
    /** No non-essential e-mails (follow-ups, thank-you…); reminders and confirmations still go out. */
    emailOptOut: boolean("email_opt_out").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("contacts_stage_idx").on(t.stageId),
    index("contacts_referred_by_idx").on(t.referredByContactId),
  ],
);

export type CaseStudy = { before?: string; trigger?: string; after?: string; changes?: string[] };

export const clientStatus = pgEnum("client_status", ["active", "paused", "finished", "stopped"]);

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id")
    .notNull()
    .unique()
    .references(() => contacts.id, { onDelete: "cascade" }),
  /** Linked portal account (Phase 3). */
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  startDate: timestamp("start_date", { withTimezone: true }).notNull().defaultNow(),
  status: clientStatus("status").notNull().default("active"),
  mainGoal: text("main_goal"),
  /** Set when the coaching is closed (finished / stopped / paused). */
  closedAt: timestamp("closed_at", { withTimezone: true }),
  closeReason: text("close_reason"),
  closeNote: text("close_note"),
  /** « Formulation de positionnement » — highlighted at the top of the client file. */
  positioningStatement: text("positioning_statement"),
  /** Case study written when the coaching ends: Avant / Le déclic / Après / Ce qui a changé. */
  caseStudy: jsonb("case_study").$type<CaseStudy>(),
  /** The client agreed to be used as an (anonymised) case study. */
  testimonialConsent: boolean("testimonial_consent").notNull().default(false),
  ...timestamps,
});

export const sessionStatus = pgEnum("coaching_session_status", [
  "planned",
  "done",
  "cancelled",
  "no_show",
]);

export const coachingSessions = pgTable(
  "coaching_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Every session belongs to a contact (prospects can have discovery calls). */
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    /** Set when the contact is a client (coaching sessions). */
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
    /** Package this session was counted against once marked "done" (so it can be un-counted). */
    clientPackageId: uuid("client_package_id").references(() => clientPackages.id, { onDelete: "set null" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    durationMin: integer("duration_min").notNull().default(60),
    type: text("type").notNull().default("Séance individuelle"),
    status: sessionStatus("status").notNull().default("planned"),
    location: text("location"),
    /** Agenda / preparation notes entered when scheduling. */
    agenda: text("agenda"),
    /** Reminder e-mails already sent for the current date (cleared when the session moves). */
    reminder24hSentAt: timestamp("reminder_24h_sent_at", { withTimezone: true }),
    reminder1hSentAt: timestamp("reminder_1h_sent_at", { withTimezone: true }),
    /** coach = planned in the CRM · online = booked by the person (site, client link). */
    bookedVia: text("booked_via").notNull().default("coach"),
    ...timestamps,
  },
  (t) => [
    index("coaching_sessions_contact_idx").on(t.contactId),
    index("coaching_sessions_client_idx").on(t.clientId),
    index("coaching_sessions_starts_idx").on(t.startsAt),
  ],
);

export const noteTemplates = pgTable("note_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** Ordered list of field labels, e.g. ["Sujet", "Prises de conscience", ...]. */
  fields: jsonb("fields").$type<string[]>().notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  /** Used automatically for sessions of this type (e.g. « Échange stratégique »). */
  sessionType: text("session_type"),
  ...timestamps,
});

export const sessionNotes = pgTable("session_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .unique()
    .references(() => coachingSessions.id, { onDelete: "cascade" }),
  content: text("content"),
  /** Answers keyed by template field label. */
  templateData: jsonb("template_data").$type<Record<string, string>>(),
  nextSteps: text("next_steps"),
  /** Private notes are never shown in the client portal. */
  private: boolean("private").notNull().default(true),
  ...timestamps,
});

export const goalStatus = pgEnum("goal_status", ["active", "achieved", "abandoned"]);

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    progress: integer("progress").notNull().default(0),
    dueDate: timestamp("due_date", { withTimezone: true }),
    status: goalStatus("status").notNull().default("active"),
    ...timestamps,
  },
  (t) => [index("goals_client_idx").on(t.clientId)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    done: boolean("done").notNull().default(false),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("tasks_due_idx").on(t.dueAt)],
);

export const packages = pgTable("packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  sessionsCount: integer("sessions_count").notNull(),
  /** Price in EUR. */
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  priceChf: numeric("price_chf", { precision: 10, scale: 2 }),
  /** Legacy single currency (before EUR/CHF price lists); not used for display any more. */
  currency: text("currency").notNull().default("EUR"),
  active: boolean("active").notNull().default(true),
  /** Display order (01 / 02 / 03). */
  position: integer("position").notNull().default(0),
  tagline: text("tagline"),
  description: text("description"),
  /** What's included, e.g. « Workbook Signature JG® ». */
  includes: text("includes").array().notNull().default([]),
  /** Session note template used for this offer. */
  noteTemplateId: uuid("note_template_id").references(() => noteTemplates.id, { onDelete: "set null" }),
  /** Goals created automatically when the offer is sold. */
  goalPresets: text("goal_presets").array().notNull().default([]),
  ...timestamps,
});

export const paymentStatus = pgEnum("payment_status", ["pending", "partial", "paid"]);

export const clientPackages = pgTable(
  "client_packages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    packageId: uuid("package_id")
      .notNull()
      .references(() => packages.id, { onDelete: "restrict" }),
    sessionsUsed: integer("sessions_used").notNull().default(0),
    /** Price and currency at the time of sale (later price changes never rewrite history). */
    price: numeric("price", { precision: 10, scale: 2 }),
    currency: text("currency"),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
    paymentStatus: paymentStatus("payment_status").notNull().default("pending"),
    ...timestamps,
  },
  (t) => [index("client_packages_client_idx").on(t.clientId)],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    storagePath: text("storage_path").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    uploadedBy: text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
    /** Display name chosen by the coach (« Séance 3 – posture »); falls back to fileName. */
    title: text("title"),
    /** Search words (« posture », « pitch »). */
    keywords: text("keywords").array().notNull().default([]),
    /** Session the notes belong to (scanned notes). */
    sessionId: uuid("session_id").references(() => coachingSessions.id, { onDelete: "set null" }),
    /** upload = file added as is · scan = notes photographed and cleaned by the scanner. */
    source: text("source").notNull().default("upload"),
    ...timestamps,
  },
  (t) => [index("documents_client_idx").on(t.clientId), index("documents_session_idx").on(t.sessionId)],
);

export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("activity_log_entity_idx").on(t.entity, t.entityId)],
);

export const emailStatus = pgEnum("email_status", ["queued", "sent", "failed"]);

/** Every e-mail the app sends (or tries to): shown in the contact history and in Paramètres › E-mails. */
export const emailLog = pgTable(
  "email_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    /** Intended recipient (before any test redirection). */
    to: text("to").notNull(),
    /** Where it really went when MAIL_REDIRECT_TO was set (tests). */
    redirectedTo: text("redirected_to"),
    /** booking_confirmation, coach_new_booking, contact_ack, coach_new_message, test… */
    templateKey: text("template_key").notNull(),
    subject: text("subject").notNull(),
    status: emailStatus("status").notNull().default("queued"),
    error: text("error"),
    providerId: text("provider_id"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("email_log_contact_idx").on(t.contactId), index("email_log_created_idx").on(t.createdAt)],
);

/** The coach's wording of an automatic e-mail; no row = the default text in src/lib/email-templates.ts. */
export const emailTemplates = pgTable("email_templates", {
  key: text("key").primaryKey(),
  subject: text("subject").notNull(),
  heading: text("heading").notNull(),
  body: text("body").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * E-mails to send later (sequences: follow-up, welcome, last session, thank-you). `dedupe_key` is unique,
 * so one event never schedules the same e-mail twice; the cron job sends them when due.
 */
export const scheduledEmails = pgTable(
  "scheduled_emails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    templateKey: text("template_key").notNull(),
    sendAt: timestamp("send_at", { withTimezone: true }).notNull(),
    /** pending → sending → sent · skipped (no longer relevant) · cancelled (by the coach) · failed */
    status: text("status").notNull().default("pending"),
    dedupeKey: text("dedupe_key").notNull().unique(),
    payload: jsonb("payload").$type<Record<string, string>>().notNull().default({}),
    attempts: integer("attempts").notNull().default(0),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    /** Why it was skipped or failed. */
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("scheduled_emails_due_idx").on(t.status, t.sendAt), index("scheduled_emails_contact_idx").on(t.contactId)],
);

/**
 * Intake questionnaire sent to a contact (link /questionnaire/<token>) and their answers. One row per link;
 * answers keep a copy of each question so later edits of the questionnaire never change them.
 */
export const intakeResponses = pgTable(
  "intake_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    /** The access_tokens row of the link. */
    tokenId: uuid("token_id").references(() => accessTokens.id, { onDelete: "set null" }),
    answers: jsonb("answers").$type<{ id: string; label: string; type: string; value: string | string[] }[]>(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    /** When the person accepted that their answers are kept (privacy policy). */
    consentAt: timestamp("consent_at", { withTimezone: true }),
  },
  (t) => [index("intake_responses_contact_idx").on(t.contactId)],
);

/**
 * One-off changes to the weekly availability, added whenever plans change (Paramètres › Réservation en ligne):
 * days off / blocked hours, or extra opening hours. Dates are calendar days in the coach's time zone.
 */
export const availabilityExceptions = pgTable(
  "availability_exceptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** blocked = not available · extra = available on top of the weekly hours */
    kind: text("kind").notNull().default("blocked"),
    /** YYYY-MM-DD, inclusive. */
    startsOn: text("starts_on").notNull(),
    endsOn: text("ends_on").notNull(),
    /** HH:MM; both empty = the whole day (blocked only). */
    startTime: text("start_time"),
    endTime: text("end_time"),
    /** Private note (« Vacances », « Formation »…), never shown on the site. */
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("availability_exceptions_ends_idx").on(t.endsOn)],
);

/**
 * Private links (no login): manage a booking (/rdv/…), the coach's calendar feed, a client's booking link.
 * Only the SHA-256 of the token is stored; the token itself is an HMAC of the row id with the server secret,
 * so the CRM can show a link again but a copy of the database alone opens nothing.
 */
export const accessTokens = pgTable(
  "access_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** manage · calendar_feed · client_booking · unsubscribe · questionnaire · event_registration */
    purpose: text("purpose").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    sessionId: uuid("session_id").references(() => coachingSessions.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
    /** Private link of a seat booked for an event (/inscription/<token>). */
    registrationId: uuid("registration_id").references((): AnyPgColumn => eventRegistrations.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("access_tokens_session_idx").on(t.sessionId), index("access_tokens_contact_idx").on(t.contactId)],
);

// ---------------------------------------------------------------------------
// Conferences & workshops (docs/technical/plans/EVENTS-PLAN.md). No payment: the price is only a text shown on the site.
// ---------------------------------------------------------------------------

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Public address /evenements/<slug>, generated from the title. */
    slug: text("slug").notNull().unique(),
    /** conference · workshop */
    kind: text("kind").notNull().default("conference"),
    title: text("title").notNull(),
    summary: text("summary"),
    description: text("description"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    /** Address of the room; empty for an online event. */
    location: text("location"),
    /** Video link, sent to registered people only (never shown on the public page). */
    onlineUrl: text("online_url"),
    /** Seats available; null = no limit. */
    capacity: integer("capacity"),
    maxSeatsPerBooking: integer("max_seats_per_booking").notNull().default(4),
    /** « Gratuit », « 20 € à régler sur place »… Information only. */
    priceText: text("price_text"),
    /** Association, company or school hosting the event (optional, shown when filled). */
    partner: text("partner"),
    /** entreprises · ecoles · associations · tous */
    audience: text("audience"),
    /** draft · published · cancelled */
    status: text("status").notNull().default("draft"),
    registrationOpen: boolean("registration_open").notNull().default(true),
    waitlistEnabled: boolean("waitlist_enabled").notNull().default(true),
    /** Past event without online registrations (talks given before the website). */
    manualHistory: boolean("manual_history").notNull().default(false),
    /** Recap after the event (« compte rendu »), shown on its page when showRecap is on. */
    recap: text("recap"),
    participantsShown: integer("participants_shown"),
    videoUrl: text("video_url"),
    showRecap: boolean("show_recap").notNull().default(false),
    ...timestamps,
  },
  (t) => [index("events_starts_idx").on(t.startsAt), index("events_status_idx").on(t.status)],
);

export const eventRegistrations = pgTable(
  "event_registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull().default(""),
    email: text("email").notNull(),
    phone: text("phone"),
    company: text("company"),
    seats: integer("seats").notNull().default(1),
    /** confirmed · waitlist · cancelled */
    status: text("status").notNull().default("confirmed"),
    attended: boolean("attended").notNull().default(false),
    /** site · manual */
    source: text("source").notNull().default("site"),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    thanksSentAt: timestamp("thanks_sent_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("event_registrations_event_idx").on(t.eventId, t.status),
    index("event_registrations_contact_idx").on(t.contactId),
  ],
);

export const eventPhotos = pgTable(
  "event_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    /** cover (one per event) · gallery */
    kind: text("kind").notNull().default("gallery"),
    storagePath: text("storage_path").notNull(),
    width: integer("width"),
    height: integer("height"),
    caption: text("caption"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("event_photos_event_idx").on(t.eventId)],
);

export const eventQuotes = pgTable("event_quotes", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  /** « Participante, atelier du 12 novembre » — never a full name without consent. */
  author: text("author"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const pipelineStagesRelations = relations(pipelineStages, ({ many }) => ({
  contacts: many(contacts),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  stage: one(pipelineStages, { fields: [contacts.stageId], references: [pipelineStages.id] }),
  referredBy: one(contacts, {
    fields: [contacts.referredByContactId],
    references: [contacts.id],
    relationName: "referrals",
  }),
  referrals: many(contacts, { relationName: "referrals" }),
  client: one(clients),
  tasks: many(tasks),
  sessions: many(coachingSessions),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  contact: one(contacts, { fields: [clients.contactId], references: [contacts.id] }),
  sessions: many(coachingSessions),
  goals: many(goals),
  packages: many(clientPackages),
  documents: many(documents),
}));

export const coachingSessionsRelations = relations(coachingSessions, ({ one }) => ({
  contact: one(contacts, { fields: [coachingSessions.contactId], references: [contacts.id] }),
  client: one(clients, { fields: [coachingSessions.clientId], references: [clients.id] }),
  clientPackage: one(clientPackages, {
    fields: [coachingSessions.clientPackageId],
    references: [clientPackages.id],
  }),
  note: one(sessionNotes),
}));

export const sessionNotesRelations = relations(sessionNotes, ({ one }) => ({
  session: one(coachingSessions, {
    fields: [sessionNotes.sessionId],
    references: [coachingSessions.id],
  }),
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  client: one(clients, { fields: [goals.clientId], references: [clients.id] }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  contact: one(contacts, { fields: [tasks.contactId], references: [contacts.id] }),
}));

export const clientPackagesRelations = relations(clientPackages, ({ one }) => ({
  client: one(clients, { fields: [clientPackages.clientId], references: [clients.id] }),
  package: one(packages, { fields: [clientPackages.packageId], references: [packages.id] }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  client: one(clients, { fields: [documents.clientId], references: [clients.id] }),
  session: one(coachingSessions, { fields: [documents.sessionId], references: [coachingSessions.id] }),
}));

export const packagesRelations = relations(packages, ({ one }) => ({
  noteTemplate: one(noteTemplates, { fields: [packages.noteTemplateId], references: [noteTemplates.id] }),
}));

export const emailLogRelations = relations(emailLog, ({ one }) => ({
  contact: one(contacts, { fields: [emailLog.contactId], references: [contacts.id] }),
}));

export const eventsRelations = relations(events, ({ many }) => ({
  registrations: many(eventRegistrations),
  photos: many(eventPhotos),
  quotes: many(eventQuotes),
}));

export const eventRegistrationsRelations = relations(eventRegistrations, ({ one }) => ({
  event: one(events, { fields: [eventRegistrations.eventId], references: [events.id] }),
  contact: one(contacts, { fields: [eventRegistrations.contactId], references: [contacts.id] }),
}));

export const eventPhotosRelations = relations(eventPhotos, ({ one }) => ({
  event: one(events, { fields: [eventPhotos.eventId], references: [events.id] }),
}));

export const eventQuotesRelations = relations(eventQuotes, ({ one }) => ({
  event: one(events, { fields: [eventQuotes.eventId], references: [events.id] }),
}));
