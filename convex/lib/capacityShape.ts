/**
 * PRD-013 — Typologie restante par créneau (Slot Capacity Shape)
 *
 * Moteur de décision centralisé, pur et testable, pour la contrainte
 * opérationnelle optionnelle "typologie restante".
 *
 * Principes non négociables (voir PRD-013) :
 * - OFF par défaut : `capacityShapeAllows()` doit toujours retourner `true`
 *   quand la typologie est désactivée ou absente.
 * - Aucune déduction depuis le plan de salle : ce module ne connaît ni
 *   `tableIds`, ni les tables physiques, ni l'adjacence.
 * - Aucune combinaison automatique de plusieurs buckets.
 * - Best-fit : on consomme toujours le plus petit bucket compatible.
 * - `needsReview` suspend l'enforcement public (mais pas la visibilité admin).
 */

export type CapacityBucket = {
  maxPartySize: number;
  quantity: number;
};

export type CapacityShapeAllocationStatus = "allocated" | "released" | "bypassed";

export type CapacityShapeAllocationLike = {
  status: CapacityShapeAllocationStatus;
  configRevision: number;
  bucketMaxPartySize?: number | null;
};

export type CapacityShapeLike = {
  enabled: boolean;
  needsReview: boolean;
  buckets: CapacityBucket[];
  configRevision: number;
};

export type EvaluateCapacityShapeResult = {
  /** true si la typologie est active ET fiable (enabled && !needsReview) */
  enforced: boolean;
  /** true si la party peut être acceptée (toujours true si !enforced) */
  allowed: boolean;
  /** bucket consommé (maxPartySize) ou null si aucun bucket compatible */
  selectedBucket: number | null;
  /** buckets restants après déduction des allocations actives */
  remainingBuckets: CapacityBucket[];
};

/**
 * Normalise une liste de buckets :
 * - fusionne les buckets de même `maxPartySize` (somme des quantités)
 * - ignore les `maxPartySize < 1`
 * - force `quantity >= 0`
 * - trie par `maxPartySize` croissant
 */
export function normalizeBuckets(buckets: CapacityBucket[]): CapacityBucket[] {
  const byMaxPartySize = new Map<number, number>();
  for (const bucket of buckets) {
    if (!Number.isFinite(bucket.maxPartySize) || bucket.maxPartySize < 1) continue;
    const quantity = Number.isFinite(bucket.quantity) ? Math.max(0, bucket.quantity) : 0;
    byMaxPartySize.set(bucket.maxPartySize, (byMaxPartySize.get(bucket.maxPartySize) ?? 0) + quantity);
  }
  return Array.from(byMaxPartySize.entries())
    .map(([maxPartySize, quantity]) => ({ maxPartySize, quantity }))
    .sort((a, b) => a.maxPartySize - b.maxPartySize);
}

/**
 * Capacité commerciale (en couverts) représentée par une liste de buckets.
 * `configuredSeatCapacity = sum(maxPartySize * quantity)`
 */
export function computeConfiguredSeatCapacity(buckets: CapacityBucket[]): number {
  return buckets.reduce((sum, b) => sum + b.maxPartySize * Math.max(0, b.quantity), 0);
}

/**
 * Calcule les buckets réellement restants pour une révision de configuration donnée :
 * part de `buckets`, ne prend en compte que les allocations `allocated` de la
 * même `configRevision`, et soustrait un bucket par allocation.
 * Les allocations d'une révision différente n'influencent jamais le snapshot courant.
 */
export function computeRemainingBuckets(args: {
  buckets: CapacityBucket[];
  allocations: CapacityShapeAllocationLike[];
  configRevision: number;
}): CapacityBucket[] {
  const consumedByBucket = new Map<number, number>();
  for (const allocation of args.allocations) {
    if (allocation.status !== "allocated") continue;
    if (allocation.configRevision !== args.configRevision) continue;
    if (allocation.bucketMaxPartySize == null) continue;
    consumedByBucket.set(
      allocation.bucketMaxPartySize,
      (consumedByBucket.get(allocation.bucketMaxPartySize) ?? 0) + 1
    );
  }

  return normalizeBuckets(args.buckets).map((bucket) => ({
    maxPartySize: bucket.maxPartySize,
    quantity: Math.max(0, bucket.quantity - (consumedByBucket.get(bucket.maxPartySize) ?? 0)),
  }));
}

