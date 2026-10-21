import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { eventRegistrations, events } from "@/server/db/schema";
import { getCurrentUser } from "@/server/dal";
import { REGISTRATION_STATUS_LABEL, type RegistrationStatus } from "@/lib/events";

/** Attendee list as CSV (Excel-friendly: UTF-8 BOM, semicolons). Coach only. */
export async function GET(_request: Request, ctx: RouteContext<"/api/mes-evenements/[id]/export">) {
  const user = await getCurrentUser();
  if (!user || user.role !== "coach") return new Response("Non autorisé", { status: 401 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Introuvable", { status: 404 });
  const ev = await db.query.events.findFirst({ where: eq(events.id, id), columns: { slug: true } });
  if (!ev) return new Response("Introuvable", { status: 404 });

  const rows = await db.select().from(eventRegistrations).where(eq(eventRegistrations.eventId, id)).orderBy(asc(eventRegistrations.createdAt));
  const cell = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    // Quotes doubled; a leading = + - @ is neutralized so a spreadsheet never runs it as a formula.
    return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
  };
  const lines = [
    ["Prénom", "Nom", "E-mail", "Téléphone", "Structure", "Places", "Statut", "Présent", "Inscrit le"].map(cell).join(";"),
    ...rows.map((r) =>
      [
        r.firstName,
        r.lastName,
        r.email,
        r.phone,
        r.company,
        r.seats,
        REGISTRATION_STATUS_LABEL[r.status as RegistrationStatus] ?? r.status,
        r.attended ? "oui" : "",
        r.createdAt.toISOString().slice(0, 10),
      ]
        .map(cell)
        .join(";"),
    ),
  ];
  return new Response(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inscrits-${ev.slug}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
