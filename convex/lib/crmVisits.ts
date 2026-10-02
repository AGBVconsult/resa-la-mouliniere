/**
 * CRM visit counting rules.
 *
 * A past reservation counts as a visit unless it ended as a no-show, a
 * cancellation or a refusal. Intermediate statuses left as-is by the staff
 * (confirmed, cardPlaced, seated...) still count: the guest is presumed to
 * have come until someone marks otherwise.
 */

export type LedgerOutcome =
  | "completed"
  | "completed_rehabilitated"
  | "noshow"
  | "cancelled"
  | "late_cancelled"
  | "departure_before_order";

export type ClientTotals = {
  totalVisits: number;
  totalNoShows: number;
  totalRehabilitatedNoShows: number;
  totalCancellations: number;
  totalLateCancellations: number;
  totalDeparturesBeforeOrder: number;
};

const NON_VISIT_STATUSES = new Set(["noshow", "cancelled", "refused"]);

export function isVisitStatus(status: string): boolean {
  return !NON_VISIT_STATUSES.has(status);
}

export function isVisit(outcome: LedgerOutcome): boolean {
  return outcome === "completed" || outcome === "completed_rehabilitated";
}

/** Adds (sign = 1) or withdraws (sign = -1) one ledger outcome from the totals. */
export function applyOutcome(totals: ClientTotals, outcome: LedgerOutcome, sign: 1 | -1): void {
  const bump = (key: keyof ClientTotals) => {
    totals[key] = Math.max(0, totals[key] + sign);
  };
  if (isVisit(outcome)) bump("totalVisits");
  if (outcome === "completed_rehabilitated") bump("totalRehabilitatedNoShows");
  if (outcome === "noshow") bump("totalNoShows");
  if (outcome === "cancelled") bump("totalCancellations");
  if (outcome === "late_cancelled") bump("totalLateCancellations");
  if (outcome === "departure_before_order") bump("totalDeparturesBeforeOrder");
}
