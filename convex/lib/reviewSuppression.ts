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
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(nowMs));
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
