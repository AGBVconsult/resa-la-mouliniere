"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Users, X, Check, AlertCircle } from "lucide-react";
import {
  GRID_CELL_SIZE,
  TABLE_SIZE,
  GRID_WIDTH,
  GRID_HEIGHT,
} from "@/lib/constants/grid";
import { Button } from "@/components/ui/button";

// Simple toast replacement (can be replaced with sonner or react-hot-toast later)
const toast = {
  info: (msg: string) => console.log("[INFO]", msg),
  error: (msg: string) => console.error("[ERROR]", msg),
  success: (msg: string) => console.log("[SUCCESS]", msg),
};

interface ServiceFloorPlanProps {
  dateKey: string;
  service: "lunch" | "dinner";
  selectedReservationId?: Id<"reservations"> | null;
  selectedReservationVersion?: number;
  onAssignmentComplete?: () => void;
}

type TableStatus = "seated" | "reserved" | "free" | "blocked";

const STATUS_COLORS: Record<TableStatus, { bg: string; border: string; text: string }> = {
  free: { bg: "bg-emerald-100", border: "border-emerald-400", text: "text-emerald-800" },
  reserved: { bg: "bg-orange-100", border: "border-orange-400", text: "text-orange-800" },
  seated: { bg: "bg-red-100", border: "border-red-400", text: "text-red-800" },
  blocked: { bg: "bg-gray-200", border: "border-gray-400", text: "text-gray-500" },
};

