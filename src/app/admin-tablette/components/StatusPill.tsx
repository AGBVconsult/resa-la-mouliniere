"use client";

import type { ReservationStatus } from "../../../../spec/contracts.generated";

const STATUS_COLORS: Record<ReservationStatus, string> = {
  pending: "bg-amber-400",
  confirmed: "bg-emerald-400",
  cardPlaced: "bg-blue-500",
  seated: "bg-blue-400",
  completed: "bg-slate-300",
  cancelled: "bg-red-300",
  noshow: "bg-red-500",
  refused: "bg-red-400",
  incident: "bg-orange-500",
};

interface StatusPillProps {
  status: ReservationStatus;
}

export function StatusPill({ status }: StatusPillProps) {
  return (
    <div
      className={`w-1 h-8 rounded-full ${STATUS_COLORS[status] || "bg-slate-200"}`}
    />
  );
}
