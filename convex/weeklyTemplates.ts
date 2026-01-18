/**
 * Weekly Templates management (§5.13, §6.6).
 * Templates for automatic slot generation.
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireRole } from "./lib/rbac";
import { Errors } from "./lib/errors";
import { makeSlotKey } from "../spec/contracts.generated";

// Types
type Service = "lunch" | "dinner";

interface TemplateSlot {
  timeKey: string;
  capacity: number;
  isActive: boolean;
  largeTableAllowed: boolean;
  maxGroupSize: number | null;
}

// Default slots
const DEFAULT_LUNCH_SLOTS: TemplateSlot[] = [
  { timeKey: "12:00", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
  { timeKey: "12:30", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
  { timeKey: "13:00", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
];

const DEFAULT_DINNER_SLOTS: TemplateSlot[] = [
  { timeKey: "18:00", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
  { timeKey: "18:30", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
  { timeKey: "19:00", capacity: 8, isActive: true, largeTableAllowed: false, maxGroupSize: 15 },
];

// Helpers

/**
 * Validate timeKey format HH:MM
 */
function isValidTimeKey(timeKey: string): boolean {
  return /^\d{2}:\d{2}$/.test(timeKey);
}

/**
 * Validate dayOfWeek 1-7
 */
function isValidDayOfWeek(day: number): boolean {
  return Number.isInteger(day) && day >= 1 && day <= 7;
}

/**
 * Validate capacity 1-50
 */
function isValidCapacity(capacity: number): boolean {
  return Number.isInteger(capacity) && capacity >= 1 && capacity <= 50;
}

/**
 * Sort slots by timeKey
 */
function sortSlots(slots: TemplateSlot[]): TemplateSlot[] {
  return [...slots].sort((a, b) => a.timeKey.localeCompare(b.timeKey));
}

/**
 * Check for duplicate timeKeys
 */
function hasDuplicateTimeKeys(slots: TemplateSlot[]): boolean {
  const timeKeys = new Set<string>();
  for (const slot of slots) {
    if (timeKeys.has(slot.timeKey)) {
      return true;
    }
    timeKeys.add(slot.timeKey);
  }
  return false;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * List all weekly templates for the restaurant.
 * §6.6
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const restaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(1);

    if (restaurants.length === 0) {
      return [];
    }

    const restaurantId = restaurants[0]._id;

    const templates = await ctx.db
      .query("weeklyTemplates")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurantId))
      .collect();

    return templates;
  },
});

/**
 * Get a specific weekly template.
 * §6.6
 */
