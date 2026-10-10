"use node";

/**
 * Push notifications for admin alerts.
 * Uses standard Web Push (VAPID) to reach the admin mobile PWA — no third-party app.
 *
 * Required Convex env vars: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…).
 */

import webpush from "web-push";
import { internalAction, type ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  buildAdminPushPayload,
  buildGbpReminderPayload,
  isExpiredSubscriptionStatus,
  selectGbpReminders,
  type AdminPushPayload,
} from "./lib/webPush";
import { getTodayDateKey } from "./lib/dateUtils";

// Local hour (restaurant timezone) at which Google Business Profile reminders are sent
const GBP_REMINDER_HOUR = 9;

type SendResult = { sent: number; reason?: "not_configured" | "no_subscription" };

/**
 * Send one notification to every subscribed device.
 * Expired subscriptions (404/410) are removed.
 */
async function sendToAllDevices(
  ctx: ActionCtx,
  payload: AdminPushPayload,
  ttlSeconds: number
): Promise<SendResult> {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    console.log("[WebPush] Not configured (VAPID_* env vars missing)");
    return { sent: 0, reason: "not_configured" };
  }

  const subscriptions = await ctx.runQuery(internal.pushSubscriptions.listInternal);
  if (subscriptions.length === 0) {
    console.log("[WebPush] No subscribed device");
    return { sent: 0, reason: "no_subscription" };
  }

  const body = JSON.stringify(payload);
  let sent = 0;
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body,
        {
          vapidDetails: { subject, publicKey, privateKey },
          TTL: ttlSeconds,
          urgency: "high",
        }
      );
      sent++;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (isExpiredSubscriptionStatus(statusCode)) {
        console.log("[WebPush] Subscription expired, removing");
        await ctx.runMutation(internal.pushSubscriptions.removeExpiredInternal, {
          endpoint: sub.endpoint,
        });
      } else {
        console.error(`[WebPush] ✗ Failed (${statusCode ?? "?"}):`, error);
      }
    }
  }

  console.log(`[WebPush] ✓ "${payload.title}": ${sent}/${subscriptions.length} sent`);
  return { sent };
}

/**
 * Send admin push notification for reservation events.
 * Called via scheduler from reservation mutations.
 */
export const sendAdminPushNotification = internalAction({
  args: {
    type: v.union(
      v.literal("new_reservation"),
      v.literal("pending_reservation"),
      v.literal("modification"),
      v.literal("cancellation")
    ),
    reservationId: v.id("reservations"),
  },
  handler: async (ctx, args): Promise<SendResult | { sent: 0; reason: "reservation_not_found" }> => {
    const reservation = await ctx.runQuery(internal.reservations._getById, {
      reservationId: args.reservationId,
    });

    if (!reservation) {
      console.error("[WebPush] Reservation not found:", args.reservationId);
      return { sent: 0, reason: "reservation_not_found" };
    }

    const timezone = await ctx.runQuery(internal.pushSubscriptions.getRestaurantTimezoneInternal, {
      restaurantId: reservation.restaurantId,
    });
    const todayDateKey = timezone ? getTodayDateKey(timezone) : undefined;

    const payload = buildAdminPushPayload(args.type, {
      firstName: reservation.firstName,
      lastName: reservation.lastName,
      partySize: reservation.partySize,
      dateKey: reservation.dateKey,
      service: reservation.service,
      timeKey: reservation.timeKey,
      status: reservation.status,
      note: reservation.note,
    }, todayDateKey);

    return await sendToAllDevices(ctx, payload, 60 * 60); // 1h: a stale alert is useless
  },
});

/**
 * Daily reminder to update the Google Business Profile hours,
 * 3 days before each special period starts and ends.
 * Cron runs hourly (DST-safe) and only acts at GBP_REMINDER_HOUR local time.
 */
export const sendGbpPeriodReminders = internalAction({
  args: {},
  handler: async (ctx): Promise<{ skipped: string } | { reminders: number }> => {
    const data = await ctx.runQuery(internal.pushSubscriptions.getGbpReminderPeriodsInternal);
    if (!data) return { skipped: "no_active_restaurant" };

    const localHour = Number(
      new Intl.DateTimeFormat("en-GB", { timeZone: data.timezone, hour: "2-digit", hour12: false })
        .format(new Date())
    );
    if (localHour !== GBP_REMINDER_HOUR) return { skipped: `hour_${localHour}` };

    const reminders = selectGbpReminders(data.periods, getTodayDateKey(data.timezone));
    for (const reminder of reminders) {
      await sendToAllDevices(ctx, buildGbpReminderPayload(reminder), 12 * 60 * 60);
    }
    return { reminders: reminders.length };
  },
});
