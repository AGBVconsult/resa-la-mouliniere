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

    // Fetch slotOverrides (same pattern as listByDate)
    const slotKeysSet = new Set(slots.map((s) => s.slotKey));
    const [manualOverrides, periodOverrides] = await Promise.all([
      ctx.db
        .query("slotOverrides")
        .withIndex("by_restaurant_origin", (q) => q.eq("restaurantId", restaurant._id).eq("origin", "manual"))
        .collect(),
      ctx.db
        .query("slotOverrides")
        .withIndex("by_restaurant_origin", (q) => q.eq("restaurantId", restaurant._id).eq("origin", "period"))
        .collect(),
    ]);

    // Build overrides map with priority: MANUAL > PERIOD
    const overridesMap = new Map<string, { isOpen?: boolean; capacity?: number }>();
    for (const override of periodOverrides) {
      if (slotKeysSet.has(override.slotKey)) {
        overridesMap.set(override.slotKey, override.patch);
      }
    }
    for (const override of manualOverrides) {
      if (slotKeysSet.has(override.slotKey)) {
        overridesMap.set(override.slotKey, override.patch);
      }
    }

    // Sort by timeKey and add effectiveOpen with overrides applied
    const result = slots
      .map((slot) => {
        const override = overridesMap.get(slot.slotKey);
        const effectiveIsOpen = override?.isOpen ?? slot.isOpen;
        const effectiveCapacity = override?.capacity ?? slot.capacity;
        return {
          ...slot,
          isOpen: effectiveIsOpen,
          capacity: effectiveCapacity,
          effectiveOpen: computeEffectiveOpen(effectiveIsOpen, effectiveCapacity),
        };
      })
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
      // Create/update slotOverride manual instead of patching slot directly
      const existingOverride = await ctx.db
        .query("slotOverrides")
        .withIndex("by_restaurant_slotKey", (q) =>
          q.eq("restaurantId", restaurant._id).eq("slotKey", slot.slotKey)
        )
        .filter((q) => q.eq(q.field("origin"), "manual"))
        .first();

      if (existingOverride) {
        await ctx.db.patch(existingOverride._id, {
          patch: { ...existingOverride.patch, isOpen: false },
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("slotOverrides", {
          restaurantId: restaurant._id,
          slotKey: slot.slotKey,
          origin: "manual",
          patch: { isOpen: false },
          createdAt: now,
          updatedAt: now,
        });
      }
      closedCount++;
    }

    console.log("Slots closed (via slotOverrides manual)", { dateStart, dateEnd, service, closedCount });

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
      // Create/update slotOverride manual instead of patching slot directly
      const existingOverride = await ctx.db
        .query("slotOverrides")
        .withIndex("by_restaurant_slotKey", (q) =>
          q.eq("restaurantId", restaurant._id).eq("slotKey", slot.slotKey)
        )
        .filter((q) => q.eq(q.field("origin"), "manual"))
        .first();

      if (existingOverride) {
        await ctx.db.patch(existingOverride._id, {
          patch: { ...existingOverride.patch, isOpen: true },
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("slotOverrides", {
          restaurantId: restaurant._id,
          slotKey: slot.slotKey,
          origin: "manual",
          patch: { isOpen: true },
          createdAt: now,
          updatedAt: now,
        });
      }
      openedCount++;
    }

    console.log("Slots opened (via slotOverrides manual)", { dateStart, dateEnd, service, openedCount });

    return { openedCount };
  },
});

// ═══════════════════════════════════════════════════════════════
// QUERY: listByDate (admin — get all slots for a date)
// Pour le Modal Day Override
// ═══════════════════════════════════════════════════════════════

