"use client";

import { useState, useEffect, useCallback } from "react";
import type { Language } from "../../../spec/contracts.generated";
import { t, detectLanguage, DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "./index";

export function useTranslation(initialLanguage?: Language) {
  const [language, setLanguage] = useState<Language>(initialLanguage || DEFAULT_LANGUAGE);

  useEffect(() => {
    if (!initialLanguage) {
      setLanguage(detectLanguage());
    }
  }, [initialLanguage]);

  const translate = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return t(key, language, params);
    },
    [language]
  );

  const changeLanguage = useCallback((newLanguage: Language) => {
    if (SUPPORTED_LANGUAGES.includes(newLanguage)) {
      setLanguage(newLanguage);
    }
  }, []);

  return {
    t: translate,
    language,
    setLanguage: changeLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}
