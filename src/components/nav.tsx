import Link from "next/link";
import { signOut } from "../../auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut } from "lucide-react";

export function Nav({ user }: { user: { name?: string | null; email?: string | null; role: "admin" | "agent" } }) {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold">
            <span aria-hidden>💧</span>
            <span>Water Tracker</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/enquiries" className="hover:text-foreground">
              Enquiries
            </Link>
            {user.role === "admin" && (
              <Link href="/admin/users" className="hover:text-foreground">
                Users
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-sm font-medium">{user.name ?? user.email}</div>
            <Badge variant="secondary" className="text-[10px]">
              {user.role}
            </Badge>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button variant="outline" size="sm" type="submit">
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
