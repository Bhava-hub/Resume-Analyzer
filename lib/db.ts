import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL!, {
  // Neon (and most cloud Postgres providers) require SSL.
  // 'require' works for both Neon and Render Postgres.
  ssl: 'require',
});

export const db = drizzle(client);
