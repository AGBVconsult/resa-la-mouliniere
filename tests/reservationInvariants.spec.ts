/**
 * Source-level guards for the reservation invariants (contract §2.2 / §5.5):
 * every write of `slotKey` / `partySize` must go through the contract helpers.
 *
 * Regression for the sprint-0 fix of `admin.updateReservationFull`, which used
 * to write `${dateKey}:${service}:${timeKey}` and `adults + childrenCount`.
 */
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { makeSlotKey, computePartySize } from "../spec/contracts.generated";

const CONVEX_DIR = join(__dirname, "..", "convex");
const WRITERS = ["admin.ts", "reservations.ts", "migrations.ts"];

function read(file: string): string {
  return readFileSync(join(CONVEX_DIR, file), "utf8");
}

describe("slotKey / partySize invariants", () => {
  test("contract helpers produce the canonical formats", () => {
    expect(makeSlotKey({ dateKey: "2026-09-21", service: "lunch", timeKey: "12:30" })).toBe("2026-09-21#lunch#12:30");
    expect(computePartySize(2, 1, 1)).toBe(4);
  });

  test.each(WRITERS)("%s never builds a slotKey with ':' separators", (file) => {
    const src = read(file);
    expect(src).not.toMatch(/\$\{dateKey\}:\$\{service\}:\$\{timeKey\}/);
    expect(src).not.toMatch(/`\$\{[a-zA-Z.]+\}:(lunch|dinner|\$\{[a-zA-Z.]+\})/);
  });

  test.each(WRITERS)("%s never computes partySize without babies", (file) => {
    const src = read(file);
    expect(src).not.toMatch(/partySize\s*=\s*adults\s*\+\s*childrenCount\s*[;,]/);
    expect(src).not.toMatch(/partySize:\s*adults\s*\+\s*childrenCount\s*[,}]/);
  });

  test("updateReservationFull derives both fields from the contract helpers", () => {
    const src = read("admin.ts");
    const start = src.indexOf("export const updateReservationFull");
    const end = src.indexOf("export const cancelByClient");
    expect(start).toBeGreaterThan(0);
    const body = src.slice(start, end);
    expect(body).toContain("makeSlotKey({ dateKey, service, timeKey })");
    expect(body).toContain("computePartySize(adults, childrenCount, babyCount)");
    // Capacity is re-checked when the slot or the size changes.
    expect(body).toContain("INSUFFICIENT_CAPACITY");
    // Tables are released when the (dateKey, service) couple changes.
    expect(body).toContain("patch.tableIds = []");
  });
});
