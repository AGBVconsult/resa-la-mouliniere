/**
 * Machine d'états des réservations — source unique de vérité.
 *
 * Fonctions pures, sans dépendance au runtime Convex : importables côté serveur
 * (convex/admin.ts, convex/reservations.ts) et côté client (pages Next.js).
 * Documentée dans spec/CONTRACTS.md §3.2 ; la table est figée par tests/admin.spec.ts.
 *
 * Trois familles de transitions :
 * 1. Flux nominal : pending -> confirmed|refused|cancelled, puis
 *    confirmed -> cardPlaced -> seated -> completed.
 * 2. Automatiques (jobs, jamais de `noshow`) : seated -> completed
 *    (dailyFinalize, auto-release B1) et confirmed|cardPlaced -> completed
 *    (auto-release B2 : table affectée, client jamais arrivé, H+90).
 * 3. Corrections opérateur (saisie manuelle uniquement) : réouverture d'un
 *    `completed`, restauration d'un `cancelled|refused|noshow`, déclaration ou
 *    levée d'un `incident`. Elles existent parce que le service en salle se fait
 *    sur tablette, avec des erreurs de toucher. Elles ne re-vérifient pas la
 *    capacité du créneau.
 *
 * Invariants garantis par la table (et testés) :
 * - aucune transition ne ramène à `pending` (statut de création uniquement) ;
 * - `refused` n'est atteignable que depuis `pending` ;
 * - depuis `pending`, aucun raccourci vers cardPlaced/seated/completed/noshow/incident ;
 * - pas de transition d'un statut vers lui-même.
 */

import type { ReservationStatus } from "../../spec/contracts.generated";

/**
 * Transitions autorisées. Clé = statut courant, valeur = statuts cibles.
 */
const VALID_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ["confirmed", "refused", "cancelled"],
  confirmed: ["cardPlaced", "seated", "cancelled", "noshow", "completed"],
  cardPlaced: ["seated", "cancelled", "noshow", "incident", "confirmed", "completed"],
  // Correction : clôture, incident, no-show après un « installé » par erreur, retour ou annulation.
  seated: ["completed", "incident", "noshow", "confirmed", "cancelled"],
  // Correction : réouverture d'une visite close par erreur ou par l'auto-release.
  completed: ["seated", "confirmed", "incident", "cancelled"],
  // Correction : client arrivé en retard, ou no-show saisi par erreur.
  noshow: ["seated", "confirmed", "cancelled"],
  // Correction : restauration (le client rappelle).
  cancelled: ["confirmed"],
  refused: ["confirmed", "cancelled"],
  incident: ["seated", "completed", "cancelled"],
};

/**
 * Statuts depuis lesquels le client peut annuler lui-même (lien « gérer ma
 * réservation », `reservations.cancelByToken`). Une fois installé ou la visite
 * close, seule une correction opérateur peut annuler.
 */
export const CANCELLABLE_STATUSES: readonly ReservationStatus[] = ["pending", "confirmed", "cardPlaced"];

/** Vérifie qu'une transition est autorisée. */
export function isValidStatusTransition(from: ReservationStatus, to: ReservationStatus): boolean {
  const validTargets = VALID_TRANSITIONS[from];
  return validTargets?.includes(to) ?? false;
}

/** Statuts cibles autorisés depuis `from` (à utiliser pour construire les menus). */
export function getValidTransitions(from: ReservationStatus): ReservationStatus[] {
  return VALID_TRANSITIONS[from] ?? [];
}

/** Annulation par le client autorisée ? (`status` non typé : vient de la base.) */
export function canCancel(status: string): boolean {
  return (CANCELLABLE_STATUSES as readonly string[]).includes(status);
}
