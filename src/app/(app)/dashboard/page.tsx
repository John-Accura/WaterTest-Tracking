import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "../../../../auth";
import { db } from "@/lib/db";
import { enquiries } from "@/lib/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATUSES, STATUS_BADGE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const user = session!.user;
  const isAdmin = user.role === "admin";
  const scope = isAdmin ? undefined : eq(enquiries.agentId, Number(user.id));

  const totalRow = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(enquiries)
    .where(scope ?? sql`true`);
  const total = totalRow[0]?.count ?? 0;

  const byStatus = await db
    .select({ status: enquiries.status, count: sql<number>`count(*)::int` })
    .from(enquiries)
    .where(scope ?? sql`true`)
    .groupBy(enquiries.status);

  const byDistrict = await db
    .select({ district: enquiries.district, count: sql<number>`count(*)::int` })
    .from(enquiries)
    .where(scope ?? sql`true`)
    .groupBy(enquiries.district)
    .orderBy(sql`count(*) desc`)
    .limit(10);

  const recent = await db.query.enquiries.findMany({
    where: scope,
    orderBy: (e, { desc }) => [desc(e.createdAt)],
    limit: 5,
  });

  const statusMap = new Map(byStatus.map((r) => [r.status, r.count]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Showing all enquiries across agents." : "Showing your enquiries only."}
          </p>
        </div>
        <Button asChild>
          <Link href="/enquiries/new">
            <Plus className="h-4 w-4" />
            New enquiry
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{total}</div>
          </CardContent>
        </Card>
        {STATUSES.map((s) => (
          <Card key={s}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{s}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-3xl font-semibold">{statusMap.get(s) ?? 0}</div>
              <Badge className={STATUS_BADGE[s]}>{s}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top districts</CardTitle>
          </CardHeader>
          <CardContent>
            {byDistrict.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <ul className="divide-y">
                {byDistrict.map((r) => (
                  <li key={r.district} className="flex items-center justify-between py-2 text-sm">
                    <span>{r.district}</span>
                    <span className="font-medium">{r.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent enquiries</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No enquiries yet.</p>
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
    </div>
  );
}
