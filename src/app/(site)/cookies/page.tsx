import { notFound, permanentRedirect } from "next/navigation";
import { LEGAL_PAGES_PUBLISHED } from "@/components/site/nav";

/** « Gestion des cookies » now lives in the Mentions légales page (Jérémy, V4): old links keep working. */
export default function Page() {
  if (!LEGAL_PAGES_PUBLISHED) notFound();
  permanentRedirect("/mentions-legales#cookies");
}