export const get = query({
  args: {
    dayOfWeek: v.number(),
    service: v.union(v.literal("lunch"), v.literal("dinner")),
  },
  handler: async (ctx, { dayOfWeek, service }) => {
    await requireRole(ctx, "admin");

    if (!isValidDayOfWeek(dayOfWeek)) {
      throw Errors.INVALID_INPUT("dayOfWeek", "Doit être entre 1 et 7");
    }

    const restaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(1);

    if (restaurants.length === 0) {
      return null;
    }

    const restaurantId = restaurants[0]._id;

    const template = await ctx.db
      .query("weeklyTemplates")
      .withIndex("by_restaurant_day_service", (q) =>
        q.eq("restaurantId", restaurantId).eq("dayOfWeek", dayOfWeek).eq("service", service)
      )
      .unique();

    return template;
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Upsert a weekly template.
 * §6.6
 */
export const upsert = mutation({
  args: {
    dayOfWeek: v.number(),
    service: v.union(v.literal("lunch"), v.literal("dinner")),
    isOpen: v.boolean(),
    slots: v.array(v.object({
      timeKey: v.string(),
      capacity: v.number(),
      isActive: v.boolean(),
      largeTableAllowed: v.boolean(),
      maxGroupSize: v.union(v.number(), v.null()),
    })),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    // Get user identity
    const identity = await ctx.auth.getUserIdentity();
    const updatedBy = identity?.subject ?? "unknown";

    // Validate dayOfWeek
    if (!isValidDayOfWeek(args.dayOfWeek)) {
      throw Errors.INVALID_INPUT("dayOfWeek", "Doit être entre 1 et 7");
    }

    // Validate slots
    for (const slot of args.slots) {
      if (!isValidTimeKey(slot.timeKey)) {
        throw Errors.INVALID_INPUT("timeKey", `Format HH:MM requis: ${slot.timeKey}`);
      }
      if (!isValidCapacity(slot.capacity)) {
        throw Errors.INVALID_INPUT("capacity", `Doit être entre 1 et 50: ${slot.capacity}`);
      }
    }

    // Check for duplicate timeKeys
    if (hasDuplicateTimeKeys(args.slots)) {
      throw Errors.INVALID_INPUT("slots", "Doublons de timeKey interdits");
    }

    // Get active restaurant
    const restaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(1);

    if (restaurants.length === 0) {
      throw Errors.NO_ACTIVE_RESTAURANT();
    }

    const restaurantId = restaurants[0]._id;
    const now = Date.now();

    // Sort slots by timeKey
    const sortedSlots = sortSlots(args.slots);

    // Check if template exists
    const existing = await ctx.db
      .query("weeklyTemplates")
      .withIndex("by_restaurant_day_service", (q) =>
        q.eq("restaurantId", restaurantId).eq("dayOfWeek", args.dayOfWeek).eq("service", args.service)
      )
      .unique();

    let templateId: Id<"weeklyTemplates">;

    if (existing) {
      // Update
      await ctx.db.patch(existing._id, {
        isOpen: args.isOpen,
        slots: sortedSlots,
        updatedAt: now,
        updatedBy,
      });
      templateId = existing._id;
    } else {
      // Create
      templateId = await ctx.db.insert("weeklyTemplates", {
        restaurantId,
        dayOfWeek: args.dayOfWeek,
        service: args.service,
        isOpen: args.isOpen,
        slots: sortedSlots,
        updatedAt: now,
        updatedBy,
      });
    }

    console.log("Weekly template upserted", { templateId, dayOfWeek: args.dayOfWeek, service: args.service });

    return { templateId };
  },
});

/**
 * Add a slot to a template.
 * §6.6
 */
export const addSlot = mutation({
  args: {
    dayOfWeek: v.number(),
    service: v.union(v.literal("lunch"), v.literal("dinner")),
    slot: v.object({
      timeKey: v.string(),
      capacity: v.number(),
      isActive: v.optional(v.boolean()),
      largeTableAllowed: v.optional(v.boolean()),
      maxGroupSize: v.optional(v.union(v.number(), v.null())),
    }),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const identity = await ctx.auth.getUserIdentity();
    const updatedBy = identity?.subject ?? "unknown";

    // Validate
    if (!isValidDayOfWeek(args.dayOfWeek)) {
      throw Errors.INVALID_INPUT("dayOfWeek", "Doit être entre 1 et 7");
    }
    if (!isValidTimeKey(args.slot.timeKey)) {
      throw Errors.INVALID_INPUT("timeKey", "Format HH:MM requis");
    }
    if (!isValidCapacity(args.slot.capacity)) {
      throw Errors.INVALID_INPUT("capacity", "Doit être entre 1 et 50");
    }

    // Get restaurant
    const restaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(1);

    if (restaurants.length === 0) {
      throw Errors.NO_ACTIVE_RESTAURANT();
    }

    const restaurantId = restaurants[0]._id;
    const now = Date.now();

    // Get or create template
    let template = await ctx.db
      .query("weeklyTemplates")
      .withIndex("by_restaurant_day_service", (q) =>
        q.eq("restaurantId", restaurantId).eq("dayOfWeek", args.dayOfWeek).eq("service", args.service)
      )
      .unique();

    const newSlot: TemplateSlot = {
      timeKey: args.slot.timeKey,
      capacity: args.slot.capacity,
      isActive: args.slot.isActive ?? true,
      largeTableAllowed: args.slot.largeTableAllowed ?? false,
      maxGroupSize: args.slot.maxGroupSize ?? 15,
    };

    let templateId: Id<"weeklyTemplates">;

    if (template) {
      // Check if timeKey already exists
      if (template.slots.some((s) => s.timeKey === args.slot.timeKey)) {
        throw Errors.INVALID_INPUT("timeKey", "Ce créneau existe déjà");
      }

      // Add and sort
      const newSlots = sortSlots([...template.slots, newSlot]);
      await ctx.db.patch(template._id, {
        slots: newSlots,
        updatedAt: now,
        updatedBy,
      });
      templateId = template._id;
    } else {
      // Create new template with this slot
      templateId = await ctx.db.insert("weeklyTemplates", {
        restaurantId,
        dayOfWeek: args.dayOfWeek,
        service: args.service,
        isOpen: true,
        slots: [newSlot],
        updatedAt: now,
        updatedBy,
      });
    }

    console.log("Slot added to template", { templateId, timeKey: args.slot.timeKey });

    return { templateId };
  },
});

/**
 * Update a slot in a template.
 * §6.6
 */
export const updateSlot = mutation({
  args: {
    dayOfWeek: v.number(),
    service: v.union(v.literal("lunch"), v.literal("dinner")),
    timeKey: v.string(),
    patch: v.object({
      capacity: v.optional(v.number()),
      isActive: v.optional(v.boolean()),
      largeTableAllowed: v.optional(v.boolean()),
      maxGroupSize: v.optional(v.union(v.number(), v.null())),
    }),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const identity = await ctx.auth.getUserIdentity();
    const updatedBy = identity?.subject ?? "unknown";

    // Validate
    if (!isValidDayOfWeek(args.dayOfWeek)) {
      throw Errors.INVALID_INPUT("dayOfWeek", "Doit être entre 1 et 7");
    }
    if (args.patch.capacity !== undefined && !isValidCapacity(args.patch.capacity)) {
      throw Errors.INVALID_INPUT("capacity", "Doit être entre 1 et 50");
    }

    // Get restaurant
    const restaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(1);

    if (restaurants.length === 0) {
      throw Errors.NO_ACTIVE_RESTAURANT();
    }

    const restaurantId = restaurants[0]._id;

    // Get template
    const template = await ctx.db
      .query("weeklyTemplates")
      .withIndex("by_restaurant_day_service", (q) =>
        q.eq("restaurantId", restaurantId).eq("dayOfWeek", args.dayOfWeek).eq("service", args.service)
      )
      .unique();

    if (!template) {
      throw Errors.NOT_FOUND("weeklyTemplates", `${args.dayOfWeek}-${args.service}`);
    }

    // Find slot
    const slotIndex = template.slots.findIndex((s) => s.timeKey === args.timeKey);
    if (slotIndex === -1) {
      throw Errors.NOT_FOUND("slot", args.timeKey);
    }

    // Update slot
    const updatedSlots = [...template.slots];
    updatedSlots[slotIndex] = {
      ...updatedSlots[slotIndex],
      capacity: args.patch.capacity ?? updatedSlots[slotIndex].capacity,
      isActive: args.patch.isActive ?? updatedSlots[slotIndex].isActive,
      largeTableAllowed: args.patch.largeTableAllowed ?? updatedSlots[slotIndex].largeTableAllowed,
      maxGroupSize: args.patch.maxGroupSize !== undefined ? args.patch.maxGroupSize : updatedSlots[slotIndex].maxGroupSize,
    };

    await ctx.db.patch(template._id, {
      slots: updatedSlots,
      updatedAt: Date.now(),
      updatedBy,
    });

    console.log("Slot updated", { templateId: template._id, timeKey: args.timeKey });

    return { templateId: template._id };
  },
});

/**
 * Remove a slot from a template.
 * §6.6
 */
export const removeSlot = mutation({
  args: {
    dayOfWeek: v.number(),
    service: v.union(v.literal("lunch"), v.literal("dinner")),
    timeKey: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const identity = await ctx.auth.getUserIdentity();
    const updatedBy = identity?.subject ?? "unknown";

    // Validate
    if (!isValidDayOfWeek(args.dayOfWeek)) {
      throw Errors.INVALID_INPUT("dayOfWeek", "Doit être entre 1 et 7");
    }

    // Get restaurant
    const restaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(1);

    if (restaurants.length === 0) {
      throw Errors.NO_ACTIVE_RESTAURANT();
    }

    const restaurantId = restaurants[0]._id;

    // Get template
    const template = await ctx.db
      .query("weeklyTemplates")
      .withIndex("by_restaurant_day_service", (q) =>
        q.eq("restaurantId", restaurantId).eq("dayOfWeek", args.dayOfWeek).eq("service", args.service)
      )
      .unique();

    if (!template) {
      throw Errors.NOT_FOUND("weeklyTemplates", `${args.dayOfWeek}-${args.service}`);
    }

    // Find slot
    const slotIndex = template.slots.findIndex((s) => s.timeKey === args.timeKey);
    if (slotIndex === -1) {
      throw Errors.NOT_FOUND("slot", args.timeKey);
    }

    // Remove slot
    const updatedSlots = template.slots.filter((s) => s.timeKey !== args.timeKey);

    await ctx.db.patch(template._id, {
      slots: updatedSlots,
      updatedAt: Date.now(),
      updatedBy,
    });

    console.log("Slot removed", { templateId: template._id, timeKey: args.timeKey });

    return { templateId: template._id };
  },
});

/**
 * Toggle day open/closed.
 * §6.6
 */
export const toggleDay = mutation({
  args: {
    dayOfWeek: v.number(),
    service: v.union(v.literal("lunch"), v.literal("dinner")),
    isOpen: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const identity = await ctx.auth.getUserIdentity();
    const updatedBy = identity?.subject ?? "unknown";

    // Validate
    if (!isValidDayOfWeek(args.dayOfWeek)) {
      throw Errors.INVALID_INPUT("dayOfWeek", "Doit être entre 1 et 7");
    }

    // Get restaurant
    const restaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(1);

    if (restaurants.length === 0) {
      throw Errors.NO_ACTIVE_RESTAURANT();
    }

    const restaurantId = restaurants[0]._id;

    // Get or create template
    let template = await ctx.db
      .query("weeklyTemplates")
      .withIndex("by_restaurant_day_service", (q) =>
        q.eq("restaurantId", restaurantId).eq("dayOfWeek", args.dayOfWeek).eq("service", args.service)
      )
      .unique();

    const now = Date.now();
    let templateId: Id<"weeklyTemplates">;

    if (template) {
      await ctx.db.patch(template._id, {
        isOpen: args.isOpen,
        updatedAt: now,
        updatedBy,
      });
      templateId = template._id;
    } else {
      // Create with default slots
      const defaultSlots = args.service === "lunch" ? DEFAULT_LUNCH_SLOTS : DEFAULT_DINNER_SLOTS;
      templateId = await ctx.db.insert("weeklyTemplates", {
        restaurantId,
        dayOfWeek: args.dayOfWeek,
        service: args.service,
        isOpen: args.isOpen,
        slots: defaultSlots,
        updatedAt: now,
        updatedBy,
      });
    }

    console.log("Day toggled", { templateId, dayOfWeek: args.dayOfWeek, service: args.service, isOpen: args.isOpen });

    return { templateId };
  },
});

/**
 * Seed default templates (14 = 7 days × 2 services).
 * §6.6
 */
export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const identity = await ctx.auth.getUserIdentity();
    const updatedBy = identity?.subject ?? "unknown";

    // Get restaurant
    const restaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(1);

    if (restaurants.length === 0) {
      throw Errors.NO_ACTIVE_RESTAURANT();
    }

    const restaurantId = restaurants[0]._id;
    const now = Date.now();
    let created = 0;

    const services: Service[] = ["lunch", "dinner"];

    for (let dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek++) {
      for (const service of services) {
        // Check if exists
        const existing = await ctx.db
          .query("weeklyTemplates")
          .withIndex("by_restaurant_day_service", (q) =>
            q.eq("restaurantId", restaurantId).eq("dayOfWeek", dayOfWeek).eq("service", service)
          )
          .unique();

        if (!existing) {
          const defaultSlots = service === "lunch" ? DEFAULT_LUNCH_SLOTS : DEFAULT_DINNER_SLOTS;
          await ctx.db.insert("weeklyTemplates", {
            restaurantId,
            dayOfWeek,
            service,
            isOpen: true,
            slots: defaultSlots,
            updatedAt: now,
            updatedBy,
          });
          created++;
        }
      }
    }

    console.log("Weekly templates seeded", { created });

    return { created };
  },
});

