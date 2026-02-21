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
 * - confirmed -> noshow (dailyFinalize, if slot passed)
 * - seated -> completed (dailyFinalize, if slot passed)
 */

import type { ReservationStatus } from "../../spec/contracts.generated";

/**
 * Valid status transitions map.
 * Key = from status, Value = array of valid target statuses.
 */
const VALID_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ["confirmed", "refused", "cancelled"],
  confirmed: ["cardPlaced", "seated", "cancelled", "noshow", "completed"],
  cardPlaced: ["seated", "cancelled", "incident", "confirmed"],
  seated: ["completed", "incident", "noshow", "confirmed"], // Can complete, report incident, mark as noshow, or revert to confirmed
  completed: ["seated", "confirmed"], // Allow reopening or reverting to confirmed
  noshow: ["seated", "confirmed"], // Allow marking as arrived or restoring
  cancelled: ["confirmed"], // Allow restoring
  refused: ["confirmed"], // Allow restoring
  incident: ["seated", "completed"], // Can reopen or mark as completed
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
