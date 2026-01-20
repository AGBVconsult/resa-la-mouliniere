"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { Plus, Sun, CloudOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FloorPlanGrid,
  FloorPlanProvider,
  TableEditPanel,
  FloorPlanStats,
  TableModal,
} from "@/components/admin/floor-plan";
import type { TableInfo, Zone, CombinationDirection } from "@/lib/types/tables";
import { TABLE_GRID_SPAN } from "@/lib/constants/grid";

type ZoneFilter = "all" | "salle" | "terrasse";

export default function TablesPage() {
  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(new Set());
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Helper to get single selected table (for edit panel)
  const selectedTableId = selectedTableIds.size === 1 ? Array.from(selectedTableIds)[0] : null;

  // Queries
  const tablesRaw = useQuery(api.tables.list, {});
  const stats = useQuery(api.tables.stats, {});

  // Mutations
  const createTable = useMutation(api.tables.create);
  const updateTable = useMutation(api.tables.update);
  const duplicateTable = useMutation(api.tables.duplicate);
  const activateTable = useMutation(api.tables.activate);
  const deactivateTable = useMutation(api.tables.deactivate);
  const removeTable = useMutation(api.tables.remove);
  const activateTerrace = useMutation(api.tables.activateTerrace);
  const deactivateTerrace = useMutation(api.tables.deactivateTerrace);

  // Transform tables to TableInfo format (handle migration from gridX/gridY)
  const tables: TableInfo[] = (tablesRaw ?? []).map((t: any) => ({
    _id: t._id,
    name: t.name,
    capacity: t.capacity,
    zone: (t.zone === "dining" ? "salle" : t.zone === "terrace" ? "terrasse" : t.zone) as Zone,
    positionX: t.positionX ?? (t.gridX ?? 0) * TABLE_GRID_SPAN,
    positionY: t.positionY ?? (t.gridY ?? 0) * TABLE_GRID_SPAN,
    width: t.width ?? 1,
    height: t.height ?? 1,
    combinationDirection: (t.combinationDirection ?? "none") as CombinationDirection,
    isActive: t.isActive,
  }));

  // Filter tables by zone
  const filteredTables = tables.filter((t) => {
    if (zoneFilter === "all") return true;
    return t.zone === zoneFilter;
  });

  // Get selected table (only if single selection)
  const selectedTable = selectedTableId ? tables.find((t) => t._id === selectedTableId) ?? null : null;

  // Handle table selection (supports multi-select with Ctrl/Cmd)
  const handleSelectTable = useCallback((tableId: string | null, event?: React.MouseEvent) => {
    if (!tableId) {
      setSelectedTableIds(new Set());
      return;
    }

    const isMultiSelect = event?.metaKey || event?.ctrlKey;
    
    setSelectedTableIds((prev) => {
      const newSet = new Set(prev);
      if (isMultiSelect) {
        // Toggle selection
        if (newSet.has(tableId)) {
          newSet.delete(tableId);
        } else {
          newSet.add(tableId);
        }
      } else {
        // Single selection
        newSet.clear();
        newSet.add(tableId);
      }
      return newSet;
    });
  }, []);

  // Handlers
  const handleCreateTable = async (data: {
    name: string;
    capacity: number;
    zone: Zone;
    positionX: number;
    positionY: number;
    combinationDirection: CombinationDirection;
  }) => {
    try {
      await createTable(data);
    } catch (error) {
      console.error("Error creating table:", error);
    }
  };

  const handleUpdateTable = async (data: {
    name: string;
    capacity: number;
    zone: Zone;
    combinationDirection: CombinationDirection;
  }) => {
    if (!selectedTableId) return;
    try {
      await updateTable({
        tableId: selectedTableId as Id<"tables">,
        ...data,
      });
    } catch (error) {
      console.error("Error updating table:", error);
    }
  };

  const handleDuplicateTable = async () => {
    if (!selectedTableId) return;
    try {
      const result = await duplicateTable({
        tableId: selectedTableId as Id<"tables">,
      });
      setSelectedTableIds(new Set([result.tableId]));
    } catch (error) {
      console.error("Error duplicating table:", error);
    }
  };

  const handleToggleActive = async () => {
    if (!selectedTable) return;
    try {
      if (selectedTable.isActive) {
        await deactivateTable({ tableId: selectedTableId as Id<"tables"> });
      } else {
        await activateTable({ tableId: selectedTableId as Id<"tables"> });
      }
    } catch (error) {
      console.error("Error toggling table:", error);
    }
  };

  const handleDeleteTable = async () => {
    if (!selectedTableId) return;
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette table définitivement ?")) return;
    try {
      await removeTable({ tableId: selectedTableId as Id<"tables"> });
      setSelectedTableIds(new Set());
    } catch (error) {
      console.error("Error deleting table:", error);
      alert("Erreur: " + (error as Error).message);
    }
  };

  const handleActivateTerrace = async () => {
    try {
      await activateTerrace({});
    } catch (error) {
      console.error("Error activating terrace:", error);
    }
  };

  const handleDeactivateTerrace = async () => {
    try {
      await deactivateTerrace({});
    } catch (error) {
      console.error("Error deactivating terrace:", error);
    }
  };

  // Handle drag & drop position update
  const handleUpdatePosition = useCallback(
    async (tableId: string, x: number, y: number) => {
      try {
        await updateTable({
          tableId: tableId as Id<"tables">,
          positionX: x,
          positionY: y,
        });
      } catch (error) {
        console.error("Error updating table position:", error);
        throw error;
      }
    },
    [updateTable]
  );

  // Calculate next position for new table
  const getNextPosition = () => {
    if (tables.length === 0) return { x: 0, y: 0 };
    const maxX = Math.max(...tables.map((t) => t.positionX));
    const maxY = Math.max(...tables.map((t) => t.positionY));
    // Try to place next to last table
    if (maxX + TABLE_GRID_SPAN < 45) {
      return { x: maxX + TABLE_GRID_SPAN, y: maxY };
    }
    return { x: 0, y: maxY + TABLE_GRID_SPAN };
  };

  // Loading state
  if (!tablesRaw || !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Plan de salle</h1>
        <div className="flex items-center gap-2">
          {/* Zone filter */}
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setZoneFilter("all")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors",
                zoneFilter === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              )}
            >
              Tous
            </button>
            <button
              onClick={() => setZoneFilter("salle")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors border-l",
                zoneFilter === "salle"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              )}
            >
              Salle
            </button>
            <button
              onClick={() => setZoneFilter("terrasse")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors border-l",
                zoneFilter === "terrasse"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              )}
            >
              Terrasse
            </button>
          </div>

          {/* Terrace toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleActivateTerrace}
            className="text-emerald-600"
          >
            <Sun className="h-4 w-4 mr-1" />
            Ouvrir terrasse
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeactivateTerrace}
            className="text-gray-600"
          >
            <CloudOff className="h-4 w-4 mr-1" />
            Fermer terrasse
          </Button>

          {/* Add table */}
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex gap-6">
        {/* Floor plan */}
        <div className="flex-1 space-y-4">
          <FloorPlanProvider
            tables={filteredTables}
            selectedTableIds={selectedTableIds}
            onSelectTable={handleSelectTable}
            onUpdatePosition={handleUpdatePosition}
            isEditMode={true}
          >
            <FloorPlanGrid
              tables={filteredTables}
              selectedTableIds={selectedTableIds}
              onSelectTable={handleSelectTable}
              isEditMode={true}
            />
          </FloorPlanProvider>
          <FloorPlanStats stats={stats} />
        </div>

        {/* Edit panel */}
        <TableEditPanel
          table={selectedTable}
          onClose={() => setSelectedTableIds(new Set())}
          onSave={handleUpdateTable}
          onDuplicate={handleDuplicateTable}
          onToggleActive={handleToggleActive}
          onDelete={handleDeleteTable}
          selectedCount={selectedTableIds.size}
        />
      </div>

      {/* Create modal */}
      <TableModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateTable}
        defaultPosition={getNextPosition()}
      />
    </div>
  );
}
