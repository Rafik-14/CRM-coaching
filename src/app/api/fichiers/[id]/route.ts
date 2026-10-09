import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { documents } from "@/server/db/schema";
import { getCurrentUser } from "@/server/dal";
import { readStoredFile } from "@/server/storage";

/** Permission-checked download of a client document. */
export async function GET(request: Request, ctx: RouteContext<"/api/fichiers/[id]">) {
  const user = await getCurrentUser();
  if (!user || user.role !== "coach") return new Response("Non autorisé", { status: 401 });

  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Introuvable", { status: 404 });
  const doc = await db.query.documents.findFirst({ where: eq(documents.id, id) });
  if (!doc) return new Response("Introuvable", { status: 404 });

  let data: Buffer;
  try {
    data = await readStoredFile(doc.storagePath);
  } catch {
    return new Response("Fichier manquant", { status: 410 });
  }

  // Images and PDFs may open in the browser (?apercu=1); everything else is downloaded.
  const preview = new URL(request.url).searchParams.has("apercu") && /^(image\/|application\/pdf)/.test(doc.mimeType);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(data.length),
      "Content-Disposition": `${preview ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