export function ServiceFloorPlan({
  dateKey,
  service,
  selectedReservationId,
  selectedReservationVersion,
  onAssignmentComplete,
}: ServiceFloorPlanProps) {
  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(new Set());
  const [isAssigning, setIsAssigning] = useState(false);

  // Query table states for this service
  const tableStates = useQuery(api.floorplan.getTableStates, { dateKey, service });
  const assignMutation = useMutation(api.floorplan.assign);
  const checkAssignment = useQuery(
    api.floorplan.checkAssignment,
    selectedReservationId && selectedTableIds.size > 0
      ? {
          reservationId: selectedReservationId,
          tableIds: Array.from(selectedTableIds) as Id<"tables">[],
        }
      : "skip"
  );

  // Handle table click
  const handleTableClick = (tableId: string, status: TableStatus) => {
    if (!selectedReservationId) {
      toast.info("Sélectionnez d'abord une réservation à assigner");
      return;
    }

    if (status === "blocked") {
      toast.error("Cette table est désactivée");
      return;
    }

    if (status === "seated") {
      toast.error("Cette table est occupée (client assis)");
      return;
    }

    // Toggle selection
    setSelectedTableIds((prev) => {
      const next = new Set(prev);
      if (next.has(tableId)) {
        next.delete(tableId);
      } else {
        next.add(tableId);
      }
      return next;
    });
  };

  // Handle assignment
  const handleAssign = async () => {
    if (!selectedReservationId || selectedTableIds.size === 0) return;
    if (selectedReservationVersion === undefined) return;

    setIsAssigning(true);
    try {
      await assignMutation({
        reservationId: selectedReservationId,
        tableIds: Array.from(selectedTableIds) as Id<"tables">[],
        expectedVersion: selectedReservationVersion,
      });
      toast.success("Table(s) assignée(s)");
      setSelectedTableIds(new Set());
      onAssignmentComplete?.();
    } catch (error: any) {
      const message = error.message || "Erreur d'assignation";
      // Parse error code
      const [code, ...params] = message.split("|");
      switch (code) {
        case "VERSION_CONFLICT":
          toast.error("La réservation a été modifiée. Rafraîchissez la page.");
          break;
        case "TABLE_OCCUPIED_SEATED":
          toast.error(`${params[0]} est occupée par ${params[1]}`);
          break;
        case "TABLE_CONFLICT":
          toast.error(`${params[0]} est réservée par ${params[1]} (${params[2]})`);
          break;
        case "INSUFFICIENT_CAPACITY":
          toast.error(`Capacité insuffisante: ${params[0]} < ${params[1]} personnes`);
          break;
        default:
          toast.error(message);
      }
    } finally {
      setIsAssigning(false);
    }
  };

  // Cancel selection
  const handleCancel = () => {
    setSelectedTableIds(new Set());
  };

  // Calculate total capacity of selected tables
  const selectedCapacity = useMemo(() => {
    if (!tableStates) return 0;
    return tableStates.tables
      .filter((t) => selectedTableIds.has(t.tableId))
      .reduce((sum, t) => sum + t.capacity, 0);
  }, [tableStates, selectedTableIds]);

  if (!tableStates) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Chargement du plan...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with legend */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-400" /> Libre
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-orange-400" /> Réservée
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-400" /> Occupée
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-gray-400" /> Désactivée
          </span>
        </div>

        {/* Selection info */}
        {selectedReservationId && selectedTableIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {selectedTableIds.size} table(s) • {selectedCapacity} places
            </span>
            {checkAssignment && !checkAssignment.valid && (
              <span className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {checkAssignment.error?.split("|")[0]}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Floor plan grid */}
      <div
        className="relative bg-gray-50 border-2 border-gray-200 rounded-lg overflow-auto"
        style={{ maxWidth: "100%", maxHeight: "500px" }}
      >
        <div
          className="relative"
          style={{ width: GRID_WIDTH, height: GRID_HEIGHT, minWidth: GRID_WIDTH }}
        >
          {/* Grid pattern */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={GRID_WIDTH}
            height={GRID_HEIGHT}
          >
            <defs>
              <pattern
                id="service-grid"
                width={GRID_CELL_SIZE}
                height={GRID_CELL_SIZE}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${GRID_CELL_SIZE} 0 L 0 0 0 ${GRID_CELL_SIZE}`}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#service-grid)" />
          </svg>

          {/* Tables */}
          {tableStates.tables.map((table) => {
            const isSelected = selectedTableIds.has(table.tableId);
            const statusColors = STATUS_COLORS[table.status as TableStatus];
            const width = TABLE_SIZE - 4;
            const height = TABLE_SIZE - 4;

            return (
              <div
                key={table.tableId}
                className={cn(
                  "absolute flex flex-col items-center justify-center rounded-lg border-2 transition-all duration-150",
                  statusColors.bg,
                  statusColors.border,
                  table.status === "blocked" && "opacity-50",
                  isSelected && "ring-2 ring-blue-500 ring-offset-2 scale-105",
                  selectedReservationId &&
                    table.status !== "blocked" &&
                    table.status !== "seated" &&
                    "cursor-pointer hover:scale-[1.02] hover:shadow-md"
                )}
                style={{
                  left: table.positionX * GRID_CELL_SIZE + 2,
                  top: table.positionY * GRID_CELL_SIZE + 2,
                  width,
                  height,
                }}
                onClick={() => handleTableClick(table.tableId, table.status as TableStatus)}
              >
                {/* Table name */}
                <span className={cn("text-xs font-semibold", statusColors.text)}>
                  {table.name}
                </span>

                {/* Capacity */}
                <span className={cn("text-[10px] flex items-center gap-0.5", statusColors.text, "opacity-75")}>
                  {table.capacity} <Users className="w-2.5 h-2.5" />
                </span>

                {/* Reservation info if assigned */}
                {table.reservation && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white px-1 rounded text-[8px] font-medium shadow truncate max-w-full">
                    {table.reservation.lastName}
                  </span>
                )}

                {/* Selection checkmark */}
                {isSelected && (
                  <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-0.5">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      {selectedReservationId && selectedTableIds.size > 0 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={isAssigning}>
            <X className="w-4 h-4 mr-1" />
            Annuler
          </Button>
          <Button
            size="sm"
            onClick={handleAssign}
            disabled={isAssigning || (checkAssignment && !checkAssignment.valid)}
          >
            <Check className="w-4 h-4 mr-1" />
            Assigner {selectedTableIds.size} table(s)
          </Button>
        </div>
      )}

      {/* Unassigned reservations */}
      {tableStates.unassignedReservations && tableStates.unassignedReservations.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Réservations sans table ({tableStates.unassignedReservations?.length ?? 0})
          </h4>
          <div className="flex flex-wrap gap-2">
            {tableStates.unassignedReservations?.map((r) => (
              <div
                key={r.id}
                className={cn(
                  "px-2 py-1 rounded border text-xs",
                  selectedReservationId === r.id
                    ? "bg-blue-100 border-blue-400"
                    : "bg-gray-50 border-gray-200"
                )}
              >
                <span className="font-medium">{r.timeKey}</span> - {r.lastName} ({r.partySize}p)
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
