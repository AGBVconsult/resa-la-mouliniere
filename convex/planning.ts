/**
 * Planning queries — Vue mensuelle (PRD-010)
 */

import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/rbac";
import { getSlotOverridesForDateRange } from "./lib/slotOverrides";
import { resolveDayClosure, resolveServiceClosure, type ClosureReason } from "./lib/dayClosure";

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
  /** Réservations en attente de confirmation (statut "pending") */
  pendingCount: number;
  /** Nom de la période spéciale qui s'applique ce jour-là */
  periodName: string | null;
  /** Motif de fermeture, uniquement si les deux services sont fermés */
  closure: { reason: ClosureReason; closedAt: number | null } | null;
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
    // Index by_restaurant_dates: périodes qui commencent avant la fin du mois,
    // puis filtre en mémoire sur celles qui finissent après le début du mois
    const candidatePeriods = await ctx.db
      .query("specialPeriods")
      .withIndex("by_restaurant_dates", (q) =>
        q.eq("restaurantId", restaurant._id).lte("startDate", endDate)
      )
      .collect();
    const monthPeriods = candidatePeriods.filter((p) => p.endDate >= startDate);

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
    // Nom de la période spéciale par jour (toutes périodes confondues)
    const periodNameMap = new Map<string, string>();

    for (const period of monthPeriods) {
      const periodStart = period.startDate > startDate ? period.startDate : startDate;
      const periodEnd = period.endDate < endDate ? period.endDate : endDate;
      const cursor = parseDateKey(periodStart);
      const last = parseDateKey(periodEnd);
      while (cursor <= last) {
        if (period.applyRules.activeDays.includes(getISOWeekday(cursor))) {
          const key = formatDateKey(cursor);
          if (!periodNameMap.has(key)) periodNameMap.set(key, period.name);
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }

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

    // Fetch slots for the month only (range on index)
    const monthSlots = await ctx.db
      .query("slots")
      .withIndex("by_restaurant_date_service", (q) =>
        q.eq("restaurantId", restaurant._id).gte("dateKey", startDate).lte("dateKey", endDate)
      )
      .collect();

    // Fetch slotOverrides (manual and period) to apply closures/modifications
    const slotKeys = new Set(monthSlots.map((s) => s.slotKey));
    const { manual: manualOverrides, period: periodOverrides } =
      await getSlotOverridesForDateRange(ctx, restaurant._id, startDate, endDate);

    // Fermetures manuelles par slotKey (pour expliquer un jour fermé)
    const manualCloseAt = new Map<string, number>();
    for (const override of manualOverrides) {
      if (override.patch.isOpen === false) manualCloseAt.set(override.slotKey, override.updatedAt);
    }

    // Modèles hebdomadaires ouverts (pour distinguer "créneaux non générés" de "fermeture habituelle")
    const templates = await ctx.db
      .query("weeklyTemplates")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurant._id))
      .collect();
    const openTemplates = new Set(
      templates
        .filter((t) => t.isOpen && t.slots.some((s) => s.isActive))
        .map((t) => `${t.dayOfWeek}#${t.service}`)
    );

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

    // Fetch reservations for the month only (range on index)
    const rangeReservations = await ctx.db
      .query("reservations")
      .withIndex("by_restaurant_date_service", (q) =>
        q.eq("restaurantId", restaurant._id).gte("dateKey", startDate).lte("dateKey", endDate)
      )
      .collect();

    // Keep active statuses only
    const activeStatuses = ["pending", "confirmed", "cardPlaced", "seated", "completed"];
    const monthReservations = rangeReservations.filter((r) => activeStatuses.includes(r.status));

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

      const lunchOpen = lunchClosed ? false : lunchSlots.some((s) => s.isOpen && s.capacity > 0);
      const dinnerOpen = dinnerClosed ? false : dinnerSlots.some((s) => s.isOpen && s.capacity > 0);

      let dayClosure: DayEffective["closure"] = null;
      if (!lunchOpen && !dinnerOpen) {
        const weekday = getISOWeekday(parseDateKey(dateKey));
        const serviceClosure = (service: "lunch" | "dinner", slots: typeof lunchSlots, closedByPeriod: boolean) =>
          resolveServiceClosure({
            closedByPeriod,
            slotCount: slots.length,
            manualCloseTimestamps: slots
              .map((s) => manualCloseAt.get(s.slotKey))
              .filter((t): t is number => t !== undefined),
            templateOpen: openTemplates.has(`${weekday}#${service}`),
          });
        dayClosure = resolveDayClosure(
          serviceClosure("lunch", lunchSlots, lunchClosed),
          serviceClosure("dinner", dinnerSlots, dinnerClosed)
        );
      }

      // Calculate effective values for each service
      // If a closure exists from specialPeriods, force isOpen to false
      result[dateKey] = {
        lunch: {
          isOpen: lunchOpen,
          capacityEffective: lunchClosed ? 0 : lunchSlots
            .filter((s) => s.isOpen)
            .reduce((sum, s) => sum + s.capacity, 0),
          covers: lunchReservations.reduce((sum, r) => sum + r.partySize, 0),
          reservationCount: lunchReservations.length,
        },
        dinner: {
          isOpen: dinnerOpen,
          capacityEffective: dinnerClosed ? 0 : dinnerSlots
            .filter((s) => s.isOpen)
            .reduce((sum, s) => sum + s.capacity, 0),
          covers: dinnerReservations.reduce((sum, r) => sum + r.partySize, 0),
          reservationCount: dinnerReservations.length,
        },
        pendingCount: dayReservations.filter((r) => r.status === "pending").length,
        periodName: periodNameMap.get(dateKey) ?? null,
        closure: dayClosure,
      };
    }

    return result;
  },
});
