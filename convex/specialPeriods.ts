/**
 * Special Periods management (§5.10, §5.11, §5.12, §6.5).
 * Handles holidays, closures, and events with slot overrides.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireRole } from "./lib/rbac";
import { Errors } from "./lib/errors";

// Types
type Service = "lunch" | "dinner";
type PeriodType = "holiday" | "closure" | "event";
type ApplyStatus = "open" | "modified" | "closed";

interface ApplyRules {
  status: ApplyStatus;
  services: Service[];
  activeDays: number[];
  overrideCapacity?: number;
  maxGroupSize?: number | null;
  largeTableAllowed?: boolean;
}

// Helpers

/**
 * Validate date format YYYY-MM-DD
 */
function isValidDateKey(dateKey: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey);
}

/**
 * Parse dateKey to Date object
 */
function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format Date to dateKey
 */
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get ISO weekday (1=Monday, 7=Sunday)
 */
function getISOWeekday(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

/**
 * Calculate days between two dates
 */
function daysBetween(startDate: string, endDate: string): number {
  const start = parseDateKey(startDate);
  const end = parseDateKey(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Generate all dates in range [startDate, endDate]
 */
function* dateRange(startDate: string, endDate: string): Generator<string> {
  const start = parseDateKey(startDate);
  const end = parseDateKey(endDate);
  const current = new Date(start);
  
  while (current <= end) {
    yield formatDateKey(current);
    current.setDate(current.getDate() + 1);
  }
}

/**
 * Validate applyRules
 */
function validateApplyRules(rules: ApplyRules): void {
  if (rules.services.length === 0) {
    throw Errors.INVALID_INPUT("services", "Au moins un service requis");
  }
  if (rules.activeDays.length === 0) {
    throw Errors.INVALID_INPUT("activeDays", "Au moins un jour requis");
  }
  for (const day of rules.activeDays) {
    if (day < 1 || day > 7) {
      throw Errors.INVALID_INPUT("activeDays", "Jours doivent être entre 1 et 7");
    }
  }
  // overrideCapacity/maxGroupSize/largeTableAllowed only allowed if status=modified
  if (rules.status !== "modified") {
    if (rules.overrideCapacity !== undefined) {
      throw Errors.INVALID_INPUT("overrideCapacity", "Seulement autorisé si status=modified");
    }
    if (rules.maxGroupSize !== undefined) {
      throw Errors.INVALID_INPUT("maxGroupSize", "Seulement autorisé si status=modified");
    }
    if (rules.largeTableAllowed !== undefined) {
      throw Errors.INVALID_INPUT("largeTableAllowed", "Seulement autorisé si status=modified");
    }
  }
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get active closure for today (public query for widget).
 * Returns the closure if today's date falls within a closure period.
 */
export const getActiveClosure = query({
  args: {},
  handler: async (ctx) => {
    // Get active restaurant
    const restaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(1);

    if (restaurants.length === 0) {
      return null;
    }

    const restaurantId = restaurants[0]._id;
    const today = formatDateKey(new Date());

    // Get all closures
    const closures = await ctx.db
      .query("specialPeriods")
      .withIndex("by_restaurant_type", (q) =>
        q.eq("restaurantId", restaurantId).eq("type", "closure")
      )
      .collect();

    // Find closure that includes today
    for (const closure of closures) {
      if (closure.startDate <= today && today <= closure.endDate) {
        // Calculate reopening date (endDate + 1 day)
        const endDate = parseDateKey(closure.endDate);
        endDate.setDate(endDate.getDate() + 1);
        const reopenDate = formatDateKey(endDate);

        return {
          startDate: closure.startDate,
          endDate: closure.endDate,
          reopenDate,
          name: closure.name,
        };
      }
    }

    return null;
  },
});

/**
 * List special periods with optional filters.
 * §6.5
 */
export const list = query({
  args: {
    type: v.optional(v.union(v.literal("holiday"), v.literal("closure"), v.literal("event"))),
    year: v.optional(v.number()),
  },
  handler: async (ctx, { type, year }) => {
    await requireRole(ctx, "admin");

    // Get active restaurant
    const restaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(1);

    if (restaurants.length === 0) {
      return [];
    }

    const restaurantId = restaurants[0]._id;

    let periods;
    if (type) {
      periods = await ctx.db
        .query("specialPeriods")
        .withIndex("by_restaurant_type", (q) => 
          q.eq("restaurantId", restaurantId).eq("type", type)
        )
        .collect();
    } else {
      periods = await ctx.db
        .query("specialPeriods")
        .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurantId))
        .collect();
    }

    // Filter by year if specified
    if (year) {
      const yearStr = String(year);
      periods = periods.filter((p) => 
        p.startDate.startsWith(yearStr) || p.endDate.startsWith(yearStr)
      );
    }

    return periods;
  },
});

/**
 * Get a single special period.
 * §6.5
 */
export const get = query({
  args: {
    periodId: v.id("specialPeriods"),
  },
  handler: async (ctx, { periodId }) => {
    await requireRole(ctx, "admin");

    const period = await ctx.db.get(periodId);
    if (!period) {
      throw Errors.NOT_FOUND("specialPeriods", periodId);
    }

    return period;
  },
});

/**
 * Preview impact of a period without creating it.
 * §6.5
 */
export const previewImpact = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    applyRules: v.object({
      status: v.union(v.literal("open"), v.literal("modified"), v.literal("closed")),
      services: v.array(v.union(v.literal("lunch"), v.literal("dinner"))),
      activeDays: v.array(v.number()),
    }),
  },
  handler: async (ctx, { startDate, endDate, applyRules }) => {
    await requireRole(ctx, "admin");

    // Validate dates
    if (!isValidDateKey(startDate)) {
      throw Errors.INVALID_INPUT("startDate", "Format YYYY-MM-DD requis");
    }
    if (!isValidDateKey(endDate)) {
      throw Errors.INVALID_INPUT("endDate", "Format YYYY-MM-DD requis");
    }
    if (endDate < startDate) {
      throw Errors.INVALID_INPUT("endDate", "Doit être >= startDate");
    }

    // Get active restaurant
    const restaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(1);

    if (restaurants.length === 0) {
      return { totalSlots: 0, affectedSlots: 0, byService: { lunch: 0, dinner: 0 }, byDate: [] };
    }

    const restaurantId = restaurants[0]._id;

    let totalSlots = 0;
    let affectedSlots = 0;
    const byService = { lunch: 0, dinner: 0 };
    const byDateMap = new Map<string, number>();

    // Iterate through date range
    for (const dateKey of dateRange(startDate, endDate)) {
      const date = parseDateKey(dateKey);
      const weekday = getISOWeekday(date);

      // Check if this day is active
      if (!applyRules.activeDays.includes(weekday)) {
        continue;
      }

      // For each service
      for (const service of applyRules.services) {
        // Get slots for this date+service
        const slots = await ctx.db
          .query("slots")
          .withIndex("by_restaurant_date_service", (q) =>
            q.eq("restaurantId", restaurantId).eq("dateKey", dateKey).eq("service", service)
          )
          .collect();

        totalSlots += slots.length;

        // If status is "open", no overrides created
        if (applyRules.status === "open") {
          continue;
        }

        // Count affected slots (those without manual override)
        for (const slot of slots) {
          const existingOverride = await ctx.db
            .query("slotOverrides")
            .withIndex("by_restaurant_slotKey", (q) =>
              q.eq("restaurantId", restaurantId).eq("slotKey", slot.slotKey)
            )
            .filter((q) => q.eq(q.field("origin"), "manual"))
            .first();

          if (!existingOverride) {
            affectedSlots++;
            byService[service]++;
            byDateMap.set(dateKey, (byDateMap.get(dateKey) || 0) + 1);
          }
        }
      }
    }

    const byDate = Array.from(byDateMap.entries())
      .map(([dateKey, count]) => ({ dateKey, count }))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

    return { totalSlots, affectedSlots, byService, byDate };
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a special period.
 * §6.5
 */
export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(v.literal("holiday"), v.literal("closure"), v.literal("event")),
    startDate: v.string(),
    endDate: v.string(),
    applyRules: v.object({
      status: v.union(v.literal("open"), v.literal("modified"), v.literal("closed")),
      services: v.array(v.union(v.literal("lunch"), v.literal("dinner"))),
      activeDays: v.array(v.number()),
      overrideCapacity: v.optional(v.number()),
      maxGroupSize: v.optional(v.union(v.number(), v.null())),
      largeTableAllowed: v.optional(v.boolean()),
      // Slots configuration for exceptional openings
      lunchSlots: v.optional(v.array(v.object({
        timeKey: v.string(),
        capacity: v.number(),
        isActive: v.boolean(),
        maxGroupSize: v.union(v.number(), v.null()),
      }))),
      dinnerSlots: v.optional(v.array(v.object({
        timeKey: v.string(),
        capacity: v.number(),
        isActive: v.boolean(),
        maxGroupSize: v.union(v.number(), v.null()),
      }))),
      lunchActiveDays: v.optional(v.array(v.number())),
      dinnerActiveDays: v.optional(v.array(v.number())),
    }),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    
    // Get user identity for createdBy
    const identity = await ctx.auth.getUserIdentity();
    const createdBy = identity?.subject ?? "unknown";

    // Validate name
    if (args.name.length < 2 || args.name.length > 50) {
      throw Errors.INVALID_INPUT("name", "Doit contenir 2-50 caractères");
    }

    // Validate dates
    if (!isValidDateKey(args.startDate)) {
      throw Errors.INVALID_INPUT("startDate", "Format YYYY-MM-DD requis");
    }
    if (!isValidDateKey(args.endDate)) {
      throw Errors.INVALID_INPUT("endDate", "Format YYYY-MM-DD requis");
    }
    if (args.endDate < args.startDate) {
      throw Errors.INVALID_INPUT("endDate", "Doit être >= startDate");
    }
    const days = daysBetween(args.startDate, args.endDate);
    if (days > 365) {
      throw Errors.INVALID_INPUT("endDate", "Max 365 jours");
    }

    // Validate applyRules
    validateApplyRules(args.applyRules as ApplyRules);

    // Get active restaurant
    const restaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(1);

    if (restaurants.length === 0) {
      throw Errors.NO_ACTIVE_RESTAURANT();
    }

    const restaurantId = restaurants[0]._id;

    // Check for same-type overlap
    const existingPeriods = await ctx.db
      .query("specialPeriods")
      .withIndex("by_restaurant_type", (q) =>
        q.eq("restaurantId", restaurantId).eq("type", args.type)
      )
      .collect();

    for (const existing of existingPeriods) {
      // Check overlap: !(endDate < existing.startDate || startDate > existing.endDate)
      const overlaps = !(args.endDate < existing.startDate || args.startDate > existing.endDate);
      if (overlaps) {
        throw Errors.SAME_TYPE_OVERLAP(existing._id, existing.name);
      }
    }

    const now = Date.now();

    // Calculate stats
    const totalDaysAffected = daysBetween(args.startDate, args.endDate) + 1;
    let totalCapacity = 0;
    
    if (args.applyRules.lunchSlots) {
      const lunchDays = args.applyRules.lunchActiveDays?.length ?? args.applyRules.activeDays.length;
      for (const slot of args.applyRules.lunchSlots) {
        if (slot.isActive) {
          totalCapacity += slot.capacity * lunchDays * totalDaysAffected / 7;
        }
      }
    }
    if (args.applyRules.dinnerSlots) {
      const dinnerDays = args.applyRules.dinnerActiveDays?.length ?? args.applyRules.activeDays.length;
      for (const slot of args.applyRules.dinnerSlots) {
        if (slot.isActive) {
          totalCapacity += slot.capacity * dinnerDays * totalDaysAffected / 7;
        }
      }
    }

    // Create period with initial stats
    const periodId = await ctx.db.insert("specialPeriods", {
      restaurantId,
      name: args.name,
      type: args.type,
      startDate: args.startDate,
      endDate: args.endDate,
      applyRules: args.applyRules,
      createdBy,
      createdAt: now,
      updatedAt: now,
      stats: {
        totalSlotsCreated: 0,
        totalSlotsModified: 0,
        totalDaysAffected,
        totalCapacity: Math.round(totalCapacity),
      },
    });

    // Generate overrides (if status != "open") and update stats
    if (args.applyRules.status !== "open") {
      const result = await generateOverrides(ctx, restaurantId, periodId, args.startDate, args.endDate, args.applyRules as ExtendedApplyRules);
      
      // Update stats with actual counts
      if (result) {
        await ctx.db.patch(periodId, {
          stats: {
            totalSlotsCreated: result.slotsCreated,
            totalSlotsModified: result.slotsModified,
            totalDaysAffected,
            totalCapacity: Math.round(totalCapacity),
          },
        });
      }
    }

    console.log("Special period created", { periodId, name: args.name, type: args.type });

    return { periodId };
  },
});

