import { redirect } from "next/navigation";
import { auth } from "../../../../../auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreateUserForm } from "@/components/create-user-form";
import { createUser, deleteUser } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const list = await db.select().from(users).orderBy(users.createdAt);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground">Create logins for your agents. Each agent only sees their own enquiries.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add user</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateUserForm action={createUser} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Agent name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.agentName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {u.id !== Number(session.user.id) && (
                      <form action={deleteUser.bind(null, u.id)}>
                        <Button type="submit" size="sm" variant="outline">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
