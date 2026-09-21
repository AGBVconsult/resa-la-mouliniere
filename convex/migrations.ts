/**
 * One-off data repair migrations (internal only — run from the CLI or dashboard).
 *
 *   npx convex run migrations:repairReservationInvariants '{"dryRun":true}'
 *   npx convex run migrations:repairReservationInvariants '{}'
 *
 * Context: until sprint 0 (2026-09), `admin.updateReservationFull` wrote
 * `slotKey` with `:` separators (`2026-09-21:lunch:12:30` instead of
 * `2026-09-21#lunch#12:30`) and computed `partySize` without babies.
 * Reservations edited from the tablet / client modal therefore disappeared
 * from every `by_restaurant_slotKey` lookup (widget capacity, template sync).
 *
 * The migration walks the whole `reservations` table in pages of 200 and
 * re-derives both fields from their sources of truth. It self-schedules the
 * next page so a single run never exceeds the Convex read limits.
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { makeSlotKey, computePartySize } from "../spec/contracts.generated";

const PAGE_SIZE = 200;

export const repairReservationInvariants = internalMutation({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    dryRun: v.optional(v.boolean()),
    // Running totals carried across pages (for the final log line).
    totals: v.optional(
      v.object({ scanned: v.number(), slotKeyFixed: v.number(), partySizeFixed: v.number() })
    ),
  },
  handler: async (ctx, { cursor = null, dryRun = false, totals }) => {
    const running = totals ?? { scanned: 0, slotKeyFixed: 0, partySizeFixed: 0 };

    const page = await ctx.db.query("reservations").paginate({ numItems: PAGE_SIZE, cursor });

    for (const r of page.page) {
      running.scanned++;

      const expectedSlotKey = makeSlotKey({ dateKey: r.dateKey, service: r.service, timeKey: r.timeKey });
      const expectedPartySize = computePartySize(r.adults, r.childrenCount, r.babyCount);

      const patch: { slotKey?: string; partySize?: number } = {};
      if (r.slotKey !== expectedSlotKey) {
        patch.slotKey = expectedSlotKey;
        running.slotKeyFixed++;
      }
      if (r.partySize !== expectedPartySize) {
        patch.partySize = expectedPartySize;
        running.partySizeFixed++;
      }

      if (Object.keys(patch).length > 0) {
        // Log without PII
        console.log("repairReservationInvariants", { reservationId: r._id, ...patch, dryRun });
        if (!dryRun) {
          await ctx.db.patch(r._id, patch);
        }
      }
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.migrations.repairReservationInvariants, {
        cursor: page.continueCursor,
        dryRun,
        totals: running,
      });
      return { done: false, ...running };
    }

    console.log("repairReservationInvariants completed", { dryRun, ...running });
    return { done: true, ...running };
  },
});
