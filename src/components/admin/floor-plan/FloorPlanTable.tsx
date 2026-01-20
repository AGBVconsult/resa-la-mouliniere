"use client";

import { useDraggable } from "@dnd-kit/core";
import { Users, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { GRID_CELL_SIZE, TABLE_SIZE, ZONE_STYLES } from "@/lib/constants/grid";
import type { TableInfo } from "@/lib/types/tables";

interface FloorPlanTableProps {
  table: TableInfo;
  isSelected: boolean;
  isAssigned: boolean;
  isEditMode: boolean;
  isDragging: boolean;
  onClick: () => void;
}

export function FloorPlanTable({
  table,
  isSelected,
  isAssigned,
  isEditMode,
  isDragging,
  onClick,
}: FloorPlanTableProps) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: table._id,
    disabled: !isEditMode,
  });

  const zoneStyle = ZONE_STYLES[table.zone];
  const width = (table.width ?? 1) * TABLE_SIZE - 4;
  const height = (table.height ?? 1) * TABLE_SIZE - 4;
  const gridWidth = table.width ?? 1;
  const gridHeight = table.height ?? 1;

  // La table reste à sa position d'origine pendant le drag
  // Le ghost (DragOverlay) et le DropIndicator suivent le curseur
  const style: React.CSSProperties = {
    left: table.positionX * GRID_CELL_SIZE + 2,
    top: table.positionY * GRID_CELL_SIZE + 2,
    width,
    height,
    touchAction: "none",
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute flex flex-col items-center justify-center rounded-lg border-2 transition-all duration-150",
        zoneStyle.bg,
        zoneStyle.border,
        !table.isActive && "opacity-40 grayscale",
        isDragging && "opacity-50 border-dashed border-slate-400",
        isSelected && !isDragging && "ring-2 ring-blue-500 ring-offset-2",
        isAssigned && "bg-violet-200 border-violet-500",
        isEditMode && !isDragging && "cursor-grab hover:scale-[1.02] hover:shadow-md",
        !isEditMode && "cursor-pointer hover:brightness-95"
      )}
      style={style}
      onClick={onClick}
      {...(isEditMode ? { ...listeners, ...attributes } : {})}
    >
      {/* Grip handle for edit mode */}
      {isEditMode && !isDragging && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-white rounded-full p-0.5 shadow-sm opacity-60">
          <GripVertical className="w-3 h-3 text-slate-400" />
        </div>
      )}

      {/* Table name */}
      <span className={cn("text-xs font-semibold", zoneStyle.text)}>
        {table.name}
      </span>

      {/* Capacity */}
      <span className={cn("text-[10px] flex items-center gap-0.5", zoneStyle.text, "opacity-75")}>
        {table.capacity} <Users className="w-2.5 h-2.5" />
      </span>

      {/* Dimensions badge if > 1×1 */}
      {(gridWidth > 1 || gridHeight > 1) && (
        <span className="absolute top-0.5 right-0.5 bg-slate-700 text-white text-[8px] px-1 rounded">
          {gridWidth}×{gridHeight}
        </span>
      )}
    </div>
  );
}
