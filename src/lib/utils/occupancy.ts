/**
 * Grid occupancy utilities for floor plan
 */

import { GRID_COLS, GRID_ROWS, TABLE_GRID_SPAN } from "@/lib/constants/grid";

export type CellKey = `${number},${number}`;
export type OccupancyGrid = Map<CellKey, string>;

interface TablePosition {
  _id: string;
  positionX: number;
  positionY: number;
  width?: number;
  height?: number;
}

/**
 * Get all cells occupied by a table
 */
export function getTableCells(
  positionX: number,
  positionY: number,
  width = 1,
  height = 1
): CellKey[] {
  const cells: CellKey[] = [];
  const cellWidth = width * TABLE_GRID_SPAN;
  const cellHeight = height * TABLE_GRID_SPAN;

  for (let dx = 0; dx < cellWidth; dx++) {
    for (let dy = 0; dy < cellHeight; dy++) {
      cells.push(`${positionX + dx},${positionY + dy}` as CellKey);
    }
  }
  return cells;
}

/**
 * Build occupancy grid from tables
 */
export function buildOccupancyGrid(tables: TablePosition[]): OccupancyGrid {
  const grid: OccupancyGrid = new Map();

  for (const table of tables) {
    const width = table.width ?? 1;
    const height = table.height ?? 1;
    const cells = getTableCells(table.positionX, table.positionY, width, height);

    for (const cell of cells) {
      grid.set(cell, table._id);
    }
  }

  return grid;
}

/**
 * Check if position is within grid bounds
 */
export function isInBounds(
  x: number,
  y: number,
  width = 1,
  height = 1
): boolean {
  const cellWidth = width * TABLE_GRID_SPAN;
  const cellHeight = height * TABLE_GRID_SPAN;

  return (
    x >= 0 &&
    y >= 0 &&
    x + cellWidth <= GRID_COLS &&
    y + cellHeight <= GRID_ROWS
  );
}

/**
 * Check if a table can be placed at position
 */
export function canPlaceTable(
  grid: OccupancyGrid,
  x: number,
  y: number,
  width = 1,
  height = 1,
  excludeTableId?: string,
  excludeTableIds?: string[]
): { valid: boolean; reason?: "collision" | "outOfBounds" } {
  // Check bounds
  if (!isInBounds(x, y, width, height)) {
    return { valid: false, reason: "outOfBounds" };
  }

  // Build set of excluded IDs
  const excludeSet = new Set<string>();
  if (excludeTableId) excludeSet.add(excludeTableId);
  if (excludeTableIds) excludeTableIds.forEach((id) => excludeSet.add(id));

  // Check collision
  const cells = getTableCells(x, y, width, height);
  for (const cell of cells) {
    const occupant = grid.get(cell);
    if (occupant && !excludeSet.has(occupant)) {
      return { valid: false, reason: "collision" };
    }
  }

  return { valid: true };
}

/**
 * Convert pixel position to grid position
 */
export function pixelToGrid(
  pixelX: number,
  pixelY: number,
  cellSize: number
): { x: number; y: number } {
  return {
    x: Math.round(pixelX / cellSize),
    y: Math.round(pixelY / cellSize),
  };
}
