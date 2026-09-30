/**
 * Helpers partagés par les modales de réglage d'un jour
 * (DaySettingsPopup en mode tablette, DayOverrideModal en mode desktop).
 */

export interface SlotFromServer<TId extends string = string> {
  _id: TId;
  timeKey: string;
  isOpen: boolean;
  capacity: number;
}

export interface SlotState<TId extends string = string> {
  _id: TId;
  timeKey: string;
  isOpen: boolean;
  capacity: number;
  originalIsOpen: boolean;
  originalCapacity: number;
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
      };
    }

    return {
      ...local,
      timeKey: slot.timeKey,
      originalIsOpen: slot.isOpen,
      originalCapacity: slot.capacity,
    };
  });
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
