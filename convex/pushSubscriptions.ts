/**
 * Web Push subscriptions for admin devices (mobile PWA).
 */

import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/rbac";
import { isAllowedPushEndpoint } from "./lib/webPush";

const MAX_SUBSCRIPTIONS = 20;

/**
 * Public VAPID key needed by the browser to subscribe.
 * Returns null when Web Push is not configured on the deployment.
 */
export const getVapidPublicKey = query({
  args: {},
  handler: async () => {
    return process.env.VAPID_PUBLIC_KEY ?? null;
  },
});

/**
 * Register (or refresh) the push subscription of the current device.
 */
export const subscribe = mutation({
  args: {
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "staff");

    if (!isAllowedPushEndpoint(args.endpoint)) {
      throw new Error("Endpoint de notification non reconnu");
    }

    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        p256dh: args.p256dh,
        auth: args.auth,
        userAgent: args.userAgent,
      });
      return { ok: true };
    }

    const all = await ctx.db.query("pushSubscriptions").take(MAX_SUBSCRIPTIONS);
    if (all.length >= MAX_SUBSCRIPTIONS) {
      throw new Error("Nombre maximal d'appareils abonnés atteint");
    }

    await ctx.db.insert("pushSubscriptions", {
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
      userAgent: args.userAgent,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

/**
 * Remove the push subscription of the current device.
 */
export const unsubscribe = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, "staff");

    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return { ok: true };
  },
});

export const listInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("pushSubscriptions").take(MAX_SUBSCRIPTIONS);
  },
});

/**
 * Remove a subscription the push service reported as expired (404/410).
 */
export const removeExpiredInternal = internalMutation({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const getRestaurantTimezoneInternal = internalQuery({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const restaurant = await ctx.db.get(args.restaurantId);
    return restaurant?.timezone ?? null;
  },
});

/**
 * Special periods of the active restaurant, for Google Business Profile reminders.
 */
export const getGbpReminderPeriodsInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();
    if (!restaurant) return null;

    const periods = await ctx.db
      .query("specialPeriods")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurant._id))
      .collect();

    return {
      timezone: restaurant.timezone,
      periods: periods
        .filter((p) => !p.deletedAt)
        .map((p) => ({
          name: p.name,
          status: p.applyRules.status,
          startDate: p.startDate,
          endDate: p.endDate,
        })),
    };
  },
});
