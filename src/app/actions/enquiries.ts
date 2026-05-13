"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "../../../auth";
import { db } from "@/lib/db";
import { enquiries } from "@/lib/schema";
import { enquirySchema } from "@/lib/validators";
import { STATUSES } from "@/lib/constants";

function fd(formData: FormData) {
  const o: Record<string, string> = {};
  for (const [k, v] of formData.entries()) o[k] = typeof v === "string" ? v : "";
  return o;
}

export async function createEnquiry(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };

  const parsed = enquirySchema.safeParse(fd(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }
  const data = parsed.data;
  await db.insert(enquiries).values({
    agentId: Number(session.user.id),
    agentName: session.user.agentName ?? session.user.name ?? session.user.email!,
    dateOfEnquiry: data.dateOfEnquiry,
    customerName: data.customerName,
    mobileNumber: data.mobileNumber,
    district: data.district,
    area: data.area || null,
    pinCode: data.pinCode || null,
    waterSource: data.waterSource,
    status: data.status,
    assignedTechnician: data.assignedTechnician || null,
    sampleCollectionDate: data.sampleCollectionDate || null,
    receivedAtLabDate: data.receivedAtLabDate || null,
    resultDate: data.resultDate || null,
    paymentMode: data.paymentMode || null,
    remarks: data.remarks || null,
  });
  revalidatePath("/enquiries");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateEnquiry(id: number, formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };
  const isAdmin = session.user.role === "admin";

  const parsed = enquirySchema.safeParse(fd(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }
  const data = parsed.data;

  const where = isAdmin
    ? eq(enquiries.id, id)
    : and(eq(enquiries.id, id), eq(enquiries.agentId, Number(session.user.id)));

  const result = await db
    .update(enquiries)
    .set({
      dateOfEnquiry: data.dateOfEnquiry,
      customerName: data.customerName,
      mobileNumber: data.mobileNumber,
      district: data.district,
      area: data.area || null,
      pinCode: data.pinCode || null,
      waterSource: data.waterSource,
      status: data.status,
      assignedTechnician: data.assignedTechnician || null,
      sampleCollectionDate: data.sampleCollectionDate || null,
      receivedAtLabDate: data.receivedAtLabDate || null,
      resultDate: data.resultDate || null,
      paymentMode: data.paymentMode || null,
      remarks: data.remarks || null,
      updatedAt: new Date(),
    })
    .where(where)
    .returning({ id: enquiries.id });

  if (result.length === 0) return { ok: false, error: "Not found or not permitted" };
  revalidatePath("/enquiries");
  revalidatePath(`/enquiries/${id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteEnquiry(id: number) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const isAdmin = session.user.role === "admin";

  const where = isAdmin
    ? eq(enquiries.id, id)
    : and(eq(enquiries.id, id), eq(enquiries.agentId, Number(session.user.id)));

  await db.delete(enquiries).where(where);
  revalidatePath("/enquiries");
  revalidatePath("/dashboard");
  redirect("/enquiries");
}

export async function quickUpdate(
  id: number,
  fields: { status?: string; assignedTechnician?: string },
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };
  const isAdmin = session.user.role === "admin";

  const updates: Partial<typeof enquiries.$inferInsert> = { updatedAt: new Date() };
  if (fields.status !== undefined) {
    if (!STATUSES.includes(fields.status as (typeof STATUSES)[number])) {
      return { ok: false, error: "Invalid status" };
    }
    updates.status = fields.status;
  }
  if (fields.assignedTechnician !== undefined) {
    const trimmed = fields.assignedTechnician.trim();
    updates.assignedTechnician = trimmed.length > 0 ? trimmed : null;
  }

  const where = isAdmin
    ? eq(enquiries.id, id)
    : and(eq(enquiries.id, id), eq(enquiries.agentId, Number(session.user.id)));

  const result = await db.update(enquiries).set(updates).where(where).returning({ id: enquiries.id });
  if (result.length === 0) return { ok: false, error: "Not found or not permitted" };
  revalidatePath("/enquiries");
  revalidatePath("/dashboard");
  return { ok: true };
}
