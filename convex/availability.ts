import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { computeEffectiveOpen } from "../spec/contracts.generated";
import { Errors } from "./lib/errors";
import { requireRole } from "./lib/rbac";
import { getTodayDateKey, getCurrentTimeKey } from "./lib/dateUtils";

type SlotRow = Pick<Doc<"slots">, "slotKey" | "dateKey" | "service" | "timeKey" | "isOpen" | "capacity" | "maxGroupSize">;
type ReservationRow = Pick<Doc<"reservations">, "slotKey" | "status" | "partySize">;

export function computeRemainingCapacityBySlotKey(args: {
  slots: SlotRow[];
  reservations: ReservationRow[];
}): Map<string, number> {
  const used = new Map<string, number>();
  for (const r of args.reservations) {
    if (r.status !== "pending" && r.status !== "confirmed" && r.status !== "seated") continue;
    used.set(r.slotKey, (used.get(r.slotKey) ?? 0) + r.partySize);
  }

  const remaining = new Map<string, number>();
  for (const s of args.slots) {
    const usedForSlot = used.get(s.slotKey) ?? 0;
    remaining.set(s.slotKey, Math.max(0, s.capacity - usedForSlot));
  }
  return remaining;
}

type SlotDto = {
  slotKey: string;
  dateKey: string;
  service: "lunch" | "dinner";
  timeKey: string;
  isOpen: boolean;
  capacity: number;
  remainingCapacity: number;
  maxGroupSize: number | null;
};

export function toSlotDto(args: { slot: SlotRow; remainingCapacity: number }): SlotDto {
  return {
    slotKey: args.slot.slotKey,
    dateKey: args.slot.dateKey,
    service: args.slot.service,
    timeKey: args.slot.timeKey,
    isOpen: computeEffectiveOpen(args.slot.isOpen, args.slot.capacity),
    capacity: args.slot.capacity,
    remainingCapacity: args.remainingCapacity,
    maxGroupSize: args.slot.maxGroupSize,
  };
}

/**
 * Filter slots based on progressive filling rules.
 * Slots after threshold are hidden if previous slot doesn't meet min fill %.
 */
function applyProgressiveFilling(
  slots: SlotDto[],
  reservations: Array<{ slotKey: string; status: string; partySize: number }>,
  threshold: string,
  minFillPercent: number
): SlotDto[] {
  if (!threshold || slots.length === 0) return slots;

  // Sort by timeKey
  const sorted = [...slots].sort((a, b) => a.timeKey.localeCompare(b.timeKey));
  
  // Calculate fill rate per slot
  const fillBySlotKey = new Map<string, number>();
  for (const r of reservations) {
    if (r.status === "pending" || r.status === "confirmed" || r.status === "seated") {
      fillBySlotKey.set(r.slotKey, (fillBySlotKey.get(r.slotKey) ?? 0) + r.partySize);
    }
  }

  const result: typeof slots = [];
  let previousSlotMeetsFill = true;

  for (let i = 0; i < sorted.length; i++) {
    const slot = sorted[i];
    const isAfterThreshold = slot.timeKey >= threshold;

    if (!isAfterThreshold) {
      // Before threshold: always show
      result.push(slot);
      // Update fill status for next iteration
      const filled = fillBySlotKey.get(slot.slotKey) ?? 0;
      const fillPercent = slot.capacity > 0 ? (filled / slot.capacity) * 100 : 0;
      previousSlotMeetsFill = fillPercent >= minFillPercent;
    } else {
      // After threshold: only show if previous slot meets min fill %
      if (previousSlotMeetsFill) {
        result.push(slot);
        // Update fill status for next iteration
        const filled = fillBySlotKey.get(slot.slotKey) ?? 0;
        const fillPercent = slot.capacity > 0 ? (filled / slot.capacity) * 100 : 0;
        previousSlotMeetsFill = fillPercent >= minFillPercent;
      }
      // If previous doesn't meet fill, this and all subsequent are hidden
    }
  }

  return result;
}

