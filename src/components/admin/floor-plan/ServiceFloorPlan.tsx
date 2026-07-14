"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Users, X, Check } from "lucide-react";
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
  hideCapacity?: boolean;
}

type TableStatus = "seated" | "reserved" | "free" | "blocked";

const STATUS_COLORS: Record<TableStatus, { bg: string; border: string; text: string }> = {
  free: { bg: "bg-white", border: "border-transparent", text: "text-black" },
  reserved: { bg: "bg-[#D0E1F9]", border: "border-transparent", text: "text-blue-900" }, // Bleu glacier pour assigned/confirmed
  seated: { bg: "bg-[#91BDA0]", border: "border-transparent", text: "text-black" }, // Vert sauge pour seated
  blocked: { bg: "bg-gray-400", border: "border-transparent", text: "text-gray-700" },
};

// État pour le mode édition de table
interface EditingTableState {
  tableId: string;
  reservationId: Id<"reservations">;
  reservationVersion: number;
  reservationName: string;
  partySize: number;
  babyCount: number;
}

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
  hideCapacity = false,
}: ServiceFloorPlanProps) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [activeZone, setActiveZone] = useState<"salle" | "terrasse">("salle");
  const [tabletScale, setTabletScale] = useState(1);
  const [editingTable, setEditingTable] = useState<EditingTableState | null>(null);
  // Sélection manuelle de tables en attente de confirmation (assignation multi-tables)
  const [pendingTableIds, setPendingTableIds] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tabletContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Query table states for this service
  const tableStates = useQuery(api.floorplan.getTableStates, { dateKey, service });
  const assignMutation = useMutation(api.floorplan.assign);
  const unassignMutation = useMutation(api.floorplan.unassign);
  const swapMutation = useMutation(api.floorplan.swap);

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

  // Tablet mode: observe container and compute scale to fill available space
  useEffect(() => {
    if (!hideHeader) return;
    const el = tabletContainerRef.current;
    if (!el) return;

    const PADDING = 32; // 16px * 2 (p-4)
    const compute = () => {
      const rect = el.getBoundingClientRect();
      const availableW = rect.width - PADDING;
      const availableH = rect.height - PADDING;
      if (availableW > 0 && availableH > 0 && gridLayout.width > 0 && gridLayout.height > 0) {
        const scaleX = availableW / gridLayout.width;
        const scaleY = availableH / gridLayout.height;
        setTabletScale(Math.min(scaleX, scaleY));
      }
    };

    const observer = new ResizeObserver(compute);
    observer.observe(el);
    compute(); // immediate first calculation
    return () => observer.disconnect();
  }, [hideHeader, gridLayout.width, gridLayout.height]);

  // Reset pending selection whenever the assignment context changes
  useEffect(() => {
    setPendingTableIds([]);
  }, [selectedReservationId, editingTable?.reservationId, activeZone, dateKey, service]);


  // Toggle a table in the pending selection
  const togglePendingTable = (tableId: string) => {
    setPendingTableIds((prev) =>
      prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId]
    );
  };

  // Handle unassign from editing table
  const handleUnassign = async () => {
    if (!editingTable || isAssigning) return;
    
    // Get current version from tableStates to avoid version conflicts
    const currentTable = tableStates?.tables.find(t => t.reservation?.id === editingTable.reservationId);
    const currentVersion = currentTable?.reservation?.version ?? editingTable.reservationVersion;
    
    setIsAssigning(true);
    try {
      await unassignMutation({
        reservationId: editingTable.reservationId,
        expectedVersion: currentVersion,
      });
      toast.success("Affectation supprimée");
      setEditingTable(null);
    } catch (error: unknown) {
      toast.error(formatConvexError(error, "Erreur de suppression"));
    } finally {
      setIsAssigning(false);
    }
  };

  // Confirm move of the editing reservation to the pending selection
  const handleConfirmMove = async () => {
    if (!editingTable || isAssigning || pendingTableIds.length === 0) return;
    
    // Get current version from tableStates to avoid version conflicts
    const currentTable = tableStates?.tables.find(t => t.reservation?.id === editingTable.reservationId);
    const currentVersion = currentTable?.reservation?.version ?? editingTable.reservationVersion;
    
    setIsAssigning(true);
    try {
      await assignMutation({
        reservationId: editingTable.reservationId,
        tableIds: pendingTableIds as Id<"tables">[],
        primaryTableId: pendingTableIds[0] as Id<"tables">,
        expectedVersion: currentVersion,
      });
      toast.success("Réservation déplacée");
      setEditingTable(null);
      setPendingTableIds([]);
    } catch (error: unknown) {
      toast.error(formatConvexError(error, "Erreur de déplacement"));
    } finally {
      setIsAssigning(false);
    }
  };

  // Handle swap between two reservations
  const handleSwapReservations = async (targetTable: typeof filteredTables[0]) => {
    if (!editingTable || isAssigning || !targetTable.reservation) return;
    
    // Get current versions from tableStates to avoid version conflicts
    const currentTableA = tableStates?.tables.find(t => t.reservation?.id === editingTable.reservationId);
    const currentVersionA = currentTableA?.reservation?.version ?? editingTable.reservationVersion;
    const currentVersionB = targetTable.reservation.version;
    
    setIsAssigning(true);
    try {
      await swapMutation({
        reservationA: {
          id: editingTable.reservationId,
          expectedVersion: currentVersionA,
        },
        reservationB: {
          id: targetTable.reservation.id,
          expectedVersion: currentVersionB,
        },
      });
      toast.success("Tables échangées");
      setEditingTable(null);
    } catch (error: unknown) {
      toast.error(formatConvexError(error, "Erreur d'échange"));
    } finally {
      setIsAssigning(false);
    }
  };

  // Confirm assignment of the selected reservation to the pending selection
  const handleConfirmAssign = async () => {
    if (!selectedReservationId || selectedReservationVersion === undefined) return;
    if (isAssigning || pendingTableIds.length === 0) return;

    setIsAssigning(true);
    try {
      await assignMutation({
        reservationId: selectedReservationId,
        tableIds: pendingTableIds as Id<"tables">[],
        primaryTableId: pendingTableIds[0] as Id<"tables">,
        expectedVersion: selectedReservationVersion,
      });
      toast.success(pendingTableIds.length > 1 ? "Tables assignées" : "Table assignée");
      setPendingTableIds([]);
      onAssignmentComplete?.();
    } catch (error: unknown) {
      toast.error(formatConvexError(error, "Erreur d'assignation"));
    } finally {
      setIsAssigning(false);
    }
  };

  // Handle table click - toggle manual selection or highlight reservation
  const handleTableClick = async (tableId: string, status: TableStatus, reservationId?: Id<"reservations"> | null, table?: typeof filteredTables[0]) => {
    // Mode édition actif : sélectionner les tables cibles ou échanger
    if (editingTable) {
      if (tableId === editingTable.tableId) {
        // Clic sur la même table = désélectionner
        setEditingTable(null);
        setPendingTableIds([]);
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
      
      // Si la table cible a une réservation, échanger les affectations
      if (table?.reservation) {
        await handleSwapReservations(table);
        return;
      }
      
      // Sinon ajouter/retirer la table de la sélection de destination
      togglePendingTable(tableId);
      return;
    }
    
    // Si pas de réservation sélectionnée pour assignation
    if (!selectedReservationId) {
      // Si la table a une réservation, activer le mode édition
      if (reservationId && table?.reservation) {
        setEditingTable({
          tableId,
          reservationId,
          reservationVersion: table.reservation.version,
          reservationName: table.reservation.lastName,
          partySize: table.reservation.partySize,
          babyCount: table.reservation.babyCount ?? 0,
        });
        onTableClick?.(reservationId);
        return;
      }
      // Sinon notifier le parent
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

    if (status === "reserved" || table?.reservation) {
      toast.error("Cette table est déjà réservée");
      return;
    }

    if (selectedReservationVersion === undefined) return;
    if (isAssigning) return;

    // Sélection manuelle : ajouter/retirer la table
    togglePendingTable(tableId);
  };

  // Selection banner (confirm/cancel the pending multi-table selection)
  const renderSelectionBanner = () => {
    if (pendingTableIds.length === 0) return null;

    return (
      <div className="flex items-center gap-3 bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-2">
        <span className="text-sm font-medium whitespace-nowrap">
          {pendingTableIds.length} table{pendingTableIds.length > 1 ? "s" : ""}
        </span>
        <button
          onClick={editingTable ? handleConfirmMove : handleConfirmAssign}
          disabled={isAssigning}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          {editingTable ? "Déplacer" : "Assigner"}
        </button>
        <button
          onClick={() => setPendingTableIds([])}
          disabled={isAssigning}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Annuler
        </button>
      </div>
    );
  };

  // Render tables content (shared between desktop and tablet modes)
  const renderTables = () => (
    <>
      {filteredTables.map((table) => {
        const isEditing = editingTable?.tableId === table.tableId;
        const isPending = pendingTableIds.includes(table.tableId);
        const statusColors = STATUS_COLORS[table.status as TableStatus];
        const width = (table.width ?? 1) * TABLE_SIZE - 4;
        const height = (table.height ?? 1) * TABLE_SIZE - 4;

        return (
          <div
            key={table.tableId}
            className={cn(
              "absolute flex flex-col items-center justify-center rounded-lg transition-all duration-150",
              isEditing
                ? "bg-amber-400 ring-2 ring-amber-500 ring-offset-1"
                : isPending
                  ? "bg-blue-200 ring-2 ring-blue-500 ring-offset-1"
                  : statusColors.bg,
              statusColors.border,
              table.status === "blocked" && "opacity-50",
              // Mode édition actif : toutes les tables sauf blocked/seated sont cliquables
              editingTable && table.status !== "blocked" && table.status !== "seated" && "cursor-pointer hover:scale-[1.02] hover:shadow-md",
              // Mode assignation normal
              !editingTable && selectedReservationId &&
                table.status !== "blocked" &&
                table.status !== "seated" &&
                "cursor-pointer hover:scale-[1.02] hover:shadow-md",
              // Table avec réservation cliquable pour édition
              !editingTable && !selectedReservationId && table.reservation && "cursor-pointer hover:scale-[1.02] hover:shadow-md",
              isAssigning && "pointer-events-none opacity-70"
            )}
            style={{
              left: table.positionX * GRID_CELL_SIZE - gridLayout.offsetX + 2,
              top: table.positionY * GRID_CELL_SIZE - gridLayout.offsetY + 2,
              width,
              height,
            }}
            onClick={() => handleTableClick(table.tableId, table.status as TableStatus, table.reservation?.id, table)}
          >
            {/* Bouton X pour supprimer l'affectation en mode édition */}
            {isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnassign();
                }}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-md z-10"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            )}
            {table.reservation ? (
              <>
                <span className={cn("text-[10px] font-bold leading-tight", isEditing ? "text-amber-900" : statusColors.text)}>
                  {table.reservation.timeKey}
                </span>
                <span className={cn("text-[9px] leading-tight truncate max-w-full px-0.5", isEditing ? "text-amber-900" : statusColors.text)}>
                  {table.reservation.lastName}
                </span>
              </>
            ) : (
              <>
                <span className={cn("text-xs font-semibold", statusColors.text)}>
                  {table.name}
                </span>
                {!hideCapacity && (
                  <span className={cn("text-[10px] flex items-center gap-0.5", statusColors.text, "opacity-75")}>
                    {table.capacity} <Users className="w-2.5 h-2.5" />
                  </span>
                )}
              </>
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

  if (hideHeader) {
    return (
      <div ref={tabletContainerRef} className="relative w-full h-full overflow-hidden flex items-center justify-center p-4">
        <div
          className="relative shrink-0"
          style={{
            width: gridLayout.width,
            height: gridLayout.height,
            transform: `scale(${tabletScale})`,
            transformOrigin: 'center center',
          }}
        >
          {renderTables()}
        </div>
        {pendingTableIds.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
            {renderSelectionBanner()}
          </div>
        )}
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

      {/* Selection banner */}
      {pendingTableIds.length > 0 && (
        <div className="flex justify-center mt-3 shrink-0">
          {renderSelectionBanner()}
        </div>
      )}

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
