/**
 * Pure helpers for admin Web Push notifications.
 * (Sending itself lives in convex/notifications.ts, Node runtime.)
 */

export type AdminPushType =
  | "new_reservation"
  | "pending_reservation"
  | "modification"
  | "cancellation";

export interface AdminPushPayload {
  title: string;
  body: string;
  url: string;
}

// Push services of Safari/iOS, Chrome/Android, Firefox and Edge.
const ALLOWED_PUSH_HOSTS = [
  "web.push.apple.com",
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "notify.windows.com",
];

/**
 * Only accept HTTPS endpoints of known push services, so the backend never
 * POSTs to an arbitrary URL.
 */
export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return ALLOWED_PUSH_HOSTS.some(
    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
  );
}

/**
 * 404/410 from the push service: the subscription is gone and must be deleted.
 */
export function isExpiredSubscriptionStatus(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410;
}

/**
 * Build notification content based on event type.
 */
export function buildAdminPushPayload(
  type: AdminPushType,
  reservation: {
    name: string;
    partySize: number;
    dateKey: string;
    service: "lunch" | "dinner";
    timeKey: string;
    status: string;
    note?: string | null;
  }
): AdminPushPayload {
  const { name, partySize, dateKey, service, timeKey, status, note } = reservation;

  // Format date as DD/MM
  const [, month, day] = dateKey.split("-");
  const dateFormatted = `${day}/${month}`;
  const summary = `${name} — ${partySize} pers.\n${dateFormatted} à ${timeKey}`;

  const url = `/admin-mobile/reservations?date=${dateKey}&service=${service}`;
  const withNote = `${summary}${note ? `\n${note}` : ""}`;

  switch (type) {
    case "new_reservation":
      return { title: "Nouvelle réservation", body: withNote, url };

    case "pending_reservation":
      return { title: "Réservation en attente", body: withNote, url };

    case "cancellation":
      return { title: "Annulation", body: summary, url };

    case "modification":
      return {
        title: status === "pending" ? "Modification à valider" : "Modification",
        body: withNote,
        url,
      };
  }
}