// ============================================================================
// Sync slots with templates
// ============================================================================

/**
 * Sync future slots with template changes.
 * Called after template modifications to update existing slots.
 */
export const syncSlotsWithTemplate = mutation({
  args: {
    dayOfWeek: v.number(),
    service: v.union(v.literal("lunch"), v.literal("dinner")),
  },
  handler: async (ctx, { dayOfWeek, service }) => {
    await requireRole(ctx, "admin");

    const restaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(1);

    if (restaurants.length === 0) {
      throw Errors.NO_ACTIVE_RESTAURANT();
    }

    const restaurantId = restaurants[0]._id;

    // Get template
    const template = await ctx.db
      .query("weeklyTemplates")
      .withIndex("by_restaurant_day_service", (q) =>
        q.eq("restaurantId", restaurantId).eq("dayOfWeek", dayOfWeek).eq("service", service)
      )
      .unique();

    if (!template) {
      return { updated: 0, created: 0, deleted: 0 };
    }

    const now = Date.now();
    const today = new Date();
    const todayKey = formatDateKey(today);

    let updated = 0;
    let created = 0;
    let deleted = 0;

    // Get all future slots for this day of week and service
    const allSlots = await ctx.db
      .query("slots")
      .withIndex("by_restaurant_date_service", (q) =>
        q.eq("restaurantId", restaurantId)
      )
      .collect();

    // Filter to future slots matching this dayOfWeek and service
    const futureSlots = allSlots.filter((slot) => {
      if (slot.dateKey < todayKey) return false;
      if (slot.service !== service) return false;
      const slotDate = new Date(slot.dateKey);
      return getISOWeekday(slotDate) === dayOfWeek;
    });

    // Get reservations for these slots to check if they can be modified
    const slotKeys = futureSlots.map((s) => s.slotKey);
    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_restaurant_status", (q) => q.eq("restaurantId", restaurantId))
      .collect();

    const activeReservationsBySlot = new Map<string, number>();
    for (const r of reservations) {
      if (r.status === "pending" || r.status === "confirmed" || r.status === "seated") {
        activeReservationsBySlot.set(r.slotKey, (activeReservationsBySlot.get(r.slotKey) ?? 0) + 1);
      }
    }

    // Template slot timeKeys
    const templateTimeKeys = new Set(template.slots.filter((s) => s.isActive).map((s) => s.timeKey));
    const templateSlotMap = new Map(template.slots.map((s) => [s.timeKey, s]));

    // Process each future date
    const processedDates = new Set<string>();
    for (const slot of futureSlots) {
      processedDates.add(slot.dateKey);
    }

    // Also add dates for next 30 days that match this dayOfWeek
    for (let i = 0; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      if (getISOWeekday(date) === dayOfWeek) {
        processedDates.add(formatDateKey(date));
      }
    }

    for (const dateKey of processedDates) {
      if (dateKey < todayKey) continue;

      // If template is closed, mark all slots as closed
      if (!template.isOpen) {
        const slotsForDate = futureSlots.filter((s) => s.dateKey === dateKey);
        for (const slot of slotsForDate) {
          if (slot.isOpen) {
            await ctx.db.patch(slot._id, { isOpen: false, updatedAt: now });
            updated++;
          }
        }
        continue;
      }

      // Get existing slots for this date
      const existingSlotsForDate = futureSlots.filter((s) => s.dateKey === dateKey);
      const existingTimeKeys = new Set(existingSlotsForDate.map((s) => s.timeKey));

      // Update or delete existing slots
      for (const slot of existingSlotsForDate) {
        const templateSlot = templateSlotMap.get(slot.timeKey);
        const hasReservations = (activeReservationsBySlot.get(slot.slotKey) ?? 0) > 0;

        if (!templateSlot || !templateSlot.isActive) {
          // Slot should be removed/closed
          if (!hasReservations) {
            await ctx.db.delete(slot._id);
            deleted++;
          } else {
            // Has reservations, just close it
            if (slot.isOpen) {
              await ctx.db.patch(slot._id, { isOpen: false, updatedAt: now });
              updated++;
            }
          }
        } else {
          // Update slot with template values
          const needsUpdate =
            slot.capacity !== templateSlot.capacity ||
            slot.isOpen !== true ||
            slot.maxGroupSize !== templateSlot.maxGroupSize ||
            slot.largeTableAllowed !== templateSlot.largeTableAllowed;

          if (needsUpdate) {
            await ctx.db.patch(slot._id, {
              capacity: templateSlot.capacity,
              isOpen: true,
              maxGroupSize: templateSlot.maxGroupSize,
              largeTableAllowed: templateSlot.largeTableAllowed,
              updatedAt: now,
            });
            updated++;
          }
        }
      }

      // Create missing slots
      for (const templateSlot of template.slots) {
        if (!templateSlot.isActive) continue;
        if (existingTimeKeys.has(templateSlot.timeKey)) continue;

        const slotKey = makeSlotKey({ dateKey, service, timeKey: templateSlot.timeKey });
        await ctx.db.insert("slots", {
          restaurantId,
          dateKey,
          service,
          timeKey: templateSlot.timeKey,
          slotKey,
          isOpen: true,
          capacity: templateSlot.capacity,
          maxGroupSize: templateSlot.maxGroupSize,
          largeTableAllowed: templateSlot.largeTableAllowed,
          updatedAt: now,
        });
        created++;
      }
    }

    console.log("Slots synced with template", { dayOfWeek, service, updated, created, deleted });

    return { updated, created, deleted };
  },
});

