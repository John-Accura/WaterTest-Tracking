"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { userSchema } from "@/lib/validators";

function fd(formData: FormData) {
  const o: Record<string, string> = {};
  for (const [k, v] of formData.entries()) o[k] = typeof v === "string" ? v : "";
  return o;
}

export async function createUser(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") return { ok: false, error: "Forbidden" };

  const parsed = userSchema.safeParse(fd(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };

  const { email, name, agentName, password, role } = parsed.data;
  const lowered = email.toLowerCase();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, lowered)).limit(1);
  if (existing) return { ok: false, error: "Email already in use" };

  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(users).values({
    email: lowered,
    name,
    agentName: agentName || null,
    passwordHash,
    role,
  });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function deleteUser(id: number) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") throw new Error("Forbidden");
  if (Number(session.user.id) === id) throw new Error("Cannot delete yourself");

  await db.delete(users).where(eq(users.id, id));
  revalidatePath("/admin/users");
}
