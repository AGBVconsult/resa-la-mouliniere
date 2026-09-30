import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { computeEffectiveOpen } from "../spec/contracts.generated";
import { Errors } from "./lib/errors";
import { requireRole } from "./lib/rbac";
import { getSlotOverridesForDateRange } from "./lib/slotOverrides";
import { getTodayDateKey, getCurrentTimeKey } from "./lib/dateUtils";
import { canAcceptParty, type CapacityShapeAllocationLike, type CapacityShapeLike } from "./lib/capacityShape";
import { getShapesForDate, getShapesForDateRange, getAllocationsForShape, markCapacityShapeNeedsReview } from "./slotCapacityShapes";

type SlotRow = Pick<Doc<"slots">, "slotKey" | "dateKey" | "service" | "timeKey" | "isOpen" | "capacity" | "maxGroupSize">;
type ReservationRow = Pick<Doc<"reservations">, "slotKey" | "status" | "partySize">;

/**
 * Couverts occupés par slotKey (réservations actives uniquement).
 */
export function computeReservedCoversBySlotKey(reservations: ReservationRow[]): Map<string, number> {
  const used = new Map<string, number>();
  for (const r of reservations) {
    if (r.status !== "pending" && r.status !== "confirmed" && r.status !== "cardPlaced" && r.status !== "seated") continue;
    used.set(r.slotKey, (used.get(r.slotKey) ?? 0) + r.partySize);
  }
  return used;
}

