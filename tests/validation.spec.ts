import { describe, expect, test } from "vitest";
import {
  assertPartyCounts,
  assertDateKey,
  assertTimeKey,
  assertTextLimits,
  assertOptions,
  MAX_PARTY_SIZE_ABSOLUTE,
} from "../convex/lib/validation";

/** Attend une ConvexError de code VALIDATION_ERROR (comparaison partielle du champ data). */
function expectValidationError(fn: () => unknown): void {
  let caught: unknown;
  try {
    fn();
  } catch (e) {
    caught = e;
  }
  expect(caught, "aucune erreur levée").toBeDefined();
  expect(caught).toMatchObject({ data: { code: "VALIDATION_ERROR" } });
}

describe("assertPartyCounts", () => {
  test("accepte des compteurs valides et renvoie le total", () => {
    expect(assertPartyCounts({ adults: 2, childrenCount: 1, babyCount: 1 })).toBe(4);
  });

  test.each([
    ["enfants négatifs", { adults: 12, childrenCount: -11, babyCount: 0 }],
    ["bébés négatifs", { adults: 2, childrenCount: 0, babyCount: -1 }],
    ["adultes décimaux", { adults: 1.5, childrenCount: 0, babyCount: 0 }],
    ["zéro adulte", { adults: 0, childrenCount: 2, babyCount: 0 }],
    ["NaN", { adults: Number.NaN, childrenCount: 0, babyCount: 0 }],
  ])("rejette %s", (_label, counts) => {
    expectValidationError(() => assertPartyCounts(counts));
  });

  test("plafond absolu", () => {
    expectValidationError(() =>
      assertPartyCounts({ adults: MAX_PARTY_SIZE_ABSOLUTE + 1, childrenCount: 0, babyCount: 0 })
    );
  });

  test("plafond configurable", () => {
    expectValidationError(() => assertPartyCounts({ adults: 5, childrenCount: 0, babyCount: 0 }, { maxPartySize: 4 }));
  });

  test("minAdults 0 pour les brouillons", () => {
    expect(assertPartyCounts({ adults: 0, childrenCount: 0, babyCount: 0 }, { minAdults: 0 })).toBe(0);
  });
});

describe("assertDateKey / assertTimeKey", () => {
  test("dates réelles seulement", () => {
    expect(() => assertDateKey("2026-09-04")).not.toThrow();
    expectValidationError(() => assertDateKey("2026-13-45"));
    expectValidationError(() => assertDateKey("2026-02-30"));
    expectValidationError(() => assertDateKey("26-9-4"));
  });

  test("heures réelles seulement", () => {
    expect(() => assertTimeKey("19:30")).not.toThrow();
    expectValidationError(() => assertTimeKey("99:99"));
    expectValidationError(() => assertTimeKey("7:30"));
  });
});

describe("assertTextLimits", () => {
  test("longueurs et formats", () => {
    expectValidationError(() => assertTextLimits({ firstName: "a".repeat(81) }));
    expectValidationError(() => assertTextLimits({ note: "n".repeat(1001) }));
    expectValidationError(() => assertTextLimits({ email: "pas-un-email" }));
    expectValidationError(() => assertTextLimits({ phone: "abc" }));
    expect(() => assertTextLimits({ email: "a@b.co", phone: "+32 470 12 34 56", note: "ok" })).not.toThrow();
  });

  test("champs absents ou vides ignorés", () => {
    expect(() => assertTextLimits({})).not.toThrow();
    expect(() => assertTextLimits({ email: "", phone: "" })).not.toThrow();
  });
});

describe("assertOptions", () => {
  test("options connues, sans doublon, bornées", () => {
    expect(() => assertOptions(["highChair", "wheelchair"])).not.toThrow();
    expectValidationError(() => assertOptions(["<script>"]));
    expectValidationError(() => assertOptions(["highChair", "highChair"]));
    expectValidationError(() => assertOptions(new Array(11).fill("stroller")));
    expect(() => assertOptions(undefined)).not.toThrow();
  });
});