// ============================================================================
// Internal mutation for cron
// ============================================================================

/**
 * Generate slots from templates.
 * §7 Cron
 */
export const generateFromTemplates = internalMutation({
  args: {
    daysAhead: v.optional(v.number()),
  },
  handler: async (ctx, { daysAhead = 30 }) => {
    // Get restaurant
    const restaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(1);

    if (restaurants.length === 0) {
      console.log("No active restaurant, skipping slot generation");
      return { created: 0 };
    }

    const restaurant = restaurants[0];
    const restaurantId = restaurant._id;
    const now = Date.now();

    // Get today in restaurant timezone
    const today = new Date();
    let created = 0;

    // For each day in range
    for (let i = 0; i <= daysAhead; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      const dateKey = formatDateKey(date);
      const dayOfWeek = getISOWeekday(date);

      // For each service
      for (const service of ["lunch", "dinner"] as Service[]) {
        // Get template
        const template = await ctx.db
          .query("weeklyTemplates")
          .withIndex("by_restaurant_day_service", (q) =>
            q.eq("restaurantId", restaurantId).eq("dayOfWeek", dayOfWeek).eq("service", service)
          )
          .unique();

        if (!template || !template.isOpen) {
          continue;
        }

        // For each active slot in template
        for (const templateSlot of template.slots) {
          if (!templateSlot.isActive) {
            continue;
          }

          const slotKey = makeSlotKey({ dateKey, service, timeKey: templateSlot.timeKey });

          // Check if slot already exists
          const existingSlot = await ctx.db
            .query("slots")
            .withIndex("by_restaurant_slotKey", (q) =>
              q.eq("restaurantId", restaurantId).eq("slotKey", slotKey)
            )
            .unique();

          if (existingSlot) {
            // Never overwrite existing slots
            continue;
          }

          // Create slot
          await ctx.db.insert("slots", {
            restaurantId,
            dateKey,
            service,
            timeKey: templateSlot.timeKey,
            slotKey,
            isOpen: true,
            capacity: templateSlot.capacity,
            maxGroupSize: templateSlot.maxGroupSize,
            largeTableAllowed: templateSlot.largeTableAllowed,
            updatedAt: now,
          });

          created++;
        }
      }
    }

    console.log("Slots generated from templates", { created, daysAhead });

    return { created };
  },
});

// Helper functions

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getISOWeekday(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}
