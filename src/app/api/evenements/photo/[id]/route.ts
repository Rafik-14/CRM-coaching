import { getCurrentUser } from "@/server/dal";
import { getAnyPhoto, getPublicPhoto } from "@/server/queries/events";
import { readStoredFile } from "@/server/storage";

/**
 * Photos of conferences & workshops. Public once the event is published (gallery: once the recap is shown);
 * the coach can always see them (CRM previews).
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/evenements/photo/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Introuvable", { status: 404 });

  let photo: { storagePath: string } | null | undefined = await getPublicPhoto(id);
  let isPublic = !!photo;
  if (!photo) {
    const user = await getCurrentUser();
    if (user?.role === "coach") photo = await getAnyPhoto(id);
    isPublic = false;
  }
  if (!photo) return new Response("Introuvable", { status: 404 });

  let data: Buffer;
  try {
    data = await readStoredFile(photo.storagePath);
  } catch {
    return new Response("Fichier manquant", { status: 410 });
  }
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(data.length),
      "Cache-Control": isPublic ? "public, max-age=3600" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
