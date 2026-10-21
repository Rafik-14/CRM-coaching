import { connection } from "next/server";
import { getRegistrationByToken } from "@/server/queries/events";
import { eventIcs } from "@/server/event-mail";

/** « Ajouter à mon agenda »: the event as a calendar file, for the person behind the private link. */
export async function GET(_request: Request, ctx: RouteContext<"/inscription/[token]/agenda">) {
  await connection();
  const { token } = await ctx.params;
  const reg = await getRegistrationByToken(token);
  if (!reg || reg.status !== "confirmed") return new Response("Lien invalide", { status: 404 });
  return new Response(eventIcs(reg.event, reg.id, reg.event.status === "cancelled"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${reg.event.slug}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
