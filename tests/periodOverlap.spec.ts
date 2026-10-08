import { describe, test, expect } from "vitest";
import { findOverlappingPeriod } from "../convex/lib/periodOverlap";

const toussaint = { _id: "p1", name: "Vacances Toussaint", startDate: "2026-10-19", endDate: "2026-11-08" };
const novembre = { _id: "p2", name: "Vacances Novembre 2026", startDate: "2026-11-06", endDate: "2026-11-15" };

describe("findOverlappingPeriod", () => {
  test("refuse une fermeture qui chevauche une ouverture", () => {
    expect(findOverlappingPeriod([toussaint], novembre.startDate, novembre.endDate)).toBe(toussaint);
  });

  test("un seul jour commun suffit (bornes incluses)", () => {
    expect(findOverlappingPeriod([toussaint], "2026-11-08", "2026-11-15")).toBe(toussaint);
    expect(findOverlappingPeriod([toussaint], "2026-10-10", "2026-10-19")).toBe(toussaint);
  });

  test("accepte des périodes qui se suivent", () => {
    expect(findOverlappingPeriod([toussaint], "2026-11-09", "2026-11-15")).toBeNull();
  });

  test("ignore la période modifiée elle-même", () => {
    expect(findOverlappingPeriod([toussaint, novembre], "2026-11-09", "2026-11-15", "p2")).toBeNull();
    expect(findOverlappingPeriod([toussaint, novembre], "2026-11-01", "2026-11-15", "p2")).toBe(toussaint);
  });
});
