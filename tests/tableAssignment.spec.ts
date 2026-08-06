import { describe, it, expect } from "vitest";
import { MAX_RESERVATIONS_PER_TABLE } from "../convex/lib/tableAssignment";

/**
 * The cap is enforced by the same expression at every entry point:
 *   occupants.length >= MAX_RESERVATIONS_PER_TABLE  ->  reject
 * These tests pin that predicate so a future change to the constant
 * cannot silently alter the accept/reject boundary.
 */
function isFull(occupants: number): boolean {
  return occupants >= MAX_RESERVATIONS_PER_TABLE;
}

describe("MAX_RESERVATIONS_PER_TABLE", () => {
  it("is 2 (double assignment)", () => {
    expect(MAX_RESERVATIONS_PER_TABLE).toBe(2);
  });

  it("accepts an assignment on an empty table", () => {
    expect(isFull(0)).toBe(false);
  });

  it("accepts a second assignment on a half-occupied table", () => {
    expect(isFull(1)).toBe(false);
  });

  it("rejects a third assignment on a full table", () => {
    expect(isFull(2)).toBe(true);
  });

  it("rejects beyond the cap", () => {
    expect(isFull(3)).toBe(true);
  });
});
