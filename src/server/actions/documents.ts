"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { activityLog, clients, documents } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { contentMatchesExtension, deleteStoredFile, saveFile } from "@/server/storage";
import { ALLOWED_DOCUMENTS, MAX_DOCUMENT_BYTES } from "@/lib/validations/documents";
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
