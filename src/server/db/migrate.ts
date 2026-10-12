import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Run with: npm run db:migrate (also runs before each Vercel build, see vercel.json).
// Prefer the direct (non-pooled) connection when the host provides one, e.g. Neon on Vercel.
async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = postgres(url, { max: 1 });
  await migrate(drizzle({ client }), { migrationsFolder: "./drizzle" });
  await client.end();
  console.log("✓ Migrations applied");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
