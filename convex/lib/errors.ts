import { ConvexError, type Value } from "convex/values";

import type { ErrorCode } from "../../spec/contracts.generated";

/**
 * Shape d'erreur conforme au contrat.
 * Utilisable côté client pour afficher des messages traduits.
 */
export type AppError = {
  code: ErrorCode;
  messageKey: string;
  meta?: Record<string, Value>;
} & {
  [key: string]: Value | undefined;
};

export function appError(
  code: ErrorCode,
  messageKey: string,
  meta?: Record<string, Value>
): ConvexError<AppError> {
  return new ConvexError({ code, messageKey, meta });
}

export const Errors = {
  // === Auth ===
  // Contract ErrorCode doesn't include UNAUTHORIZED; we map it to FORBIDDEN.
  UNAUTHORIZED: () => appError("FORBIDDEN", "error.unauthorized"),

  FORBIDDEN: (required: string, actual: string) =>
    appError("FORBIDDEN", "error.forbidden", { required, actual }),

  // === Data ===
  NO_ACTIVE_RESTAURANT: () => appError("NOT_FOUND", "error.noActiveRestaurant"),

  MULTIPLE_ACTIVE_RESTAURANTS: (count: number) =>
    appError("VALIDATION_ERROR", "error.multipleActiveRestaurants", { count }),

  SETTINGS_NOT_FOUND: () => appError("NOT_FOUND", "error.settingsNotFound"),

  USER_NOT_FOUND: () => appError("NOT_FOUND", "error.userNotFound"),

  // === Validation ===
  INVALID_INPUT: (field: string, reason: string) =>
    appError("VALIDATION_ERROR", "error.invalidInput", { field, reason }),

  // === Slots ===
  SLOT_NOT_FOUND: (slotKey: string) =>
    appError("NOT_FOUND", "error.slotNotFound", { slotKey }),

  SLOT_TAKEN: (slotKey: string, reason: "closed" | "taken") =>
    appError("SLOT_TAKEN", "error.slotTaken", { slotKey, reason }),

  INSUFFICIENT_CAPACITY: (slotKey: string, requested: number, available: number) =>
    appError("INSUFFICIENT_CAPACITY", "error.insufficientCapacity", {
      slotKey,
      requestedPartySize: requested,
      remainingCapacity: available,
    }),

  // === Rate limit / Turnstile ===
  RATE_LIMITED: (retryAfterMs: number) =>
    appError("RATE_LIMITED", "error.rateLimited", { retryAfterMs }),

  TURNSTILE_FAILED: (meta?: { errorCodes?: string[]; reason?: string }) =>
    appError("TURNSTILE_FAILED", "error.turnstileFailed", meta),

  // === Token ===
  TOKEN_INVALID: () => appError("TOKEN_INVALID", "error.tokenInvalid"),

  TOKEN_EXPIRED: () => appError("TOKEN_EXPIRED", "error.tokenExpired"),

  // === Versioning ===
  VERSION_CONFLICT: (expected: number, actual: number) =>
    appError("VERSION_CONFLICT", "error.versionConflict", {
      expectedVersion: expected,
      actualVersion: actual,
    }),

  // === Tables ===
  TABLE_CONFLICT: (slotKey: string, tableIds: string[]) =>
    appError("TABLE_CONFLICT", "error.tableConflict", { slotKey, tableIds }),

  // === Special Periods ===
  SAME_TYPE_OVERLAP: (existingPeriodId: string, existingPeriodName: string) =>
    appError("SAME_TYPE_OVERLAP", "error.sameTypeOverlap", { existingPeriodId, existingPeriodName }),

  // === Generic ===
  NOT_FOUND: (table: string, id: string) =>
    appError("NOT_FOUND", "error.notFound", { table, id }),
} as const;
