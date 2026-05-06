import Link from "next/link";
import { and, desc, eq, ilike, or, sql, SQL } from "drizzle-orm";
import { auth } from "../../../../auth";
import { db } from "@/lib/db";
import { enquiries, users } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { STATUS_BADGE, STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const session = await auth();
  const user = session!.user;
  const isAdmin = user.role === "admin";
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status?.trim() ?? "";

  const filters: SQL[] = [];
  if (!isAdmin) filters.push(eq(enquiries.agentId, Number(user.id)));
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

  const rows = await db
    .select({
      id: enquiries.id,
      customerName: enquiries.customerName,
      mobileNumber: enquiries.mobileNumber,
      district: enquiries.district,
      area: enquiries.area,
      status: enquiries.status,
      dateOfEnquiry: enquiries.dateOfEnquiry,
      waterSource: enquiries.waterSource,
      agentName: enquiries.agentName,
    })
    .from(enquiries)
    .where(filters.length ? and(...filters) : sql`true`)
    .orderBy(desc(enquiries.dateOfEnquiry), desc(enquiries.id))
    .limit(500);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Enquiries</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "All agents' enquiries." : "Your enquiries only."}
          </p>
        </div>
        <Button asChild>
          <Link href="/enquiries/new">
            <Plus className="h-4 w-4" /> New enquiry
          </Link>
        </Button>
      </div>

      <form className="flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder="Search name, mobile, area, district…" className="max-w-sm" />
        <select
          name="status"
          defaultValue={status}
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">Filter</Button>
        {(q || status) && (
          <Button variant="ghost" asChild>
            <Link href="/enquiries">Clear</Link>
          </Button>
        )}
      </form>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>District / Area</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead>Agent</TableHead>}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 8 : 7} className="text-center text-sm text-muted-foreground">
                  No enquiries found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(r.dateOfEnquiry)}</TableCell>
                  <TableCell className="font-medium">{r.customerName}</TableCell>
                  <TableCell>{r.mobileNumber}</TableCell>
                  <TableCell>
                    <div>{r.district}</div>
                    {r.area && <div className="text-xs text-muted-foreground">{r.area}</div>}
                  </TableCell>
                  <TableCell>{r.waterSource}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_BADGE[r.status as (typeof STATUSES)[number]] ?? ""}>{r.status}</Badge>
                  </TableCell>
                  {isAdmin && <TableCell>{r.agentName}</TableCell>}
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/enquiries/${r.id}`}>Open</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
