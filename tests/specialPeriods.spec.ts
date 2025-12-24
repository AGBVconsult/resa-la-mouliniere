import { describe, test, expect } from "vitest";

// Test helpers for date manipulation
function isValidDateKey(dateKey: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey);
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getISOWeekday(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function daysBetween(startDate: string, endDate: string): number {
  const start = parseDateKey(startDate);
  const end = parseDateKey(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function* dateRange(startDate: string, endDate: string): Generator<string> {
  const start = parseDateKey(startDate);
  const end = parseDateKey(endDate);
  const current = new Date(start);
  
  while (current <= end) {
    yield formatDateKey(current);
    current.setDate(current.getDate() + 1);
  }
}

describe("Date validation", () => {
  test("isValidDateKey accepts valid format", () => {
    expect(isValidDateKey("2025-01-15")).toBe(true);
    expect(isValidDateKey("2025-12-31")).toBe(true);
  });

  test("isValidDateKey rejects invalid format", () => {
    expect(isValidDateKey("2025-1-15")).toBe(false);
    expect(isValidDateKey("25-01-15")).toBe(false);
    expect(isValidDateKey("2025/01/15")).toBe(false);
    expect(isValidDateKey("")).toBe(false);
  });

  test("parseDateKey parses correctly", () => {
    const date = parseDateKey("2025-06-15");
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(5); // 0-indexed
    expect(date.getDate()).toBe(15);
  });

  test("formatDateKey formats correctly", () => {
    const date = new Date(2025, 5, 15); // June 15, 2025
    expect(formatDateKey(date)).toBe("2025-06-15");
  });

  test("getISOWeekday returns 1-7", () => {
    // Monday = 1, Sunday = 7
    const monday = new Date(2025, 0, 6); // Jan 6, 2025 is Monday
    expect(getISOWeekday(monday)).toBe(1);
    
    const sunday = new Date(2025, 0, 5); // Jan 5, 2025 is Sunday
    expect(getISOWeekday(sunday)).toBe(7);
  });

  test("daysBetween calculates correctly", () => {
    expect(daysBetween("2025-01-01", "2025-01-01")).toBe(0);
    expect(daysBetween("2025-01-01", "2025-01-02")).toBe(1);
    expect(daysBetween("2025-01-01", "2025-01-31")).toBe(30);
    expect(daysBetween("2025-01-01", "2025-12-31")).toBe(364);
  });

  test("daysBetween max 365 days validation", () => {
    const days = daysBetween("2025-01-01", "2026-01-02");
    expect(days).toBeGreaterThan(365);
  });
});

describe("Date range generator", () => {
  test("generates single date for same start/end", () => {
    const dates = [...dateRange("2025-01-15", "2025-01-15")];
    expect(dates).toEqual(["2025-01-15"]);
  });

  test("generates correct range", () => {
    const dates = [...dateRange("2025-01-01", "2025-01-05")];
    expect(dates).toEqual([
      "2025-01-01",
      "2025-01-02",
      "2025-01-03",
      "2025-01-04",
      "2025-01-05",
    ]);
  });

  test("handles month boundaries", () => {
    const dates = [...dateRange("2025-01-30", "2025-02-02")];
    expect(dates).toEqual([
      "2025-01-30",
      "2025-01-31",
      "2025-02-01",
      "2025-02-02",
    ]);
  });
});

describe("ApplyRules validation", () => {
  const validateApplyRules = (rules: {
    status: "open" | "modified" | "closed";
    services: ("lunch" | "dinner")[];
    activeDays: number[];
    overrideCapacity?: number;
    maxGroupSize?: number | null;
    largeTableAllowed?: boolean;
  }): { valid: boolean; error?: string } => {
    if (rules.services.length === 0) {
      return { valid: false, error: "services" };
    }
    if (rules.activeDays.length === 0) {
      return { valid: false, error: "activeDays" };
    }
    for (const day of rules.activeDays) {
      if (day < 1 || day > 7) {
        return { valid: false, error: "activeDays" };
      }
    }
    if (rules.status !== "modified") {
      if (rules.overrideCapacity !== undefined) {
        return { valid: false, error: "overrideCapacity" };
      }
      if (rules.maxGroupSize !== undefined) {
        return { valid: false, error: "maxGroupSize" };
      }
      if (rules.largeTableAllowed !== undefined) {
        return { valid: false, error: "largeTableAllowed" };
      }
    }
    return { valid: true };
  };

  test("valid rules with status=closed", () => {
    const result = validateApplyRules({
      status: "closed",
      services: ["lunch"],
      activeDays: [1, 2, 3],
    });
    expect(result.valid).toBe(true);
  });

  test("valid rules with status=modified", () => {
    const result = validateApplyRules({
      status: "modified",
      services: ["lunch", "dinner"],
      activeDays: [1, 2, 3, 4, 5],
      overrideCapacity: 20,
      maxGroupSize: 8,
    });
    expect(result.valid).toBe(true);
  });

  test("rejects empty services", () => {
    const result = validateApplyRules({
      status: "closed",
      services: [],
      activeDays: [1],
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("services");
  });

  test("rejects empty activeDays", () => {
    const result = validateApplyRules({
      status: "closed",
      services: ["lunch"],
      activeDays: [],
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("activeDays");
  });

  test("rejects invalid activeDays values", () => {
    const result = validateApplyRules({
      status: "closed",
      services: ["lunch"],
      activeDays: [0, 8],
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("activeDays");
  });

  test("rejects overrideCapacity when status!=modified", () => {
    const result = validateApplyRules({
      status: "closed",
      services: ["lunch"],
      activeDays: [1],
      overrideCapacity: 20,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("overrideCapacity");
  });

  test("rejects maxGroupSize when status!=modified", () => {
    const result = validateApplyRules({
      status: "open",
      services: ["lunch"],
      activeDays: [1],
      maxGroupSize: 8,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("maxGroupSize");
  });
});

describe("Overlap detection", () => {
  const checkOverlap = (
    period1: { startDate: string; endDate: string },
    period2: { startDate: string; endDate: string }
  ): boolean => {
    return !(period1.endDate < period2.startDate || period1.startDate > period2.endDate);
  };

  test("no overlap when periods are separate", () => {
    expect(checkOverlap(
      { startDate: "2025-01-01", endDate: "2025-01-10" },
      { startDate: "2025-01-20", endDate: "2025-01-30" }
    )).toBe(false);
  });

  test("overlap when periods touch", () => {
    expect(checkOverlap(
      { startDate: "2025-01-01", endDate: "2025-01-10" },
      { startDate: "2025-01-10", endDate: "2025-01-20" }
    )).toBe(true);
  });

  test("overlap when one contains the other", () => {
    expect(checkOverlap(
      { startDate: "2025-01-01", endDate: "2025-01-31" },
      { startDate: "2025-01-10", endDate: "2025-01-20" }
    )).toBe(true);
  });

  test("overlap when periods intersect", () => {
    expect(checkOverlap(
      { startDate: "2025-01-01", endDate: "2025-01-15" },
      { startDate: "2025-01-10", endDate: "2025-01-25" }
    )).toBe(true);
  });
});

describe("Priority resolution", () => {
  type Override = {
    origin: "manual" | "period";
    patch: { isOpen?: boolean; capacity?: number };
  };

  const resolveOverride = (overrides: Override[]): Override | null => {
    const manual = overrides.find((o) => o.origin === "manual");
    const period = overrides.find((o) => o.origin === "period");
    return manual ?? period ?? null;
  };

  test("manual takes priority over period", () => {
    const overrides: Override[] = [
      { origin: "period", patch: { isOpen: false } },
      { origin: "manual", patch: { isOpen: true } },
    ];
    const result = resolveOverride(overrides);
    expect(result?.origin).toBe("manual");
    expect(result?.patch.isOpen).toBe(true);
  });

  test("period is used when no manual", () => {
    const overrides: Override[] = [
      { origin: "period", patch: { capacity: 10 } },
    ];
    const result = resolveOverride(overrides);
    expect(result?.origin).toBe("period");
    expect(result?.patch.capacity).toBe(10);
  });

  test("returns null when no overrides", () => {
    const result = resolveOverride([]);
    expect(result).toBeNull();
  });
});

describe("Slot effective values", () => {
  type Slot = { isOpen: boolean; capacity: number; maxGroupSize: number | null };
  type Patch = { isOpen?: boolean; capacity?: number; maxGroupSize?: number | null };

  const applyPatch = (slot: Slot, patch: Patch): Slot => {
    return {
      isOpen: patch.isOpen ?? slot.isOpen,
      capacity: patch.capacity ?? slot.capacity,
      maxGroupSize: patch.maxGroupSize !== undefined ? patch.maxGroupSize : slot.maxGroupSize,
    };
  };

  test("applies isOpen override", () => {
    const slot: Slot = { isOpen: true, capacity: 20, maxGroupSize: 15 };
    const result = applyPatch(slot, { isOpen: false });
    expect(result.isOpen).toBe(false);
    expect(result.capacity).toBe(20);
  });

  test("applies capacity override", () => {
    const slot: Slot = { isOpen: true, capacity: 20, maxGroupSize: 15 };
    const result = applyPatch(slot, { capacity: 10 });
    expect(result.capacity).toBe(10);
  });

  test("applies maxGroupSize null override", () => {
    const slot: Slot = { isOpen: true, capacity: 20, maxGroupSize: 15 };
    const result = applyPatch(slot, { maxGroupSize: null });
    expect(result.maxGroupSize).toBeNull();
  });

  test("preserves values when patch is empty", () => {
    const slot: Slot = { isOpen: true, capacity: 20, maxGroupSize: 15 };
    const result = applyPatch(slot, {});
    expect(result).toEqual(slot);
  });
});

describe("Period type priority", () => {
  const typePriority: Record<string, number> = {
    event: 1,
    holiday: 2,
    closure: 3,
  };

  test("event has highest priority", () => {
    expect(typePriority.event).toBeLessThan(typePriority.holiday);
    expect(typePriority.event).toBeLessThan(typePriority.closure);
  });

  test("holiday has higher priority than closure", () => {
    expect(typePriority.holiday).toBeLessThan(typePriority.closure);
  });
});
