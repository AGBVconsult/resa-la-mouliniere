import { describe, expect, test } from "vitest";
import {
  normalizeBuckets,
  computeConfiguredSeatCapacity,
  computeRemainingBuckets,
  findBestFitBucket,
  isCapacityShapeEnforced,
  evaluateCapacityShape,
  canAcceptParty,
  validateCapacityShape,
  type CapacityBucket,
  type CapacityShapeLike,
} from "../convex/lib/capacityShape";

describe("normalizeBuckets", () => {
  test("merges buckets with same maxPartySize and sorts ascending", () => {
    const result = normalizeBuckets([
      { maxPartySize: 4, quantity: 1 },
      { maxPartySize: 2, quantity: 1 },
      { maxPartySize: 2, quantity: 1 },
    ]);
    expect(result).toEqual([
      { maxPartySize: 2, quantity: 2 },
      { maxPartySize: 4, quantity: 1 },
    ]);
  });

  test("ignores maxPartySize < 1 and clamps negative quantities to 0", () => {
    const result = normalizeBuckets([
      { maxPartySize: 0, quantity: 5 },
      { maxPartySize: 4, quantity: -3 },
    ]);
    expect(result).toEqual([{ maxPartySize: 4, quantity: 0 }]);
  });
});

describe("computeConfiguredSeatCapacity", () => {
  test("sums maxPartySize * quantity", () => {
    const buckets: CapacityBucket[] = [
      { maxPartySize: 4, quantity: 1 },
      { maxPartySize: 2, quantity: 2 },
    ];
    expect(computeConfiguredSeatCapacity(buckets)).toBe(8);
  });
});

describe("findBestFitBucket (Test 3-7)", () => {
  const remaining: CapacityBucket[] = [
    { maxPartySize: 4, quantity: 1 },
    { maxPartySize: 2, quantity: 2 },
  ];

  test("Test 3 — partySize 4 -> bucket 4", () => {
    expect(findBestFitBucket(remaining, 4)).toBe(4);
  });

  test("Test 4 — partySize 3 -> bucket 4 (smallest compatible)", () => {
    expect(findBestFitBucket(remaining, 3)).toBe(4);
  });

  test("Test 5 — partySize 2 -> bucket 2 (never consume bucket 4 while bucket 2 available)", () => {
    expect(findBestFitBucket(remaining, 2)).toBe(2);
  });

  test("Test 6 — partySize 5 -> rejected (null)", () => {
    expect(findBestFitBucket(remaining, 5)).toBeNull();
  });

  test("Test 7 — no automatic combination: 1x4 + 1x2 does not satisfy partySize 6", () => {
    const buckets: CapacityBucket[] = [
      { maxPartySize: 4, quantity: 1 },
      { maxPartySize: 2, quantity: 1 },
    ];
    expect(findBestFitBucket(buckets, 6)).toBeNull();
  });
});

describe("computeRemainingBuckets (Test 8, 9, 10)", () => {
  test("Test 8 — consuming partySize 2 leaves 1x4 + 1x2", () => {
    const buckets: CapacityBucket[] = [
      { maxPartySize: 4, quantity: 1 },
      { maxPartySize: 2, quantity: 2 },
    ];
    const remaining = computeRemainingBuckets({
      buckets,
      allocations: [{ status: "allocated", configRevision: 1, bucketMaxPartySize: 2 }],
      configRevision: 1,
    });
    expect(remaining).toEqual([
      { maxPartySize: 2, quantity: 1 },
      { maxPartySize: 4, quantity: 1 },
    ]);
  });

  test("Test 9 — released allocations restore the bucket", () => {
    const buckets: CapacityBucket[] = [{ maxPartySize: 4, quantity: 1 }];
    const remaining = computeRemainingBuckets({
      buckets,
      allocations: [{ status: "released", configRevision: 1, bucketMaxPartySize: 4 }],
      configRevision: 1,
    });
    expect(remaining).toEqual([{ maxPartySize: 4, quantity: 1 }]);
  });

  test("Test 10 — allocation from a previous revision is ignored", () => {
    const buckets: CapacityBucket[] = [{ maxPartySize: 4, quantity: 1 }];
    const remaining = computeRemainingBuckets({
      buckets,
      allocations: [{ status: "allocated", configRevision: 2, bucketMaxPartySize: 4 }],
      configRevision: 3,
    });
    expect(remaining).toEqual([{ maxPartySize: 4, quantity: 1 }]);
  });
});

