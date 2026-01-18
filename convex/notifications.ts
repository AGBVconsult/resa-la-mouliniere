/**
 * Push notifications for admin alerts.
 * Uses Pushover API for instant iPhone notifications.
 */

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { sendPushNotification } from "./lib/pushover";

/**
 * Send admin push notification for reservation events.
 * Called via scheduler from reservation mutations.
 */
export const sendAdminPushNotification = internalAction({
  args: {
    type: v.union(
      v.literal("pending_reservation"),
      v.literal("cancellation"),
      v.literal("modification")
    ),
    reservationId: v.id("reservations"),
  },
  handler: async (ctx, args) => {
    // 1. Get settings with Pushover credentials
    const settings = await ctx.runMutation(internal.settings.getSecretsInternal);
    
    if (!settings?.pushoverEnabled || !settings.pushoverUserKey || !settings.pushoverApiToken) {
      console.log("[Pushover] Disabled or not configured");
      return { sent: false, reason: "disabled" };
    }

    // 2. Get reservation details
    const reservation = await ctx.runQuery(internal.reservations._getById, {
      reservationId: args.reservationId,
    });

    if (!reservation) {
      console.error("[Pushover] Reservation not found:", args.reservationId);
      return { sent: false, reason: "reservation_not_found" };
    }

    // 3. Build notification content based on type
    const { title, message, sound } = buildNotificationContent(args.type, {
      name: `${reservation.firstName} ${reservation.lastName}`,
      partySize: reservation.partySize,
      dateKey: reservation.dateKey,
      timeKey: reservation.timeKey,
      note: reservation.note,
    });

    // 4. Build admin URL
    const adminUrl = `${settings.appUrl}/admin/reservations?date=${reservation.dateKey}`;

    // 5. Send push notification
    const result = await sendPushNotification(
      {
        userKey: settings.pushoverUserKey,
        apiToken: settings.pushoverApiToken,
      },
      {
        title,
        message,
        url: adminUrl,
        url_title: "Voir dans l'admin",
        priority: 1,  // High - bypass "Do Not Disturb"
        sound,
      }
    );

    if (result.success) {
      console.log(`[Pushover] ✓ Notification sent: ${args.type}`);
    } else {
      console.error(`[Pushover] ✗ Failed: ${result.error}`);
    }

    return { sent: result.success, error: result.error };
  },
});

/**
 * Build notification content based on event type.
 */
function buildNotificationContent(
  type: "pending_reservation" | "cancellation" | "modification",
  reservation: {
    name: string;
    partySize: number;
    dateKey: string;
    timeKey: string;
    note?: string | null;
  }
): { title: string; message: string; sound: string } {
  const { name, partySize, dateKey, timeKey, note } = reservation;
  
  // Format date as DD/MM
  const [, month, day] = dateKey.split("-");
  const dateFormatted = `${day}/${month}`;

  switch (type) {
    case "pending_reservation":
      return {
        title: "Réservation en attente",
        message: `${name} — ${partySize} pers.\n${dateFormatted} à ${timeKey}${note ? `\n${note}` : ""}`,
        sound: "cashregister",
      };

    case "cancellation":
      return {
        title: "Annulation",
        message: `${name} — ${partySize} pers.\n${dateFormatted} à ${timeKey}`,
        sound: "falling",
      };

    case "modification":
      return {
        title: "Modification",
        message: `${name} — ${partySize} pers.\n${dateFormatted} à ${timeKey}`,
        sound: "bike",
      };
  }
}
