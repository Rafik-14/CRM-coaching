import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Always a regular PostgreSQL connection:
 * - local dev: embedded Postgres served by `npm run db:server` (PGlite, no Docker needed)
 * - staging / production: real PostgreSQL in Docker
 */
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");

// Reuse only the connection pool across hot reloads in dev. The Drizzle instance is rebuilt
// on every reload so it always uses the current schema (new columns, relations…).
const globalForDb = globalThis as unknown as { pgClient?: postgres.Sql };

// The local PGlite server is single-session: use DATABASE_POOL_MAX=1 there (see .env.example).
const client = globalForDb.pgClient ?? postgres(url, { max: Number(process.env.DATABASE_POOL_MAX ?? 10) });
if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle({ client, schema });

export type Db = typeof db;
export { schema };
