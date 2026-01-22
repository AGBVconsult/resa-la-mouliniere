/**
 * PRD-011: Shadow metrics computation
 * 
 * Computes comparison metrics between ML prediction and human choice
 */

import type { Doc, Id } from "../_generated/dataModel";
import { isTableSetAdjacent, getCanonicalZone } from "./adjacency";

export type ErrorSeverity = "none" | "minor" | "major" | "critical";

export interface ShadowMetrics {
  exactSetMatch: boolean;
  partialMatchRatio: number;
  adjacencyMatch: boolean;
  zoneMatch: boolean;
  errorSeverity: ErrorSeverity;
  capacityWasteRatio: number;
  wastePerSeat: number;
  comparedAt: number;
}

/**
 * Compute capacity metrics
 */
export function computeCapacityMetrics(
  assignedCapacity: number,
  partySize: number
): { wasteRatio: number; wastePerSeat: number } {
  // Clamp >= 0 (avoid negative values if under-capacity)
  const wasteRatio = Math.max(0, (assignedCapacity - partySize) / partySize);

  // Normalized version (more stable when partySize varies)
  const wastePerSeat = assignedCapacity > 0
    ? Math.max(0, (assignedCapacity - partySize) / assignedCapacity)
    : 0;

  return { wasteRatio, wastePerSeat };
}

/**
 * Compute shadow metrics comparing prediction to human choice
 */
export function computeShadowMetrics(
  predictedTableIds: Id<"tables">[],
  predictedTables: Doc<"tables">[],
  assignedTableIds: Id<"tables">[],
  assignedTables: Doc<"tables">[],
  partySize: number
): ShadowMetrics {
  const now = Date.now();

  // 1. Exact set match (order ignored)
  const predictedSet = new Set(predictedTableIds.map(id => id.toString()));
  const assignedSet = new Set(assignedTableIds.map(id => id.toString()));
  const exactSetMatch = 
    predictedSet.size === assignedSet.size &&
    [...predictedSet].every(id => assignedSet.has(id));

  // 2. Partial match ratio
  const intersection = [...predictedSet].filter(id => assignedSet.has(id));
  const partialMatchRatio = assignedSet.size > 0 
    ? intersection.length / assignedSet.size 
    : 0;

  // 3. Adjacency match (only for multi-table sets)
  let adjacencyMatch = true;
  if (predictedTables.length > 1 || assignedTables.length > 1) {
    const predAdjacent = isTableSetAdjacent(predictedTables);
    const assignedAdjacent = isTableSetAdjacent(assignedTables);
    adjacencyMatch = predAdjacent === assignedAdjacent;
  }

  // 4. Zone match
  const predictedZone = getCanonicalZone(predictedTables);
  const assignedZone = getCanonicalZone(assignedTables);
  const zoneMatch = predictedZone === assignedZone;

  // 5. Capacity metrics
  const assignedCapacity = assignedTables.reduce((sum, t) => sum + t.capacity, 0);
  const { wasteRatio, wastePerSeat } = computeCapacityMetrics(assignedCapacity, partySize);

  // 6. Error severity
  const errorSeverity = computeErrorSeverity(
    exactSetMatch,
    partialMatchRatio,
    zoneMatch,
    wasteRatio
  );

  return {
    exactSetMatch,
    partialMatchRatio,
    adjacencyMatch,
    zoneMatch,
    errorSeverity,
    capacityWasteRatio: wasteRatio,
    wastePerSeat,
    comparedAt: now,
  };
}

/**
 * Determine error severity based on metrics
 */
function computeErrorSeverity(
  exactSetMatch: boolean,
  partialMatchRatio: number,
  zoneMatch: boolean,
  wasteRatio: number
): ErrorSeverity {
  // Exact match = no error
  if (exactSetMatch) return "none";

  // Wrong zone = major error
  if (!zoneMatch) return "major";

  // High waste (>50%) = major error
  if (wasteRatio > 0.5) return "major";

  // Partial match >= 50% = minor error
  if (partialMatchRatio >= 0.5) return "minor";

  // Low partial match = critical error
  if (partialMatchRatio < 0.25) return "critical";

  return "minor";
}

/**
 * Compute service occupancy stats
 */
export function computeServiceOccupancy(
  reservations: Doc<"reservations">[],
  tables: Doc<"tables">[]
): {
  totalCovers: number;
  totalCapacity: number;
  occupancyRate: number;
  reservationsCount: number;
  zoneOccupancies: { salle: number; terrasse: number };
} {
  const activeStatuses = ["pending", "confirmed", "seated"];
  const activeReservations = reservations.filter(r => 
    activeStatuses.includes(r.status)
  );

  const totalCovers = activeReservations.reduce((sum, r) => sum + r.partySize, 0);
  
  // Total capacity = sum of active tables
  const activeTables = tables.filter(t => t.isActive);
  const totalCapacity = activeTables.reduce((sum, t) => sum + t.capacity, 0);

  const occupancyRate = totalCapacity > 0 ? totalCovers / totalCapacity : 0;

  // Zone occupancies
  const salleCapacity = activeTables
    .filter(t => t.zone === "salle" || t.zone === "dining")
    .reduce((sum, t) => sum + t.capacity, 0);
  const terrasseCapacity = activeTables
    .filter(t => t.zone === "terrasse" || t.zone === "terrace")
    .reduce((sum, t) => sum + t.capacity, 0);

  // Count covers by zone (based on assigned tables)
  let salleCovers = 0;
  let terrasseCovers = 0;
  
  for (const r of activeReservations) {
    if (r.tableIds.length > 0) {
      // Find first assigned table to determine zone
      const firstTableId = r.tableIds[0];
      const table = tables.find(t => t._id === firstTableId);
      if (table) {
        if (table.zone === "salle" || table.zone === "dining") {
          salleCovers += r.partySize;
        } else {
          terrasseCovers += r.partySize;
        }
      }
    }
  }

  return {
    totalCovers,
    totalCapacity,
    occupancyRate,
    reservationsCount: activeReservations.length,
    zoneOccupancies: {
      salle: salleCapacity > 0 ? salleCovers / salleCapacity : 0,
      terrasse: terrasseCapacity > 0 ? terrasseCovers / terrasseCapacity : 0,
    },
  };
}

/**
 * Get party size category
 */
export function getPartySizeCategory(
  partySize: number
): "solo" | "couple" | "small_group" | "medium_group" | "large_group" {
  if (partySize === 1) return "solo";
  if (partySize === 2) return "couple";
  if (partySize <= 4) return "small_group";
  if (partySize <= 8) return "medium_group";
  return "large_group";
}
