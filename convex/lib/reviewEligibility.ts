/**
 * Règles d'envoi des demandes d'avis (email J+1).
 *
 * - Statut final de la réservation : tout statut génère l'envoi, sauf
 *   annulé (client ou restaurant), no-show, incident et refusé.
 * - Un même client ne reçoit pas plus d'une demande tous les 12 mois
 *   (un compte Google ne peut publier qu'un avis par établissement).
 *
 * Pure functions, testables.
 */

export const REVIEW_BLOCKED_STATUSES = ["cancelled", "noshow", "incident", "refused"] as const;

export const REVIEW_REQUEST_COOLDOWN_MS = 365 * 24 * 60 * 60 * 1000;

export function isReviewEligibleStatus(status: string): boolean {
  return !(REVIEW_BLOCKED_STATUSES as readonly string[]).includes(status);
}

/**
 * Normalise l'email pour la limite par client. Retourne null si l'adresse
 * est absente ou manifestement invalide (réservation téléphone sans email).
 */
export function normalizeReviewEmail(email: string | null | undefined): string | null {
  const normalized = (email ?? "").trim().toLowerCase();
  const at = normalized.indexOf("@");
  if (at <= 0 || at === normalized.length - 1) return null;
  return normalized;
}

export function isWithinReviewCooldown(lastRequestedAt: number | null, nowMs: number): boolean {
  if (lastRequestedAt === null) return false;
  return nowMs - lastRequestedAt < REVIEW_REQUEST_COOLDOWN_MS;
}

/**
 * Les N derniers mois ("YYYY-MM"), du plus ancien au plus récent,
 * à partir du dateKey du jour ("YYYY-MM-DD").
 */
export function lastMonthKeys(todayDateKey: string, count: number): string[] {
  const year = Number(todayDateKey.slice(0, 4));
  const month = Number(todayDateKey.slice(5, 7)); // 1-12
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const index = year * 12 + (month - 1) - i;
    const y = Math.floor(index / 12);
    const m = (index % 12) + 1;
    keys.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return keys;
}
