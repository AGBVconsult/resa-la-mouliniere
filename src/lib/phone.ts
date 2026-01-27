import {
  parsePhoneNumberFromString,
  AsYouType,
  CountryCode,
  PhoneNumber,
} from "libphonenumber-js";

/**
 * Pays prioritaires pour la détection automatique.
 * Ordre basé sur la clientèle typique d'Oostende.
 */
const PRIORITY_COUNTRIES: CountryCode[] = ["BE", "FR", "NL", "DE", "GB", "LU"];

/**
 * Détecte le pays probable basé sur le préfixe du numéro.
 * Utilisé pour améliorer le formatage "as you type".
 */
export function detectCountryFromPrefix(phone: string): CountryCode {
  const cleaned = phone.replace(/\D/g, "");

  // Numéro avec indicatif international explicite
  if (phone.startsWith("+") || cleaned.startsWith("00")) {
    return "BE"; // Le parser gèrera automatiquement
  }

  // Préfixes mobiles belges: 04XX
  if (/^04[5-9]/.test(cleaned)) return "BE";

  // Préfixes fixes belges: 02, 03, 04 (Liège), 09, 010-089
  if (/^0[2-9]/.test(cleaned) && !/^0[67]/.test(cleaned)) return "BE";

  // Préfixes mobiles français: 06, 07
  if (/^0[67]/.test(cleaned) && cleaned.length <= 10) return "FR";

  // Préfixes mobiles néerlandais: 06 (mais 10 chiffres comme FR)
  // Différenciation par contexte - on privilégie FR car plus probable à Oostende
  if (/^06/.test(cleaned)) return "FR";

  // Préfixes mobiles allemands: 015, 016, 017
  if (/^01[567]/.test(cleaned)) return "DE";

  // Préfixes UK: 07 avec 11 chiffres
  if (/^07/.test(cleaned) && cleaned.length === 11) return "GB";

  // Par défaut: Belgique (localisation du restaurant)
  return "BE";
}

/**
 * Formate le numéro en temps réel pendant la saisie.
 * Affichage convivial avec espaces.
 */
export function formatPhoneAsYouType(
  value: string,
  defaultCountry?: CountryCode
): string {
  if (!value) return "";

  const country = defaultCountry || detectCountryFromPrefix(value);
  const formatter = new AsYouType(country);
  return formatter.input(value);
}

/**
 * Parse un numéro et tente plusieurs pays si nécessaire.
 * Retourne l'objet PhoneNumber si valide, null sinon.
 */
export function parsePhoneMultiCountry(phone: string): PhoneNumber | null {
  if (!phone) return null;

  const cleaned = phone.trim();

  // Si commence par + ou 00, le parser détecte automatiquement
  if (cleaned.startsWith("+") || cleaned.startsWith("00")) {
    const parsed = parsePhoneNumberFromString(cleaned);
    if (parsed?.isValid()) return parsed;
  }

  // Sinon, essayer les pays prioritaires
  for (const country of PRIORITY_COUNTRIES) {
    const parsed = parsePhoneNumberFromString(cleaned, country);
    if (parsed?.isValid()) {
      return parsed;
    }
  }

  return null;
}

/**
 * Formate en E.164 pour stockage en base de données.
 * Ex: "+32470123456"
 */
export function formatToE164(phone: string): string | null {
  const parsed = parsePhoneMultiCountry(phone);
  return parsed ? parsed.format("E.164") : null;
}

/**
 * Formate en format international lisible.
 * Ex: "+32 470 12 34 56"
 */
export function formatToInternational(phone: string): string | null {
  const parsed = parsePhoneMultiCountry(phone);
  return parsed ? parsed.formatInternational() : null;
}

/**
 * Formate en format national (sans indicatif).
 * Ex: "0470 12 34 56"
 */
export function formatToNational(phone: string): string | null {
  const parsed = parsePhoneMultiCountry(phone);
  return parsed ? parsed.formatNational() : null;
}

/**
 * Valide si le numéro est un numéro de téléphone valide.
 */
export function isValidPhone(phone: string): boolean {
  const parsed = parsePhoneMultiCountry(phone);
  return parsed?.isValid() ?? false;
}

/**
 * Retourne le pays détecté pour un numéro.
 */
export function getPhoneCountry(phone: string): CountryCode | null {
  const parsed = parsePhoneMultiCountry(phone);
  return parsed?.country ?? null;
}

/**
 * Emoji drapeau pour un code pays.
 */
export function getCountryFlag(country: CountryCode): string {
  const flags: Record<string, string> = {
    BE: "🇧🇪",
    FR: "🇫🇷",
    NL: "🇳🇱",
    DE: "🇩🇪",
    GB: "🇬🇧",
    LU: "🇱🇺",
    CH: "🇨🇭",
    IT: "🇮🇹",
    ES: "🇪🇸",
  };
  return flags[country] || "🌍";
}
