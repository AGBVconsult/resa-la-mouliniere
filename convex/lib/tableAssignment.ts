/**
 * Table assignment rules.
 * Shared constant and validation helper for double-assignment (max 2 per table).
 */

/**
 * Maximum number of concurrent active reservations on a single table
 * for a given (dateKey, service).
 *
 * Enforced at every assignment entry point:
 * - convex/floorplan.ts    assign, checkAssignment
 * - convex/admin.ts        updateReservation
 * - convex/tables.ts       assignToReservation
 */
export const MAX_RESERVATIONS_PER_TABLE = 2;
