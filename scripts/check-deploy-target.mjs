// Runs first in every Vercel build (see vercel.json), before any database step.
//
// Why: Vercel "Preview" deployments share the production database settings
// (they come from the Neon integration). Only the "staging" branch has its own
// database (Vercel env vars scoped to that branch). A preview built from any
// other branch would run its migrations — and could write test data — on the
// live database. This stops such a build before it touches anything.
//
// Production builds and local builds (no VERCEL_ENV) are not affected.

const env = process.env.VERCEL_ENV;
const branch = process.env.VERCEL_GIT_COMMIT_REF;

if (env === "preview" && branch !== "staging") {
  console.error(
    [
      "",
      "✗ Build stopped: preview deployments are only allowed from the « staging » branch.",
      `  This build comes from: ${branch || "(unknown branch)"}.`,
      "  Other previews still use the production database, so they must not run migrations or tests.",
      "  → Merge your branch into staging, then run: bash scripts/deploy-staging.sh",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

console.log(`✓ Deploy target OK (${env || "local"}${branch ? `, branch ${branch}` : ""})`);
