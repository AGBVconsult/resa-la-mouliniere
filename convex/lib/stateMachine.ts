/**
 * Reservation status state machine.
 * Pure functions, testable.
 * 
 * Transitions from spec/CONTRACTS.md:
 * - pending -> confirmed (adminConfirm)
 * - pending -> refused (adminRefuse)
 * - pending -> cancelled (adminCancel, cancelByToken)
 * - confirmed -> cancelled (adminCancel, cancelByToken)
 * - confirmed -> seated (checkIn)
 * - seated -> completed (checkOut)
 * - confirmed -> noshow (manual only — never written by a job)
 * - seated -> completed (dailyFinalize, if slot passed)
 * - any status -> incident (manual, an incident can happen at any time)
 */

import type { ReservationStatus } from "../../spec/contracts.generated";

/**
 * Valid status transitions map.
 * Key = from status, Value = array of valid target statuses.
 */
const VALID_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ["confirmed", "refused", "cancelled", "incident"],
  confirmed: ["cardPlaced", "seated", "cancelled", "noshow", "completed", "incident"],
  cardPlaced: ["seated", "cancelled", "noshow", "incident", "confirmed", "completed"],
  seated: ["completed", "incident", "noshow", "confirmed", "cancelled"], // Can complete, report incident, mark as noshow, revert, or cancel
  completed: ["seated", "confirmed", "incident", "cancelled"], // Allow reopening, reverting, reporting incident, or cancelling
  noshow: ["seated", "confirmed", "cancelled", "incident"], // Allow marking as arrived, restoring, cancelling, or reporting incident
  cancelled: ["confirmed", "incident"], // Allow restoring or reporting incident
  refused: ["confirmed", "cancelled", "incident"], // Allow restoring, cancelling, or reporting incident
  incident: ["confirmed", "seated", "completed", "cancelled"], // Can restore, reopen, complete, or cancel
};

/**
 * Check if a status transition is valid.
 * Pure function, testable.
 * 
 * @param from - Current status
 * @param to - Target status
 * @returns true if transition is valid
 */
export function isValidStatusTransition(from: ReservationStatus, to: ReservationStatus): boolean {
  const validTargets = VALID_TRANSITIONS[from];
  return validTargets?.includes(to) ?? false;
}

/**
 * Get all valid target statuses from a given status.
 */
export function getValidTransitions(from: ReservationStatus): ReservationStatus[] {
  return VALID_TRANSITIONS[from] ?? [];
}
