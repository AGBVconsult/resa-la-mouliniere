/**
 * Motif de fermeture d'un service (vue mensuelle du calendrier).
 *
 * Priorité : période de fermeture > fermeture manuelle > créneaux non générés
 * > fermeture habituelle (modèle hebdomadaire fermé).
 */

export type ClosureReason = "period" | "manual" | "noSlots" | "template";

export interface ServiceClosureInput {
  /** Le service est couvert par une période spéciale "closed" */
  closedByPeriod: boolean;
  /** Nombre de créneaux existants pour ce service ce jour-là */
  slotCount: number;
  /** updatedAt des overrides manuels qui ferment un créneau (patch.isOpen === false) */
  manualCloseTimestamps: number[];
  /** Le modèle hebdomadaire de ce jour/service est ouvert avec au moins un créneau actif */
  templateOpen: boolean;
}

export interface ServiceClosure {
  reason: ClosureReason;
  closedAt: number | null;
}

export function resolveServiceClosure(input: ServiceClosureInput): ServiceClosure {
  if (input.closedByPeriod) return { reason: "period", closedAt: null };
  if (input.manualCloseTimestamps.length > 0) {
    return { reason: "manual", closedAt: Math.max(...input.manualCloseTimestamps) };
  }
  if (input.slotCount === 0 && input.templateOpen) return { reason: "noSlots", closedAt: null };
  return { reason: "template", closedAt: null };
}

const DAY_PRIORITY: ClosureReason[] = ["manual", "period", "noSlots", "template"];

/** Motif d'un jour entièrement fermé : la fermeture la plus "actionnable" l'emporte. */
export function resolveDayClosure(lunch: ServiceClosure, dinner: ServiceClosure): ServiceClosure {
  for (const reason of DAY_PRIORITY) {
    const matches = [lunch, dinner].filter((s) => s.reason === reason);
    if (matches.length > 0) {
      const timestamps = matches.map((s) => s.closedAt).filter((t): t is number => t !== null);
      return { reason, closedAt: timestamps.length > 0 ? Math.max(...timestamps) : null };
    }
  }
  return { reason: "template", closedAt: null };
}
