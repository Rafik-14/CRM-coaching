import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "./index";

// Run with: npm run db:migrate
async function main() {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✓ Migrations applied");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
