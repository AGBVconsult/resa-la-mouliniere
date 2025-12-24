/**
 * Slots management — tooling admin.
 * seedRange: mutation owner pour générer des slots.
 * listByDateService: query tooling interne (hors contrat CONTRACTS.md).
 */

import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Errors } from "./lib/errors";
import { requireRole } from "./lib/rbac";

// ═══════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════

const TIME_KEY_REGEX = /^\d{2}:\d{2}$/;
const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Default slot configuration
const DEFAULT_LUNCH_TIMES = ["12:00", "12:15", "12:30", "12:45", "13:00", "13:15", "13:30"];
const DEFAULT_DINNER_TIMES = ["18:30", "18:45", "19:00", "19:15", "19:30", "19:45", "20:00", "20:15", "20:30", "20:45", "21:00"];
const DEFAULT_CAPACITY = 50;
const DEFAULT_MAX_GROUP_SIZE = 15;

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Build slotKey from components.
 * Format: {dateKey}#{service}#{timeKey}
 */
export function buildSlotKey(dateKey: string, service: "lunch" | "dinner", timeKey: string): string {
  return `${dateKey}#${service}#${timeKey}`;
}

/**
 * Parse slotKey into components.
 */
export function parseSlotKey(slotKey: string): { dateKey: string; service: "lunch" | "dinner"; timeKey: string } | null {
  const match = slotKey.match(/^(\d{4}-\d{2}-\d{2})#(lunch|dinner)#(\d{2}:\d{2})$/);
  if (!match) return null;
  return {
    dateKey: match[1],
    service: match[2] as "lunch" | "dinner",
    timeKey: match[3],
  };
}

/**
 * Compute effectiveOpen: isOpen === true && capacity > 0
 */
export function computeEffectiveOpen(isOpen: boolean, capacity: number): boolean {
  return isOpen === true && capacity > 0;
}

/**
 * Generate date range as array of dateKeys.
 */
function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return [];
  }

  const current = new Date(start);
  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// ═══════════════════════════════════════════════════════════════
// MUTATION: seedRange (owner only)
// Génère des slots pour une plage de dates.
// ═══════════════════════════════════════════════════════════════

export const seedRange = mutation({
  args: {
    dateStart: v.string(),
    dateEnd: v.string(),
  },
  handler: async (ctx, { dateStart, dateEnd }) => {
    // RBAC: owner uniquement
    await requireRole(ctx, "owner");

    // Validate date formats
    if (!DATE_KEY_REGEX.test(dateStart)) {
      throw Errors.INVALID_INPUT("dateStart", "Format YYYY-MM-DD requis");
    }
    if (!DATE_KEY_REGEX.test(dateEnd)) {
      throw Errors.INVALID_INPUT("dateEnd", "Format YYYY-MM-DD requis");
    }

    // Validate date range
    if (dateStart > dateEnd) {
      throw Errors.INVALID_INPUT("dateEnd", "dateEnd doit être >= dateStart");
    }

    // Get active restaurant
    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();

    if (!restaurant) {
      throw Errors.NO_ACTIVE_RESTAURANT();
    }

    const dates = generateDateRange(dateStart, dateEnd);
    const now = Date.now();
    let createdCount = 0;
    let skippedCount = 0;

    for (const dateKey of dates) {
      // Generate lunch slots
      for (const timeKey of DEFAULT_LUNCH_TIMES) {
        const slotKey = buildSlotKey(dateKey, "lunch", timeKey);

        // Check if slot already exists
        const existing = await ctx.db
          .query("slots")
          .withIndex("by_restaurant_slotKey", (q) =>
            q.eq("restaurantId", restaurant._id).eq("slotKey", slotKey)
          )
          .unique();

        if (existing) {
          skippedCount++;
          continue;
        }

        await ctx.db.insert("slots", {
          restaurantId: restaurant._id,
          dateKey,
          service: "lunch",
          timeKey,
          slotKey,
          isOpen: true,
          capacity: DEFAULT_CAPACITY,
          maxGroupSize: DEFAULT_MAX_GROUP_SIZE,
          largeTableAllowed: false,
          updatedAt: now,
        });
        createdCount++;
      }

      // Generate dinner slots
      for (const timeKey of DEFAULT_DINNER_TIMES) {
        const slotKey = buildSlotKey(dateKey, "dinner", timeKey);

        // Check if slot already exists
        const existing = await ctx.db
          .query("slots")
          .withIndex("by_restaurant_slotKey", (q) =>
            q.eq("restaurantId", restaurant._id).eq("slotKey", slotKey)
          )
          .unique();

        if (existing) {
          skippedCount++;
          continue;
        }

        await ctx.db.insert("slots", {
          restaurantId: restaurant._id,
          dateKey,
          service: "dinner",
          timeKey,
          slotKey,
          isOpen: true,
          capacity: DEFAULT_CAPACITY,
          maxGroupSize: DEFAULT_MAX_GROUP_SIZE,
          largeTableAllowed: false,
          updatedAt: now,
        });
        createdCount++;
      }
    }

    console.log("Slots seeded", { dateStart, dateEnd, createdCount, skippedCount });

    return { createdCount, skippedCount, dateCount: dates.length };
  },
});

