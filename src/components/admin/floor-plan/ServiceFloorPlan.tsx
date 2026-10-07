"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { SegmentedControl } from "@/components/admin/SegmentedControl";
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

// `matchEditor` (mode tablette) : même cadre que l'éditeur du plan de salle (desktop) —
// origine en (0,0), toutes les tables, 2 cases de marge — pour que la disposition soit identique.
function computeGridLayout(
  tables: Array<{ positionX: number; positionY: number; width?: number; height?: number; status: string }>,
  matchEditor = false
) {
  if (tables.length === 0) return { width: 400, height: 200, offsetX: 0, offsetY: 0 };

  const active = tables.filter((t) => t.status !== "blocked");
  const bbox = matchEditor || active.length === 0 ? tables : active;

  let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
  for (const t of bbox) {
    const w = (t.width ?? 1) * TABLE_GRID_SPAN;
    const h = (t.height ?? 1) * TABLE_GRID_SPAN;
    if (t.positionX < minX) minX = t.positionX;
    if (t.positionY < minY) minY = t.positionY;
    if (t.positionX + w > maxX) maxX = t.positionX + w;
    if (t.positionY + h > maxY) maxY = t.positionY + h;
  }

  const pad = 2;
  if (matchEditor) {
    // Identique à FloorPlanGrid (réglages > tables)
    return {
      width: Math.max((maxX + pad) * GRID_CELL_SIZE, 400),
      height: Math.max((maxY + pad) * GRID_CELL_SIZE, 200),
      offsetX: 0,
      offsetY: 0,
    };
  }

  const originX = Math.max(minX - pad, 0);
  const originY = Math.max(minY - pad, 0);
  return {
    width: Math.min(Math.max((maxX - originX + pad) * GRID_CELL_SIZE, 400), GRID_WIDTH),
    height: Math.min(Math.max((maxY - originY + pad) * GRID_CELL_SIZE, 200), GRID_HEIGHT),
    offsetX: originX * GRID_CELL_SIZE,
    offsetY: originY * GRID_CELL_SIZE,
  };
}

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
  nameDisplay?: "firstName" | "lastName";
  /** Palette des tables : "classic" (admin desktop) ou "brume" (tablette) */
  tone?: "classic" | "brume";
}

type TableStatus = "seated" | "reserved" | "free" | "blocked";

const STATUS_COLORS: Record<TableStatus, { bg: string; border: string; text: string }> = {
  free: { bg: "bg-white", border: "border-transparent", text: "text-black" },
  reserved: { bg: "bg-[#D0E1F9]", border: "border-transparent", text: "text-blue-900" }, // Bleu glacier pour assigned/confirmed
  seated: { bg: "bg-[#91BDA0]", border: "border-transparent", text: "text-black" }, // Vert sauge pour seated
  blocked: { bg: "bg-gray-400", border: "border-transparent", text: "text-gray-700" },
};

// Derived accent colors for the 2nd half of a split table when both reservations share the same status
const SPLIT_ACCENTS: Record<string, { bg: string; text: string }> = {
  reserved: { bg: "bg-[#CFC7F0]", text: "text-purple-900" }, // Lavande
  seated: { bg: "bg-[#A9C9B4]", text: "text-black" }, // Vert-de-gris
};

// Thème tablette : plateau plein et doux, chaises en petits dossiers pleins collés au plateau.
// Le statut teinte le plateau, son contour et les dossiers.
const BRUME_STATUS_COLORS: Record<TableStatus, { bg: string; border: string; text: string }> = {
  free: { bg: "bg-white", border: "border border-[#D6D6D6] shadow-[0_1px_2px_rgba(0,0,0,0.05)]", text: "text-[#464646]" },
  reserved: { bg: "bg-[#EAF2FF]", border: "border border-[#9CC0FF] shadow-[0_1px_2px_rgba(0,0,0,0.05)]", text: "text-[#1F4F9E]" },
  seated: { bg: "bg-[#E3F5EA]", border: "border border-[#8FD3A8] shadow-[0_1px_2px_rgba(0,0,0,0.05)]", text: "text-[#166534]" },
  blocked: { bg: "bg-[#EFEFEF]", border: "border border-dashed border-[#DDDDDD]", text: "text-[#9A9A9A]" },
};

