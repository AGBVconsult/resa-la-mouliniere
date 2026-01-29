/**
 * API Client with retry, timeout, and offline detection
 * For reliable widget operations
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  timeoutMs: number;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  timeoutMs: 30000,
};

export type ErrorCode =
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "OFFLINE"
  | "SERVER_ERROR"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "UNKNOWN";

export interface ApiError {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  userMessage: {
    fr: string;
    nl: string;
    en: string;
    de: string;
    it: string;
  };
}

const ERROR_MESSAGES: Record<ErrorCode, ApiError["userMessage"]> = {
  NETWORK_ERROR: {
    fr: "Problème de connexion. Vérifiez votre connexion internet et réessayez.",
    nl: "Verbindingsprobleem. Controleer uw internetverbinding en probeer opnieuw.",
    en: "Connection problem. Please check your internet connection and try again.",
    de: "Verbindungsproblem. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.",
    it: "Problema di connessione. Controlla la tua connessione internet e riprova.",
  },
  TIMEOUT: {
    fr: "La requête a pris trop de temps. Veuillez réessayer.",
    nl: "Het verzoek duurde te lang. Probeer het opnieuw.",
    en: "The request took too long. Please try again.",
    de: "Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es erneut.",
    it: "La richiesta ha impiegato troppo tempo. Per favore riprova.",
  },
  OFFLINE: {
    fr: "Vous êtes hors ligne. Veuillez vous reconnecter à internet.",
    nl: "U bent offline. Maak opnieuw verbinding met internet.",
    en: "You are offline. Please reconnect to the internet.",
    de: "Sie sind offline. Bitte stellen Sie die Internetverbindung wieder her.",
    it: "Sei offline. Per favore riconnettiti a internet.",
  },
  SERVER_ERROR: {
    fr: "Une erreur serveur s'est produite. Veuillez réessayer dans quelques instants.",
    nl: "Er is een serverfout opgetreden. Probeer het over enkele ogenblikken opnieuw.",
    en: "A server error occurred. Please try again in a few moments.",
    de: "Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es in wenigen Augenblicken erneut.",
    it: "Si è verificato un errore del server. Per favore riprova tra qualche istante.",
  },
  VALIDATION_ERROR: {
    fr: "Les informations saisies sont incorrectes. Veuillez vérifier et réessayer.",
    nl: "De ingevoerde informatie is onjuist. Controleer en probeer opnieuw.",
    en: "The information entered is incorrect. Please check and try again.",
    de: "Die eingegebenen Informationen sind falsch. Bitte überprüfen und erneut versuchen.",
    it: "Le informazioni inserite non sono corrette. Per favore controlla e riprova.",
  },
  RATE_LIMITED: {
    fr: "Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.",
    nl: "Te veel pogingen. Wacht enkele minuten voordat u het opnieuw probeert.",
    en: "Too many attempts. Please wait a few minutes before trying again.",
    de: "Zu viele Versuche. Bitte warten Sie einige Minuten, bevor Sie es erneut versuchen.",
    it: "Troppi tentativi. Per favore attendi qualche minuto prima di riprovare.",
  },
  UNKNOWN: {
    fr: "Une erreur inattendue s'est produite. Veuillez réessayer.",
    nl: "Er is een onverwachte fout opgetreden. Probeer het opnieuw.",
    en: "An unexpected error occurred. Please try again.",
    de: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
    it: "Si è verificato un errore imprevisto. Per favore riprova.",
  },
};

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

/**
 * Create an ApiError from an error code
 */
export function createApiError(code: ErrorCode): ApiError {
  const retryable = ["NETWORK_ERROR", "TIMEOUT", "SERVER_ERROR"].includes(code);
  return {
    code,
    message: code,
    retryable,
    userMessage: ERROR_MESSAGES[code],
  };
}

/**
 * Parse an error and return a structured ApiError
 */
export function parseError(error: unknown): ApiError {
  // Check offline first
  if (!isOnline()) {
    return createApiError("OFFLINE");
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Timeout
    if (message.includes("timeout") || message.includes("aborted")) {
      return createApiError("TIMEOUT");
    }

    // Network errors
    if (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("failed to fetch") ||
      message.includes("connection")
    ) {
      return createApiError("NETWORK_ERROR");
    }

    // Rate limiting
    if (message.includes("rate") || message.includes("429")) {
      return createApiError("RATE_LIMITED");
    }

    // Validation
    if (message.includes("validation") || message.includes("invalid")) {
      return createApiError("VALIDATION_ERROR");
    }

    // Server errors
    if (message.includes("500") || message.includes("502") || message.includes("503")) {
      return createApiError("SERVER_ERROR");
    }
  }

  return createApiError("UNKNOWN");
}

/**
 * Sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * delay; // Add 0-30% jitter
  return Math.min(delay + jitter, config.maxDelayMs);
}

/**
 * Execute an async function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    // Check offline before attempting
    if (!isOnline()) {
      throw createApiError("OFFLINE");
    }

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), finalConfig.timeoutMs);

      try {
        const result = await fn();
        clearTimeout(timeoutId);
        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      lastError = parseError(error);

      // Don't retry non-retryable errors
      if (!lastError.retryable) {
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt === finalConfig.maxRetries) {
        throw lastError;
      }

      // Wait before retrying
      const delay = getBackoffDelay(attempt, finalConfig);
      await sleep(delay);
    }
  }

  throw lastError || createApiError("UNKNOWN");
}

/**
 * Hook to detect online/offline status changes
 */
export function setupOnlineListener(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}
