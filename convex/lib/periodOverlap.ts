/**
 * Règle métier : deux périodes spéciales ne peuvent jamais se chevaucher,
 * quel que soit leur type (ouverture ou fermeture). Bornes incluses.
 */

interface DatedPeriod {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
}

/** Première période existante qui chevauche [startDate, endDate], hors `excludeId`. */
export function findOverlappingPeriod<P extends DatedPeriod>(
  periods: ReadonlyArray<P>,
  startDate: string,
  endDate: string,
  excludeId?: string
): P | null {
  return (
    periods.find(
      (p) => p._id !== excludeId && !(endDate < p.startDate || startDate > p.endDate)
    ) ?? null
  );
}
