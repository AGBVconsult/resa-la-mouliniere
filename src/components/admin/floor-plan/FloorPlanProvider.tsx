"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { snapToGridModifier } from "@/lib/modifiers/snapToGrid";
import { buildOccupancyGrid, canPlaceTable, pixelToGrid } from "@/lib/utils/occupancy";
import { triggerHaptic } from "@/lib/utils/haptics";
import { GRID_CELL_SIZE } from "@/lib/constants/grid";
import { FloorPlanTableGhost } from "./FloorPlanTableGhost";
import type { TableInfo } from "@/lib/types/tables";

interface DragState {
  activeId: string | null;
  activeTable: TableInfo | null;
  overPosition: { x: number; y: number } | null;
  isValidDrop: boolean;
}

interface FloorPlanContextValue {
  tables: TableInfo[];
  selectedTableIds: Set<string>;
  onSelectTable: (id: string | null, event?: React.MouseEvent) => void;
  isEditMode: boolean;
  dragState: DragState;
  assignedTableIds: Set<string>;
}

const FloorPlanContext = createContext<FloorPlanContextValue | null>(null);

export function useFloorPlanContext() {
  const context = useContext(FloorPlanContext);
  if (!context) {
    throw new Error("useFloorPlanContext must be used within FloorPlanProvider");
  }
  return context;
}

interface FloorPlanProviderProps {
  children: ReactNode;
  tables: TableInfo[];
  selectedTableIds: Set<string>;
  onSelectTable: (id: string | null, event?: React.MouseEvent) => void;
  onUpdatePosition: (tableId: string, x: number, y: number) => Promise<void>;
  isEditMode?: boolean;
  assignedTableIds?: Set<string>;
}

export function FloorPlanProvider({
  children,
  tables,
  selectedTableIds,
  onSelectTable,
  onUpdatePosition,
  isEditMode = true,
  assignedTableIds = new Set(),
}: FloorPlanProviderProps) {
  const [dragState, setDragState] = useState<DragState>({
    activeId: null,
    activeTable: null,
    overPosition: null,
    isValidDrop: false,
  });

  // Build occupancy grid
  const occupancyGrid = useMemo(
    () => buildOccupancyGrid(tables.map((t) => ({
      _id: t._id,
      positionX: t.positionX,
      positionY: t.positionY,
      width: t.width,
      height: t.height,
    }))),
    [tables]
  );

  // Sensors
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: isEditMode
      ? { distance: 5 }
      : { delay: 150, tolerance: 5 },
  });

  const keyboardSensor = useSensor(KeyboardSensor);

  const sensors = useSensors(pointerSensor, keyboardSensor);

  // Handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const tableId = event.active.id as string;
      const table = tables.find((t) => t._id === tableId);

      if (table) {
        triggerHaptic("grab");
        setDragState({
          activeId: tableId,
          activeTable: table,
          overPosition: { x: table.positionX, y: table.positionY },
          isValidDrop: true,
        });
      }
    },
    [tables]
  );

  const handleDragMove = useCallback(
    (event: any) => {
      const tableId = event.active.id as string;
      const table = tables.find((t) => t._id === tableId);
      if (!table) return;

      const width = table.width ?? 1;
      const height = table.height ?? 1;

      // Calculate new position
      const newPixelX = table.positionX * GRID_CELL_SIZE + event.delta.x;
      const newPixelY = table.positionY * GRID_CELL_SIZE + event.delta.y;
      const newGridPos = pixelToGrid(newPixelX, newPixelY, GRID_CELL_SIZE);

      // Check validity
      const { valid } = canPlaceTable(
        occupancyGrid,
        newGridPos.x,
        newGridPos.y,
        width,
        height,
        tableId
      );

      setDragState((prev) => ({
        ...prev,
        overPosition: newGridPos,
        isValidDrop: valid,
      }));
    },
    [tables, occupancyGrid]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const tableId = event.active.id as string;
      const table = tables.find((t) => t._id === tableId);

      if (!table) {
        setDragState({
          activeId: null,
          activeTable: null,
          overPosition: null,
          isValidDrop: false,
        });
        return;
      }

      // Calculate delta in grid units
      const deltaGridX = Math.round(event.delta.x / GRID_CELL_SIZE);
      const deltaGridY = Math.round(event.delta.y / GRID_CELL_SIZE);

      // If no movement, just reset
      if (deltaGridX === 0 && deltaGridY === 0) {
        setDragState({
          activeId: null,
          activeTable: null,
          overPosition: null,
          isValidDrop: false,
        });
        return;
      }

      // Determine which tables to move (all selected if dragged table is selected, otherwise just the dragged one)
      const tablesToMove = selectedTableIds.has(tableId)
        ? tables.filter((t) => selectedTableIds.has(t._id))
        : [table];

      // Validate all new positions
      let allValid = true;
      const newPositions: Array<{ tableId: string; x: number; y: number }> = [];

      for (const t of tablesToMove) {
        const newX = t.positionX + deltaGridX;
        const newY = t.positionY + deltaGridY;
        const width = t.width ?? 1;
        const height = t.height ?? 1;

        // Check bounds
        if (newX < 0 || newY < 0) {
          allValid = false;
          break;
        }

        // Check collision (exclude all tables being moved)
        const excludeIds = tablesToMove.map((tm) => tm._id);
        const { valid } = canPlaceTable(
          occupancyGrid,
          newX,
          newY,
          width,
          height,
          t._id,
          excludeIds
        );

        if (!valid) {
          allValid = false;
          break;
        }

        newPositions.push({ tableId: t._id, x: newX, y: newY });
      }

      // Reset drag state
      setDragState({
        activeId: null,
        activeTable: null,
        overPosition: null,
        isValidDrop: false,
      });

      if (!allValid) {
        triggerHaptic("error");
        return;
      }

      // Save all positions
      triggerHaptic("drop");
      try {
        await Promise.all(
          newPositions.map((pos) => onUpdatePosition(pos.tableId, pos.x, pos.y))
        );
      } catch (error) {
        console.error("Failed to update table positions:", error);
        triggerHaptic("error");
      }
    },
    [tables, occupancyGrid, onUpdatePosition, selectedTableIds]
  );

  const handleDragCancel = useCallback(() => {
    setDragState({
      activeId: null,
      activeTable: null,
      overPosition: null,
      isValidDrop: false,
    });
  }, []);

  const contextValue: FloorPlanContextValue = {
    tables,
    selectedTableIds,
    onSelectTable,
    isEditMode,
    dragState,
    assignedTableIds,
  };

  return (
    <FloorPlanContext.Provider value={contextValue}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[snapToGridModifier, restrictToParentElement]}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {children}

        {/* Ghost overlay - follows cursor */}
        <DragOverlay>
          {dragState.activeTable && (
            <FloorPlanTableGhost
              table={dragState.activeTable}
              isValid={dragState.isValidDrop}
            />
          )}
        </DragOverlay>
      </DndContext>
    </FloorPlanContext.Provider>
  );
}
