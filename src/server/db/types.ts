import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

/**
 * Any Drizzle database or transaction on our schema: the app's postgres-js connection, or an in-memory
 * PGlite in tests. Modules that take it as a parameter can be tested against a real database.
 */
export type AnyDb = PgDatabase<PgQueryResultHKT, typeof schema>;
