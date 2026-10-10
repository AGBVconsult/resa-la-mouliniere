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

export const NOTE_ICON = "💬";

const WEEKDAYS = ["Dim", "Lun", "Mar", "Merc", "Jeu", "Vend", "Sam"];
const MONTHS = ["Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];

/**
 * "2026-10-10" → "Sam 10 Oct"
 */
export function formatDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${weekday} ${day} ${MONTHS[month - 1]}`;
}

/**
 * "Vend 9 Oct | 12:15 | 2pers. | B. Vantilcke" — "Auj." instead of the date for today.
 */
export function formatReservationLine(
  reservation: {
    firstName: string;
    lastName: string;
    partySize: number;
    dateKey: string;
    timeKey: string;
  },
  todayDateKey?: string
): string {
  const { firstName, lastName, partySize, dateKey, timeKey } = reservation;
  const date = dateKey === todayDateKey ? "Auj." : formatDateLabel(dateKey);

  const initial = firstName.trim().charAt(0).toUpperCase();
  const name = initial ? `${initial}. ${lastName.trim()}` : lastName.trim();

  return `${date} | ${timeKey} | ${partySize}pers. | ${name}`;
}

/**
 * Build notification content based on event type.
 * Title ends with an icon: ✅ new, ⌛ needs validation, 🔀 modification, 🚫 cancellation.
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
  },
  todayDateKey?: string
): AdminPushPayload {
  const { dateKey, service, status, note } = reservation;

  const line = formatReservationLine(reservation, todayDateKey);
  // The note itself is not shown, only an icon flagging that there is one
  const body = note?.trim() ? `${line} | ${NOTE_ICON}` : line;
  const url = `/admin-mobile/reservations?date=${dateKey}&service=${service}`;

  switch (type) {
    case "new_reservation":
      return { title: "Nouvelle réservation ✅", body, url };

    case "pending_reservation":
      return { title: "Réservation en attente ⌛", body, url };

    case "cancellation":
      return { title: "Annulation 🚫", body, url };

    case "modification":
      return {
        title: status === "pending" ? "Modification à valider ⌛" : "Modification 🔀",
        body,
        url,
      };
  }
}

// ---------------------------------------------------------------------------
// Google Business Profile reminders for special periods
// ---------------------------------------------------------------------------

export const GBP_REMINDER_DAYS_BEFORE = 3;
export const GBP_REMINDER_URL = "/admin-mobile/fiche-google";

type PeriodStatus = "open" | "modified" | "closed";

export interface GbpReminderPeriod {
  name: string;
  status: PeriodStatus;
  startDate: string;
  endDate: string;
}

export interface GbpReminder {
  kind: "start" | "end";
  period: GbpReminderPeriod;
}

const PERIOD_STATUS_LABELS: Record<PeriodStatus, string> = {
  closed: "Fermé",
  modified: "Horaires modifiés",
  open: "Ouvert",
};

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/**
 * Periods starting or ending exactly GBP_REMINDER_DAYS_BEFORE days after today.
 */
export function selectGbpReminders(periods: GbpReminderPeriod[], todayDateKey: string): GbpReminder[] {
  const target = addDaysToDateKey(todayDateKey, GBP_REMINDER_DAYS_BEFORE);
  const reminders: GbpReminder[] = [];
  for (const period of periods) {
    if (period.startDate === target) reminders.push({ kind: "start", period });
    // A single-day period only needs the start reminder (it says when it ends)
    if (period.endDate === target && period.endDate !== period.startDate) {
      reminders.push({ kind: "end", period });
    }
  }
  return reminders;
}

/**
 * Start: "Début dans 3j | Vacances | Fermé | Lun 20 Oct → Dim 2 Nov"
 * End:   "Fin dans 3j | Vacances | Horaires habituels dès Lun 3 Nov"
 */
export function buildGbpReminderPayload({ kind, period }: GbpReminder): AdminPushPayload {
  const days = `${GBP_REMINDER_DAYS_BEFORE}j`;
  const dates =
    period.startDate === period.endDate
      ? formatDateLabel(period.startDate)
      : `${formatDateLabel(period.startDate)} → ${formatDateLabel(period.endDate)}`;
  const body =
    kind === "start"
      ? `Début dans ${days} | ${period.name} | ${PERIOD_STATUS_LABELS[period.status]} | ${dates}`
      : `Fin dans ${days} | ${period.name} | Horaires habituels dès ${formatDateLabel(addDaysToDateKey(period.endDate, 1))}`;
  return { title: "Fiche Google à mettre à jour 📍", body, url: GBP_REMINDER_URL };
}
