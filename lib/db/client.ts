import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Singleton pattern â” safe for Next.js serverless/edge functions.
// Each invocation gets a fresh HTTP connection from the pool.
function createDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema, logger: process.env.NODE_ENV === "development" });
}

// In development, reuse the instance across hot-reloads to avoid connection churn.
const globalForDb = globalThis as unknown as {
  _db: ReturnType<typeof createDb> | undefined;
};

export const db =
  globalForDb._db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb._db = db;
}

export type Db = typeof db;
