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

export const NOTE_ICON = "📝";

const WEEKDAYS = ["Dim", "Lun", "Mar", "Merc", "Jeu", "Vend", "Sam"];

/**
 * "Vend 09/10 | 12:15 | 2pers. | B. Vantilcke"
 */
export function formatReservationLine(reservation: {
  firstName: string;
  lastName: string;
  partySize: number;
  dateKey: string;
  timeKey: string;
}): string {
  const { firstName, lastName, partySize, dateKey, timeKey } = reservation;
  const [year, month, day] = dateKey.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");

  const initial = firstName.trim().charAt(0).toUpperCase();
  const name = initial ? `${initial}. ${lastName.trim()}` : lastName.trim();

  return `${weekday} ${dd}/${mm} | ${timeKey} | ${partySize}pers. | ${name}`;
}

/**
 * Build notification content based on event type.
 * Title ends with an icon: ✅ new, ⏳ needs validation, 🔄 modification, ❌ cancellation.
 */
export function buildAdminPushPayload(
  type: AdminPushType,
  reservation: {
    firstName: string;
    lastName: string;
    partySize: number;
    dateKey: string;
    service: "lunch" | "dinner";
    timeKey: string;
    status: string;
    note?: string | null;
  }
): AdminPushPayload {
  const { dateKey, service, status, note } = reservation;

  const line = formatReservationLine(reservation);
  // The note itself is not shown, only an icon flagging that there is one
  const body = note?.trim() ? `${line} | ${NOTE_ICON}` : line;
  const url = `/admin-mobile/reservations?date=${dateKey}&service=${service}`;

  switch (type) {
    case "new_reservation":
      return { title: "Nouvelle réservation ✅", body, url };

    case "pending_reservation":
      return { title: "Réservation en attente ⏳", body, url };

    case "cancellation":
      return { title: "Annulation ❌", body, url };

    case "modification":
      return {
        title: status === "pending" ? "Modification à valider ⏳" : "Modification 🔄",
        body,
        url,
      };
  }
}
