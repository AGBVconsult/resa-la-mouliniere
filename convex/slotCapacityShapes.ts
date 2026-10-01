/**
 * PRD-013 — Typologie restante par créneau (Slot Capacity Shape).
 *
 * Contrainte opérationnelle optionnelle, désactivée par défaut, saisie
 * manuellement par l'humain (Allisson). Ne dépend jamais du plan de salle
 * physique (tableIds, adjacence, Shadow Learning).
 *
 * Ce module expose :
 * - des endpoints publics (query/mutation) pour la configuration admin ;
 * - des helpers internes (fonctions plain, prenant `ctx`) réutilisés par
 *   `availability.ts`, `reservations.ts` et `admin.ts` pour l'enforcement et
 *   l'allocation transactionnelle. Ces helpers ne créent PAS de nouvelle
 *   transaction Convex : ils lisent/écrivent avec le `ctx` de l'appelant afin
 *   que la vérification + l'allocation restent atomiques avec la réservation.
 */

import { query, mutation } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { Errors } from "./lib/errors";
import { requireRole } from "./lib/rbac";
import {
  normalizeBuckets,
  computeConfiguredSeatCapacity,
  computeRemainingBuckets,
  evaluateCapacityShape,
  validateCapacityShape,
  selectBestFitBucket,
  type CapacityBucket,
  type CapacityShapeAllocationLike,
  type EvaluateCapacityShapeResult,
} from "./lib/capacityShape";

// ═══════════════════════════════════════════════════════════════
// Statuts de réservation qui "occupent" un créneau (source unique,
// identique à availability.computeRemainingCapacityBySlotKey).
// ═══════════════════════════════════════════════════════════════
const ACTIVE_RESERVATION_STATUSES = new Set(["pending", "confirmed", "cardPlaced", "seated"]);

// ═══════════════════════════════════════════════════════════════
// HELPERS internes — lecture
// ═══════════════════════════════════════════════════════════════

export async function getShapeForSlotKey(
  ctx: QueryCtx | MutationCtx,
  restaurantId: Id<"restaurants">,
  slotKey: string
): Promise<Doc<"slotCapacityShapes"> | null> {
  return await ctx.db
    .query("slotCapacityShapes")
    .withIndex("by_restaurant_slotKey", (q) => q.eq("restaurantId", restaurantId).eq("slotKey", slotKey))
    .unique();
}

/**
 * Charge en batch toutes les shapes pour un ensemble de slotKeys — pour ne
 * jamais faire une query par slot (règle §21 du PRD).
 */
export async function getShapesForDate(
  ctx: QueryCtx | MutationCtx,
  restaurantId: Id<"restaurants">,
  dateKey: string
): Promise<Map<string, Doc<"slotCapacityShapes">>> {
  const shapes = await ctx.db
    .query("slotCapacityShapes")
    .withIndex("by_restaurant_date", (q) => q.eq("restaurantId", restaurantId).eq("dateKey", dateKey))
    .collect();
  const map = new Map<string, Doc<"slotCapacityShapes">>();
  for (const shape of shapes) map.set(shape.slotKey, shape);
  return map;
}

/**
 * Charge en batch toutes les shapes pour une plage de dates (mois complet) —
 * même contrainte "pas de query par slot".
 */
export async function getShapesForDateRange(
  ctx: QueryCtx | MutationCtx,
  restaurantId: Id<"restaurants">,
  startDate: string,
  endDate: string
): Promise<Map<string, Doc<"slotCapacityShapes">>> {
  const shapes = await ctx.db
    .query("slotCapacityShapes")
    .withIndex("by_restaurant_date", (q) => q.eq("restaurantId", restaurantId))
    .filter((q) => q.and(q.gte(q.field("dateKey"), startDate), q.lte(q.field("dateKey"), endDate)))
    .collect();
  const map = new Map<string, Doc<"slotCapacityShapes">>();
  for (const shape of shapes) map.set(shape.slotKey, shape);
  return map;
}

