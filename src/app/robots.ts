import type { MetadataRoute } from "next";
import { SITE_INDEXABLE, SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (!SITE_INDEXABLE) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The CRM and private booking pages are never indexed.
      disallow: [
        "/connexion",
        "/tableau-de-bord",
        "/contacts",
        "/pipeline",
        "/calendrier",
        "/taches",
        "/analyses",
        "/parametres",
        "/api/",
        "/reserver/confirmation",
        "/reserver/ics",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
