/**
 * Grid constants for floor plan (PRD-004)
 */

export const GRID_CELL_SIZE = 16; // px
export const TABLE_SIZE = 48; // px
export const TABLE_GRID_SPAN = 3; // cellules (48/16)
export const GRID_COLS = 60; // 60 colonnes
export const GRID_ROWS = 50; // 50 lignes
export const GRID_WIDTH = GRID_COLS * GRID_CELL_SIZE; // 960px
export const GRID_HEIGHT = GRID_ROWS * GRID_CELL_SIZE; // 800px

export const Z_INDEX = {
  grid: 1,
  combinationLines: 5,
  table: 10,
  tableSelected: 20,
  dropIndicator: 30,
  ghost: 50,
  modal: 100,
} as const;

export const ZONE_STYLES = {
  salle: {
    bg: "bg-amber-100",
    border: "border-amber-400",
    text: "text-amber-800",
    bgHex: "#fef3c7",
    borderHex: "#fbbf24",
  },
  terrasse: {
    bg: "bg-emerald-100",
    border: "border-emerald-400",
    text: "text-emerald-800",
    bgHex: "#d1fae5",
    borderHex: "#34d399",
  },
} as const;

export const COMBINATION_LINE_COLORS = {
  horizontal: "#8B5CF6", // violet
  vertical: "#3B82F6", // bleu
} as const;
