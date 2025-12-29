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

export function getTodayDateKey(): string {
  return new Date().toISOString().split("T")[0];
}