export const listByDate = query({
  args: {
    dateKey: v.string(),
  },
  handler: async (ctx, { dateKey }) => {
    await requireRole(ctx, "admin");

    if (!DATE_KEY_REGEX.test(dateKey)) {
      throw Errors.INVALID_INPUT("dateKey", "Format YYYY-MM-DD requis");
    }

    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();

    if (!restaurant) {
      return { lunch: [], dinner: [] };
    }

    const allSlots = await ctx.db
      .query("slots")
      .withIndex("by_restaurant_date_service", (q) =>
        q.eq("restaurantId", restaurant._id).eq("dateKey", dateKey)
      )
      .collect();

    // Fetch slotOverrides (manual and period) to apply closures/modifications
    const slotKeys = new Set(allSlots.map((s) => s.slotKey));
    const [manualOverrides, periodOverrides] = await Promise.all([
      ctx.db
        .query("slotOverrides")
        .withIndex("by_restaurant_origin", (q) => q.eq("restaurantId", restaurant._id).eq("origin", "manual"))
        .collect(),
      ctx.db
        .query("slotOverrides")
        .withIndex("by_restaurant_origin", (q) => q.eq("restaurantId", restaurant._id).eq("origin", "period"))
        .collect(),
    ]);

    // Build overrides map with priority: MANUAL > PERIOD
    const overridesMap = new Map<string, { isOpen?: boolean; capacity?: number }>();
    for (const override of periodOverrides) {
      if (slotKeys.has(override.slotKey)) {
        overridesMap.set(override.slotKey, override.patch);
      }
    }
    for (const override of manualOverrides) {
      if (slotKeys.has(override.slotKey)) {
        overridesMap.set(override.slotKey, override.patch);
      }
    }

    // Apply overrides to slots
    const effectiveSlots = allSlots.map((slot) => {
      const override = overridesMap.get(slot.slotKey);
      if (!override) return slot;
      return {
        ...slot,
        isOpen: override.isOpen ?? slot.isOpen,
        capacity: override.capacity ?? slot.capacity,
      };
    });

    const lunch = effectiveSlots
      .filter((s) => s.service === "lunch")
      .map((s) => ({ ...s, effectiveOpen: computeEffectiveOpen(s.isOpen, s.capacity) }))
      .sort((a, b) => a.timeKey.localeCompare(b.timeKey));

    const dinner = effectiveSlots
      .filter((s) => s.service === "dinner")
      .map((s) => ({ ...s, effectiveOpen: computeEffectiveOpen(s.isOpen, s.capacity) }))
      .sort((a, b) => a.timeKey.localeCompare(b.timeKey));

    return { lunch, dinner };
  },
});

// ═══════════════════════════════════════════════════════════════
// MUTATION: updateSlot (admin — update single slot)
// Pour le Modal Day Override
// ═══════════════════════════════════════════════════════════════

