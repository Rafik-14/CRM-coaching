"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { activityLog, clients, coachingSessions, contacts, documents } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { contentMatchesExtension, deleteStoredFile, saveFile } from "@/server/storage";
import { ALLOWED_DOCUMENTS, MAX_DOCUMENT_BYTES, MAX_SCAN_PAGES, MAX_SCAN_PHOTO_BYTES } from "@/lib/validations/documents";
import { APP_TIME_ZONE, formatDayTime, fullName } from "@/lib/format";
import { scanPage } from "@/server/scanner/core";
import { buildScanPdf } from "@/server/scanner/pdf";
import type { ActionState } from "./coaching";

export async function uploadDocument(contactId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireCoach();
  // Hosts without persistent disk (e.g. the Vercel demo) can't keep uploaded files.
  if (process.env.DOCUMENTS_DISABLED === "true") {
    return { error: "Les documents sont désactivés sur cette version de démonstration." };
  }
  const id = z.uuid().parse(contactId);
  const client = await db.query.clients.findFirst({ where: eq(clients.contactId, id) });
  if (!client) return { error: "Ce contact n'est pas encore client." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choisissez un fichier." };
  if (file.size > MAX_DOCUMENT_BYTES) return { error: "Fichier trop lourd (10 Mo maximum)." };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = ALLOWED_DOCUMENTS[ext];
  if (!mimeType) return { error: "Type de fichier non autorisé (PDF, images, Word ou texte)." };

  const data = Buffer.from(await file.arrayBuffer());
  if (!contentMatchesExtension(data, ext)) return { error: "Le contenu du fichier ne correspond pas à son type." };

  // Random name on disk; the original name is only kept (sanitized) for display / download.
  const storagePath = `${crypto.randomUUID()}.${ext}`;
  const fileName = file.name.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 150);
  await saveFile(storagePath, data);
  await db.insert(documents).values({
    clientId: client.id,
    fileName,
    storagePath,
    mimeType,
    size: file.size,
    uploadedBy: user.id,
  });
  await db.insert(activityLog).values({ actorId: user.id, entity: "contact", entityId: id, action: "document_added" });
  refresh();
  return { ok: true };
}

export async function deleteDocument(documentId: string) {
  await requireCoach();
  const id = z.uuid().parse(documentId);
  const doc = await db.query.documents.findFirst({ where: eq(documents.id, id) });
  if (!doc) return;
  await db.delete(documents).where(eq(documents.id, id));
  await deleteStoredFile(doc.storagePath);
  refresh();
}

// ------------------------------------------------------------------ notes scanner

const scanSchema = z.object({
  title: z.string().trim().min(1, "Donnez un titre.").max(120, "120 caractères maximum."),
  keywords: z
    .string()
    .optional()
    .transform((v) =>
      [...new Set((v ?? "").split(/[,;]/).map((k) => k.trim().toLowerCase()).filter(Boolean))].slice(0, 8),
    )
    .refine((a) => a.every((k) => k.length <= 40), "40 caractères maximum par mot-clé."),
  sessionId: z
    .union([z.literal(""), z.literal("none"), z.uuid()])
    .optional()
    .transform((v) => (v && v !== "none" ? v : null)),
});

const dayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: APP_TIME_ZONE, day: "numeric", month: "long", year: "numeric" });

/**
 * « Scanner des notes »: photos of handwritten pages → straightened, cleaned pages → branded PDF
 * stored as a private document of the client (processing on our server only).
 */
export async function scanNotes(contactId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireCoach();
  if (process.env.DOCUMENTS_DISABLED === "true") {
    return { error: "Les documents sont désactivés sur cette version de démonstration." };
  }
  const id = z.uuid().parse(contactId);
  const contact = await db.query.contacts.findFirst({ where: eq(contacts.id, id), with: { client: true } });
  if (!contact?.client) return { error: "Ce contact n'est pas encore client." };

  const parsed = scanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
  const v = parsed.data;

  const photos = formData.getAll("pages").filter((f): f is File => f instanceof File && f.size > 0);
  if (photos.length === 0) return { error: "Ajoutez au moins une page." };
  if (photos.length > MAX_SCAN_PAGES) return { error: `${MAX_SCAN_PAGES} pages maximum par document.` };
  if (photos.some((f) => f.size > MAX_SCAN_PHOTO_BYTES)) return { error: "Une des photos est trop lourde." };

  const session = v.sessionId
    ? await db.query.coachingSessions.findFirst({
        where: and(eq(coachingSessions.id, v.sessionId), eq(coachingSessions.contactId, id)),
      })
    : null;

  let pdf: Buffer;
  try {
    const pages = [];
    for (const photo of photos) {
      const data = Buffer.from(await photo.arrayBuffer());
      if (!["jpg", "png", "webp"].some((ext) => contentMatchesExtension(data, ext))) {
        return { error: "Seules les photos (JPEG, PNG, WebP) sont acceptées." };
      }
      pages.push(await scanPage(data));
    }
    pdf = await buildScanPdf(
      {
        title: v.title,
        clientName: fullName(contact),
        dateLabel: dayFmt.format(new Date()),
        sessionLabel: session ? `${session.type} · ${formatDayTime(session.startsAt)}` : null,
        keywords: v.keywords,
      },
      pages,
    );
  } catch (error) {
    console.error("[scanner]", error);
    return { error: "Le traitement des photos a échoué. Réessayez avec des photos plus nettes." };
  }

  const storagePath = `${crypto.randomUUID()}.pdf`;
  const fileName = `${v.title.replace(/[^\p{L}\p{N} _-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 100) || "Notes"}.pdf`;
  await saveFile(storagePath, pdf);
  await db.insert(documents).values({
    clientId: contact.client.id,
    fileName,
    storagePath,
    mimeType: "application/pdf",
    size: pdf.length,
    uploadedBy: user.id,
    title: v.title,
    keywords: v.keywords,
    sessionId: session?.id ?? null,
    source: "scan",
  });
  await db.insert(activityLog).values({ actorId: user.id, entity: "contact", entityId: id, action: "notes_scanned" });
  refresh();
  return { ok: true, message: `PDF créé : ${photos.length} page${photos.length > 1 ? "s" : ""} nettoyée${photos.length > 1 ? "s" : ""}.` };
}
