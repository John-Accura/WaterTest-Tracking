import Link from "next/link";
import { and, desc, eq, gte, ilike, isNotNull, isNull, lte, or, sql, SQL } from "drizzle-orm";
import { auth } from "../../../../auth";
import { db } from "@/lib/db";
import { enquiries, users } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Download, Plus, RotateCcw, Trash2 } from "lucide-react";
import { InlineStatus } from "@/components/inline-status";
import { InlineTech } from "@/components/inline-tech";
import { restoreEnquiry } from "@/app/actions/enquiries";

export const dynamic = "force-dynamic";

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    from?: string;
    to?: string;
    agentId?: string;
    show?: string;
  }>;
}) {
  const session = await auth();
  const user = session!.user;
  const isAdmin = user.role === "admin";
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status?.trim() ?? "";
  const from = params.from?.trim() ?? "";
  const to = params.to?.trim() ?? "";
  const agentId = params.agentId?.trim() ?? "";
  const showDeleted = isAdmin && params.show === "deleted";

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
      assignedTechnician: enquiries.assignedTechnician,
    })
    .from(enquiries)
    .where(filters.length ? and(...filters) : sql`true`)
    .orderBy(desc(enquiries.dateOfEnquiry), desc(enquiries.id))
    .limit(500);

  const agentList = isAdmin
    ? await db
        .select({ id: users.id, name: users.name, agentName: users.agentName })
        .from(users)
        .where(eq(users.role, "agent"))
        .orderBy(users.name)
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {showDeleted ? "Recycle bin" : "Enquiries"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {showDeleted
              ? "Deleted enquiries — admin only. Restore to put a row back into circulation."
              : isAdmin
                ? "All agents' enquiries."
                : "Your enquiries only."}{" "}
            {rows.length} shown.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="outline" asChild>
              <a
                href={`/api/export/enquiries?${new URLSearchParams({
                  ...(q ? { q } : {}),
                  ...(status ? { status } : {}),
                  ...(from ? { from } : {}),
                  ...(to ? { to } : {}),
                  ...(agentId && agentId !== "all" ? { agentId } : {}),
                  ...(showDeleted ? { show: "deleted" } : {}),
                }).toString()}`}
              >
                <Download className="h-4 w-4" /> Export
              </a>
            </Button>
          )}
          {isAdmin && !showDeleted && (
            <Button variant="outline" asChild>
              <Link href="/enquiries?show=deleted">
                <Trash2 className="h-4 w-4" /> Recycle bin
              </Link>
            </Button>
          )}
          {isAdmin && showDeleted && (
            <Button variant="outline" asChild>
              <Link href="/enquiries">Back to active</Link>
            </Button>
          )}
          {!showDeleted && (
            <Button asChild>
              <Link href="/enquiries/new">
                <Plus className="h-4 w-4" /> New enquiry
              </Link>
            </Button>
          )}
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-2 rounded-lg border bg-white p-3">
        {showDeleted && <input type="hidden" name="show" value="deleted" />}
        <div className="flex flex-col">
          <label className="text-xs text-muted-foreground">Search</label>
          <Input name="q" defaultValue={q} placeholder="name, mobile, area…" className="w-60" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-muted-foreground">From</label>
          <Input type="date" name="from" defaultValue={from} className="w-40" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-muted-foreground">To</label>
          <Input type="date" name="to" defaultValue={to} className="w-40" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-muted-foreground">Status</label>
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
        </div>
        {isAdmin && (
          <div className="flex flex-col">
            <label className="text-xs text-muted-foreground">Agent</label>
            <select
              name="agentId"
              defaultValue={agentId || "all"}
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            >
              <option value="all">All agents</option>
              {agentList.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.agentName ?? a.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <Button type="submit" variant="secondary">
          Apply
        </Button>
        {(q || status || from || to || (agentId && agentId !== "all")) && (
          <Button variant="ghost" asChild>
            <Link href={showDeleted ? "/enquiries?show=deleted" : "/enquiries"}>Clear</Link>
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
              <TableHead>Technician</TableHead>
              {isAdmin && <TableHead>Agent</TableHead>}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 9 : 8} className="text-center text-sm text-muted-foreground">
                  No enquiries match your filters.
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
                    {showDeleted ? (
                      <span className="rounded bg-secondary px-2 py-1 text-xs">{r.status}</span>
                    ) : (
                      <InlineStatus id={r.id} status={r.status} />
                    )}
                  </TableCell>
                  <TableCell>
                    {showDeleted ? (
                      <span className="text-xs text-muted-foreground">{r.assignedTechnician ?? "—"}</span>
                    ) : (
                      <InlineTech id={r.id} value={r.assignedTechnician} />
                    )}
                  </TableCell>
                  {isAdmin && <TableCell>{r.agentName}</TableCell>}
                  <TableCell className="text-right">
                    {showDeleted ? (
                      <form action={restoreEnquiry.bind(null, r.id)}>
                        <Button type="submit" size="sm" variant="outline">
                          <RotateCcw className="h-3.5 w-3.5" /> Restore
                        </Button>
                      </form>
                    ) : (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/enquiries/${r.id}`}>Open</Link>
                      </Button>
                    )}
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
