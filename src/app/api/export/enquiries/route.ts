import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { and, asc, eq, gte, ilike, isNotNull, isNull, lte, or, type SQL } from "drizzle-orm";
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";
import { enquiries } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isoDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const user = session.user;
  const isAdmin = user.role === "admin";

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const status = sp.get("status")?.trim() ?? "";
  const from = sp.get("from")?.trim() ?? "";
  const to = sp.get("to")?.trim() ?? "";
  const agentId = sp.get("agentId")?.trim() ?? "";
  const showDeleted = isAdmin && sp.get("show") === "deleted";

  const filters: SQL[] = [showDeleted ? isNotNull(enquiries.deletedAt) : isNull(enquiries.deletedAt)];
  if (!isAdmin) {
    filters.push(eq(enquiries.agentId, Number(user.id)));
  } else if (agentId && agentId !== "all") {
    filters.push(eq(enquiries.agentId, Number(agentId)));
  }
  if (q) {
    filters.push(
      or(
        ilike(enquiries.customerName, `%${q}%`),
        ilike(enquiries.mobileNumber, `%${q}%`),
        ilike(enquiries.area, `%${q}%`),
        ilike(enquiries.district, `%${q}%`),
      )!,
    );
  }
  if (status) filters.push(eq(enquiries.status, status));
  if (from) filters.push(gte(enquiries.dateOfEnquiry, from));
  if (to) filters.push(lte(enquiries.dateOfEnquiry, to));

  const rows = await db
    .select()
    .from(enquiries)
    .where(and(...filters))
    .orderBy(asc(enquiries.dateOfEnquiry), asc(enquiries.id))
    .limit(50_000);

  const data = rows.map((r, idx) => ({
    "Sl. No.": idx + 1,
    "Agent Name": r.agentName,
    "Date of Enquiry": isoDate(r.dateOfEnquiry),
    "Customer Name": r.customerName,
    "Mobile Number": r.mobileNumber,
    District: r.district,
    Area: r.area ?? "",
    "Pin code": r.pinCode ?? "",
    "Water Source": r.waterSource,
    Status: r.status,
    "Assigned Technician": r.assignedTechnician ?? "",
    "Sample Collection Date": isoDate(r.sampleCollectionDate),
    "Received at Lab Date": isoDate(r.receivedAtLabDate),
    "Result Date": isoDate(r.resultDate),
    "Payment Mode": r.paymentMode ?? "",
    "Remarks / Notes / Location": r.remarks ?? "",
    ...(showDeleted ? { "Deleted At": isoDate(r.deletedAt as unknown as Date | null) } : {}),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 14 },
    { wch: 24 },
    { wch: 14 },
    { wch: 18 },
    { wch: 22 },
    { wch: 10 },
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 14 },
    { wch: 14 },
    { wch: 40 },
    ...(showDeleted ? [{ wch: 14 }] : []),
  ];
  // Freeze the header row
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, showDeleted ? "Deleted enquiries" : "Enquiry Tracker");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  // Copy into a fresh ArrayBuffer so the body type is unambiguously ArrayBuffer
  // (NextResponse / TS strict mode trips on Buffer<ArrayBufferLike>).
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(buf);

  const today = new Date().toISOString().slice(0, 10);
  const filename = showDeleted ? `enquiries-deleted-${today}.xlsx` : `enquiries-${today}.xlsx`;

  return new NextResponse(ab, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(ab.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
