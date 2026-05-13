"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { quickUpdate } from "@/app/actions/enquiries";
import { STATUSES, STATUS_BADGE } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Status = (typeof STATUSES)[number];

export function InlineStatus({ id, status: initial }: { id: number; status: string }) {
  const [status, setStatus] = useState<Status>(initial as Status);
  const [pending, start] = useTransition();

  return (
    <select
      value={status}
      disabled={pending}
      className={cn(
        "h-7 rounded-md border border-transparent px-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50",
        STATUS_BADGE[status] ?? "bg-secondary",
      )}
      onChange={(e) => {
        const next = e.target.value as Status;
        const prev = status;
        setStatus(next);
        start(async () => {
          const r = await quickUpdate(id, { status: next });
          if (!r.ok) {
            setStatus(prev);
            toast.error(r.error ?? "Failed to update");
          } else {
            toast.success(`Status → ${next}`);
          }
        });
      }}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
