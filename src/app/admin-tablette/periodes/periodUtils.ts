import type { Doc } from "../../../../convex/_generated/dataModel";

export type Period = Doc<"specialPeriods">;
export type PeriodKind = "ouverture" | "fermeture";

const DAY_SHORT: Record<number, string> = { 1: "lun", 2: "mar", 3: "mer", 4: "jeu", 5: "ven", 6: "sam", 7: "dim" };

/** "open"/"modified" = ouverture, "closed" = fermeture (même règle que la page web) */
export function kindOf(period: Period): PeriodKind {
  return period.applyRules.status === "closed" ? "fermeture" : "ouverture";
}

function toUtc(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

/** 2026-10-19 → 19/10/2026 */
export function formatDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-");
  return `${d}/${m}/${y}`;
}

/** 2026-10-19 → 19/10 */
export function formatShortDate(dateKey: string): string {
  const [, m, d] = dateKey.split("-");
  return `${d}/${m}`;
}

/** [5,6,7] → "ven–dim", [6,7] → "sam, dim" */
export function formatDays(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 7) return "tous les jours";
  const consecutive = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (sorted.length >= 3 && consecutive) return `${DAY_SHORT[sorted[0]]}–${DAY_SHORT[sorted[sorted.length - 1]]}`;
  return sorted.map((d) => DAY_SHORT[d]).join(", ");
}

/** Libellé relatif à aujourd'hui : « Dans 11 jours », « En cours · encore 3 j »… */
export function relativeLabel(period: Period, todayKey: string): { label: string; current: boolean } {
  if (period.startDate <= todayKey) {
    const left = daysBetween(todayKey, period.endDate);
    return { label: left === 0 ? "Dernier jour" : `En cours · encore ${left} j`, current: true };
  }
  const until = daysBetween(todayKey, period.startDate);
  if (until === 1) return { label: "Demain", current: false };
  if (until < 60) return { label: `Dans ${until} jours`, current: false };
  return { label: `Dans ${Math.round(until / 30)} mois`, current: false };
}

export interface PeriodOverlap {
  other: Period;
  from: string;
  to: string;
}

/** Chevauchements entre une ouverture et une fermeture (la fermeture est prioritaire). */
export function overlapsOf(period: Period, all: Period[]): PeriodOverlap[] {
  const kind = kindOf(period);
  return all
    .filter((o) => o._id !== period._id && kindOf(o) !== kind)
    .filter((o) => !(period.endDate < o.startDate || period.startDate > o.endDate))
    .map((o) => ({
      other: o,
      from: period.startDate > o.startDate ? period.startDate : o.startDate,
      to: period.endDate < o.endDate ? period.endDate : o.endDate,
    }));
}

/** Date du jour au format YYYY-MM-DD (heure locale de la tablette) */
export function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
