/**
 * Snap to grid modifier for dnd-kit
 */

import type { Modifier } from "@dnd-kit/core";
import { GRID_CELL_SIZE } from "@/lib/constants/grid";

export const snapToGridModifier: Modifier = ({ transform }) => ({
  ...transform,
  x: Math.round(transform.x / GRID_CELL_SIZE) * GRID_CELL_SIZE,
  y: Math.round(transform.y / GRID_CELL_SIZE) * GRID_CELL_SIZE,
});
