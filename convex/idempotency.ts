/**
 * Idempotency mutations/queries for actions.
 * Uses idempotencyKeys table from schema.ts.
 */

import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Check if an idempotency key exists and is valid.
 * Returns the stored resultData if found and not expired, null otherwise.
 */
export const check = internalQuery({
  args: {
    key: v.string(),
    requestHash: v.string(),
  },
  handler: async (ctx, { key, requestHash }) => {
    const entry = await ctx.db
      .query("idempotencyKeys")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();

    if (!entry) {
      return { found: false } as const;
    }

    // Check if expired
    if (entry.expiresAt <= Date.now()) {
      return { found: false } as const;
    }

    // Check if requestHash matches (same request)
    if (entry.requestHash !== requestHash) {
      return { found: true, hashMismatch: true } as const;
    }

    return { found: true, hashMismatch: false, resultData: entry.resultData } as const;
  },
});

/**
 * Store an idempotency result.
 * Race-safe: uses unique index + catches conflict.
 */
export const store = internalMutation({
  args: {
    key: v.string(),
    action: v.union(
      v.literal("reservations.create"),
      v.literal("reservations.cancelByToken"),
      v.literal("groupRequests.create")
    ),
    requestHash: v.string(),
    resultData: v.any(),
    expiresAt: v.number(),
  },
  handler: async (ctx, { key, action, requestHash, resultData, expiresAt }) => {
    // Check if already exists (race condition protection)
    const existing = await ctx.db
      .query("idempotencyKeys")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();

    if (existing) {
      // Already stored by concurrent request, return existing result
      return { stored: false, existingResultData: existing.resultData };
    }

    // Insert new entry
    await ctx.db.insert("idempotencyKeys", {
      key,
      action,
      requestHash,
      resultData,
      expiresAt,
      createdAt: Date.now(),
    });

    return { stored: true };
  },
});
