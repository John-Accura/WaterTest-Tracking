import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "";
const isRemote = url.startsWith("postgresql://") || url.startsWith("postgres://");

type DB = NeonHttpDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __db?: DB; __pg?: PGlite };

function makeDb(): DB {
  if (isRemote) {
    return drizzleNeon(neon(url), { schema });
  }
  const dataDir = path.resolve(process.cwd(), process.env.LOCAL_DB_PATH ?? "./.pglite");
  const client = globalForDb.__pg ?? new PGlite(dataDir);
  if (process.env.NODE_ENV !== "production") globalForDb.__pg = client;
  return drizzlePglite(client, { schema }) as unknown as DB;
}

export const db: DB = globalForDb.__db ?? makeDb();
if (process.env.NODE_ENV !== "production") globalForDb.__db = db;