/**
 * Cherche le plus petit bucket disponible capable d'accueillir `partySize`.
 * Ne combine JAMAIS plusieurs buckets. Retourne `null` si aucun bucket ne convient.
 */
export function findBestFitBucket(remainingBuckets: CapacityBucket[], partySize: number): number | null {
  const eligible = remainingBuckets
    .filter((b) => b.quantity > 0 && b.maxPartySize >= partySize)
    .sort((a, b) => a.maxPartySize - b.maxPartySize);
  return eligible.length > 0 ? eligible[0].maxPartySize : null;
}

/** Alias sémantique de `findBestFitBucket`, utilisé au moment de l'allocation. */
export const selectBestFitBucket = findBestFitBucket;

/**
 * L'enforcement public n'est actif que si la typologie est activée ET fiable.
 * `needsReview` fait retomber le système sur le comportement de capacité classique.
 */
export function isCapacityShapeEnforced(shape: CapacityShapeLike | null | undefined): boolean {
  return !!shape && shape.enabled && !shape.needsReview;
}

/**
 * Moteur de décision unique. Toute vérification de typologie (availability,
 * reservations.create, admin) doit passer par cette fonction pour éviter
 * toute duplication de logique.
 */
export function evaluateCapacityShape(args: {
  shape: CapacityShapeLike | null | undefined;
  allocations: CapacityShapeAllocationLike[];
  partySize: number;
}): EvaluateCapacityShapeResult {
  const enforced = isCapacityShapeEnforced(args.shape);
  if (!enforced || !args.shape) {
    return { enforced: false, allowed: true, selectedBucket: null, remainingBuckets: [] };
  }

  const remainingBuckets = computeRemainingBuckets({
    buckets: args.shape.buckets,
    allocations: args.allocations,
    configRevision: args.shape.configRevision,
  });
  const selectedBucket = findBestFitBucket(remainingBuckets, args.partySize);

  return {
    enforced: true,
    allowed: selectedBucket !== null,
    selectedBucket,
    remainingBuckets,
  };
}

/**
 * Raccourci booléen pour les points d'intégration qui n'ont besoin que de la
 * réponse allowed/refused (ex : filtrage `availability.getDay`).
 */
export function canAcceptParty(args: {
  shape: CapacityShapeLike | null | undefined;
  allocations: CapacityShapeAllocationLike[];
  partySize: number;
}): boolean {
  return evaluateCapacityShape(args).allowed;
}

export type ValidateCapacityShapeResult =
  | { ok: true; normalizedBuckets: CapacityBucket[]; configuredSeatCapacity: number }
  | { ok: false; reason: "EMPTY_SHAPE" | "EXCEEDS_REMAINING_CAPACITY" | "INVALID_BUCKET" };

/**
 * Valide une configuration de typologie avant sauvegarde (mutation `configure`).
 * - Une typologie active doit posséder au moins un bucket avec quantity > 0.
 * - `configuredSeatCapacity <= remainingCapacity` (un total inférieur est autorisé).
 */
export function validateCapacityShape(args: {
  enabled: boolean;
  buckets: CapacityBucket[];
  remainingCapacity: number;
}): ValidateCapacityShapeResult {
  for (const bucket of args.buckets) {
    if (!Number.isFinite(bucket.maxPartySize) || bucket.maxPartySize < 1) {
      return { ok: false, reason: "INVALID_BUCKET" };
    }
    if (!Number.isFinite(bucket.quantity) || bucket.quantity < 0) {
      return { ok: false, reason: "INVALID_BUCKET" };
    }
  }

  const normalizedBuckets = normalizeBuckets(args.buckets);

  if (args.enabled) {
    const hasAvailableBucket = normalizedBuckets.some((b) => b.quantity > 0);
    if (!hasAvailableBucket) {
      return { ok: false, reason: "EMPTY_SHAPE" };
    }
  }

  const configuredSeatCapacity = computeConfiguredSeatCapacity(normalizedBuckets);
  if (configuredSeatCapacity > args.remainingCapacity) {
    return { ok: false, reason: "EXCEEDS_REMAINING_CAPACITY" };
  }

  return { ok: true, normalizedBuckets, configuredSeatCapacity };
}
