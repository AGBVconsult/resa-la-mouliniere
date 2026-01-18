"use client";

import { Clock, Users } from "lucide-react";

interface TimeChunkProps {
  timeKey: string;
  totalGuests: number;
  capacity: number;
  reservationCount: number;
}

export function TimeChunk({ timeKey, totalGuests, capacity, reservationCount }: TimeChunkProps) {
  return (
    <div className="sticky top-0 z-[5] bg-[#F8F6F1] px-6 py-2 flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-gray-500" />
        <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
          {timeKey}
        </span>
      </div>
      <div className="flex items-center gap-2 text-gray-500">
        <Users className="h-3.5 w-3.5" />
        <span className="text-xs">
          {totalGuests} / {capacity}
        </span>
      </div>
      <span className="text-xs text-gray-500">
        • {reservationCount} résa{reservationCount > 1 ? "s" : ""}
      </span>
    </div>
  );
}
