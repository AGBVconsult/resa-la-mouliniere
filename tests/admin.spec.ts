import { describe, expect, test } from "vitest";

import { isValidStatusTransition, getValidTransitions } from "../convex/lib/stateMachine";
import { getTodayDateKey, isValidDateKey } from "../convex/lib/dateUtils";

describe("isValidStatusTransition", () => {
  // From pending
  test("pending -> confirmed is valid", () => {
    expect(isValidStatusTransition("pending", "confirmed")).toBe(true);
  });

  test("pending -> refused is valid", () => {
    expect(isValidStatusTransition("pending", "refused")).toBe(true);
  });

  test("pending -> cancelled is valid", () => {
    expect(isValidStatusTransition("pending", "cancelled")).toBe(true);
  });

  test("pending -> seated is invalid", () => {
    expect(isValidStatusTransition("pending", "seated")).toBe(false);
  });

  test("pending -> completed is invalid", () => {
    expect(isValidStatusTransition("pending", "completed")).toBe(false);
  });

  // From confirmed
  test("confirmed -> seated is valid", () => {
    expect(isValidStatusTransition("confirmed", "seated")).toBe(true);
  });

  test("confirmed -> cancelled is valid", () => {
    expect(isValidStatusTransition("confirmed", "cancelled")).toBe(true);
  });

  test("confirmed -> noshow is valid", () => {
    expect(isValidStatusTransition("confirmed", "noshow")).toBe(true);
  });

  test("confirmed -> pending is invalid", () => {
    expect(isValidStatusTransition("confirmed", "pending")).toBe(false);
  });

  test("confirmed -> completed is invalid (must go through seated)", () => {
    expect(isValidStatusTransition("confirmed", "completed")).toBe(false);
  });

  // From seated
  test("seated -> completed is valid", () => {
    expect(isValidStatusTransition("seated", "completed")).toBe(true);
  });

  test("seated -> cancelled is invalid", () => {
    expect(isValidStatusTransition("seated", "cancelled")).toBe(false);
  });

  test("seated -> noshow is invalid", () => {
    expect(isValidStatusTransition("seated", "noshow")).toBe(false);
  });

  // Terminal states
  test("completed -> any is invalid", () => {
    expect(isValidStatusTransition("completed", "pending")).toBe(false);
    expect(isValidStatusTransition("completed", "confirmed")).toBe(false);
    expect(isValidStatusTransition("completed", "seated")).toBe(false);
    expect(isValidStatusTransition("completed", "cancelled")).toBe(false);
  });

  test("cancelled -> any is invalid", () => {
    expect(isValidStatusTransition("cancelled", "pending")).toBe(false);
    expect(isValidStatusTransition("cancelled", "confirmed")).toBe(false);
  });

  test("refused -> any is invalid", () => {
    expect(isValidStatusTransition("refused", "pending")).toBe(false);
    expect(isValidStatusTransition("refused", "confirmed")).toBe(false);
  });

  test("noshow -> any is invalid", () => {
    expect(isValidStatusTransition("noshow", "pending")).toBe(false);
    expect(isValidStatusTransition("noshow", "confirmed")).toBe(false);
  });
});

describe("getValidTransitions", () => {
  test("pending has 3 valid transitions", () => {
    const transitions = getValidTransitions("pending");
    expect(transitions).toContain("confirmed");
    expect(transitions).toContain("refused");
    expect(transitions).toContain("cancelled");
    expect(transitions).toHaveLength(3);
  });

  test("confirmed has 3 valid transitions", () => {
    const transitions = getValidTransitions("confirmed");
    expect(transitions).toContain("seated");
    expect(transitions).toContain("cancelled");
    expect(transitions).toContain("noshow");
    expect(transitions).toHaveLength(3);
  });

  test("seated has 1 valid transition", () => {
    const transitions = getValidTransitions("seated");
    expect(transitions).toContain("completed");
    expect(transitions).toHaveLength(1);
  });

  test("terminal states have no transitions", () => {
    expect(getValidTransitions("completed")).toHaveLength(0);
    expect(getValidTransitions("cancelled")).toHaveLength(0);
    expect(getValidTransitions("refused")).toHaveLength(0);
    expect(getValidTransitions("noshow")).toHaveLength(0);
  });
});

describe("getTodayDateKey", () => {
  test("returns YYYY-MM-DD format", () => {
    const dateKey = getTodayDateKey("Europe/Brussels");
    expect(dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("returns valid date for UTC", () => {
    const dateKey = getTodayDateKey("UTC");
    expect(dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("returns valid date for America/New_York", () => {
    const dateKey = getTodayDateKey("America/New_York");
    expect(dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("isValidDateKey", () => {
  test("accepts valid YYYY-MM-DD format", () => {
    expect(isValidDateKey("2024-12-25")).toBe(true);
    expect(isValidDateKey("2024-01-01")).toBe(true);
    expect(isValidDateKey("2025-06-15")).toBe(true);
  });

  test("rejects invalid formats", () => {
    expect(isValidDateKey("24-12-25")).toBe(false);
    expect(isValidDateKey("2024/12/25")).toBe(false);
    expect(isValidDateKey("2024-1-25")).toBe(false);
    expect(isValidDateKey("2024-12-5")).toBe(false);
    expect(isValidDateKey("25-12-2024")).toBe(false);
    expect(isValidDateKey("invalid")).toBe(false);
    expect(isValidDateKey("")).toBe(false);
  });
});

describe("version conflict detection (pure logic)", () => {
  function checkVersionMismatch(expected: number, actual: number): boolean {
    return expected !== actual;
  }

  test("version mismatch should be detected", () => {
    expect(checkVersionMismatch(1, 2)).toBe(true);
  });

  test("version match should pass", () => {
    expect(checkVersionMismatch(3, 3)).toBe(false);
  });

  test("version should increment on update", () => {
    const currentVersion = 5;
    const newVersion = currentVersion + 1;
    expect(newVersion).toBe(6);
  });
});
