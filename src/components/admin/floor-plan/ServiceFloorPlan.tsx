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
  TABLE_GRID_SPAN,
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
  selectedPartySize?: number;
  selectedReservationName?: string;
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
  selectedPartySize,
  selectedReservationName,
  onAssignmentComplete,
}: ServiceFloorPlanProps) {
  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(new Set());
  const [primaryTableId, setPrimaryTableId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [activeZone, setActiveZone] = useState<"salle" | "terrasse">("salle");

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

  // Filter tables by active zone
  const filteredTables = useMemo(() => {
    if (!tableStates) return [];
    // Normalize zone names (handle deprecated values)
    return tableStates.tables.filter((t) => {
      const normalizedZone = t.zone === "dining" ? "salle" : t.zone === "terrace" ? "terrasse" : t.zone;
      return normalizedZone === activeZone;
    });
  }, [tableStates, activeZone]);

  // Calculate dynamic grid dimensions based on filtered table positions
  const gridDimensions = useMemo(() => {
    if (filteredTables.length === 0) {
      return { width: 400, height: 200 };
    }

    let maxX = 0;
    let maxY = 0;

    for (const table of filteredTables) {
      const tableWidth = (table.width ?? 1) * TABLE_GRID_SPAN;
      const tableHeight = (table.height ?? 1) * TABLE_GRID_SPAN;
      const tableEndX = table.positionX + tableWidth;
      const tableEndY = table.positionY + tableHeight;

      if (tableEndX > maxX) maxX = tableEndX;
      if (tableEndY > maxY) maxY = tableEndY;
    }

    const paddingCells = 2;
    const calculatedWidth = Math.max((maxX + paddingCells) * GRID_CELL_SIZE, 400);
    const calculatedHeight = Math.max((maxY + paddingCells) * GRID_CELL_SIZE, 200);

    return {
      width: Math.min(calculatedWidth, GRID_WIDTH),
      height: Math.min(calculatedHeight, GRID_HEIGHT),
    };
  }, [filteredTables]);

  // Find adjacent combinable tables
  const findCombinableTables = useMemo(() => {
    if (!tableStates) return () => [];
    
    return (clickedTableId: string, partySize: number): string[] => {
      const clickedTable = tableStates.tables.find((t) => t.tableId === clickedTableId);
      if (!clickedTable) return [clickedTableId];
      
      // If table has no combination direction, just return the clicked table
      if (clickedTable.combinationDirection === "none") {
        return [clickedTableId];
      }
      
      // Find all tables with same combination direction in same zone
      const combinableTables = tableStates.tables.filter((t) => {
        const normalizedZone = t.zone === "dining" ? "salle" : t.zone === "terrace" ? "terrasse" : t.zone;
        const clickedNormalizedZone = clickedTable.zone === "dining" ? "salle" : clickedTable.zone === "terrace" ? "terrasse" : clickedTable.zone;
        return (
          normalizedZone === clickedNormalizedZone &&
          t.combinationDirection === clickedTable.combinationDirection &&
          t.isActive &&
          t.status !== "seated" &&
          t.status !== "blocked"
        );
      });
      
      // Sort by position to find adjacent tables
      const isHorizontal = clickedTable.combinationDirection === "horizontal";
      const sorted = [...combinableTables].sort((a, b) => {
        if (isHorizontal) {
          return a.positionX - b.positionX;
        }
        return a.positionY - b.positionY;
      });
      
      // Find the clicked table index
      const clickedIndex = sorted.findIndex((t) => t.tableId === clickedTableId);
      if (clickedIndex === -1) return [clickedTableId];
      
      // Collect tables starting from clicked, going forward until capacity is met
      const result: string[] = [];
      let totalCapacity = 0;
      
      // Start from clicked table and go forward
      for (let i = clickedIndex; i < sorted.length && totalCapacity < partySize; i++) {
        const table = sorted[i];
        // Check if adjacent (position difference should be small)
        if (i > clickedIndex) {
          const prevTable = sorted[i - 1];
          const posDiff = isHorizontal 
            ? table.positionX - (prevTable.positionX + (prevTable.width ?? 1) * 2)
            : table.positionY - (prevTable.positionY + (prevTable.height ?? 1) * 2);
          // Allow small gap (tables are typically 2 grid cells apart)
          if (posDiff > 2) break;
        }
        result.push(table.tableId);
        totalCapacity += table.capacity;
      }
      
      return result;
    };
  }, [tableStates]);

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

    // If clicking on already selected table, deselect all
    if (selectedTableIds.has(tableId)) {
      setSelectedTableIds(new Set());
      setPrimaryTableId(null);
      return;
    }

    // Auto-select combinable tables based on party size
    const partySize = selectedPartySize ?? 4;
    const tablesToSelect = findCombinableTables(tableId, partySize);
    
    setSelectedTableIds(new Set(tablesToSelect));
    setPrimaryTableId(tableId); // Remember which table was clicked
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
      setPrimaryTableId(null);
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
    setPrimaryTableId(null);
  };

  // Calculate total capacity of selected tables
  const selectedCapacity = useMemo(() => {
    if (!tableStates) return 0;
    return tableStates.tables
      .filter((t) => selectedTableIds.has(t.tableId))
      .reduce((sum, t) => sum + t.capacity, 0);
  }, [tableStates, selectedTableIds]);

  // Get primary table name for display
  const primaryTableName = useMemo(() => {
    if (!primaryTableId || !tableStates) return null;
    const table = tableStates.tables.find((t) => t.tableId === primaryTableId);
    return table?.name ?? null;
  }, [primaryTableId, tableStates]);

  if (!tableStates) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Chargement du plan...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header: Title + Zone switch + Legend on same line */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Title */}
        <h3 className="text-lg font-semibold whitespace-nowrap">Plan de salle</h3>

        {/* Zone switch */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              activeZone === "salle"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
            onClick={() => setActiveZone("salle")}
          >
            Salle
          </button>
          <button
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              activeZone === "terrasse"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
            onClick={() => setActiveZone("terrasse")}
          >
            Terrasse
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-400" /> Libre
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-orange-400" /> Réservée
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-red-400" /> Occupée
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Assignment info */}
        {selectedReservationName && (
          <div className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full whitespace-nowrap">
            Assigner: {selectedReservationName}
          </div>
        )}
      </div>

      {/* Selection info when tables selected */}
      {selectedReservationId && selectedTableIds.size > 0 && (
        <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
          <span>
            {primaryTableName && <span className="font-medium">{primaryTableName}</span>}
            {selectedTableIds.size > 1 && ` (+${selectedTableIds.size - 1})`}
            {" "}• {selectedCapacity} places
          </span>
          {checkAssignment && !checkAssignment.valid && (
            <span className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {checkAssignment.error?.split("|")[0]}
            </span>
          )}
        </div>
      )}

      {/* Floor plan grid */}
      <div
        className="flex-1 relative bg-gray-50 border-2 border-gray-200 rounded-lg overflow-auto mt-4 transition-all duration-300"
        style={{ maxHeight: gridDimensions.height + 4 }}
      >
        <div
          className="relative"
          style={{ width: gridDimensions.width, height: gridDimensions.height, minWidth: gridDimensions.width }}
        >
          {/* Grid pattern */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={gridDimensions.width}
            height={gridDimensions.height}
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
          {filteredTables.map((table) => {
            const isSelected = selectedTableIds.has(table.tableId);
            const isPrimary = table.tableId === primaryTableId;
            const statusColors = STATUS_COLORS[table.status as TableStatus];
            const width = (table.width ?? 1) * TABLE_SIZE - 4;
            const height = (table.height ?? 1) * TABLE_SIZE - 4;

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
                  <div className={cn(
                    "absolute -top-1 -right-1 rounded-full p-0.5",
                    isPrimary ? "bg-blue-600" : "bg-blue-400"
                  )}>
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action buttons - fixed at bottom */}
      {selectedReservationId && selectedTableIds.size > 0 && (
        <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t shrink-0">
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
    </div>
  );
}
