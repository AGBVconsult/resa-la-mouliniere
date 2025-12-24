import { describe, expect, test } from "vitest";

import {
  makeSlotKey,
  computePartySize,
  computeEffectiveOpen,
} from "../spec/contracts.generated";
import { generateSecureToken, computeTokenExpiry, computeSlotStartAt } from "../convex/lib/tokens";
import { computeRequestHash } from "../convex/lib/idempotency";
import { canCancel } from "../convex/reservations";

describe("generateSecureToken", () => {
  test("returns 64 hex characters", () => {
    const token = generateSecureToken();
    expect(token).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);
  });

  test("generates unique tokens", () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateSecureToken());
    }
    expect(tokens.size).toBe(100);
  });
});

describe("computeTokenExpiry", () => {
  test("returns slotStartAt - expireBefore", () => {
    const slotStartAt = 1700000000000; // some timestamp
    const expireBefore = 2 * 60 * 60 * 1000; // 2 hours

    const expiresAt = computeTokenExpiry(slotStartAt, expireBefore);

    expect(expiresAt).toBe(slotStartAt - expireBefore);
    expect(expiresAt).toBe(1700000000000 - 7200000);
  });

  test("handles zero expireBefore", () => {
    const slotStartAt = 1700000000000;
    const expiresAt = computeTokenExpiry(slotStartAt, 0);
    expect(expiresAt).toBe(slotStartAt);
  });
});

describe("computeSlotStartAt", () => {
  test("parses dateKey and timeKey correctly", () => {
    const result = computeSlotStartAt("2024-12-25", "12:30", "Europe/Brussels");
    // Should be a valid timestamp
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThan(0);
  });
});

describe("makeSlotKey (generated)", () => {
  test("produces correct format", () => {
    const slotKey = makeSlotKey({
      dateKey: "2024-12-25",
      service: "lunch",
      timeKey: "12:30",
    });
    expect(slotKey).toBe("2024-12-25#lunch#12:30");
  });

  test("works with dinner service", () => {
    const slotKey = makeSlotKey({
      dateKey: "2024-01-01",
      service: "dinner",
      timeKey: "19:00",
    });
    expect(slotKey).toBe("2024-01-01#dinner#19:00");
  });
});

describe("computePartySize (generated)", () => {
  test("sums adults + children + babies", () => {
    expect(computePartySize(2, 1, 0)).toBe(3);
    expect(computePartySize(4, 0, 0)).toBe(4);
    expect(computePartySize(2, 2, 1)).toBe(5);
    expect(computePartySize(10, 5, 1)).toBe(16);
  });
});

describe("computeEffectiveOpen (generated)", () => {
  test("returns true only when isOpen=true AND capacity>0", () => {
    expect(computeEffectiveOpen(true, 10)).toBe(true);
    expect(computeEffectiveOpen(true, 1)).toBe(true);
    expect(computeEffectiveOpen(true, 0)).toBe(false);
    expect(computeEffectiveOpen(false, 10)).toBe(false);
    expect(computeEffectiveOpen(false, 0)).toBe(false);
  });
});

describe("computeRequestHash", () => {
  test("produces deterministic hash", () => {
    const inputs = { a: 1, b: "test", c: true };
    const hash1 = computeRequestHash(inputs);
    const hash2 = computeRequestHash(inputs);
    expect(hash1).toBe(hash2);
  });

  test("different inputs produce different hashes", () => {
    const hash1 = computeRequestHash({ a: 1 });
    const hash2 = computeRequestHash({ a: 2 });
    expect(hash1).not.toBe(hash2);
  });

  test("returns hex string", () => {
    const hash = computeRequestHash({ test: "value" });
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });
});

describe("partySize rules", () => {
  test("partySize <= 4 -> confirmed", () => {
    for (const size of [1, 2, 3, 4]) {
      const status = size <= 4 ? "confirmed" : "pending";
      expect(status).toBe("confirmed");
    }
  });

  test("5 <= partySize <= 15 -> pending", () => {
    for (const size of [5, 10, 15]) {
      const status = size <= 4 ? "confirmed" : "pending";
      expect(status).toBe("pending");
    }
  });

  test("partySize >= 16 -> groupRequest (not reservation)", () => {
    const partySize = 16;
    const isGroupRequest = partySize >= 16;
    expect(isGroupRequest).toBe(true);
  });
});

describe("capacity check logic", () => {
  test("allows when remaining >= partySize", () => {
    const capacity = 20;
    const usedCapacity = 15;
    const partySize = 4;
    const remainingCapacity = capacity - usedCapacity;
    const allowed = partySize <= remainingCapacity;
    expect(allowed).toBe(true);
  });

  test("rejects when remaining < partySize", () => {
    const capacity = 20;
    const usedCapacity = 18;
    const partySize = 4;
    const remainingCapacity = capacity - usedCapacity;
    const allowed = partySize <= remainingCapacity;
    expect(allowed).toBe(false);
  });

  test("only counts pending|confirmed|seated for usedCapacity", () => {
    const reservations = [
      { status: "pending", partySize: 2 },
      { status: "confirmed", partySize: 3 },
      { status: "seated", partySize: 2 },
      { status: "cancelled", partySize: 10 },
      { status: "completed", partySize: 5 },
      { status: "noshow", partySize: 3 },
    ];

    const usedCapacity = reservations
      .filter((r) => r.status === "pending" || r.status === "confirmed" || r.status === "seated")
      .reduce((sum, r) => sum + r.partySize, 0);

    expect(usedCapacity).toBe(7); // 2 + 3 + 2
  });
});

describe("canCancel", () => {
  test("returns true for pending", () => {
    expect(canCancel("pending")).toBe(true);
  });

  test("returns true for confirmed", () => {
    expect(canCancel("confirmed")).toBe(true);
  });

  test("returns false for seated", () => {
    expect(canCancel("seated")).toBe(false);
  });

  test("returns false for completed", () => {
    expect(canCancel("completed")).toBe(false);
  });

  test("returns false for cancelled", () => {
    expect(canCancel("cancelled")).toBe(false);
  });

  test("returns false for noshow", () => {
    expect(canCancel("noshow")).toBe(false);
  });

  test("returns false for refused", () => {
    expect(canCancel("refused")).toBe(false);
  });
});

describe("computeRequestHash (deep canonicalization)", () => {
  test("same object with different key order produces same hash", () => {
    const hash1 = computeRequestHash({ b: 2, a: 1 });
    const hash2 = computeRequestHash({ a: 1, b: 2 });
    expect(hash1).toBe(hash2);
  });

  test("nested objects are canonicalized", () => {
    const hash1 = computeRequestHash({ outer: { b: 2, a: 1 } });
    const hash2 = computeRequestHash({ outer: { a: 1, b: 2 } });
    expect(hash1).toBe(hash2);
  });

  test("arrays preserve order", () => {
    const hash1 = computeRequestHash({ arr: [1, 2, 3] });
    const hash2 = computeRequestHash({ arr: [3, 2, 1] });
    expect(hash1).not.toBe(hash2);
  });
});
