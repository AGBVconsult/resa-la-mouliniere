import { describe, test, expect } from "vitest";
import { buildClosureCoverage, isClosedBy } from "../convex/lib/closures";

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

describe("buildClosureCoverage", () => {
  // Cas réel : ouverture Toussaint (19/10 → 08/11) et fermeture Novembre (06/11 → 15/11)
  const novembre = {
    startDate: "2026-11-06",
    endDate: "2026-11-15",
    applyRules: { status: "closed", services: ["lunch", "dinner"] as ("lunch" | "dinner")[], activeDays: ALL_DAYS },
  };

  test("ferme midi et soir chaque jour de la fermeture dans la plage", () => {
    const coverage = buildClosureCoverage([novembre], "2026-10-19", "2026-11-08");
    expect([...coverage.keys()]).toEqual(["2026-11-06", "2026-11-07", "2026-11-08"]);
    expect(isClosedBy(coverage, "2026-11-07", "lunch")).toBe(true);
    expect(isClosedBy(coverage, "2026-11-07", "dinner")).toBe(true);
    expect(isClosedBy(coverage, "2026-11-05", "dinner")).toBe(false);
  });

  test("ignore les périodes qui ne sont pas des fermetures", () => {
    const ouverture = { ...novembre, applyRules: { ...novembre.applyRules, status: "modified" } };
    expect(buildClosureCoverage([ouverture], "2026-11-01", "2026-11-30").size).toBe(0);
  });

  test("respecte les jours et services de la fermeture", () => {
    const dimancheSoir = {
      startDate: "2026-11-01",
      endDate: "2026-11-30",
      applyRules: { status: "closed", services: ["dinner"] as ("lunch" | "dinner")[], activeDays: [7] },
    };
    const coverage = buildClosureCoverage([dimancheSoir], "2026-11-01", "2026-11-30");
    expect([...coverage.keys()]).toEqual(["2026-11-01", "2026-11-08", "2026-11-15", "2026-11-22", "2026-11-29"]);
    expect(isClosedBy(coverage, "2026-11-08", "lunch")).toBe(false);
    expect(isClosedBy(coverage, "2026-11-08", "dinner")).toBe(true);
  });

  test("gère le passage d'une année à l'autre", () => {
    const fetes = { ...novembre, startDate: "2026-12-30", endDate: "2027-01-02" };
    expect([...buildClosureCoverage([fetes], "2026-12-01", "2027-01-31").keys()]).toEqual([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
  });
});
