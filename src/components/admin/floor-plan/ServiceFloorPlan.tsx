"use client";

import { useMemo, useState, useRef } from "react";
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
  onTableClick?: (reservationId: Id<"reservations"> | null) => void;
  hideHeader?: boolean;
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
  onTableClick,
  hideHeader = false,
}: ServiceFloorPlanProps) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [activeZone, setActiveZone] = useState<"salle" | "terrasse">("salle");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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

  // Calculate dynamic grid dimensions and offset based on filtered table positions
  // Only active (non-blocked) tables drive the bounding box — blocked tables at
  // default position (0,0) would otherwise stretch the grid to the origin.
  const gridLayout = useMemo(() => {
    if (filteredTables.length === 0) {
      return { width: 400, height: 200, offsetX: 0, offsetY: 0 };
    }

    // Use only active tables for the bounding box
    const activeTables = filteredTables.filter((t) => t.status !== "blocked");
    const bboxTables = activeTables.length > 0 ? activeTables : filteredTables;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = 0;
    let maxY = 0;

    for (const table of bboxTables) {
      const tableWidth = (table.width ?? 1) * TABLE_GRID_SPAN;
      const tableHeight = (table.height ?? 1) * TABLE_GRID_SPAN;
      const tableEndX = table.positionX + tableWidth;
      const tableEndY = table.positionY + tableHeight;

      if (table.positionX < minX) minX = table.positionX;
      if (table.positionY < minY) minY = table.positionY;
      if (tableEndX > maxX) maxX = tableEndX;
      if (tableEndY > maxY) maxY = tableEndY;
    }

    const paddingCells = 2;
    const originX = Math.max(minX - paddingCells, 0);
    const originY = Math.max(minY - paddingCells, 0);
    const croppedWidth = Math.max((maxX - originX + paddingCells) * GRID_CELL_SIZE, 400);
    const croppedHeight = Math.max((maxY - originY + paddingCells) * GRID_CELL_SIZE, 200);

    return {
      width: Math.min(croppedWidth, GRID_WIDTH),
      height: Math.min(croppedHeight, GRID_HEIGHT),
      offsetX: originX * GRID_CELL_SIZE,
      offsetY: originY * GRID_CELL_SIZE,
    };
  }, [filteredTables]);


  // Find adjacent combinable tables - analyzes both directions and picks the best option
  // The clicked table is always included, then we find the best combination (forward or backward)
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
      
      // Helper to check if two tables are adjacent
      const areAdjacent = (t1: typeof sorted[0], t2: typeof sorted[0]): boolean => {
        const t1Size = isHorizontal ? (t1.width ?? 1) : (t1.height ?? 1);
        const t1End = isHorizontal 
          ? t1.positionX + t1Size * TABLE_GRID_SPAN
          : t1.positionY + t1Size * TABLE_GRID_SPAN;
        const t2Start = isHorizontal ? t2.positionX : t2.positionY;
        return t2Start - t1End <= TABLE_GRID_SPAN;
      };
      
      // Try FORWARD combination (clicked table + tables after)
      const forwardResult: string[] = [clickedTableId];
      let forwardCapacity = clickedTable.capacity;
      for (let i = clickedIndex + 1; i < sorted.length && forwardCapacity < partySize; i++) {
        const table = sorted[i];
        const prevTable = sorted[i - 1];
        if (!areAdjacent(prevTable, table)) break;
        forwardResult.push(table.tableId);
        forwardCapacity += table.capacity;
      }
      
      // Try BACKWARD combination (clicked table + tables before)
      const backwardResult: string[] = [clickedTableId];
      let backwardCapacity = clickedTable.capacity;
      for (let i = clickedIndex - 1; i >= 0 && backwardCapacity < partySize; i--) {
        const table = sorted[i];
        const nextTable = sorted[i + 1];
        if (!areAdjacent(table, nextTable)) break;
        backwardResult.unshift(table.tableId);
        backwardCapacity += table.capacity;
      }
      
      // Choose the best option:
      // 1. If forward meets capacity, use forward
      // 2. If backward meets capacity but forward doesn't, use backward
      // 3. If neither meets capacity, use the one with more capacity
      if (forwardCapacity >= partySize) {
        return forwardResult;
      }
      if (backwardCapacity >= partySize) {
        return backwardResult;
      }
      // Neither meets capacity - return the one with more capacity
      return forwardCapacity >= backwardCapacity ? forwardResult : backwardResult;
    };
  }, [tableStates]);

  // Handle table click - assign directly on click or highlight reservation
  const handleTableClick = async (tableId: string, status: TableStatus, reservationId?: Id<"reservations"> | null) => {
    // Si pas de réservation sélectionnée pour assignation, on notifie la réservation de la table cliquée
    if (!selectedReservationId) {
      // Notifier le parent de la réservation affectée à cette table (pour surbrillance)
      onTableClick?.(reservationId ?? null);
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

  // Render tables content (shared between desktop and tablet modes)
  const renderTables = () => (
    <>
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
              left: table.positionX * GRID_CELL_SIZE - gridLayout.offsetX + 2,
              top: table.positionY * GRID_CELL_SIZE - gridLayout.offsetY + 2,
              width,
              height,
            }}
            onClick={() => handleTableClick(table.tableId, table.status as TableStatus, table.reservation?.id)}
          >
            <span className={cn("text-xs font-semibold", statusColors.text)}>
              {table.name}
            </span>
            <span className={cn("text-[10px] flex items-center gap-0.5", statusColors.text, "opacity-75")}>
              {table.capacity} <Users className="w-2.5 h-2.5" />
            </span>
            {table.reservation && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white px-1 rounded text-[8px] font-medium shadow truncate max-w-full">
                {table.reservation.lastName}
              </span>
            )}
          </div>
        );
      })}
    </>
  );

  if (!tableStates) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Chargement du plan...
      </div>
    );
  }

  // Tablet mode: simple overflow auto, no complex scaling
  if (hideHeader) {
    return (
      <div className="w-full h-full overflow-auto">
        <div
          className="relative"
          style={{
            width: gridLayout.width,
            height: gridLayout.height,
          }}
        >
          {renderTables()}
        </div>
      </div>
    );
  }

  // Desktop mode
  return (
    <div ref={wrapperRef} className="h-full flex flex-col">
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
        ref={containerRef}
        className="flex-1 relative rounded-lg transition-all duration-300 overflow-auto mt-4 bg-gray-50 border-2 border-gray-200"
        style={{ maxHeight: gridLayout.height + 4 }}
      >
        <div
          className="relative"
          style={{
            width: gridLayout.width,
            height: gridLayout.height,
            minWidth: gridLayout.width,
          }}
        >
          {/* Grid pattern */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={gridLayout.width}
            height={gridLayout.height}
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

          {renderTables()}
        </div>
      </div>
    </div>
  );
}
