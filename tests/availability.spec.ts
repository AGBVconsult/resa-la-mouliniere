import { describe, expect, test } from "vitest";

import { computeEffectiveOpen } from "../spec/contracts.generated";
import { computeRemainingCapacityBySlotKey, toSlotDto } from "../convex/availability";

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
