/**
 * Couverture des fermetures exceptionnelles (specialPeriods status="closed").
 *
 * Règle métier : quand une ouverture et une fermeture se chevauchent,
 * la fermeture est toujours prioritaire. Les générateurs de créneaux des
 * ouvertures consultent cette couverture pour ne rien ouvrir sur un jour fermé.
 */

import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Service = "lunch" | "dinner";

interface ClosureLike {
  startDate: string;
  endDate: string;
  applyRules: { status: string; services: Service[]; activeDays: number[] };
}

/** dateKey → services fermés ce jour-là */
export type ClosureCoverage = Map<string, Set<Service>>;

function* dateKeysBetween(startDateKey: string, endDateKey: string): Generator<string> {
  const [y, m, d] = startDateKey.split("-").map(Number);
  const current = new Date(Date.UTC(y, m - 1, d));
  for (;;) {
    const key = current.toISOString().slice(0, 10);
    if (key > endDateKey) return;
    yield key;
    current.setUTCDate(current.getUTCDate() + 1);
  }
}

function isoWeekday(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day === 0 ? 7 : day;
}

/**
 * Construit la couverture des fermetures sur [rangeStart, rangeEnd] (bornes incluses).
 * Les périodes dont le statut n'est pas "closed" sont ignorées.
 */
export function buildClosureCoverage(
  periods: ReadonlyArray<ClosureLike>,
  rangeStart: string,
  rangeEnd: string
): ClosureCoverage {
  const coverage: ClosureCoverage = new Map();
  for (const period of periods) {
    if (period.applyRules.status !== "closed") continue;
    const from = period.startDate > rangeStart ? period.startDate : rangeStart;
    const to = period.endDate < rangeEnd ? period.endDate : rangeEnd;
    if (from > to) continue;
    for (const dateKey of dateKeysBetween(from, to)) {
      if (!period.applyRules.activeDays.includes(isoWeekday(dateKey))) continue;
      const services = coverage.get(dateKey) ?? new Set<Service>();
      for (const service of period.applyRules.services) services.add(service);
      coverage.set(dateKey, services);
    }
  }
  return coverage;
}

export function isClosedBy(coverage: ClosureCoverage, dateKey: string, service: Service): boolean {
  return coverage.get(dateKey)?.has(service) ?? false;
}

/** Charge les fermetures du restaurant qui touchent [rangeStart, rangeEnd]. */
export async function loadClosureCoverage(
  ctx: QueryCtx | MutationCtx,
  restaurantId: Id<"restaurants">,
  rangeStart: string,
  rangeEnd: string
): Promise<ClosureCoverage> {
  const candidates = await ctx.db
    .query("specialPeriods")
    .withIndex("by_restaurant_dates", (q) => q.eq("restaurantId", restaurantId).lte("startDate", rangeEnd))
    .collect();
  return buildClosureCoverage(
    candidates.filter((p) => p.endDate >= rangeStart),
    rangeStart,
    rangeEnd
  );
}
