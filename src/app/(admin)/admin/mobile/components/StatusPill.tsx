"use client";

import { cn } from "@/lib/utils";

// Couleurs identiques à ReservationRow.tsx
const STATUS_COLORS: Record<string, { bg: string; animate?: boolean }> = {
  confirmed: { bg: "bg-emerald-500" },
  seated: { bg: "bg-emerald-500" },
  arrived: { bg: "bg-emerald-500" },
  pending: { bg: "bg-orange-500", animate: true },
  incident: { bg: "bg-black" },
  cancelled: { bg: "bg-red-500" },
  noshow: { bg: "bg-red-500" },
  refused: { bg: "bg-red-500" },
  completed: { bg: "bg-gray-300" },
  finished: { bg: "bg-gray-300" },
};

interface StatusPillProps {
  status: string;
}

export function StatusPill({ status }: StatusPillProps) {
  const style = STATUS_COLORS[status] || { bg: "bg-slate-200" };

  return (
    <div
      className={cn(
        "w-1 h-6 rounded-full shrink-0",
        style.bg,
        style.animate && "animate-pulse"
      )}
    />
  );
}
