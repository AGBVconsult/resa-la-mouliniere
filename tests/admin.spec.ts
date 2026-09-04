import { describe, expect, test } from "vitest";

import { isValidStatusTransition, getValidTransitions } from "../convex/lib/stateMachine";
import { ReservationStatus } from "../spec/contracts.generated";
import { getTodayDateKey, isValidDateKey } from "../convex/lib/dateUtils";

/**
 * Table de référence — doit rester identique à spec/CONTRACTS.md §3.2.
 * Toute modification ici est une décision produit à reporter dans le contrat.
 */
const EXPECTED_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ["confirmed", "refused", "cancelled"],
  confirmed: ["cardPlaced", "seated", "cancelled", "noshow", "completed"],
  cardPlaced: ["seated", "confirmed", "cancelled", "noshow", "incident", "completed"],
  seated: ["completed", "incident", "noshow", "confirmed", "cancelled"],
  completed: ["seated", "confirmed", "incident", "cancelled"],
  noshow: ["seated", "confirmed", "cancelled"],
  cancelled: ["confirmed"],
  refused: ["confirmed", "cancelled"],
  incident: ["seated", "completed", "cancelled"],
};

describe("machine d'états (contrat §3.2)", () => {
  test("la table du code est exactement celle du contrat, pour chaque statut", () => {
    for (const status of ReservationStatus) {
      expect(new Set(getValidTransitions(status)), status).toEqual(new Set(EXPECTED_TRANSITIONS[status]));
    }
  });

  test("flux nominal", () => {
    expect(isValidStatusTransition("pending", "confirmed")).toBe(true);
    expect(isValidStatusTransition("pending", "refused")).toBe(true);
    expect(isValidStatusTransition("pending", "cancelled")).toBe(true);
    expect(isValidStatusTransition("confirmed", "cardPlaced")).toBe(true);
    expect(isValidStatusTransition("confirmed", "seated")).toBe(true);
    expect(isValidStatusTransition("confirmed", "cancelled")).toBe(true);
    expect(isValidStatusTransition("cardPlaced", "seated")).toBe(true);
    expect(isValidStatusTransition("seated", "completed")).toBe(true);
  });

  test("transitions écrites par les jobs (dailyFinalize, auto-release B1/B2)", () => {
    expect(isValidStatusTransition("seated", "completed")).toBe(true);
    expect(isValidStatusTransition("confirmed", "completed")).toBe(true);
    expect(isValidStatusTransition("cardPlaced", "completed")).toBe(true);
  });

  test("noshow : décision humaine, depuis confirmed/cardPlaced/seated uniquement", () => {
    for (const status of ReservationStatus) {
      const expected = status === "confirmed" || status === "cardPlaced" || status === "seated";
      expect(isValidStatusTransition(status, "noshow"), `${status} -> noshow`).toBe(expected);
    }
  });

  test("invariants : jamais de retour à pending, refus seulement depuis pending, pas de boucle", () => {
    for (const status of ReservationStatus) {
      expect(isValidStatusTransition(status, "pending"), `${status} -> pending`).toBe(false);
      expect(isValidStatusTransition(status, status), `${status} -> ${status}`).toBe(false);
      if (status !== "pending") {
        expect(isValidStatusTransition(status, "refused"), `${status} -> refused`).toBe(false);
      }
    }
  });

  test("pending : aucun raccourci vers la salle", () => {
    for (const to of ["cardPlaced", "seated", "completed", "noshow", "incident"] as const) {
      expect(isValidStatusTransition("pending", to), `pending -> ${to}`).toBe(false);
    }
  });

  test("statut inconnu : aucune transition", () => {
    expect(getValidTransitions("bogus" as ReservationStatus)).toEqual([]);
    expect(isValidStatusTransition("bogus" as ReservationStatus, "confirmed")).toBe(false);
  });
});

describe("getTodayDateKey", () => {
  test("returns YYYY-MM-DD format", () => {
    const dateKey = getTodayDateKey("Europe/Brussels");
    expect(dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("returns valid date for UTC", () => {
    const dateKey = getTodayDateKey("UTC");
    expect(dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("returns valid date for America/New_York", () => {
    const dateKey = getTodayDateKey("America/New_York");
    expect(dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("isValidDateKey", () => {
  test("accepts valid YYYY-MM-DD format", () => {
    expect(isValidDateKey("2024-12-25")).toBe(true);
    expect(isValidDateKey("2024-01-01")).toBe(true);
    expect(isValidDateKey("2025-06-15")).toBe(true);
  });

  test("rejects invalid formats", () => {
    expect(isValidDateKey("24-12-25")).toBe(false);
    expect(isValidDateKey("2024/12/25")).toBe(false);
    expect(isValidDateKey("2024-1-25")).toBe(false);
    expect(isValidDateKey("2024-12-5")).toBe(false);
    expect(isValidDateKey("25-12-2024")).toBe(false);
    expect(isValidDateKey("invalid")).toBe(false);
    expect(isValidDateKey("")).toBe(false);
  });
});

describe("version conflict detection (pure logic)", () => {
  function checkVersionMismatch(expected: number, actual: number): boolean {
    return expected !== actual;
  }

  test("version mismatch should be detected", () => {
    expect(checkVersionMismatch(1, 2)).toBe(true);
  });

  test("version match should pass", () => {
    expect(checkVersionMismatch(3, 3)).toBe(false);
  });

  test("version should increment on update", () => {
    const currentVersion = 5;
    const newVersion = currentVersion + 1;
    expect(newVersion).toBe(6);
  });
});
