import { exportContacts } from "@/server/queries/contacts";
import { countryLabel, segmentLabel, subSegmentLabel } from "@/lib/jg";

// Neutralize spreadsheet formulas (CSV injection) and quote every cell.
function cell(value: unknown) {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rows = await exportContacts({
    q: url.searchParams.get("q") ?? undefined,
    stage: url.searchParams.get("etape") ?? undefined,
    segment: url.searchParams.get("profil") ?? undefined,
  });

  const header = ["Prénom", "Nom", "E-mail", "Téléphone", "Étape", "Source", "Type de client", "Situation", "Organisation", "Pays", "Enjeu", "Moment décisif", "Valeur estimée", "Devise", "Tags", "Ajouté le"];
  const lines = rows.map((r) =>
    [
      r.firstName,
      r.lastName,
      r.email,
      r.phone,
      r.stageName,
      r.source,
      segmentLabel(r.segment),
      subSegmentLabel(r.subSegment),
      r.organization,
      countryLabel(r.country),
      r.stake,
      r.keyMomentAt?.toLocaleDateString("fr-FR"),
      r.estimatedValue ? Number(r.estimatedValue).toFixed(2).replace(".", ",") : "",
      r.currency,
      r.tags.join(", "),
      r.createdAt.toLocaleDateString("fr-FR"),
    ]
      .map(cell)
      .join(";"),
  );

  // BOM + semicolons so Excel (French locale) opens it correctly.
  const body = "﻿" + [header.map(cell).join(";"), ...lines].join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contacts-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