export const getDay = query({
  args: { dateKey: v.string(), partySize: v.number() },
  handler: async (ctx, { dateKey, partySize }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      throw Errors.INVALID_INPUT("dateKey", "Format YYYY-MM-DD requis");
    }
    if (partySize < 1) {
      throw Errors.INVALID_INPUT("partySize", "Doit être >= 1");
    }

    const activeRestaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(2);

    if (activeRestaurants.length === 0) {
      throw Errors.NO_ACTIVE_RESTAURANT();
    }
    if (activeRestaurants.length > 1) {
      throw Errors.MULTIPLE_ACTIVE_RESTAURANTS(activeRestaurants.length);
    }

    const restaurant = activeRestaurants[0];

    // Load settings for progressive filling
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", restaurant._id))
      .unique();

    const [lunchSlots, dinnerSlots, lunchReservations, dinnerReservations] = await Promise.all([
      ctx.db
        .query("slots")
        .withIndex("by_restaurant_date_service", (q) =>
          q.eq("restaurantId", restaurant._id).eq("dateKey", dateKey).eq("service", "lunch")
        )
        .collect(),
      ctx.db
        .query("slots")
        .withIndex("by_restaurant_date_service", (q) =>
          q.eq("restaurantId", restaurant._id).eq("dateKey", dateKey).eq("service", "dinner")
        )
        .collect(),
      ctx.db
        .query("reservations")
        .withIndex("by_restaurant_date_service", (q) =>
          q.eq("restaurantId", restaurant._id).eq("dateKey", dateKey).eq("service", "lunch")
        )
        .collect(),
      ctx.db
        .query("reservations")
        .withIndex("by_restaurant_date_service", (q) =>
          q.eq("restaurantId", restaurant._id).eq("dateKey", dateKey).eq("service", "dinner")
        )
        .collect(),
    ]);

    // Load ALL overrides for this restaurant in two queries (fix N+1)
    // Using by_restaurant_origin index to batch load manual and period overrides
    const allSlots = [...lunchSlots, ...dinnerSlots];
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
    
    // Filter to relevant slots and build map with priority: MANUAL > PERIOD
    const overridesMap = new Map<string, { isOpen?: boolean; capacity?: number; maxGroupSize?: number | null; largeTableAllowed?: boolean }>();
    
    // First add period overrides (lower priority)
    for (const override of periodOverrides) {
      if (slotKeys.has(override.slotKey)) {
        overridesMap.set(override.slotKey, override.patch);
      }
    }
    // Then add manual overrides (higher priority, overwrites period)
    for (const override of manualOverrides) {
      if (slotKeys.has(override.slotKey)) {
        overridesMap.set(override.slotKey, override.patch);
      }
    }

    // Apply overrides to slots
    const applyOverride = (slot: SlotRow): SlotRow => {
      const override = overridesMap.get(slot.slotKey);
      if (!override) return slot;
      return {
        ...slot,
        isOpen: override.isOpen ?? slot.isOpen,
        capacity: override.capacity ?? slot.capacity,
        maxGroupSize: override.maxGroupSize !== undefined ? override.maxGroupSize : slot.maxGroupSize,
      };
    };

    const effectiveLunchSlots = lunchSlots.map(applyOverride);
    const effectiveDinnerSlots = dinnerSlots.map(applyOverride);

    const lunchRemaining = computeRemainingCapacityBySlotKey({
      slots: effectiveLunchSlots,
      reservations: lunchReservations,
    });
    const dinnerRemaining = computeRemainingCapacityBySlotKey({
      slots: effectiveDinnerSlots,
      reservations: dinnerReservations,
    });

    // Filter out past slots for today (using restaurant timezone)
    const timezone = restaurant.timezone ?? "Europe/Brussels";
    const todayKey = getTodayDateKey(timezone);
    const currentTimeKey = getCurrentTimeKey(timezone);
    const isToday = dateKey === todayKey;

    let lunch = effectiveLunchSlots
      .map((slot) => {
        const remainingCapacity = lunchRemaining.get(slot.slotKey) ?? slot.capacity;
        return toSlotDto({ slot, remainingCapacity });
      })
      .filter((slot) => !isToday || slot.timeKey > currentTimeKey)
      .sort((a, b) => a.timeKey.localeCompare(b.timeKey));

    let dinner = effectiveDinnerSlots
      .map((slot) => {
        const remainingCapacity = dinnerRemaining.get(slot.slotKey) ?? slot.capacity;
        return toSlotDto({ slot, remainingCapacity });
      })
      .filter((slot) => !isToday || slot.timeKey > currentTimeKey)
      .sort((a, b) => a.timeKey.localeCompare(b.timeKey));

    // Apply progressive filling if enabled
    const pf = settings?.progressiveFilling;
    if (pf?.enabled) {
      lunch = applyProgressiveFilling(
        lunch,
        lunchReservations,
        pf.lunchThreshold,
        pf.minFillPercent
      );
      dinner = applyProgressiveFilling(
        dinner,
        dinnerReservations,
        pf.dinnerThreshold,
        pf.minFillPercent
      );
    }

    return { dateKey, partySize, lunch, dinner };
  },
});

