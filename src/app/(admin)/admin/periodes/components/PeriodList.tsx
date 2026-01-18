"use client";

import { PeriodRow } from "./PeriodRow";
import type { Id } from "../../../../../../convex/_generated/dataModel";

type PeriodType = "holiday" | "closure" | "event";
type ApplyStatus = "open" | "modified" | "closed";

interface Period {
  _id: Id<"specialPeriods">;
  name: string;
  type: PeriodType;
  startDate: string;
  endDate: string;
  applyRules: {
    status: ApplyStatus;
    services: ("lunch" | "dinner")[];
    activeDays: number[];
    overrideCapacity?: number;
    maxGroupSize?: number | null;
    largeTableAllowed?: boolean;
  };
  createdAt: number;
  updatedAt: number;
}

interface PeriodListProps {
  periods: Period[];
}

export function PeriodList({ periods }: PeriodListProps) {
  // Sort by startDate descending (most recent first)
  const sortedPeriods = [...periods].sort((a, b) => 
    b.startDate.localeCompare(a.startDate)
  );

  return (
    <div className="space-y-2">
      {sortedPeriods.map((period) => (
        <PeriodRow key={period._id} period={period} />
      ))}
    </div>
  );
}
