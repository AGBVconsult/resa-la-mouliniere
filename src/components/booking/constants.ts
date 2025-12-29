import type { Language } from "./types";

export const COLORS = {
  lunch: { available: "#f59e0b", unavailable: "#cbd5e1" },   // amber-500 / slate-300
  dinner: { available: "#3b82f6", unavailable: "#cbd5e1" },  // blue-500 / slate-300
  full: "#ef4444",  // red-500
} as const;

export const SUPPORTED_LANGUAGES: Language[] = ["fr", "nl", "en", "de", "it"];
export const DEFAULT_LANGUAGE: Language = "nl";

export const LANGUAGES = [
  { code: "fr" as const, label: "FR" },
  { code: "nl" as const, label: "NL" },
  { code: "en" as const, label: "EN" },
  { code: "de" as const, label: "DE" },
  { code: "it" as const, label: "IT" },
] as const;

// Seuils métier (CONTRACTS.md §3.3)
export const THRESHOLDS = {
  AUTO_CONFIRM_MAX: 4,      // <= 4 = confirmed
  PENDING_MAX: 15,          // 5-15 = pending
  GROUP_REQUEST_MIN: 16,    // >= 16 = groupRequest
} as const;
