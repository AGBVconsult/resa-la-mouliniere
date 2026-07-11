"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { AnimatePresence } from "framer-motion";
import {
  GRID_CELL_SIZE,
  GRID_WIDTH,
  GRID_HEIGHT,
  TABLE_GRID_SPAN,
} from "@/lib/constants/grid";
import { FloorPlanTable } from "./FloorPlanTable";
import { FloorPlanDropIndicator } from "./FloorPlanDropIndicator";
import { useFloorPlanContext } from "./FloorPlanProvider";
import type { TableInfo } from "@/lib/types/tables";

interface FloorPlanGridProps {
  tables: TableInfo[];
  selectedTableIds: Set<string>;
  onSelectTable: (tableId: string | null, event?: React.MouseEvent) => void;
  isEditMode?: boolean;
  assignedTableIds?: Set<string>;
}

export function FloorPlanGrid(props: FloorPlanGridProps) {
  // This component must be used inside FloorPlanProvider
  const { dragState } = useFloorPlanContext();
  return <FloorPlanGridInner {...props} dragState={dragState} selectedTableIds={props.selectedTableIds} />;
}

interface FloorPlanGridInnerProps extends FloorPlanGridProps {
  dragState: {
    activeId: string | null;
    activeTable: TableInfo | null;
    overPosition: { x: number; y: number } | null;
    isValidDrop: boolean;
  };
}

function FloorPlanGridInner({
  tables,
  selectedTableIds,
  onSelectTable,
  isEditMode = false,
  assignedTableIds = new Set(),
  dragState,
}: FloorPlanGridInnerProps) {
  const { setNodeRef } = useDroppable({ id: "floor-plan-grid" });
  const activeTableId = dragState?.activeId ?? null;

  // Calculate dynamic grid dimensions based on table positions
  const gridDimensions = useMemo(() => {
    if (tables.length === 0) {
      // Default minimum size when no tables
      return { width: GRID_WIDTH, height: 200 };
    }

    // Find the maximum extent of all tables
    let maxX = 0;
    let maxY = 0;

    for (const table of tables) {
      const tableWidth = (table.width ?? 1) * TABLE_GRID_SPAN;
      const tableHeight = (table.height ?? 1) * TABLE_GRID_SPAN;
      const tableEndX = table.positionX + tableWidth;
      const tableEndY = table.positionY + tableHeight;

      if (tableEndX > maxX) maxX = tableEndX;
      if (tableEndY > maxY) maxY = tableEndY;
    }

    // Add padding (2 grid cells) and convert to pixels
    const paddingCells = 2;
    const calculatedWidth = Math.max((maxX + paddingCells) * GRID_CELL_SIZE, 400);
    const calculatedHeight = Math.max((maxY + paddingCells) * GRID_CELL_SIZE, 200);

    // Cap at maximum grid size
    return {
      width: Math.min(calculatedWidth, GRID_WIDTH),
      height: Math.min(calculatedHeight, GRID_HEIGHT),
    };
  }, [tables]);

  return (
    <div
      ref={setNodeRef}
      className="relative bg-gray-50 border-2 border-gray-200 rounded-lg overflow-hidden transition-all duration-300"
      style={{ width: gridDimensions.width, height: gridDimensions.height }}
    >
      {/* Grid pattern */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={gridDimensions.width}
        height={gridDimensions.height}
      >
        <defs>
          <pattern
            id="grid"
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
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Tables */}
      {tables.map((table) => (
        <FloorPlanTable
          key={table._id}
          table={table}
          isSelected={selectedTableIds.has(table._id)}
          isAssigned={assignedTableIds.has(table._id)}
          isEditMode={isEditMode}
          isDragging={activeTableId === table._id}
          onSelect={onSelectTable}
        />
      ))}

      {/* Drop indicator - inside grid for correct positioning */}
      <AnimatePresence>
        {dragState?.activeTable && dragState?.overPosition && (
          <FloorPlanDropIndicator
            position={dragState.overPosition}
            width={dragState.activeTable.width}
            height={dragState.activeTable.height}
            isValid={dragState.isValidDrop}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
