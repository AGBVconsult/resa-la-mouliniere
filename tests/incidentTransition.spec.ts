import { describe, expect, test } from "vitest";
import { isValidStatusTransition } from "../convex/lib/stateMachine";
import { ReservationStatus } from "../spec/contracts.generated";

describe("incident status", () => {
  test.each(ReservationStatus.filter((s) => s !== "incident"))(
    "%s -> incident is allowed (an incident can happen at any time)",
    (from) => {
      expect(isValidStatusTransition(from, "incident")).toBe(true);
    }
  );

  test("incident can be restored to confirmed before the client is seated", () => {
    expect(isValidStatusTransition("incident", "confirmed")).toBe(true);
  });
});
