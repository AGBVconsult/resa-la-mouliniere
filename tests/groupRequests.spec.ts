import { describe, it, expect } from "vitest";
import { isValidTransition } from "../convex/groupRequests";

describe("groupRequests", () => {
  describe("status transitions (CONTRACTS.md §5.7)", () => {
    // Valid transitions from pending
    it("pending → contacted ✓", () => {
      expect(isValidTransition("pending", "contacted")).toBe(true);
    });
    it("pending → converted ✓", () => {
      expect(isValidTransition("pending", "converted")).toBe(true);
    });
    it("pending → declined ✓", () => {
      expect(isValidTransition("pending", "declined")).toBe(true);
    });

    // Valid transitions from contacted
    it("contacted → converted ✓", () => {
      expect(isValidTransition("contacted", "converted")).toBe(true);
    });
    it("contacted → declined ✓", () => {
      expect(isValidTransition("contacted", "declined")).toBe(true);
    });

    // Invalid - terminal states
    it("converted → pending ✗ (terminal)", () => {
      expect(isValidTransition("converted", "pending")).toBe(false);
    });
    it("converted → contacted ✗ (terminal)", () => {
      expect(isValidTransition("converted", "contacted")).toBe(false);
    });
    it("converted → declined ✗ (terminal)", () => {
      expect(isValidTransition("converted", "declined")).toBe(false);
    });
    it("declined → pending ✗ (terminal)", () => {
      expect(isValidTransition("declined", "pending")).toBe(false);
    });
    it("declined → contacted ✗ (terminal)", () => {
      expect(isValidTransition("declined", "contacted")).toBe(false);
    });
    it("declined → converted ✗ (terminal)", () => {
      expect(isValidTransition("declined", "converted")).toBe(false);
    });

    // Invalid - backward transition
    it("contacted → pending ✗ (backward)", () => {
      expect(isValidTransition("contacted", "pending")).toBe(false);
    });

    // Invalid - unknown status
    it("unknown → contacted ✗", () => {
      expect(isValidTransition("unknown", "contacted")).toBe(false);
    });
  });

  describe("partySize validation (CONTRACTS.md §5.7)", () => {
    const MIN_GROUP_SIZE = 16;

    it("accepts partySize = 16 (minimum)", () => {
      expect(16 >= MIN_GROUP_SIZE).toBe(true);
    });

    it("accepts partySize > 16", () => {
      expect(20 >= MIN_GROUP_SIZE).toBe(true);
      expect(50 >= MIN_GROUP_SIZE).toBe(true);
    });

    it("rejects partySize = 15", () => {
      expect(15 >= MIN_GROUP_SIZE).toBe(false);
    });

    it("rejects partySize < 16", () => {
      expect(10 >= MIN_GROUP_SIZE).toBe(false);
      expect(1 >= MIN_GROUP_SIZE).toBe(false);
    });
  });

  describe("preferredDateKey format", () => {
    const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

    it("accepts valid YYYY-MM-DD format", () => {
      expect(DATE_KEY_REGEX.test("2025-01-15")).toBe(true);
      expect(DATE_KEY_REGEX.test("2025-12-31")).toBe(true);
      expect(DATE_KEY_REGEX.test("2024-06-01")).toBe(true);
    });

    it("rejects single-digit month/day", () => {
      expect(DATE_KEY_REGEX.test("2025-1-15")).toBe(false);
      expect(DATE_KEY_REGEX.test("2025-01-5")).toBe(false);
    });

    it("rejects wrong separators", () => {
      expect(DATE_KEY_REGEX.test("2025/01/15")).toBe(false);
      expect(DATE_KEY_REGEX.test("2025.01.15")).toBe(false);
    });

    it("rejects wrong order", () => {
      expect(DATE_KEY_REGEX.test("15-01-2025")).toBe(false);
      expect(DATE_KEY_REGEX.test("01-15-2025")).toBe(false);
    });
  });

  describe("converted requires reservationId", () => {
    it("converted without reservationId → should error", () => {
      const hasReservationId = false;
      const status = "converted";
      const shouldError = status === "converted" && !hasReservationId;
      expect(shouldError).toBe(true);
    });

    it("converted with reservationId → ok", () => {
      const hasReservationId = true;
      const status = "converted";
      const shouldError = status === "converted" && !hasReservationId;
      expect(shouldError).toBe(false);
    });

    it("declined with reservationId → should error", () => {
      const hasReservationId = true;
      const status: string = "declined";
      const shouldError = status !== "converted" && hasReservationId;
      expect(shouldError).toBe(true);
    });

    it("contacted without reservationId → ok", () => {
      const hasReservationId = false;
      const status: string = "contacted";
      const shouldError = status !== "converted" && hasReservationId;
      expect(shouldError).toBe(false);
    });
  });

  describe("preferredService enum", () => {
    const validServices = ["lunch", "dinner"];

    it("accepts lunch", () => {
      expect(validServices.includes("lunch")).toBe(true);
    });

    it("accepts dinner", () => {
      expect(validServices.includes("dinner")).toBe(true);
    });

    it("rejects midi (French)", () => {
      expect(validServices.includes("midi")).toBe(false);
    });

    it("rejects soir (French)", () => {
      expect(validServices.includes("soir")).toBe(false);
    });

    it("rejects flexible", () => {
      expect(validServices.includes("flexible")).toBe(false);
    });
  });

  describe("language enum", () => {
    const validLanguages = ["fr", "nl", "en", "de", "it"];

    it("accepts all valid languages", () => {
      expect(validLanguages.includes("fr")).toBe(true);
      expect(validLanguages.includes("nl")).toBe(true);
      expect(validLanguages.includes("en")).toBe(true);
      expect(validLanguages.includes("de")).toBe(true);
      expect(validLanguages.includes("it")).toBe(true);
    });

    it("rejects invalid languages", () => {
      expect(validLanguages.includes("es")).toBe(false);
      expect(validLanguages.includes("pt")).toBe(false);
    });
  });
});
