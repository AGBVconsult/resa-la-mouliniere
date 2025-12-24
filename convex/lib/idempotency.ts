/**
 * Idempotency helpers for actions.
 * Uses idempotencyKeys table from schema.ts with exact field names.
 */

import { internalMutation, internalQuery } from "../_generated/server";
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

/**
 * Canonicalize an object for stable JSON stringification.
 * Recursively sorts object keys to ensure deterministic output.
 */
function canonicalize(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(canonicalize);
  }
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = canonicalize((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

/**
 * Compute a stable hash of request inputs for idempotency comparison.
 * Pure function, testable.
 * Uses deep canonicalization for deterministic output.
 */
export function computeRequestHash(inputs: Record<string, unknown>): string {
  // Deep canonicalization for stable JSON
  const canonical = JSON.stringify(canonicalize(inputs));
  // Simple hash (djb2 variant) for MVP
  let hash = 5381;
  for (let i = 0; i < canonical.length; i++) {
    hash = ((hash << 5) + hash) ^ canonical.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
