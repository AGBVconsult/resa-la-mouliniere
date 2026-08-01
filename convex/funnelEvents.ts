/**
 * Funnel analytics events — append-only, fire-and-forget.
 *
 * record:          public mutation, called from widget via ConvexHttpClient
 * cleanup:         internalMutation, purges expired events (cron)
 * eraseBySession:  internalMutation, GDPR erasure via sessionId
 */

import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// 18 months retention
const RETENTION_MS = 18 * 30 * 24 * 60 * 60 * 1000;

// Max events per session (abuse protection on public endpoint)
const MAX_EVENTS_PER_SESSION = 200;

// Whitelist of accepted event names
const ALLOWED_EVENT_NAMES = new Set([
  "booking_step_view",
  "booking_guests_selected",
  "booking_baby_seating_selected",
  "booking_date_selected",
  "booking_time_slot_selected",
  "booking_no_slots_available",
  "booking_contact_form_error",
  "booking_policy_viewed",
  "booking_submitted",
  "booking_error",
  "booking_completed",
  "availability_rendered",
]);

/**
 * Record a single funnel event.
 * Resolves the active restaurant automatically (same pattern as bookingDrafts.save).
 * Silently drops the event if no active restaurant or analytics is disabled.
 */
export const record = mutation({
  args: {
    sessionId: v.string(),
    eventName: v.string(),
    step: v.optional(v.string()),
    device: v.optional(v.string()),
    language: v.optional(v.string()),
    referralSource: v.optional(v.string()),
    isReturning: v.optional(v.boolean()),
    props: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Find active restaurant
    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .first();

    if (!restaurant) return;

    // Check kill-switch
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", restaurant._id))
      .unique();

    if (!settings?.funnelAnalyticsEnabled) return;

    // Validate eventName against whitelist
    if (!ALLOWED_EVENT_NAMES.has(args.eventName)) return;

    // Per-session rate limit
    const sessionCount = await ctx.db
      .query("funnelEvents")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    if (sessionCount.length >= MAX_EVENTS_PER_SESSION) return;

    const now = Date.now();

    await ctx.db.insert("funnelEvents", {
      restaurantId: restaurant._id,
      sessionId: args.sessionId,
      ts: now,
      eventName: args.eventName,
      step: args.step,
      device: args.device,
      language: args.language,
      referralSource: args.referralSource,
      isReturning: args.isReturning,
      props: args.props,
      expiresAt: now + RETENTION_MS,
    });
  },
});

/**
 * Purge expired funnel events. Called by cron.
 * Processes in batches of 100 to stay within Convex limits.
 */
export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("funnelEvents")
      .withIndex("by_expiresAt")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .take(100);

    for (const event of expired) {
      await ctx.db.delete(event._id);
    }

    return { deleted: expired.length };
  },
});

/**
 * GDPR erasure: delete all funnel events for a given sessionId.
 */
export const eraseBySession = internalMutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("funnelEvents")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const event of events) {
      await ctx.db.delete(event._id);
    }

    return { deleted: events.length };
  },
});
