/**
 * Settings queries (internal and public).
 */

import { internalMutation, internalQuery } from "./_generated/server";
import { Errors } from "./lib/errors";
import { resolveSecrets } from "./lib/secrets";

/**
 * Enable Pushover notifications (one-time setup).
 */
export const enablePushover = internalMutation({
  args: {},
  handler: async (ctx) => {
    const activeRestaurants = await ctx.db
      .query("restaurants")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(1);

    if (activeRestaurants.length === 0) return { ok: false };

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", activeRestaurants[0]._id))
      .unique();

    if (!settings) return { ok: false };

    await ctx.db.patch(settings._id, { pushoverEnabled: true });
    return { ok: true };
  },
});

/**
 * Paramètres incluant les secrets, pour les actions uniquement (jamais renvoyés au client).
 * Les secrets viennent des variables d'environnement Convex ; la base sert de repli
 * (voir lib/secrets.ts).
 */
export const getSecretsInternal = internalQuery({
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

    const secrets = resolveSecrets(settings, process.env);
    if (secrets.fromDatabase.length > 0) {
      // Diagnostic sans valeur : indique les variables d'environnement encore à définir.
      console.warn("[settings] secrets lus depuis la base (à migrer en variables d'environnement)", {
        fields: secrets.fromDatabase,
      });
    }

    return {
      restaurantId: restaurant._id,
      timezone: restaurant.timezone,
      appUrl: secrets.appUrl,
      turnstileSecretKey: secrets.turnstileSecretKey,
      manageTokenExpireBeforeSlotMs: settings.manageTokenExpireBeforeSlotMs,
      maxPartySizeWidget: settings.maxPartySizeWidget,
      rateLimit: settings.rateLimit,
      // Email settings (from SettingsAdmin in contract)
      resendApiKey: secrets.resendApiKey,
      resendFromEmail: settings.resendFromEmail,
      resendFromName: settings.resendFromName,
      adminNotificationEmail: settings.adminNotificationEmail,
      // Pushover push notifications
      pushoverUserKey: secrets.pushoverUserKey,
      pushoverApiToken: secrets.pushoverApiToken,
      pushoverEnabled: settings.pushoverEnabled,
    };
  },
});
