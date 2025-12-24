import type { Language } from "../../../spec/contracts.generated";

import fr from "./locales/fr.json";
import nl from "./locales/nl.json";
import en from "./locales/en.json";
import de from "./locales/de.json";
import it from "./locales/it.json";

export type TranslationKey = string;

type NestedObject = { [key: string]: string | NestedObject };

const locales: Record<Language, NestedObject> = {
  fr,
  nl,
  en,
  de,
  it,
};

export const DEFAULT_LANGUAGE: Language = "fr";

export const SUPPORTED_LANGUAGES: Language[] = ["fr", "nl", "en", "de", "it"];

export function getNestedValue(obj: NestedObject, path: string): string | undefined {
  const keys = path.split(".");
  let current: NestedObject | string = obj;

  for (const key of keys) {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }
    current = current[key];
  }

  return typeof current === "string" ? current : undefined;
}

export function t(
  key: TranslationKey,
  language: Language = DEFAULT_LANGUAGE,
  params?: Record<string, string | number>
): string {
  const locale = locales[language] || locales[DEFAULT_LANGUAGE];
  let value = getNestedValue(locale, key);

  if (!value) {
    // Fallback to default language
    value = getNestedValue(locales[DEFAULT_LANGUAGE], key);
  }

  if (!value) {
    console.warn(`Missing translation: ${key} for language: ${language}`);
    return key;
  }

  // Replace params
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue));
    }
  }

  return value;
}

export function getLocale(language: Language): NestedObject {
  return locales[language] || locales[DEFAULT_LANGUAGE];
}

export function detectLanguage(): Language {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  // Check URL param
  const urlParams = new URLSearchParams(window.location.search);
  const langParam = urlParams.get("lang");
  if (langParam && SUPPORTED_LANGUAGES.includes(langParam as Language)) {
    return langParam as Language;
  }

  // Check browser language
  const browserLang = navigator.language.split("-")[0];
  if (SUPPORTED_LANGUAGES.includes(browserLang as Language)) {
    return browserLang as Language;
  }

  return DEFAULT_LANGUAGE;
}
