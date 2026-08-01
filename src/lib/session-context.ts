/**
 * Session context for funnel analytics.
 *
 * Provides sessionId, device, isReturning, referralSource.
 * - sessionId is set once per widget mount (from Widget.tsx).
 * - isReturning uses localStorage (protected against SecurityError in cross-origin iframe).
 * - device is derived from viewport width.
 * - referralSource comes from ?ref= query parameter.
 *
 * Rule: all access to localStorage is wrapped in try/catch.
 * On failure, isReturning is omitted (undefined), never false.
 */

const STORAGE_KEY = "lm_returning_visitor";

// ── Module state ──────────────────────────────────────
let _sessionId: string | undefined;
let _device: string | undefined;
let _language: string | undefined;
let _referralSource: string | undefined;
let _isReturning: boolean | undefined;
let _initialized = false;

export interface SessionContext {
  sessionId: string;
  device: string | undefined;
  language: string | undefined;
  referralSource: string | undefined;
  isReturning: boolean | undefined;
}

/**
 * Detect device type from viewport width.
 */
function detectDevice(): string {
  if (typeof window === "undefined") return "unknown";
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

/**
 * Safe localStorage read/write for isReturning.
 * Returns undefined on any error (iframe cross-origin, private browsing, etc.).
 */
function detectIsReturning(): boolean | undefined {
  try {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return undefined;
    const existing = localStorage.getItem(STORAGE_KEY);
    // Mark for next visit
    localStorage.setItem(STORAGE_KEY, "1");
    return existing === "1";
  } catch {
    // SecurityError in cross-origin iframe (Safari ITP, Firefox ETP)
    return undefined;
  }
}

/**
 * Initialize the session context. Must be called once at widget mount.
 * Events emitted before this call are omitted (no orphan events).
 */
export function initSessionContext(opts: {
  sessionId: string;
  language: string;
  referralSource: string | null;
}): void {
  _sessionId = opts.sessionId;
  _language = opts.language;
  _referralSource = opts.referralSource || undefined;
  _device = detectDevice();
  _isReturning = detectIsReturning();
  _initialized = true;
}

/**
 * Update language if it changes during the session (language switcher).
 */
export function updateSessionLanguage(language: string): void {
  _language = language;
}

/**
 * Get the current session context. Returns null if not initialized.
 */
export function getSessionContext(): SessionContext | null {
  if (!_initialized || !_sessionId) return null;
  return {
    sessionId: _sessionId,
    device: _device,
    language: _language,
    referralSource: _referralSource,
    isReturning: _isReturning,
  };
}

/**
 * Check if the session context is initialized.
 */
export function isSessionInitialized(): boolean {
  return _initialized;
}
