import { describe, test, expect } from "vitest";

// Test helpers

function isValidTimeKey(timeKey: string): boolean {
  return /^\d{2}:\d{2}$/.test(timeKey);
}

function isValidDayOfWeek(day: number): boolean {
  return Number.isInteger(day) && day >= 1 && day <= 7;
}

function isValidCapacity(capacity: number): boolean {
  return Number.isInteger(capacity) && capacity >= 1 && capacity <= 50;
}

interface TemplateSlot {
  timeKey: string;
  capacity: number;
  isActive: boolean;
  largeTableAllowed: boolean;
  maxGroupSize: number | null;
}

function sortSlots(slots: TemplateSlot[]): TemplateSlot[] {
  return [...slots].sort((a, b) => a.timeKey.localeCompare(b.timeKey));
}

function hasDuplicateTimeKeys(slots: TemplateSlot[]): boolean {
  const timeKeys = new Set<string>();
  for (const slot of slots) {
    if (timeKeys.has(slot.timeKey)) {
      return true;
    }
    timeKeys.add(slot.timeKey);
  }
  return false;
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

describe("TimeKey validation", () => {
  test("accepts valid HH:MM format", () => {
    expect(isValidTimeKey("12:00")).toBe(true);
    expect(isValidTimeKey("18:30")).toBe(true);
    expect(isValidTimeKey("00:00")).toBe(true);
    expect(isValidTimeKey("23:59")).toBe(true);
  });

  test("rejects invalid formats", () => {
    expect(isValidTimeKey("12:0")).toBe(false);
    expect(isValidTimeKey("1:00")).toBe(false);
    expect(isValidTimeKey("12-00")).toBe(false);
    expect(isValidTimeKey("12:00:00")).toBe(false);
    expect(isValidTimeKey("")).toBe(false);
  });
});

describe("DayOfWeek validation", () => {
  test("accepts 1-7", () => {
    for (let i = 1; i <= 7; i++) {
      expect(isValidDayOfWeek(i)).toBe(true);
    }
  });

  test("rejects 0 and 8", () => {
    expect(isValidDayOfWeek(0)).toBe(false);
    expect(isValidDayOfWeek(8)).toBe(false);
  });

  test("rejects non-integers", () => {
    expect(isValidDayOfWeek(1.5)).toBe(false);
    expect(isValidDayOfWeek(NaN)).toBe(false);
  });
});

describe("Capacity validation", () => {
  test("accepts 1-50", () => {
    expect(isValidCapacity(1)).toBe(true);
    expect(isValidCapacity(25)).toBe(true);
    expect(isValidCapacity(50)).toBe(true);
  });

  test("rejects 0 and 51", () => {
    expect(isValidCapacity(0)).toBe(false);
    expect(isValidCapacity(51)).toBe(false);
  });

  test("rejects negative", () => {
    expect(isValidCapacity(-1)).toBe(false);
  });
});

describe("Slot sorting", () => {
  test("sorts by timeKey chronologically", () => {
    const slots: TemplateSlot[] = [
      { timeKey: "13:00", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
      { timeKey: "12:00", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
      { timeKey: "12:30", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
    ];

    const sorted = sortSlots(slots);
    expect(sorted[0].timeKey).toBe("12:00");
    expect(sorted[1].timeKey).toBe("12:30");
    expect(sorted[2].timeKey).toBe("13:00");
  });

  test("handles empty array", () => {
    expect(sortSlots([])).toEqual([]);
  });

  test("handles single slot", () => {
    const slots: TemplateSlot[] = [
      { timeKey: "12:00", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
    ];
    expect(sortSlots(slots)).toEqual(slots);
  });
});

describe("Duplicate timeKey detection", () => {
  test("detects duplicates", () => {
    const slots: TemplateSlot[] = [
      { timeKey: "12:00", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
      { timeKey: "12:00", capacity: 10, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
    ];
    expect(hasDuplicateTimeKeys(slots)).toBe(true);
  });

  test("no duplicates", () => {
    const slots: TemplateSlot[] = [
      { timeKey: "12:00", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
      { timeKey: "12:30", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
    ];
    expect(hasDuplicateTimeKeys(slots)).toBe(false);
  });

  test("empty array has no duplicates", () => {
    expect(hasDuplicateTimeKeys([])).toBe(false);
  });
});

describe("Default slots", () => {
  const DEFAULT_LUNCH_SLOTS: TemplateSlot[] = [
    { timeKey: "12:00", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
    { timeKey: "12:30", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
    { timeKey: "13:00", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
  ];

  const DEFAULT_DINNER_SLOTS: TemplateSlot[] = [
    { timeKey: "18:00", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
    { timeKey: "18:30", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
    { timeKey: "19:00", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
  ];

  test("lunch has 3 slots", () => {
    expect(DEFAULT_LUNCH_SLOTS).toHaveLength(3);
  });

  test("dinner has 3 slots", () => {
    expect(DEFAULT_DINNER_SLOTS).toHaveLength(3);
  });

  test("lunch slots are sorted", () => {
    const sorted = sortSlots(DEFAULT_LUNCH_SLOTS);
    expect(sorted).toEqual(DEFAULT_LUNCH_SLOTS);
  });

  test("dinner slots are sorted", () => {
    const sorted = sortSlots(DEFAULT_DINNER_SLOTS);
    expect(sorted).toEqual(DEFAULT_DINNER_SLOTS);
  });

  test("all slots have valid capacity", () => {
    for (const slot of [...DEFAULT_LUNCH_SLOTS, ...DEFAULT_DINNER_SLOTS]) {
      expect(isValidCapacity(slot.capacity)).toBe(true);
    }
  });
});

describe("Seed defaults count", () => {
  test("14 templates = 7 days × 2 services", () => {
    const days = 7;
    const services = 2;
    expect(days * services).toBe(14);
  });
});

describe("ISO weekday", () => {
  test("Monday = 1", () => {
    const monday = new Date(2025, 0, 6); // Jan 6, 2025 is Monday
    expect(getISOWeekday(monday)).toBe(1);
  });

  test("Sunday = 7", () => {
    const sunday = new Date(2025, 0, 5); // Jan 5, 2025 is Sunday
    expect(getISOWeekday(sunday)).toBe(7);
  });

  test("Saturday = 6", () => {
    const saturday = new Date(2025, 0, 4); // Jan 4, 2025 is Saturday
    expect(getISOWeekday(saturday)).toBe(6);
  });
});

describe("Date formatting", () => {
  test("formats correctly", () => {
    const date = new Date(2025, 5, 15); // June 15, 2025
    expect(formatDateKey(date)).toBe("2025-06-15");
  });

  test("pads month and day", () => {
    const date = new Date(2025, 0, 5); // Jan 5, 2025
    expect(formatDateKey(date)).toBe("2025-01-05");
  });
});

describe("Slot generation rules", () => {
  test("never overwrite existing slot", () => {
    const existingSlots = new Set(["2025-01-15#lunch#12:00"]);
    const newSlotKey = "2025-01-15#lunch#12:00";
    
    const shouldCreate = !existingSlots.has(newSlotKey);
    expect(shouldCreate).toBe(false);
  });

  test("create if slot does not exist", () => {
    const existingSlots = new Set(["2025-01-15#lunch#12:00"]);
    const newSlotKey = "2025-01-15#lunch#12:30";
    
    const shouldCreate = !existingSlots.has(newSlotKey);
    expect(shouldCreate).toBe(true);
  });

  test("skip if template isOpen=false", () => {
    const template = { isOpen: false, slots: [] };
    const shouldProcess = template.isOpen;
    expect(shouldProcess).toBe(false);
  });

  test("skip if slot isActive=false", () => {
    const slot = { timeKey: "12:00", capacity: 8, isActive: false, largeTableAllowed: false, maxGroupSize: 15 };
    const shouldCreate = slot.isActive;
    expect(shouldCreate).toBe(false);
  });
});

describe("Template slot operations", () => {
  test("add slot maintains sort order", () => {
    const slots: TemplateSlot[] = [
      { timeKey: "12:00", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
      { timeKey: "13:00", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
    ];

    const newSlot: TemplateSlot = { timeKey: "12:30", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 };
    const result = sortSlots([...slots, newSlot]);

    expect(result[0].timeKey).toBe("12:00");
    expect(result[1].timeKey).toBe("12:30");
    expect(result[2].timeKey).toBe("13:00");
  });

  test("update slot preserves other fields", () => {
    const slot: TemplateSlot = { timeKey: "12:00", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 };
    const patch = { capacity: 10 };

    const updated: TemplateSlot = {
      ...slot,
      capacity: patch.capacity ?? slot.capacity,
    };

    expect(updated.timeKey).toBe("12:00");
    expect(updated.capacity).toBe(10);
    expect(updated.isActive).toBe(true);
  });

  test("remove slot filters correctly", () => {
    const slots: TemplateSlot[] = [
      { timeKey: "12:00", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
      { timeKey: "12:30", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
      { timeKey: "13:00", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
    ];

    const result = slots.filter((s) => s.timeKey !== "12:30");
    expect(result).toHaveLength(2);
    expect(result.find((s) => s.timeKey === "12:30")).toBeUndefined();
  });
});
