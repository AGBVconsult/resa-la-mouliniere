/**
 * Table assignment rules.
 * Shared constant and validation helper for double-assignment (max 2 per table).
 */

import type { Doc } from "../_generated/dataModel";

export const MAX_RESERVATIONS_PER_TABLE = 2;

/**
 * Check if a table can accept an additional reservation.
 * Returns true if the number of existing active reservations is below the max.
 */
export function isTableAvailable(
  existingActiveReservations: number
): boolean {
  return existingActiveReservations < MAX_RESERVATIONS_PER_TABLE;
}

/**
 * Assert a table can accept one more reservation, throw TABLE_FULL otherwise.
 * Designed to be called from mutations with the Errors helper.
 */
export function getConflictCount(
  tableId: string,
  otherActiveReservations: Doc<"reservations">[],
): number {
  return otherActiveReservations.filter((r) =>
    r.tableIds.includes(tableId as any)
  ).length;
}
