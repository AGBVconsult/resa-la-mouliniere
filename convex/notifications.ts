"use node";

/**
 * Push notifications for admin alerts.
 * Uses standard Web Push (VAPID) to reach the admin mobile PWA — no third-party app.
 *
 * Required Convex env vars: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…).
 */

import webpush from "web-push";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { buildAdminPushPayload, isExpiredSubscriptionStatus } from "./lib/webPush";

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
  handler: async (ctx, args) => {
    // 1. VAPID configuration
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;

    if (!publicKey || !privateKey || !subject) {
      console.log("[WebPush] Not configured (VAPID_* env vars missing)");
      return { sent: 0, reason: "not_configured" };
    }

    // 2. Subscribed devices
    const subscriptions = await ctx.runQuery(internal.pushSubscriptions.listInternal);
    if (subscriptions.length === 0) {
      console.log("[WebPush] No subscribed device");
      return { sent: 0, reason: "no_subscription" };
    }

    // 3. Reservation details
    const reservation = await ctx.runQuery(internal.reservations._getById, {
      reservationId: args.reservationId,
    });

    if (!reservation) {
      console.error("[WebPush] Reservation not found:", args.reservationId);
      return { sent: 0, reason: "reservation_not_found" };
    }

    const payload = JSON.stringify(
      buildAdminPushPayload(args.type, {
        firstName: reservation.firstName,
        lastName: reservation.lastName,
        partySize: reservation.partySize,
        dateKey: reservation.dateKey,
        service: reservation.service,
        timeKey: reservation.timeKey,
        status: reservation.status,
        note: reservation.note,
      })
    );

    // 4. Send to every device
    let sent = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          {
            vapidDetails: { subject, publicKey, privateKey },
            TTL: 60 * 60, // 1h: a stale alert is useless
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

    console.log(`[WebPush] ✓ ${args.type}: ${sent}/${subscriptions.length} sent`);
    return { sent };
  },
});