export const updateSlot = mutation({
  args: {
    slotId: v.id("slots"),
    isOpen: v.optional(v.boolean()),
    capacity: v.optional(v.number()),
  },
  handler: async (ctx, { slotId, isOpen, capacity }) => {
    await requireRole(ctx, "admin");

    const slot = await ctx.db.get(slotId);
    if (!slot) {
      throw Errors.SLOT_NOT_FOUND(slotId);
    }

    const now = Date.now();

    // Build the override patch
    const overridePatch: { isOpen?: boolean; capacity?: number } = {};
    if (isOpen !== undefined) {
      overridePatch.isOpen = isOpen;
    }
    if (capacity !== undefined) {
      if (capacity < 0) {
        throw Errors.INVALID_INPUT("capacity", "Doit être >= 0");
      }
      overridePatch.capacity = capacity;
    }

    if (Object.keys(overridePatch).length === 0) {
      return { ok: true };
    }

    // Check if a manual override already exists for this slotKey
    const existingManual = await ctx.db
      .query("slotOverrides")
      .withIndex("by_restaurant_slotKey", (q) =>
        q.eq("restaurantId", slot.restaurantId).eq("slotKey", slot.slotKey)
      )
      .filter((q) => q.eq(q.field("origin"), "manual"))
      .first();

    if (existingManual) {
      const mergedPatch = { ...existingManual.patch, ...overridePatch };
      await ctx.db.patch(existingManual._id, {
        patch: mergedPatch,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("slotOverrides", {
        restaurantId: slot.restaurantId,
        slotKey: slot.slotKey,
        origin: "manual",
        patch: overridePatch,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { ok: true };
  },
});

// ═══════════════════════════════════════════════════════════════
// MUTATION: batchUpdateSlots (admin — update multiple slots)
// Pour le Modal Day Override - sauvegarde en batch
// ═══════════════════════════════════════════════════════════════

export const batchUpdateSlots = mutation({
  args: {
    updates: v.array(
      v.object({
        slotId: v.id("slots"),
        isOpen: v.optional(v.boolean()),
        capacity: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, { updates }) => {
    await requireRole(ctx, "admin");

    const now = Date.now();
    let updatedCount = 0;

    for (const update of updates) {
      const slot = await ctx.db.get(update.slotId);
      if (!slot) continue;

      // Build the override patch
      const overridePatch: { isOpen?: boolean; capacity?: number } = {};
      if (update.isOpen !== undefined) {
        overridePatch.isOpen = update.isOpen;
      }
      if (update.capacity !== undefined && update.capacity >= 0) {
        overridePatch.capacity = update.capacity;
      }

      if (Object.keys(overridePatch).length === 0) continue;

      // Check if a manual override already exists for this slotKey
      const existingManual = await ctx.db
        .query("slotOverrides")
        .withIndex("by_restaurant_slotKey", (q) =>
          q.eq("restaurantId", slot.restaurantId).eq("slotKey", slot.slotKey)
        )
        .filter((q) => q.eq(q.field("origin"), "manual"))
        .first();

      if (existingManual) {
        // Merge with existing manual override patch
        const mergedPatch = { ...existingManual.patch, ...overridePatch };
        await ctx.db.patch(existingManual._id, {
          patch: mergedPatch,
          updatedAt: now,
        });
      } else {
        // Create new manual override
        await ctx.db.insert("slotOverrides", {
          restaurantId: slot.restaurantId,
          slotKey: slot.slotKey,
          origin: "manual",
          patch: overridePatch,
          createdAt: now,
          updatedAt: now,
        });
      }

      updatedCount++;
    }

    console.log("Batch slots updated (via slotOverrides manual)", { updatedCount });

    return { updatedCount };
  },
});

// ═══════════════════════════════════════════════════════════════
// MUTATION: toggleServiceSlots (admin — toggle all slots for a service)
// Pour le Modal Day Override - toggle service entier
// ═══════════════════════════════════════════════════════════════

export const toggleServiceSlots = mutation({
  args: {
    dateKey: v.string(),
    service: v.union(v.literal("lunch"), v.literal("dinner")),
    isOpen: v.boolean(),
  },
  handler: async (ctx, { dateKey, service, isOpen }) => {
    await requireRole(ctx, "admin");

    if (!DATE_KEY_REGEX.test(dateKey)) {
      throw Errors.INVALID_INPUT("dateKey", "Format YYYY-MM-DD requis");
    }

    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();

    if (!restaurant) {
      throw Errors.NO_ACTIVE_RESTAURANT();
    }

    const slots = await ctx.db
      .query("slots")
      .withIndex("by_restaurant_date_service", (q) =>
        q.eq("restaurantId", restaurant._id).eq("dateKey", dateKey).eq("service", service)
      )
      .collect();

    const now = Date.now();
    let updatedCount = 0;

    for (const slot of slots) {
      // Create/update slotOverride manual instead of patching slot directly
      const existingOverride = await ctx.db
        .query("slotOverrides")
        .withIndex("by_restaurant_slotKey", (q) =>
          q.eq("restaurantId", restaurant._id).eq("slotKey", slot.slotKey)
        )
        .filter((q) => q.eq(q.field("origin"), "manual"))
        .first();

      if (existingOverride) {
        await ctx.db.patch(existingOverride._id, {
          patch: { ...existingOverride.patch, isOpen },
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("slotOverrides", {
          restaurantId: restaurant._id,
          slotKey: slot.slotKey,
          origin: "manual",
          patch: { isOpen },
          createdAt: now,
          updatedAt: now,
        });
      }
      updatedCount++;
    }

    console.log("Service slots toggled (via slotOverrides manual)", { dateKey, service, isOpen, updatedCount });

    return { updatedCount };
  },
});

// ═══════════════════════════════════════════════════════════════
// MUTATION: toggleDaySlots (admin — toggle all slots for a day)
// Pour le Modal Day Override - toggle jour complet
// ═══════════════════════════════════════════════════════════════

export const toggleDaySlots = mutation({
  args: {
    dateKey: v.string(),
    isOpen: v.boolean(),
  },
  handler: async (ctx, { dateKey, isOpen }) => {
    await requireRole(ctx, "admin");

    if (!DATE_KEY_REGEX.test(dateKey)) {
      throw Errors.INVALID_INPUT("dateKey", "Format YYYY-MM-DD requis");
    }

    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();

    if (!restaurant) {
      throw Errors.NO_ACTIVE_RESTAURANT();
    }

    const slots = await ctx.db
      .query("slots")
      .withIndex("by_restaurant_date_service", (q) =>
        q.eq("restaurantId", restaurant._id).eq("dateKey", dateKey)
      )
      .collect();

    const now = Date.now();
    let updatedCount = 0;

    for (const slot of slots) {
      // Create/update slotOverride manual instead of patching slot directly
      const existingOverride = await ctx.db
        .query("slotOverrides")
        .withIndex("by_restaurant_slotKey", (q) =>
          q.eq("restaurantId", restaurant._id).eq("slotKey", slot.slotKey)
        )
        .filter((q) => q.eq(q.field("origin"), "manual"))
        .first();

      if (existingOverride) {
        await ctx.db.patch(existingOverride._id, {
          patch: { ...existingOverride.patch, isOpen },
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("slotOverrides", {
          restaurantId: restaurant._id,
          slotKey: slot.slotKey,
          origin: "manual",
          patch: { isOpen },
          createdAt: now,
          updatedAt: now,
        });
      }
      updatedCount++;
    }

    console.log("Day slots toggled (via slotOverrides manual)", { dateKey, isOpen, updatedCount });

    return { updatedCount };
  },
});

// ═══════════════════════════════════════════════════════════════
// MUTATION: addSlot (admin — add a temporary slot for a specific day)
// Pour le Modal Day Override - bouton (+) Ajouter Créneau
// ═══════════════════════════════════════════════════════════════

export const addSlot = mutation({
  args: {
    dateKey: v.string(),
    service: v.union(v.literal("lunch"), v.literal("dinner")),
    timeKey: v.string(),
    capacity: v.optional(v.number()),
  },
  handler: async (ctx, { dateKey, service, timeKey, capacity }) => {
    await requireRole(ctx, "admin");

    if (!DATE_KEY_REGEX.test(dateKey)) {
      throw Errors.INVALID_INPUT("dateKey", "Format YYYY-MM-DD requis");
    }
    if (!TIME_KEY_REGEX.test(timeKey)) {
      throw Errors.INVALID_INPUT("timeKey", "Format HH:MM requis");
    }

    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();

    if (!restaurant) {
      throw Errors.NO_ACTIVE_RESTAURANT();
    }

    const slotKey = buildSlotKey(dateKey, service, timeKey);

    // Check if slot already exists
    const existing = await ctx.db
      .query("slots")
      .withIndex("by_restaurant_slotKey", (q) =>
        q.eq("restaurantId", restaurant._id).eq("slotKey", slotKey)
      )
      .unique();

    if (existing) {
      throw Errors.INVALID_INPUT("timeKey", "Ce créneau existe déjà");
    }

    const now = Date.now();
    const slotId = await ctx.db.insert("slots", {
      restaurantId: restaurant._id,
      dateKey,
      service,
      timeKey,
      slotKey,
      isOpen: true,
      capacity: capacity ?? DEFAULT_CAPACITY,
      maxGroupSize: DEFAULT_MAX_GROUP_SIZE,
      largeTableAllowed: false,
      updatedAt: now,
    });

    console.log("Slot added", { slotKey, capacity: capacity ?? DEFAULT_CAPACITY });

    return { slotId, slotKey };
  },
});

// Export helpers for tests
export { TIME_KEY_REGEX, DATE_KEY_REGEX };
