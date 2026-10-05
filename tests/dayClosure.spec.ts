import { describe, expect, test } from "vitest";

import { resolveDayClosure, resolveServiceClosure } from "../convex/lib/dayClosure";

const base = { closedByPeriod: false, slotCount: 3, manualCloseTimestamps: [] as number[], templateOpen: true };

describe("resolveServiceClosure", () => {
  test("une période de fermeture l'emporte sur tout", () => {
    expect(resolveServiceClosure({ ...base, closedByPeriod: true, manualCloseTimestamps: [10] })).toEqual({
      reason: "period",
      closedAt: null,
    });
  });

  test("fermeture manuelle : garde la dernière date", () => {
    expect(resolveServiceClosure({ ...base, manualCloseTimestamps: [10, 30, 20] })).toEqual({
      reason: "manual",
      closedAt: 30,
    });
  });

  test("modèle ouvert mais aucun créneau : créneaux non générés", () => {
    expect(resolveServiceClosure({ ...base, slotCount: 0 })).toEqual({ reason: "noSlots", closedAt: null });
  });

  test("modèle fermé : fermeture habituelle", () => {
    expect(resolveServiceClosure({ ...base, slotCount: 0, templateOpen: false })).toEqual({
      reason: "template",
      closedAt: null,
    });
  });
});

describe("resolveDayClosure", () => {
  test("manuel prioritaire sur habituel", () => {
    expect(
      resolveDayClosure({ reason: "template", closedAt: null }, { reason: "manual", closedAt: 42 })
    ).toEqual({ reason: "manual", closedAt: 42 });
  });

  test("deux fermetures manuelles : la plus récente", () => {
    expect(
      resolveDayClosure({ reason: "manual", closedAt: 5 }, { reason: "manual", closedAt: 9 })
    ).toEqual({ reason: "manual", closedAt: 9 });
  });

  test("deux services habituellement fermés", () => {
    expect(
      resolveDayClosure({ reason: "template", closedAt: null }, { reason: "template", closedAt: null })
    ).toEqual({ reason: "template", closedAt: null });
  });
});
