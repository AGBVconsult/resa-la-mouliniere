/**
 * PRD-011: Adjacency calculation for table sets
 * 
 * Two tables are adjacent if they are neighbors in the grid
 * (Manhattan distance <= 1 on each axis, including diagonals)
 */

import type { Doc, Id } from "../_generated/dataModel";

/**
 * Check if two tables are adjacent in the grid
 */
export function areTablesAdjacent(
  table1: { gridX?: number; gridY?: number; positionX?: number; positionY?: number },
  table2: { gridX?: number; gridY?: number; positionX?: number; positionY?: number }
): boolean {
  // Use gridX/gridY if available, otherwise fall back to positionX/positionY
  const x1 = table1.gridX ?? Math.round((table1.positionX ?? 0) / 16);
  const y1 = table1.gridY ?? Math.round((table1.positionY ?? 0) / 16);
  const x2 = table2.gridX ?? Math.round((table2.positionX ?? 0) / 16);
  const y2 = table2.gridY ?? Math.round((table2.positionY ?? 0) / 16);

  const dx = Math.abs(x1 - x2);
  const dy = Math.abs(y1 - y2);
  
  // Adjacent if within 1 cell on each axis (but not same position)
  return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
}

/**
 * Check if a set of tables forms a connected adjacent group
 * Uses BFS to verify connectivity
 */
export function isTableSetAdjacent(tables: Doc<"tables">[]): boolean {
  if (tables.length <= 1) return true;

  // Build adjacency graph
  const adjacent = new Map<string, Set<string>>();
  for (const t of tables) {
    adjacent.set(t._id, new Set());
  }

  for (let i = 0; i < tables.length; i++) {
    for (let j = i + 1; j < tables.length; j++) {
      if (areTablesAdjacent(tables[i], tables[j])) {
        adjacent.get(tables[i]._id)!.add(tables[j]._id);
        adjacent.get(tables[j]._id)!.add(tables[i]._id);
      }
    }
  }

  // BFS to check connectivity
  const visited = new Set<string>();
  const firstId = tables[0]._id as string;
  const queue: string[] = [firstId];
  visited.add(firstId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of adjacent.get(current) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return visited.size === tables.length;
}

/**
 * Compare adjacency between prediction and choice
 * Returns null if not applicable (single tables)
 */
export function compareAdjacency(
  predictionTables: Doc<"tables">[],
  choiceTables: Doc<"tables">[]
): boolean | null {
  // If both are single tables, adjacency is not applicable
  if (predictionTables.length <= 1 && choiceTables.length <= 1) {
    return null;
  }

  const predAdjacent = isTableSetAdjacent(predictionTables);
  const choiceAdjacent = isTableSetAdjacent(choiceTables);

  return predAdjacent === choiceAdjacent;
}

/**
 * Get canonical zone from a set of tables
 */
export function getCanonicalZone(
  tables: Doc<"tables">[]
): "salle" | "terrasse" | "mixed" {
  if (tables.length === 0) return "salle";
  
  const zones = new Set(tables.map(t => {
    // Normalize zone names
    if (t.zone === "dining" || t.zone === "salle") return "salle";
    if (t.zone === "terrace" || t.zone === "terrasse") return "terrasse";
    return t.zone;
  }));
  
  if (zones.size === 1) {
    return zones.values().next().value as "salle" | "terrasse";
  }
  
  return "mixed";
}
