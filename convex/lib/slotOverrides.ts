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

/**
 * Capacité effective d'un slot avant modification : MANUAL > PERIOD > slot.
 */
export function resolveEffectiveCapacity(
  slotCapacity: number,
  overrides: ReadonlyArray<{ origin: string; patch: { capacity?: number } }>
): number {
  const manual = overrides.find((o) => o.origin === "manual");
  if (manual?.patch.capacity !== undefined) return manual.patch.capacity;
  const period = overrides.find((o) => o.origin === "period");
  if (period?.patch.capacity !== undefined) return period.patch.capacity;
  return slotCapacity;
}

/**
 * PRD-013 §31 — seule une modification RÉELLE de capacité rend la typologie
 * « à revoir ». Réenvoyer la même capacité (ex. simple ouverture/fermeture du
 * créneau) ne doit jamais suspendre la typologie côté widget.
 */
export function isCapacityChange(previousCapacity: number, nextCapacity: number | undefined): boolean {
  return nextCapacity !== undefined && nextCapacity !== previousCapacity;
}
