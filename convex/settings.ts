/**
 * Settings queries (internal and public).
 */

import { internalMutation } from "./_generated/server";
import { Errors } from "./lib/errors";

/**
 * Internal mutation to get settings including secrets.
 * ONLY to be used from action().
 * Returns minimal data needed for reservation creation.
 * Note: Using internalMutation (not internalQuery) to comply with secret leak policy.
 */
export const getSecretsInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const activeRestaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(2);

    if (activeRestaurants.length === 0) {
      return null;
    }
    if (activeRestaurants.length > 1) {
      throw Errors.MULTIPLE_ACTIVE_RESTAURANTS(activeRestaurants.length);
    }

    const restaurant = activeRestaurants[0];

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", restaurant._id))
      .unique();

    if (!settings) {
      return null;
    }

    return {
      restaurantId: restaurant._id,
      timezone: restaurant.timezone,
      appUrl: settings.appUrl ?? "",
      turnstileSecretKey: settings.turnstileSecretKey,
      manageTokenExpireBeforeSlotMs: settings.manageTokenExpireBeforeSlotMs,
      rateLimit: settings.rateLimit,
      // Email settings (from SettingsAdmin in contract)
      resendApiKey: settings.resendApiKey,
      resendFromEmail: settings.resendFromEmail,
      resendFromName: settings.resendFromName,
      adminNotificationEmail: settings.adminNotificationEmail,
    };
  },
});
