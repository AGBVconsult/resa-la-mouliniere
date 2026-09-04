/**
 * Résolution de la disponibilité d'un créneau — implémentation unique.
 *
 * Avant cette fonction, la capacité effective d'un créneau était recalculée
 * dans cinq endroits avec des règles différentes (audit BUG-004). Tout point
 * d'écriture d'une réservation doit passer par ici.
 *
 * Règles :
 * - `slots` est la base ; `slotOverrides` s'appliquent par priorité
 *   manuel > période ;
 * - un créneau est ouvert si `isOpen` et `capacity > 0` après overrides ;
 * - la capacité utilisée compte pending, confirmed, cardPlaced et seated.
 */

import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { computeEffectiveOpen } from "../../spec/contracts.generated";

type DbCtx = Pick<QueryCtx | MutationCtx, "db">;

export const CAPACITY_STATUSES = ["pending", "confirmed", "cardPlaced", "seated"] as const;

export function countsTowardCapacity(status: string): boolean {
  return (CAPACITY_STATUSES as readonly string[]).includes(status);
}

export type EffectiveSlot = {
  slot: Doc<"slots">;
  /** Ouvert après overrides et capacité > 0. */
  isOpen: boolean;
  capacity: number;
  maxGroupSize: number | null;
};

type OverridePatch = Doc<"slotOverrides">["patch"];

export function applyOverrides(
  base: { isOpen: boolean; capacity: number; maxGroupSize: number | null },
  overrides: Array<{ origin: "manual" | "period"; patch: OverridePatch }>
): { isOpen: boolean; capacity: number; maxGroupSize: number | null } {
  let { isOpen, capacity, maxGroupSize } = base;
  const apply = (patch: OverridePatch) => {
    if (patch.isOpen !== undefined) isOpen = patch.isOpen;
    if (patch.capacity !== undefined) capacity = patch.capacity;
    if (patch.maxGroupSize !== undefined) maxGroupSize = patch.maxGroupSize;
  };
  const period = overrides.find((o) => o.origin === "period");
  if (period) apply(period.patch);
  const manual = overrides.find((o) => o.origin === "manual");
  if (manual) apply(manual.patch);
  return { isOpen, capacity, maxGroupSize };
}

/**
 * Créneau effectif pour une clé, ou `null` s'il n'existe pas.
 * `.first()` et non `.unique()` : des doublons de slotKey ont existé (audit BUG-005).
 */
export async function resolveEffectiveSlot(
  ctx: DbCtx,
  restaurantId: Id<"restaurants">,
  slotKey: string
): Promise<EffectiveSlot | null> {
  const slot = await ctx.db
    .query("slots")
    .withIndex("by_restaurant_slotKey", (q) => q.eq("restaurantId", restaurantId).eq("slotKey", slotKey))
    .first();
  if (!slot) return null;

  const overrides = await ctx.db
    .query("slotOverrides")
    .withIndex("by_restaurant_slotKey", (q) => q.eq("restaurantId", restaurantId).eq("slotKey", slotKey))
    .collect();

  const effective = applyOverrides(
    { isOpen: slot.isOpen, capacity: slot.capacity, maxGroupSize: slot.maxGroupSize },
    overrides
  );

  return {
    slot,
    isOpen: computeEffectiveOpen(effective.isOpen, effective.capacity),
    capacity: effective.capacity,
    maxGroupSize: effective.maxGroupSize,
  };
}

/** Couverts déjà engagés sur un créneau (statuts actifs), hors réservation exclue. */
export async function countUsedCapacity(
  ctx: DbCtx,
  restaurantId: Id<"restaurants">,
  slotKey: string,
  excludeReservationId?: Id<"reservations">
): Promise<number> {
  const reservations = await ctx.db
    .query("reservations")
    .withIndex("by_restaurant_slotKey", (q) => q.eq("restaurantId", restaurantId).eq("slotKey", slotKey))
    .collect();

  return reservations
    .filter((r) => r._id !== excludeReservationId && countsTowardCapacity(r.status))
    .reduce((sum, r) => sum + r.partySize, 0);
}

/**
 * Vérifie qu'un créneau peut accueillir `partySize` couverts.
 * Lève SLOT_NOT_FOUND, SLOT_TAKEN(closed|taken) ou INSUFFICIENT_CAPACITY.
 * Retourne le créneau effectif.
 */
export async function assertSlotCanHost(
  ctx: DbCtx,
  args: {
    restaurantId: Id<"restaurants">;
    slotKey: string;
    partySize: number;
    excludeReservationId?: Id<"reservations">;
    /** Ignore la capacité et le maxGroupSize (décision explicite de l'exploitant). */
    force?: boolean;
  },
  errors: {
    SLOT_NOT_FOUND: (slotKey: string) => Error;
    SLOT_TAKEN: (slotKey: string, reason: "closed" | "taken") => Error;
    INSUFFICIENT_CAPACITY: (slotKey: string, requested: number, available: number) => Error;
  }
): Promise<EffectiveSlot> {
  const effective = await resolveEffectiveSlot(ctx, args.restaurantId, args.slotKey);
  if (!effective) throw errors.SLOT_NOT_FOUND(args.slotKey);
  if (!effective.isOpen) throw errors.SLOT_TAKEN(args.slotKey, "closed");

  if (!args.force) {
    if (effective.maxGroupSize !== null && args.partySize > effective.maxGroupSize) {
      throw errors.SLOT_TAKEN(args.slotKey, "taken");
    }
    const used = await countUsedCapacity(ctx, args.restaurantId, args.slotKey, args.excludeReservationId);
    const remaining = effective.capacity - used;
    if (args.partySize > remaining) {
      throw errors.INSUFFICIENT_CAPACITY(args.slotKey, args.partySize, remaining);
    }
  }

  return effective;
}