const BRUME_SPLIT_ACCENTS: Record<string, { bg: string; text: string }> = {
  reserved: { bg: "bg-[#EEEAFB]", text: "text-[#45397A]" }, // Lavande pâle
  seated: { bg: "bg-[#D3EEDD]", text: "text-[#166534]" }, // Vert-de-gris pâle
};

// Couleur des dossiers selon le statut de la table
const BRUME_CHAIR_COLORS: Record<TableStatus, string> = {
  free: "#D9D9D9",
  reserved: "#B9D3FF",
  seated: "#B4E3C5",
  blocked: "#E6E6E6",
};

// Marge réservée aux chaises autour du plateau, à l'intérieur de l'emprise de la table
const CHAIR_MARGIN = 6;
const CHAIR_GAP = 2; // espace entre le plateau et le dossier
const CHAIR_DEPTH = 3.4;
const CHAIR_MAX_LENGTH = 15;

/**
 * Tailles de police (px) de l'heure et du nom, proportionnelles au plateau (thème tablette) :
 * l'heure tient dans la largeur, le nom garde le plus de lettres possible.
 */
function getInfoFontSizes(w: number, h: number) {
  const base = Math.min(w, h * 1.4);
  return {
    time: Math.max(7, Math.min(13, base * 0.26)),
    name: Math.max(6.5, Math.min(11, base * 0.22)),
  };
}

type ChairSide = "top" | "right" | "bottom" | "left";

/**
 * Dossiers (position + taille) autour d'un plateau w × h.
 * `sideSeating` place les chaises d'une petite table carrée à gauche et à droite
 * (table collée à une autre au-dessus ou en dessous).
 */
function getChairs(capacity: number, w: number, h: number, round: boolean, sideSeating = false) {
  const n = Math.max(0, Math.min(capacity, 12));
  const chairs: Array<{ x: number; y: number; width: number; height: number; angle: number }> = [];
  if (n === 0) return chairs;
  const dist = CHAIR_GAP + CHAIR_DEPTH / 2; // distance entre le bord du plateau et le milieu du dossier

  if (round) {
    const length = Math.min(CHAIR_MAX_LENGTH - 1, ((Math.PI * w) / n) * 0.6);
    const r = w / 2 + dist;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      chairs.push({
        x: w / 2 + Math.cos(a) * r,
        y: h / 2 + Math.sin(a) * r,
        width: length,
        height: CHAIR_DEPTH,
        angle: (a * 180) / Math.PI + 90,
      });
    }
    return chairs;
  }

  // Répartition par côté : grands côtés (haut/bas pour une table carrée ou horizontale),
  // les quatre côtés seulement pour un grand carré (> 4 couverts)
  const perSide: Record<ChairSide, number> = { top: 0, right: 0, bottom: 0, left: 0 };
  if (w === h && n > 4) {
    const order: ChairSide[] = ["top", "bottom", "right", "left"];
    for (let i = 0; i < n; i++) perSide[order[i % 4]]++;
  } else if (w > h || (w === h && !sideSeating)) {
    perSide.top = Math.ceil(n / 2);
    perSide.bottom = n - perSide.top;
  } else {
    perSide.left = Math.ceil(n / 2);
    perSide.right = n - perSide.left;
  }

  (Object.keys(perSide) as ChairSide[]).forEach((side) => {
    const count = perSide[side];
    if (!count) return;
    const horizontal = side === "top" || side === "bottom";
    const sideLength = horizontal ? w : h;
    const length = Math.min(CHAIR_MAX_LENGTH, (sideLength / count) * 0.62);
    for (let i = 0; i < count; i++) {
      const along = ((i + 1) * sideLength) / (count + 1);
      chairs.push({
        x: horizontal ? along : side === "left" ? -dist : w + dist,
        y: horizontal ? (side === "top" ? -dist : h + dist) : along,
        width: horizontal ? length : CHAIR_DEPTH,
        height: horizontal ? CHAIR_DEPTH : length,
        angle: 0,
      });
    }
  });
  return chairs;
}

