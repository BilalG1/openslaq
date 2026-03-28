import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "../env";

const client = postgres(env.DATABASE_URL, {
  max: 30,
  idle_timeout: 20,
  connect_timeout: 10,
  connection: {
    statement_timeout: 10000,
    idle_in_transaction_session_timeout: 30000,
  },
});

export const db = drizzle(client, { schema });
