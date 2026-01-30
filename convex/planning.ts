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
  reservationCount: number;
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

    // Fetch special periods (closures) that overlap with this month
    // This handles closures even when slots don't exist yet
    const allSpecialPeriods = await ctx.db
      .query("specialPeriods")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurant._id))
      .collect();

    // DEBUG: Also fetch ALL periods to check if any are missing restaurantId
    const allPeriodsGlobal = await ctx.db.query("specialPeriods").collect();
    console.log("[planning] DEBUG - Restaurant ID:", restaurant._id);
    console.log("[planning] DEBUG - All periods (global):", allPeriodsGlobal.map(p => ({
      name: p.name,
      restaurantId: p.restaurantId,
      startDate: p.startDate,
      endDate: p.endDate,
      status: p.applyRules.status,
    })));
    console.log("[planning] DEBUG - Periods for this restaurant:", allSpecialPeriods.length);

    // Filter periods that overlap with this month
    const monthPeriods = allSpecialPeriods.filter(
      (p) => p.startDate <= endDate && p.endDate >= startDate
    );

    // DEBUG: Log periods found
    if (monthPeriods.length > 0) {
      console.log("[planning] Found periods for month:", year, month, monthPeriods.map(p => ({
        name: p.name,
        startDate: p.startDate,
        endDate: p.endDate,
        status: p.applyRules.status,
        services: p.applyRules.services,
        activeDays: p.applyRules.activeDays,
      })));
    }

    // Helper to parse dateKey to Date (local time, not UTC)
    const parseDateKey = (dateKey: string): Date => {
      const [y, m, d] = dateKey.split("-").map(Number);
      return new Date(y, m - 1, d);
    };

    // Helper to format Date to dateKey
    const formatDateKey = (date: Date): string => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    // Helper to get ISO weekday (1=Monday, 7=Sunday)
    const getISOWeekday = (date: Date): number => {
      const day = date.getDay();
      return day === 0 ? 7 : day;
    };

    // Build closure map: dateKey -> { lunch: boolean, dinner: boolean }
    const closureMap = new Map<string, { lunch: boolean; dinner: boolean }>();
    
    for (const period of monthPeriods) {
      if (period.applyRules.status !== "closed") continue;
      
      // Iterate through period dates that fall within this month
      const periodStart = period.startDate > startDate ? period.startDate : startDate;
      const periodEnd = period.endDate < endDate ? period.endDate : endDate;
      
      const current = parseDateKey(periodStart);
      const end = parseDateKey(periodEnd);
      
      while (current <= end) {
        const dateKey = formatDateKey(current);
        const weekday = getISOWeekday(current);
        
        // Check if this day is in activeDays
        if (period.applyRules.activeDays.includes(weekday)) {
          const existing = closureMap.get(dateKey) || { lunch: false, dinner: false };
          for (const service of period.applyRules.services) {
            existing[service] = true;
          }
          closureMap.set(dateKey, existing);
        }
        
        current.setDate(current.getDate() + 1);
      }
    }

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

      // Check if this day has a closure from specialPeriods
      const closure = closureMap.get(dateKey);
      const lunchClosed = closure?.lunch ?? false;
      const dinnerClosed = closure?.dinner ?? false;

      // Calculate effective values for each service
      // If a closure exists from specialPeriods, force isOpen to false
      result[dateKey] = {
        lunch: {
          isOpen: lunchClosed ? false : lunchSlots.some((s) => s.isOpen && s.capacity > 0),
          capacityEffective: lunchClosed ? 0 : lunchSlots
            .filter((s) => s.isOpen)
            .reduce((sum, s) => sum + s.capacity, 0),
          covers: lunchReservations.reduce((sum, r) => sum + r.partySize, 0),
          reservationCount: lunchReservations.length,
        },
        dinner: {
          isOpen: dinnerClosed ? false : dinnerSlots.some((s) => s.isOpen && s.capacity > 0),
          capacityEffective: dinnerClosed ? 0 : dinnerSlots
            .filter((s) => s.isOpen)
            .reduce((sum, s) => sum + s.capacity, 0),
          covers: dinnerReservations.reduce((sum, r) => sum + r.partySize, 0),
          reservationCount: dinnerReservations.length,
        },
      };
    }

    return result;
  },
});
