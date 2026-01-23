/**
 * Helper pour formater les erreurs Convex en messages user-friendly.
 * Lit error.data.code et error.data.messageKey pour les ConvexError.
 */

type ConvexErrorData = {
  code?: string;
  messageKey?: string;
  meta?: Record<string, unknown>;
};

const ERROR_MESSAGES: Record<string, string | ((meta?: Record<string, unknown>) => string)> = {
  // Auth
  "error.unauthorized": "Accès non autorisé",
  "error.forbidden": "Vous n'avez pas les permissions nécessaires",

  // Data
  "error.noActiveRestaurant": "Aucun restaurant actif trouvé",
  "error.multipleActiveRestaurants": (meta) =>
    `Erreur de configuration : ${meta?.count || "plusieurs"} restaurants actifs détectés`,
  "error.settingsNotFound": "Paramètres non trouvés",
  "error.userNotFound": "Utilisateur non trouvé",

  // Validation
  "error.invalidInput": (meta) =>
    `Champ invalide : ${meta?.field || "inconnu"} (${meta?.reason || "erreur"})`,
  "error.invalidStatus": (meta) => `Statut invalide : ${meta?.status || "inconnu"}`,

  // Slots
  "error.slotNotFound": "Créneau non trouvé",
  "error.slotTaken": "Ce créneau n'est plus disponible",
  "error.insufficientCapacity": (meta) =>
    `Capacité insuffisante : ${meta?.remainingCapacity || 0} places disponibles pour ${meta?.requestedPartySize || "?"} personnes`,

  // Rate limit
  "error.rateLimited": "Trop de requêtes. Veuillez patienter.",
  "error.turnstileFailed": "Vérification de sécurité échouée. Veuillez réessayer.",

  // Token
  "error.tokenInvalid": "Lien invalide ou expiré",
  "error.tokenExpired": "Ce lien a expiré",

  // Version conflict
  "error.versionConflict": "Les données ont été modifiées. Veuillez rafraîchir la page.",

  // Tables
  "error.tableConflict": "Cette table est déjà réservée pour ce créneau",
  "error.tableNotFound": "Table non trouvée",
  "error.tableBlocked": (meta) => `La table ${meta?.tableName || ""} est désactivée`,
  "error.tableOccupied": (meta) =>
    `La table ${meta?.tableName || ""} est occupée par ${meta?.guestName || "un client"}`,
  "error.insufficientTableCapacity": (meta) =>
    `Capacité insuffisante : ${meta?.totalCapacity || 0} places pour ${meta?.partySize || "?"} personnes`,

  // Reservations
  "error.reservationNotFound": "Réservation non trouvée",

  // Periods
  "error.sameTypeOverlap": "Une période du même type existe déjà pour ces dates",

  // Generic
  "error.notFound": "Élément non trouvé",
};

const CODE_FALLBACKS: Record<string, string> = {
  FORBIDDEN: "Accès non autorisé",
  NOT_FOUND: "Élément non trouvé",
  VALIDATION_ERROR: "Données invalides",
  SLOT_TAKEN: "Créneau non disponible",
  INSUFFICIENT_CAPACITY: "Capacité insuffisante",
  RATE_LIMITED: "Trop de requêtes",
  TURNSTILE_FAILED: "Vérification échouée",
  TOKEN_INVALID: "Lien invalide",
  TOKEN_EXPIRED: "Lien expiré",
  VERSION_CONFLICT: "Données modifiées, veuillez rafraîchir",
  TABLE_CONFLICT: "Table déjà réservée",
  SAME_TYPE_OVERLAP: "Période existante en conflit",
};

/**
 * Extrait les données d'erreur d'une ConvexError.
 */
function extractErrorData(error: unknown): ConvexErrorData | null {
  if (!error || typeof error !== "object") return null;

  // ConvexError stocke les données dans .data
  const err = error as { data?: ConvexErrorData; message?: string };

  if (err.data && typeof err.data === "object") {
    return err.data;
  }

  return null;
}

/**
 * Formate une erreur Convex en message user-friendly en français.
 * @param error - L'erreur à formater (ConvexError ou Error standard)
 * @param fallback - Message par défaut si l'erreur n'est pas reconnue
 * @returns Message formaté en français
 */
export function formatConvexError(
  error: unknown,
  fallback = "Une erreur est survenue"
): string {
  const data = extractErrorData(error);

  if (data) {
    // Essayer d'abord avec messageKey
    if (data.messageKey) {
      const handler = ERROR_MESSAGES[data.messageKey];
      if (handler) {
        return typeof handler === "function" ? handler(data.meta) : handler;
      }
    }

    // Fallback sur le code
    if (data.code && CODE_FALLBACKS[data.code]) {
      return CODE_FALLBACKS[data.code];
    }
  }

  // Fallback sur le message d'erreur standard
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: string }).message;
    // Ne pas exposer les messages techniques
    if (message && !message.includes("Convex") && message.length < 100) {
      return message;
    }
  }

  return fallback;
}

/**
 * Vérifie si une erreur est une ConvexError avec un code spécifique.
 */
export function isConvexErrorCode(error: unknown, code: string): boolean {
  const data = extractErrorData(error);
  return data?.code === code;
}