export const getMonth = query({
  args: { year: v.number(), month: v.number(), partySize: v.number() },
  handler: async (ctx, { year, month, partySize }) => {
    if (month < 1 || month > 12) {
      throw Errors.INVALID_INPUT("month", "Doit être entre 1 et 12");
    }
    if (partySize < 1) {
      throw Errors.INVALID_INPUT("partySize", "Doit être >= 1");
    }

    const activeRestaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(2);

    if (activeRestaurants.length === 0) {
      throw Errors.NO_ACTIVE_RESTAURANT();
    }
    if (activeRestaurants.length > 1) {
      throw Errors.MULTIPLE_ACTIVE_RESTAURANTS(activeRestaurants.length);
    }

    const restaurant = activeRestaurants[0];

    // Générer les bornes du mois
    const lastDay = new Date(year, month, 0).getDate();
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    // 1. Récupérer tous les slots ouverts du mois
    const slots = await ctx.db
      .query("slots")
      .withIndex("by_restaurant_date_service", (q) =>
        q.eq("restaurantId", restaurant._id)
      )
      .filter((q) =>
        q.and(
          q.gte(q.field("dateKey"), startDate),
          q.lte(q.field("dateKey"), endDate),
          q.eq(q.field("isOpen"), true)
        )
      )
      .collect();

    // 2. Récupérer les réservations actives du mois (pending, confirmed, seated)
    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_restaurant_date_service", (q) =>
        q.eq("restaurantId", restaurant._id)
      )
      .filter((q) =>
        q.and(
          q.gte(q.field("dateKey"), startDate),
          q.lte(q.field("dateKey"), endDate),
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "confirmed"),
            q.eq(q.field("status"), "seated")
          )
        )
      )
      .collect();

    // 3. Load overrides in batch (fix N+1 query)
    const slotKeys = new Set(slots.map((s) => s.slotKey));
    
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
    
    const overridesMap = new Map<string, { isOpen?: boolean; capacity?: number; maxGroupSize?: number | null }>();
    
    // First add period overrides (lower priority)
    for (const override of periodOverrides) {
      if (slotKeys.has(override.slotKey)) {
        overridesMap.set(override.slotKey, override.patch);
      }
    }
    // Then add manual overrides (higher priority)
    for (const override of manualOverrides) {
      if (slotKeys.has(override.slotKey)) {
        overridesMap.set(override.slotKey, override.patch);
      }
    }

    // Apply overrides to slots
    const effectiveSlots = slots.map((slot) => {
      const override = overridesMap.get(slot.slotKey);
      if (!override) return slot;
      return {
        ...slot,
        isOpen: override.isOpen ?? slot.isOpen,
        capacity: override.capacity ?? slot.capacity,
        maxGroupSize: override.maxGroupSize !== undefined ? override.maxGroupSize : slot.maxGroupSize,
      };
    }).filter((slot) => slot.isOpen);

    // 4. Calculer l'occupation par slotKey
    const occupationBySlotKey = new Map<string, number>();
    for (const resa of reservations) {
      const current = occupationBySlotKey.get(resa.slotKey) || 0;
      occupationBySlotKey.set(resa.slotKey, current + resa.partySize);
    }

    // 5. Grouper les slots par date et service
    const slotsByDateService = new Map<string, { lunch: typeof effectiveSlots; dinner: typeof effectiveSlots }>();
    
    for (const slot of effectiveSlots) {
      const key = slot.dateKey;
      if (!slotsByDateService.has(key)) {
        slotsByDateService.set(key, { lunch: [], dinner: [] });
      }
      const group = slotsByDateService.get(key)!;
      if (slot.service === "lunch") {
        group.lunch.push(slot);
      } else if (slot.service === "dinner") {
        group.dinner.push(slot);
      }
    }

    // 6. Construire le résultat DayState[]
    const result: Array<{
      dateKey: string;
      lunch: { isOpen: boolean };
      dinner: { isOpen: boolean };
    }> = [];

    for (let day = 1; day <= lastDay; day++) {
      const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const daySlots = slotsByDateService.get(dateKey) || { lunch: [], dinner: [] };

      // Vérifier si au moins un slot lunch a de la capacité pour partySize ET respecte maxGroupSize
      const lunchOpen = daySlots.lunch.some((slot) => {
        const occupation = occupationBySlotKey.get(slot.slotKey) || 0;
        const remaining = slot.capacity - occupation;
        if (remaining < partySize) return false;
        // Vérifier maxGroupSize (null = pas de limite)
        if (slot.maxGroupSize !== null && partySize > slot.maxGroupSize) return false;
        return true;
      });

      // Vérifier si au moins un slot dinner a de la capacité pour partySize ET respecte maxGroupSize
      const dinnerOpen = daySlots.dinner.some((slot) => {
        const occupation = occupationBySlotKey.get(slot.slotKey) || 0;
        const remaining = slot.capacity - occupation;
        if (remaining < partySize) return false;
        // Vérifier maxGroupSize (null = pas de limite)
        if (slot.maxGroupSize !== null && partySize > slot.maxGroupSize) return false;
        return true;
      });

      result.push({
        dateKey,
        lunch: { isOpen: lunchOpen },
        dinner: { isOpen: dinnerOpen },
      });
    }

    return result;
  },
});