describe("isCapacityShapeEnforced / evaluateCapacityShape (Test 1, 2, 11)", () => {
  test("Test 1 — shape null -> allowed by shape (not enforced)", () => {
    const result = evaluateCapacityShape({ shape: null, allocations: [], partySize: 6 });
    expect(result.enforced).toBe(false);
    expect(result.allowed).toBe(true);
  });

  test("Test 2 — shape disabled -> allowed by shape (not enforced)", () => {
    const shape: CapacityShapeLike = {
      enabled: false,
      needsReview: false,
      buckets: [{ maxPartySize: 4, quantity: 1 }],
      configRevision: 1,
    };
    const result = evaluateCapacityShape({ shape, allocations: [], partySize: 6 });
    expect(result.enforced).toBe(false);
    expect(result.allowed).toBe(true);
  });

  test("Test 11 — needsReview true suspends enforcement even if enabled", () => {
    const shape: CapacityShapeLike = {
      enabled: true,
      needsReview: true,
      buckets: [{ maxPartySize: 4, quantity: 1 }],
      configRevision: 1,
    };
    expect(isCapacityShapeEnforced(shape)).toBe(false);
    const result = evaluateCapacityShape({ shape, allocations: [], partySize: 6 });
    expect(result.enforced).toBe(false);
    expect(result.allowed).toBe(true);
  });

  test("enabled + not needsReview enforces the shape", () => {
    const shape: CapacityShapeLike = {
      enabled: true,
      needsReview: false,
      buckets: [{ maxPartySize: 4, quantity: 1 }, { maxPartySize: 2, quantity: 2 }],
      configRevision: 1,
    };
    expect(isCapacityShapeEnforced(shape)).toBe(true);
    expect(canAcceptParty({ shape, allocations: [], partySize: 4 })).toBe(true);
    expect(canAcceptParty({ shape, allocations: [], partySize: 6 })).toBe(false);
  });
});

describe("validateCapacityShape", () => {
  test("rejects empty shape when enabled (all quantities 0)", () => {
    const result = validateCapacityShape({
      enabled: true,
      buckets: [{ maxPartySize: 4, quantity: 0 }],
      remainingCapacity: 8,
    });
    expect(result).toEqual({ ok: false, reason: "EMPTY_SHAPE" });
  });

  test("rejects empty buckets array when enabled", () => {
    const result = validateCapacityShape({ enabled: true, buckets: [], remainingCapacity: 8 });
    expect(result).toEqual({ ok: false, reason: "EMPTY_SHAPE" });
  });

  test("rejects configuredSeatCapacity > remainingCapacity", () => {
    const result = validateCapacityShape({
      enabled: true,
      buckets: [{ maxPartySize: 4, quantity: 1 }, { maxPartySize: 2, quantity: 3 }],
      remainingCapacity: 8,
    });
    expect(result).toEqual({ ok: false, reason: "EXCEEDS_REMAINING_CAPACITY" });
  });

  test("allows configuredSeatCapacity < remainingCapacity (partial typing)", () => {
    const result = validateCapacityShape({
      enabled: true,
      buckets: [{ maxPartySize: 4, quantity: 1 }, { maxPartySize: 2, quantity: 2 }],
      remainingCapacity: 10,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.configuredSeatCapacity).toBe(8);
    }
  });

  test("allows disabling with empty buckets (no enforcement of non-empty rule)", () => {
    const result = validateCapacityShape({ enabled: false, buckets: [], remainingCapacity: 8 });
    expect(result.ok).toBe(true);
  });

  test("rejects invalid bucket (maxPartySize < 1)", () => {
    const result = validateCapacityShape({
      enabled: true,
      buckets: [{ maxPartySize: 0, quantity: 1 }],
      remainingCapacity: 8,
    });
    expect(result).toEqual({ ok: false, reason: "INVALID_BUCKET" });
  });
});
