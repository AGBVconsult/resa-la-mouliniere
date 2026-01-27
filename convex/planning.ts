/**
 * Planning queries — Vue mensuelle (PRD-010)
 */

import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/rbac";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ServiceEffective {
  isOpen: boolean;
  capacityEffective: number;
  covers: number;
}

interface DayEffective {
  lunch: ServiceEffective;
  dinner: ServiceEffective;
}

// ═══════════════════════════════════════════════════════════════
// QUERY: getMonthEffective
// Vue mensuelle avec cascade résolue server-side
// ═══════════════════════════════════════════════════════════════

export const getMonthEffective = query({
  args: {
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, { year, month }): Promise<Record<string, DayEffective>> => {
    await requireRole(ctx, "admin");

    // Get active restaurant
    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();

    if (!restaurant) {
      return {};
    }

    // Calculate date range for the month
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    // Fetch all slots for the month
    const allSlots = await ctx.db
      .query("slots")
      .withIndex("by_restaurant_date_service", (q) =>
        q.eq("restaurantId", restaurant._id)
      )
      .collect();

    // Filter slots in date range
    const monthSlots = allSlots.filter(
      (s) => s.dateKey >= startDate && s.dateKey <= endDate
    );

    // Fetch slotOverrides (manual and period) to apply closures/modifications
    const slotKeys = new Set(monthSlots.map((s) => s.slotKey));
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
    const effectiveSlots = monthSlots.map((slot) => {
      const override = overridesMap.get(slot.slotKey);
      if (!override) return slot;
      return {
        ...slot,
        isOpen: override.isOpen ?? slot.isOpen,
        capacity: override.capacity ?? slot.capacity,
      };
    });

    // Fetch all reservations for the month with active statuses
    const allReservations = await ctx.db
      .query("reservations")
      .withIndex("by_restaurant_date_service", (q) =>
        q.eq("restaurantId", restaurant._id)
      )
      .collect();

    // Filter reservations in date range with active statuses
    const activeStatuses = ["pending", "confirmed", "seated", "completed"];
    const monthReservations = allReservations.filter(
      (r) =>
        r.dateKey >= startDate &&
        r.dateKey <= endDate &&
        activeStatuses.includes(r.status)
    );

    // Build result by date
    const result: Record<string, DayEffective> = {};

    // Iterate over each day of the month
    for (let day = 1; day <= lastDay; day++) {
      const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      // Get effective slots for this day
      const daySlots = effectiveSlots.filter((s) => s.dateKey === dateKey);
      const lunchSlots = daySlots.filter((s) => s.service === "lunch");
      const dinnerSlots = daySlots.filter((s) => s.service === "dinner");

      // Get reservations for this day
      const dayReservations = monthReservations.filter((r) => r.dateKey === dateKey);
      const lunchReservations = dayReservations.filter((r) => r.service === "lunch");
      const dinnerReservations = dayReservations.filter((r) => r.service === "dinner");

      // Calculate effective values for each service
      result[dateKey] = {
        lunch: {
          isOpen: lunchSlots.some((s) => s.isOpen && s.capacity > 0),
          capacityEffective: lunchSlots
            .filter((s) => s.isOpen)
            .reduce((sum, s) => sum + s.capacity, 0),
          covers: lunchReservations.reduce((sum, r) => sum + r.partySize, 0),
        },
        dinner: {
          isOpen: dinnerSlots.some((s) => s.isOpen && s.capacity > 0),
          capacityEffective: dinnerSlots
            .filter((s) => s.isOpen)
            .reduce((sum, s) => sum + s.capacity, 0),
          covers: dinnerReservations.reduce((sum, r) => sum + r.partySize, 0),
        },
      };
    }

    return result;
  },
});
