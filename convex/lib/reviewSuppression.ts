/**
 * Fenêtre pendant laquelle les demandes d'avis d'un service peuvent être
 * suspendues / réactivées. Pure function, testable.
 *
 * - Aujourd'hui (midi et soir) : toujours ouvert — pendant le midi on peut
 *   anticiper le soir.
 * - Hier : ouvert jusqu'à 06:30 heure locale (fins de service après minuit),
 *   avant que le cron enqueue-reviews ne mette les emails en file.
 * - Jours à venir et plus anciens : fermé.
 */

import { computeTodayDateKey, computeYesterdayDateKey } from "./email/ops";

export const REVIEW_SUPPRESSION_YESTERDAY_CUTOFF = "06:30";

function getLocalTimeKey(timezone: string, nowMs: number): string {
  // Même format que dateUtils.getCurrentTimeKey (déjà utilisé en production).
  // Certains moteurs rendent minuit "24:xx" avec hour12:false → normalisé.
  const timeKey = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(nowMs));
  return timeKey.startsWith("24") ? `00${timeKey.slice(2)}` : timeKey;
}

export function isReviewSuppressionWindowOpen(
  dateKey: string,
  timezone: string,
  nowMs: number
): boolean {
  if (dateKey === computeTodayDateKey(timezone, nowMs)) return true;
  if (dateKey === computeYesterdayDateKey(timezone, nowMs)) {
    return getLocalTimeKey(timezone, nowMs) < REVIEW_SUPPRESSION_YESTERDAY_CUTOFF;
  }
  return false;
}