export async function getAllocationsForShape(
  ctx: QueryCtx | MutationCtx,
  shapeId: Id<"slotCapacityShapes">
): Promise<Doc<"slotCapacityShapeAllocations">[]> {
  return await ctx.db
    .query("slotCapacityShapeAllocations")
    .withIndex("by_shape_revision", (q) => q.eq("shapeId", shapeId))
    .collect();
}

function toAllocationLike(doc: Doc<"slotCapacityShapeAllocations">): CapacityShapeAllocationLike {
  return {
    status: doc.status,
    configRevision: doc.configRevision,
    bucketMaxPartySize: doc.bucketMaxPartySize ?? null,
  };
}

/**
 * Point d'entrée unique pour évaluer la typologie d'un slot pendant une
 * transaction (création, modification). Charge shape + allocations et
 * délègue la décision au moteur pur `evaluateCapacityShape`.
 */
export async function evaluateCapacityShapeForSlot(
  ctx: QueryCtx | MutationCtx,
  args: { restaurantId: Id<"restaurants">; slotKey: string; partySize: number }
): Promise<EvaluateCapacityShapeResult & { shape: Doc<"slotCapacityShapes"> | null }> {
  const shape = await getShapeForSlotKey(ctx, args.restaurantId, args.slotKey);
  if (!shape) {
    return { enforced: false, allowed: true, selectedBucket: null, remainingBuckets: [], shape: null };
  }
  const allocations = await getAllocationsForShape(ctx, shape._id);
  const result = evaluateCapacityShape({
    shape: {
      enabled: shape.enabled,
      needsReview: shape.needsReview,
      buckets: shape.buckets,
      configRevision: shape.configRevision,
    },
    allocations: allocations.map(toAllocationLike),
    partySize: args.partySize,
  });
  return { ...result, shape };
}

// ═══════════════════════════════════════════════════════════════
// HELPERS internes — écriture (allocation / libération / needsReview)
// Toujours appelés depuis une mutation existante : pas de nouvelle
// transaction, l'atomicité vient de ctx.db partagé avec l'appelant.
// ═══════════════════════════════════════════════════════════════

/**
 * Alloue le bucket sélectionné pour une réservation qui vient d'être créée
 * (ou déplacée). Doit être appelé APRÈS l'insertion de la réservation, dans
 * la même mutation. Incrémente `runtimeVersion` sur la shape pour garantir
 * que deux allocations concurrentes sur le dernier bucket se sérialisent via
 * l'OCC (optimistic concurrency control) de Convex.
 */
export async function allocateCapacityShapeBucket(
  ctx: MutationCtx,
  args: {
    restaurantId: Id<"restaurants">;
    shape: Doc<"slotCapacityShapes">;
    reservationId: Id<"reservations">;
    partySize: number;
    bucketMaxPartySize: number;
    source: "online" | "admin";
    now: number;
  }
): Promise<void> {
  await ctx.db.insert("slotCapacityShapeAllocations", {
    restaurantId: args.restaurantId,
    shapeId: args.shape._id,
    slotKey: args.shape.slotKey,
    configRevision: args.shape.configRevision,
    reservationId: args.reservationId,
    partySize: args.partySize,
    bucketMaxPartySize: args.bucketMaxPartySize,
    status: "allocated",
    source: args.source,
    allocatedAt: args.now,
  });
  // Touch the shape row so concurrent allocations on the same shape are
  // forced through Convex's OCC — never two winners on the last bucket.
  await ctx.db.patch(args.shape._id, { runtimeVersion: args.shape.runtimeVersion + 1 });

  console.log("capacity_shape_allocated", {
    slotKey: args.shape.slotKey,
    partySize: args.partySize,
    bucketMaxPartySize: args.bucketMaxPartySize,
    configRevision: args.shape.configRevision,
    source: args.source,
  });
}