// ═══════════════════════════════════════════════════════════════
// INTERNAL MUTATION: _seedRange (CLI tooling — no auth)
// Usage: npx convex run slots:_seedRange '{"dateStart":"2025-12-26","dateEnd":"2025-12-26"}'
// ═══════════════════════════════════════════════════════════════

export const _seedRange = internalMutation({
  args: {
    dateStart: v.string(),
    dateEnd: v.string(),
  },
  handler: async (ctx, { dateStart, dateEnd }) => {
    // Validate date formats
    if (!DATE_KEY_REGEX.test(dateStart)) {
      throw Errors.INVALID_INPUT("dateStart", "Format YYYY-MM-DD requis");
    }
    if (!DATE_KEY_REGEX.test(dateEnd)) {
      throw Errors.INVALID_INPUT("dateEnd", "Format YYYY-MM-DD requis");
    }

    // Validate date range
    if (dateStart > dateEnd) {
      throw Errors.INVALID_INPUT("dateEnd", "dateEnd doit être >= dateStart");
    }

    // Get active restaurant
    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();

    if (!restaurant) {
      throw Errors.NO_ACTIVE_RESTAURANT();
    }

    const dates = generateDateRange(dateStart, dateEnd);
    const now = Date.now();
    let createdCount = 0;
    let skippedCount = 0;

    for (const dateKey of dates) {
      // Generate lunch slots
      for (const timeKey of DEFAULT_LUNCH_TIMES) {
        const slotKey = buildSlotKey(dateKey, "lunch", timeKey);

        const existing = await ctx.db
          .query("slots")
          .withIndex("by_restaurant_slotKey", (q) =>
            q.eq("restaurantId", restaurant._id).eq("slotKey", slotKey)
          )
          .unique();

        if (existing) {
          skippedCount++;
          continue;
        }

        await ctx.db.insert("slots", {
          restaurantId: restaurant._id,
          dateKey,
          service: "lunch",
          timeKey,
          slotKey,
          isOpen: true,
          capacity: DEFAULT_CAPACITY,
          maxGroupSize: DEFAULT_MAX_GROUP_SIZE,
          largeTableAllowed: false,
          updatedAt: now,
        });
        createdCount++;
      }

      // Generate dinner slots
      for (const timeKey of DEFAULT_DINNER_TIMES) {
        const slotKey = buildSlotKey(dateKey, "dinner", timeKey);

        const existing = await ctx.db
          .query("slots")
          .withIndex("by_restaurant_slotKey", (q) =>
            q.eq("restaurantId", restaurant._id).eq("slotKey", slotKey)
          )
          .unique();

        if (existing) {
          skippedCount++;
          continue;
        }

        await ctx.db.insert("slots", {
          restaurantId: restaurant._id,
          dateKey,
          service: "dinner",
          timeKey,
          slotKey,
          isOpen: true,
          capacity: DEFAULT_CAPACITY,
          maxGroupSize: DEFAULT_MAX_GROUP_SIZE,
          largeTableAllowed: false,
          updatedAt: now,
        });
        createdCount++;
      }
    }

    console.log("Slots seeded (internal)", { dateStart, dateEnd, createdCount, skippedCount });

    return { createdCount, skippedCount, dateCount: dates.length };
  },
});

// ═══════════════════════════════════════════════════════════════
// QUERY: listByDateService (TOOLING INTERNE — hors contrat)
// ⚠️ Non contracté dans CONTRACTS.md
// Usage : backoffice admin pour visualiser slots
// ═══════════════════════════════════════════════════════════════

export const listByDateService = query({
  args: {
    dateKey: v.string(),
    service: v.union(v.literal("lunch"), v.literal("dinner")),
  },
  handler: async (ctx, { dateKey, service }) => {
    // RBAC: admin ou owner
    await requireRole(ctx, "admin");

    // Validate dateKey format
    if (!DATE_KEY_REGEX.test(dateKey)) {
      throw Errors.INVALID_INPUT("dateKey", "Format YYYY-MM-DD requis");
    }

    // Get active restaurant
    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();

    if (!restaurant) {
      return { slots: [] };
    }

    const slots = await ctx.db
      .query("slots")
      .withIndex("by_restaurant_date_service", (q) =>
        q.eq("restaurantId", restaurant._id).eq("dateKey", dateKey).eq("service", service)
      )
      .collect();

    // Sort by timeKey and add effectiveOpen
    const result = slots
      .map((slot) => ({
        ...slot,
        effectiveOpen: computeEffectiveOpen(slot.isOpen, slot.capacity),
      }))
      .sort((a, b) => a.timeKey.localeCompare(b.timeKey));

    return { slots: result };
  },
});