/** Dossiers pleins dessinés autour du plateau (thème tablette) */
function TableChairs({
  capacity,
  width,
  height,
  round,
  color,
  sideSeating,
}: {
  capacity: number;
  width: number;
  height: number;
  round: boolean;
  color: string;
  sideSeating: boolean;
}) {
  // Le plateau a une bordure de 1 px : on se cale sur le bord extérieur
  return (
    <>
      {getChairs(capacity, width, height, round, sideSeating).map((chair, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute pointer-events-none rounded-full"
          style={{
            left: chair.x - chair.width / 2 - 1,
            top: chair.y - chair.height / 2 - 1,
            width: chair.width,
            height: chair.height,
            backgroundColor: color,
            transform: chair.angle ? `rotate(${chair.angle}deg)` : undefined,
          }}
        />
      ))}
    </>
  );
}

function getReservationStatusAsTableStatus(resStatus: string): TableStatus {
  if (resStatus === "seated") return "seated";
  if (["pending", "confirmed", "cardPlaced"].includes(resStatus)) return "reserved";
  return "free";
}

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
  nameDisplay = "lastName",
  tone = "classic",
}: ServiceFloorPlanProps) {
  const isBrume = tone === "brume";
  const statusPalette = isBrume ? BRUME_STATUS_COLORS : STATUS_COLORS;
  const splitPalette = isBrume ? BRUME_SPLIT_ACCENTS : SPLIT_ACCENTS;
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

  // Tables collées à une autre au-dessus ou en dessous : leurs chaises passent sur les côtés
  const sideSeatingTableIds = useMemo(() => {
    const ids = new Set<string>();
    const span = TABLE_SIZE / GRID_CELL_SIZE; // taille d'une table en cases de grille
    for (const t of filteredTables) {
      const tx = t.positionX, ty = t.positionY;
      const tw = (t.width ?? 1) * span, th = (t.height ?? 1) * span;
      const stacked = filteredTables.some((o) => {
        if (o.tableId === t.tableId) return false;
        const ow = (o.width ?? 1) * span, oh = (o.height ?? 1) * span;
        const overlapX = o.positionX < tx + tw && o.positionX + ow > tx;
        const gapY = o.positionY >= ty ? o.positionY - (ty + th) : ty - (o.positionY + oh);
        const touchingY = gapY >= 0 && gapY < 1;
        return overlapX && touchingY;
      });
      if (stacked) ids.add(t.tableId);
    }
    return ids;
  }, [filteredTables]);

  // Bbox de la zone active (dimensions + offset du conteneur affiché)
  const gridLayout = useMemo(() => computeGridLayout(filteredTables, hideHeader), [filteredTables, hideHeader]);

  // Tables de la SALLE, indépendamment de la zone active → référence de taille
  const salleTables = useMemo(() => {
    if (!tableStates) return [];
    return tableStates.tables.filter((t) => {
      const z = t.zone === "dining" ? "salle" : t.zone === "terrace" ? "terrasse" : t.zone;
      return z === "salle" && !/^D[0-9-]/.test(t.name);
    });
  }, [tableStates]);

  const referenceLayout = useMemo(() => computeGridLayout(salleTables, hideHeader), [salleTables, hideHeader]);

  // Tablet mode: observe container and compute scale to fill available space
  // Scale basé sur referenceLayout (Salle) pour taille de tables identique entre zones
  useEffect(() => {
    if (!hideHeader) return;
    const el = tabletContainerRef.current;
    if (!el) return;

    const compute = () => {
      // Espace réellement disponible = boîte de contenu (padding du conteneur déduit,
      // dont la réserve en haut pour le switch Salle/Terrasse)
      const cs = getComputedStyle(el);
      const availableW = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const availableH = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      if (availableW > 0 && availableH > 0 && referenceLayout.width > 0 && referenceLayout.height > 0) {
        const scaleX = availableW / referenceLayout.width;
        const scaleY = availableH / referenceLayout.height;
        setTabletScale(Math.min(scaleX, scaleY));
      }
    };

    const observer = new ResizeObserver(compute);
    observer.observe(el);
    compute();
    return () => observer.disconnect();
  }, [hideHeader, referenceLayout.width, referenceLayout.height]);

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
  // reservationId: the specific reservation clicked (for split tables, it's the half)
  const handleTableClick = async (tableId: string, status: TableStatus, reservationId?: Id<"reservations"> | null, table?: typeof filteredTables[0]) => {
    // Mode édition actif : sélectionner les tables cibles ou échanger
    if (editingTable) {
      // Clic sur la même réservation = désélectionner
      if (reservationId && reservationId === editingTable.reservationId) {
        setEditingTable(null);
        setPendingTableIds([]);
        return;
      }
      
      if (status === "blocked") {
        toast.error("Cette table est désactivée");
        return;
      }

      // Table pleine (2/2) : le seul geste possible est l'échange
      if (table && table.reservationCount >= 2) {
        // Garde-fou limité au swap : un échange déplacerait un client déjà installé
        // sans avertissement. Ce test ne doit PAS gouverner l'ajout ci-dessous :
        // computeTableStatus passe toute la table en `seated` dès qu'un seul
        // occupant est assis, ce qui interdirait la 2e tournée ou un walk-in.
        const targetSeated = table.reservations?.some((r) => r.status === "seated") ?? false;
        if (targetSeated) {
          toast.error("Cette table est occupée (client assis)");
          return;
        }
        await handleSwapReservations(table);
        return;
      }

      // Table à moitié occupée (1/2) ou libre : ajouter à la sélection de destination,
      // ce qui permet de créer un 2/2 depuis le flux de déplacement aussi.
      togglePendingTable(tableId);
      return;
    }
    
    // Si pas de réservation sélectionnée pour assignation
    if (!selectedReservationId) {
      // Si on a cliqué sur une moitié avec une réservation, activer le mode édition
      if (reservationId) {
        const resa = table?.reservations?.find((r) => r.id === reservationId) ?? table?.reservation;
        if (resa) {
          setEditingTable({
            tableId,
            reservationId,
            reservationVersion: resa.version,
            reservationName: nameDisplay === "firstName" ? (resa.firstName?.trim() || resa.lastName) : resa.lastName,
            partySize: resa.partySize,
            babyCount: resa.babyCount ?? 0,
          });
          onTableClick?.(reservationId);
          return;
        }
      }
      // Sinon notifier le parent
      onTableClick?.(reservationId ?? null);
      return;
    }

    if (status === "blocked") {
      toast.error("Cette table est désactivée");
      return;
    }

    // Double assignation autorisée tant que la table n'est pas pleine.
    // Volontairement aucun test sur `seated` : le plafond de 2 est sans contrainte
    // horaire, et un client installé depuis midi ne doit pas empêcher d'affecter la
    // 2e tournée sur la même table.
    if (table && table.reservationCount >= 2) {
      toast.error("Cette table est pleine (2/2)");
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
        const isEditingThisTable = editingTable?.tableId === table.tableId;
        const isPending = pendingTableIds.includes(table.tableId);
        const statusColors = statusPalette[table.status as TableStatus];
        // Thème tablette : le plateau est rentré pour laisser la place aux chaises dans l'emprise
        const inset = isBrume ? CHAIR_MARGIN : 0;
        const width = (table.width ?? 1) * TABLE_SIZE - 4 - inset * 2;
        const height = (table.height ?? 1) * TABLE_SIZE - 4 - inset * 2;
        const reservations = table.reservations;
        const isSplit = reservations !== undefined && reservations.length === 2;
        const isVerticalSplit = height > width;
        // Taille des infos d'une moitié de table partagée (thème tablette)
        const halfFonts = isVerticalSplit ? getInfoFontSizes(width, height / 2) : getInfoFontSizes(width / 2, height);

        // For split tables, determine which half is being edited
        const editingHalfIndex = isSplit && isEditingThisTable
          ? reservations.findIndex((r) => r.id === editingTable?.reservationId)
          : -1;

        return (
          <div
            key={table.tableId}
            className={cn(
              "absolute transition-all duration-150",
              table.shape === "round" ? "rounded-full" : "rounded-lg",
              !isSplit && (
                isEditingThisTable
                  ? "bg-amber-400 ring-2 ring-amber-500 ring-offset-1"
                  : isPending
                    ? isBrume
                      ? "bg-[#EAF2FF] ring-2 ring-[#3884FF] ring-offset-1"
                      : "bg-blue-200 ring-2 ring-blue-500 ring-offset-1"
                    : statusColors.bg
              ),
              isSplit && isPending && (isBrume ? "ring-2 ring-[#3884FF] ring-offset-1" : "ring-2 ring-blue-500 ring-offset-1"),
              isSplit && isEditingThisTable && "ring-2 ring-amber-500 ring-offset-1",
              statusColors.border,
              table.status === "blocked" && !isBrume && "opacity-50",
              // Mode édition actif : toute table non désactivée est cliquable
              editingTable && table.status !== "blocked" && "cursor-pointer hover:scale-[1.02] hover:shadow-md",
              // Mode assignation normal : tables avec de la place cliquables
              !editingTable && selectedReservationId &&
                table.status !== "blocked" &&
                table.reservationCount < 2 &&
                "cursor-pointer hover:scale-[1.02] hover:shadow-md",
              // Table avec réservation cliquable pour édition
              !editingTable && !selectedReservationId && table.reservation && "cursor-pointer hover:scale-[1.02] hover:shadow-md",
              isAssigning && "pointer-events-none opacity-70"
            )}
            style={{
              left: table.positionX * GRID_CELL_SIZE - gridLayout.offsetX + 2 + inset,
              top: table.positionY * GRID_CELL_SIZE - gridLayout.offsetY + 2 + inset,
              width,
              height,
            }}
            onClick={!isSplit ? () => handleTableClick(table.tableId, table.status as TableStatus, table.reservation?.id, table) : undefined}
          >
            {isBrume && (
              <TableChairs
                capacity={table.capacity}
                width={width}
                height={height}
                round={table.shape === "round"}
                color={BRUME_CHAIR_COLORS[table.status as TableStatus] ?? BRUME_CHAIR_COLORS.free}
                sideSeating={sideSeatingTableIds.has(table.tableId)}
              />
            )}
            {/* === SPLIT TABLE (2 reservations) === */}
            {isSplit ? (
              <>
              <div
                className={cn(
                  "flex w-full h-full overflow-hidden",
                  table.shape === "round" ? "rounded-full" : isBrume ? "rounded-[7px]" : "rounded-lg",
                  isVerticalSplit ? "flex-col" : "flex-row"
                )}
              >
                {reservations.map((resa, idx) => {
                  const resaTableStatus = getReservationStatusAsTableStatus(resa.status);
                  const isThisHalfEditing = editingHalfIndex === idx;
                  // Use derived color for 2nd half if both have same status
                  const sameStatus = reservations[0].status === reservations[1].status;
                  let halfBg: string;
                  let halfText: string;
                  if (isThisHalfEditing) {
                    halfBg = "bg-amber-400";
                    halfText = "text-amber-900";
                  } else if (idx === 1 && sameStatus && splitPalette[resaTableStatus]) {
                    halfBg = splitPalette[resaTableStatus].bg;
                    halfText = splitPalette[resaTableStatus].text;
                  } else {
                    halfBg = statusPalette[resaTableStatus].bg;
                    halfText = statusPalette[resaTableStatus].text;
                  }
                  const displayName = nameDisplay === "firstName" ? (resa.firstName?.trim() || resa.lastName) : resa.lastName;

                  return (
                    <div
                      key={resa.id}
                      className={cn(
                        "flex flex-col items-center justify-center flex-1 relative cursor-pointer",
                        halfBg,
                        idx === 0 && (isVerticalSplit ? "border-b" : "border-r"),
                        "border-white/80"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTableClick(table.tableId, table.status as TableStatus, resa.id, table);
                      }}
                    >
                      <span
                        className={cn("font-bold leading-tight", !isBrume && "text-[8px]", halfText)}
                        style={isBrume ? { fontSize: halfFonts.time } : undefined}
                      >
                        {resa.timeKey}
                      </span>
                      <span
                        className={cn(
                          "leading-tight max-w-full",
                          isBrume ? "font-medium whitespace-nowrap overflow-hidden text-clip px-px" : "text-[7px] truncate px-0.5",
                          halfText
                        )}
                        style={isBrume ? { fontSize: halfFonts.name } : undefined}
                      >
                        {displayName}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Bouton X hors du conteneur clippé pour rester entièrement visible */}
              {editingHalfIndex !== -1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnassign();
                  }}
                  className="absolute w-4 h-4 -translate-y-1/2 translate-x-1/2 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-md z-10"
                  style={{
                    top: isVerticalSplit && editingHalfIndex === 1 ? "50%" : 0,
                    right: !isVerticalSplit && editingHalfIndex === 0 ? "50%" : 0,
                  }}
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              )}
              </>
            ) : (
              /* === SINGLE or EMPTY TABLE === */
              <>
                {/* Bouton X pour supprimer l'affectation en mode édition */}
                {isEditingThisTable && (
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
                  <div className="flex flex-col items-center justify-center w-full h-full overflow-hidden">
                    <span
                      className={cn("font-bold leading-tight", !isBrume && "text-[10px]", isEditingThisTable ? "text-amber-900" : statusColors.text)}
                      style={isBrume ? { fontSize: getInfoFontSizes(width, height).time } : undefined}
                    >
                      {table.reservation.timeKey}
                    </span>
                    <span
                      className={cn(
                        "leading-tight max-w-full",
                        // Tablette : nom coupé net (sans « … ») pour garder le plus de lettres possible
                        isBrume ? "font-medium whitespace-nowrap overflow-hidden text-clip px-px" : "text-[9px] truncate px-0.5",
                        isEditingThisTable ? "text-amber-900" : statusColors.text
                      )}
                      style={isBrume ? { fontSize: getInfoFontSizes(width, height).name } : undefined}
                    >
                      {nameDisplay === "firstName" ? (table.reservation.firstName?.trim() || table.reservation.lastName) : table.reservation.lastName}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full">
                    <span className={cn("text-xs font-semibold", statusColors.text)}>
                      {table.name}
                    </span>
                    {!hideCapacity && (
                      <span className={cn("text-[10px] flex items-center gap-0.5", statusColors.text, "opacity-75")}>
                        {table.capacity} <Users className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
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
      <div ref={tabletContainerRef} className="relative w-full h-full overflow-hidden flex items-center justify-center pt-16 pb-6 px-6">
        {/* Switch de zone, aligné à droite */}
        {isBrume ? (
          <div className="absolute top-4 right-4 z-30">
            <SegmentedControl
              size="sm"
              ariaLabel="Zone"
              className="bg-[#E5E5E5]"
              value={activeZone}
              onChange={setActiveZone}
              options={[
                { value: "salle", label: "Salle" },
                { value: "terrasse", label: "Terrasse" },
              ]}
            />
          </div>
        ) : (
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1 bg-white/90 backdrop-blur-md rounded-full p-1 shadow-lg border border-white/40">
          <button
            type="button"
            onClick={() => setActiveZone("salle")}
            className={cn(
              "px-5 py-2 text-sm font-semibold rounded-full transition-all active:scale-95",
              activeZone === "salle"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            Salle
          </button>
          <button
            type="button"
            onClick={() => setActiveZone("terrasse")}
            className={cn(
              "px-5 py-2 text-sm font-semibold rounded-full transition-all active:scale-95",
              activeZone === "terrasse"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            Terrasse
          </button>
        </div>
        )}

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
