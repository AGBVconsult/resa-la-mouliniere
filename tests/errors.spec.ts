import { describe, expect, test } from "vitest";

import { appError, Errors } from "../convex/lib/errors";

describe("appError", () => {
  test("creates error with correct shape", () => {
    const error = appError("NOT_FOUND", "error.test", { id: "123" });

    expect(error.data.code).toBe("NOT_FOUND");
    expect(error.data.messageKey).toBe("error.test");
    expect(error.data.meta).toEqual({ id: "123" });
  });

  test("creates error without meta", () => {
    const error = appError("FORBIDDEN", "error.forbidden");

    expect(error.data.code).toBe("FORBIDDEN");
    expect(error.data.messageKey).toBe("error.forbidden");
    expect(error.data.meta).toBeUndefined();
  });
});

describe("Errors factory", () => {
  test("all errors have code + messageKey starting with error.", () => {
    const errorFactories = [
      () => Errors.UNAUTHORIZED(),
      () => Errors.FORBIDDEN("admin", "staff"),
      () => Errors.NO_ACTIVE_RESTAURANT(),
      () => Errors.MULTIPLE_ACTIVE_RESTAURANTS(2),
      () => Errors.SETTINGS_NOT_FOUND(),
      () => Errors.USER_NOT_FOUND(),
      () => Errors.INVALID_INPUT("field", "reason"),
      () => Errors.SLOT_NOT_FOUND("slotKey"),
      () => Errors.SLOT_TAKEN("slotKey", "closed"),
      () => Errors.INSUFFICIENT_CAPACITY("slotKey", 5, 3),
      () => Errors.RATE_LIMITED(60000),
      () => Errors.TURNSTILE_FAILED(),
      () => Errors.TOKEN_INVALID(),
      () => Errors.TOKEN_EXPIRED(),
      () => Errors.VERSION_CONFLICT(1, 2),
      () => Errors.TABLE_CONFLICT("slotKey", ["t1", "t2"]),
    ];

    for (const factory of errorFactories) {
      const error = factory();
      expect(error.data.code).toBeDefined();
      expect(error.data.messageKey).toBeDefined();
      expect(error.data.messageKey).toMatch(/^error\./);
    }
  });

  test("FORBIDDEN includes required and actual roles in meta", () => {
    const error = Errors.FORBIDDEN("admin", "staff");

    expect(error.data.code).toBe("FORBIDDEN");
    expect(error.data.meta).toEqual({ required: "admin", actual: "staff" });
  });

  test("INSUFFICIENT_CAPACITY includes slotKey, requestedPartySize, remainingCapacity", () => {
    const error = Errors.INSUFFICIENT_CAPACITY("2024-01-01#lunch#12:00", 5, 3);

    expect(error.data.code).toBe("INSUFFICIENT_CAPACITY");
    expect(error.data.meta).toEqual({
      slotKey: "2024-01-01#lunch#12:00",
      requestedPartySize: 5,
      remainingCapacity: 3,
    });
  });

  test("RATE_LIMITED includes retryAfterMs", () => {
    const error = Errors.RATE_LIMITED(60000);

    expect(error.data.code).toBe("RATE_LIMITED");
    expect(error.data.meta).toEqual({ retryAfterMs: 60000 });
  });

  test("VERSION_CONFLICT includes expectedVersion and actualVersion", () => {
    const error = Errors.VERSION_CONFLICT(1, 2);

    expect(error.data.code).toBe("VERSION_CONFLICT");
    expect(error.data.meta).toEqual({ expectedVersion: 1, actualVersion: 2 });
  });
});
