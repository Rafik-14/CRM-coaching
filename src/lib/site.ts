/** Public address of the website (canonical URLs, sitemap, Open Graph). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3100").replace(
  /\/$/,
  "",
);

/** Search engines stay out of the Vercel demo (and of any copy with SITE_NOINDEX=true). */
export const SITE_INDEXABLE = !process.env.VERCEL && process.env.SITE_NOINDEX !== "true";
