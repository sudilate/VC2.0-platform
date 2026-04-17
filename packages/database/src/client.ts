import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export function createDatabaseClient(databaseUrl: string) {
  const client = postgres(databaseUrl, {
    prepare: false,
  });

  return drizzle(client);
}
