// Lazy Drizzle client over postgres-js. Instantiated on first use so that
// importing schema/types never requires a live DATABASE_URL (tests, codegen,
// build). Secrets come from env only — never hardcoded (brain/tech-stack).

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema";

export type HelixDb = PostgresJsDatabase<typeof schema>;

let sqlClient: Sql | undefined;
let dbInstance: HelixDb | undefined;

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim() === "") {
    throw new Error(
      "DATABASE_URL is not configured. Set it in the environment before using @helix/db.",
    );
  }
  return url;
}

/**
 * Returns the shared, lazily-initialized Drizzle client. The underlying
 * postgres-js pool and Drizzle instance are created once and reused.
 */
export function getDb(): HelixDb {
  if (dbInstance) {
    return dbInstance;
  }
  sqlClient = postgres(requireDatabaseUrl(), { prepare: true });
  dbInstance = drizzle(sqlClient, { schema });
  return dbInstance;
}

/**
 * Closes the underlying connection pool and resets the cached client. Safe to
 * call in test teardown or graceful shutdown; a no-op if never initialized.
 */
export async function closeDb(): Promise<void> {
  if (sqlClient) {
    await sqlClient.end();
    sqlClient = undefined;
    dbInstance = undefined;
  }
}
