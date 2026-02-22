import { query } from "./_generated/server";
import { v } from "convex/values";
import { Errors } from "./lib/errors";

export function buildSettingsPublic(args: {
  restaurant: { _id: string; timezone: string };
  settings: { publicWidgetEnabled: boolean; turnstileSiteKey: string; maxPartySizeWidget: number };
}) {
  return {
    restaurantId: args.restaurant._id,
    publicWidgetEnabled: args.settings.publicWidgetEnabled,
    turnstileSiteKey: args.settings.turnstileSiteKey,
    maxPartySizeWidget: args.settings.maxPartySizeWidget,
    timezone: args.restaurant.timezone,
  };
}

export const getSettings = query({
  args: {
    lang: v.union(v.literal("fr"), v.literal("nl"), v.literal("en"), v.literal("de"), v.literal("it"), v.literal("es")),
  },
  handler: async (ctx) => {
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

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", restaurant._id))
      .unique();

    if (!settings) {
      throw Errors.SETTINGS_NOT_FOUND();
    }

    return buildSettingsPublic({
      restaurant,
      settings,
    });
  },
});
