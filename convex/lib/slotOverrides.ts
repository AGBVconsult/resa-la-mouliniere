/**
 * Chargement des slotOverrides restreint à une plage de dates.
 *
 * Le slotKey commence par le dateKey (`${dateKey}#${service}#${timeKey}`),
 * on peut donc lire uniquement les overrides de la plage via l'index
 * by_restaurant_slotKey au lieu de charger tout l'historique du restaurant.
 */

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Charge les overrides (manual + period) dont le dateKey est dans
 * [startDateKey, endDateKey] (bornes incluses, format YYYY-MM-DD).
 */
export async function getSlotOverridesForDateRange(
  ctx: QueryCtx | MutationCtx,
  restaurantId: Id<"restaurants">,
  startDateKey: string,
  endDateKey: string
): Promise<{ manual: Doc<"slotOverrides">[]; period: Doc<"slotOverrides">[] }> {
  // "~" est trié après tous les séparateurs possibles ("#", "_") → inclut tout le dernier jour
  const overrides = await ctx.db
    .query("slotOverrides")
    .withIndex("by_restaurant_slotKey", (q) =>
      q.eq("restaurantId", restaurantId).gte("slotKey", startDateKey).lt("slotKey", `${endDateKey}~`)
    )
    .collect();

  return {
    manual: overrides.filter((o) => o.origin === "manual"),
    period: overrides.filter((o) => o.origin === "period"),
  };
}
