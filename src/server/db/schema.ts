import { relations } from "drizzle-orm";
import {
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

/** Configurable pipeline stages (Nouveau → Appel découverte → ... ). */
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
    ...timestamps,
  },
  (t) => [index("contacts_stage_idx").on(t.stageId)],
);

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
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("EUR"),
  active: boolean("active").notNull().default(true),
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
    ...timestamps,
  },
  (t) => [index("documents_client_idx").on(t.clientId)],
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
}));