/**
 * Enregistre une allocation "bypassed" : la réservation admin a été acceptée
 * malgré l'absence de bucket compatible. Marque la shape `needsReview=true`
 * pour suspendre l'enforcement public jusqu'à intervention humaine (§29-30).
 */
export async function bypassCapacityShapeBucket(
  ctx: MutationCtx,
  args: {
    restaurantId: Id<"restaurants">;
    shape: Doc<"slotCapacityShapes">;
    reservationId: Id<"reservations">;
    partySize: number;
    reason?: string;
    now: number;
  }
): Promise<void> {
  await ctx.db.insert("slotCapacityShapeAllocations", {
    restaurantId: args.restaurantId,
    shapeId: args.shape._id,
    slotKey: args.shape.slotKey,
    configRevision: args.shape.configRevision,
    reservationId: args.reservationId,
    partySize: args.partySize,
    status: "bypassed",
    source: "admin",
    bypassReason: args.reason ?? "admin_override",
    allocatedAt: args.now,
  });

  if (!args.shape.needsReview) {
    await ctx.db.patch(args.shape._id, { needsReview: true, updatedAt: args.now });
  }

  console.log("capacity_shape_admin_bypass", {
    slotKey: args.shape.slotKey,
    partySize: args.partySize,
    configRevision: args.shape.configRevision,
  });
  console.log("capacity_shape_needs_review", { slotKey: args.shape.slotKey });
}

/**
 * Libère l'allocation "allocated" d'une réservation (annulation, refus,
 * no-show, complétion, changement de créneau/taille). Best-effort : si aucune
 * allocation active n'existe (typologie absente/désactivée au moment de la
 * création), ne fait rien.
 */
export async function releaseCapacityShapeAllocationForReservation(
  ctx: MutationCtx,
  args: { reservationId: Id<"reservations">; now: number }
): Promise<void> {
  const allocations = await ctx.db
    .query("slotCapacityShapeAllocations")
    .withIndex("by_reservation", (q) => q.eq("reservationId", args.reservationId))
    .collect();

  for (const allocation of allocations) {
    if (allocation.status !== "allocated") continue;
    await ctx.db.patch(allocation._id, { status: "released", releasedAt: args.now });
    console.log("capacity_shape_released", {
      slotKey: allocation.slotKey,
      partySize: allocation.partySize,
      bucketMaxPartySize: allocation.bucketMaxPartySize,
      configRevision: allocation.configRevision,
    });
  }
}

/**
 * Marque la shape d'un slot comme "à revoir" (needsReview=true). Utilisé
 * quand une décision humaine (override manuel de capacité, réservation admin
 * incompatible) rend le snapshot potentiellement obsolète. Ne recalcule
 * JAMAIS la configuration automatiquement — §18/§31.
 */
export async function markCapacityShapeNeedsReview(
  ctx: MutationCtx,
  args: { restaurantId: Id<"restaurants">; slotKey: string; now: number }
): Promise<void> {
  const shape = await getShapeForSlotKey(ctx, args.restaurantId, args.slotKey);
  // Une typologie désactivée n'est pas appliquée : rien à revoir.
  if (!shape || !shape.enabled || shape.needsReview) return;
  await ctx.db.patch(shape._id, { needsReview: true, updatedAt: args.now });
  console.log("capacity_shape_needs_review", { slotKey: args.slotKey });
}

/**
 * Résout la capacité effective d'un slot (isOpen/capacity/maxGroupSize après
 * overrides MANUAL > PERIOD) et la capacité restante réelle, en suivant le
 * même motif que availability.getDay / reservations._create.
 */
