import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Public pages of the website (the CRM is private and left out). */
const PAGES: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/methode", priority: 0.9 },
  { path: "/accompagnements", priority: 0.9 },
  { path: "/accompagnements/parcours-signature", priority: 0.8 },
  { path: "/pour-qui", priority: 0.8 },
  { path: "/transformations", priority: 0.8 },
  { path: "/a-propos", priority: 0.7 },
  { path: "/le-chant-du-merle", priority: 0.6 },
  { path: "/reserver", priority: 0.9 },
  { path: "/contact", priority: 0.7 },
  { path: "/faq", priority: 0.6 },
  { path: "/cgv", priority: 0.2 },
  { path: "/mentions-legales", priority: 0.2 },
  { path: "/confidentialite", priority: 0.2 },
  { path: "/cookies", priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map(({ path, priority }) => ({ url: `${SITE_URL}${path}`, priority, changeFrequency: "monthly" }));
}