export function computeRemainingCapacityBySlotKey(args: {
  slots: SlotRow[];
  reservations: ReservationRow[];
}): Map<string, number> {
  const used = computeReservedCoversBySlotKey(args.reservations);

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
 * PRD-013 §22 — Filtre les slots dont la typologie restante (Slot Capacity
 * Shape) est active et fiable (`enforced`) et qui n'ont aucun bucket
 * compatible avec `partySize`. Ne modifie JAMAIS le DTO exposé (les buckets
 * restent une donnée interne — §43) : ne fait que retirer le slot du
 * résultat public.
 */
export function filterSlotsByCapacityShape<T extends { slotKey: string }>(
  slots: T[],
  shapesBySlotKey: Map<string, CapacityShapeLike>,
  allocationsBySlotKey: Map<string, CapacityShapeAllocationLike[]>,
  partySize: number
): T[] {
  return slots.filter((slot) => {
    const shape = shapesBySlotKey.get(slot.slotKey);
    if (!shape) return true;
    const allocations = allocationsBySlotKey.get(slot.slotKey) ?? [];
    return canAcceptParty({ shape, allocations, partySize });
  });
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
    if (r.status === "pending" || r.status === "confirmed" || r.status === "cardPlaced" || r.status === "seated") {
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
    
    const { manual: manualOverrides, period: periodOverrides } =
      await getSlotOverridesForDateRange(ctx, restaurant._id, dateKey, dateKey);
    
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

    // PRD-013 §21-22 — Typologie restante (Slot Capacity Shape). Batch-load
    // (jamais une query par slot) puis filtre. Shapes absentes/désactivées/
    // needsReview => comportement classique inchangé (non-régression).
    const shapesForDate = await getShapesForDate(ctx, restaurant._id, dateKey);
    if (shapesForDate.size > 0) {
      const shapesBySlotKey = new Map<string, CapacityShapeLike>();
      const allocationsBySlotKey = new Map<string, CapacityShapeAllocationLike[]>();
      for (const [slotKeyForShape, shape] of shapesForDate) {
        shapesBySlotKey.set(slotKeyForShape, {
          enabled: shape.enabled,
          needsReview: shape.needsReview,
          buckets: shape.buckets,
          configRevision: shape.configRevision,
        });
        const allocations = await getAllocationsForShape(ctx, shape._id);
        allocationsBySlotKey.set(
          slotKeyForShape,
          allocations.map((a) => ({
            status: a.status,
            configRevision: a.configRevision,
            bucketMaxPartySize: a.bucketMaxPartySize ?? null,
          }))
        );
      }
      lunch = filterSlotsByCapacityShape(lunch, shapesBySlotKey, allocationsBySlotKey, partySize);
      dinner = filterSlotsByCapacityShape(dinner, shapesBySlotKey, allocationsBySlotKey, partySize);
    }

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

    // 1. Récupérer tous les slots du mois (sans pré-filtre isOpen
    //    pour que les overrides manuels puissent rouvrir des slots fermés)
    const slots = await ctx.db
      .query("slots")
      .withIndex("by_restaurant_date_service", (q) =>
        q.eq("restaurantId", restaurant._id).gte("dateKey", startDate).lte("dateKey", endDate)
      )
      .collect();

    // 2. Récupérer les réservations actives du mois (pending, confirmed, seated)
    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_restaurant_date_service", (q) =>
        q.eq("restaurantId", restaurant._id).gte("dateKey", startDate).lte("dateKey", endDate)
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "confirmed"),
          q.eq(q.field("status"), "seated")
        )
      )
      .collect();

    // 3. Load overrides in batch (fix N+1 query)
    const slotKeys = new Set(slots.map((s) => s.slotKey));
    
    const { manual: manualOverrides, period: periodOverrides } =
      await getSlotOverridesForDateRange(ctx, restaurant._id, startDate, endDate);
    
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

    // PRD-013 §32 — Typologie restante : chargée en batch pour toute la plage
    // du mois (jamais une query par slot/jour). Les shapes sont exceptionnelles,
    // donc le coût par-shape reste négligeable.
    const shapesForRange = await getShapesForDateRange(ctx, restaurant._id, startDate, endDate);
    const shapeAllocationsBySlotKey = new Map<string, CapacityShapeAllocationLike[]>();
    if (shapesForRange.size > 0) {
      for (const [slotKeyForShape, shape] of shapesForRange) {
        const allocations = await getAllocationsForShape(ctx, shape._id);
        shapeAllocationsBySlotKey.set(
          slotKeyForShape,
          allocations.map((a) => ({
            status: a.status,
            configRevision: a.configRevision,
            bucketMaxPartySize: a.bucketMaxPartySize ?? null,
          }))
        );
      }
    }
    const shapeCompatible = (slotKey: string): boolean => {
      const shape = shapesForRange.get(slotKey);
      if (!shape) return true;
      const allocations = shapeAllocationsBySlotKey.get(slotKey) ?? [];
      return canAcceptParty({
        shape: { enabled: shape.enabled, needsReview: shape.needsReview, buckets: shape.buckets, configRevision: shape.configRevision },
        allocations,
        partySize,
      });
    };

    // 6. Construire le résultat DayState[]
    const result: Array<{
      dateKey: string;
      lunch: { isOpen: boolean };
      dinner: { isOpen: boolean };
    }> = [];

    for (let day = 1; day <= lastDay; day++) {
      const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const daySlots = slotsByDateService.get(dateKey) || { lunch: [], dinner: [] };

      // Vérifier si au moins un slot lunch a de la capacité pour partySize ET respecte maxGroupSize ET la typologie
      const lunchOpen = daySlots.lunch.some((slot) => {
        const occupation = occupationBySlotKey.get(slot.slotKey) || 0;
        const remaining = slot.capacity - occupation;
        if (remaining < partySize) return false;
        // Vérifier maxGroupSize (null = pas de limite)
        if (slot.maxGroupSize !== null && partySize > slot.maxGroupSize) return false;
        if (!shapeCompatible(slot.slotKey)) return false;
        return true;
      });

      // Vérifier si au moins un slot dinner a de la capacité pour partySize ET respecte maxGroupSize ET la typologie
      const dinnerOpen = daySlots.dinner.some((slot) => {
        const occupation = occupationBySlotKey.get(slot.slotKey) || 0;
        const remaining = slot.capacity - occupation;
        if (remaining < partySize) return false;
        // Vérifier maxGroupSize (null = pas de limite)
        if (slot.maxGroupSize !== null && partySize > slot.maxGroupSize) return false;
        if (!shapeCompatible(slot.slotKey)) return false;
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

    // Build override patch with only defined fields
    const overridePatch: Record<string, any> = {};

    if (patch.isOpen !== undefined) {
      overridePatch.isOpen = patch.isOpen;
    }
    if (patch.capacity !== undefined) {
      if (patch.capacity < 0) {
        throw Errors.INVALID_INPUT("capacity", "Doit être >= 0");
      }
      overridePatch.capacity = patch.capacity;
    }
    if (patch.maxGroupSize !== undefined) {
      if (patch.maxGroupSize !== null && patch.maxGroupSize < 1) {
        throw Errors.INVALID_INPUT("maxGroupSize", "Doit être >= 1 ou null");
      }
      overridePatch.maxGroupSize = patch.maxGroupSize;
    }
    if (patch.largeTableAllowed !== undefined) {
      overridePatch.largeTableAllowed = patch.largeTableAllowed;
    }

    const now = Date.now();

    // Create/update slotOverride manual instead of patching slot directly
    const existingOverride = await ctx.db
      .query("slotOverrides")
      .withIndex("by_restaurant_slotKey", (q) =>
        q.eq("restaurantId", restaurantId).eq("slotKey", slotKey)
      )
      .filter((q) => q.eq(q.field("origin"), "manual"))
      .first();

    if (existingOverride) {
      await ctx.db.patch(existingOverride._id, {
        patch: { ...existingOverride.patch, ...overridePatch },
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("slotOverrides", {
        restaurantId,
        slotKey,
        origin: "manual",
        patch: overridePatch,
        createdAt: now,
        updatedAt: now,
      });
    }

    // PRD-013 §31 — override manuel de capacité => typologie à revoir.
    if (overridePatch.capacity !== undefined) {
      await markCapacityShapeNeedsReview(ctx, { restaurantId, slotKey, now });
    }

    return { slotKey };
  },
});