// ═══════════════════════════════════════════════════════════════
// MUTATION: closeRange (owner only — tooling fermeture plage)
// ⚠️ Tooling MVP — Non contracté dans CONTRACTS.md
// ═══════════════════════════════════════════════════════════════

export const closeRange = mutation({
  args: {
    dateStart: v.string(),
    dateEnd: v.string(),
    service: v.optional(v.union(v.literal("lunch"), v.literal("dinner"))),
  },
  handler: async (ctx, { dateStart, dateEnd, service }) => {
    // RBAC: owner uniquement
    await requireRole(ctx, "owner");

    // Validate date formats
    if (!DATE_KEY_REGEX.test(dateStart)) {
      throw Errors.INVALID_INPUT("dateStart", "Format YYYY-MM-DD requis");
    }
    if (!DATE_KEY_REGEX.test(dateEnd)) {
      throw Errors.INVALID_INPUT("dateEnd", "Format YYYY-MM-DD requis");
    }
    if (dateStart > dateEnd) {
      throw Errors.INVALID_INPUT("dateEnd", "dateEnd doit être >= dateStart");
    }

    // Get active restaurant
    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();

    if (!restaurant) {
      throw Errors.NO_ACTIVE_RESTAURANT();
    }

    const now = Date.now();
    let closedCount = 0;

    // Query slots in date range
    const allSlots = await ctx.db
      .query("slots")
      .withIndex("by_restaurant_date_service", (q) =>
        q.eq("restaurantId", restaurant._id)
      )
      .collect();

    // Filter by date range and optionally service
    const slotsToClose = allSlots.filter((slot) => {
      if (slot.dateKey < dateStart || slot.dateKey > dateEnd) return false;
      if (service && slot.service !== service) return false;
      return slot.isOpen === true; // Only close open slots
    });

    for (const slot of slotsToClose) {
      await ctx.db.patch(slot._id, { isOpen: false, updatedAt: now });
      closedCount++;
    }

    console.log("Slots closed", { dateStart, dateEnd, service, closedCount });

    return { closedCount };
  },
});

// ═══════════════════════════════════════════════════════════════
// MUTATION: openRange (owner only — tooling réouverture plage)
// ⚠️ Tooling MVP — Non contracté dans CONTRACTS.md
// ═══════════════════════════════════════════════════════════════

export const openRange = mutation({
  args: {
    dateStart: v.string(),
    dateEnd: v.string(),
    service: v.optional(v.union(v.literal("lunch"), v.literal("dinner"))),
  },
  handler: async (ctx, { dateStart, dateEnd, service }) => {
    // RBAC: owner uniquement
    await requireRole(ctx, "owner");

    // Validate date formats
    if (!DATE_KEY_REGEX.test(dateStart)) {
      throw Errors.INVALID_INPUT("dateStart", "Format YYYY-MM-DD requis");
    }
    if (!DATE_KEY_REGEX.test(dateEnd)) {
      throw Errors.INVALID_INPUT("dateEnd", "Format YYYY-MM-DD requis");
    }
    if (dateStart > dateEnd) {
      throw Errors.INVALID_INPUT("dateEnd", "dateEnd doit être >= dateStart");
    }

    // Get active restaurant
    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();

    if (!restaurant) {
      throw Errors.NO_ACTIVE_RESTAURANT();
    }

    const now = Date.now();
    let openedCount = 0;

    // Query slots in date range
    const allSlots = await ctx.db
      .query("slots")
      .withIndex("by_restaurant_date_service", (q) =>
        q.eq("restaurantId", restaurant._id)
      )
      .collect();

    // Filter by date range and optionally service
    const slotsToOpen = allSlots.filter((slot) => {
      if (slot.dateKey < dateStart || slot.dateKey > dateEnd) return false;
      if (service && slot.service !== service) return false;
      return slot.isOpen === false; // Only open closed slots
    });

    for (const slot of slotsToOpen) {
      await ctx.db.patch(slot._id, { isOpen: true, updatedAt: now });
      openedCount++;
    }

    console.log("Slots opened", { dateStart, dateEnd, service, openedCount });

    return { openedCount };
  },
});

// Export helpers for tests
export { TIME_KEY_REGEX, DATE_KEY_REGEX };
