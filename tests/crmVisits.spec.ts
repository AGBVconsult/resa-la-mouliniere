import { describe, it, expect } from "vitest";
import { applyOutcome, isVisitStatus, type ClientTotals } from "../convex/lib/crmVisits";

function emptyTotals(): ClientTotals {
  return {
    totalVisits: 0,
    totalNoShows: 0,
    totalRehabilitatedNoShows: 0,
    totalCancellations: 0,
    totalLateCancellations: 0,
    totalDeparturesBeforeOrder: 0,
  };
}

describe("isVisitStatus", () => {
  it.each(["pending", "confirmed", "cardPlaced", "seated", "completed", "incident"])(
    "%s counts as a visit",
    (status) => expect(isVisitStatus(status)).toBe(true)
  );

  it.each(["noshow", "cancelled", "refused"])(
    "%s does not count as a visit",
    (status) => expect(isVisitStatus(status)).toBe(false)
  );
});

describe("applyOutcome", () => {
  it("swaps a visit for a no-show when the status is corrected", () => {
    const totals = emptyTotals();
    applyOutcome(totals, "completed", 1);
    applyOutcome(totals, "completed", -1);
    applyOutcome(totals, "noshow", 1);
    expect(totals.totalVisits).toBe(0);
    expect(totals.totalNoShows).toBe(1);
  });

  it("never goes below zero", () => {
    const totals = emptyTotals();
    applyOutcome(totals, "completed_rehabilitated", -1);
    expect(totals.totalVisits).toBe(0);
    expect(totals.totalRehabilitatedNoShows).toBe(0);
  });
});
