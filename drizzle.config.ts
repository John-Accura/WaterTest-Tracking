import "dotenv/config";
import type { Config } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "";
const isRemote = url.startsWith("postgresql://") || url.startsWith("postgres://");

const base = {
  schema: "./src/lib/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  strict: true,
} as const;

export default (
  isRemote
    ? { ...base, dbCredentials: { url } }
    : { ...base, driver: "pglite", dbCredentials: { url: process.env.LOCAL_DB_PATH ?? "./.pglite" } }
) satisfies Config;