async function resolveSlotEffectiveState(
  ctx: QueryCtx | MutationCtx,
  slot: Doc<"slots">
): Promise<{ effectiveCapacity: number; remainingCapacity: number }> {
  const overrides = await ctx.db
    .query("slotOverrides")
    .withIndex("by_restaurant_slotKey", (q) => q.eq("restaurantId", slot.restaurantId).eq("slotKey", slot.slotKey))
    .collect();

  let effectiveCapacity = slot.capacity;
  const periodOverride = overrides.find((o) => o.origin === "period");
  if (periodOverride?.patch.capacity !== undefined) effectiveCapacity = periodOverride.patch.capacity;
  const manualOverride = overrides.find((o) => o.origin === "manual");
  if (manualOverride?.patch.capacity !== undefined) effectiveCapacity = manualOverride.patch.capacity;

  const existingReservations = await ctx.db
    .query("reservations")
    .withIndex("by_restaurant_slotKey", (q) => q.eq("restaurantId", slot.restaurantId).eq("slotKey", slot.slotKey))
    .collect();

  const usedCapacity = existingReservations
    .filter((r) => ACTIVE_RESERVATION_STATUSES.has(r.status))
    .reduce((sum, r) => sum + r.partySize, 0);

  return { effectiveCapacity, remainingCapacity: Math.max(0, effectiveCapacity - usedCapacity) };
}

// ═══════════════════════════════════════════════════════════════
// Summary DTO — jamais exposé au widget public (§43). Utilisé par
// slots.listByDate pour l'admin/tablette/desktop.
// ═══════════════════════════════════════════════════════════════

export type CapacityShapeSummary = {
  enabled: boolean;
  effectiveEnabled: boolean;
  needsReview: boolean;
  buckets: CapacityBucket[];
  remainingBuckets: CapacityBucket[];
  configuredSeatCapacity: number;
  remainingTypedSeatCapacity: number;
} | null;

export function buildShapeSummary(
  shape: Doc<"slotCapacityShapes"> | null,
  remainingCapacity: number,
  allocations: Doc<"slotCapacityShapeAllocations">[] = []
): CapacityShapeSummary {
  if (!shape) return null;

  const remainingBuckets = computeRemainingBuckets({
    buckets: shape.buckets,
    allocations: allocations.map(toAllocationLike),
    configRevision: shape.configRevision,
  });

  // « À revoir » n'a de sens que pour une typologie active (données
  // historiques : des typologies désactivées ont pu être marquées à tort).
  const needsReview = shape.enabled && shape.needsReview;

  return {
    enabled: shape.enabled,
    effectiveEnabled: shape.enabled && !needsReview,
    needsReview,
    buckets: normalizeBuckets(shape.buckets),
    remainingBuckets,
    configuredSeatCapacity: computeConfiguredSeatCapacity(shape.buckets),
    remainingTypedSeatCapacity: remainingBuckets.reduce((sum, b) => sum + b.maxPartySize * b.quantity, 0),
  };
}

/**
 * Charge shape + allocations pour construire un résumé complet (avec
 * remainingBuckets réels). Utilisé par listForDate/getForSlot/listByDate.
 */
export async function buildShapeSummaryWithAllocations(
  ctx: QueryCtx | MutationCtx,
  shape: Doc<"slotCapacityShapes"> | null,
  remainingCapacity: number
): Promise<CapacityShapeSummary> {
  if (!shape) return null;
  const allocations = await getAllocationsForShape(ctx, shape._id);
  return buildShapeSummary(shape, remainingCapacity, allocations);
}

// ═══════════════════════════════════════════════════════════════
// QUERY: getForSlot (admin) — §42
// ═══════════════════════════════════════════════════════════════

export const getForSlot = query({
  args: { slotId: v.id("slots") },
  handler: async (ctx, { slotId }) => {
    await requireRole(ctx, "admin");
    const slot = await ctx.db.get(slotId);
    if (!slot) {
      throw Errors.SLOT_NOT_FOUND(slotId);
    }
    const shape = await getShapeForSlotKey(ctx, slot.restaurantId, slot.slotKey);
    const { remainingCapacity } = await resolveSlotEffectiveState(ctx, slot);
    return buildShapeSummaryWithAllocations(ctx, shape, remainingCapacity);
  },
});

