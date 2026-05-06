import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./schema";

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "changeMeNow!";
  const name = process.env.SEED_ADMIN_NAME ?? "Admin";

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(users).values({ email, name, passwordHash, role: "admin" });
  console.log(`Seeded admin: ${email} / ${password}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
