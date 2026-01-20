"use client";

import { useMemo } from "react";
import { Users, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GRID_CELL_SIZE,
  TABLE_SIZE,
  GRID_WIDTH,
  GRID_HEIGHT,
  GRID_COLS,
  GRID_ROWS,
  ZONE_STYLES,
  COMBINATION_LINE_COLORS,
  TABLE_GRID_SPAN,
} from "@/lib/constants/grid";
import type { TableInfo, Zone, CombinationDirection } from "@/lib/types/tables";

interface FloorPlanGridProps {
  tables: TableInfo[];
  selectedTableId: string | null;
  onSelectTable: (tableId: string | null) => void;
  isEditMode?: boolean;
  assignedTableIds?: Set<string>;
  onTableDragStart?: (tableId: string) => void;
  onTableDragEnd?: (tableId: string, newX: number, newY: number) => void;
}

export function FloorPlanGrid({
  tables,
  selectedTableId,
  onSelectTable,
  isEditMode = false,
  assignedTableIds = new Set(),
}: FloorPlanGridProps) {
  // Calculate combination lines
  const combinationLines = useMemo(() => {
    const lines: Array<{
      key: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color: string;
    }> = [];

    for (const table of tables) {
      if (!table.isActive || table.combinationDirection === "none") continue;

      const tableWidth = (table.width ?? 1) * TABLE_SIZE;
      const tableHeight = (table.height ?? 1) * TABLE_SIZE;
      const centerX = table.positionX * GRID_CELL_SIZE + tableWidth / 2;
      const centerY = table.positionY * GRID_CELL_SIZE + tableHeight / 2;

      // Find adjacent table
      const adjacent = tables.find((t) => {
        if (!t.isActive || t._id === table._id) return false;
        if (t.combinationDirection !== table.combinationDirection) return false;

        if (table.combinationDirection === "horizontal") {
          return (
            t.positionY === table.positionY &&
            t.positionX === table.positionX + TABLE_GRID_SPAN * (table.width ?? 1)
          );
        } else {
          return (
            t.positionX === table.positionX &&
            t.positionY === table.positionY + TABLE_GRID_SPAN * (table.height ?? 1)
          );
        }
      });

      if (adjacent) {
        const adjWidth = (adjacent.width ?? 1) * TABLE_SIZE;
        const adjHeight = (adjacent.height ?? 1) * TABLE_SIZE;
        const adjCenterX = adjacent.positionX * GRID_CELL_SIZE + adjWidth / 2;
        const adjCenterY = adjacent.positionY * GRID_CELL_SIZE + adjHeight / 2;

        lines.push({
          key: `${table._id}-${adjacent._id}`,
          x1: centerX,
          y1: centerY,
          x2: adjCenterX,
          y2: adjCenterY,
          color: COMBINATION_LINE_COLORS[table.combinationDirection],
        });
      }
    }

    return lines;
  }, [tables]);

  return (
    <div
      className="relative bg-gray-50 border-2 border-gray-200 rounded-lg overflow-hidden"
      style={{ width: GRID_WIDTH, height: GRID_HEIGHT }}
    >
      {/* Grid pattern */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={GRID_WIDTH}
        height={GRID_HEIGHT}
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

      {/* Combination lines */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={GRID_WIDTH}
        height={GRID_HEIGHT}
        style={{ zIndex: 5 }}
      >
        {combinationLines.map((line) => (
          <line
            key={line.key}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={line.color}
            strokeWidth={3}
            strokeDasharray="6 4"
            opacity={0.5}
          />
        ))}
      </svg>

      {/* Tables */}
      {tables.map((table) => (
        <TableElement
          key={table._id}
          table={table}
          isSelected={selectedTableId === table._id}
          isAssigned={assignedTableIds.has(table._id)}
          isEditMode={isEditMode}
          onClick={() => onSelectTable(table._id)}
        />
      ))}
    </div>
  );
}

interface TableElementProps {
  table: TableInfo;
  isSelected: boolean;
  isAssigned: boolean;
  isEditMode: boolean;
  onClick: () => void;
}

function TableElement({
  table,
  isSelected,
  isAssigned,
  isEditMode,
  onClick,
}: TableElementProps) {
  const zoneStyle = ZONE_STYLES[table.zone];
  const width = (table.width ?? 1) * TABLE_SIZE - 4;
  const height = (table.height ?? 1) * TABLE_SIZE - 4;

  return (
    <div
      className={cn(
        "absolute flex flex-col items-center justify-center rounded-lg border-2 transition-all",
        zoneStyle.bg,
        zoneStyle.border,
        !table.isActive && "opacity-40 grayscale",
        isSelected && "ring-2 ring-blue-500 ring-offset-2",
        isAssigned && "bg-violet-200 border-violet-500",
        isEditMode && "cursor-grab hover:scale-[1.02] hover:shadow-md",
        !isEditMode && "cursor-pointer hover:brightness-95"
      )}
      style={{
        left: table.positionX * GRID_CELL_SIZE + 2,
        top: table.positionY * GRID_CELL_SIZE + 2,
        width,
        height,
        zIndex: isSelected ? 20 : 10,
      }}
      onClick={onClick}
    >
      {/* Grip handle for edit mode */}
      {isEditMode && (
        <GripVertical className="absolute top-0.5 left-1/2 -translate-x-1/2 h-3 w-3 text-gray-400" />
      )}

      {/* Table name */}
      <span className={cn("text-xs font-semibold", zoneStyle.text)}>
        {table.name}
      </span>

      {/* Capacity */}
      <span className={cn("text-[10px] flex items-center gap-0.5", zoneStyle.text)}>
        {table.capacity}
        <Users className="h-2.5 w-2.5" />
      </span>

      {/* Dimensions badge if > 1x1 */}
      {((table.width ?? 1) > 1 || (table.height ?? 1) > 1) && (
        <span className="absolute bottom-0.5 right-0.5 text-[8px] bg-white/50 px-1 rounded">
          {table.width ?? 1}×{table.height ?? 1}
        </span>
      )}
    </div>
  );
}
