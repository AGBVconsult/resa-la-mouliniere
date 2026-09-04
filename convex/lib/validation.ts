/**
 * Validation serveur des entrées de réservation.
 *
 * Les validateurs Convex (`v.number()`, `v.string()`) ne bornent ni le signe,
 * ni l'intégralité, ni la longueur. Ces fonctions pures complètent la
 * validation de type et lèvent des `VALIDATION_ERROR` contractuelles.
 * Elles sont appelées par tous les points d'entrée qui écrivent une
 * réservation (widget, gestion par token, admin, import).
 */

import { Errors } from "./errors";

/** Plafond absolu, indépendant du réglage `maxPartySizeWidget`. */
export const MAX_PARTY_SIZE_ABSOLUTE = 200;
/** Seuil de routage vers une demande de groupe (CONTRACTS.md §3.3). */
export const MIN_GROUP_SIZE = 16;

export const MAX_NAME_LENGTH = 80;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_PHONE_LENGTH = 32;
export const MAX_NOTE_LENGTH = 1000;
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_OPTIONS = 10;

/** Options de réservation connues (widget, admin, e-mails). */
export const KNOWN_OPTIONS = new Set(["highChair", "wheelchair", "stroller", "dogAccess"]);

const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_KEY_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+\d][\d\s().-]*$/;

export type PartyCounts = { adults: number; childrenCount: number; babyCount: number };

function assertNonNegativeInteger(field: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw Errors.INVALID_INPUT(field, "Doit être un entier >= 0");
  }
}

/**
 * Compteurs de convives : entiers, non négatifs, au moins `minAdults` adulte(s),
 * total borné par `maxPartySize`.
 */
export function assertPartyCounts(
  counts: PartyCounts,
  opts: { minAdults?: number; maxPartySize?: number } = {}
): number {
  const minAdults = opts.minAdults ?? 1;
  const maxPartySize = opts.maxPartySize ?? MAX_PARTY_SIZE_ABSOLUTE;

  assertNonNegativeInteger("adults", counts.adults);
  assertNonNegativeInteger("childrenCount", counts.childrenCount);
  assertNonNegativeInteger("babyCount", counts.babyCount);

  if (counts.adults < minAdults) {
    throw Errors.INVALID_INPUT("adults", `Doit être >= ${minAdults}`);
  }

  const partySize = counts.adults + counts.childrenCount + counts.babyCount;
  if (partySize > maxPartySize) {
    throw Errors.INVALID_INPUT("partySize", `Doit être <= ${maxPartySize}`);
  }
  return partySize;
}

/** Vérifie une date `YYYY-MM-DD` réelle (pas seulement le format). */
export function assertDateKey(dateKey: string, field = "dateKey"): void {
  if (!DATE_KEY_REGEX.test(dateKey)) {
    throw Errors.INVALID_INPUT(field, "Format YYYY-MM-DD requis");
  }
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    throw Errors.INVALID_INPUT(field, "Date invalide");
  }
}

/** Vérifie une heure `HH:MM` réelle. */
export function assertTimeKey(timeKey: string, field = "timeKey"): void {
  if (!TIME_KEY_REGEX.test(timeKey)) {
    throw Errors.INVALID_INPUT(field, "Format HH:MM requis");
  }
}

export type TextFields = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  note?: string;
  message?: string;
};

/**
 * Longueurs et formats des champs texte. Les champs absents ou vides sont
 * ignorés (leur caractère obligatoire est décidé par l'appelant).
 */
export function assertTextLimits(fields: TextFields): void {
  const check = (field: string, value: string | undefined, max: number) => {
    if (value === undefined) return;
    if (value.length > max) {
      throw Errors.INVALID_INPUT(field, `Doit faire au plus ${max} caractères`);
    }
  };

  check("firstName", fields.firstName, MAX_NAME_LENGTH);
  check("lastName", fields.lastName, MAX_NAME_LENGTH);
  check("email", fields.email, MAX_EMAIL_LENGTH);
  check("phone", fields.phone, MAX_PHONE_LENGTH);
  check("note", fields.note, MAX_NOTE_LENGTH);
  check("message", fields.message, MAX_MESSAGE_LENGTH);

  const email = fields.email?.trim();
  if (email && !EMAIL_REGEX.test(email)) {
    throw Errors.INVALID_INPUT("email", "Adresse e-mail invalide");
  }

  const phone = fields.phone?.trim();
  if (phone && !PHONE_REGEX.test(phone)) {
    throw Errors.INVALID_INPUT("phone", "Numéro de téléphone invalide");
  }
}

/** Liste d'options : bornée, sans doublon, valeurs connues uniquement. */
export function assertOptions(options: string[] | undefined): void {
  if (options === undefined) return;
  if (options.length > MAX_OPTIONS) {
    throw Errors.INVALID_INPUT("options", `Au plus ${MAX_OPTIONS} options`);
  }
  const seen = new Set<string>();
  for (const opt of options) {
    if (!KNOWN_OPTIONS.has(opt)) {
      throw Errors.INVALID_INPUT("options", `Option inconnue: ${opt.slice(0, 32)}`);
    }
    if (seen.has(opt)) {
      throw Errors.INVALID_INPUT("options", `Option en double: ${opt}`);
    }
    seen.add(opt);
  }
}
