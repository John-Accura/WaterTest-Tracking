"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { quickUpdate } from "@/app/actions/enquiries";

export function InlineTech({ id, value: initial }: { id: number; value: string | null }) {
  const [value, setValue] = useState(initial ?? "");
  const [saved, setSaved] = useState(initial ?? "");
  const [pending, start] = useTransition();

  function commit() {
    if (value.trim() === saved.trim()) return;
    start(async () => {
      const r = await quickUpdate(id, { assignedTechnician: value });
      if (!r.ok) {
        setValue(saved);
        toast.error(r.error ?? "Failed");
      } else {
        setSaved(value.trim());
        toast.success(value.trim() ? `Technician → ${value.trim()}` : "Technician cleared");
      }
    });
  }

  return (
    <input
      type="text"
      value={value}
      placeholder="— assign —"
      disabled={pending}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setValue(saved);
      }}
      className="h-7 w-32 rounded-md border border-input bg-transparent px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
    />
  );
}
