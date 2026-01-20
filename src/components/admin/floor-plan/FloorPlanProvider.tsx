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
import { AnimatePresence } from "framer-motion";
import { snapToGridModifier } from "@/lib/modifiers/snapToGrid";
import { buildOccupancyGrid, canPlaceTable, pixelToGrid } from "@/lib/utils/occupancy";
import { triggerHaptic } from "@/lib/utils/haptics";
import { GRID_CELL_SIZE } from "@/lib/constants/grid";
import { FloorPlanTableGhost } from "./FloorPlanTableGhost";
import { FloorPlanDropIndicator } from "./FloorPlanDropIndicator";
import type { TableInfo } from "@/lib/types/tables";

interface DragState {
  activeId: string | null;
  activeTable: TableInfo | null;
  overPosition: { x: number; y: number } | null;
  isValidDrop: boolean;
}

interface FloorPlanContextValue {
  tables: TableInfo[];
  selectedTableId: string | null;
  setSelectedTableId: (id: string | null) => void;
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
  selectedTableId: string | null;
  onSelectTable: (id: string | null) => void;
  onUpdatePosition: (tableId: string, x: number, y: number) => Promise<void>;
  isEditMode?: boolean;
  assignedTableIds?: Set<string>;
}

export function FloorPlanProvider({
  children,
  tables,
  selectedTableId,
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

      const width = table.width ?? 1;
      const height = table.height ?? 1;

      // Calculate final position
      const newPixelX = table.positionX * GRID_CELL_SIZE + event.delta.x;
      const newPixelY = table.positionY * GRID_CELL_SIZE + event.delta.y;
      const newGridPos = pixelToGrid(newPixelX, newPixelY, GRID_CELL_SIZE);

      // Validate
      const { valid } = canPlaceTable(
        occupancyGrid,
        newGridPos.x,
        newGridPos.y,
        width,
        height,
        tableId
      );

      // Reset drag state
      setDragState({
        activeId: null,
        activeTable: null,
        overPosition: null,
        isValidDrop: false,
      });

      if (!valid) {
        triggerHaptic("error");
        return;
      }

      // Save position
      triggerHaptic("drop");
      try {
        await onUpdatePosition(tableId, newGridPos.x, newGridPos.y);
      } catch (error) {
        console.error("Failed to update table position:", error);
        triggerHaptic("error");
      }
    },
    [tables, occupancyGrid, onUpdatePosition]
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
    selectedTableId,
    setSelectedTableId: onSelectTable,
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

        {/* Drop indicator */}
        <AnimatePresence>
          {dragState.activeTable && dragState.overPosition && (
            <FloorPlanDropIndicator
              position={dragState.overPosition}
              width={dragState.activeTable.width}
              height={dragState.activeTable.height}
              isValid={dragState.isValidDrop}
            />
          )}
        </AnimatePresence>

        {/* Ghost overlay */}
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
