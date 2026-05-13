import { STATUSES } from "./constants";

type Status = (typeof STATUSES)[number];

// Tweak these buckets to change how the dashboard counts performance.
export const STATUS_BUCKETS = {
  connected: ["Confirmed", "Ongoing", "Collected", "Received at Lab", "Result Ready"] satisfies Status[],
  converted: ["Collected", "Received at Lab", "Result Ready"] satisfies Status[],
  completed: ["Result Ready"] satisfies Status[],
  cancelled: ["Cancelled"] satisfies Status[],
} as const;

export type Metric = keyof typeof STATUS_BUCKETS;

export const METRIC_LABEL: Record<Metric | "total", string> = {
  total: "Total enquiries",
  connected: "Connected",
  converted: "Converted",
  completed: "Result ready",
  cancelled: "Cancelled",
};

export const METRIC_DESCRIPTION: Record<Metric | "total", string> = {
  total: "All enquiries in the period",
  connected: "Customer still in pipeline (not cancelled)",
  converted: "Sample collected or further",
  completed: "Test result delivered",
  cancelled: "Lost / cancelled",
};

export function startOfWeek(d: Date = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // days since Monday
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfWeek(d: Date = new Date()): Date {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
