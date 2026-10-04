/**
 * Statistiques des demandes d'avis (emails J+1), par mois du repas.
 * Source : table reviewRequests, alimentée par emails.enqueueReviewEmails.
 */

import { query } from "./_generated/server";
import { requireRole } from "./lib/rbac";
import { Errors } from "./lib/errors";
import { computeTodayDateKey } from "./lib/email/ops";
import { lastMonthKeys } from "./lib/reviewEligibility";

const MONTHS = 6;

export const getMonthlyStats = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

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

    const monthKeys = lastMonthKeys(computeTodayDateKey(restaurant.timezone, Date.now()), MONTHS);
    const requests = await ctx.db
      .query("reviewRequests")
      .withIndex("by_restaurant_dateKey", (q) =>
        q.eq("restaurantId", restaurant._id).gte("dateKey", `${monthKeys[0]}-01`)
      )
      .collect();

    const counts = new Map(monthKeys.map((key) => [key, 0]));
    for (const request of requests) {
      const key = request.dateKey.slice(0, 7);
      const current = counts.get(key);
      if (current !== undefined) counts.set(key, current + 1);
    }

    return monthKeys.map((monthKey) => ({ monthKey, sent: counts.get(monthKey) ?? 0 }));
  },
});
