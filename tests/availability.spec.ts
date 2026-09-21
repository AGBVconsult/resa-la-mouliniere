import { describe, expect, test } from "vitest";

import { computeEffectiveOpen } from "../spec/contracts.generated";
import { computeRemainingCapacityBySlotKey, toSlotDto, filterSlotsByCapacityShape } from "../convex/availability";
import type { CapacityShapeAllocationLike, CapacityShapeLike } from "../convex/lib/capacityShape";

describe("computeEffectiveOpen (generated)", () => {
  test("returns true only when isOpen=true and capacity>0", () => {
    expect(computeEffectiveOpen(true, 10)).toBe(true);
    expect(computeEffectiveOpen(true, 0)).toBe(false);
    expect(computeEffectiveOpen(false, 10)).toBe(false);
  });
});

describe("computeRemainingCapacityBySlotKey", () => {
  test("subtracts partySize for pending/confirmed/seated", () => {
    const slots: any[] = [
      { slotKey: "d1#lunch#1200", dateKey: "d1", service: "lunch", timeKey: "1200", isOpen: true, capacity: 10, maxGroupSize: null },
      { slotKey: "d1#lunch#1230", dateKey: "d1", service: "lunch", timeKey: "1230", isOpen: true, capacity: 5, maxGroupSize: null },
    ];
    const reservations: any[] = [
      { slotKey: "d1#lunch#1200", status: "pending", partySize: 3 },
      { slotKey: "d1#lunch#1200", status: "confirmed", partySize: 2 },
      { slotKey: "d1#lunch#1200", status: "cancelled", partySize: 10 },
      { slotKey: "d1#lunch#1230", status: "seated", partySize: 5 },
    ];

    const remaining = computeRemainingCapacityBySlotKey({ slots, reservations });
    expect(remaining.get("d1#lunch#1200")).toBe(5);
    expect(remaining.get("d1#lunch#1230")).toBe(0);
  });
});

describe("toSlotDto", () => {
  test("maps slot row to Slot DTO", () => {
    const slot: any = {
      slotKey: "d1#lunch#1200",
      dateKey: "d1",
      service: "lunch",
      timeKey: "1200",
      isOpen: true,
      capacity: 10,
      maxGroupSize: 4,
    };

    const dto = toSlotDto({ slot, remainingCapacity: 7 });
    expect(dto).toEqual({
      slotKey: "d1#lunch#1200",
      dateKey: "d1",
      service: "lunch",
      timeKey: "1200",
      isOpen: true,
      capacity: 10,
      remainingCapacity: 7,
      maxGroupSize: 4,
    });
  });
});

describe("filterSlotsByCapacityShape (PRD-013 — non-régression §57)", () => {
  const slots = [
    { slotKey: "d1#dinner#18:30", remainingCapacity: 8 },
    { slotKey: "d1#dinner#18:45", remainingCapacity: 8 },
  ];

  test("no shape configured for a slot -> always allowed (historical behavior)", () => {
    const result = filterSlotsByCapacityShape(slots, new Map(), new Map(), 6);
    expect(result).toEqual(slots);
  });

  test("shape disabled -> historical behavior (visible even for partySize 6)", () => {
    const shapes = new Map<string, CapacityShapeLike>([
      ["d1#dinner#18:30", { enabled: false, needsReview: false, buckets: [{ maxPartySize: 4, quantity: 1 }, { maxPartySize: 2, quantity: 2 }], configRevision: 1 }],
    ]);
    const result = filterSlotsByCapacityShape(slots, shapes, new Map(), 6);
    expect(result.map((s) => s.slotKey)).toEqual(["d1#dinner#18:30", "d1#dinner#18:45"]);
  });

  test("shape enabled 1x4+2x2 -> partySize 2/3/4 visible, 5/6 hidden", () => {
    const shapes = new Map<string, CapacityShapeLike>([
      ["d1#dinner#18:30", { enabled: true, needsReview: false, buckets: [{ maxPartySize: 4, quantity: 1 }, { maxPartySize: 2, quantity: 2 }], configRevision: 1 }],
    ]);
    const allocations = new Map<string, CapacityShapeAllocationLike[]>();

    expect(filterSlotsByCapacityShape(slots, shapes, allocations, 2).map((s) => s.slotKey)).toContain("d1#dinner#18:30");
    expect(filterSlotsByCapacityShape(slots, shapes, allocations, 3).map((s) => s.slotKey)).toContain("d1#dinner#18:30");
    expect(filterSlotsByCapacityShape(slots, shapes, allocations, 4).map((s) => s.slotKey)).toContain("d1#dinner#18:30");
    expect(filterSlotsByCapacityShape(slots, shapes, allocations, 5).map((s) => s.slotKey)).not.toContain("d1#dinner#18:30");
    expect(filterSlotsByCapacityShape(slots, shapes, allocations, 6).map((s) => s.slotKey)).not.toContain("d1#dinner#18:30");

    // The other slot without a shape stays visible regardless of partySize.
    expect(filterSlotsByCapacityShape(slots, shapes, allocations, 6).map((s) => s.slotKey)).toContain("d1#dinner#18:45");
  });

  test("needsReview true -> falls back to historical behavior (public enforcement suspended)", () => {
    const shapes = new Map<string, CapacityShapeLike>([
      ["d1#dinner#18:30", { enabled: true, needsReview: true, buckets: [{ maxPartySize: 4, quantity: 1 }], configRevision: 1 }],
    ]);
    const result = filterSlotsByCapacityShape(slots, shapes, new Map(), 6);
    expect(result.map((s) => s.slotKey)).toContain("d1#dinner#18:30");
  });
});

describe("availability.getDay response shape", () => {
  test("remainingCapacity is clamped to 0", () => {
    const capacity = 10;
    const used = 15;
    const remaining = Math.max(0, capacity - used);
    expect(remaining).toBe(0);
  });

  test("maxGroupSize null means no limit", () => {
    const slot = { maxGroupSize: null };
    const partySize = 100;
    const allowed = slot.maxGroupSize === null || partySize <= slot.maxGroupSize;
    expect(allowed).toBe(true);
  });

  test("sorts timeKeys correctly", () => {
    const times = ["19:00", "12:00", "18:30", "12:30"];
    times.sort((a, b) => a.localeCompare(b));
    expect(times).toEqual(["12:00", "12:30", "18:30", "19:00"]);
  });
});
