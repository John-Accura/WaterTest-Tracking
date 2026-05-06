import "dotenv/config";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users, enquiries } from "./schema";
import { DISTRICTS, WATER_SOURCES, STATUSES, PAYMENT_MODES } from "./constants";

const sourcePath = process.argv[2] ?? "C:\\Users\\johna\\Downloads\\Water test Tracker.xlsx";

function slug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  if (value == null || value === "") return undefined;
  const v = String(value).trim().toLowerCase();
  return allowed.find((a) => a.toLowerCase() === v);
}

function toDateString(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return undefined;
    return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  const t = new Date(String(value));
  if (!Number.isNaN(t.getTime())) return toDateString(t);
  return undefined;
}

async function main() {
  console.log(`Reading ${sourcePath}`);
  const wb = XLSX.readFile(sourcePath, { cellDates: true });
  const ws = wb.Sheets["Enquiry Tracker"];
  if (!ws) throw new Error('Sheet "Enquiry Tracker" not found');

  const grid: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
  const headerIdx = grid.findIndex((row) =>
    Array.isArray(row) && row.some((c) => String(c ?? "").trim() === "Customer Name"),
  );
  if (headerIdx === -1) throw new Error("Header row not found in sheet");

  const headers = (grid[headerIdx] as unknown[]).map((h) => String(h ?? "").trim());
  const records = grid
    .slice(headerIdx + 1)
    .filter((r) => Array.isArray(r) && r.some((c) => c !== "" && c != null))
    .map((row) => Object.fromEntries(headers.map((h, i) => [h, (row as unknown[])[i]])) as Record<string, unknown>);

  console.log(`Found ${records.length} candidate rows`);

  const defaultPassword = process.env.IMPORT_DEFAULT_PASSWORD ?? "Welcome@123";
  const hash = await bcrypt.hash(defaultPassword, 10);
  const agentMap = new Map<string, number>();
  const seen = new Set<string>();

  let imported = 0;
  let skipped = 0;
  const reasons: Record<string, number> = {};
  const bump = (k: string) => (reasons[k] = (reasons[k] ?? 0) + 1);

  for (const r of records) {
    const agentName = String(r["Agent Name"] ?? "").trim();
    const customerName = String(r["Customer Name"] ?? "").trim();
    if (!agentName) { skipped++; bump("missing agent"); continue; }
    if (!customerName) { skipped++; bump("missing customer"); continue; }

    const district = pickEnum(r["District"], DISTRICTS);
    if (!district) { skipped++; bump("bad/missing district"); continue; }

    const mobile = String(r["Mobile Number"] ?? "").trim();
    const waterSource = pickEnum(r["Water Source"], WATER_SOURCES) ?? "Other";
    const status = pickEnum(r["Status"], STATUSES) ?? "Confirmed";
    const paymentMode = pickEnum(r["Payment Mode"], PAYMENT_MODES);
    const date = toDateString(r["Date of Enquiry"]) ?? new Date().toISOString().slice(0, 10);

    const dedup = `${date}|${customerName.toLowerCase()}|${mobile}`;
    if (seen.has(dedup)) { skipped++; bump("duplicate row"); continue; }
    seen.add(dedup);

    let userId = agentMap.get(agentName);
    if (!userId) {
      const s = slug(agentName);
      if (!s) { skipped++; bump("unslug-able agent"); continue; }
      const email = `${s}@watertest.local`;
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (existing) {
        userId = existing.id;
      } else {
        const [created] = await db
          .insert(users)
          .values({
            email,
            name: agentName,
            agentName,
            passwordHash: hash,
            role: "agent",
          })
          .returning({ id: users.id });
        userId = created.id;
      }
      agentMap.set(agentName, userId);
    }

    await db.insert(enquiries).values({
      agentId: userId,
      agentName,
      dateOfEnquiry: date,
      customerName,
      mobileNumber: mobile,
      district,
      area: String(r["Area"] ?? "").trim() || null,
      pinCode: String(r["Pin code"] ?? "").trim() || null,
      waterSource,
      status,
      assignedTechnician: String(r["Assigned Technician"] ?? "").trim() || null,
      sampleCollectionDate: toDateString(r["Sample Collection Date"]) ?? null,
      receivedAtLabDate: toDateString(r["Received at Lab Date"]) ?? null,
      resultDate: toDateString(r["Result Date"]) ?? null,
      paymentMode: paymentMode ?? null,
      remarks:
        String(r["Remarks / Notes/ Location"] ?? r["Remarks / Notes / Location"] ?? "").trim() || null,
    });
    imported++;
  }

  console.log(`\n✅ Imported ${imported} enquiries`);
  console.log(`⏭  Skipped ${skipped} rows: ${JSON.stringify(reasons)}`);
  console.log(`👥 Agents created/linked: ${agentMap.size}`);
  console.log(`\nDefault password for all imported agents: ${defaultPassword}`);
  console.log(`Agent logins:`);
  for (const [name] of agentMap.entries()) {
    console.log(`  ${slug(name)}@watertest.local   (display: ${name})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
