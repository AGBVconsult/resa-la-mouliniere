import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateDisplay(dateKey: string, lang: string): string {
  const date = new Date(dateKey + "T12:00:00");
  const locale = lang === "nl" ? "nl-BE" : lang === "en" ? "en-GB" : "fr-BE";
  return date.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatDateShort(dateKey: string, lang: string): string {
  const date = new Date(dateKey + "T12:00:00");
  const locale = lang === "nl" ? "nl-BE" : lang === "en" ? "en-GB" : "fr-BE";
  return date.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

export function formatDateDisplayFull(dateKey: string, lang: string): string {
  const date = new Date(dateKey + "T12:00:00");
  const localeMap: Record<string, string> = {
    fr: "fr-BE",
    nl: "nl-BE",
    en: "en-GB",
    de: "de-DE",
    it: "it-IT",
  };
  const locale = localeMap[lang] || "fr-BE";
  return date.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function getTodayDateKey(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Generate a UUID compatible with Safari 15.0-15.3 (iOS 15 iPad Pro 2nd gen)
 * crypto.randomUUID() was only added in Safari 15.4
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
