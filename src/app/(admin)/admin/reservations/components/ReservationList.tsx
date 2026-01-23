"use client";

import { useMemo } from "react";
import { TimeChunk } from "./TimeChunk";
import { ReservationRow, type Reservation } from "./ReservationRow";
import type { Id } from "../../../../../../convex/_generated/dataModel";

interface ReservationListProps {
  reservations: Reservation[];
  isCompact?: boolean;
  expandedId: Id<"reservations"> | null;
  selectedForAssignmentId?: Id<"reservations"> | null;
  onToggleExpand: (id: Id<"reservations">) => void;
  onStatusChange: (id: Id<"reservations">, status: string, version: number) => void;
  onEdit: (reservation: Reservation) => void;
  onSelectForAssignment?: (reservation: Reservation) => void;
  tables?: { _id: Id<"tables">; name: string }[];
  slotCapacities?: Record<string, number>;
}

interface TimeGroup {
  timeKey: string;
  reservations: Reservation[];
  totalGuests: number;
  capacity: number;
}

export function ReservationList({
  reservations,
  isCompact = false,
  expandedId,
  selectedForAssignmentId,
  onToggleExpand,
  onStatusChange,
  onEdit,
  onSelectForAssignment,
  tables = [],
  slotCapacities = {},
}: ReservationListProps) {
  // Group reservations by timeKey
  const timeGroups = useMemo(() => {
    const groups: Record<string, Reservation[]> = {};

    for (const reservation of reservations) {
      if (!groups[reservation.timeKey]) {
        groups[reservation.timeKey] = [];
      }
      groups[reservation.timeKey].push(reservation);
    }

    // Sort by timeKey and create TimeGroup objects
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([timeKey, resaList]): TimeGroup => ({
        timeKey,
        reservations: resaList,
        totalGuests: resaList.reduce((sum, r) => sum + r.partySize, 0),
        capacity: slotCapacities[timeKey] || 20,
      }));
  }, [reservations, slotCapacities]);

  if (reservations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Aucune réservation pour ce service
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-visible">
      {/* Column headers */}
      {!isCompact ? (
        <div className="sticky top-0 z-10 bg-white flex items-center px-4 py-3 border-b border-gray-200 gap-4">
          <span className="w-6 text-[10px] font-medium text-gray-400 uppercase tracking-wider"></span>
          <span className="w-14 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Heure</span>
          <span className="w-14 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Table</span>
          <span className="w-16 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Pers.</span>
          <span className="w-7 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Hist.</span>
          <span className="w-10 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Pays</span>
          <span className="min-w-40 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Nom</span>
          <span className="w-28 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Options</span>
          <span className="flex-1 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Note</span>
          <span className="w-32 text-[10px] font-medium text-gray-400 uppercase tracking-wider">Actions</span>
          <span className="w-10 text-[10px] font-medium text-gray-400 uppercase tracking-wider"></span>
        </div>
      ) : (
        <div className="sticky top-0 z-10 bg-white flex items-center px-3 py-2 border-b border-gray-200 gap-3">
          <span className="w-4 text-[9px] font-medium text-gray-400 uppercase tracking-wider"></span>
          <span className="w-11 text-[9px] font-medium text-gray-400 uppercase tracking-wider">Heure</span>
          <span className="w-10 text-[9px] font-medium text-gray-400 uppercase tracking-wider">Table</span>
          <span className="w-10 text-[9px] font-medium text-gray-400 uppercase tracking-wider">Pers.</span>
          <span className="w-5 text-[9px] font-medium text-gray-400 uppercase tracking-wider">Hist</span>
          <span className="w-6 text-[9px] font-medium text-gray-400 uppercase tracking-wider"></span>
          <span className="w-24 text-[9px] font-medium text-gray-400 uppercase tracking-wider">Nom</span>
          <span className="w-12 text-[9px] font-medium text-gray-400 uppercase tracking-wider">Opt.</span>
          <span className="flex-1 text-[9px] font-medium text-gray-400 uppercase tracking-wider">Note</span>
        </div>
      )}

      {/* Time groups */}
      {timeGroups.map((group) => (
        <div key={group.timeKey}>
          <TimeChunk
            timeKey={group.timeKey}
            totalGuests={group.totalGuests}
            capacity={group.capacity}
            reservationCount={group.reservations.length}
          />
          {group.reservations.map((reservation) => (
            <ReservationRow
              key={reservation._id}
              reservation={reservation}
              isCompact={isCompact}
              isExpanded={expandedId === reservation._id}
              isSelectedForAssignment={selectedForAssignmentId === reservation._id}
              onToggleExpand={() => onToggleExpand(reservation._id)}
              onStatusChange={(status) => onStatusChange(reservation._id, status, reservation.version)}
              onEdit={() => onEdit(reservation)}
              onSelectForAssignment={onSelectForAssignment ? () => onSelectForAssignment(reservation) : undefined}
              tables={tables}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
