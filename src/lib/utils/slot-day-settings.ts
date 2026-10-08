/**
 * Helpers partagés par les modales de réglage d'un jour
 * (DaySettingsPopup en mode tablette, DayOverrideModal en mode desktop).
 */

export interface SlotFromServer<TId extends string = string> {
  _id: TId;
  timeKey: string;
  isOpen: boolean;
  capacity: number;
  /** Taille de groupe maximale (null = groupe libre). */
  maxGroupSize?: number | null;
}

export interface SlotState<TId extends string = string> {
  _id: TId;
  timeKey: string;
  isOpen: boolean;
  capacity: number;
  originalIsOpen: boolean;
  originalCapacity: number;
  /** Taille de groupe maximale (null = groupe libre). */
  maxGroupSize: number | null;
  originalMaxGroupSize: number | null;
}

/**
 * Fusionne les créneaux renvoyés par le serveur avec l'état local en cours d'édition.
 *
 * - un créneau nouvellement créé (ex. via slots.addSlot) apparaît immédiatement ;
 * - un créneau disparu côté serveur est retiré de la liste ;
 * - les modifications locales non enregistrées (bascule ouvert/fermé, capacité)
 *   sont conservées, seule la référence "original" est réalignée sur le serveur
 *   afin que la détection de changements reste exacte.
 */
export function mergeSlotStates<TId extends string>(
  serverSlots: readonly SlotFromServer<TId>[],
  localSlots: readonly SlotState<TId>[]
): SlotState<TId>[] {
  const localById = new Map(localSlots.map((s) => [s._id, s]));

  return serverSlots.map((slot) => {
    const local = localById.get(slot._id);

    if (!local) {
      return {
        _id: slot._id,
        timeKey: slot.timeKey,
        isOpen: slot.isOpen,
        capacity: slot.capacity,
        originalIsOpen: slot.isOpen,
        originalCapacity: slot.capacity,
        maxGroupSize: slot.maxGroupSize ?? null,
        originalMaxGroupSize: slot.maxGroupSize ?? null,
      };
    }

    return {
      ...local,
      timeKey: slot.timeKey,
      originalIsOpen: slot.isOpen,
      originalCapacity: slot.capacity,
      originalMaxGroupSize: slot.maxGroupSize ?? null,
    };
  });
}

/** Le créneau a-t-il une modification locale non enregistrée ? */
export function isSlotModified(slot: SlotState<string>): boolean {
  return (
    slot.isOpen !== slot.originalIsOpen ||
    slot.capacity !== slot.originalCapacity ||
    slot.maxGroupSize !== slot.originalMaxGroupSize
  );
}

/**
 * Mise à jour à envoyer à `slots.batchUpdateSlots` : uniquement les champs modifiés.
 * Réenvoyer une capacité inchangée ferait passer une typologie active « à revoir »
 * (PRD-013 §31).
 */
export function buildSlotUpdate<TId extends string>(slot: SlotState<TId>) {
  return {
    slotId: slot._id,
    ...(slot.isOpen !== slot.originalIsOpen ? { isOpen: slot.isOpen } : {}),
    ...(slot.capacity !== slot.originalCapacity ? { capacity: slot.capacity } : {}),
    ...(slot.maxGroupSize !== slot.originalMaxGroupSize ? { maxGroupSize: slot.maxGroupSize } : {}),
  };
}

/** Taille de groupe proposée quand on limite un créneau en « groupe libre ». */
export const DEFAULT_LIMITED_GROUP_SIZE = 15;
/** Bornes de la taille de groupe maximale réglable sur un créneau. */
export const MIN_GROUP_SIZE = 1;
export const MAX_GROUP_SIZE = 50;

export function clampGroupSize(value: number): number {
  return Math.min(MAX_GROUP_SIZE, Math.max(MIN_GROUP_SIZE, Math.round(value)));
}

/**
 * Couverts encore disponibles affichés dans les modales de réglage d'un jour :
 * capacité (éventuellement en cours d'édition) moins les couverts déjà réservés.
 */
export function toRemainingCovers(capacity: number, reservedCovers: number): number {
  return Math.max(0, capacity - reservedCovers);
}

/**
 * Convertit une saisie "couverts restants" en capacité totale à enregistrer.
 */
export function capacityFromRemainingCovers(remaining: number, reservedCovers: number): number {
  return Math.max(0, remaining) + reservedCovers;
}

/** Borne haute de saisie des couverts restants (identique à l'ancien champ texte). */
export const MAX_REMAINING_COVERS = 100;

export function clampRemainingCovers(value: number, max = MAX_REMAINING_COVERS): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(0, Math.round(value)));
}

export type CoverLevel = "full" | "low" | "ok";

/**
 * Niveau de remplissage d'un créneau pour la couleur du stepper :
 * - full : plus aucun couvert disponible ;
 * - low  : créneau déjà entamé et ≤ 25 % de la capacité restante ;
 * - ok   : sinon.
 */
export function coverLevel(remaining: number, reservedCovers: number): CoverLevel {
  if (remaining <= 0) return "full";
  const capacity = remaining + reservedCovers;
  if (reservedCovers > 0 && remaining / capacity <= 0.25) return "low";
  return "ok";
}
