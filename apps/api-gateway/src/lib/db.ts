import { createDatabaseClient } from "@vc-platform/database";
import { env } from "../config/env";

export const db = createDatabaseClient(env.DATABASE_URL);
