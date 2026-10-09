import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { activityLog, coachingSessions, contacts } from "@/server/db/schema";

export type TimelineEvent = {
  id: string;
  at: Date;
  kind: "created" | "session_done" | "session_planned" | "session_cancelled" | "stage" | "closed" | "update";
  title: string;
  description?: string;
  latest?: boolean;
};

const actionLabels: Record<string, { title: string; kind: TimelineEvent["kind"] }> = {
  updated: { title: "Fiche mise à jour", kind: "update" },
  stage_changed: { title: "Étape modifiée", kind: "stage" },
  session_scheduled: { title: "Séance planifiée", kind: "session_planned" },
  coaching_finished: { title: "Accompagnement terminé", kind: "closed" },
  coaching_paused: { title: "Accompagnement mis en pause", kind: "closed" },
  coaching_stopped: { title: "Accompagnement arrêté", kind: "closed" },
  coaching_reopened: { title: "Accompagnement repris", kind: "stage" },
  session_rescheduled: { title: "Séance reprogrammée", kind: "update" },
  note_saved: { title: "Note de séance rédigée", kind: "update" },
  package_assigned: { title: "Forfait attribué", kind: "stage" },
  goal_created: { title: "Objectif ajouté", kind: "update" },
  document_added: { title: "Document ajouté", kind: "update" },
  created_from_site: { title: "Contact créé via le formulaire du site", kind: "created" },
  site_form_message: { title: "Nouveau message via le site", kind: "update" },
};

/** Merged history of a contact. Callers must have checked authorization (requireCoach). */
export async function buildTimeline(contactId: string, limit = 12): Promise<TimelineEvent[]> {
  const [contact, logs, sessions] = await Promise.all([
    db.query.contacts.findFirst({ where: eq(contacts.id, contactId), columns: { createdAt: true } }),
    db.query.activityLog.findMany({
      where: and(eq(activityLog.entity, "contact"), eq(activityLog.entityId, contactId)),
      orderBy: desc(activityLog.createdAt),
      limit: 30,
    }),
    db
      .select({ session: coachingSessions })
      .from(coachingSessions)
      .where(eq(coachingSessions.contactId, contactId))
      .orderBy(desc(coachingSessions.startsAt))
      .limit(20),
  ]);

  const notes = sessions.length
    ? await db.query.sessionNotes.findMany({
        where: (n, { inArray }) => inArray(n.sessionId, sessions.map((s) => s.session.id)),
      })
    : [];
  const noteBySession = new Map(notes.map((n) => [n.sessionId, n]));

  const events: TimelineEvent[] = [];

  for (const { session: s } of sessions) {
    const subject = noteBySession.get(s.id)?.templateData?.["Sujet de la séance"];
    if (s.status === "done") {
      events.push({ id: s.id, at: s.startsAt, kind: "session_done", title: "Séance effectuée", description: subject });
    } else if (s.status === "planned") {
      events.push({
        id: s.id,
        at: s.startsAt,
        kind: "session_planned",
        title: s.startsAt > new Date() ? "Séance à venir" : "Séance prévue",
        description: `${s.type} · ${s.location ?? "—"}${s.agenda ? ` — ${s.agenda}` : ""}`,
      });
    } else {
      events.push({
        id: s.id,
        at: s.startsAt,
        kind: "session_cancelled",
        title: s.status === "no_show" ? "Absence" : "Séance annulée",
      });
    }
  }

  for (const log of logs) {
    // Sessions already appear from the sessions table.
    if (log.action === "created" || log.action === "session_scheduled") continue;
    const label = actionLabels[log.action];
    if (label) events.push({ id: log.id, at: log.createdAt, kind: label.kind, title: label.title });
  }

  if (contact) events.push({ id: `created-${contactId}`, at: contact.createdAt, kind: "created", title: "Contact ajouté" });

  const sorted = events.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
  const now = Date.now();
  const latest = sorted.find((e) => e.at.getTime() <= now);
  if (latest) latest.latest = true;
  return sorted;
}
