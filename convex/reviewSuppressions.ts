/**
 * Suspension des demandes d'avis pour tout un service (tablette uniquement).
 *
 * Cas d'usage : livraison de moules de qualité inférieure — on anticipe des
 * avis moins bons en n'envoyant aucune demande d'avis au service concerné.
 * Aucun statut de réservation n'est modifié ; enqueueReviewEmails lit la table
 * serviceReviewSuppressions et saute le service.
 */

import { query, mutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/rbac";
import { Errors } from "./lib/errors";
import { isValidDateKey } from "./lib/dateUtils";
import { isReviewSuppressionWindowOpen } from "./lib/reviewSuppression";

const serviceValidator = v.union(v.literal("lunch"), v.literal("dinner"));

async function getActiveRestaurant(ctx: QueryCtx) {
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
  return activeRestaurants[0];
}

export const getForService = query({
  args: { dateKey: v.string(), service: serviceValidator },
  handler: async (ctx, { dateKey, service }) => {
    await requireRole(ctx, "admin");
    const restaurant = await getActiveRestaurant(ctx);

    const existing = await ctx.db
      .query("serviceReviewSuppressions")
      .withIndex("by_restaurant_date_service", (q) =>
        q.eq("restaurantId", restaurant._id).eq("dateKey", dateKey).eq("service", service)
      )
      .first();

    return {
      suppressed: existing !== null,
      // Évalué au moment de la requête : la bascule à 06:30 est rattrapée au
      // prochain rendu, et la mutation revérifie de toute façon la fenêtre.
      canToggle: isReviewSuppressionWindowOpen(dateKey, restaurant.timezone, Date.now()),
    };
  },
});

export const setForService = mutation({
  args: { dateKey: v.string(), service: serviceValidator, suppressed: v.boolean() },
  handler: async (ctx, { dateKey, service, suppressed }) => {
    await requireRole(ctx, "admin");

    if (!isValidDateKey(dateKey)) {
      throw Errors.INVALID_INPUT("dateKey", "Invalid date format");
    }

    const restaurant = await getActiveRestaurant(ctx);
    const now = Date.now();

    if (!isReviewSuppressionWindowOpen(dateKey, restaurant.timezone, now)) {
      throw Errors.INVALID_INPUT(
        "dateKey",
        "Les demandes d'avis ne peuvent être modifiées que pour les services du jour"
      );
    }

    const existing = await ctx.db
      .query("serviceReviewSuppressions")
      .withIndex("by_restaurant_date_service", (q) =>
        q.eq("restaurantId", restaurant._id).eq("dateKey", dateKey).eq("service", service)
      )
      .collect();

    if (suppressed) {
      if (existing.length === 0) {
        await ctx.db.insert("serviceReviewSuppressions", {
          restaurantId: restaurant._id,
          dateKey,
          service,
          createdBy: (await ctx.auth.getUserIdentity())?.subject ?? "admin",
          createdAt: now,
        });
      }
    } else {
      for (const doc of existing) {
        await ctx.db.delete(doc._id);
      }
    }

    return { suppressed };
  },
});
