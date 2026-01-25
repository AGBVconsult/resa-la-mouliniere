"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";
import {
  GRID_CELL_SIZE,
  TABLE_SIZE,
  TABLE_GRID_SPAN,
  GRID_WIDTH,
  GRID_HEIGHT,
} from "@/lib/constants/grid";
import { useToast } from "@/hooks/use-toast";
import { formatConvexError } from "@/lib/formatError";

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
  const [isAssigning, setIsAssigning] = useState(false);
  const [activeZone, setActiveZone] = useState<"salle" | "terrasse">("salle");
  const { toast } = useToast();

  // Query table states for this service
  const tableStates = useQuery(api.floorplan.getTableStates, { dateKey, service });
  const assignMutation = useMutation(api.floorplan.assign);

  // Filter tables by active zone and valid names (exclude test tables like D-30)
  const filteredTables = useMemo(() => {
    if (!tableStates) return [];
    return tableStates.tables.filter((t) => {
      // Normalize zone names (handle deprecated values)
      const normalizedZone = t.zone === "dining" ? "salle" : t.zone === "terrace" ? "terrasse" : t.zone;
      // Filter by zone
      if (normalizedZone !== activeZone) return false;
      // Exclude tables with names starting with "D" followed by a number or dash (test tables)
      if (/^D[0-9-]/.test(t.name)) return false;
      return true;
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

  // Find combinable tables - ONLY tables directly adjacent to the clicked table
  // Simple rule: tables must touch (gap <= TABLE_GRID_SPAN on both axes)
  const findCombinableTables = useMemo(() => {
    if (!tableStates) return () => [];
    
    return (clickedTableId: string, partySize: number): string[] => {
      const clickedTable = tableStates.tables.find((t) => t.tableId === clickedTableId);
      if (!clickedTable) return [clickedTableId];
      
      // If table has no combination direction, just return the clicked table
      if (clickedTable.combinationDirection === "none") {
        return [clickedTableId];
      }
      
      // If clicked table already has enough capacity, no need to combine
      if (clickedTable.capacity >= partySize) {
        return [clickedTableId];
      }
      
      const isHorizontal = clickedTable.combinationDirection === "horizontal";
      const clickedWidth = (clickedTable.width ?? 1) * TABLE_GRID_SPAN;
      const clickedHeight = (clickedTable.height ?? 1) * TABLE_GRID_SPAN;
      const clickedEndX = clickedTable.positionX + clickedWidth;
      const clickedEndY = clickedTable.positionY + clickedHeight;
      
      // Find ALL tables that are directly adjacent to the clicked table
      const adjacentTables = tableStates.tables.filter((t) => {
        if (t.tableId === clickedTableId) return false;
        
        // Must be same zone
        const normalizedZone = t.zone === "dining" ? "salle" : t.zone === "terrace" ? "terrasse" : t.zone;
        const clickedNormalizedZone = clickedTable.zone === "dining" ? "salle" : clickedTable.zone === "terrace" ? "terrasse" : clickedTable.zone;
        if (normalizedZone !== clickedNormalizedZone) return false;
        
        // Must have same combination direction
        if (t.combinationDirection !== clickedTable.combinationDirection) return false;
        
        // Must be available
        if (!t.isActive || t.status === "seated" || t.status === "blocked") return false;
        
        // Check if tables are touching (adjacent)
        const tWidth = (t.width ?? 1) * TABLE_GRID_SPAN;
        const tHeight = (t.height ?? 1) * TABLE_GRID_SPAN;
        const tEndX = t.positionX + tWidth;
        const tEndY = t.positionY + tHeight;
        
        // Calculate gaps between bounding boxes
        const xGap = Math.max(0, Math.max(clickedTable.positionX, t.positionX) - Math.min(clickedEndX, tEndX));
        const yGap = Math.max(0, Math.max(clickedTable.positionY, t.positionY) - Math.min(clickedEndY, tEndY));
        
        // Tables must touch on both axes (gap <= TABLE_GRID_SPAN)
        return xGap <= TABLE_GRID_SPAN && yGap <= TABLE_GRID_SPAN;
      });
      
      // Sort adjacent tables by position (for consistent ordering)
      adjacentTables.sort((a, b) => {
        if (isHorizontal) {
          return a.positionX - b.positionX;
        }
        return a.positionY - b.positionY;
      });
      
      // Build result: clicked table + adjacent tables until we have enough capacity
      const result: string[] = [clickedTableId];
      let totalCapacity = clickedTable.capacity;
      
      for (const table of adjacentTables) {
        if (totalCapacity >= partySize) break;
        result.push(table.tableId);
        totalCapacity += table.capacity;
      }
      
      return result;
    };
  }, [tableStates]);

  // Handle table click - assign directly on click
  const handleTableClick = async (tableId: string, status: TableStatus) => {
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

    if (selectedReservationVersion === undefined) return;
    if (isAssigning) return;

    // Auto-select combinable tables based on party size
    const partySize = selectedPartySize ?? 4;
    const tablesToSelect = findCombinableTables(tableId, partySize);
    
    // Assign directly
    setIsAssigning(true);
    try {
      await assignMutation({
        reservationId: selectedReservationId,
        tableIds: tablesToSelect as Id<"tables">[],
        primaryTableId: tableId as Id<"tables">,
        expectedVersion: selectedReservationVersion,
      });
      toast.success("Table assignée");
      onAssignmentComplete?.();
    } catch (error: unknown) {
      toast.error(formatConvexError(error, "Erreur d'assignation"));
    } finally {
      setIsAssigning(false);
    }
  };

  if (!tableStates) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Chargement du plan...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header: Title left | Switch center | Legend right */}
      <div className="flex items-center justify-between shrink-0">
        {/* Left: Title */}
        <h3 className="text-lg font-semibold whitespace-nowrap">Plan de salle</h3>

        {/* Center: Zone switch */}
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

        {/* Right: Legend */}
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
      </div>

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
                  selectedReservationId &&
                    table.status !== "blocked" &&
                    table.status !== "seated" &&
                    "cursor-pointer hover:scale-[1.02] hover:shadow-md",
                  isAssigning && "pointer-events-none opacity-70"
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
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
