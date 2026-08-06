import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MAX_RESERVATIONS_PER_TABLE } from "../convex/lib/tableAssignment";

/**
 * Contract invariant 10 (spec/CONTRACTS.md): at most MAX_RESERVATIONS_PER_TABLE
 * active reservations per table for a given (dateKey, service), enforced
 * *identically* at every entry point.
 *
 * Asserting the arithmetic of a locally redeclared predicate would test nothing
 * but itself, so these checks target the real entry points instead: each must
 * use the shared constant, the `>=` boundary, the (dateKey, service) scope and
 * the full active-status list.
 */

const CONVEX_DIR = join(__dirname, "..", "convex");

function read(file: string): string {
  return readFileSync(join(CONVEX_DIR, file), "utf-8");
}

/** Every mutation that may write reservations.tableIds. */
const ENTRY_POINTS = ["floorplan.ts", "admin.ts", "tables.ts"];

describe("MAX_RESERVATIONS_PER_TABLE", () => {
  it("is 2 (double assignment)", () => {
    expect(MAX_RESERVATIONS_PER_TABLE).toBe(2);
  });

  it.each(ENTRY_POINTS)("%s imports the shared constant", (file) => {
    expect(read(file)).toContain("MAX_RESERVATIONS_PER_TABLE");
  });

  it.each(ENTRY_POINTS)(
    "%s compares with >= (no hard-coded numeric cap)",
    (file) => {
      const source = read(file);
      expect(source).toMatch(/>=\s*MAX_RESERVATIONS_PER_TABLE/);
      // A literal `>= 2` next to a table count would silently bypass the constant.
      expect(source).not.toMatch(/(?:occupants|conflictingResas)\.length\s*>=\s*2\b/);
    }
  );
});

/**
 * Returns the block of code that feeds the cap comparison: everything between the
 * enclosing mutation's start and the `>= MAX_RESERVATIONS_PER_TABLE` test.
 * A file-wide search would be vacuous here — admin.ts legitimately uses both
 * indexes in other mutations, so the check must be local to this one.
 */
function sourceFeedingTheCap(file: string): string {
  const source = read(file);
  const anchor = source.search(/>=\s*MAX_RESERVATIONS_PER_TABLE/);
  expect(anchor).toBeGreaterThan(-1);
  // Walk back to the start of the query that produced the counted set.
  const windowStart = source.lastIndexOf('.query("reservations")', anchor);
  expect(windowStart).toBeGreaterThan(-1);
  return source.slice(windowStart, anchor);
}

describe("cap is scoped per (dateKey, service)", () => {
  it("admin.updateReservation counts over (dateKey, service), not slotKey", () => {
    const block = sourceFeedingTheCap("admin.ts");
    // slotKey is narrower than the service: it would allow exceeding the cap
    // across different time slots on the same table.
    expect(block).toContain('withIndex("by_restaurant_date_service"');
    expect(block).not.toContain('withIndex("by_restaurant_slotKey"');
  });

  it.each(ENTRY_POINTS)("%s counts cardPlaced as an active occupant", (file) => {
    const block = sourceFeedingTheCap(file);
    // Either inline (admin.ts, tables.ts) or via the shared ACTIVE_STATUSES
    // constant (floorplan.ts) — both are valid, an omission is not.
    const coversCardPlaced =
      block.includes("cardPlaced") || block.includes("ACTIVE_STATUSES");
    expect(coversCardPlaced).toBe(true);
  });

  it("floorplan ACTIVE_STATUSES includes cardPlaced", () => {
    const source = read("floorplan.ts");
    const declaration = source.slice(
      source.indexOf("const ACTIVE_STATUSES"),
      source.indexOf("const PLANNING_STATUSES")
    );
    expect(declaration).toContain("cardPlaced");
  });
});
