/**
 * Détecte si une réservation a été enregistrée pendant son propre service
 * (ex: réservation créée à 12h40 pour le service du midi du jour même).
 *
 * Fenêtre de service = [premier créneau ; dernier créneau + SERVICE_TAIL_MINUTES]
 * dans le fuseau du restaurant. Si les créneaux ne sont pas connus, on se rabat
 * sur des horaires par défaut.
 *
 * Dès que le staff a agi sur la réservation (acknowledgedAt), elle n'est plus signalée.
 */

export const RESTAURANT_TIMEZONE = "Europe/Brussels";
const SERVICE_TAIL_MINUTES = 150;

const DEFAULT_WINDOWS: Record<"lunch" | "dinner", { start: string; end: string }> = {
  lunch: { start: "12:00", end: "15:00" },
  dinner: { start: "18:00", end: "22:00" },
};

function toMinutes(timeKey: string): number {
  const [h, m] = timeKey.split(":").map(Number);
  return h * 60 + m;
}

function getLocalDateAndMinutes(timestamp: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

export function isCreatedDuringService(
  reservation: {
    createdAt?: number;
    acknowledgedAt?: number;
    dateKey: string;
    service: "lunch" | "dinner";
  },
  slotTimeKeys?: string[],
  timeZone: string = RESTAURANT_TIMEZONE
): boolean {
  if (!reservation.createdAt || reservation.acknowledgedAt) return false;

  const created = getLocalDateAndMinutes(reservation.createdAt, timeZone);
  if (created.dateKey !== reservation.dateKey) return false;

  let start: number;
  let end: number;
  if (slotTimeKeys && slotTimeKeys.length > 0) {
    const minutes = slotTimeKeys.map(toMinutes);
    start = Math.min(...minutes);
    end = Math.max(...minutes) + SERVICE_TAIL_MINUTES;
  } else {
    start = toMinutes(DEFAULT_WINDOWS[reservation.service].start);
    end = toMinutes(DEFAULT_WINDOWS[reservation.service].end);
  }

  return created.minutes >= start && created.minutes <= end;
}
