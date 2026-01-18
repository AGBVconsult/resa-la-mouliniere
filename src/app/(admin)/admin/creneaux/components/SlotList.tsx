"use client";

import { SlotRow } from "./SlotRow";

interface Slot {
  timeKey: string;
  capacity: number;
  isActive: boolean;
  largeTableAllowed: boolean;
  maxGroupSize: number | null;
}

interface SlotListProps {
  service: "lunch" | "dinner";
  slots: Slot[];
  openDays: number[];
}

export function SlotList({ service, slots, openDays }: SlotListProps) {
  if (slots.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm border border-dashed border-slate-200 rounded-lg">
        Aucun créneau configuré
      </div>
    );
  }

  return (
    <div className="space-y-2" data-service={service}>
      {slots.map((slot) => (
        <SlotRow
          key={slot.timeKey}
          service={service}
          slot={slot}
          openDays={openDays}
        />
      ))}
    </div>
  );
}
