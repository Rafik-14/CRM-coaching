import { getBookedSession } from "@/server/booking";
import { icsEvent } from "@/lib/ics";

/** Calendar file of a booked « Échange stratégique » (link on the confirmation page, signed reference). */
export async function GET(request: Request) {
  const session = await getBookedSession(new URL(request.url).searchParams.get("r"));
  if (!session || session.status !== "planned") return new Response("Rendez-vous introuvable", { status: 404 });

  const body = icsEvent({
    uid: `${session.id}@jeremygalea`,
    start: session.startsAt,
    durationMin: session.durationMin,
    summary: "Échange stratégique avec Jérémy Galéa",
    description: "20 minutes pour parler de votre situation. Sans engagement.",
    location: session.location,
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="echange-strategique.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
