/**
 * Background jobs for daily maintenance tasks.
 * 
 * Contract §7:
 * - dailyFinalize: Mark confirmed reservations as noshow, seated as completed
 * - cleanup: Remove expired tokens and idempotency keys
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Compute yesterday's dateKey in the given timezone.
 */
function computeYesterdayDateKey(now: number, timezone: string): string {
  const date = new Date(now);
  // Convert to timezone
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  // Get yesterday
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Format as YYYY-MM-DD
  return formatter.format(yesterday);
}

/**
 * Daily finalization job.
 * Runs at 03:00 daily.
 * 
 * Actions:
 * 1. Find all `confirmed` reservations from yesterday → mark as `noshow`
 * 2. Find all `seated` reservations from yesterday → mark as `completed`
 * 
 * This ensures no reservation stays in an intermediate state after the day ends.
 */
export const dailyFinalize = internalMutation({
  args: {
    now: v.number(),
  },
  handler: async (ctx, { now }) => {
    // Get active restaurant
    const activeRestaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(1);

    if (activeRestaurants.length === 0) {
      console.log("dailyFinalize: no active restaurant");
      return { confirmedToNoshow: 0, seatedToCompleted: 0 };
    }

    const restaurant = activeRestaurants[0];
    const yesterdayDateKey = computeYesterdayDateKey(now, restaurant.timezone);

    console.log("dailyFinalize: processing", { dateKey: yesterdayDateKey, timezone: restaurant.timezone });

    let confirmedToNoshow = 0;
    let seatedToCompleted = 0;

    // 1. Find confirmed reservations from yesterday → noshow
    const confirmedReservations = await ctx.db
      .query("reservations")
      .withIndex("by_restaurant_status", (q) =>
        q.eq("restaurantId", restaurant._id).eq("status", "confirmed")
      )
      .filter((q) => q.eq(q.field("dateKey"), yesterdayDateKey))
      .collect();

    for (const reservation of confirmedReservations) {
      await ctx.db.patch(reservation._id, {
        status: "noshow",
        noshowAt: now,
        updatedAt: now,
        version: reservation.version + 1,
      });

      // Log event
      await ctx.db.insert("reservationEvents", {
        reservationId: reservation._id,
        restaurantId: restaurant._id,
        eventType: "status_change",
        fromStatus: "confirmed",
        toStatus: "noshow",
        performedBy: "system",
        actualTime: now,
        metadata: { reason: "dailyFinalize: slot passed without check-in" },
        createdAt: now,
      });

      confirmedToNoshow++;
    }

    // 2. Find seated reservations from yesterday → completed
    const seatedReservations = await ctx.db
      .query("reservations")
      .withIndex("by_restaurant_status", (q) =>
        q.eq("restaurantId", restaurant._id).eq("status", "seated")
      )
      .filter((q) => q.eq(q.field("dateKey"), yesterdayDateKey))
      .collect();

    for (const reservation of seatedReservations) {
      await ctx.db.patch(reservation._id, {
        status: "completed",
        completedAt: now,
        updatedAt: now,
        version: reservation.version + 1,
      });

      // Log event
      await ctx.db.insert("reservationEvents", {
        reservationId: reservation._id,
        restaurantId: restaurant._id,
        eventType: "status_change",
        fromStatus: "seated",
        toStatus: "completed",
        performedBy: "system",
        actualTime: now,
        metadata: { reason: "dailyFinalize: auto-completed after service" },
        createdAt: now,
      });

      seatedToCompleted++;
    }

    console.log("dailyFinalize completed", {
      dateKey: yesterdayDateKey,
      confirmedToNoshow,
      seatedToCompleted,
    });

    return {
      dateKey: yesterdayDateKey,
      confirmedToNoshow,
      seatedToCompleted,
    };
  },
});

/**
 * Cleanup expired tokens and idempotency keys.
 * Runs at 04:00 daily.
 */
export const cleanup = internalMutation({
  args: {
    now: v.number(),
  },
  handler: async (ctx, { now }) => {
    let tokensDeleted = 0;
    let idempotencyDeleted = 0;

    // 1. Delete expired reservation tokens
    const expiredTokens = await ctx.db
      .query("reservationTokens")
      .withIndex("by_expiresAt")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .take(500);

    for (const token of expiredTokens) {
      await ctx.db.delete(token._id);
      tokensDeleted++;
    }

    // 2. Delete expired idempotency keys
    const expiredIdempotency = await ctx.db
      .query("idempotencyKeys")
      .withIndex("by_expiresAt")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .take(500);

    for (const key of expiredIdempotency) {
      await ctx.db.delete(key._id);
      idempotencyDeleted++;
    }

    console.log("cleanup completed", { tokensDeleted, idempotencyDeleted });

    return { tokensDeleted, idempotencyDeleted };
  },
});
