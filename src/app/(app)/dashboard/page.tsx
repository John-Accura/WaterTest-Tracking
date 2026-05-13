import Link from "next/link";
import { and, eq, gte, inArray, lte, sql, SQL } from "drizzle-orm";
import { auth } from "../../../../auth";
import { db } from "@/lib/db";
import { enquiries, users } from "@/lib/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { STATUSES, STATUS_BADGE } from "@/lib/constants";
import { STATUS_BUCKETS, METRIC_LABEL, METRIC_DESCRIPTION, startOfWeek, endOfWeek, isoDate } from "@/lib/metrics";
import { Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; agentId?: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  const isAdmin = user.role === "admin";
  const params = await searchParams;

  const today = new Date();
  const defaultFrom = isoDate(startOfWeek(today));
  const defaultTo = isoDate(endOfWeek(today));
  const from = params.from?.trim() || defaultFrom;
  const to = params.to?.trim() || defaultTo;
  const agentIdParam = params.agentId?.trim() ?? "";

  // Scope: agents only see themselves; admin can filter by agent or see everyone.
  const scopeFilters: SQL[] = [
    gte(enquiries.dateOfEnquiry, from),
    lte(enquiries.dateOfEnquiry, to),
  ];
  if (!isAdmin) {
    scopeFilters.push(eq(enquiries.agentId, Number(user.id)));
  } else if (agentIdParam && agentIdParam !== "all") {
    scopeFilters.push(eq(enquiries.agentId, Number(agentIdParam)));
  }
  const where = and(...scopeFilters)!;

  // Single-query aggregate
  const [agg] = await db
    .select({
      total: sql<number>`count(*)::int`,
      connected: sql<number>`count(*) filter (where ${inArray(enquiries.status, STATUS_BUCKETS.connected as unknown as string[])})::int`,
      converted: sql<number>`count(*) filter (where ${inArray(enquiries.status, STATUS_BUCKETS.converted as unknown as string[])})::int`,
      completed: sql<number>`count(*) filter (where ${inArray(enquiries.status, STATUS_BUCKETS.completed as unknown as string[])})::int`,
      cancelled: sql<number>`count(*) filter (where ${inArray(enquiries.status, STATUS_BUCKETS.cancelled as unknown as string[])})::int`,
    })
    .from(enquiries)
    .where(where);

  const total = agg?.total ?? 0;
  const connected = agg?.connected ?? 0;
  const converted = agg?.converted ?? 0;
  const completed = agg?.completed ?? 0;
  const cancelled = agg?.cancelled ?? 0;
  const conversionRate = total === 0 ? 0 : Math.round((converted / total) * 100);
  const connectionRate = total === 0 ? 0 : Math.round((connected / total) * 100);

  // Status breakdown
  const byStatusRows = await db
    .select({ status: enquiries.status, count: sql<number>`count(*)::int` })
    .from(enquiries)
    .where(where)
    .groupBy(enquiries.status);
  const statusMap = new Map(byStatusRows.map((r) => [r.status, r.count]));

  // Agent leaderboard (admin only)
  const agentRows = isAdmin
    ? await db
        .select({
          id: users.id,
          name: users.name,
          agentName: users.agentName,
          total: sql<number>`count(${enquiries.id})::int`,
          connected: sql<number>`count(*) filter (where ${inArray(enquiries.status, STATUS_BUCKETS.connected as unknown as string[])})::int`,
          converted: sql<number>`count(*) filter (where ${inArray(enquiries.status, STATUS_BUCKETS.converted as unknown as string[])})::int`,
          completed: sql<number>`count(*) filter (where ${inArray(enquiries.status, STATUS_BUCKETS.completed as unknown as string[])})::int`,
          cancelled: sql<number>`count(*) filter (where ${inArray(enquiries.status, STATUS_BUCKETS.cancelled as unknown as string[])})::int`,
        })
        .from(users)
        .leftJoin(
          enquiries,
          and(
            eq(enquiries.agentId, users.id),
            gte(enquiries.dateOfEnquiry, from),
            lte(enquiries.dateOfEnquiry, to),
          ),
        )
        .where(eq(users.role, "agent"))
        .groupBy(users.id, users.name, users.agentName)
        .orderBy(sql`count(${enquiries.id}) desc`)
    : [];

  // Recent enquiries (within range)
  const recent = await db.query.enquiries.findMany({
    where,
    orderBy: (e, { desc }) => [desc(e.createdAt)],
    limit: 6,
  });

  // Agent list for the filter dropdown
  const agentList = isAdmin
    ? await db
        .select({ id: users.id, name: users.name, agentName: users.agentName })
        .from(users)
        .where(eq(users.role, "agent"))
        .orderBy(users.name)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Team performance</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(from)} → {formatDate(to)}
            {isAdmin
              ? agentIdParam && agentIdParam !== "all"
                ? ` · ${agentList.find((a) => String(a.id) === agentIdParam)?.agentName ?? "Selected agent"}`
                : " · All agents"
              : " · You"}
          </p>
        </div>
        <Button asChild>
          <Link href="/enquiries/new">
            <Plus className="h-4 w-4" /> New enquiry
          </Link>
        </Button>
      </div>

      {/* Filter bar */}
      <form className="flex flex-wrap items-end gap-2 rounded-lg border bg-white p-3">
        <div className="flex flex-col">
          <label className="text-xs text-muted-foreground">From</label>
          <Input type="date" name="from" defaultValue={from} className="w-40" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-muted-foreground">To</label>
          <Input type="date" name="to" defaultValue={to} className="w-40" />
        </div>
        {isAdmin && (
          <div className="flex flex-col">
            <label className="text-xs text-muted-foreground">Agent</label>
            <select
              name="agentId"
              defaultValue={agentIdParam || "all"}
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
        <div className="flex gap-2">
          <Button type="submit" variant="secondary">
            Apply
          </Button>
          <Button variant="outline" asChild>
            <Link href={`?from=${isoDate(startOfWeek(today))}&to=${isoDate(endOfWeek(today))}`}>This week</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link
              href={`?from=${isoDate(new Date(today.getFullYear(), today.getMonth(), 1))}&to=${isoDate(new Date(today.getFullYear(), today.getMonth() + 1, 0))}`}
            >
              This month
            </Link>
          </Button>
        </div>
      </form>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label={METRIC_LABEL.total} description={METRIC_DESCRIPTION.total} value={total} />
        <Kpi
          label={METRIC_LABEL.connected}
          description={METRIC_DESCRIPTION.connected}
          value={connected}
          rate={`${connectionRate}%`}
        />
        <Kpi
          label={METRIC_LABEL.converted}
          description={METRIC_DESCRIPTION.converted}
          value={converted}
          rate={`${conversionRate}%`}
        />
        <Kpi label={METRIC_LABEL.completed} description={METRIC_DESCRIPTION.completed} value={completed} />
        <Kpi label={METRIC_LABEL.cancelled} description={METRIC_DESCRIPTION.cancelled} value={cancelled} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status breakdown</CardTitle>
            <CardDescription>Counts by pipeline stage</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {STATUSES.map((s) => (
                <li key={s} className="flex items-center justify-between py-2 text-sm">
                  <Badge className={STATUS_BADGE[s]}>{s}</Badge>
                  <span className="font-medium">{statusMap.get(s) ?? 0}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent enquiries</CardTitle>
            <CardDescription>Most recently added in this period</CardDescription>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No enquiries in this period.</p>
            ) : (
              <ul className="divide-y">
                {recent.map((e) => (
                  <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/enquiries/${e.id}`} className="hover:underline">
                      <span className="font-medium">{e.customerName}</span>
                      <span className="text-muted-foreground"> — {e.district}</span>
                    </Link>
                    <Badge className={STATUS_BADGE[e.status as (typeof STATUSES)[number]] ?? ""}>{e.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Agent leaderboard</CardTitle>
            <CardDescription>Per-agent performance in this period</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Connected</TableHead>
                  <TableHead className="text-right">Converted</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Cancelled</TableHead>
                  <TableHead className="text-right">Conv. rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentRows.map((r) => {
                  const rate = r.total === 0 ? 0 : Math.round((r.converted / r.total) * 100);
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Link className="font-medium hover:underline" href={`?agentId=${r.id}&from=${from}&to=${to}`}>
                          {r.agentName ?? r.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">{r.total}</TableCell>
                      <TableCell className="text-right">{r.connected}</TableCell>
                      <TableCell className="text-right">{r.converted}</TableCell>
                      <TableCell className="text-right">{r.completed}</TableCell>
                      <TableCell className="text-right">{r.cancelled}</TableCell>
                      <TableCell className="text-right font-medium">{rate}%</TableCell>
                    </TableRow>
                  );
                })}
                {agentRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                      No agents yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Kpi({
  label,
  description,
  value,
  rate,
}: {
  label: string;
  description?: string;
  value: number;
  rate?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
        {description ? <CardDescription className="text-xs">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex items-end justify-between">
        <div className="text-3xl font-semibold">{value}</div>
        {rate ? <div className="text-sm text-muted-foreground">{rate}</div> : null}
      </CardContent>
    </Card>
  );
}
