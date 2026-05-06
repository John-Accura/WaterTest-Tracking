"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateUserForm({
  action,
}: {
  action: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    try {
      const r = await action(formData);
      if (!r.ok) {
        toast.error(r.error ?? "Could not create user");
        return;
      }
      toast.success("User created");
      const form = document.getElementById("create-user-form") as HTMLFormElement | null;
      form?.reset();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form id="create-user-form" action={onSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="agentName">Agent name (as in sheet)</Label>
        <Input id="agentName" name="agentName" placeholder="e.g. Malini" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Initial password</Label>
        <Input id="password" name="password" type="text" required minLength={8} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          name="role"
          defaultValue="agent"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="agent">agent</option>
          <option value="admin">admin</option>
        </select>
      </div>
      <div className="md:col-span-2 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create user"}
        </Button>
      </div>
    </form>
  );
}