/**
 * Admin override for a slot (CONTRACTS.md §6.3).
 * Autorisation : owner uniquement.
 */
export const adminOverrideSlot = mutation({
  args: {
    slotKey: v.string(),
    restaurantId: v.id("restaurants"),
    patch: v.object({
      isOpen: v.optional(v.boolean()),
      capacity: v.optional(v.number()),
      maxGroupSize: v.optional(v.union(v.number(), v.null())),
      largeTableAllowed: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { slotKey, restaurantId, patch }) => {
    // RBAC: owner uniquement
    await requireRole(ctx, "owner");

    // Validate slotKey format: {dateKey}#{service}#{timeKey}
    const slotKeyRegex = /^\d{4}-\d{2}-\d{2}#(lunch|dinner)#\d{2}:\d{2}$/;
    if (!slotKeyRegex.test(slotKey)) {
      throw Errors.INVALID_INPUT("slotKey", "Format invalide, attendu: YYYY-MM-DD#service#HH:MM");
    }

    // Find existing slot
    const existingSlot = await ctx.db
      .query("slots")
      .withIndex("by_restaurant_slotKey", (q) =>
        q.eq("restaurantId", restaurantId).eq("slotKey", slotKey)
      )
      .unique();

    if (!existingSlot) {
      throw Errors.SLOT_NOT_FOUND(slotKey);
    }

    // Build patch object with only defined fields
    const updateData: Partial<{
      isOpen: boolean;
      capacity: number;
      maxGroupSize: number | null;
      largeTableAllowed: boolean;
      updatedAt: number;
    }> = {
      updatedAt: Date.now(),
    };

    if (patch.isOpen !== undefined) {
      updateData.isOpen = patch.isOpen;
    }
    if (patch.capacity !== undefined) {
      if (patch.capacity < 0) {
        throw Errors.INVALID_INPUT("capacity", "Doit être >= 0");
      }
      updateData.capacity = patch.capacity;
    }
    if (patch.maxGroupSize !== undefined) {
      if (patch.maxGroupSize !== null && patch.maxGroupSize < 1) {
        throw Errors.INVALID_INPUT("maxGroupSize", "Doit être >= 1 ou null");
      }
      updateData.maxGroupSize = patch.maxGroupSize;
    }
    if (patch.largeTableAllowed !== undefined) {
      updateData.largeTableAllowed = patch.largeTableAllowed;
    }

    await ctx.db.patch(existingSlot._id, updateData);

    return { slotKey };
  },
});
