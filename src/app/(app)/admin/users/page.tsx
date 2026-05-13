import Link from "next/link";
import { redirect } from "next/navigation";
import { isNotNull, isNull } from "drizzle-orm";
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreateUserForm } from "@/components/create-user-form";
import { createUser, deleteUser, restoreUser } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { RotateCcw, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const params = await searchParams;
  const showDeleted = params.show === "deleted";

  const list = await db
    .select()
    .from(users)
    .where(showDeleted ? isNotNull(users.deletedAt) : isNull(users.deletedAt))
    .orderBy(users.createdAt);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{showDeleted ? "Deleted users" : "Users"}</h1>
          <p className="text-sm text-muted-foreground">
            {showDeleted
              ? "Deleted accounts can be restored. While deleted, they cannot log in."
              : "Create logins for your agents. Each agent only sees their own enquiries."}
          </p>
        </div>
        <div className="flex gap-2">
          {showDeleted ? (
            <Button variant="outline" asChild>
              <Link href="/admin/users">Back to active</Link>
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link href="/admin/users?show=deleted">
                <Trash2 className="h-4 w-4" /> Recycle bin
              </Link>
            </Button>
          )}
        </div>
      </div>

      {!showDeleted && (
        <Card>
          <CardHeader>
            <CardTitle>Add user</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateUserForm action={createUser} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{showDeleted ? "Deleted accounts" : "All users"}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Agent name</TableHead>
                <TableHead>Role</TableHead>
                {showDeleted && <TableHead>Deleted at</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showDeleted ? 6 : 5} className="text-center text-sm text-muted-foreground">
                    {showDeleted ? "Recycle bin is empty." : "No users yet."}
                  </TableCell>
                </TableRow>
              ) : (
                list.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.agentName ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                    </TableCell>
                    {showDeleted && (
                      <TableCell className="text-sm text-muted-foreground">
                        {u.deletedAt ? formatDate(u.deletedAt) : "—"}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      {showDeleted ? (
                        <form action={restoreUser.bind(null, u.id)}>
                          <Button type="submit" size="sm" variant="outline">
                            <RotateCcw className="h-3.5 w-3.5" /> Restore
                          </Button>
                        </form>
                      ) : (
                        u.id !== Number(session.user.id) && (
                          <form action={deleteUser.bind(null, u.id)}>
                            <Button type="submit" size="sm" variant="outline">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </form>
                        )
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
