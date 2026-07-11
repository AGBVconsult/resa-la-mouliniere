/**
 * Shared table combination logic (adjacency + chain building).
 *
 * Single source of truth used by:
 * - ServiceFloorPlan.tsx (auto-combination at assignment time)
 * - FloorPlanGrid.tsx (drawing combination lines)
 * - convex/tables.ts (findCombinableTables query)
 *
 * NOTE: keep this module free of any Convex/React imports so it can be
 * bundled both client-side and server-side.
 */

export const TABLE_GRID_SPAN = 3; // grid cells per 1x1 table (must match src/lib/constants/grid.ts)

export type CombinationDirection = "horizontal" | "vertical" | "none";

export interface CombinableTablePosition {
  positionX: number;
  positionY: number;
  width?: number;
  height?: number;
}

export interface CombinableTable extends CombinableTablePosition {
  id: string;
  capacity: number;
}

/**
 * Strict adjacency: `next` starts exactly where `prev` ends along the
 * combination axis, and both tables are aligned on the transverse axis.
 */
export function areTablesAdjacent(
  prev: CombinableTablePosition,
  next: CombinableTablePosition,
  direction: CombinationDirection
): boolean {
  if (direction === "horizontal") {
    return (
      next.positionY === prev.positionY &&
      next.positionX === prev.positionX + (prev.width ?? 1) * TABLE_GRID_SPAN
    );
  }
  if (direction === "vertical") {
    return (
      next.positionX === prev.positionX &&
      next.positionY === prev.positionY + (prev.height ?? 1) * TABLE_GRID_SPAN
    );
  }
  return false;
}

/** Symmetric adjacency (either order). */
export function areTablesAdjacentEitherOrder(
  a: CombinableTablePosition,
  b: CombinableTablePosition,
  direction: CombinationDirection
): boolean {
  return areTablesAdjacent(a, b, direction) || areTablesAdjacent(b, a, direction);
}

export interface CombinationChainResult {
  tableIds: string[];
  totalCapacity: number;
}

/**
 * Builds a contiguous chain of tables around `clicked` to reach `seatingSize`.
 *
 * - `candidates` must only contain AVAILABLE tables of the same zone and same
 *   combination direction as `clicked` (the clicked table itself may or may
 *   not be included; it is always part of the chain).
 * - Returns `null` when the target capacity cannot be reached — callers must
 *   NOT send a partial chain to the server.
 */
export function findCombinationChain(
  clicked: CombinableTable,
  candidates: CombinableTable[],
  seatingSize: number,
  direction: CombinationDirection
): CombinationChainResult | null {
  // Single table is enough
  if (clicked.capacity >= seatingSize) {
    return { tableIds: [clicked.id], totalCapacity: clicked.capacity };
  }

  // Not combinable and not enough capacity
  if (direction === "none") {
    return null;
  }

  const isHorizontal = direction === "horizontal";

  // Keep only tables on the same row (horizontal) / column (vertical)
  const aligned = candidates.filter((t) =>
    t.id === clicked.id
      ? false
      : isHorizontal
        ? t.positionY === clicked.positionY
        : t.positionX === clicked.positionX
  );

  const sorted = [clicked, ...aligned].sort((a, b) =>
    isHorizontal ? a.positionX - b.positionX : a.positionY - b.positionY
  );
  const clickedIndex = sorted.findIndex((t) => t.id === clicked.id);

  const chain: CombinableTable[] = [clicked];
  let totalCapacity = clicked.capacity;

  // Extend forward while strictly adjacent
  for (
    let i = clickedIndex + 1;
    i < sorted.length && totalCapacity < seatingSize;
    i++
  ) {
    if (!areTablesAdjacent(sorted[i - 1], sorted[i], direction)) break;
    chain.push(sorted[i]);
    totalCapacity += sorted[i].capacity;
  }

  // Extend backward while strictly adjacent
  for (let i = clickedIndex - 1; i >= 0 && totalCapacity < seatingSize; i--) {
    if (!areTablesAdjacent(sorted[i], sorted[i + 1], direction)) break;
    chain.unshift(sorted[i]);
    totalCapacity += sorted[i].capacity;
  }

  if (totalCapacity < seatingSize) {
    return null;
  }

  return { tableIds: chain.map((t) => t.id), totalCapacity };
}