// ═══════════════════════════════════════════════════════════════
// MUTATION: configure (admin) — §19
// ═══════════════════════════════════════════════════════════════

export const configure = mutation({
  args: {
    slotId: v.id("slots"),
    enabled: v.boolean(),
    buckets: v.array(
      v.object({
        maxPartySize: v.number(),
        quantity: v.number(),
      })
    ),
  },
  handler: async (ctx, { slotId, enabled, buckets }) => {
    await requireRole(ctx, "admin");

    const slot = await ctx.db.get(slotId);
    if (!slot) {
      throw Errors.SLOT_NOT_FOUND(slotId);
    }

    const { remainingCapacity } = await resolveSlotEffectiveState(ctx, slot);

    const validation = validateCapacityShape({ enabled, buckets, remainingCapacity });
    if (!validation.ok) {
      throw Errors.INVALID_INPUT("buckets", validation.reason);
    }

    const now = Date.now();
    const performedBy = (await ctx.auth.getUserIdentity())?.subject;

    const existing = await getShapeForSlotKey(ctx, slot.restaurantId, slot.slotKey);

    if (existing) {
      const newRevision = existing.configRevision + 1;
      await ctx.db.patch(existing._id, {
        enabled,
        buckets: validation.normalizedBuckets,
        configRevision: newRevision,
        runtimeVersion: existing.runtimeVersion + 1,
        needsReview: false,
        configuredAt: now,
        configuredBy: performedBy,
        updatedAt: now,
      });
      console.log(enabled ? "capacity_shape_updated" : "capacity_shape_disabled", {
        slotKey: slot.slotKey,
        configRevision: newRevision,
        performedBy: performedBy ?? "admin",
      });
      return { shapeId: existing._id, configRevision: newRevision };
    }

    const shapeId = await ctx.db.insert("slotCapacityShapes", {
      restaurantId: slot.restaurantId,
      dateKey: slot.dateKey,
      service: slot.service,
      timeKey: slot.timeKey,
      slotKey: slot.slotKey,
      enabled,
      buckets: validation.normalizedBuckets,
      configRevision: 1,
      runtimeVersion: 1,
      needsReview: false,
      configuredAt: now,
      configuredBy: performedBy,
      createdAt: now,
      updatedAt: now,
    });

    console.log(enabled ? "capacity_shape_enabled" : "capacity_shape_disabled", {
      slotKey: slot.slotKey,
      configRevision: 1,
      performedBy: performedBy ?? "admin",
    });

    return { shapeId, configRevision: 1 };
  },
});

// ═══════════════════════════════════════════════════════════════
// MUTATION: disable (admin) — §20
// Désactivation immédiate. Les données (buckets) sont conservées pour
// réaffichage, mais toute réactivation repasse par `configure` (validation
// serveur avec le remainingCapacity courant).
// ═══════════════════════════════════════════════════════════════

export const disable = mutation({
  args: { slotId: v.id("slots") },
  handler: async (ctx, { slotId }) => {
    await requireRole(ctx, "admin");

    const slot = await ctx.db.get(slotId);
    if (!slot) {
      throw Errors.SLOT_NOT_FOUND(slotId);
    }

    const existing = await getShapeForSlotKey(ctx, slot.restaurantId, slot.slotKey);
    if (!existing || (!existing.enabled && !existing.needsReview)) {
      return { ok: true };
    }

    // Désactiver lève aussi l'état « à revoir » : il n'y a plus rien à revoir.
    const now = Date.now();
    await ctx.db.patch(existing._id, { enabled: false, needsReview: false, updatedAt: now });

    console.log("capacity_shape_disabled", { slotKey: slot.slotKey, configRevision: existing.configRevision });

    return { ok: true };
  },
});

// Exported for reuse by availability.ts / reservations.ts / admin.ts.
export { selectBestFitBucket };
