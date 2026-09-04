/**
 * Migrations de données ponctuelles (internalMutation, à lancer via
 * `npx convex run migrations:<nom> '{...}'`).
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { makeSlotKey } from "../spec/contracts.generated";

const SLOT_KEY_REGEX = /^\d{4}-\d{2}-\d{2}#(lunch|dinner)#\d{2}:\d{2}$/;
const BATCH = 500;

/**
 * Répare les `reservations.slotKey` malformés.
 *
 * `admin.updateReservationFull` écrivait `date:service:heure` (audit BUG-001) :
 * ces réservations étaient invisibles pour les calculs de capacité. La clé
 * correcte est recomposée depuis `dateKey`, `service` et `timeKey`.
 *
 * Usage :
 *   npx convex run migrations:repairSlotKeys '{"dryRun": true}'   # inventaire
 *   npx convex run migrations:repairSlotKeys '{}'                 # réparation
 * La mutation se replanifie elle-même par lots de 500.
 */
export const repairSlotKeys = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { cursor, dryRun }) => {
    const page = await ctx.db.query("reservations").paginate({ numItems: BATCH, cursor: cursor ?? null });

    let repaired = 0;
    const samples: string[] = [];

    for (const r of page.page) {
      const expected = makeSlotKey({ dateKey: r.dateKey, service: r.service, timeKey: r.timeKey });
      if (r.slotKey === expected && SLOT_KEY_REGEX.test(r.slotKey)) continue;
      repaired++;
      if (samples.length < 10) samples.push(`${r._id}: ${r.slotKey} → ${expected}`);
      if (!dryRun) {
        await ctx.db.patch(r._id, { slotKey: expected });
      }
    }

    console.log("migrations.repairSlotKeys", {
      scanned: page.page.length,
      repaired,
      dryRun: !!dryRun,
      isDone: page.isDone,
      samples,
    });

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.migrations.repairSlotKeys, {
        cursor: page.continueCursor,
        dryRun,
      });
    }

    return { scanned: page.page.length, repaired, isDone: page.isDone, samples };
  },
});