/**
 * Update a special period.
 * §6.5
 */
export const update = mutation({
  args: {
    periodId: v.id("specialPeriods"),
    name: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    applyRules: v.optional(v.object({
      status: v.optional(v.union(v.literal("open"), v.literal("modified"), v.literal("closed"))),
      services: v.optional(v.array(v.union(v.literal("lunch"), v.literal("dinner")))),
      activeDays: v.optional(v.array(v.number())),
      overrideCapacity: v.optional(v.number()),
      maxGroupSize: v.optional(v.union(v.number(), v.null())),
      largeTableAllowed: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const period = await ctx.db.get(args.periodId);
    if (!period) {
      throw Errors.NOT_FOUND("specialPeriods", args.periodId);
    }

    // Build updated values
    const name = args.name ?? period.name;
    const startDate = args.startDate ?? period.startDate;
    const endDate = args.endDate ?? period.endDate;
    const applyRules: ApplyRules = {
      status: args.applyRules?.status ?? period.applyRules.status,
      services: args.applyRules?.services ?? period.applyRules.services,
      activeDays: args.applyRules?.activeDays ?? period.applyRules.activeDays,
      overrideCapacity: args.applyRules?.overrideCapacity ?? period.applyRules.overrideCapacity,
      maxGroupSize: args.applyRules?.maxGroupSize ?? period.applyRules.maxGroupSize,
      largeTableAllowed: args.applyRules?.largeTableAllowed ?? period.applyRules.largeTableAllowed,
    };

    // Validate name
    if (name.length < 2 || name.length > 50) {
      throw Errors.INVALID_INPUT("name", "Doit contenir 2-50 caractères");
    }

    // Validate dates
    if (!isValidDateKey(startDate)) {
      throw Errors.INVALID_INPUT("startDate", "Format YYYY-MM-DD requis");
    }
    if (!isValidDateKey(endDate)) {
      throw Errors.INVALID_INPUT("endDate", "Format YYYY-MM-DD requis");
    }
    if (endDate < startDate) {
      throw Errors.INVALID_INPUT("endDate", "Doit être >= startDate");
    }
    const days = daysBetween(startDate, endDate);
    if (days > 365) {
      throw Errors.INVALID_INPUT("endDate", "Max 365 jours");
    }

    // Validate applyRules
    validateApplyRules(applyRules);

    // Check for same-type overlap (excluding self)
    const existingPeriods = await ctx.db
      .query("specialPeriods")
      .withIndex("by_restaurant_type", (q) =>
        q.eq("restaurantId", period.restaurantId).eq("type", period.type)
      )
      .collect();

    for (const existing of existingPeriods) {
      if (existing._id === args.periodId) continue;
      const overlaps = !(endDate < existing.startDate || startDate > existing.endDate);
      if (overlaps) {
        throw Errors.SAME_TYPE_OVERLAP(existing._id, existing.name);
      }
    }

    const now = Date.now();

    // Delete old period overrides
    await deleteOverrides(ctx, args.periodId);

    // Update period
    await ctx.db.patch(args.periodId, {
      name,
      startDate,
      endDate,
      applyRules,
      updatedAt: now,
    });

    // Regenerate overrides (if status != "open")
    if (applyRules.status !== "open") {
      await generateOverrides(ctx, period.restaurantId, args.periodId, startDate, endDate, applyRules);
    }

    console.log("Special period updated", { periodId: args.periodId, name });

    return { periodId: args.periodId };
  },
});

/**
 * Remove a special period.
 * §6.5
 * Restores previous configuration by:
 * - Deleting slots created by this period (for exceptional openings)
 * - Deleting overrides created by this period (for closures)
 */
export const remove = mutation({
  args: {
    periodId: v.id("specialPeriods"),
  },
  handler: async (ctx, { periodId }) => {
    await requireRole(ctx, "admin");

    const period = await ctx.db.get(periodId);
    if (!period) {
      throw Errors.NOT_FOUND("specialPeriods", periodId);
    }

    // Delete slots created by this period (for exceptional openings)
    const slotsCreatedByPeriod = await ctx.db
      .query("slots")
      .withIndex("by_createdByPeriodId", (q: any) => q.eq("createdByPeriodId", periodId))
      .collect();
    
    for (const slot of slotsCreatedByPeriod) {
      await ctx.db.delete(slot._id);
    }

    // Delete overrides created by this period (for closures)
    await deleteOverrides(ctx, periodId);

    // Delete period
    await ctx.db.delete(periodId);

    console.log("Special period removed", { 
      periodId, 
      name: period.name, 
      slotsDeleted: slotsCreatedByPeriod.length 
    });

    return { ok: true };
  },
});

// ============================================================================
// Internal helpers
// ============================================================================

// Extended ApplyRules with slots configuration
interface ExtendedApplyRules extends ApplyRules {
  lunchSlots?: Array<{ timeKey: string; capacity: number; isActive: boolean; maxGroupSize: number | null }>;
  dinnerSlots?: Array<{ timeKey: string; capacity: number; isActive: boolean; maxGroupSize: number | null }>;
  lunchActiveDays?: number[];
  dinnerActiveDays?: number[];
}

interface GenerateOverridesResult {
  slotsCreated: number;
  slotsModified: number;
}

/**
 * Generate slot overrides for a period.
 * §5.12 materialization rules.
 * For exceptional openings (status=modified with slots), creates new slots.
 */
async function generateOverrides(
  ctx: any,
  restaurantId: Id<"restaurants">,
  periodId: Id<"specialPeriods">,
  startDate: string,
  endDate: string,
  applyRules: ExtendedApplyRules
): Promise<GenerateOverridesResult> {
  const now = Date.now();
  let slotsCreated = 0;
  let slotsModified = 0;

  // Check if this is an exceptional opening with custom slots
  const hasCustomSlots = applyRules.lunchSlots || applyRules.dinnerSlots;

  if (applyRules.status === "modified" && hasCustomSlots) {
    // Exceptional opening: create slots for the period
    const result = await generateExceptionalOpeningSlots(ctx, restaurantId, periodId, startDate, endDate, applyRules);
    return result;
  }

  // Build patch based on status (for closures or simple modifications)
  const patch: {
    isOpen?: boolean;
    capacity?: number;
    maxGroupSize?: number | null;
    largeTableAllowed?: boolean;
  } = {};

  if (applyRules.status === "closed") {
    patch.isOpen = false;
  } else if (applyRules.status === "modified") {
    if (applyRules.overrideCapacity !== undefined) {
      patch.capacity = applyRules.overrideCapacity;
    }
    if (applyRules.maxGroupSize !== undefined) {
      patch.maxGroupSize = applyRules.maxGroupSize;
    }
    if (applyRules.largeTableAllowed !== undefined) {
      patch.largeTableAllowed = applyRules.largeTableAllowed;
    }
  }

  // Iterate through date range
  for (const dateKey of dateRange(startDate, endDate)) {
    const date = parseDateKey(dateKey);
    const weekday = getISOWeekday(date);

    // Check if this day is active
    if (!applyRules.activeDays.includes(weekday)) {
      continue;
    }

    // For each service
    for (const service of applyRules.services) {
      // Get slots for this date+service
      const slots = await ctx.db
        .query("slots")
        .withIndex("by_restaurant_date_service", (q: any) =>
          q.eq("restaurantId", restaurantId).eq("dateKey", dateKey).eq("service", service)
        )
        .collect();

      // For each slot
      for (const slot of slots) {
        // Check if manual override exists
        const existingManual = await ctx.db
          .query("slotOverrides")
          .withIndex("by_restaurant_slotKey", (q: any) =>
            q.eq("restaurantId", restaurantId).eq("slotKey", slot.slotKey)
          )
          .filter((q: any) => q.eq(q.field("origin"), "manual"))
          .first();

        if (existingManual) {
          // Don't touch manual overrides
          continue;
        }

        // Check if period override already exists for this period
        const existingPeriod = await ctx.db
          .query("slotOverrides")
          .withIndex("by_restaurant_slotKey", (q: any) =>
            q.eq("restaurantId", restaurantId).eq("slotKey", slot.slotKey)
          )
          .filter((q: any) => 
            q.and(
              q.eq(q.field("origin"), "period"),
              q.eq(q.field("specialPeriodId"), periodId)
            )
          )
          .first();

        if (existingPeriod) {
          // Update existing
          await ctx.db.patch(existingPeriod._id, {
            patch,
            updatedAt: now,
          });
          slotsModified++;
        } else {
          // Create new
          await ctx.db.insert("slotOverrides", {
            restaurantId,
            slotKey: slot.slotKey,
            origin: "period",
            patch,
            specialPeriodId: periodId,
            createdAt: now,
            updatedAt: now,
          });
          slotsModified++;
        }
      }
    }
  }

  return { slotsCreated, slotsModified };
}

/**
 * Generate slots for exceptional openings.
 * Creates new slots for dates that don't have them.
 */
async function generateExceptionalOpeningSlots(
  ctx: any,
  restaurantId: Id<"restaurants">,
  periodId: Id<"specialPeriods">,
  startDate: string,
  endDate: string,
  applyRules: ExtendedApplyRules
): Promise<GenerateOverridesResult> {
  const now = Date.now();
  let slotsCreated = 0;
  let slotsModified = 0;

  // Iterate through date range
  for (const dateKey of dateRange(startDate, endDate)) {
    const date = parseDateKey(dateKey);
    const weekday = getISOWeekday(date);

    // Process lunch slots
    if (applyRules.lunchSlots && applyRules.lunchSlots.length > 0) {
      const lunchActiveDays = applyRules.lunchActiveDays ?? applyRules.activeDays;
      if (lunchActiveDays.includes(weekday)) {
        for (const slotConfig of applyRules.lunchSlots) {
          if (!slotConfig.isActive) continue;
          
          const slotKey = `${dateKey}#lunch#${slotConfig.timeKey}`;
          
          // Check if slot already exists
          const existingSlot = await ctx.db
            .query("slots")
            .withIndex("by_restaurant_slotKey", (q: any) =>
              q.eq("restaurantId", restaurantId).eq("slotKey", slotKey)
            )
            .first();

          if (!existingSlot) {
            // Create new slot - mark it as created by this period
            await ctx.db.insert("slots", {
              restaurantId,
              dateKey,
              service: "lunch" as const,
              timeKey: slotConfig.timeKey,
              slotKey,
              isOpen: true,
              capacity: slotConfig.capacity,
              maxGroupSize: slotConfig.maxGroupSize,
              largeTableAllowed: false,
              updatedAt: now,
              createdByPeriodId: periodId,
            });
            slotsCreated++;
          } else {
            // Update existing slot to be open
            await ctx.db.patch(existingSlot._id, {
              isOpen: true,
              capacity: slotConfig.capacity,
              maxGroupSize: slotConfig.maxGroupSize,
              updatedAt: now,
            });
            slotsModified++;
          }
        }
      }
    }

    // Process dinner slots
    if (applyRules.dinnerSlots && applyRules.dinnerSlots.length > 0) {
      const dinnerActiveDays = applyRules.dinnerActiveDays ?? applyRules.activeDays;
      if (dinnerActiveDays.includes(weekday)) {
        for (const slotConfig of applyRules.dinnerSlots) {
          if (!slotConfig.isActive) continue;
          
          const slotKey = `${dateKey}#dinner#${slotConfig.timeKey}`;
          
          // Check if slot already exists
          const existingSlot = await ctx.db
            .query("slots")
            .withIndex("by_restaurant_slotKey", (q: any) =>
              q.eq("restaurantId", restaurantId).eq("slotKey", slotKey)
            )
            .first();

          if (!existingSlot) {
            // Create new slot - mark it as created by this period
            await ctx.db.insert("slots", {
              restaurantId,
              dateKey,
              service: "dinner" as const,
              timeKey: slotConfig.timeKey,
              slotKey,
              isOpen: true,
              capacity: slotConfig.capacity,
              maxGroupSize: slotConfig.maxGroupSize,
              largeTableAllowed: false,
              updatedAt: now,
              createdByPeriodId: periodId,
            });
            slotsCreated++;
          } else {
            // Update existing slot to be open
            await ctx.db.patch(existingSlot._id, {
              isOpen: true,
              capacity: slotConfig.capacity,
              maxGroupSize: slotConfig.maxGroupSize,
              updatedAt: now,
            });
            slotsModified++;
          }
        }
      }
    }
  }

  console.log("Exceptional opening slots generated", { periodId, startDate, endDate, slotsCreated, slotsModified });
  return { slotsCreated, slotsModified };
}

/**
 * Delete all overrides for a period.
 */
async function deleteOverrides(
  ctx: any,
  periodId: Id<"specialPeriods">
): Promise<void> {
  const overrides = await ctx.db
    .query("slotOverrides")
    .withIndex("by_specialPeriodId", (q: any) => q.eq("specialPeriodId", periodId))
    .collect();

  for (const override of overrides) {
    await ctx.db.delete(override._id);
  }
}
